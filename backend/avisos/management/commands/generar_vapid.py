"""Genera un par de claves VAPID nuevo y lo imprime. No escribe nada en disco.

    docker compose exec backend python manage.py generar_vapid

Copia las dos líneas al .env del servidor (nunca al repo) y reinicia backend y push-worker.
Cambiar las claves invalida todas las suscripciones: cada dispositivo debe volver a activar
los avisos.
"""

import base64

from cryptography.hazmat.primitives import serialization
from django.core.management.base import BaseCommand
from py_vapid import Vapid02


def _b64url(datos: bytes) -> str:
    return base64.urlsafe_b64encode(datos).rstrip(b"=").decode()


class Command(BaseCommand):
    help = "Genera claves VAPID para Web Push (imprime; no guarda nada)."

    def handle(self, *args, **options):
        vapid = Vapid02()
        vapid.generate_keys()
        privada = vapid.private_key.private_numbers().private_value.to_bytes(32, "big")
        publica = vapid.public_key.public_bytes(
            serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
        )
        self.stdout.write(f"VAPID_PUBLIC_KEY={_b64url(publica)}")
        self.stdout.write(f"VAPID_PRIVATE_KEY={_b64url(privada)}")
        self.stderr.write(
            "Pega estas líneas en el .env del servidor junto con VAPID_SUBJECT "
            "(mailto: o URL de contacto). La privada es secreta: no la subas al repo."
        )
