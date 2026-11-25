"""Rotación del refresh token con periodo de gracia.

Con ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION, cada renovación invalida el token
anterior. Si la respuesta con la cookie nueva se pierde (mala señal, app cerrada a medio
refresh), el cliente se queda con un token ya invalidado y perdería la sesión.

Periodo de gracia (ver docs/decisiones.md, "Gracia del refresh con reintentos"):

- **Ventana fija:** AUTH_REFRESH_GRACE_SECONDS desde la PRIMERA rotación del token; los
  reintentos no la alargan.
- **Reintentos:** dentro de la ventana, el token anterior se acepta otra vez solo mientras
  su sucesor nunca se haya presentado. Cada reintento emite un sucesor nuevo e invalida el
  anterior, así que nunca hay más de uno válido. Como mucho AUTH_REFRESH_GRACE_RETRIES.
- **Reutilización:** si el sucesor ya se usó y alguien presenta el token anterior, o si se
  presenta un sucesor que un reintento ya había descartado (la respuesta no se perdió:
  alguien más reintentó), se invalida toda la cadena.
- **Logout:** cierra la gracia; después no hay reintentos.

El estado de cada token rotado vive en la caché compartida (`auth:gracia:<jti>`) y el
enlace sucesor → anterior en `auth:anterior:<jti>`, ambos con la misma caducidad que la
ventana. Las decisiones se toman con la fila del usuario bloqueada (select_for_update):
dos renovaciones simultáneas de la misma persona se ordenan y nunca dejan dos válidos.
"""

import math
import time

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction
from rest_framework_simplejwt.exceptions import TokenBackendError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.state import token_backend
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from . import auditoria


def _key_gracia(jti: str) -> str:
    return f"auth:gracia:{jti}"


def _key_anterior(jti: str) -> str:
    return f"auth:anterior:{jti}"


def _ventana() -> int:
    return settings.AUTH_REFRESH_GRACE_SECONDS


def _tope() -> int:
    return settings.AUTH_REFRESH_GRACE_RETRIES


def _jti(raw: str) -> str | None:
    try:
        return token_backend.decode(raw, verify=False)[api_settings.JTI_CLAIM]
    except (TokenBackendError, KeyError, ValueError, TypeError):
        return None


def _restante(estado: dict) -> int:
    """Caducidad en la caché: lo que le queda a la ventana más un segundo de margen.

    DatabaseCache guarda la caducidad sin microsegundos (la adelanta hasta 1 s); la ventana
    exacta la decide `hasta` en `_estado()`.
    """
    return max(1, math.ceil(estado["hasta"] - time.time())) + 1


def _estado(jti: str | None) -> dict | None:
    """Estado de gracia de un token rotado, o None si no hay o su ventana ya cerró."""
    if not jti:
        return None
    estado = cache.get(_key_gracia(jti))
    if estado is None or time.time() >= estado["hasta"]:
        return None
    return estado


def _guardar(jti: str, estado: dict) -> None:
    cache.set(_key_gracia(jti), estado, _restante(estado))


def _blacklist_jti(jti: str) -> bool:
    """Invalida el token con ese jti. Devuelve False si ya estaba invalidado."""
    outstanding = OutstandingToken.objects.filter(jti=jti).first()
    if outstanding is None:
        return False
    _, created = BlacklistedToken.objects.get_or_create(token=outstanding)
    return created


def _esta_invalidado(jti: str) -> bool:
    return BlacklistedToken.objects.filter(token__jti=jti).exists()


def _invalidar_cadena(jti: str) -> None:
    """Invalida el token `jti` y todos los que salieron de él mientras dure su ventana."""
    vistos: set[str] = set()
    actual: str | None = jti
    while actual and actual not in vistos:
        vistos.add(actual)
        _blacklist_jti(actual)
        estado = cache.get(_key_gracia(actual))
        cache.delete(_key_gracia(actual))
        actual = estado["vigente"] if estado else None


def _bloquear_usuario(user_id) -> None:
    """Serializa las decisiones de gracia de una persona (dentro de transaction.atomic)."""
    list(get_user_model().objects.select_for_update().filter(pk=user_id).values("pk"))


def _usuario_activo(user_id):
    return get_user_model().objects.filter(pk=user_id, is_active=True).first()


def _registrar(anterior_jti: str, nuevo_jti: str) -> str | None:
    """Anota que `nuevo` sustituye a `anterior`. Con el usuario bloqueado.

    Devuelve None si `nuevo` queda como el único sucesor válido, o el motivo por el que no
    (y entonces `nuevo` ya quedó invalidado).
    """
    estado = _estado(anterior_jti)
    if estado is None:
        # Primera rotación de `anterior`: empieza su ventana.
        if _ventana() > 0:
            estado = {
                "vigente": nuevo_jti,
                "reintentos": 0,
                "sucesor_usado": False,
                "hasta": time.time() + _ventana(),
            }
            _guardar(anterior_jti, estado)
            cache.set(_key_anterior(nuevo_jti), anterior_jti, _restante(estado))
        # `anterior` era a su vez sucesor de otro: ese sucesor ya se presentó.
        abuelo = cache.get(_key_anterior(anterior_jti))
        if abuelo:
            estado_abuelo = _estado(abuelo)
            if estado_abuelo and estado_abuelo["vigente"] == anterior_jti:
                estado_abuelo["sucesor_usado"] = True
                _guardar(abuelo, estado_abuelo)
        return None

    # `anterior` ya se había rotado: es un reintento (respuesta perdida o petición cruzada).
    if estado["sucesor_usado"]:
        # El sucesor ya se usó y alguien vuelve con el anterior: reutilización.
        _invalidar_cadena(anterior_jti)
        _blacklist_jti(nuevo_jti)
        return auditoria.REUTILIZACION_DETECTADA
    if estado["reintentos"] >= _tope():
        _blacklist_jti(nuevo_jti)
        return auditoria.GRACIA_YA_USADA
    if not _blacklist_jti(estado["vigente"]):
        # El sucesor vigente ya estaba invalidado sin haberse usado (logout o una petición
        # simultánea que ganó): no hay gracia.
        _blacklist_jti(nuevo_jti)
        return auditoria.GRACIA_SUCESOR_INVALIDADO
    estado["vigente"] = nuevo_jti
    estado["reintentos"] += 1
    _guardar(anterior_jti, estado)
    cache.set(_key_anterior(nuevo_jti), anterior_jti, _restante(estado))
    return None


def registrar_rotacion(old_refresh: str, new_refresh: str) -> str | None:
    """Rotación normal (simplejwt ya emitió `new_refresh`). None si todo bien, o el motivo
    por el que `new_refresh` no vale (p. ej. otra renovación simultánea del mismo token)."""
    payload = token_backend.decode(old_refresh, verify=False)
    with transaction.atomic():
        _bloquear_usuario(payload.get(api_settings.USER_ID_CLAIM))
        return _registrar(payload[api_settings.JTI_CLAIM], _jti(new_refresh))


def reuse_within_grace(raw_refresh: str):
    """Decide qué hacer con un refresh que simplejwt rechazó.

    Devuelve `((user, nuevo RefreshToken), None)` si es un reintento válido dentro de la
    ventana, o `(None, motivo)` con la causa del rechazo (ver accounts/auditoria.py).
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

    jti = payload[api_settings.JTI_CLAIM]
    user_id = payload.get(api_settings.USER_ID_CLAIM)
    user = _usuario_activo(user_id)
    if user is None:
        return None, auditoria.USUARIO_INACTIVO

    with transaction.atomic():
        _bloquear_usuario(user_id)
        if _estado(jti) is None:
            anterior = cache.get(_key_anterior(jti))
            estado_anterior = _estado(anterior)
            if estado_anterior and estado_anterior["vigente"] != jti:
                # Un sucesor que un reintento ya descartó: su respuesta no se perdió, así que
                # el reintento lo hizo alguien más. Se invalida toda la cadena.
                _invalidar_cadena(anterior)
                return None, auditoria.REUTILIZACION_DETECTADA
            # Sin rotación reciente: logout, ventana vencida o un token nunca rotado.
            return None, auditoria.REFRESH_REVOCADO
        nuevo = RefreshToken.for_user(user)
        motivo = _registrar(jti, nuevo[api_settings.JTI_CLAIM])
    if motivo:
        return None, motivo
    return (user, nuevo), None


def cerrar_gracia(raw_refresh: str) -> None:
    """Logout: sin reintentos para el token que se cierra ni para el que sustituyó."""
    jti = _jti(raw_refresh)
    if not jti:
        return
    anterior = cache.get(_key_anterior(jti))
    if anterior:
        cache.delete(_key_gracia(anterior))
    estado = cache.get(_key_gracia(jti))
    if estado:
        # Se cerró con un token ya rotado: su sucesor vigente tampoco debe seguir valiendo.
        _invalidar_cadena(jti)
