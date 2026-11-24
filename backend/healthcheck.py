"""Healthcheck del contenedor: sale con 0 solo si /api/health/ responde 200.

Se usa urllib para no instalar curl en la imagen.
"""

import sys
import urllib.request

request = urllib.request.Request(
    "http://127.0.0.1:8000/api/health/",
    headers={"Host": "localhost"},
)

try:
    with urllib.request.urlopen(request, timeout=4) as response:
        sys.exit(0 if response.status == 200 else 1)
except Exception as exc:  # noqa: BLE001 - cualquier fallo es "no sano"
    print(f"healthcheck: {exc}", file=sys.stderr)
    sys.exit(1)
