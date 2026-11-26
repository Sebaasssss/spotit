/**
 * API del panel de administración (/api/admin/). Solo administradores.
 * Estas respuestas nunca se guardan en la caché del service worker (llevan emails).
 */

import { apiFetch, postJson } from './client'
import type { Categoria, EstadoReporte, OrigenUbicacion, Pagina } from './reportes'

export type ReporteAdmin = {
  id: number
  categoria: Categoria
  descripcion: string
  estado: EstadoReporte
  estado_display: string
  creado: string
  actualizado: string
  votos: number
  oculto: boolean
  miniatura_url: string
}

export type TipoEvento = 'estado' | 'ocultar' | 'mostrar'

export type EventoAdmin = {
  tipo: TipoEvento
  tipo_display: string
  estado_anterior: EstadoReporte | ''
  estado_nuevo: EstadoReporte | ''
  estado_nuevo_display: string
  nota_publica: string
  motivo: string
  admin: string | null
  fecha: string
}

export type ReporteAdminDetalle = ReporteAdmin & {
  latitud: string
  longitud: string
  precision_m: number | null
  origen_ubicacion: OrigenUbicacion
  foto_url: string
  autor: { nombre: string; email: string } | null
  oculto_motivo: string
  oculto_por: string | null
  oculto_en: string | null
  transiciones: { estado: EstadoReporte; label: string }[]
  historial: EventoAdmin[]
}

export type Resumen = {
  total: number
  por_estado: Record<EstadoReporte, number>
  por_categoria: { slug: string; nombre: string; icono: string; total: number }[]
  ocultos: number
  nuevos_7_dias: number
  mas_votados: ReporteAdmin[]
}

export type OcultoFiltro = 'todos' | 'si' | 'no'
export type OrdenAdmin = 'recientes' | 'antiguos' | 'votos'

export type FiltrosAdmin = {
  estados: EstadoReporte[]
  categorias: string[]
  desde: string
  hasta: string
  votosMin: string
  q: string
  oculto: OcultoFiltro
  orden: OrdenAdmin
}

export function consultaAdmin(f: FiltrosAdmin, page = 1): string {
  const p = new URLSearchParams()
  if (f.estados.length) p.set('estado', f.estados.join(','))
  if (f.categorias.length) p.set('categoria', f.categorias.join(','))
  if (f.desde) p.set('desde', f.desde)
  if (f.hasta) p.set('hasta', f.hasta)
  if (f.votosMin) p.set('votos_min', f.votosMin)
  if (f.q.trim()) p.set('q', f.q.trim())
  if (f.oculto !== 'todos') p.set('oculto', f.oculto)
  if (f.orden !== 'recientes') p.set('orden', f.orden)
  if (page > 1) p.set('page', String(page))
  return p.toString()
}

export function fetchResumen(signal?: AbortSignal) {
  return apiFetch<Resumen>('/api/admin/resumen/', { signal })
}

export function fetchReportesAdmin(f: FiltrosAdmin, page = 1, signal?: AbortSignal) {
  const q = consultaAdmin(f, page)
  return apiFetch<Pagina<ReporteAdmin>>(`/api/admin/reportes/${q ? `?${q}` : ''}`, { signal })
}

export function fetchReporteAdmin(id: number | string, signal?: AbortSignal) {
  return apiFetch<ReporteAdminDetalle>(`/api/admin/reportes/${encodeURIComponent(String(id))}/`, {
    signal,
  })
}

export function cambiarEstado(
  id: number,
  datos: { estado: EstadoReporte; desde: EstadoReporte; nota_publica: string },
) {
  return apiFetch<ReporteAdminDetalle>(`/api/admin/reportes/${id}/estado/`, postJson(datos))
}

export function ocultarReporte(id: number, datos: { motivo: string; nota_publica: string }) {
  return apiFetch<ReporteAdminDetalle>(`/api/admin/reportes/${id}/ocultar/`, postJson(datos))
}

export function mostrarReporte(id: number, datos: { nota_publica: string }) {
  return apiFetch<ReporteAdminDetalle>(`/api/admin/reportes/${id}/mostrar/`, postJson(datos))
}
