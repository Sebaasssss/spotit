import os
import shutil
import tempfile
import threading
import uuid
from unittest import mock

from django.core.cache import cache
from django.db import connections
from django.test import TransactionTestCase, override_settings
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle

from accounts.models import User
from reports.models import Categoria, Reporte

from .utils import PASSWORD, ReportesTestCase, imagen


def archivos_en(carpeta: str) -> list[str]:
    return sorted(
        os.path.relpath(os.path.join(raiz, nombre), carpeta)
        for raiz, _, nombres in os.walk(carpeta)
        for nombre in nombres
    )


class IdempotenciaTestCase(ReportesTestCase):
    def enviar(self, clave, user=None, **extra):
        self.como(user or self.ana)
        headers = {"Idempotency-Key": str(clave)} if clave is not None else {}
        return self.client.post(
            "/api/reportes/", self.datos(**extra), format="multipart", headers=headers
        )


class ReintentosTests(IdempotenciaTestCase):
    def test_primer_envio_crea_el_reporte_y_guarda_la_clave(self):
        clave = uuid.uuid4()

        response = self.enviar(clave)

        self.assertEqual(response.status_code, 201)
        reporte = Reporte.objects.get(pk=response.json()["id"])
        self.assertEqual(reporte.clave_idempotencia, clave)
        self.assertNotIn("Idempotent-Replayed", response)

    def test_reintento_devuelve_el_mismo_reporte_sin_crear_otro(self):
        clave = uuid.uuid4()
        primero = self.enviar(clave)

        repetido = self.enviar(clave)

        self.assertEqual(repetido.status_code, 200)
        self.assertEqual(repetido["Idempotent-Replayed"], "true")
        self.assertEqual(repetido.json()["id"], primero.json()["id"])
        self.assertTrue(repetido.json()["es_mio"])
        self.assertEqual(Reporte.objects.count(), 1)

    def test_reintento_no_reprocesa_la_foto_ni_deja_archivos_sueltos(self):
        clave = uuid.uuid4()
        self.enviar(clave)
        antes = archivos_en(self._media)

        self.enviar(clave)
        self.enviar(clave)

        self.assertEqual(archivos_en(self._media), antes)

    def test_reintento_con_datos_distintos_devuelve_el_original(self):
        """La clave manda: el teléfono nunca cambia un envío que ya tiene clave."""
        clave = uuid.uuid4()
        primero = self.enviar(clave)

        repetido = self.enviar(clave, descripcion="Otra descripción bastante distinta.")

        self.assertEqual(repetido.status_code, 200)
        self.assertEqual(repetido.json()["descripcion"], primero.json()["descripcion"])

    def test_reintento_con_foto_ya_no_valida_devuelve_el_creado(self):
        clave = uuid.uuid4()
        self.enviar(clave)

        repetido = self.enviar(clave, foto=imagen(formato="GIF"))

        self.assertEqual(repetido.status_code, 200)

    def test_sin_clave_cada_envio_crea_uno(self):
        self.enviar(None)
        self.enviar(None)

        self.assertEqual(Reporte.objects.count(), 2)

    def test_claves_distintas_crean_reportes_distintos(self):
        self.enviar(uuid.uuid4())
        self.enviar(uuid.uuid4())

        self.assertEqual(Reporte.objects.count(), 2)

    def test_la_misma_clave_de_otra_persona_no_choca_ni_revela_nada(self):
        clave = uuid.uuid4()
        de_ana = self.enviar(clave, self.ana)

        de_beto = self.enviar(clave, self.beto)

        self.assertEqual(de_beto.status_code, 201)
        self.assertNotEqual(de_beto.json()["id"], de_ana.json()["id"])
        self.assertEqual(Reporte.objects.count(), 2)

    def test_clave_mal_formada_es_400(self):
        response = self.enviar("no-es-un-uuid")

        self.assertEqual(response.status_code, 400)
        self.assertIn("idempotency_key", response.json())
        self.assertEqual(Reporte.objects.count(), 0)

    def test_foto_invalida_con_clave_no_guarda_nada(self):
        """Error definitivo: 400 y la clave sigue libre (el teléfono lo marca como error)."""
        clave = uuid.uuid4()

        response = self.enviar(clave, foto=imagen(formato="GIF"))

        self.assertEqual(response.status_code, 400)
        self.assertIn("foto", response.json())
        self.assertFalse(Reporte.objects.filter(clave_idempotencia=clave).exists())

    def test_la_clave_no_sale_en_la_api(self):
        response = self.enviar(uuid.uuid4())

        self.assertNotIn("clave_idempotencia", response.json())

    def test_un_administrador_no_puede_reintentar_para_colarse(self):
        response = self.enviar(uuid.uuid4(), self.admin)

        self.assertEqual(response.status_code, 403)


class LimiteYReintentosTests(IdempotenciaTestCase):
    RATES = {"auth": "1000/min", "reportes": "2/hour"}

    def setUp(self):
        super().setUp()
        patcher = mock.patch.object(SimpleRateThrottle, "THROTTLE_RATES", self.RATES)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_reintentar_un_reporte_creado_no_gasta_cupo(self):
        clave = uuid.uuid4()
        codigos = [self.enviar(clave).status_code for _ in range(4)]

        self.assertEqual(codigos, [201, 200, 200, 200])
        # El cupo sigue con un envío libre.
        self.assertEqual(self.enviar(uuid.uuid4()).status_code, 201)
        self.assertEqual(self.enviar(uuid.uuid4()).status_code, 429)

    def test_reintento_de_un_creado_pasa_aunque_el_cupo_este_agotado(self):
        clave = uuid.uuid4()
        self.enviar(clave)
        self.enviar(uuid.uuid4())
        self.assertEqual(self.enviar(uuid.uuid4()).status_code, 429)

        repetido = self.enviar(clave)

        self.assertEqual(repetido.status_code, 200)

    def test_el_429_indica_cuando_reintentar(self):
        self.enviar(uuid.uuid4())
        self.enviar(uuid.uuid4())

        response = self.enviar(uuid.uuid4())

        self.assertEqual(response.status_code, 429)
        self.assertGreater(int(response["Retry-After"]), 0)


class EnviosSimultaneosTests(TransactionTestCase):
    """La misma clave enviada a la vez (dos pestañas o un reintento que se cruza)."""

    serialized_rollback = True

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._media = tempfile.mkdtemp(prefix="spotit-media-")
        cls._override = override_settings(MEDIA_ROOT=cls._media, MEDIA_X_ACCEL=False)
        cls._override.enable()

    @classmethod
    def tearDownClass(cls):
        cls._override.disable()
        shutil.rmtree(cls._media, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        cache.clear()
        # Carpeta de fotos vacía en cada prueba (la base se limpia sola; los archivos no).
        shutil.rmtree(self._media, ignore_errors=True)
        os.makedirs(self._media)
        patcher = mock.patch.object(
            SimpleRateThrottle, "THROTTLE_RATES", {"auth": "1000/min", "reportes": "1000/hour"}
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.ana = User.objects.create_user("ana@ejemplo.mx", PASSWORD, nombre="Ana López")
        Categoria.objects.get_or_create(
            slug="baches-y-pavimento", defaults={"nombre": "Baches y pavimento"}
        )

    def enviar(self, clave):
        def tarea():
            client = APIClient()
            client.force_authenticate(self.ana)
            response = client.post(
                "/api/reportes/",
                {
                    "categoria": "baches-y-pavimento",
                    "descripcion": "Bache profundo frente a la biblioteca.",
                    "foto": imagen(),
                    "latitud": "18.85",
                    "longitud": "-99.2",
                    "origen_ubicacion": "gps",
                },
                format="multipart",
                headers={"Idempotency-Key": str(clave)},
            )
            return response.status_code, response.json().get("id")

        return tarea

    def a_la_vez(self, tareas):
        barrera = threading.Barrier(len(tareas))
        resultados = [None] * len(tareas)
        errores = []

        def correr(i, tarea):
            try:
                barrera.wait(timeout=10)
                resultados[i] = tarea()
            except Exception as exc:  # noqa: BLE001 — se reporta abajo
                errores.append(exc)
            finally:
                connections.close_all()

        hilos = [threading.Thread(target=correr, args=(i, t)) for i, t in enumerate(tareas)]
        for hilo in hilos:
            hilo.start()
        for hilo in hilos:
            hilo.join(timeout=60)
        self.assertEqual(errores, [])
        return resultados

    def test_la_misma_clave_a_la_vez_crea_un_solo_reporte(self):
        clave = uuid.uuid4()

        resultados = self.a_la_vez([self.enviar(clave) for _ in range(6)])

        self.assertEqual(Reporte.objects.filter(clave_idempotencia=clave).count(), 1)
        codigos = [codigo for codigo, _ in resultados]
        self.assertEqual(codigos.count(201), 1, codigos)
        self.assertEqual(codigos.count(200), 5, codigos)
        self.assertEqual(len({id_ for _, id_ in resultados}), 1)

    def test_los_perdedores_de_la_carrera_no_dejan_fotos_huerfanas(self):
        clave = uuid.uuid4()

        self.a_la_vez([self.enviar(clave) for _ in range(6)])

        reporte = Reporte.objects.get(clave_idempotencia=clave)
        self.assertEqual(
            archivos_en(self._media), sorted([reporte.foto.name, reporte.miniatura.name])
        )
