"""Panel de administración: accesos, filtros, estados con historial, ocultar y resumen."""

import json
import os
import threading
from datetime import timedelta
from urllib.parse import parse_qs, urlparse

from django.core.cache import cache
from django.db import connections
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Rol, User
from reports.models import Categoria, Estado, EventoReporte, Reporte, TipoEvento, Voto

from .utils import PASSWORD, ReportesTestCase

LISTA = "/api/admin/reportes/"
RESUMEN = "/api/admin/resumen/"


def detalle(pk):
    return f"/api/admin/reportes/{pk}/"


class AdminTestCase(ReportesTestCase):
    def setUp(self):
        super().setUp()
        self.admin.rol = Rol.ADMINISTRADOR
        self.admin.save()
        self.r1 = self.reporte(self.ana, descripcion="Bache profundo frente a la biblioteca.")
        self.r2 = self.reporte(
            self.beto, categoria="alumbrado", descripcion="Luminaria fundida en el andador norte."
        )

    def post(self, url, datos=None, user=None):
        self.como(user or self.admin)
        return self.client.post(url, datos or {}, format="json")

    def get(self, url, user=None, **params):
        self.como(user or self.admin)
        return self.client.get(url, params)

    def ids(self, response):
        self.assertEqual(response.status_code, 200, response.content)
        return [r["id"] for r in response.json()["results"]]

    def ocultar(self, reporte, motivo="Se ven caras y placas.", **extra):
        return self.post(f"{detalle(reporte.pk)}ocultar/", {"motivo": motivo, **extra})


class AccesosTests(AdminTestCase):
    """Cada endpoint del panel: sin sesión 401, ciudadano 403, administrador 200."""

    def endpoints(self):
        pk = self.r1.pk
        return [
            ("get", LISTA, {}),
            ("get", detalle(pk), {}),
            ("get", RESUMEN, {}),
            ("post", f"{detalle(pk)}estado/", {"estado": "en_proceso", "desde": "recibido"}),
            ("post", f"{detalle(pk)}ocultar/", {"motivo": "Se ven caras."}),
            ("post", f"{detalle(pk)}mostrar/", {}),
        ]

    def test_sin_sesion_401(self):
        self.client.force_authenticate(None)
        for metodo, url, datos in self.endpoints():
            with self.subTest(url=url):
                response = getattr(self.client, metodo)(url, datos, format="json")
                self.assertEqual(response.status_code, 401)

    def test_ciudadano_403(self):
        for metodo, url, datos in self.endpoints():
            with self.subTest(url=url):
                self.como(self.ana)
                response = getattr(self.client, metodo)(url, datos, format="json")
                self.assertEqual(response.status_code, 403)
        self.r1.refresh_from_db()
        self.assertEqual((self.r1.estado, self.r1.oculto), (Estado.RECIBIDO, False))

    def test_administrador_200(self):
        for metodo, url, datos in self.endpoints():
            with self.subTest(url=url):
                response = getattr(self, metodo)(url, datos)
                self.assertEqual(response.status_code, 200, response.content)

    def test_el_endpoint_publico_de_estado_ya_no_existe(self):
        response = self.post(f"/api/reportes/{self.r1.pk}/estado/", {"estado": "en_proceso"})
        self.assertEqual(response.status_code, 404)


class ListaTests(AdminTestCase):
    def test_incluye_ocultos_y_los_marca(self):
        self.ocultar(self.r1)

        response = self.get(LISTA)

        filas = {r["id"]: r for r in response.json()["results"]}
        self.assertTrue(filas[self.r1.pk]["oculto"])
        self.assertFalse(filas[self.r2.pk]["oculto"])

    def test_la_lista_no_lleva_datos_del_autor(self):
        texto = json.dumps(self.get(LISTA).json())
        for dato in ("ana@ejemplo.mx", "Ana López", "autor"):
            self.assertNotIn(dato, texto)

    def test_filtros(self):
        Reporte.objects.filter(pk=self.r2.pk).update(estado=Estado.EN_PROCESO)
        Voto.objects.create(usuario=self.beto, reporte=self.r1)
        Voto.objects.create(usuario=self.admin, reporte=self.r1)
        self.ocultar(self.r2)
        casos = [
            ({"estado": "en_proceso"}, [self.r2.pk]),
            ({"estado": "recibido,en_proceso"}, [self.r2.pk, self.r1.pk]),
            ({"categoria": "alumbrado"}, [self.r2.pk]),
            ({"votos_min": "2"}, [self.r1.pk]),
            ({"q": "LUMINARIA"}, [self.r2.pk]),
            ({"oculto": "si"}, [self.r2.pk]),
            ({"oculto": "no"}, [self.r1.pk]),
            ({"orden": "antiguos"}, [self.r1.pk, self.r2.pk]),
            ({"orden": "votos"}, [self.r1.pk, self.r2.pk]),
        ]
        for params, esperado in casos:
            with self.subTest(params=params):
                self.assertEqual(self.ids(self.get(LISTA, **params)), esperado)

    def test_rango_de_fechas(self):
        hace_10 = timezone.now() - timedelta(days=10)
        Reporte.objects.filter(pk=self.r1.pk).update(creado=hace_10)
        hoy = timezone.localdate()

        self.assertEqual(self.ids(self.get(LISTA, desde=str(hoy))), [self.r2.pk])
        self.assertEqual(
            self.ids(self.get(LISTA, hasta=str(hoy - timedelta(days=5)))), [self.r1.pk]
        )

    def test_filtros_invalidos_400(self):
        for params in (
            {"estado": "archivado"},
            {"desde": "25/11/2026"},
            {"desde": "2026-11-25", "hasta": "2026-11-01"},
            {"votos_min": "-1"},
            {"oculto": "quizas"},
            {"orden": "azar"},
            {"q": "x" * 101},
        ):
            with self.subTest(params=params):
                self.assertEqual(self.get(LISTA, **params).status_code, 400)

    def test_paginacion_de_25(self):
        for i in range(26):
            self.reporte(self.ana, descripcion=f"Reporte de relleno número {i}.")

        primera = self.get(LISTA).json()

        self.assertEqual(primera["count"], 28)
        self.assertEqual(len(primera["results"]), 25)
        self.assertEqual(len(self.get(LISTA, page=2).json()["results"]), 3)


class DetalleTests(AdminTestCase):
    def test_autor_solo_nombre_y_email(self):
        autor = self.get(detalle(self.r1.pk)).json()["autor"]

        self.assertEqual(autor, {"nombre": "Ana López", "email": "ana@ejemplo.mx"})

    def test_ninguna_respuesta_expone_rutas_del_servidor(self):
        self.ocultar(self.r1)
        respuestas = [self.get(LISTA), self.get(detalle(self.r1.pk)), self.get(RESUMEN)]
        for response in respuestas:
            texto = json.dumps(response.json())
            with self.subTest(url=response.request["PATH_INFO"]):
                self.assertNotIn(self.r1.foto.name, texto)
                self.assertNotIn("/srv/", texto)
                self.assertNotIn("media", texto)
                self.assertNotIn(self._media, texto)

    def test_transiciones_disponibles(self):
        transiciones = self.get(detalle(self.r1.pk)).json()["transiciones"]
        self.assertEqual(transiciones, [{"estado": "en_proceso", "label": "En proceso"}])


class CambioEstadoTests(AdminTestCase):
    def cambiar(self, estado, desde=None, **extra):
        self.r1.refresh_from_db()
        datos = {"estado": estado, "desde": desde or self.r1.estado, **extra}
        return self.post(f"{detalle(self.r1.pk)}estado/", datos)

    def test_cambia_y_deja_historial_con_quien_cuando_y_nota(self):
        response = self.cambiar("en_proceso", nota_publica="Ya mandamos a una cuadrilla.")

        self.assertEqual(response.status_code, 200)
        datos = response.json()
        self.assertEqual(datos["estado"], "en_proceso")
        evento = datos["historial"][-1]
        self.assertEqual(evento["tipo"], "estado")
        self.assertEqual(
            (evento["estado_anterior"], evento["estado_nuevo"]), ("recibido", "en_proceso")
        )
        self.assertEqual(evento["nota_publica"], "Ya mandamos a una cuadrilla.")
        self.assertEqual(evento["admin"], "Admin")
        self.assertTrue(evento["fecha"])

    def test_la_nota_es_opcional(self):
        self.assertEqual(self.cambiar("en_proceso").status_code, 200)
        self.assertEqual(EventoReporte.objects.get().nota_publica, "")

    def test_nota_demasiado_larga(self):
        response = self.cambiar("en_proceso", nota_publica="x" * 501)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(EventoReporte.objects.count(), 0)

    def test_transicion_invalida_no_deja_historial(self):
        response = self.cambiar("resuelto")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(EventoReporte.objects.count(), 0)

    def test_409_si_otra_persona_lo_cambio(self):
        Reporte.objects.filter(pk=self.r1.pk).update(estado=Estado.EN_PROCESO)

        response = self.cambiar("en_proceso", desde="recibido")

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["estado_actual"], "en_proceso")
        self.assertIn("Otra persona", response.json()["detail"])
        self.assertEqual(EventoReporte.objects.count(), 0)


class OcultarTests(AdminTestCase):
    def test_exige_motivo(self):
        for datos in ({}, {"motivo": ""}, {"motivo": "   "}, {"motivo": "abc"}):
            with self.subTest(datos=datos):
                response = self.post(f"{detalle(self.r1.pk)}ocultar/", datos)
                self.assertEqual(response.status_code, 400)
                self.assertIn("motivo", response.json())
        self.r1.refresh_from_db()
        self.assertFalse(self.r1.oculto)

    def test_ocultar_y_mostrar_quedan_en_el_historial(self):
        self.ocultar(self.r1, nota_publica="Lo ocultamos mientras revisamos la foto.")
        response = self.post(f"{detalle(self.r1.pk)}mostrar/")

        self.assertEqual(response.status_code, 200)
        tipos = [(e["tipo"], e["motivo"]) for e in response.json()["historial"]]
        self.assertEqual(tipos, [("ocultar", "Se ven caras y placas."), ("mostrar", "")])
        self.r1.refresh_from_db()
        self.assertFalse(self.r1.oculto)
        self.assertEqual(self.r1.oculto_motivo, "")

    def test_ocultar_dos_veces_409(self):
        self.ocultar(self.r1)
        self.assertEqual(self.ocultar(self.r1).status_code, 409)
        self.assertEqual(self.post(f"{detalle(self.r2.pk)}mostrar/").status_code, 409)

    def test_el_detalle_dice_quien_y_por_que(self):
        datos = self.ocultar(self.r1).json()
        self.assertTrue(datos["oculto"])
        self.assertEqual(datos["oculto_motivo"], "Se ven caras y placas.")
        self.assertEqual(datos["oculto_por"], "Admin")


class EfectosDeOcultarTests(AdminTestCase):
    def setUp(self):
        super().setUp()
        self.como(self.beto)
        self.url_publica_previa = self.client.get(f"/api/reportes/{self.r1.pk}/").json()["foto_url"]
        self.ocultar(self.r1, nota_publica="Lo ocultamos: la foto muestra a personas.")

    def test_no_sale_en_listas_ni_en_el_mapa(self):
        self.como(self.beto)
        lista = [r["id"] for r in self.client.get("/api/reportes/").json()["results"]]
        mapa = [p["id"] for p in self.client.get("/api/reportes/mapa/").json()["results"]]

        self.assertNotIn(self.r1.pk, lista)
        self.assertNotIn(self.r1.pk, mapa)
        self.assertIn(self.r2.pk, lista)

    def test_otro_ciudadano_no_lo_ve_ni_lo_vota(self):
        self.como(self.beto)
        self.assertEqual(self.client.get(f"/api/reportes/{self.r1.pk}/").status_code, 404)
        self.assertEqual(self.client.post(f"/api/reportes/{self.r1.pk}/voto/").status_code, 404)

    def test_el_autor_lo_ve_marcado_sin_motivo_ni_foto(self):
        self.como(self.ana)
        mios = self.client.get("/api/reportes/mios/").json()["results"]
        fila = next(r for r in mios if r["id"] == self.r1.pk)
        detalle_publico = self.client.get(f"/api/reportes/{self.r1.pk}/").json()

        self.assertTrue(fila["oculto"])
        self.assertEqual((fila["foto_url"], fila["miniatura_url"]), ("", ""))
        texto = json.dumps(detalle_publico)
        self.assertNotIn("Se ven caras y placas.", texto)  # el motivo es interno
        self.assertNotIn("Admin", texto)  # tampoco quién lo hizo
        self.assertIn("Lo ocultamos: la foto muestra a personas.", texto)  # la nota pública sí

    def test_la_foto_solo_con_enlace_del_panel(self):
        self.client.force_authenticate(None)
        # El enlace público emitido antes de ocultarlo deja de servir al momento.
        self.assertEqual(self.client.get(self.url_publica_previa).status_code, 404)

        foto_admin = self.get(detalle(self.r1.pk)).json()["foto_url"]
        self.client.force_authenticate(None)
        response = self.client.get(foto_admin)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(b"".join(response.streaming_content).startswith(bytes([0xFF, 0xD8])))

    def test_un_enlace_con_alcance_manipulado_no_sirve(self):
        token = parse_qs(urlparse(self.url_publica_previa).query)["t"][0]
        valor, _, firma = token.rpartition(":")
        falso = f"/api/reportes/{self.r1.pk}/foto/?t={valor}:admin:{firma}"
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(falso).status_code, 404)

    def test_no_se_pierde_ningun_archivo(self):
        self.r1.refresh_from_db()
        for campo in (self.r1.foto, self.r1.miniatura):
            self.assertTrue(os.path.exists(campo.path))

    def test_al_mostrarlo_vuelve_a_todo(self):
        self.post(f"{detalle(self.r1.pk)}mostrar/")
        self.como(self.beto)
        detalle_publico = self.client.get(f"/api/reportes/{self.r1.pk}/")
        self.assertEqual(detalle_publico.status_code, 200)
        self.assertTrue(detalle_publico.json()["foto_url"])


class LineaDeTiempoTests(AdminTestCase):
    def test_otros_ciudadanos_ven_cambios_de_estado_y_notas_pero_no_la_moderacion(self):
        self.post(
            f"{detalle(self.r1.pk)}estado/",
            {"estado": "en_proceso", "desde": "recibido", "nota_publica": "Vamos en camino."},
        )
        self.ocultar(self.r1)
        self.post(f"{detalle(self.r1.pk)}mostrar/")

        self.como(self.beto)
        historial = self.client.get(f"/api/reportes/{self.r1.pk}/").json()["historial"]
        self.como(self.ana)
        del_autor = self.client.get(f"/api/reportes/{self.r1.pk}/").json()["historial"]

        self.assertEqual([e["tipo"] for e in historial], ["estado"])
        self.assertEqual(historial[0]["nota_publica"], "Vamos en camino.")
        self.assertEqual([e["tipo"] for e in del_autor], ["estado", "ocultar", "mostrar"])
        for evento in historial + del_autor:
            self.assertNotIn("motivo", evento)
            self.assertNotIn("admin", evento)


class ResumenTests(AdminTestCase):
    def test_conteos_y_mas_votados(self):
        r3 = self.reporte(self.ana, descripcion="Fuga de agua en el baño de planta baja.")
        Reporte.objects.filter(pk=r3.pk).update(estado=Estado.RESUELTO)
        Voto.objects.create(usuario=self.beto, reporte=self.r1)
        self.ocultar(self.r2)

        datos = self.get(RESUMEN).json()

        self.assertEqual(datos["total"], 2)
        self.assertEqual(datos["por_estado"], {"recibido": 1, "en_proceso": 0, "resuelto": 1})
        self.assertEqual(datos["ocultos"], 1)
        self.assertEqual(datos["nuevos_7_dias"], 2)
        self.assertEqual([r["id"] for r in datos["mas_votados"]], [self.r1.pk])
        bache = next(c for c in datos["por_categoria"] if c["slug"] == "baches-y-pavimento")
        alumbrado = next(c for c in datos["por_categoria"] if c["slug"] == "alumbrado")
        self.assertEqual((bache["total"], alumbrado["total"]), (2, 0))


class CambiosSimultaneosTests(TransactionTestCase):
    """Dos administradores cambian el mismo reporte a la vez: uno gana, el otro recibe 409."""

    serialized_rollback = True

    def setUp(self):
        cache.clear()
        self.admins = [
            User.objects.create_user(
                f"admin{i}@ejemplo.mx", PASSWORD, nombre=f"Admin {i}", rol=Rol.ADMINISTRADOR
            )
            for i in range(4)
        ]
        autora = User.objects.create_user("ana@ejemplo.mx", PASSWORD, nombre="Ana López")
        categoria, _ = Categoria.objects.get_or_create(
            slug="baches-y-pavimento", defaults={"nombre": "Baches y pavimento"}
        )
        self.reporte = Reporte.objects.create(
            autor=autora,
            categoria=categoria,
            descripcion="Bache profundo frente a la biblioteca.",
            foto="reportes/x.jpg",
            miniatura="reportes/min-x.jpg",
            latitud="18.85",
            longitud="-99.2",
        )

    def test_solo_un_cambio_gana(self):
        barrera = threading.Barrier(len(self.admins))
        estados, errores = [], []

        def correr(admin):
            try:
                client = APIClient()
                client.force_authenticate(admin)
                barrera.wait(timeout=10)
                estados.append(
                    client.post(
                        f"/api/admin/reportes/{self.reporte.pk}/estado/",
                        {"estado": "en_proceso", "desde": "recibido"},
                        format="json",
                    ).status_code
                )
            except Exception as exc:  # noqa: BLE001 — se reporta abajo
                errores.append(exc)
            finally:
                connections.close_all()

        hilos = [threading.Thread(target=correr, args=(a,)) for a in self.admins]
        for hilo in hilos:
            hilo.start()
        for hilo in hilos:
            hilo.join(timeout=30)

        self.assertEqual(errores, [])
        self.assertEqual(sorted(estados), [200, 409, 409, 409])
        self.assertEqual(EventoReporte.objects.filter(tipo=TipoEvento.ESTADO).count(), 1)
