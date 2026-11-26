import { ApiError, NetworkError } from '../../api/client'

/** Mensaje de carga fallida en el panel (sin red, sin permiso u otro). */
export function mensajeError(error: unknown, que: string) {
  if (error instanceof NetworkError)
    return { offline: true, message: `Sin conexión: no pudimos cargar ${que}.` }
  if (error instanceof ApiError && error.status === 403)
    return { offline: false, message: 'Tu cuenta no tiene acceso al panel.' }
  return { offline: false, message: `No pudimos cargar ${que}.` }
}
