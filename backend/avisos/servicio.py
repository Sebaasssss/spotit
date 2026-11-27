"""Qué se avisa, con qué texto, y cómo se envía.

El texto aparece en la pantalla de bloqueo, así que es sobrio: nunca lleva la nota pública,
la categoría ni la descripción, y un reporte oculto solo genera un aviso genérico.
"""

import json
import logging
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from reports.models import Estado, TipoEvento

from .models import AvisoPush, EstadoAviso, SuscripcionPush

logger = logging.getLogger("spotit.push")

TITULO = "SpotIt"
GENERICO = "Hay novedades en tu reporte."


def push_activo() -> bool:
    return bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY and settings.VAPID_SUBJECT)


def texto_del_aviso(evento) -> str | None:
    """Texto del aviso para el autor del reporte, o None si este evento no avisa."""
    reporte = evento.reporte
    # Oculto (o moderación): sin contenido en la pantalla de bloqueo.
    if reporte.oculto or evento.tipo in (TipoEvento.OCULTAR, TipoEvento.MOSTRAR):
        return GENERICO
    if evento.tipo == TipoEvento.NOTA:
        return "Tienes una nota nueva en tu reporte."
    if evento.tipo == TipoEvento.ESTADO:
        texto = f"Tu reporte cambió a «{Estado(evento.estado_nuevo).label}»."
        return f"{texto} Tiene una nota nueva." if evento.nota_publica else texto
    return None


def encolar_por_evento(evento) -> int:
    """Crea los avisos de un evento del historial, uno por dispositivo del autor.

    Se llama dentro de la transacción que crea el evento: si el cambio no se guarda, tampoco
    sale ningún aviso. Devuelve cuántos encoló.
    """
    if not push_activo():
        return 0
    reporte = evento.reporte
    autor_id = reporte.autor_id
    # Sin autor (cuenta borrada) o un cambio hecho por la misma persona: nada que avisar.
    if autor_id is None or autor_id == evento.admin_id:
        return 0
    texto = texto_del_aviso(evento)
    if texto is None:
        return 0
    ahora = timezone.now()
    caduca = ahora + timedelta(seconds=settings.PUSH["TTL_SEGUNDOS"])
    avisos = [
        AvisoPush(
            suscripcion=suscripcion,
            evento=evento,
            titulo=TITULO,
            cuerpo=texto,
            url=f"/reportes/{reporte.pk}",
            etiqueta=f"reporte-{reporte.pk}",
            proximo_intento=ahora,
            caduca=caduca,
        )
        for suscripcion in SuscripcionPush.objects.filter(usuario_id=autor_id)
    ]
    AvisoPush.objects.bulk_create(avisos)
    return len(avisos)


# --- Envío (lo usa el worker) ---


class _Resultado:
    ENVIADO = "enviado"
    CADUCADA = "caducada"  # 404/410: la suscripción ya no existe
    REINTENTAR = "reintentar"  # red, 429 o 5xx
    DESCARTAR = "descartar"  # otro 4xx


def _clasificar(status: int | None) -> str:
    if status in (404, 410):
        return _Resultado.CADUCADA
    if status is None or status == 429 or status >= 500:
        return _Resultado.REINTENTAR
    return _Resultado.DESCARTAR


def _webpush(**kwargs):
    """Punto único de llamada a pywebpush (las pruebas lo sustituyen)."""
    from pywebpush import webpush

    return webpush(**kwargs)


def _retry_after(respuesta) -> int | None:
    valor = getattr(respuesta, "headers", {}).get("Retry-After") if respuesta is not None else None
    return int(valor) if valor and str(valor).isdigit() else None


def enviar(aviso: AvisoPush) -> str:
    """Intenta enviar un aviso y actualiza su estado. Devuelve el resultado."""
    from pywebpush import WebPushException
    from requests import RequestException

    ahora = timezone.now()
    ttl = int((aviso.caduca - ahora).total_seconds())
    if ttl <= 0:
        _cerrar(aviso, EstadoAviso.DESCARTADO, "caducado")
        return _Resultado.DESCARTAR

    status, respuesta = None, None
    try:
        _webpush(
            subscription_info=aviso.suscripcion.info(),
            data=json.dumps(aviso.payload(), ensure_ascii=False),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_SUBJECT},
            # En un reintento, lo que queda de las 24 h originales; nunca 24 h nuevas.
            ttl=ttl,
            headers={"Urgency": "normal"},
            timeout=10,
        )
    except WebPushException as exc:
        respuesta = exc.response
        status = getattr(respuesta, "status_code", None)
    except RequestException:
        status = None
    else:
        aviso.estado = EstadoAviso.ENVIADO
        aviso.enviado_en = ahora
        aviso.intentos += 1
        aviso.error = ""
        aviso.save(update_fields=["estado", "enviado_en", "intentos", "error"])
        SuscripcionPush.objects.filter(pk=aviso.suscripcion_id).update(ultimo_envio=ahora)
        logger.info("push.enviado aviso=%s", aviso.pk)
        return _Resultado.ENVIADO

    resultado = _clasificar(status)
    if resultado == _Resultado.CADUCADA:
        # La suscripción caducó o la quitaron en el navegador: se borra (y sus avisos).
        logger.info(
            "push.suscripcion_caducada suscripcion=%s status=%s", aviso.suscripcion_id, status
        )
        aviso.suscripcion.delete()
        return resultado

    aviso.intentos += 1
    aviso.error = f"http_{status}" if status else "red"
    if resultado == _Resultado.REINTENTAR and aviso.intentos < settings.PUSH["MAX_INTENTOS"]:
        esperas = settings.PUSH["ESPERAS_SEGUNDOS"]
        espera = _retry_after(respuesta) or esperas[min(aviso.intentos, len(esperas)) - 1]
        siguiente = ahora + timedelta(seconds=espera)
        if siguiente < aviso.caduca:
            aviso.proximo_intento = siguiente
            aviso.save(update_fields=["intentos", "error", "proximo_intento"])
            logger.info(
                "push.reintento aviso=%s intento=%s error=%s", aviso.pk, aviso.intentos, aviso.error
            )
            return resultado
    _cerrar(aviso, EstadoAviso.DESCARTADO, aviso.error)
    logger.warning("push.descartado aviso=%s error=%s", aviso.pk, aviso.error)
    return _Resultado.DESCARTAR


def _cerrar(aviso, estado, error):
    aviso.estado = estado
    aviso.error = error
    aviso.save(update_fields=["estado", "error", "intentos"])


def procesar_pendientes(limite: int = 50) -> int:
    """Envía los avisos que tocan. Cada uno con su fila bloqueada (SKIP LOCKED): varios
    workers a la vez nunca envían el mismo aviso dos veces. Devuelve cuántos procesó."""
    procesados = 0
    for _ in range(limite):
        with transaction.atomic():
            aviso = (
                AvisoPush.objects.select_for_update(skip_locked=True)
                .select_related("suscripcion")
                .filter(estado=EstadoAviso.PENDIENTE, proximo_intento__lte=timezone.now())
                .order_by("proximo_intento", "id")
                .first()
            )
            if aviso is None:
                break
            enviar(aviso)
            procesados += 1
    return procesados


def purgar() -> int:
    """Borra los avisos enviados o descartados con más de 7 días."""
    limite = timezone.now() - timedelta(days=settings.PUSH["PURGA_DIAS"])
    borrados, _ = AvisoPush.objects.filter(
        estado__in=[EstadoAviso.ENVIADO, EstadoAviso.DESCARTADO], creado__lt=limite
    ).delete()
    if borrados:
        logger.info("push.purga borrados=%s", borrados)
    return borrados
