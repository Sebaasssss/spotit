"""Entrega de fotos sin exponer rutas internas.

La API nunca devuelve rutas de archivo: devuelve URLs firmadas de corta duración hacia
`/api/reportes/<id>/foto/`. Ese endpoint valida la firma y entrega el archivo:

- En Docker (MEDIA_X_ACCEL=True) responde vacío con `X-Accel-Redirect`; nginx sirve el archivo
  desde una ubicación `internal` (no accesible desde fuera) y quita esa cabecera.
- Sin nginx (pruebas, `runserver` directo) responde el archivo con FileResponse.

Para migrar a S3 basta con cambiar `foto_url` para devolver una URL prefirmada del bucket.
"""

from django.conf import settings
from django.core import signing
from django.http import FileResponse, HttpResponse
from django.urls import reverse

_SALT = "reports.foto"
TAMANOS = ("completa", "miniatura")


def _firmante():
    return signing.TimestampSigner(salt=_SALT)


ALCANCE_ADMIN = "admin"


def foto_url(request, reporte, tamano: str = "completa", *, admin: bool = False) -> str:
    """URL firmada. Con `admin=True` lleva el alcance de administrador: es la única que sirve
    la foto de un reporte oculto (solo se entrega en respuestas para administradores)."""
    valor = f"{reporte.pk}:{tamano}" + (f":{ALCANCE_ADMIN}" if admin else "")
    token = _firmante().sign(valor)
    path = reverse("reporte-foto", args=[reporte.pk])
    return f"{path}?t={token}"


def validar_token(token: str, reporte_id: int) -> tuple[str, bool] | None:
    """Devuelve (tamaño, alcance_admin) o None si la firma no vale, caducó o es de otro reporte."""
    try:
        valor = _firmante().unsign(token, max_age=settings.REPORT_PHOTO["URL_MAX_AGE"])
    except signing.BadSignature:
        return None
    partes = valor.split(":")
    if len(partes) not in (2, 3) or partes[0] != str(reporte_id) or partes[1] not in TAMANOS:
        return None
    if len(partes) == 3 and partes[2] != ALCANCE_ADMIN:
        return None
    return partes[1], len(partes) == 3


def respuesta_foto(fieldfile) -> HttpResponse:
    if settings.MEDIA_X_ACCEL:
        response = HttpResponse(content_type="image/jpeg")
        response["X-Accel-Redirect"] = f"{settings.MEDIA_X_ACCEL_PREFIX}{fieldfile.name}"
    else:
        response = FileResponse(fieldfile.open("rb"), content_type="image/jpeg")
    # El nombre es aleatorio y el contenido no cambia: se puede guardar en caché del navegador.
    response["Cache-Control"] = "private, max-age=86400, immutable"
    response["X-Content-Type-Options"] = "nosniff"
    response["Content-Disposition"] = "inline"
    return response
