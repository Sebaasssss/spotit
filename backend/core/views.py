import logging

from django.conf import settings
from django.db import DatabaseError, connection
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def _database_ok() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except DatabaseError:
        logger.exception("Healthcheck: la base de datos no responde")
        return False
    return True


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def health(request):
    """Estado del servicio. Lo usan el healthcheck de Docker y el frontend."""
    db_ok = _database_ok()
    return Response(
        {
            "status": "ok" if db_ok else "error",
            "database": "ok" if db_ok else "error",
            "version": settings.APP_VERSION,
        },
        status=status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE,
        headers={"Cache-Control": "no-store"},
    )
