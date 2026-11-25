"""Rotación del refresh token con periodo de gracia.

Con ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION, cada renovación invalida el token
anterior. Si la respuesta con la cookie nueva se pierde (mala señal, app cerrada a medio
refresh), el cliente se queda con un token ya invalidado y pierde la sesión.

Periodo de gracia: durante AUTH_REFRESH_GRACE_SECONDS se acepta UNA vez el token anterior,
solo si su sucesor nunca se usó (no está en la blacklist). En ese caso el sucesor perdido se
invalida y se emite uno nuevo. Si el sucesor ya se usó o hubo logout, no hay gracia.
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework_simplejwt.exceptions import TokenBackendError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.state import token_backend
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from . import auditoria


def _key(jti: str) -> str:
    return f"auth:rotated:{jti}"


def _grace_seconds() -> int:
    return settings.AUTH_REFRESH_GRACE_SECONDS


def remember_rotation(old_refresh: str, new_refresh: str) -> None:
    """Anota qué token sustituyó a cuál, durante el periodo de gracia."""
    if _grace_seconds() <= 0:
        return
    old_jti = token_backend.decode(old_refresh, verify=False)[api_settings.JTI_CLAIM]
    new_jti = token_backend.decode(new_refresh, verify=False)[api_settings.JTI_CLAIM]
    cache.set(_key(old_jti), new_jti, _grace_seconds())


def forget_rotation(refresh: str) -> None:
    try:
        jti = token_backend.decode(refresh, verify=False)[api_settings.JTI_CLAIM]
    except (TokenBackendError, KeyError):
        return
    cache.delete(_key(jti))


def _blacklist_jti(jti: str) -> bool:
    """Invalida el token con ese jti. Devuelve False si ya estaba invalidado."""
    outstanding = OutstandingToken.objects.filter(jti=jti).first()
    if outstanding is None:
        return False
    _, created = BlacklistedToken.objects.get_or_create(token=outstanding)
    return created


_USADA = "__usada__"


def _usuario_activo(payload):
    return (
        get_user_model()
        .objects.filter(pk=payload.get(api_settings.USER_ID_CLAIM), is_active=True)
        .first()
    )


def reuse_within_grace(raw_refresh: str):
    """Decide qué hacer con un refresh que simplejwt rechazó.

    Devuelve `((user, nuevo RefreshToken), None)` si `raw_refresh` es el predecesor recién
    rotado de un sucesor nunca usado, o `(None, motivo)` con la causa del rechazo
    (ver accounts/auditoria.py).
    """
    payload = auditoria.payload_sin_verificar(raw_refresh)
    if payload is None:
        return None, auditoria.REFRESH_ILEGIBLE
    try:
        token_backend.decode(raw_refresh, verify=True)  # firma y caducidad
    except TokenBackendError:
        if auditoria.esta_caducado(payload):
            return None, auditoria.REFRESH_CADUCADO
        return None, auditoria.REFRESH_ILEGIBLE
    if payload.get(api_settings.TOKEN_TYPE_CLAIM) != "refresh":
        return None, auditoria.REFRESH_ILEGIBLE

    key = _key(payload[api_settings.JTI_CLAIM])
    successor_jti = cache.get(key)
    if not successor_jti:
        # Sin rotación reciente: revocado (logout, gracia vencida) o la cuenta se desactivó.
        if _usuario_activo(payload) is None:
            return None, auditoria.USUARIO_INACTIVO
        return None, auditoria.REFRESH_REVOCADO
    if successor_jti == _USADA:
        return None, auditoria.GRACIA_YA_USADA
    # La gracia se usa una sola vez; se deja la marca para registrar un segundo intento.
    cache.set(key, _USADA, _grace_seconds())

    # Si el sucesor ya estaba invalidado, se usó (rotó) o hubo logout: sin gracia.
    if not _blacklist_jti(successor_jti):
        return None, auditoria.GRACIA_SUCESOR_INVALIDADO

    user = _usuario_activo(payload)
    if user is None:
        return None, auditoria.USUARIO_INACTIVO
    return (user, RefreshToken.for_user(user)), None
