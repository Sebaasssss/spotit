import io
import os

from django.test import override_settings
from PIL import Image

from reports.models import Reporte

from .utils import ReportesTestCase, archivo, imagen

CONFIG = {
    "MAX_BYTES": 10 * 1024 * 1024,
    "MAX_PIXELS": 40_000_000,
    "MAX_SIDE": 1600,
    "THUMB_SIDE": 400,
    "JPEG_QUALITY": 82,
    "URL_MAX_AGE": 6 * 60 * 60,
}


def exif_con_gps():
    exif = Image.Exif()
    exif[0x010F] = "MarcaDeCamara"  # Make
    exif[0x0110] = "ModeloSecreto"  # Model
    gps = exif.get_ifd(0x8825)
    gps[1] = "N"
    gps[2] = (18.0, 51.0, 1.02)
    gps[3] = "W"
    gps[4] = (99.0, 12.0, 2.65)
    return exif


class FotoValidaTests(ReportesTestCase):
    def _abrir(self, campo):
        with campo.open("rb") as f:
            datos = f.read()
        img = Image.open(io.BytesIO(datos))
        img.load()
        return img, datos

    def test_se_recodifica_a_jpeg_y_se_redimensiona(self):
        reporte = self.reporte(foto=imagen(tamano=(4000, 3000)))

        foto, _ = self._abrir(reporte.foto)
        mini, _ = self._abrir(reporte.miniatura)
        self.assertEqual(foto.format, "JPEG")
        self.assertEqual(max(foto.size), 1600)
        self.assertEqual(max(mini.size), 400)

    def test_no_se_agranda_una_foto_pequena(self):
        reporte = self.reporte(foto=imagen(tamano=(800, 600)))

        foto, _ = self._abrir(reporte.foto)
        self.assertEqual(foto.size, (800, 600))

    def test_elimina_exif_incluido_el_gps(self):
        reporte = self.reporte(foto=imagen(exif=exif_con_gps()))

        for campo in (reporte.foto, reporte.miniatura):
            img, datos = self._abrir(campo)
            self.assertEqual(len(img.getexif()), 0)
            self.assertNotIn("exif", img.info)
            self.assertNotIn(b"ModeloSecreto", datos)
            self.assertNotIn(b"MarcaDeCamara", datos)

    def test_aplica_la_orientacion_exif_antes_de_borrarla(self):
        exif = Image.Exif()
        exif[0x0112] = 6  # rotar 90°
        reporte = self.reporte(foto=imagen(tamano=(1200, 600), exif=exif))

        foto, _ = self._abrir(reporte.foto)
        self.assertEqual(foto.size, (600, 1200))

    def test_png_con_transparencia_y_webp(self):
        png = imagen("PNG", tamano=(300, 200), modo="RGBA", color=(0, 0, 0, 0))
        self.assertEqual(self.crear(foto=png).status_code, 201)
        self.assertEqual(self.crear(foto=imagen("WEBP")).status_code, 201)

    def test_nombre_aleatorio_sin_datos_del_original(self):
        reporte = self.reporte(foto=imagen(nombre="ana-lopez-mi-casa.jpg"))

        nombre = os.path.basename(reporte.foto.name)
        self.assertNotIn("ana", nombre)
        self.assertRegex(nombre, r"^[0-9a-f]{32}\.jpg$")
        self.assertRegex(os.path.basename(reporte.miniatura.name), r"^min-[0-9a-f]{32}\.jpg$")


class FotoInvalidaTests(ReportesTestCase):
    def assertFotoRechazada(self, foto, fragmento):
        response = self.crear(foto=foto)
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("foto", response.json())
        self.assertIn(fragmento, " ".join(response.json()["foto"]))
        self.assertEqual(Reporte.objects.count(), 0)

    def test_texto_renombrado_a_jpg(self):
        self.assertFotoRechazada(archivo(b"no soy una imagen " * 20), "no es una foto")

    def test_svg(self):
        svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        self.assertFotoRechazada(archivo(svg, "foto.svg", "image/svg+xml"), "no es una foto")

    def test_gif_no_se_acepta(self):
        self.assertFotoRechazada(imagen("GIF", tamano=(50, 50)), "no se acepta")

    def test_heic_de_iphone(self):
        cabecera = b"\x00\x00\x00\x18ftypheic\x00\x00\x00\x00mif1heic" + b"\x00" * 200
        self.assertFotoRechazada(archivo(cabecera, "IMG_0001.HEIC", "image/heic"), "HEIC")

    def test_jpeg_truncado(self):
        completo = imagen(tamano=(800, 600)).read()
        self.assertFotoRechazada(archivo(completo[: len(completo) // 3]), "dañada")

    def test_archivo_vacio(self):
        response = self.crear(foto=archivo(b""))
        self.assertEqual(response.status_code, 400)
        self.assertIn("foto", response.json())

    @override_settings(REPORT_PHOTO={**CONFIG, "MAX_BYTES": 1024})
    def test_demasiado_pesada(self):
        self.assertFotoRechazada(imagen(tamano=(600, 600)), "pesa más")

    @override_settings(REPORT_PHOTO={**CONFIG, "MAX_PIXELS": 10_000})
    def test_demasiados_pixeles(self):
        self.assertFotoRechazada(imagen(tamano=(200, 200)), "demasiados píxeles")

    def test_foto_obligatoria(self):
        datos = self.datos()
        del datos["foto"]
        self.como(self.ana)

        response = self.client.post("/api/reportes/", datos, format="multipart")

        self.assertEqual(response.status_code, 400)
        self.assertIn("foto", response.json())
