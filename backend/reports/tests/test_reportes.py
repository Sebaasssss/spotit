import json
from decimal import Decimal
from unittest import mock

from django.conf import settings
from rest_framework.throttling import SimpleRateThrottle

from reports.models import Categoria, Estado, Reporte

from .utils import ReportesTestCase, imagen


class CategoriasTests(ReportesTestCase):
    def test_categorias_iniciales(self):
        self.como(self.ana)

        response = self.client.get("/api/categorias/")

        self.assertEqual(response.status_code, 200)
        nombres = [c["nombre"] for c in response.json()]
        self.assertEqual(len(nombres), 9)
        self.assertEqual(nombres[0], "Baches y pavimento")
        self.assertEqual(nombres[-1], "Otro")
        self.assertEqual(set(response.json()[0]), {"id", "nombre", "slug", "icono"})

    def test_categoria_inactiva_no_aparece_ni_se_puede_usar(self):
        Categoria.objects.filter(slug="alumbrado").update(activa=False)
        self.como(self.ana)

        slugs = [c["slug"] for c in self.client.get("/api/categorias/").json()]
        response = self.crear(categoria="alumbrado")

        self.assertNotIn("alumbrado", slugs)
        self.assertEqual(response.status_code, 400)
        self.assertIn("categoria", response.json())

    def test_requiere_sesion(self):
        self.assertEqual(self.client.get("/api/categorias/").status_code, 401)


class CrearReporteTests(ReportesTestCase):
    def test_ciudadano_crea_reporte(self):
        response = self.crear()

        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()
        self.assertEqual(body["estado"], "recibido")
        self.assertEqual(body["categoria"]["slug"], "baches-y-pavimento")
        self.assertTrue(body["es_mio"])
        self.assertTrue(body["puede_editar"])
        self.assertEqual(body["latitud"], "18.850283")
        self.assertEqual(body["precision_m"], 12)
        reporte = Reporte.objects.get()
        self.assertEqual(reporte.autor, self.ana)
        self.assertEqual(reporte.longitud, Decimal("-99.200736"))

    def test_no_expone_autor_ni_rutas(self):
        texto = json.dumps(self.crear().json())

        for prohibido in ("autor", "ana@ejemplo.mx", "Ana López", str(settings.MEDIA_ROOT)):
            self.assertNotIn(prohibido, texto)
        self.assertNotIn("reportes/20", texto, "no aparece la ruta del archivo")

    def test_ubicacion_manual_descarta_la_precision(self):
        body = self.crear(origen_ubicacion="manual", precision_m="40").json()

        self.assertEqual(body["origen_ubicacion"], "manual")
        self.assertIsNone(body["precision_m"])

    def test_validaciones(self):
        casos = {
            "descripcion": {"descripcion": "corto"},
            "latitud": {"latitud": "95"},
            "longitud": {"longitud": "-181"},
            "categoria": {"categoria": "no-existe"},
            "origen_ubicacion": {"origen_ubicacion": "satelite"},
        }
        for campo, extra in casos.items():
            with self.subTest(campo=campo):
                response = self.crear(**extra)
                self.assertEqual(response.status_code, 400)
                self.assertIn(campo, response.json())
        self.assertEqual(Reporte.objects.count(), 0)

    def test_el_estado_enviado_se_ignora(self):
        body = self.crear(estado="resuelto").json()

        self.assertEqual(body["estado"], "recibido")

    def test_administrador_no_crea_reportes(self):
        self.assertEqual(self.crear(self.admin).status_code, 403)

    def test_sin_sesion(self):
        response = self.client.post("/api/reportes/", self.datos(), format="multipart")

        self.assertEqual(response.status_code, 401)

    def test_limite_de_envios(self):
        rates = {"auth": "1000/min", "reportes": "2/hour"}
        with mock.patch.object(SimpleRateThrottle, "THROTTLE_RATES", rates):
            codes = [self.crear().status_code for _ in range(3)]

        self.assertEqual(codes, [201, 201, 429])


class ListarReportesTests(ReportesTestCase):
    def setUp(self):
        super().setUp()
        self.de_ana = self.reporte(self.ana)
        self.de_beto = self.reporte(self.beto, categoria="alumbrado")
        Reporte.objects.filter(pk=self.de_beto.pk).update(estado=Estado.EN_PROCESO)

    def ids(self, response):
        return [r["id"] for r in response.json()["results"]]

    def test_todos_ven_todos_los_reportes_sin_datos_del_autor(self):
        self.como(self.ana)

        response = self.client.get("/api/reportes/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.ids(response), [self.de_beto.pk, self.de_ana.pk])
        por_id = {r["id"]: r for r in response.json()["results"]}
        self.assertTrue(por_id[self.de_ana.pk]["es_mio"])
        self.assertFalse(por_id[self.de_beto.pk]["es_mio"])
        self.assertNotIn("beto@ejemplo.mx", response.content.decode())
        self.assertNotIn("Beto", response.content.decode())

    def test_filtros(self):
        self.como(self.ana)

        por_estado = self.client.get("/api/reportes/", {"estado": "en_proceso"})
        por_categoria = self.client.get("/api/reportes/", {"categoria": "baches-y-pavimento"})
        combinados = self.client.get(
            "/api/reportes/", {"categoria": "alumbrado", "estado": "recibido"}
        )

        self.assertEqual(self.ids(por_estado), [self.de_beto.pk])
        self.assertEqual(self.ids(por_categoria), [self.de_ana.pk])
        self.assertEqual(self.ids(combinados), [])

    def test_estado_invalido(self):
        self.como(self.ana)

        response = self.client.get("/api/reportes/", {"estado": "cerrado"})

        self.assertEqual(response.status_code, 400)

    def test_paginacion(self):
        for _ in range(21):
            self.reporte(self.ana)
        self.como(self.beto)

        pagina1 = self.client.get("/api/reportes/").json()
        pagina2 = self.client.get("/api/reportes/", {"page": 2}).json()

        self.assertEqual(pagina1["count"], 23)
        self.assertEqual(len(pagina1["results"]), 20)
        self.assertIsNotNone(pagina1["next"])
        self.assertEqual(len(pagina2["results"]), 3)
        self.assertIsNone(pagina2["next"])

    def test_mis_reportes(self):
        self.como(self.beto)

        response = self.client.get("/api/reportes/mios/")

        self.assertEqual(self.ids(response), [self.de_beto.pk])
        self.assertTrue(response.json()["results"][0]["es_mio"])

    def test_mis_reportes_con_filtro(self):
        self.como(self.beto)

        response = self.client.get("/api/reportes/mios/", {"estado": "recibido"})

        self.assertEqual(self.ids(response), [])

    def test_detalle_de_otro_ciudadano(self):
        self.como(self.ana)

        body = self.client.get(f"/api/reportes/{self.de_beto.pk}/").json()

        self.assertFalse(body["es_mio"])
        self.assertFalse(body["puede_editar"])
        self.assertEqual(body["estado_display"], "En proceso")

    def test_sin_sesion(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get("/api/reportes/").status_code, 401)
        self.assertEqual(self.client.get("/api/reportes/mios/").status_code, 401)
        self.assertEqual(self.client.get(f"/api/reportes/{self.de_ana.pk}/").status_code, 401)

    def test_inexistente(self):
        self.como(self.ana)

        self.assertEqual(self.client.get("/api/reportes/99999/").status_code, 404)


class EditarReporteTests(ReportesTestCase):
    def setUp(self):
        super().setUp()
        self.mio = self.reporte(self.ana)

    def patch(self, data, user=None, fmt="json"):
        self.como(user or self.ana)
        return self.client.patch(f"/api/reportes/{self.mio.pk}/", data, format=fmt)

    def test_autor_edita_mientras_esta_recibido(self):
        response = self.patch({"descripcion": "El bache ya mide medio metro de ancho."})

        self.assertEqual(response.status_code, 200)
        self.mio.refresh_from_db()
        self.assertEqual(self.mio.descripcion, "El bache ya mide medio metro de ancho.")

    def test_cambiar_foto_borra_la_anterior(self):
        storage = self.mio.foto.storage
        anteriores = (self.mio.foto.name, self.mio.miniatura.name)

        response = self.patch({"foto": imagen(tamano=(640, 480))}, fmt="multipart")

        self.assertEqual(response.status_code, 200)
        self.mio.refresh_from_db()
        self.assertNotIn(self.mio.foto.name, anteriores)
        for nombre in anteriores:
            self.assertFalse(storage.exists(nombre))
        self.assertTrue(storage.exists(self.mio.foto.name))

    def test_otro_ciudadano_no_edita(self):
        response = self.patch({"descripcion": "Intento cambiar un reporte ajeno."}, self.beto)

        self.assertEqual(response.status_code, 403)

    def test_no_se_edita_cuando_ya_se_atiende(self):
        Reporte.objects.filter(pk=self.mio.pk).update(estado=Estado.EN_PROCESO)

        response = self.patch({"descripcion": "Quiero cambiarlo aunque ya se atiende."})

        self.assertEqual(response.status_code, 403)
        self.assertIn("ya se está atendiendo", response.json()["detail"])

    def test_administrador_no_edita_el_contenido(self):
        response = self.patch({"descripcion": "El admin intenta reescribirlo."}, self.admin)

        self.assertEqual(response.status_code, 403)

    def test_el_estado_no_se_cambia_por_patch(self):
        self.patch({"estado": "resuelto"})

        self.mio.refresh_from_db()
        self.assertEqual(self.mio.estado, Estado.RECIBIDO)

    def test_put_y_delete_no_existen(self):
        self.como(self.ana)
        url = f"/api/reportes/{self.mio.pk}/"

        self.assertEqual(self.client.put(url, {}, format="json").status_code, 405)
        self.assertEqual(self.client.delete(url).status_code, 405)


class CambioEstadoTests(ReportesTestCase):
    def setUp(self):
        super().setUp()
        self.reporte_ = self.reporte(self.ana)
        self.url = f"/api/admin/reportes/{self.reporte_.pk}/estado/"

    def cambiar(self, estado, user=None):
        self.como(user or self.admin)
        self.reporte_.refresh_from_db()
        datos = {"estado": estado, "desde": self.reporte_.estado}
        return self.client.post(self.url, datos, format="json")

    def test_flujo_del_administrador(self):
        for estado in ("en_proceso", "resuelto", "en_proceso", "resuelto"):
            with self.subTest(estado=estado):
                response = self.cambiar(estado)
                self.assertEqual(response.status_code, 200, response.content)
                self.assertEqual(response.json()["estado"], estado)

    def test_transicion_invalida(self):
        response = self.cambiar("resuelto")  # de recibido no se salta a resuelto

        self.assertEqual(response.status_code, 400)
        self.assertIn("No se puede pasar", response.json()["estado"][0])

    def test_estado_desconocido(self):
        self.assertEqual(self.cambiar("archivado").status_code, 400)

    def test_ciudadano_no_cambia_estados(self):
        self.assertEqual(self.cambiar("en_proceso", self.ana).status_code, 403)
        self.reporte_.refresh_from_db()
        self.assertEqual(self.reporte_.estado, Estado.RECIBIDO)

    def test_sin_sesion(self):
        self.client.force_authenticate(None)

        datos = {"estado": "en_proceso", "desde": "recibido"}
        response = self.client.post(self.url, datos, format="json")

        self.assertEqual(response.status_code, 401)


class BorrarReporteTests(ReportesTestCase):
    def test_borrar_desde_el_admin_borra_las_fotos(self):
        reporte = self.reporte()
        storage = reporte.foto.storage
        nombres = (reporte.foto.name, reporte.miniatura.name)

        reporte.delete()

        for nombre in nombres:
            self.assertFalse(storage.exists(nombre))
