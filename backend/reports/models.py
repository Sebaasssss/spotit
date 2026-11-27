import uuid

from django.conf import settings
from django.core.validators import (
    MaxLengthValidator,
    MaxValueValidator,
    MinLengthValidator,
    MinValueValidator,
)
from django.db import models
from django.utils import timezone

from accounts.models import Rol

DESCRIPCION_MIN = 10
DESCRIPCION_MAX = 1000


class Categoria(models.Model):
    """Tipo de incidencia. Se gestiona desde el admin; desactivarla la oculta del formulario."""

    nombre = models.CharField("nombre", max_length=80, unique=True)
    slug = models.SlugField("identificador", max_length=40, unique=True)
    icono = models.SlugField(
        "icono",
        max_length=40,
        blank=True,
        help_text="Clave del icono en el frontend (bache, alumbrado…). Vacío usa el genérico.",
    )
    orden = models.PositiveSmallIntegerField("orden", default=0)
    activa = models.BooleanField("activa", default=True)

    class Meta:
        verbose_name = "categoría"
        verbose_name_plural = "categorías"
        ordering = ["orden", "nombre"]

    def __str__(self):
        return self.nombre


class Estado(models.TextChoices):
    RECIBIDO = "recibido", "Recibido"
    EN_PROCESO = "en_proceso", "En proceso"
    RESUELTO = "resuelto", "Resuelto"


# Transiciones permitidas para el administrador (resuelto → en_proceso = reabrir).
TRANSICIONES = {
    Estado.RECIBIDO: {Estado.EN_PROCESO},
    Estado.EN_PROCESO: {Estado.RESUELTO, Estado.RECIBIDO},
    Estado.RESUELTO: {Estado.EN_PROCESO},
}


class OrigenUbicacion(models.TextChoices):
    GPS = "gps", "GPS del dispositivo"
    MANUAL = "manual", "Ajustada a mano"


def _ruta_foto(prefijo: str) -> str:
    # Nombre aleatorio: no revela usuario, fecha exacta ni nombre original del archivo.
    return f"reportes/{timezone.now():%Y/%m}/{prefijo}{uuid.uuid4().hex}.jpg"


def ruta_foto(instance, filename):
    return _ruta_foto("")


def ruta_miniatura(instance, filename):
    return _ruta_foto("min-")


class Reporte(models.Model):
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="autor",
        on_delete=models.SET_NULL,  # el reporte sobrevive aunque se borre la cuenta
        null=True,
        related_name="reportes",
    )
    categoria = models.ForeignKey(
        Categoria, verbose_name="categoría", on_delete=models.PROTECT, related_name="reportes"
    )
    descripcion = models.TextField(
        "descripción",
        validators=[MinLengthValidator(DESCRIPCION_MIN), MaxLengthValidator(DESCRIPCION_MAX)],
    )
    foto = models.FileField("foto", upload_to=ruta_foto, max_length=200)
    miniatura = models.FileField("miniatura", upload_to=ruta_miniatura, max_length=200)
    latitud = models.DecimalField(
        "latitud",
        max_digits=9,
        decimal_places=6,
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
    )
    longitud = models.DecimalField(
        "longitud",
        max_digits=9,
        decimal_places=6,
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
    )
    precision_m = models.PositiveIntegerField(
        "precisión (m)",
        null=True,
        blank=True,
        help_text="Radio de incertidumbre del GPS. Vacío si la ubicación se ajustó a mano.",
    )
    origen_ubicacion = models.CharField(
        "origen de la ubicación",
        max_length=10,
        choices=OrigenUbicacion.choices,
        default=OrigenUbicacion.GPS,
    )
    estado = models.CharField(
        "estado", max_length=12, choices=Estado.choices, default=Estado.RECIBIDO
    )
    creado = models.DateTimeField("creado", auto_now_add=True)
    actualizado = models.DateTimeField("actualizado", auto_now=True)
    clave_idempotencia = models.UUIDField(
        "clave de idempotencia",
        null=True,
        blank=True,
        editable=False,
        help_text="La genera el teléfono al guardar el reporte; repetir el envío no lo duplica.",
    )
    # Moderación suave y reversible: un reporte oculto no sale en listas ni en el mapa y su
    # foto solo la ven administradores. No se borra ningún archivo.
    oculto = models.BooleanField("oculto", default=False, db_index=True)
    oculto_motivo = models.TextField(
        "motivo para ocultarlo",
        blank=True,
        help_text="Interno: lo ven solo los administradores, nunca el autor.",
    )
    oculto_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="ocultado por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    oculto_en = models.DateTimeField("ocultado el", null=True, blank=True)

    class Meta:
        verbose_name = "reporte"
        verbose_name_plural = "reportes"
        ordering = ["-creado", "-id"]
        indexes = [
            models.Index(fields=["estado"]),
            models.Index(fields=["categoria", "estado"]),
            models.Index(fields=["-creado"]),
        ]
        constraints = [
            # Única por autor: un reintento tras un corte de red devuelve el reporte ya creado.
            # (En PostgreSQL los NULL no chocan entre sí: los reportes sin clave no se afectan.)
            models.UniqueConstraint(
                fields=["autor", "clave_idempotencia"], name="reporte_clave_unica_por_autor"
            ),
        ]

    def __str__(self):
        return f"#{self.pk} {self.categoria} ({self.get_estado_display()})"

    def visible_para(self, user) -> bool:
        """Oculto: solo lo ven su autor (marcado como oculto) y los administradores."""
        if not self.oculto:
            return True
        return self.es_de(user) or getattr(user, "rol", None) == Rol.ADMINISTRADOR

    def es_de(self, user) -> bool:
        return bool(user and user.is_authenticated and self.autor_id == user.pk)

    def puede_editar(self, user) -> bool:
        """Solo el autor y solo mientras nadie lo ha tomado."""
        return self.es_de(user) and self.estado == Estado.RECIBIDO

    def votos_abiertos(self) -> bool:
        """En `resuelto` los votos se congelan; si se reabre, vuelven a estar disponibles."""
        return self.estado != Estado.RESUELTO

    def motivo_sin_voto(self, user) -> str | None:
        """Por qué `user` no puede votar (o quitar su voto) aquí; None si puede."""
        if not user or not user.is_authenticated:
            return "Inicia sesión para votar."
        if getattr(user, "rol", None) != Rol.CIUDADANO:
            return "Solo un ciudadano puede votar."
        if self.es_de(user):
            return "No puedes votar tu propio reporte."
        if self.oculto:
            return "Este reporte no está disponible."
        if not self.votos_abiertos():
            return "Este reporte ya está resuelto: los votos están cerrados."
        return None


class Voto(models.Model):
    """Un voto por persona y reporte para priorizarlo. Se puede quitar."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="usuario",
        on_delete=models.CASCADE,
        related_name="votos",
    )
    reporte = models.ForeignKey(
        Reporte, verbose_name="reporte", on_delete=models.CASCADE, related_name="votos"
    )
    creado = models.DateTimeField("creado", auto_now_add=True)

    class Meta:
        verbose_name = "voto"
        verbose_name_plural = "votos"
        constraints = [
            # La base de datos garantiza el "un voto por persona" aun con peticiones simultáneas.
            models.UniqueConstraint(fields=["usuario", "reporte"], name="voto_unico_por_persona"),
        ]

    def __str__(self):
        return f"Voto en #{self.reporte_id}"


class TipoEvento(models.TextChoices):
    ESTADO = "estado", "Cambio de estado"
    OCULTAR = "ocultar", "Ocultado"
    MOSTRAR = "mostrar", "Vuelto a mostrar"
    NOTA = "nota", "Nota pública"


NOTA_PUBLICA_MAX = 500
MOTIVO_MIN = 5
MOTIVO_MAX = 500


class EventoReporte(models.Model):
    """Historial de un reporte: cambios de estado y moderación, quién y cuándo.

    - `nota_publica`: la ve el ciudadano en la línea de tiempo de su reporte.
    - `motivo`: interno (al ocultar); solo lo ven los administradores.
    - `admin`: nunca se muestra al ciudadano.
    """

    reporte = models.ForeignKey(
        Reporte, verbose_name="reporte", on_delete=models.CASCADE, related_name="eventos"
    )
    tipo = models.CharField("tipo", max_length=10, choices=TipoEvento.choices)
    estado_anterior = models.CharField(
        "estado anterior", max_length=12, choices=Estado.choices, blank=True
    )
    estado_nuevo = models.CharField(
        "estado nuevo", max_length=12, choices=Estado.choices, blank=True
    )
    nota_publica = models.TextField(
        "nota pública", blank=True, validators=[MaxLengthValidator(NOTA_PUBLICA_MAX)]
    )
    motivo = models.TextField("motivo interno", blank=True)
    # SET_NULL: el historial sobrevive aunque se borre la cuenta del administrador.
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="administrador",
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
    )
    creado = models.DateTimeField("fecha", auto_now_add=True)

    class Meta:
        verbose_name = "evento del reporte"
        verbose_name_plural = "historial de reportes"
        ordering = ["creado", "id"]

    def __str__(self):
        return f"{self.get_tipo_display()} en #{self.reporte_id}"
