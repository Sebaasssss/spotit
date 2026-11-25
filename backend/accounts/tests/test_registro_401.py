"""Cada 401 deja una línea con ruta, motivo y prefijo del jti, y nada personal."""

from datetime import timedelta

import jwt
from django.test import override_settings
from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from accounts.auditoria import JTI_PREFIJO

from .test_auth_endpoints import COOKIE, AuthTestCase

LOGGER = "spotit.auth"


class Registro401Tests(AuthTestCase):
    refresh_url = reverse("auth-refresh")
    me_url = reverse("me")

    def setUp(self):
        super().setUp()
        self.user = self.crear_usuario()

    def linea(self, hacer):
        """Ejecuta `hacer` y devuelve la única línea registrada (y la respuesta)."""
        with self.assertLogs(LOGGER, "INFO") as cm:
            response = hacer()
        self.assertEqual(response.status_code, 401)
        self.assertEqual(len(cm.output), 1, cm.output)
        return cm.output[0], response

    def assertSinDatosPersonales(self, linea, *tokens):
        for prohibido in (self.user.email, self.user.nombre, f"={self.user.pk} ", *tokens):
            self.assertNotIn(str(prohibido), linea)

    def assertLinea(self, linea, ruta, motivo, jti="-"):
        self.assertTrue(linea.endswith(f"auth.401 ruta={ruta} motivo={motivo} jti={jti}"), linea)

    def jti(self, token):
        return str(token["jti"])[:JTI_PREFIJO]

    # --- Recursos protegidos ---

    def test_sin_token(self):
        linea, _ = self.linea(lambda: self.client.get(self.me_url))
        self.assertLinea(linea, self.me_url, "sin_token")

    def test_cabecera_sin_bearer(self):
        linea, _ = self.linea(lambda: self.client.get(self.me_url, HTTP_AUTHORIZATION="Token x"))
        self.assertLinea(linea, self.me_url, "cabecera_invalida")

    def test_access_caducado(self):
        token = AccessToken.for_user(self.user)
        token.set_exp(lifetime=-timedelta(seconds=1))

        linea, _ = self.linea(
            lambda: self.client.get(self.me_url, HTTP_AUTHORIZATION=f"Bearer {token}")
        )

        self.assertLinea(linea, self.me_url, "access_caducado", self.jti(token))
        self.assertSinDatosPersonales(linea, str(token))

    def test_access_firmado_con_otra_clave(self):
        token = AccessToken.for_user(self.user)
        falso = jwt.encode(dict(token.payload), "otra-clave-que-no-es-la-del-servidor", "HS256")

        linea, _ = self.linea(
            lambda: self.client.get(self.me_url, HTTP_AUTHORIZATION=f"Bearer {falso}")
        )

        self.assertLinea(linea, self.me_url, "access_invalido", self.jti(token))
        self.assertSinDatosPersonales(linea, str(token), falso)

    def test_access_ilegible(self):
        manipulado = f"{AccessToken.for_user(self.user)}"[:-4] + "a$cd"

        linea, _ = self.linea(
            lambda: self.client.get(self.me_url, HTTP_AUTHORIZATION=f"Bearer {manipulado}")
        )

        self.assertLinea(linea, self.me_url, "access_invalido")
        self.assertSinDatosPersonales(linea, manipulado)

    def test_la_ruta_no_incluye_la_query_string(self):
        linea, _ = self.linea(lambda: self.client.get("/api/reportes/?t=secreto&page=2"))
        self.assertLinea(linea, "/api/reportes/", "sin_token")
        self.assertNotIn("secreto", linea)

    def test_las_respuestas_correctas_no_se_registran(self):
        access = self.login().json()["access"]
        with self.assertNoLogs(LOGGER, "INFO"):
            self.client.get(self.me_url, HTTP_AUTHORIZATION=f"Bearer {access}")

    # --- Refresh ---

    def test_refresh_sin_cookie(self):
        linea, _ = self.linea(lambda: self.client.post(self.refresh_url))
        self.assertLinea(linea, "/api/auth/refresh/", "sin_cookie")

    def test_refresh_ilegible(self):
        self.client.cookies[COOKIE] = "esto.no.es-un-jwt"
        linea, _ = self.linea(lambda: self.client.post(self.refresh_url))
        self.assertLinea(linea, "/api/auth/refresh/", "refresh_ilegible")

    def test_refresh_caducado(self):
        token = RefreshToken.for_user(self.user)
        token.set_exp(lifetime=-timedelta(seconds=1))
        self.client.cookies[COOKIE] = str(token)

        linea, _ = self.linea(lambda: self.client.post(self.refresh_url))

        self.assertLinea(linea, "/api/auth/refresh/", "refresh_caducado", self.jti(token))
        self.assertSinDatosPersonales(linea, str(token))

    @override_settings(AUTH_REFRESH_GRACE_SECONDS=0)
    def test_refresh_revocado_sin_gracia(self):
        viejo = self.login().cookies[COOKIE].value
        self.client.post(self.refresh_url)
        self.client.cookies[COOKIE] = viejo

        linea, _ = self.linea(lambda: self.client.post(self.refresh_url))

        self.assertLinea(
            linea, "/api/auth/refresh/", "refresh_revocado", self.jti(RefreshToken(viejo, False))
        )
        self.assertSinDatosPersonales(linea, viejo)

    def test_gracia_ya_usada(self):
        viejo = self.login().cookies[COOKIE].value
        self.client.post(self.refresh_url)  # rotación cuya respuesta "se pierde"
        self.client.cookies[COOKIE] = viejo
        self.assertEqual(self.client.post(self.refresh_url).status_code, 200)  # usa la gracia

        self.client.cookies[COOKIE] = viejo
        linea, _ = self.linea(lambda: self.client.post(self.refresh_url))

        self.assertLinea(
            linea, "/api/auth/refresh/", "gracia_ya_usada", self.jti(RefreshToken(viejo, False))
        )
        self.assertSinDatosPersonales(linea, viejo)

    def test_gracia_con_el_sucesor_ya_usado(self):
        viejo = self.login().cookies[COOKIE].value
        self.client.post(self.refresh_url)  # rota
        self.client.post(self.refresh_url)  # el sucesor se usa
        self.client.cookies[COOKIE] = viejo

        linea, _ = self.linea(lambda: self.client.post(self.refresh_url))

        self.assertIn("motivo=gracia_sucesor_invalidado ", linea)

    def test_usuario_desactivado(self):
        self.login()
        self.user.is_active = False
        self.user.save()

        linea, _ = self.linea(lambda: self.client.post(self.refresh_url))

        self.assertIn("ruta=/api/auth/refresh/ motivo=usuario_inactivo ", linea)
        self.assertSinDatosPersonales(linea)
