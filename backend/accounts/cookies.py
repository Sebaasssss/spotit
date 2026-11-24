"""Manejo de la cookie httpOnly que guarda el refresh token."""

from urllib.parse import urlsplit

from django.conf import settings
from rest_framework.exceptions import PermissionDenied


def _cfg():
    return settings.AUTH_COOKIE


def get_refresh_cookie(request) -> str | None:
    return request.COOKIES.get(_cfg()["NAME"]) or None


def set_refresh_cookie(response, refresh_token: str) -> None:
    cfg = _cfg()
    lifetime = settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
    response.set_cookie(
        cfg["NAME"],
        refresh_token,
        max_age=int(lifetime.total_seconds()),
        path=cfg["PATH"],
        secure=cfg["SECURE"],
        httponly=True,
        samesite=cfg["SAMESITE"],
    )


def clear_refresh_cookie(response) -> None:
    cfg = _cfg()
    response.delete_cookie(cfg["NAME"], path=cfg["PATH"], samesite=cfg["SAMESITE"])


def enforce_same_origin(request) -> None:
    """Defensa CSRF para los endpoints que leen o escriben la cookie.

    SameSite=Strict ya impide que otro sitio envíe la cookie; además, si el navegador manda
    `Origin`, debe coincidir con el host de la petición o con CSRF_TRUSTED_ORIGINS.
    Los clientes que no son navegador (sin `Origin`) pasan: no pueden robar una cookie ajena.
    """
    origin = request.headers.get("Origin")
    if not origin:
        return
    if origin == "null":
        raise PermissionDenied("Origen no permitido.")

    netloc = urlsplit(origin).netloc
    if netloc and netloc == request.get_host():
        return

    for trusted in settings.CSRF_TRUSTED_ORIGINS:
        parts = urlsplit(trusted)
        if parts.netloc.startswith("*."):
            suffix = parts.netloc[1:]
            if urlsplit(origin).scheme == parts.scheme and netloc.endswith(suffix):
                return
        elif origin == f"{parts.scheme}://{parts.netloc}":
            return

    raise PermissionDenied("Origen no permitido.")
