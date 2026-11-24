from datetime import timedelta

from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from accounts.models import Rol, User

COOKIE = "spotit_refresh"
PASSWORD = "girasol-azul-2026"


class AuthTestCase(APITestCase):
    def setUp(self):
        cache.clear()  # reinicia los contadores del throttling entre pruebas
        self.client = APIClient()

    def crear_usuario(self, email="ana@ejemplo.mx", nombre="Ana López", **extra):
        return User.objects.create_user(email, PASSWORD, nombre=nombre, **extra)

    def login(self, email="ana@ejemplo.mx", password=PASSWORD, **extra):
        return self.client.post(
            reverse("auth-login"), {"email": email, "password": password}, format="json", **extra
        )


class RegisterTests(AuthTestCase):
    url = reverse("auth-register")

    def registrar(self, **data):
        payload = {"email": "nuevo@ejemplo.mx", "nombre": "Nuevo Usuario", "password": PASSWORD}
        payload.update(data)
        return self.client.post(self.url, payload, format="json")

    def test_registro_crea_ciudadano_e_inicia_sesion(self):
        response = self.registrar()

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertIn("access", body)
        self.assertEqual(body["user"]["email"], "nuevo@ejemplo.mx")
        self.assertEqual(body["user"]["rol"], Rol.CIUDADANO)
        self.assertNotIn("password", body["user"])

        cookie = response.cookies[COOKIE]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Strict")
        self.assertEqual(cookie["path"], "/api/auth/")
        self.assertNotIn("refresh", body, "el refresh solo viaja en la cookie")

    def test_no_se_puede_registrar_un_administrador(self):
        response = self.registrar(rol="administrador", is_staff=True, is_superuser=True)

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="nuevo@ejemplo.mx")
        self.assertEqual(user.rol, Rol.CIUDADANO)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_email_se_normaliza(self):
        self.registrar(email="  Nuevo@Ejemplo.MX ")

        self.assertTrue(User.objects.filter(email="nuevo@ejemplo.mx").exists())

    def test_email_duplicado_sin_importar_mayusculas(self):
        self.crear_usuario(email="nuevo@ejemplo.mx")

        response = self.registrar(email="NUEVO@ejemplo.mx")

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.json())

    def test_email_invalido(self):
        response = self.registrar(email="no-es-un-email")

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.json())

    def test_campos_obligatorios(self):
        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.json()), {"email", "nombre", "password"})

    def test_contrasena_corta(self):
        response = self.registrar(password="corta1")

        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.json())

    def test_contrasena_comun(self):
        response = self.registrar(password="password123")

        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.json())

    def test_contrasena_solo_numeros(self):
        response = self.registrar(password="12345678901234")

        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.json())

    def test_contrasena_parecida_al_email(self):
        response = self.registrar(email="mariposa.verde@ejemplo.mx", password="mariposa.verde")

        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.json())

    def test_nombre_demasiado_corto(self):
        response = self.registrar(nombre=" A ")

        self.assertEqual(response.status_code, 400)
        self.assertIn("nombre", response.json())


class LoginTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.user = self.crear_usuario()

    def test_login_correcto(self):
        response = self.login()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["id"], self.user.id)
        self.assertIn(COOKIE, response.cookies)
        self.assertEqual(response["Cache-Control"], "no-store")
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.last_login)

    def test_login_ignora_mayusculas_del_email(self):
        response = self.login(email="ANA@Ejemplo.mx")

        self.assertEqual(response.status_code, 200)

    def test_contrasena_incorrecta(self):
        response = self.login(password="no-es-esta-clave")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Email o contraseña incorrectos.")
        self.assertNotIn(COOKIE, response.cookies)

    def test_email_inexistente_da_el_mismo_mensaje(self):
        response = self.login(email="nadie@ejemplo.mx")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Email o contraseña incorrectos.")

    def test_usuario_inactivo_no_entra(self):
        self.user.is_active = False
        self.user.save()

        response = self.login()

        self.assertEqual(response.status_code, 401)

    def test_origen_ajeno_rechazado(self):
        response = self.login(HTTP_ORIGIN="https://sitio-malicioso.example")

        self.assertEqual(response.status_code, 403)

    def test_mismo_origen_aceptado(self):
        response = self.login(HTTP_ORIGIN="http://testserver")

        self.assertEqual(response.status_code, 200)

    @override_settings(CSRF_TRUSTED_ORIGINS=["https://*.trycloudflare.com"])
    def test_origen_de_confianza_con_comodin_aceptado(self):
        response = self.login(HTTP_ORIGIN="https://abc-def.trycloudflare.com")

        self.assertEqual(response.status_code, 200)


class ThrottleTests(AuthTestCase):
    def test_login_limitado_por_intentos(self):
        self.crear_usuario()
        codes = [self.login(password="incorrecta-x").status_code for _ in range(11)]

        self.assertEqual(codes[:10], [401] * 10)
        self.assertEqual(codes[10], 429)


class RefreshTests(AuthTestCase):
    url = reverse("auth-refresh")

    def setUp(self):
        super().setUp()
        self.user = self.crear_usuario()

    def test_sin_cookie(self):
        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 401)

    def test_refresh_rota_la_cookie_y_devuelve_access(self):
        login = self.login()
        old_refresh = login.cookies[COOKIE].value

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.json())
        self.assertEqual(response.json()["user"]["email"], "ana@ejemplo.mx")
        new_refresh = response.cookies[COOKIE].value
        self.assertNotEqual(new_refresh, old_refresh)

    def test_refresh_rotado_ya_no_sirve_si_su_sucesor_se_uso(self):
        login = self.login()
        old_refresh = login.cookies[COOKIE].value
        self.client.post(self.url)  # rota: el viejo va a la blacklist
        self.client.post(self.url)  # el sucesor se usa (y también rota)

        self.client.cookies[COOKIE] = old_refresh
        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.cookies[COOKIE].value, "", "se borra la cookie inválida")

    @override_settings(AUTH_REFRESH_GRACE_SECONDS=0)
    def test_sin_periodo_de_gracia_el_refresh_rotado_no_sirve(self):
        old_refresh = self.login().cookies[COOKIE].value
        self.client.post(self.url)

        self.client.cookies[COOKIE] = old_refresh
        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 401)

    def test_refresh_manipulado(self):
        self.client.cookies[COOKIE] = "esto.no.es-un-jwt"

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 401)

    def test_refresh_caducado(self):
        token = RefreshToken.for_user(self.user)
        token.set_exp(lifetime=-timedelta(seconds=1))
        self.client.cookies[COOKIE] = str(token)

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 401)

    def test_usuario_desactivado_pierde_la_sesion(self):
        self.login()
        self.user.is_active = False
        self.user.save()

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 401)

    def test_origen_ajeno_rechazado(self):
        self.login()

        response = self.client.post(self.url, HTTP_ORIGIN="https://sitio-malicioso.example")

        self.assertEqual(response.status_code, 403)


class RefreshGraceTests(AuthTestCase):
    """La respuesta de una rotación se pierde y el cliente reintenta con el token anterior."""

    url = reverse("auth-refresh")

    def setUp(self):
        super().setUp()
        self.crear_usuario()
        self.old = self.login().cookies[COOKIE].value
        # Rotación cuya respuesta "se pierde": el cliente nunca guarda el sucesor.
        self.lost_successor = self.client.post(self.url).cookies[COOKIE].value
        self.client.cookies[COOKIE] = self.old

    def test_el_token_anterior_se_acepta_una_vez(self):
        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.json())
        recovered = response.cookies[COOKIE].value
        self.assertNotIn(recovered, (self.old, self.lost_successor))

        # La nueva cookie funciona con normalidad.
        self.assertEqual(self.client.post(self.url).status_code, 200)

    def test_el_sucesor_perdido_queda_invalidado(self):
        self.client.post(self.url)

        self.client.cookies[COOKIE] = self.lost_successor
        self.assertEqual(self.client.post(self.url).status_code, 401)

    def test_la_gracia_solo_se_usa_una_vez(self):
        self.client.post(self.url)

        self.client.cookies[COOKIE] = self.old
        self.assertEqual(self.client.post(self.url).status_code, 401)

    def test_sin_gracia_tras_logout(self):
        self.client.cookies[COOKIE] = self.lost_successor
        self.client.post(reverse("auth-logout"))

        self.client.cookies[COOKIE] = self.old
        self.assertEqual(self.client.post(self.url).status_code, 401)


class LogoutTests(AuthTestCase):
    url = reverse("auth-logout")

    def test_logout_pone_el_refresh_en_blacklist_y_borra_la_cookie(self):
        self.crear_usuario()
        refresh = self.login().cookies[COOKIE].value

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.cookies[COOKIE].value, "")

        self.client.cookies[COOKIE] = refresh
        again = self.client.post(reverse("auth-refresh"))
        self.assertEqual(again.status_code, 401)

    def test_logout_sin_sesion_no_falla(self):
        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 204)

    def test_logout_con_token_invalido_no_falla(self):
        self.client.cookies[COOKIE] = "basura"

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 204)


class MeTests(AuthTestCase):
    url = reverse("me")

    def setUp(self):
        super().setUp()
        self.user = self.crear_usuario()

    def test_me_con_access_valido(self):
        access = self.login().json()["access"]

        response = self.client.get(self.url, HTTP_AUTHORIZATION=f"Bearer {access}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()), {"id", "email", "nombre", "rol", "date_joined"})
        self.assertEqual(response.json()["nombre"], "Ana López")

    def test_me_sin_token(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 401)

    def test_me_con_token_manipulado(self):
        access = self.login().json()["access"]

        response = self.client.get(self.url, HTTP_AUTHORIZATION=f"Bearer {access[:-4]}abcd")

        self.assertEqual(response.status_code, 401)

    def test_me_con_access_caducado(self):
        token = AccessToken.for_user(self.user)
        token.set_exp(lifetime=-timedelta(seconds=1))

        response = self.client.get(self.url, HTTP_AUTHORIZATION=f"Bearer {token}")

        self.assertEqual(response.status_code, 401)

    def test_me_no_acepta_el_refresh_como_access(self):
        refresh = RefreshToken.for_user(self.user)

        response = self.client.get(self.url, HTTP_AUTHORIZATION=f"Bearer {refresh}")

        self.assertEqual(response.status_code, 401)

    def test_me_solo_lectura(self):
        access = self.login().json()["access"]

        response = self.client.patch(
            self.url, {"rol": "administrador"}, format="json", HTTP_AUTHORIZATION=f"Bearer {access}"
        )

        self.assertEqual(response.status_code, 405)
