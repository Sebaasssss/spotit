/**
 * Cliente HTTP de la API. Añade el access token (que solo vive en memoria) y, ante un 401,
 * intenta renovar la sesión una vez antes de rendirse.
 */

export type FieldErrors = Record<string, string[]>

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: FieldErrors

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

/** No hubo respuesta del servidor: sin red, servidor caído o túnel cerrado. */
export class NetworkError extends Error {
  constructor() {
    super('No hay conexión. Revisa tu internet e inténtalo de nuevo.')
    this.name = 'NetworkError'
  }
}

// --- Access token: solo en memoria, nunca en localStorage ---

let accessToken: string | null = null

export const accessTokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token
  },
}

// --- Renovación de sesión (la registra el módulo de sesión) ---

type RefreshHandler = () => Promise<string | null>
let refreshHandler: RefreshHandler | null = null

export function setRefreshHandler(handler: RefreshHandler | null) {
  refreshHandler = handler
}

// --- Errores ---

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Revisa los datos marcados.',
  401: 'Tu sesión expiró. Vuelve a entrar.',
  403: 'No tienes permiso para hacer esto.',
  404: 'No encontramos lo que buscas.',
  429: 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.',
}

export async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // respuesta sin JSON (p. ej. un 502 de nginx)
  }

  let message =
    STATUS_MESSAGES[response.status] ??
    (response.status >= 500
      ? 'El servidor tuvo un problema. Inténtalo en un momento.'
      : 'Algo salió mal. Inténtalo de nuevo.')
  const fieldErrors: FieldErrors = {}

  if (body && typeof body === 'object') {
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (key === 'detail' && typeof value === 'string' && response.status !== 429) {
        message = value
      } else if (key === 'non_field_errors' && Array.isArray(value) && value.length) {
        message = String(value[0])
      } else if (Array.isArray(value)) {
        fieldErrors[key] = value.map(String)
      }
    }
  }

  return new ApiError(response.status, message, fieldErrors)
}

// --- Petición ---

type Options = {
  /** Enviar el access token y renovar la sesión ante un 401. */
  auth?: boolean
}

async function send(path: string, init: RequestInit, auth: boolean): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = accessTokenStore.get()
  if (auth && token) headers.set('Authorization', `Bearer ${token}`)

  try {
    return await fetch(path, { credentials: 'same-origin', ...init, headers })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new NetworkError()
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  { auth = true }: Options = {},
): Promise<T> {
  let response = await send(path, init, auth)

  if (response.status === 401 && auth && refreshHandler) {
    const renewed = await refreshHandler()
    if (renewed) response = await send(path, init, auth)
  }

  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function postJson(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) }
}
