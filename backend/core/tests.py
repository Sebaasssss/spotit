from unittest import mock

from django.db import OperationalError
from django.test import TestCase
from django.urls import reverse


class HealthEndpointTests(TestCase):
    url = reverse("health")

    def test_ok_cuando_la_base_responde(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
        self.assertEqual(response.json()["database"], "ok")
        self.assertIn("version", response.json())
        self.assertEqual(response["Cache-Control"], "no-store")

    def test_503_cuando_la_base_no_responde(self):
        with (
            mock.patch("core.views.connection.cursor", side_effect=OperationalError("caída")),
            self.assertLogs("core.views", level="ERROR"),
        ):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["status"], "error")
        self.assertEqual(response.json()["database"], "error")

    def test_no_requiere_autenticacion(self):
        response = self.client.get(self.url, HTTP_AUTHORIZATION="Bearer token-invalido")

        self.assertEqual(response.status_code, 200)

    def test_solo_acepta_get(self):
        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 405)
