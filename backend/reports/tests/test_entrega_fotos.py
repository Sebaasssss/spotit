from django.conf import settings
from django.test import override_settings
from rest_framework.test import APIClient

from .utils import ReportesTestCase

CONFIG = settings.REPORT_PHOTO


class EntregaFotoTests(ReportesTestCase):
    def setUp(self):
        super().setUp()
        self.como(self.ana)
        self.body = self.crear().json()
        self.anonimo = APIClient()  # como <img>: sin cabecera Authorization

    def test_url_firmada_entrega_la_foto_sin_token_de_sesion(self):
        response = self.anonimo.get(self.body["foto_url"])

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "image/jpeg")
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertTrue(b"".join(response.streaming_content).startswith(b"\xff\xd8"))

    def test_miniatura(self):
        response = self.anonimo.get(self.body["miniatura_url"])

        self.assertEqual(response.status_code, 200)

    def test_url_no_revela_la_ruta_interna(self):
        for url in (self.body["foto_url"], self.body["miniatura_url"]):
            self.assertTrue(url.startswith(f"/api/reportes/{self.body['id']}/foto/?t="))
            self.assertNotIn("reportes/20", url)

    def test_sin_token(self):
        response = self.anonimo.get(f"/api/reportes/{self.body['id']}/foto/")

        self.assertEqual(response.status_code, 404)

    def test_token_manipulado(self):
        response = self.anonimo.get(self.body["foto_url"][:-3] + "abc")

        self.assertEqual(response.status_code, 404)

    def test_token_de_otro_reporte(self):
        otro = self.crear().json()
        token = self.body["foto_url"].split("?t=")[1]

        response = self.anonimo.get(f"/api/reportes/{otro['id']}/foto/?t={token}")

        self.assertEqual(response.status_code, 404)

    @override_settings(REPORT_PHOTO={**CONFIG, "URL_MAX_AGE": -1})
    def test_token_caducado(self):
        response = self.anonimo.get(self.body["foto_url"])

        self.assertEqual(response.status_code, 404)

    @override_settings(MEDIA_X_ACCEL=True)
    def test_con_nginx_delega_con_x_accel_redirect(self):
        response = self.anonimo.get(self.body["foto_url"])

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"")
        self.assertRegex(
            response["X-Accel-Redirect"],
            r"^/_media_protegida/reportes/\d{4}/\d{2}/[0-9a-f]{32}\.jpg$",
        )
