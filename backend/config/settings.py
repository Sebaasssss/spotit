"""Settings de SpotIt. Todo lo configurable entra por variables de entorno (ver .env.example)."""

import sys
from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
    CSRF_TRUSTED_ORIGINS=(list, []),
    CORS_ALLOWED_ORIGINS=(list, []),
    AUTH_COOKIE_SECURE=(bool, True),
    JWT_ACCESS_MINUTES=(int, 10),
    JWT_REFRESH_DAYS=(int, 14),
    AUTH_THROTTLE_RATE=(str, "10/min"),
    AUTH_REFRESH_GRACE_SECONDS=(int, 60),
    REPORT_THROTTLE_RATE=(str, "20/hour"),
    MEDIA_X_ACCEL=(bool, False),
)

# Fuera de Docker se puede usar un .env junto a manage.py o en la raíz del repo.
for candidate in (BASE_DIR / ".env", BASE_DIR.parent / ".env"):
    if candidate.exists():
        environ.Env.read_env(candidate)
        break

APP_VERSION = "0.2.0"

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")
CSRF_TRUSTED_ORIGINS = env("CSRF_TRUSTED_ORIGINS")
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "core",
    "accounts",
    "reports",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Una línea por cada 401 con ruta, motivo y prefijo del jti (sin datos personales).
    "accounts.auditoria.Registro401Middleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

# En Docker siempre llega DATABASE_URL (Postgres). El SQLite por defecto solo existe para
# correr linters o pruebas rápidas fuera de los contenedores.
DATABASES = {"default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")}
DATABASES["default"]["CONN_MAX_AGE"] = 60
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Usuarios y contraseñas ---
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
        "OPTIONS": {"user_attributes": ("email", "nombre")},
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 10},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

if "test" in sys.argv:
    # Hash rápido solo en pruebas; en ejecución real se usa PBKDF2 (el valor por defecto).
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

LANGUAGE_CODE = "es-mx"
TIME_ZONE = "America/Mexico_City"
USE_I18N = True
USE_TZ = True

# --- Estáticos del admin de Django (los sirve whitenoise; la PWA los sirve nginx) ---
STATIC_URL = "/django-static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

# --- Fotos de reportes ---
# Se guardan en un volumen (MEDIA_ROOT) y NUNCA se sirven por una URL pública directa:
# la API entrega URLs firmadas a /api/reportes/<id>/foto/ (ver reports/storage.py).
MEDIA_ROOT = Path(env("MEDIA_ROOT", default=str(BASE_DIR / "media")))
MEDIA_URL = "/_media_protegida/"  # solo la usa nginx de forma interna
# En Docker nginx entrega el archivo (X-Accel-Redirect); sin nginx lo entrega Django.
MEDIA_X_ACCEL = env("MEDIA_X_ACCEL")
MEDIA_X_ACCEL_PREFIX = "/_media_protegida/"
REPORT_PHOTO = {
    "MAX_BYTES": 10 * 1024 * 1024,
    "MAX_PIXELS": 40_000_000,  # ~ 8000 × 5000; frena bombas de descompresión
    "MAX_SIDE": 1600,
    "THUMB_SIDE": 400,
    "JPEG_QUALITY": 82,
    "URL_MAX_AGE": 6 * 60 * 60,  # validez de las URLs firmadas, en segundos
}
# Subidas de hasta 10 MB de foto más el resto del formulario.
DATA_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024

# --- Seguridad detrás de nginx (y del túnel/ALB) ---
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_SECURE = env("AUTH_COOKIE_SECURE")
CSRF_COOKIE_SECURE = env("AUTH_COOKIE_SECURE")

# --- API ---
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    # Seguro por defecto: cada vista pública lo declara explícitamente.
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_THROTTLE_RATES": {
        "auth": env("AUTH_THROTTLE_RATE"),
        "reportes": env("REPORT_THROTTLE_RATE"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env("JWT_ACCESS_MINUTES")),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env("JWT_REFRESH_DAYS")),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Segundos durante los que se acepta UNA vez el refresh anterior a una rotación cuya respuesta
# se perdió (ver accounts/rotation.py). 0 lo desactiva.
AUTH_REFRESH_GRACE_SECONDS = env("AUTH_REFRESH_GRACE_SECONDS")

# Caché compartida entre workers de gunicorn (throttling y periodo de gracia).
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "django_cache",
    }
}

# Cookie del refresh token: httpOnly (JS no la lee), SameSite=Strict y limitada a /api/auth/.
AUTH_COOKIE = {
    "NAME": "spotit_refresh",
    "PATH": "/api/auth/",
    "SAMESITE": "Strict",
    "SECURE": env("AUTH_COOKIE_SECURE"),
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
