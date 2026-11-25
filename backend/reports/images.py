"""Validación y limpieza de fotos subidas.

- El tipo se decide abriendo la imagen, nunca por la extensión ni el Content-Type.
- Se rechazan archivos enormes y bombas de descompresión (demasiados píxeles).
- Se aplica la orientación EXIF y se recodifica a JPEG sin metadatos (adiós GPS de la cámara).
- Se generan la foto (lado mayor 1600 px) y una miniatura (400 px).
"""

import io
import warnings
from dataclasses import dataclass

from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError

FORMATOS_PERMITIDOS = {"JPEG", "PNG", "WEBP"}

# Marcas "ftyp" de HEIC/HEIF (fotos de iPhone sin convertir).
_HEIF_BRANDS = {b"heic", b"heix", b"hevc", b"hevx", b"heim", b"heis", b"mif1", b"msf1", b"avif"}


class FotoInvalida(ValueError):
    """Mensaje pensado para mostrarse tal cual a la persona usuaria."""


@dataclass(frozen=True)
class FotoProcesada:
    foto: ContentFile
    miniatura: ContentFile
    ancho: int
    alto: int


def _cfg(nombre: str):
    return settings.REPORT_PHOTO[nombre]


def _es_heif(cabecera: bytes) -> bool:
    return len(cabecera) >= 12 and cabecera[4:8] == b"ftyp" and cabecera[8:12] in _HEIF_BRANDS


def _a_rgb(img: Image.Image) -> Image.Image:
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        fondo = Image.new("RGB", img.size, (255, 255, 255))
        fondo.paste(img.convert("RGBA"), mask=img.convert("RGBA").getchannel("A"))
        return fondo
    return img.convert("RGB")


def _jpeg(img: Image.Image, lado_max: int) -> ContentFile:
    copia = img.copy()
    copia.thumbnail((lado_max, lado_max), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    # Sin `exif=` ni `icc_profile=`: el archivo resultante no lleva metadatos.
    copia.save(buffer, format="JPEG", quality=_cfg("JPEG_QUALITY"), optimize=True, progressive=True)
    return ContentFile(buffer.getvalue(), name="foto.jpg")


def procesar_foto(archivo) -> FotoProcesada:
    max_bytes = _cfg("MAX_BYTES")
    if archivo.size is not None and archivo.size > max_bytes:
        raise FotoInvalida(f"La foto pesa más de {max_bytes // (1024 * 1024)} MB. Elige otra.")

    archivo.seek(0)
    cabecera = archivo.read(32)
    archivo.seek(0)
    if not cabecera:
        raise FotoInvalida("El archivo está vacío.")
    if _es_heif(cabecera):
        raise FotoInvalida(
            "Las fotos HEIC del iPhone no se pueden subir. Usa «Tomar foto» o, en el iPhone, "
            "cambia Ajustes › Cámara › Formatos a «Más compatible»."
        )

    max_pixeles = _cfg("MAX_PIXELS")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(archivo) as prueba:
                formato = prueba.format
                if prueba.width * prueba.height > max_pixeles:
                    raise FotoInvalida("La foto tiene demasiados píxeles. Elige otra.")
                prueba.verify()  # estructura íntegra

            archivo.seek(0)
            with Image.open(archivo) as img:
                img.load()  # decodifica de verdad: detecta archivos truncados
                img = ImageOps.exif_transpose(img)
                rgb = _a_rgb(img)
    except FotoInvalida:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise FotoInvalida("El archivo no es una foto válida. Usa JPG, PNG o WebP.") from None
    except (OSError, SyntaxError, ValueError):
        raise FotoInvalida("La foto está dañada o incompleta. Tómala de nuevo.") from None

    if formato not in FORMATOS_PERMITIDOS:
        raise FotoInvalida("Ese tipo de archivo no se acepta. Usa una foto JPG, PNG o WebP.")

    return FotoProcesada(
        foto=_jpeg(rgb, _cfg("MAX_SIDE")),
        miniatura=_jpeg(rgb, _cfg("THUMB_SIDE")),
        ancho=rgb.width,
        alto=rgb.height,
    )
