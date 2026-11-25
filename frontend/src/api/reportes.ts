import {
  accessTokenStore,
  apiFetch,
  apiFetchConOrigen,
  ApiError,
  NetworkError,
  prepareAccessToken,
  renewAccessToken,
  toApiError,
} from './client'
import { invalidarTrasCrear, invalidarTrasVotar } from '../offline/cacheApi'

export type EstadoReporte = 'recibido' | 'en_proceso' | 'resuelto'
export type OrigenUbicacion = 'gps' | 'manual'

export type Categoria = {
  id: number
  nombre: string
  slug: string
  icono: string
}

export type Reporte = {
  id: number
  categoria: Categoria
  descripcion: string
  latitud: string
  longitud: string
  precision_m: number | null
  origen_ubicacion: OrigenUbicacion
  estado: EstadoReporte
  estado_display: string
  creado: string
  actualizado: string
  foto_url: string
  miniatura_url: string
  es_mio: boolean
  puede_editar: boolean
  /** Votos para priorizarlo. */
  votos: number
  /** La persona con sesión ya votó este reporte. */
  votado: boolean
  /** Puede votar o quitar su voto (no es suyo, no está resuelto y es ciudadano). */
  puede_votar: boolean
}

/** Lo mínimo para dibujar un reporte en el mapa general (sin fotos ni descripción). */
export type PuntoMapa = {
  id: number
  lat: number
  lng: number
  /** slug de la categoría */
  categoria: string
  estado: EstadoReporte
  votos: number
}

export type FiltrosMapa = { categorias: string[]; estados: EstadoReporte[] }

export type ResultadoVoto = { votos: number; votado: boolean }

export type Pagina<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type NuevoReporte = {
  categoria: string
  descripcion: string
  foto: Blob
  latitud: number
  longitud: number
  precision_m: number | null
  origen_ubicacion: OrigenUbicacion
}

export const DESCRIPCION_MIN = 10
export const DESCRIPCION_MAX = 1000

export function fetchCategorias(signal?: AbortSignal) {
  return apiFetch<Categoria[]>('/api/categorias/', { signal })
}

export function fetchMisReportes(page = 1, signal?: AbortSignal) {
  return apiFetch<Pagina<Reporte>>(`/api/reportes/mios/?page=${page}`, { signal })
}

/** Como fetchMisReportes, diciendo si es la copia guardada (sin conexión) y de cuándo. */
export function fetchMisReportesConOrigen(page = 1, signal?: AbortSignal) {
  return apiFetchConOrigen<Pagina<Reporte>>(`/api/reportes/mios/?page=${page}`, { signal })
}

export function fetchPuntosMapa(filtros: FiltrosMapa, signal?: AbortSignal) {
  return apiFetchConOrigen<{ results: PuntoMapa[]; truncado: boolean }>(urlMapa(filtros), {
    signal,
  })
}

function urlMapa(filtros: FiltrosMapa) {
  const params = new URLSearchParams()
  if (filtros.categorias.length) params.set('categoria', filtros.categorias.join(','))
  if (filtros.estados.length) params.set('estado', filtros.estados.join(','))
  const query = params.toString()
  return `/api/reportes/mapa/${query ? `?${query}` : ''}`
}

/** Vota (`true`) o quita el voto (`false`). Repetirlo no falla: el servidor es idempotente. */
export async function votarReporte(id: number, votar: boolean) {
  const resultado = await apiFetch<ResultadoVoto>(`/api/reportes/${id}/voto/`, {
    method: votar ? 'POST' : 'DELETE',
  })
  void invalidarTrasVotar(id)
  return resultado
}

export function fetchReporte(id: number | string, signal?: AbortSignal) {
  return apiFetchConOrigen<Reporte>(`/api/reportes/${encodeURIComponent(String(id))}/`, {
    signal,
  })
}

function aFormData(datos: NuevoReporte): FormData {
  const form = new FormData()
  form.append('categoria', datos.categoria)
  form.append('descripcion', datos.descripcion)
  form.append('foto', datos.foto, 'foto.jpg')
  form.append('latitud', datos.latitud.toFixed(7))
  form.append('longitud', datos.longitud.toFixed(7))
  if (datos.precision_m != null) form.append('precision_m', String(Math.round(datos.precision_m)))
  form.append('origen_ubicacion', datos.origen_ubicacion)
  return form
}

type Progreso = (fraccion: number) => void

type RespuestaSubida = { status: number; body: string; retryAfter: string | null }

/** POST con XMLHttpRequest: fetch no informa el progreso de subida. */
function enviar(
  form: FormData,
  clave: string | undefined,
  onProgress?: Progreso,
): Promise<RespuestaSubida> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/reportes/')
    xhr.setRequestHeader('Accept', 'application/json')
    // Misma clave en cada intento: si la respuesta se perdió, el servidor no lo duplica.
    if (clave) xhr.setRequestHeader('Idempotency-Key', clave)
    const token = accessTokenStore.get()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total)
    }
    xhr.onload = () =>
      resolve({
        status: xhr.status,
        body: xhr.responseText,
        retryAfter: xhr.getResponseHeader('Retry-After'),
      })
    xhr.onerror = () => reject(new NetworkError())
    xhr.ontimeout = () => reject(new NetworkError())
    xhr.onabort = () => reject(new NetworkError())
    xhr.timeout = 120_000
    xhr.send(form)
  })
}

/**
 * Sube un reporte. Con `clave` (la de la cola) el envío se puede repetir sin duplicarlo:
 * si ya llegó, el servidor responde 200 con el mismo reporte.
 */
export async function crearReporte(
  datos: NuevoReporte,
  onProgress?: Progreso,
  clave?: string,
): Promise<Reporte> {
  const form = aFormData(datos)
  const renovado = await prepareAccessToken()
  let respuesta = await enviar(form, clave, onProgress)
  if (respuesta.status === 401 && !renovado && (await renewAccessToken())) {
    respuesta = await enviar(form, clave, onProgress)
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (respuesta.retryAfter) headers['Retry-After'] = respuesta.retryAfter
  // 0 = sin respuesta (p. ej. bloqueada): igual que un corte de red.
  if (respuesta.status === 0) throw new NetworkError()
  const response = new Response(respuesta.body || null, { status: respuesta.status, headers })
  if (!response.ok) throw await toApiError(response)
  const reporte = (await response.json()) as Reporte
  void invalidarTrasCrear()
  return reporte
}

export function esErrorDeFoto(error: unknown): string | null {
  return error instanceof ApiError ? (error.fieldErrors.foto?.[0] ?? null) : null
}
