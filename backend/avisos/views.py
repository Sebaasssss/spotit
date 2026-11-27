"""Suscripciones push del dispositivo (solo ciudadanos: son quienes reciben avisos)."""

import logging

from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCiudadano

from .models import SuscripcionPush
from .serializers import QuitarSerializer, SuscripcionSerializer
from .servicio import push_activo

logger = logging.getLogger("spotit.push")


class ClaveView(APIView):
    """Clave pública VAPID (no es secreta). Sin claves configuradas, el push está apagado."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        if not push_activo():
            return Response({"activo": False, "clave": None})
        return Response({"activo": True, "clave": settings.VAPID_PUBLIC_KEY})


class SuscripcionView(APIView):
    permission_classes = [IsCiudadano]

    def post(self, request):
        if not push_activo():
            return Response(
                {"detail": "Los avisos no están disponibles por ahora."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        datos = SuscripcionSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        endpoint = datos.validated_data["endpoint"]
        claves = datos.validated_data["keys"]
        with transaction.atomic():
            existente = (
                SuscripcionPush.objects.select_for_update().filter(endpoint=endpoint).first()
            )
            if existente and existente.usuario_id != request.user.pk:
                # El mismo navegador ahora es de otra cuenta (teléfono compartido): sin datos
                # personales en el registro, solo el id de la suscripción.
                logger.info("push.suscripcion_reasignada suscripcion=%s", existente.pk)
            suscripcion, creada = SuscripcionPush.objects.update_or_create(
                endpoint=endpoint,
                defaults={
                    "usuario": request.user,
                    "p256dh": claves["p256dh"],
                    "auth": claves["auth"],
                },
            )
        return Response(
            {"activo": True},
            status=status.HTTP_201_CREATED if creada else status.HTTP_200_OK,
        )

    def delete(self, request):
        datos = QuitarSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        SuscripcionPush.objects.filter(
            endpoint=datos.validated_data["endpoint"], usuario=request.user
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
