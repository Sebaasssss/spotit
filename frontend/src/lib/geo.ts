export type Posicion = { lat: number; lng: number; precision: number }

export type ErrorGeo = 'denegado' | 'no-disponible' | 'tiempo' | 'no-soportado'

export class GeoError extends Error {
  readonly tipo: ErrorGeo
  constructor(tipo: ErrorGeo) {
    super(MENSAJES_GEO[tipo])
    this.name = 'GeoError'
    this.tipo = tipo
  }
}

export const MENSAJES_GEO: Record<ErrorGeo, string> = {
  denegado:
    'No diste permiso para usar tu ubicación. Mueve el mapa hasta el punto o actívala en los ajustes del navegador.',
  'no-disponible':
    'No pudimos saber dónde estás. Mueve el mapa hasta el punto o inténtalo al aire libre.',
  tiempo: 'Tu ubicación tardó demasiado. Mueve el mapa hasta el punto o inténtalo de nuevo.',
  'no-soportado': 'Este navegador no da la ubicación. Mueve el mapa hasta el punto.',
}

/** Pide la ubicación. Solo se llama tras un toque de la persona (permiso en contexto). */
export function obtenerUbicacion(timeout = 15_000): Promise<Posicion> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new GeoError('no-soportado'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precision: pos.coords.accuracy,
        }),
      (err) =>
        reject(
          new GeoError(
            err.code === err.PERMISSION_DENIED
              ? 'denegado'
              : err.code === err.TIMEOUT
                ? 'tiempo'
                : 'no-disponible',
          ),
        ),
      { enableHighAccuracy: true, timeout, maximumAge: 30_000 },
    )
  })
}
