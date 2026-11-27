"""Envía los avisos push pendientes. Lo ejecuta el servicio `push-worker` del compose.

python manage.py enviar_push          # una pasada (envía y purga)
python manage.py enviar_push --loop   # sin parar, cada --intervalo segundos
"""

import signal
import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections

from avisos.servicio import procesar_pendientes, purgar, push_activo

PURGA_CADA_SEGUNDOS = 60 * 60


class Command(BaseCommand):
    help = "Envía los avisos push pendientes y purga los viejos."

    def add_arguments(self, parser):
        parser.add_argument("--loop", action="store_true", help="No terminar: repetir.")
        parser.add_argument("--intervalo", type=float, default=2.0, help="Segundos entre pasadas.")

    def handle(self, *args, loop=False, intervalo=2.0, **options):
        if not push_activo():
            self.stderr.write("Push desactivado: faltan VAPID_* en el .env. Nada que enviar.")
        if not loop:
            enviados = procesar_pendientes() if push_activo() else 0
            purgados = purgar()
            self.stdout.write(f"Procesados {enviados}, purgados {purgados}.")
            return

        parar = False

        def detener(*_):
            nonlocal parar
            parar = True

        # docker compose stop manda SIGTERM: se termina el aviso en curso y se sale limpio.
        signal.signal(signal.SIGTERM, detener)
        signal.signal(signal.SIGINT, detener)
        ultima_purga = 0.0
        self.stdout.write("push-worker en marcha.")
        while not parar:
            close_old_connections()
            try:
                if push_activo():
                    procesar_pendientes()
                if time.monotonic() - ultima_purga > PURGA_CADA_SEGUNDOS:
                    purgar()
                    ultima_purga = time.monotonic()
            except Exception as exc:  # noqa: BLE001 — el worker no debe caerse por un fallo puntual
                self.stderr.write(f"push-worker: error {type(exc).__name__}; sigue.")
            time.sleep(intervalo)
        self.stdout.write("push-worker detenido.")
