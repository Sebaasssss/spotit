FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --home-dir /app --no-create-home app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY --chown=app:app . .

# Estáticos del admin de Django (los sirve whitenoise). La clave es solo para este paso.
RUN SECRET_KEY=collectstatic-solo-build python manage.py collectstatic --noinput \
    && chown -R app:app staticfiles

USER app

EXPOSE 8000

# Aplica migraciones y luego ejecuta el CMD.
ENTRYPOINT ["sh", "/app/entrypoint.sh"]
# gunicorn toma el número de workers de WEB_CONCURRENCY.
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--access-logfile", "-"]
