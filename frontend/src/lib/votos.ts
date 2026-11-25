import { ApiError, NetworkError } from '../api/client'

export type EstadoVoto = { votos: number; votado: boolean }

/** El estado que se muestra al instante al tocar "Votar", antes de que responda el servidor. */
export function alternarVoto({ votos, votado }: EstadoVoto): EstadoVoto {
  return votado ? { votos: Math.max(0, votos - 1), votado: false } : { votos: votos + 1, votado: true }
}

export function textoVotos({ votos, votado }: EstadoVoto): string {
  if (votado) return votos <= 1 ? '1 voto: el tuyo' : `${votos} votos, incluido el tuyo`
  if (votos === 0) return 'Aún sin votos'
  return votos === 1 ? '1 voto' : `${votos} votos`
}

/** Qué decir cuando el voto no se guardó (el botón ya volvió a su estado anterior). */
export function mensajeErrorVoto(error: unknown, queria: boolean): string {
  const accion = queria ? 'tu voto' : 'el cambio'
  if (error instanceof NetworkError) {
    return `Sin conexión: no se guardó ${accion}. Inténtalo de nuevo cuando tengas señal.`
  }
  if (error instanceof ApiError && error.status === 403) return error.message
  return `No se guardó ${accion}. Inténtalo de nuevo.`
}
