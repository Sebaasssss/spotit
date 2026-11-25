/**
 * Qué hacer con un pendiente después de un intento de envío fallido.
 *
 * - esperar: fallo pasajero (sin red, servidor caído, límite por hora). Se reintenta solo.
 * - sesion: la sesión ya no es válida. Se queda guardado hasta que la persona vuelva a entrar.
 * - error: el servidor lo rechazó por sus datos (foto inválida, categoría retirada…).
 *   Reintentar no lo arreglará: la persona decide (Reintentar o Descartar).
 */

import { ApiError, NetworkError } from '../api/client'
import type { MotivoEspera } from './cola'

export type Decision =
  | { tipo: 'esperar'; motivo: Exclude<MotivoEspera, 'sesion'>; hasta: number; mensaje: string }
  | { tipo: 'sesion'; mensaje: string }
  | { tipo: 'error'; mensaje: string }

/** Esperas tras cada intento fallido: 5 s, 30 s, 2 min y luego cada 10 min. */
export const ESPERAS_MS = [5_000, 30_000, 120_000, 600_000]

export function espera(intentos: number): number {
  return ESPERAS_MS[Math.min(Math.max(intentos, 1), ESPERAS_MS.length) - 1]
}

const REINTENTABLES = new Set([408, 425, 429, 500, 502, 503, 504])

/** Primer mensaje de campo del servidor (p. ej. el de la foto), o el general. */
function mensajeDelServidor(error: ApiError): string {
  for (const mensajes of Object.values(error.fieldErrors)) {
    if (mensajes.length) return mensajes[0]
  }
  return error.message
}

/**
 * @param intentos intentos fallidos contando este.
 * @param ahora epoch ms.
 */
export function clasificar(error: unknown, intentos: number, ahora: number): Decision {
  if (error instanceof NetworkError) {
    return {
      tipo: 'esperar',
      motivo: 'red',
      hasta: ahora + espera(intentos),
      mensaje: 'Sin conexión. Se enviará cuando vuelva la señal.',
    }
  }
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return { tipo: 'sesion', mensaje: 'Tu sesión expiró. Entra de nuevo para enviarlo.' }
    }
    if (error.status === 429) {
      const segundos = error.retryAfter ?? 60
      const hasta = ahora + segundos * 1000
      return {
        tipo: 'esperar',
        motivo: 'limite',
        hasta,
        mensaje: `Llegaste al límite de envíos por hora. Se enviará a las ${hora(hasta)}.`,
      }
    }
    if (REINTENTABLES.has(error.status) || error.status >= 500) {
      return {
        tipo: 'esperar',
        motivo: 'servidor',
        hasta: ahora + espera(intentos),
        mensaje: 'El servidor no respondió bien. Se reintentará en un momento.',
      }
    }
    if (error.status === 413) {
      return { tipo: 'error', mensaje: 'La foto es demasiado grande para enviarse.' }
    }
    if (error.status === 403) {
      return { tipo: 'error', mensaje: 'Tu cuenta no puede crear reportes.' }
    }
    return { tipo: 'error', mensaje: mensajeDelServidor(error) }
  }
  // Fallo inesperado del propio teléfono: mejor reintentar que perder el reporte.
  return {
    tipo: 'esperar',
    motivo: 'servidor',
    hasta: ahora + espera(intentos),
    mensaje: 'No se pudo enviar. Se reintentará en un momento.',
  }
}

/** "9:20 a.m." sin el punto final, para poder cerrar la frase con uno propio. */
export function hora(epochMs: number): string {
  return new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' })
    .format(new Date(epochMs))
    .replace(/\.$/, '')
}
