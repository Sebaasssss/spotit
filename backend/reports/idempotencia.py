"""Envíos repetibles de reportes (cola sin conexión del teléfono).

El teléfono genera un UUID al guardar el reporte y lo manda en la cabecera
`Idempotency-Key` en cada intento. Si la respuesta se perdió en un corte de red y el
teléfono reintenta, el servidor devuelve el reporte ya creado en lugar de crear otro.

- La clave es única **por autor**: la de otra persona no choca ni revela nada.
- Un reintento de un reporte ya creado no consume ni choca con el límite de envíos.
"""

import uuid

from rest_framework.exceptions import ValidationError
from rest_framework.throttling import ScopedRateThrottle

from .models import Reporte

CABECERA = "Idempotency-Key"


def leer_clave(request, *, estricta: bool) -> uuid.UUID | None:
    """La clave de la cabecera, o None si no viene.

    Con `estricta=False` una clave mal formada se ignora (la vista la rechazará con 400).
    """
    valor = (request.headers.get(CABECERA) or "").strip()
    if not valor:
        return None
    try:
        return uuid.UUID(valor)
    except ValueError:
        if estricta:
            mensaje = "La clave de envío no es válida."
            raise ValidationError({"idempotency_key": [mensaje]}) from None
        return None


def reporte_existente(user, clave: uuid.UUID | None) -> Reporte | None:
    if clave is None or not user or not user.is_authenticated:
        return None
    return (
        Reporte.objects.select_related("categoria")
        .filter(autor=user, clave_idempotencia=clave)
        .first()
    )


class LimiteDeReportes(ScopedRateThrottle):
    """El límite por hora de siempre, salvo para reintentos de un reporte ya creado."""

    scope_attr = "throttle_scope"

    def allow_request(self, request, view):
        if reporte_existente(request.user, leer_clave(request, estricta=False)):
            return True
        return super().allow_request(request, view)
