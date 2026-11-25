/**
 * Prepara la foto antes de subirla: la decodifica, aplica la orientación y la reduce a JPEG
 * de 1600 px de lado mayor. Así se ahorran datos móviles y se eliminan los metadatos (EXIF,
 * GPS de la cámara) ya en el teléfono. El servidor vuelve a validar todo.
 */

export const LADO_MAX = 1600
export const MAX_BYTES_ORIGINAL = 30 * 1024 * 1024
const CALIDAD = 0.85

export class FotoNoValida extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FotoNoValida'
  }
}

export const MENSAJE_HEIC =
  'Esta foto está en formato HEIC y tu navegador no puede convertirla. Usa «Tomar foto» o, en el iPhone, cambia Ajustes › Cámara › Formatos a «Más compatible».'

const MARCAS_HEIF = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1']

/** ¿Es HEIC/HEIF? Mira el tipo, la extensión y la marca `ftyp` del propio archivo. */
export async function esHeic(file: File): Promise<boolean> {
  if (/^image\/hei[cf](-sequence)?$/i.test(file.type)) return true
  if (/\.(heic|heif)$/i.test(file.name)) return true
  const cabecera = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const texto = String.fromCharCode(...cabecera)
  return texto.slice(4, 8) === 'ftyp' && MARCAS_HEIF.includes(texto.slice(8, 12))
}

async function decodificar(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // algunos navegadores no aceptan opciones; se intenta con <img>
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function aBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new FotoNoValida('No se pudo preparar la foto.'))),
      'image/jpeg',
      CALIDAD,
    ),
  )
}

export type FotoPreparada = { blob: Blob; ancho: number; alto: number }

export async function prepararFoto(file: File): Promise<FotoPreparada> {
  if (!file.type.startsWith('image/') && !(await esHeic(file))) {
    throw new FotoNoValida('Ese archivo no es una foto. Elige una imagen JPG, PNG o WebP.')
  }
  if (file.size > MAX_BYTES_ORIGINAL) {
    throw new FotoNoValida('La foto es demasiado grande (más de 30 MB). Elige otra.')
  }

  const heic = await esHeic(file)
  let imagen: ImageBitmap | HTMLImageElement
  try {
    imagen = await decodificar(file)
  } catch {
    // Si el navegador decodifica HEIC (Safari reciente) se convierte a JPEG sin avisar;
    // si no puede, se explica qué hacer en lugar de fallar en silencio.
    throw new FotoNoValida(
      heic ? MENSAJE_HEIC : 'No se pudo abrir la foto. Puede estar dañada; elige otra.',
    )
  }

  const ancho0 = 'naturalWidth' in imagen ? imagen.naturalWidth : imagen.width
  const alto0 = 'naturalHeight' in imagen ? imagen.naturalHeight : imagen.height
  if (!ancho0 || !alto0) throw new FotoNoValida('No se pudo abrir la foto. Elige otra.')

  const escala = Math.min(1, LADO_MAX / Math.max(ancho0, alto0))
  const ancho = Math.round(ancho0 * escala)
  const alto = Math.round(alto0 * escala)

  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new FotoNoValida('Tu navegador no pudo preparar la foto.')
  ctx.fillStyle = '#ffffff' // fondo para PNG con transparencia
  ctx.fillRect(0, 0, ancho, alto)
  ctx.drawImage(imagen, 0, 0, ancho, alto)
  if ('close' in imagen) imagen.close()

  return { blob: await aBlob(canvas), ancho, alto }
}
