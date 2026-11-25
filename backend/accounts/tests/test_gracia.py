"""Gracia del refresh con reintentos (ver accounts/rotation.py y docs/decisiones.md).

Ventana fija desde la primera rotación, reintentos con el token anterior mientras su
sucesor no se haya presentado (con tope), un solo sucesor válido a la vez, detección de
reutilización y sin gracia tras un logout.
"""

import threading
import time

from django.conf import settings
from django.core.cache import cache
from django.db import connections
from django.test import TransactionTestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

from accounts.models import User

from .test_auth_endpoints import COOKIE, PASSWORD, AuthTestCase

REFRESH = reverse("auth-refresh")
LOGOUT = reverse("auth-logout")


def validos(user) -> list[str]:
    """Refresh tokens de la persona que siguen sin invalidar."""
    return list(
        OutstandingToken.objects.filter(user=user, blacklistedtoken__isnull=True).values_list(
            "token", flat=True
        )
    )


class GraciaTestCase(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.user = self.crear_usuario()
        self.viejo = self.login().cookies[COOKIE].value

    def renovar(self, token):
        """Renueva con `token`; devuelve (status, cookie nueva o None)."""
        self.client.cookies[COOKIE] = token
        response = self.client.post(REFRESH)
        nueva = response.cookies[COOKIE].value if COOKIE in response.cookies else None
        return response.status_code, nueva or None


class ReintentosTests(GraciaTestCase):
    def test_tres_respuestas_perdidas_seguidas_y_la_sesion_sobrevive(self):
        # La rotación y dos reintentos: sus respuestas nunca llegan al teléfono.
        for _ in range(3):
            status, _perdida = self.renovar(self.viejo)
            self.assertEqual(status, 200)
        # El tercer reintento sí llega.
        status, buena = self.renovar(self.viejo)
        self.assertEqual(status, 200)

        status, siguiente = self.renovar(buena)

        self.assertEqual(status, 200)
        self.assertEqual(self.renovar(siguiente)[0], 200)

    def test_solo_hay_un_sucesor_valido_a_la_vez(self):
        emitidos = [self.renovar(self.viejo)[1] for _ in range(3)]

        self.assertEqual(validos(self.user), [emitidos[-1]])

    def test_tope_de_reintentos(self):
        self.renovar(self.viejo)  # rotación
        for _ in range(settings.AUTH_REFRESH_GRACE_RETRIES):
            self.assertEqual(self.renovar(self.viejo)[0], 200)
        vigente = validos(self.user)

        status, _ = self.renovar(self.viejo)

        self.assertEqual(status, 401)
        # Pasado el tope no se emite nada nuevo y el último sucesor sigue valiendo.
        self.assertEqual(validos(self.user), vigente)
        self.assertEqual(self.renovar(vigente[0])[0], 200)


class ReutilizacionTests(GraciaTestCase):
    def test_reutilizar_el_anterior_tras_usar_el_sucesor_invalida_la_cadena(self):
        _, sucesor = self.renovar(self.viejo)
        _, nieto = self.renovar(sucesor)  # el sucesor se usó

        status, _ = self.renovar(self.viejo)  # alguien vuelve con el anterior

        self.assertEqual(status, 401)
        self.assertEqual(validos(self.user), [])
        self.assertEqual(self.renovar(nieto)[0], 401)

    def test_presentar_un_sucesor_descartado_invalida_la_cadena(self):
        """Si el teléfono tenía el sucesor, su respuesta no se perdió: el reintento con el
        token anterior lo hizo alguien más."""
        _, sucesor = self.renovar(self.viejo)
        _, del_reintento = self.renovar(self.viejo)

        status, _ = self.renovar(sucesor)

        self.assertEqual(status, 401)
        self.assertEqual(validos(self.user), [])
        self.assertEqual(self.renovar(del_reintento)[0], 401)

    def test_el_motivo_queda_registrado(self):
        _, sucesor = self.renovar(self.viejo)
        self.renovar(sucesor)

        with self.assertLogs("spotit.auth", level="INFO") as logs:
            self.renovar(self.viejo)

        self.assertIn("motivo=reutilizacion_detectada", logs.output[-1])


class VentanaTests(GraciaTestCase):
    @override_settings(AUTH_REFRESH_GRACE_SECONDS=1)
    def test_fuera_de_la_ventana_no_hay_gracia(self):
        self.renovar(self.viejo)
        time.sleep(1.3)

        status, _ = self.renovar(self.viejo)

        self.assertEqual(status, 401)

    @override_settings(AUTH_REFRESH_GRACE_SECONDS=2)
    def test_los_reintentos_no_alargan_la_ventana(self):
        self.renovar(self.viejo)
        time.sleep(1.2)
        self.assertEqual(self.renovar(self.viejo)[0], 200)  # dentro de la ventana
        time.sleep(1.2)  # a 2.4 s de la primera rotación, a 1.2 s del reintento

        status, _ = self.renovar(self.viejo)

        self.assertEqual(status, 401)


class LogoutTests(GraciaTestCase):
    def test_sin_gracia_tras_logout_con_el_sucesor(self):
        _, sucesor = self.renovar(self.viejo)
        self.client.cookies[COOKIE] = sucesor
        self.client.post(LOGOUT)

        self.assertEqual(self.renovar(self.viejo)[0], 401)
        self.assertEqual(validos(self.user), [])

    def test_logout_con_el_token_anterior_invalida_tambien_el_sucesor(self):
        """Se cierra sesión con una cookie vieja (la respuesta del refresh se perdió)."""
        _, sucesor = self.renovar(self.viejo)
        self.client.cookies[COOKIE] = self.viejo
        self.client.post(LOGOUT)

        self.assertEqual(self.renovar(sucesor)[0], 401)
        self.assertEqual(self.renovar(self.viejo)[0], 401)
        self.assertEqual(validos(self.user), [])


class ConcurrenciaTests(TransactionTestCase):
    """Renovaciones simultáneas reales (cada hilo con su propia conexión a PostgreSQL)."""

    serialized_rollback = True

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user("ana@ejemplo.mx", PASSWORD, nombre="Ana López")
        login = APIClient().post(
            reverse("auth-login"), {"email": "ana@ejemplo.mx", "password": PASSWORD}, format="json"
        )
        self.token = login.cookies[COOKIE].value

    def a_la_vez(self, token, n):
        barrera = threading.Barrier(n)
        resultados = [None] * n
        errores = []

        def correr(i):
            try:
                client = APIClient()
                client.cookies[COOKIE] = token
                barrera.wait(timeout=10)
                resultados[i] = client.post(REFRESH).status_code
            except Exception as exc:  # noqa: BLE001 — se reporta abajo
                errores.append(exc)
            finally:
                connections.close_all()

        hilos = [threading.Thread(target=correr, args=(i,)) for i in range(n)]
        for hilo in hilos:
            hilo.start()
        for hilo in hilos:
            hilo.join(timeout=30)
        self.assertEqual(errores, [])
        return resultados

    def assertUnoValidoQueFunciona(self):
        quedan = validos(self.user)
        self.assertEqual(len(quedan), 1, quedan)
        client = APIClient()
        client.cookies[COOKIE] = quedan[0]
        self.assertEqual(client.post(REFRESH).status_code, 200)

    def test_renovaciones_simultaneas_del_mismo_token_dejan_uno_valido(self):
        estados = self.a_la_vez(self.token, 4)

        self.assertIn(200, estados)
        self.assertTrue(all(e in (200, 401) for e in estados), estados)
        self.assertUnoValidoQueFunciona()

    def test_reintentos_simultaneos_con_el_token_anterior_dejan_uno_valido(self):
        client = APIClient()
        client.cookies[COOKIE] = self.token
        self.assertEqual(client.post(REFRESH).status_code, 200)  # rotación cuya respuesta se pierde

        estados = self.a_la_vez(self.token, 6)

        self.assertIn(200, estados)
        self.assertLessEqual(estados.count(200), settings.AUTH_REFRESH_GRACE_RETRIES)
        self.assertUnoValidoQueFunciona()
