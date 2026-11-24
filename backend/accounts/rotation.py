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


def reuse_within_grace(raw_refresh: str):
    """Si `raw_refresh` es el predecesor recién rotado de un sucesor nunca usado, devuelve
    (user, nuevo RefreshToken). Si no, None.
    """
    try:
        payload = token_backend.decode(raw_refresh, verify=True)  # firma y caducidad
    except TokenBackendError:
        return None
    if payload.get(api_settings.TOKEN_TYPE_CLAIM) != "refresh":
        return None

    key = _key(payload[api_settings.JTI_CLAIM])
    successor_jti = cache.get(key)
    if not successor_jti:
        return None
    cache.delete(key)  # la gracia se usa una sola vez

    # Si el sucesor ya estaba invalidado, se usó (rotó) o hubo logout: sin gracia.
    if not _blacklist_jti(successor_jti):
        return None

    user = (
        get_user_model()
        .objects.filter(pk=payload[api_settings.USER_ID_CLAIM], is_active=True)
        .first()
    )
    if user is None:
        return None
    return user, RefreshToken.for_user(user)
