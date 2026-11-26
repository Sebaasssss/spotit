import json
import threading
from decimal import Decimal

from django.db import connection, connections
from django.test import TransactionTestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from accounts.models import User
from reports.models import Categoria, Estado, Reporte, Voto

from .utils import PASSWORD, ReportesTestCase


class VotoTestCase(ReportesTestCase):
    def setUp(self):
        super().setUp()
        self.carla = User.objects.create_user("carla@ejemplo.mx", PASSWORD, nombre="Carla Díaz")
        self.de_ana = self.reporte(self.ana)

    def votar(self, user, reporte=None, metodo="post"):
        self.como(user)
        reporte = reporte or self.de_ana
        return getattr(self.client, metodo)(f"/api/reportes/{reporte.pk}/voto/")


class VotarTests(VotoTestCase):
    def test_vota_un_reporte_ajeno(self):
        response = self.votar(self.beto)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json(), {"votos": 1, "votado": True})
        self.assertTrue(Voto.objects.filter(usuario=self.beto, reporte=self.de_ana).exists())

    def test_doble_voto_no_cuenta_dos_veces_ni_falla(self):
        self.votar(self.beto)

        response = self.votar(self.beto)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"votos": 1, "votado": True})
        self.assertEqual(Voto.objects.count(), 1)

    def test_quitar_el_voto(self):
        self.votar(self.beto)
        self.votar(self.carla)

        response = self.votar(self.beto, metodo="delete")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"votos": 1, "votado": False})
        self.assertFalse(Voto.objects.filter(usuario=self.beto).exists())

    def test_quitar_un_voto_que_no_existe_no_falla(self):
        response = self.votar(self.beto, metodo="delete")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"votos": 0, "votado": False})

    def test_votos_de_varias_personas(self):
        self.votar(self.beto)
        self.votar(self.carla)

        self.assertEqual(self.votar(self.carla).json()["votos"], 2)


class VotoDenegadoTests(VotoTestCase):
    def test_sin_sesion(self):
        self.client.force_authenticate(None)

        for metodo in ("post", "delete"):
            response = getattr(self.client, metodo)(f"/api/reportes/{self.de_ana.pk}/voto/")
            self.assertEqual(response.status_code, 401, metodo)
        self.assertEqual(Voto.objects.count(), 0)

    def test_no_se_puede_votar_el_propio_reporte(self):
        response = self.votar(self.ana)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"], "No puedes votar tu propio reporte.")
        self.assertEqual(Voto.objects.count(), 0)

    def test_el_administrador_no_vota(self):
        response = self.votar(self.admin)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(Voto.objects.count(), 0)

    def test_reporte_inexistente(self):
        self.como(self.beto)

        self.assertEqual(self.client.post("/api/reportes/999999/voto/").status_code, 404)

    def test_en_resuelto_los_votos_se_congelan(self):
        self.votar(self.beto)
        Reporte.objects.filter(pk=self.de_ana.pk).update(estado=Estado.RESUELTO)

        votar = self.votar(self.carla)
        quitar = self.votar(self.beto, metodo="delete")

        for response in (votar, quitar):
            self.assertEqual(response.status_code, 403)
            self.assertIn("resuelto", response.json()["detail"])
        self.assertEqual(Voto.objects.count(), 1, "el voto existente se conserva")

    def test_al_reabrir_se_puede_votar_otra_vez_y_se_conservan_los_votos(self):
        self.votar(self.beto)
        self.de_ana.estado = Estado.RESUELTO
        self.de_ana.save()
        self.como(self.admin)
        reabrir = self.client.post(
            f"/api/admin/reportes/{self.de_ana.pk}/estado/",
            {"estado": "en_proceso", "desde": "resuelto"},
            format="json",
        )
        self.assertEqual(reabrir.status_code, 200)

        response = self.votar(self.carla)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["votos"], 2)

    def test_no_se_puede_borrar_un_reporte(self):
        self.como(self.ana)

        self.assertEqual(self.client.delete(f"/api/reportes/{self.de_ana.pk}/").status_code, 405)
        self.assertTrue(Reporte.objects.filter(pk=self.de_ana.pk).exists())


class VotosEnReportesTests(VotoTestCase):
    def test_detalle_trae_conteo_y_si_ya_vote(self):
        self.votar(self.beto)
        self.votar(self.carla)

        self.como(self.beto)
        body = self.client.get(f"/api/reportes/{self.de_ana.pk}/").json()
        self.assertEqual((body["votos"], body["votado"], body["puede_votar"]), (2, True, True))

        self.como(self.ana)
        body = self.client.get(f"/api/reportes/{self.de_ana.pk}/").json()
        self.assertEqual((body["votos"], body["votado"], body["puede_votar"]), (2, False, False))

    def test_lista_y_mios_traen_votos(self):
        self.votar(self.beto)

        self.como(self.beto)
        fila = self.client.get("/api/reportes/").json()["results"][0]
        self.assertEqual((fila["votos"], fila["votado"]), (1, True))

        self.como(self.ana)
        fila = self.client.get("/api/reportes/mios/").json()["results"][0]
        self.assertEqual((fila["votos"], fila["votado"], fila["puede_votar"]), (1, False, False))

    def test_recien_creado_trae_cero_votos(self):
        body = self.crear(self.beto).json()

        self.assertEqual((body["votos"], body["votado"], body["puede_votar"]), (0, False, False))

    def test_resuelto_no_se_puede_votar(self):
        Reporte.objects.filter(pk=self.de_ana.pk).update(estado=Estado.RESUELTO)
        self.como(self.beto)

        body = self.client.get(f"/api/reportes/{self.de_ana.pk}/").json()

        self.assertFalse(body["puede_votar"])

    def test_la_lista_no_hace_una_consulta_por_reporte(self):
        for _ in range(5):
            r = self.reporte(self.ana)
            self.votar(self.beto, r)
        self.como(self.carla)

        with CaptureQueriesContext(connection) as pocas:
            self.client.get("/api/reportes/")
        for _ in range(5):
            self.reporte(self.ana)
        self.como(self.carla)
        with CaptureQueriesContext(connection) as muchas:
            self.client.get("/api/reportes/")

        self.assertEqual(len(pocas), len(muchas))

    def test_no_expone_quien_voto(self):
        self.votar(self.beto)
        self.como(self.carla)

        texto = json.dumps(self.client.get(f"/api/reportes/{self.de_ana.pk}/").json())

        for prohibido in ("beto@ejemplo.mx", "Beto Ruiz", "usuario"):
            self.assertNotIn(prohibido, texto)


class OrdenTests(VotoTestCase):
    def test_por_votos_y_luego_por_fecha(self):
        uno = self.reporte(self.ana)
        dos = self.reporte(self.ana)
        self.votar(self.beto, uno)
        self.votar(self.carla, uno)
        self.votar(self.beto, self.de_ana)
        self.como(self.carla)

        ids = [r["id"] for r in self.client.get("/api/reportes/?orden=votos").json()["results"]]

        # uno (2 votos), de_ana (1), dos (0)
        self.assertEqual(ids, [uno.pk, self.de_ana.pk, dos.pk])

    def test_empate_de_votos_ordena_por_mas_reciente(self):
        viejo = self.de_ana
        nuevo = self.reporte(self.ana)
        self.como(self.beto)

        ids = [r["id"] for r in self.client.get("/api/reportes/?orden=votos").json()["results"]]

        self.assertEqual(ids, [nuevo.pk, viejo.pk])

    def test_por_fecha_es_el_orden_por_defecto(self):
        nuevo = self.reporte(self.ana)
        self.votar(self.beto, self.de_ana)
        self.como(self.beto)

        por_defecto = self.client.get("/api/reportes/").json()["results"]
        recientes = self.client.get("/api/reportes/?orden=recientes").json()["results"]

        self.assertEqual([r["id"] for r in por_defecto], [nuevo.pk, self.de_ana.pk])
        self.assertEqual(por_defecto, recientes)

    def test_mios_tambien_ordena(self):
        uno = self.reporte(self.ana)
        self.votar(self.beto, self.de_ana)
        self.como(self.ana)

        ids = [
            r["id"] for r in self.client.get("/api/reportes/mios/?orden=votos").json()["results"]
        ]

        self.assertEqual(ids, [self.de_ana.pk, uno.pk])

    def test_orden_desconocido(self):
        self.como(self.beto)

        response = self.client.get("/api/reportes/?orden=autor")

        self.assertEqual(response.status_code, 400)
        self.assertIn("orden", response.json())


class MapaTests(VotoTestCase):
    url = "/api/reportes/mapa/"

    def test_solo_lo_necesario_y_sin_fotos(self):
        self.votar(self.beto)
        self.como(self.carla)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(set(body), {"results", "truncado"})
        self.assertFalse(body["truncado"])
        punto = body["results"][0]
        self.assertEqual(
            punto,
            {
                "id": self.de_ana.pk,
                "lat": float(Decimal("18.850283")),
                "lng": float(Decimal("-99.200736")),
                "categoria": "baches-y-pavimento",
                "estado": "recibido",
                "votos": 1,
            },
        )
        texto = json.dumps(body)
        for prohibido in ("foto", "miniatura", "descripcion", "Bache profundo", "ana@ejemplo.mx"):
            self.assertNotIn(prohibido, texto)

    def test_filtra_por_categoria_y_estado(self):
        luz = self.reporte(self.ana, categoria="alumbrado")
        Reporte.objects.filter(pk=luz.pk).update(estado=Estado.EN_PROCESO)
        self.como(self.beto)

        def ids(query):
            response = self.client.get(f"{self.url}?{query}")
            self.assertEqual(response.status_code, 200, response.content)
            return {p["id"] for p in response.json()["results"]}

        self.assertEqual(ids("categoria=alumbrado"), {luz.pk})
        self.assertEqual(ids("estado=recibido"), {self.de_ana.pk})
        self.assertEqual(ids("estado=recibido,en_proceso"), {self.de_ana.pk, luz.pk})
        self.assertEqual(ids("categoria=alumbrado,baches-y-pavimento&estado=en_proceso"), {luz.pk})
        self.assertEqual(ids("estado=resuelto"), set())

    def test_estado_invalido(self):
        self.como(self.beto)

        response = self.client.get(f"{self.url}?estado=recibido,borrado")

        self.assertEqual(response.status_code, 400)

    def test_requiere_sesion(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_una_sola_consulta_sin_importar_cuantos_reportes(self):
        for _ in range(4):
            self.votar(self.beto, self.reporte(self.ana))
        self.como(self.carla)

        with self.assertNumQueries(1):
            response = self.client.get(self.url)

        self.assertEqual(len(response.json()["results"]), 5)

    def test_tope_de_puntos(self):
        from reports import views

        self.reporte(self.ana)
        original = views.MAPA_LIMITE
        views.MAPA_LIMITE = 1
        self.addCleanup(setattr, views, "MAPA_LIMITE", original)
        self.como(self.beto)

        body = self.client.get(self.url).json()

        self.assertEqual(len(body["results"]), 1)
        self.assertTrue(body["truncado"])


class VotosConcurrentesTests(TransactionTestCase):
    """Peticiones simultáneas reales (cada hilo con su propia conexión a PostgreSQL)."""

    # Restaura las categorías de la migración de datos para las pruebas que vengan después.
    serialized_rollback = True

    def setUp(self):
        self.autora = User.objects.create_user("ana@ejemplo.mx", PASSWORD, nombre="Ana López")
        self.votantes = [
            User.objects.create_user(f"v{i}@ejemplo.mx", PASSWORD, nombre=f"Votante {i}")
            for i in range(6)
        ]
        categoria, _ = Categoria.objects.get_or_create(
            slug="baches-y-pavimento", defaults={"nombre": "Baches y pavimento"}
        )
        self.reporte = Reporte.objects.create(
            autor=self.autora,
            categoria=categoria,
            descripcion="Bache profundo frente a la biblioteca.",
            foto="reportes/x.jpg",
            miniatura="reportes/min-x.jpg",
            latitud=Decimal("18.85"),
            longitud=Decimal("-99.2"),
        )
        self.url = f"/api/reportes/{self.reporte.pk}/voto/"

    def a_la_vez(self, tareas):
        """Lanza cada tarea en su hilo y las suelta juntas con una barrera."""
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
            hilo.join(timeout=30)
        self.assertEqual(errores, [])
        return resultados

    def peticion(self, user, metodo="post"):
        def tarea():
            client = APIClient()
            client.force_authenticate(user)
            return getattr(client, metodo)(self.url).status_code

        return tarea

    def test_el_mismo_usuario_votando_a_la_vez_deja_un_solo_voto(self):
        votante = self.votantes[0]

        estados = self.a_la_vez([self.peticion(votante) for _ in range(8)])

        self.assertEqual(Voto.objects.filter(usuario=votante).count(), 1)
        self.assertEqual(estados.count(201), 1, estados)
        self.assertEqual(estados.count(200), 7, estados)

    def test_muchas_personas_a_la_vez_cuentan_todas(self):
        estados = self.a_la_vez([self.peticion(v) for v in self.votantes])

        self.assertEqual(estados, [201] * len(self.votantes))
        self.assertEqual(Voto.objects.filter(reporte=self.reporte).count(), len(self.votantes))

    def test_votar_y_quitar_a_la_vez_no_deja_duplicados(self):
        votante = self.votantes[0]
        tareas = [self.peticion(votante, m) for m in ("post", "delete") * 4]

        estados = self.a_la_vez(tareas)

        self.assertTrue(all(e in (200, 201) for e in estados), estados)
        self.assertLessEqual(Voto.objects.filter(usuario=votante).count(), 1)
