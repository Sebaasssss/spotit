"""Notificaciones push: suscripciones, encolado con el historial y envío (servicio simulado)."""

from datetime import timedelta
from io import StringIO
from types import SimpleNamespace
from unittest import mock

from django.core.management import call_command
from django.db import transaction
from django.test import override_settings
from django.utils import timezone
from pywebpush import WebPushException
from requests import ConnectionError as ErrorDeRed

from accounts.models import Rol
from avisos import servicio
from avisos.models import AvisoPush, EstadoAviso, SuscripcionPush
from reports.models import EventoReporte, TipoEvento
from reports.tests.utils import ReportesTestCase

CLAVES = {
    "VAPID_PUBLIC_KEY": "BPublicaDePrueba",
    "VAPID_PRIVATE_KEY": "privada-de-prueba",
    "VAPID_SUBJECT": "mailto:avisos@spotit.test",
}
SIN_CLAVES = {"VAPID_PUBLIC_KEY": "", "VAPID_PRIVATE_KEY": "", "VAPID_SUBJECT": ""}
SUSCRIPCIONES = "/api/push/suscripciones/"


def datos_suscripcion(n=1):
    return {
        "endpoint": f"https://push.ejemplo.test/envio/{n}",
        "keys": {"p256dh": f"p256dh-{n}", "auth": f"auth-{n}"},
    }


def respuesta(status, retry_after=None):
    headers = {"Retry-After": str(retry_after)} if retry_after else {}
    return SimpleNamespace(status_code=status, headers=headers)


def fallo(status, retry_after=None):
    return WebPushException(f"HTTP {status}", response=respuesta(status, retry_after))


@override_settings(**CLAVES)
class PushTestCase(ReportesTestCase):
    def setUp(self):
        super().setUp()
        self.admin.rol = Rol.ADMINISTRADOR
        self.admin.save()
        self.de_ana = self.reporte(self.ana)

    def suscribir(self, user, n=1):
        return SuscripcionPush.objects.create(
            usuario=user,
            endpoint=f"https://push.ejemplo.test/envio/{user.pk}-{n}",
            p256dh="p",
            auth="a",
        )

    def admin_post(self, accion, datos):
        self.como(self.admin)
        return self.client.post(
            f"/api/admin/reportes/{self.de_ana.pk}/{accion}/", datos, format="json"
        )

    def a_en_proceso(self, nota=""):
        return self.admin_post(
            "estado", {"estado": "en_proceso", "desde": "recibido", "nota_publica": nota}
        )


class SuscripcionTests(PushTestCase):
    def test_clave_publica_sin_sesion(self):
        self.client.force_authenticate(None)
        response = self.client.get("/api/push/clave/")
        self.assertEqual(response.json(), {"activo": True, "clave": "BPublicaDePrueba"})

    def test_registrar_y_repetir_actualiza(self):
        self.como(self.ana)
        primera = self.client.post(SUSCRIPCIONES, datos_suscripcion(), format="json")
        datos = datos_suscripcion()
        datos["keys"]["auth"] = "auth-nueva"
        segunda = self.client.post(SUSCRIPCIONES, datos, format="json")

        self.assertEqual((primera.status_code, segunda.status_code), (201, 200))
        suscripcion = SuscripcionPush.objects.get()
        self.assertEqual((suscripcion.usuario, suscripcion.auth), (self.ana, "auth-nueva"))

    def test_endpoint_no_https(self):
        self.como(self.ana)
        datos = datos_suscripcion()
        datos["endpoint"] = "http://push.ejemplo.test/x"
        self.assertEqual(self.client.post(SUSCRIPCIONES, datos, format="json").status_code, 400)

    def test_accesos(self):
        self.client.force_authenticate(None)
        self.assertEqual(
            self.client.post(SUSCRIPCIONES, datos_suscripcion(), format="json").status_code, 401
        )
        self.como(self.admin)
        self.assertEqual(
            self.client.post(SUSCRIPCIONES, datos_suscripcion(), format="json").status_code, 403
        )
        self.assertEqual(SuscripcionPush.objects.count(), 0)

    def test_el_mismo_navegador_pasa_a_otra_cuenta_y_se_registra_sin_datos_personales(self):
        self.como(self.ana)
        self.client.post(SUSCRIPCIONES, datos_suscripcion(), format="json")

        self.como(self.beto)
        with self.assertLogs("spotit.push", level="INFO") as logs:
            response = self.client.post(SUSCRIPCIONES, datos_suscripcion(), format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(SuscripcionPush.objects.get().usuario, self.beto)
        linea = logs.output[-1]
        self.assertIn("push.suscripcion_reasignada", linea)
        for dato in ("ana@", "beto@", "Ana", "Beto", "push.ejemplo.test"):
            self.assertNotIn(dato, linea)

    def test_quitar_solo_la_propia(self):
        self.como(self.ana)
        self.client.post(SUSCRIPCIONES, datos_suscripcion(), format="json")

        self.como(self.beto)
        self.client.delete(
            SUSCRIPCIONES, {"endpoint": datos_suscripcion()["endpoint"]}, format="json"
        )
        self.assertEqual(SuscripcionPush.objects.count(), 1)

        self.como(self.ana)
        response = self.client.delete(
            SUSCRIPCIONES, {"endpoint": datos_suscripcion()["endpoint"]}, format="json"
        )
        self.assertEqual(response.status_code, 204)
        self.assertEqual(SuscripcionPush.objects.count(), 0)

    @override_settings(**SIN_CLAVES)
    def test_sin_claves_el_push_esta_apagado(self):
        self.assertEqual(
            self.client.get("/api/push/clave/").json(), {"activo": False, "clave": None}
        )
        self.como(self.ana)
        response = self.client.post(SUSCRIPCIONES, datos_suscripcion(), format="json")
        self.assertEqual(response.status_code, 503)


class EncolarTests(PushTestCase):
    def cuerpos(self):
        return list(AvisoPush.objects.values_list("cuerpo", flat=True))

    def test_cambio_de_estado_un_aviso_por_dispositivo(self):
        movil, compu = self.suscribir(self.ana, 1), self.suscribir(self.ana, 2)
        self.suscribir(self.beto)  # otra persona: no recibe

        self.a_en_proceso()

        avisos = AvisoPush.objects.all()
        self.assertEqual({a.suscripcion for a in avisos}, {movil, compu})
        self.assertEqual(self.cuerpos(), ["Tu reporte cambió a «En proceso»."] * 2)
        aviso = avisos[0]
        self.assertEqual(
            (aviso.url, aviso.etiqueta),
            (f"/reportes/{self.de_ana.pk}", f"reporte-{self.de_ana.pk}"),
        )
        self.assertEqual(aviso.estado, EstadoAviso.PENDIENTE)

    def test_la_nota_no_va_en_el_aviso(self):
        self.suscribir(self.ana)

        self.a_en_proceso(nota="El bache de la calle 5 lo tapamos el martes.")

        self.assertEqual(
            self.cuerpos(), ["Tu reporte cambió a «En proceso». Tiene una nota nueva."]
        )

    def test_dejar_una_nota_avisa(self):
        self.suscribir(self.ana)

        response = self.admin_post("nota", {"nota_publica": "Ya lo vimos; vamos el lunes."})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["historial"][-1]["tipo"], "nota")
        self.assertEqual(self.cuerpos(), ["Tienes una nota nueva en tu reporte."])

    def test_reporte_oculto_aviso_generico(self):
        self.suscribir(self.ana)

        self.admin_post(
            "ocultar", {"motivo": "Se ven caras y placas.", "nota_publica": "Lo revisamos."}
        )
        self.admin_post("nota", {"nota_publica": "Sigue en revisión."})

        self.assertEqual(self.cuerpos(), ["Hay novedades en tu reporte."] * 2)

    def test_usuario_sin_suscripcion(self):
        self.a_en_proceso()
        self.assertEqual(AvisoPush.objects.count(), 0)

    def test_no_se_avisa_a_quien_hizo_el_cambio_sobre_su_propio_reporte(self):
        self.suscribir(self.admin)
        self.de_ana.autor = self.admin
        self.de_ana.save()

        self.a_en_proceso()

        self.assertEqual(AvisoPush.objects.count(), 0)

    @override_settings(**SIN_CLAVES)
    def test_sin_claves_no_se_encola(self):
        self.suscribir(self.ana)
        self.a_en_proceso()
        self.assertEqual(AvisoPush.objects.count(), 0)

    def test_el_aviso_se_crea_dentro_del_mismo_atomic_que_el_evento(self):
        self.suscribir(self.ana)

        with self.assertRaises(RuntimeError):
            with transaction.atomic():
                EventoReporte.objects.create(
                    reporte=self.de_ana,
                    tipo=TipoEvento.NOTA,
                    nota_publica="Nota de prueba.",
                    admin=self.admin,
                )
                # Dentro de la misma transacción el aviso ya existe…
                self.assertEqual(AvisoPush.objects.count(), 1)
                raise RuntimeError("falla después del evento")

        # …y si la transacción se deshace, se deshace con ella: no sale ningún aviso.
        self.assertEqual(EventoReporte.objects.count(), 0)
        self.assertEqual(AvisoPush.objects.count(), 0)

    def test_si_el_cambio_falla_no_hay_aviso(self):
        self.suscribir(self.ana)
        response = self.admin_post("estado", {"estado": "resuelto", "desde": "recibido"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(AvisoPush.objects.count(), 0)


class EnvioTests(PushTestCase):
    def setUp(self):
        super().setUp()
        self.movil = self.suscribir(self.ana, 1)
        self.compu = self.suscribir(self.ana, 2)
        self.a_en_proceso()
        patcher = mock.patch.object(servicio, "_webpush")
        self.webpush = patcher.start()
        self.addCleanup(patcher.stop)

    def aviso(self, suscripcion=None):
        return AvisoPush.objects.get(suscripcion=suscripcion or self.movil)

    def test_envio_correcto_a_cada_dispositivo(self):
        procesados = servicio.procesar_pendientes()

        self.assertEqual(procesados, 2)
        self.assertEqual(self.webpush.call_count, 2)
        llamada = self.webpush.call_args.kwargs
        self.assertIn("Tu reporte cambió a «En proceso».", llamada["data"])
        self.assertAlmostEqual(llamada["ttl"], 24 * 3600, delta=5)
        self.assertEqual(llamada["vapid_claims"], {"sub": "mailto:avisos@spotit.test"})
        self.assertEqual(
            set(AvisoPush.objects.values_list("estado", flat=True)), {EstadoAviso.ENVIADO}
        )
        self.movil.refresh_from_db()
        self.assertIsNotNone(self.movil.ultimo_envio)

    def test_suscripcion_caducada_410_o_404_se_borra(self):
        self.webpush.side_effect = [fallo(410), fallo(404)]

        servicio.procesar_pendientes()

        self.assertEqual(SuscripcionPush.objects.count(), 0)
        self.assertEqual(AvisoPush.objects.count(), 0)

    def test_servidor_caido_reintenta_mas_tarde(self):
        self.webpush.side_effect = [fallo(503), None]
        antes = timezone.now()

        servicio.procesar_pendientes(limite=1)

        aviso = AvisoPush.objects.get(estado=EstadoAviso.PENDIENTE, intentos=1)
        self.assertEqual(aviso.error, "http_503")
        self.assertGreaterEqual(aviso.proximo_intento, antes + timedelta(seconds=29))

    def test_respeta_retry_after(self):
        self.webpush.side_effect = fallo(429, retry_after=300)
        antes = timezone.now()

        servicio.enviar(self.aviso())

        self.assertGreaterEqual(self.aviso().proximo_intento, antes + timedelta(seconds=299))

    def test_sin_red_reintenta(self):
        self.webpush.side_effect = ErrorDeRed("sin red")

        servicio.enviar(self.aviso())

        self.assertEqual((self.aviso().estado, self.aviso().error), (EstadoAviso.PENDIENTE, "red"))

    def test_el_reintento_envia_lo_que_queda_de_las_24_h(self):
        AvisoPush.objects.filter(pk=self.aviso().pk).update(
            caduca=timezone.now() + timedelta(seconds=1000), intentos=2
        )

        servicio.enviar(self.aviso())

        self.assertAlmostEqual(self.webpush.call_args.kwargs["ttl"], 1000, delta=5)

    def test_caducado_se_descarta_sin_enviar(self):
        AvisoPush.objects.filter(pk=self.aviso().pk).update(
            caduca=timezone.now() - timedelta(seconds=1)
        )

        servicio.enviar(self.aviso())

        self.webpush.assert_not_called()
        self.assertEqual(
            (self.aviso().estado, self.aviso().error), (EstadoAviso.DESCARTADO, "caducado")
        )

    def test_tras_cinco_intentos_se_descarta(self):
        self.webpush.side_effect = fallo(500)
        aviso = self.aviso()
        for _ in range(5):
            servicio.enviar(aviso)
            aviso.refresh_from_db()

        self.assertEqual((aviso.estado, aviso.intentos), (EstadoAviso.DESCARTADO, 5))

    def test_otro_4xx_se_descarta_y_la_suscripcion_sigue(self):
        self.webpush.side_effect = fallo(400)

        servicio.enviar(self.aviso())

        self.assertEqual(
            (self.aviso().estado, self.aviso().error), (EstadoAviso.DESCARTADO, "http_400")
        )
        self.assertTrue(SuscripcionPush.objects.filter(pk=self.movil.pk).exists())

    def test_purga_de_mas_de_7_dias(self):
        servicio.procesar_pendientes()
        viejo, nuevo = AvisoPush.objects.all()
        AvisoPush.objects.filter(pk=viejo.pk).update(creado=timezone.now() - timedelta(days=8))
        pendiente_viejo = AvisoPush.objects.create(
            suscripcion=self.movil,
            evento=viejo.evento,
            titulo="SpotIt",
            cuerpo="x",
            url="/",
            etiqueta="t",
            proximo_intento=timezone.now(),
            caduca=timezone.now(),
        )
        AvisoPush.objects.filter(pk=pendiente_viejo.pk).update(
            creado=timezone.now() - timedelta(days=8)
        )

        self.assertEqual(servicio.purgar(), 1)
        self.assertEqual(
            set(AvisoPush.objects.values_list("pk", flat=True)), {nuevo.pk, pendiente_viejo.pk}
        )

    def test_comando_una_pasada(self):
        salida = StringIO()
        call_command("enviar_push", stdout=salida)
        self.assertIn("Procesados 2", salida.getvalue())


class LineaDeTiempoTests(PushTestCase):
    def test_otros_ciudadanos_ven_las_notas_sueltas(self):
        self.admin_post("nota", {"nota_publica": "Vamos el lunes."})

        self.como(self.beto)
        historial = self.client.get(f"/api/reportes/{self.de_ana.pk}/").json()["historial"]

        self.assertEqual(
            [(e["tipo"], e["nota_publica"]) for e in historial], [("nota", "Vamos el lunes.")]
        )

    def test_la_nota_es_obligatoria_y_solo_para_administradores(self):
        self.assertEqual(self.admin_post("nota", {"nota_publica": "  "}).status_code, 400)
        self.como(self.ana)
        response = self.client.post(
            f"/api/admin/reportes/{self.de_ana.pk}/nota/", {"nota_publica": "x"}, format="json"
        )
        self.assertEqual(response.status_code, 403)
