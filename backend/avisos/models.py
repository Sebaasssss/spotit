"""Notificaciones push: suscripciones por dispositivo y bandeja de salida de avisos."""

from django.conf import settings
from django.db import models


class SuscripcionPush(models.Model):
    """Un navegador o teléfono suscrito. La preferencia es por dispositivo: existir = activo.

    No se guarda el user-agent ni nada del dispositivo; solo lo que exige Web Push.
    """

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="usuario",
        on_delete=models.CASCADE,
        related_name="suscripciones_push",
    )
    endpoint = models.URLField("endpoint", max_length=1000, unique=True)
    p256dh = models.CharField("clave p256dh", max_length=200)
    auth = models.CharField("clave auth", max_length=100)
    creado = models.DateTimeField("creada", auto_now_add=True)
    actualizado = models.DateTimeField("actualizada", auto_now=True)
    ultimo_envio = models.DateTimeField("último envío", null=True, blank=True)

    class Meta:
        verbose_name = "suscripción push"
        verbose_name_plural = "suscripciones push"

    def __str__(self):
        return f"Suscripción #{self.pk}"

    def info(self) -> dict:
        return {"endpoint": self.endpoint, "keys": {"p256dh": self.p256dh, "auth": self.auth}}


class EstadoAviso(models.TextChoices):
    PENDIENTE = "pendiente", "Pendiente"
    ENVIADO = "enviado", "Enviado"
    DESCARTADO = "descartado", "Descartado"


class AvisoPush(models.Model):
    """Bandeja de salida: se crea en la misma transacción que el evento del historial y la
    envía el servicio `push-worker` (`manage.py enviar_push`). El texto se fija al crearse."""

    suscripcion = models.ForeignKey(
        SuscripcionPush, verbose_name="suscripción", on_delete=models.CASCADE, related_name="avisos"
    )
    evento = models.ForeignKey(
        "reports.EventoReporte",
        verbose_name="evento",
        on_delete=models.CASCADE,
        related_name="avisos_push",
    )
    titulo = models.CharField("título", max_length=80)
    cuerpo = models.CharField("texto", max_length=200)
    url = models.CharField("abre", max_length=200)
    etiqueta = models.CharField("etiqueta", max_length=60)
    estado = models.CharField(
        "estado", max_length=12, choices=EstadoAviso.choices, default=EstadoAviso.PENDIENTE
    )
    intentos = models.PositiveSmallIntegerField("intentos", default=0)
    proximo_intento = models.DateTimeField("próximo intento")
    caduca = models.DateTimeField(
        "caduca", help_text="24 h desde que se creó; los reintentos envían lo que queda como TTL."
    )
    error = models.CharField("último error", max_length=40, blank=True)
    creado = models.DateTimeField("creado", auto_now_add=True)
    enviado_en = models.DateTimeField("enviado", null=True, blank=True)

    class Meta:
        verbose_name = "aviso push"
        verbose_name_plural = "avisos push"
        indexes = [models.Index(fields=["estado", "proximo_intento"])]

    def __str__(self):
        return f"Aviso #{self.pk} ({self.get_estado_display()})"

    def payload(self) -> dict:
        return {"title": self.titulo, "body": self.cuerpo, "url": self.url, "tag": self.etiqueta}
