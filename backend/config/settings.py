"""Settings de SpotIt. Todo lo configurable entra por variables de entorno (ver .env.example)."""

from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
    CSRF_TRUSTED_ORIGINS=(list, []),
    CORS_ALLOWED_ORIGINS=(list, []),
)

# Fuera de Docker se puede usar un .env junto a manage.py o en la raíz del repo.
for candidate in (BASE_DIR / ".env", BASE_DIR.parent / ".env"):
    if candidate.exists():
        environ.Env.read_env(candidate)
        break

APP_VERSION = "0.1.0"

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")
CSRF_TRUSTED_ORIGINS = env("CSRF_TRUSTED_ORIGINS")
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "corsheaders",
    "rest_framework",
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": ["django.template.context_processors.request"]},
    }
]

# En Docker siempre llega DATABASE_URL (Postgres). El SQLite por defecto solo existe para
# correr linters o pruebas rápidas fuera de los contenedores.
DATABASES = {"default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")}
DATABASES["default"]["CONN_MAX_AGE"] = 60
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LANGUAGE_CODE = "es-mx"
TIME_ZONE = "America/Mexico_City"
USE_I18N = True
USE_TZ = True

# Detrás de nginx (y del túnel/ALB): confiar en X-Forwarded-Proto para saber si es HTTPS.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "UNAUTHENTICATED_USER": None,
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
