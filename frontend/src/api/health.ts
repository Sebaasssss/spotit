export type Health = {
  status: 'ok' | 'error'
  database: 'ok' | 'error'
  version: string
}

export class HealthError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'HealthError'
    this.status = status
  }
}

/** Consulta /api/health/. Lanza HealthError si no hay red o el backend no está sano. */
export async function fetchHealth(signal?: AbortSignal): Promise<Health> {
  let response: Response
  try {
    response = await fetch('/api/health/', {
      signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new HealthError('No hay conexión con el servidor.')
  }

  if (!response.ok) {
    throw new HealthError(
      response.status === 503
        ? 'El servidor está arriba, pero la base de datos no responde.'
        : `El servidor respondió con un error (${response.status}).`,
      response.status,
    )
  }

  return (await response.json()) as Health
}
