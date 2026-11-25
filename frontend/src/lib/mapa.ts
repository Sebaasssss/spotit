export type CentroMapa = { lat: number; lng: number; zoom: number }

/** Ciudad de México: se usa si VITE_MAPA_CENTRO falta o es inválido. */
export const CENTRO_POR_DEFECTO: CentroMapa = { lat: 19.432608, lng: -99.133209, zoom: 12 }

/**
 * Lee el centro del mapa con el formato `latitud,longitud,zoom` (sin espacios), p. ej.
 * `18.8502834,-99.2007355,16`. Devuelve el valor por defecto si algo no cuadra.
 */
export function parseCentroMapa(valor: string | undefined | null): CentroMapa {
  if (!valor) return CENTRO_POR_DEFECTO
  const partes = valor.trim().split(',')
  if (partes.length !== 3) return CENTRO_POR_DEFECTO
  const [lat, lng, zoom] = partes.map((p) => Number(p.trim()))
  const valido =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Number.isInteger(zoom) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    zoom >= 3 &&
    zoom <= 19
  return valido ? { lat, lng, zoom } : CENTRO_POR_DEFECTO
}

export const CENTRO_MAPA = parseCentroMapa(import.meta.env.VITE_MAPA_CENTRO)

export function formatoCoordenadas(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}
