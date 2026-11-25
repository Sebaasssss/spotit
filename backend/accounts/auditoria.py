"""Registro de las respuestas 401 para poder explicar por qué se cerró o falló una sesión.

Cada 401 deja una sola línea con tres datos y nada más:
- `ruta`: el path de la petición, sin query string (las URLs firmadas llevan su token ahí);
- `motivo`: una clave corta de la lista de abajo;
- `jti`: los primeros 8 caracteres del identificador del token, o `-` si no hay token legible.

Nunca se registra el token, el email, el nombre ni el id del usuario.
"""

import logging
import time

from rest_framework_simplejwt.exceptions import TokenBackendError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.state import token_backend

logger = logging.getLogger("spotit.auth")

JTI_PREFIJO = 8

# Motivos de un 401 en un recurso protegido (calculados a partir de la cabecera).
SIN_TOKEN = "sin_token"
CABECERA_INVALIDA = "cabecera_invalida"
ACCESS_CADUCADO = "access_caducado"
ACCESS_INVALIDO = "access_invalido"

# Motivos de un 401 en /api/auth/refresh/ (los decide la vista).
SIN_COOKIE = "sin_cookie"
REFRESH_ILEGIBLE = "refresh_ilegible"
REFRESH_CADUCADO = "refresh_caducado"
REFRESH_REVOCADO = "refresh_revocado"
GRACIA_YA_USADA = "gracia_ya_usada"
GRACIA_SUCESOR_INVALIDADO = "gracia_sucesor_invalidado"
USUARIO_INACTIVO = "usuario_inactivo"

# Atributos que una vista puede poner en su respuesta para precisar el motivo.
ATTR_MOTIVO = "_spotit_motivo_401"
ATTR_JTI = "_spotit_jti_401"


def payload_sin_verificar(token: str) -> dict | None:
    """Lee el contenido del JWT sin comprobar la firma: solo para clasificar y registrar."""
    try:
        payload = token_backend.decode(token, verify=False)
    except (TokenBackendError, ValueError, TypeError):
        return None
    return payload if isinstance(payload, dict) else None


def prefijo_jti(payload: dict | None) -> str:
    if not payload:
        return "-"
    jti = payload.get(api_settings.JTI_CLAIM)
    return str(jti)[:JTI_PREFIJO] if jti else "-"


def esta_caducado(payload: dict | None) -> bool:
    exp = (payload or {}).get("exp")
    return isinstance(exp, int | float) and exp <= time.time()


def marcar_401(response, motivo: str, token: str | None = None):
    """Anota en la respuesta el motivo exacto; el middleware lo registra."""
    setattr(response, ATTR_MOTIVO, motivo)
    setattr(response, ATTR_JTI, prefijo_jti(payload_sin_verificar(token)) if token else "-")
    return response


def _clasificar_cabecera(request) -> tuple[str, str]:
    cabecera = request.headers.get("Authorization", "")
    if not cabecera:
        return SIN_TOKEN, "-"
    partes = cabecera.split()
    if len(partes) != 2 or partes[0] not in api_settings.AUTH_HEADER_TYPES:
        return CABECERA_INVALIDA, "-"
    payload = payload_sin_verificar(partes[1])
    motivo = ACCESS_CADUCADO if esta_caducado(payload) else ACCESS_INVALIDO
    return motivo, prefijo_jti(payload)


def registrar_401(request, response) -> None:
    motivo = getattr(response, ATTR_MOTIVO, None)
    if motivo:
        jti = getattr(response, ATTR_JTI, "-")
    else:
        motivo, jti = _clasificar_cabecera(request)
    logger.info("auth.401 ruta=%s motivo=%s jti=%s", request.path, motivo, jti)


class Registro401Middleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if response.status_code == 401:
            registrar_401(request, response)
        return response
