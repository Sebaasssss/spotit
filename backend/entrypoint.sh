#!/bin/sh
set -e

echo "Aplicando migraciones..."
python manage.py migrate --noinput
# Tabla de la caché compartida (throttling y rotación de tokens). Idempotente.
python manage.py createcachetable

exec "$@"
