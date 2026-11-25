import io
import shutil
import tempfile
from unittest import mock

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase
from rest_framework.throttling import SimpleRateThrottle

from accounts.models import User
from reports.models import Categoria, Reporte

PASSWORD = "girasol-azul-2026"


def imagen(
    formato="JPEG", tamano=(1200, 900), color=(30, 120, 90), modo="RGB", exif=None, nombre=None
):
    img = Image.new(modo, tamano, color)
    buffer = io.BytesIO()
    kwargs = {"exif": exif} if exif is not None else {}
    img.save(buffer, format=formato, **kwargs)
    extension = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp", "GIF": "gif"}[formato]
    return SimpleUploadedFile(
        nombre or f"foto.{extension}", buffer.getvalue(), content_type=f"image/{extension}"
    )


def archivo(contenido: bytes, nombre="foto.jpg", content_type="image/jpeg"):
    return SimpleUploadedFile(nombre, contenido, content_type=content_type)


class ReportesTestCase(APITestCase):
    """Base: MEDIA_ROOT temporal, usuarios y una categoría."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._media = tempfile.mkdtemp(prefix="spotit-media-")
        cls._override = override_settings(MEDIA_ROOT=cls._media, MEDIA_X_ACCEL=False)
        cls._override.enable()

    @classmethod
    def tearDownClass(cls):
        cls._override.disable()
        shutil.rmtree(cls._media, ignore_errors=True)
        super().tearDownClass()

    # DRF fija las tasas en la clase al importar; se parchean aquí (y en la prueba del límite).
    THROTTLE_RATES = {"auth": "1000/min", "reportes": "1000/hour"}

    def setUp(self):
        cache.clear()
        patcher = mock.patch.object(SimpleRateThrottle, "THROTTLE_RATES", self.THROTTLE_RATES)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.ana = User.objects.create_user("ana@ejemplo.mx", PASSWORD, nombre="Ana López")
        self.beto = User.objects.create_user("beto@ejemplo.mx", PASSWORD, nombre="Beto Ruiz")
        self.admin = User.objects.create_superuser("admin@ejemplo.mx", PASSWORD, nombre="Admin")
        self.bache = Categoria.objects.get(slug="baches-y-pavimento")
        self.alumbrado = Categoria.objects.get(slug="alumbrado")

    def como(self, user):
        self.client.force_authenticate(user)

    def datos(self, **extra):
        data = {
            "categoria": "baches-y-pavimento",
            "descripcion": "Bache profundo frente a la biblioteca.",
            "foto": imagen(),
            "latitud": "18.8502834",
            "longitud": "-99.2007355",
            "precision_m": "12",
            "origen_ubicacion": "gps",
        }
        data.update(extra)
        return data

    def crear(self, user=None, **extra):
        self.como(user or self.ana)
        return self.client.post("/api/reportes/", self.datos(**extra), format="multipart")

    def reporte(self, user=None, **extra) -> Reporte:
        response = self.crear(user, **extra)
        assert response.status_code == 201, response.content
        return Reporte.objects.get(pk=response.json()["id"])
