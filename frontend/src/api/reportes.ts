import {
  accessTokenStore,
  apiFetch,
  ApiError,
  NetworkError,
  renewAccessToken,
  toApiError,
} from './client'

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
}

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

export function fetchReporte(id: number | string, signal?: AbortSignal) {
  return apiFetch<Reporte>(`/api/reportes/${encodeURIComponent(String(id))}/`, { signal })
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

/** POST con XMLHttpRequest: fetch no informa el progreso de subida. */
function enviar(form: FormData, onProgress?: Progreso): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/reportes/')
    xhr.setRequestHeader('Accept', 'application/json')
    const token = accessTokenStore.get()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total)
    }
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText })
    xhr.onerror = () => reject(new NetworkError())
    xhr.ontimeout = () => reject(new NetworkError())
    xhr.timeout = 120_000
    xhr.send(form)
  })
}

export async function crearReporte(datos: NuevoReporte, onProgress?: Progreso): Promise<Reporte> {
  const form = aFormData(datos)
  let respuesta = await enviar(form, onProgress)
  if (respuesta.status === 401 && (await renewAccessToken())) {
    respuesta = await enviar(form, onProgress)
  }
  const response = new Response(respuesta.body || null, {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw await toApiError(response)
  return (await response.json()) as Reporte
}

export function esErrorDeFoto(error: unknown): string | null {
  return error instanceof ApiError ? (error.fieldErrors.foto?.[0] ?? null) : null
}
