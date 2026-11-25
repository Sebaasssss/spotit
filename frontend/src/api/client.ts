/**
 * Cliente HTTP de la API. Añade el access token (que solo vive en memoria). Si aún no hay
 * token (arranque en frío) espera la renovación antes de enviar; si el token caducó y el
 * servidor responde 401, renueva una vez y repite. Ambas esperas tienen límite de tiempo.
 */

import { fechaGuardada, leerDeCache } from '../offline/cacheApi'

export type FieldErrors = Record<string, string[]>

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: FieldErrors
  /** Segundos de la cabecera Retry-After (429/503), si vino. */
  readonly retryAfter: number | null

  constructor(
    status: number,
    message: string,
    fieldErrors: FieldErrors = {},
    retryAfter: number | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.retryAfter = retryAfter
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

/** La renovación no terminó a tiempo (red muy lenta). Se trata como "sin conexión". */
export class SlowNetworkError extends NetworkError {
  constructor() {
    super()
    this.name = 'SlowNetworkError'
    this.message = 'La conexión está muy lenta. Inténtalo de nuevo en un momento.'
  }
}

/**
 * Tiempo máximo que una petición espera a que se renueve la sesión. Pasado ese tiempo la
 * petición se rinde con SlowNetworkError (la renovación sigue en segundo plano y la aplica
 * cuando llegue), para que una red lenta no deje la pantalla colgada.
 */
let refreshWaitMs = 8_000

export function setRefreshWaitMs(ms: number) {
  refreshWaitMs = ms
}

function withLimit<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new SlowNetworkError()), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/**
 * Renueva el access token con límite de tiempo. Devuelve null si ya no hay sesión válida;
 * lanza NetworkError sin red y SlowNetworkError si tarda demasiado.
 * Lo usan también las peticiones que no pasan por apiFetch, como las subidas.
 */
export async function renewAccessToken(): Promise<string | null> {
  return refreshHandler ? withLimit(refreshHandler(), refreshWaitMs) : null
}

/**
 * Arranque en frío: con el perfil guardado la app entra antes de tener access token (solo
 * vive en memoria). En vez de enviar una petición que seguro recibe 401, espera la
 * renovación que ya está en curso (o la inicia).
 *
 * Devuelve true si tuvo que renovar, para no repetir la renovación ante un 401 posterior.
 * Sin red lanza NetworkError, igual que la petición habría fallado sin la espera.
 */
export async function prepareAccessToken(): Promise<boolean> {
  if (accessToken || !refreshHandler) return false
  const token = await renewAccessToken()
  if (!token) throw new ApiError(401, STATUS_MESSAGES[401])
  return true
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

  const retry = Number.parseInt(response.headers.get('Retry-After') ?? '', 10)
  return new ApiError(
    response.status,
    message,
    fieldErrors,
    Number.isFinite(retry) && retry >= 0 ? retry : null,
  )
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

export type ConOrigen<T> = {
  data: T
  /** Cuándo guardó el service worker esta copia (null si vino de la red). */
  guardado: Date | null
  /** Se leyó de la caché porque no hubo red (ni siquiera para renovar la sesión). */
  sinConexion: boolean
}

function esLectura(init: RequestInit) {
  return !init.method || init.method.toUpperCase() === 'GET'
}

/** Sin red, una lectura puede salir de la copia que guardó el service worker. */
async function desdeCache<T>(path: string, error: unknown): Promise<ConOrigen<T>> {
  const guardada = await leerDeCache(path)
  if (!guardada) throw error
  return { data: (await guardada.json()) as T, guardado: fechaGuardada(guardada), sinConexion: true }
}

/** Como apiFetch, pero dice si la respuesta es una copia guardada y de cuándo. */
export async function apiFetchConOrigen<T>(
  path: string,
  init: RequestInit = {},
  { auth = true }: Options = {},
): Promise<ConOrigen<T>> {
  const lectura = esLectura(init)
  let response: Response
  try {
    const renewedFirst = auth ? await prepareAccessToken() : false
    response = await send(path, init, auth)

    // El access caducó entre peticiones: se renueva una vez y se repite.
    if (response.status === 401 && auth && !renewedFirst) {
      const renewed = await renewAccessToken()
      if (renewed) response = await send(path, init, auth)
    }
  } catch (error) {
    // Sin red ni para renovar la sesión: se usa la copia guardada sin enviar nada sin token.
    if (lectura && error instanceof NetworkError) return desdeCache<T>(path, error)
    throw error
  }

  if (!response.ok) throw await toApiError(response)
  const guardado = fechaGuardada(response)
  if (response.status === 204) return { data: undefined as T, guardado, sinConexion: false }
  return { data: (await response.json()) as T, guardado, sinConexion: false }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  options: Options = {},
): Promise<T> {
  return (await apiFetchConOrigen<T>(path, init, options)).data
}

export function postJson(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) }
}
