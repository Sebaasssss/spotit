import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef } from 'react'
import Supercluster from 'supercluster'
import type { EstadoReporte, PuntoMapa } from '../../api/reportes'
import { CENTRO_MAPA } from '../../lib/mapa'

type Props = {
  puntos: PuntoMapa[]
  /** Nombre visible de cada categoría (slug → nombre), para las etiquetas accesibles. */
  nombres: Record<string, string>
  seleccionado: number | null
  onSelect: (id: number) => void
  /** Reportes que siguen juntos aun con el zoom al máximo (mismo lugar). */
  onSelectGrupo: (ids: number[]) => void
  label: string
}

const TESELAS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATRIBUCION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>'

// Mismos trazos que los iconos de estado de Icons.tsx (Leaflet necesita HTML, no React).
const svg = (cuerpo: string, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${cuerpo}</svg>`
const ICONO_ESTADO: Record<EstadoReporte, string> = {
  recibido: svg(
    '<path d="M3.5 13.5 6 5.5h12l2.5 8v5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1Z"/><path d="M3.5 13.5h5l1 2h5l1-2h5"/>',
  ),
  en_proceso: svg(
    '<path d="M14.5 5.5a4 4 0 0 0 4.9 4.9l-8.6 8.6a2 2 0 0 1-2.8-2.8l8.6-8.6a4 4 0 0 1-2.1-2.1Z"/>',
  ),
  resuelto: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
}
const NOMBRE_ESTADO: Record<EstadoReporte, string> = {
  recibido: 'recibido',
  en_proceso: 'en proceso',
  resuelto: 'resuelto',
}
const ZOOM_MAS = svg('<path d="M12 5v14M5 12h14"/>')
const ZOOM_MENOS = svg('<path d="M5 12h14"/>')

const ZOOM_MAX = 19
/** Media chapa: a menos de esto del borde, el disco quedaría cortado. */
const MARGEN = 22
const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

const sinMovimiento = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Rectángulos (en coordenadas del mapa) de los controles que flotan sobre él. */
function zonasTapadas(contenedor: HTMLElement) {
  const base = contenedor.getBoundingClientRect()
  const marco = contenedor.parentElement ?? contenedor
  const selectores = '.leaflet-control, .mapa__legend-btn, .rmap__notice'
  return Array.from(marco.querySelectorAll<HTMLElement>(selectores)).map((el) => {
    const r = el.getBoundingClientRect()
    return {
      left: r.left - base.left,
      right: r.right - base.left,
      top: r.top - base.top,
      bottom: r.bottom - base.top,
    }
  })
}

type Zona = { left: number; right: number; top: number; bottom: number }

/** ¿El control `z` taparía una chapa centrada en `p`? */
function tapa(z: Zona, p: { x: number; y: number }) {
  return p.x + MARGEN > z.left && p.x - MARGEN < z.right && p.y + MARGEN > z.top && p.y - MARGEN < z.bottom
}

function votosTexto(n: number) {
  return n === 1 ? '1 voto' : `${n} votos`
}

/**
 * Mapa general: cada reporte es una chapa redonda con el icono de su estado; los cercanos se
 * agrupan en una mancha con su número según el zoom (supercluster). Las chapas y manchas son
 * botones reales: se alcanzan con el tabulador y se activan con Enter o espacio.
 */
export function ReportsMap({ puntos, nombres, seleccionado, onSelect, onSelectGrupo, label }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const capa = useRef<L.LayerGroup | null>(null)
  const encuadrado = useRef(false)
  const dibujar = useRef<() => void>(() => {})
  const onSelectRef = useRef(onSelect)
  const onGrupoRef = useRef(onSelectGrupo)
  useEffect(() => {
    onSelectRef.current = onSelect
    onGrupoRef.current = onSelectGrupo
  }, [onSelect, onSelectGrupo])

  const indice = useMemo(() => {
    const sc = // `extent: 256` = tamaño de la tesela: así `radius` está en píxeles de pantalla. 64 px es más
    // que la mancha más grande (54 px), para que ninguna se monte sobre otra.
    new Supercluster<PuntoMapa>({ radius: 64, extent: 256, maxZoom: ZOOM_MAX })
    sc.load(
      puntos.map((p) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
        properties: p,
      })),
    )
    return sc
  }, [puntos])

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!contenedor.current) return
    const map = L.map(contenedor.current, {
      center: [CENTRO_MAPA.lat, CENTRO_MAPA.lng],
      zoom: CENTRO_MAPA.zoom,
      zoomControl: false,
      attributionControl: true,
    })
    map.attributionControl.setPrefix(false)
    L.control
      .zoom({ zoomInText: ZOOM_MAS, zoomOutText: ZOOM_MENOS, zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' })
      .addTo(map)
    L.tileLayer(TESELAS, { maxZoom: ZOOM_MAX, attribution: ATRIBUCION }).addTo(map)
    capa.current = L.layerGroup().addTo(map)
    // También al cambiar de tamaño (la hoja encoge el mapa): las chapas del borde se recalculan.
    map.on('moveend resize', () => dibujar.current())
    map.getContainer().setAttribute('aria-label', label)
    mapa.current = map
    // El contenedor puede cambiar de tamaño (hoja, filtros, giro del teléfono).
    const observador = new ResizeObserver(() => map.invalidateSize())
    observador.observe(contenedor.current)
    return () => {
      observador.disconnect()
      map.remove()
      mapa.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se crea una vez
  }, [])

  // Dibujar chapas y manchas de la zona visible.
  useEffect(() => {
    dibujar.current = () => {
      const map = mapa.current
      const layer = capa.current
      if (!map || !layer) return
      layer.clearLayers()
      const b = map.getBounds()
      const zoom = Math.round(map.getZoom())
      const items = indice.getClusters([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom)

      const tam = map.getSize()
      const tapadas = zonasTapadas(map.getContainer())
      type Props = PuntoMapa & { cluster?: boolean; cluster_id?: number; point_count?: number }
      // Si el elegido no se ve solo (comparte lugar con otros), se marca la mancha que lo lleva.
      const elegidoSuelto = items.some(
        (f) => !(f.properties as Props).cluster && (f.properties as Props).id === seleccionado,
      )
      const contieneElegido = (clusterId: number) =>
        !elegidoSuelto &&
        seleccionado != null &&
        indice.getLeaves(clusterId, Infinity).some((f) => f.properties.id === seleccionado)

      for (const item of items) {
        const [lng, lat] = item.geometry.coordinates
        const props = item.properties as Props
        const marcado = props.cluster
          ? props.cluster_id != null && contieneElegido(props.cluster_id)
          : props.id === seleccionado
        // Una chapa cortada por el borde o escondida bajo un control (zoom, leyenda, avisos)
        // no se puede tocar y parece rota: se omite y reaparece al mover un poco el mapa.
        // La elegida nunca se omite: el mapa se mueve para mostrarla (ver más abajo).
        const px = map.latLngToContainerPoint([lat, lng])
        if (!marcado) {
          if (px.x < MARGEN || px.y < MARGEN || px.x > tam.x - MARGEN || px.y > tam.y - MARGEN) {
            continue
          }
          if (tapadas.some((z) => tapa(z, px))) continue
        }

        if (props.cluster && props.cluster_id != null) {
          const n = props.point_count ?? 0
          const talla = n < 10 ? 'sm' : n < 100 ? 'md' : 'lg'
          const html = `<button type="button" class="rmap-cluster rmap-cluster--${talla}${marcado ? ' is-selected' : ''}" aria-label="${n} reportes juntos${marcado ? ', incluido el que tienes abierto' : ''}. Acercar para verlos">${n}</button>`
          const marker = L.marker([lat, lng], {
            icon: L.divIcon({ html, className: 'rmap-icon', iconSize: [56, 56], iconAnchor: [28, 28] }),
            keyboard: false,
            zIndexOffset: marcado ? 1000 : 0,
          })
          const clusterId = props.cluster_id
          marker.on('click', () => {
            const destino = indice.getClusterExpansionZoom(clusterId)
            if (destino > ZOOM_MAX || map.getZoom() >= ZOOM_MAX) {
              // Ya no se separan acercando: están en el mismo lugar. Se listan.
              onGrupoRef.current(indice.getLeaves(clusterId, Infinity).map((f) => f.properties.id))
            } else if (sinMovimiento()) map.setView([lat, lng], destino)
            else map.flyTo([lat, lng], destino, { duration: 0.35 })
          })
          layer.addLayer(marker)
          continue
        }

        const p = props
        const nombre = nombres[p.categoria] ?? 'Reporte'
        const elegido = p.id === seleccionado
        const votos =
          p.votos > 0 ? `<span class="rmap-chip__votes" aria-hidden="true">${p.votos}</span>` : ''
        const etiqueta = `${nombre}, ${NOMBRE_ESTADO[p.estado]}, ${votosTexto(p.votos)}`
        const html = `<button type="button" class="rmap-chip rmap-chip--${p.estado}${elegido ? ' is-selected' : ''}" data-id="${p.id}" aria-label="${escapar(etiqueta)}"${elegido ? ' aria-current="true"' : ''}>${ICONO_ESTADO[p.estado]}${votos}</button>`
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({ html, className: 'rmap-icon', iconSize: [44, 44], iconAnchor: [22, 22] }),
          keyboard: false,
          zIndexOffset: elegido ? 1000 : 0,
        })
        marker.on('click', () => onSelectRef.current(p.id))
        layer.addLayer(marker)
      }
    }
    dibujar.current()
  }, [indice, nombres, seleccionado])

  // Primera carga con puntos: encuadrarlos todos. Después se respeta lo que la persona movió.
  useEffect(() => {
    const map = mapa.current
    if (!map || encuadrado.current || puntos.length === 0) return
    encuadrado.current = true
    const limites = L.latLngBounds(puntos.map((p) => [p.lat, p.lng] as [number, number]))
    map.fitBounds(limites, { padding: [48, 48], maxZoom: 16, animate: false })
  }, [puntos])

  // Al elegir un punto (también desde la lista o un enlace), mostrarlo: si está dentro de una
  // mancha, acercar hasta que su chapa se vea sola; en móvil la hoja tapa la parte de abajo,
  // así que el punto se lleva al tercio superior del mapa.
  const enfocado = useRef<number | null>(null)
  useEffect(() => {
    const map = mapa.current
    const punto = puntos.find((p) => p.id === seleccionado)
    if (!map || !punto) {
      if (!seleccionado) enfocado.current = null
      return
    }
    // Solo una vez por selección: `puntos` también cambia con cada voto.
    if (enfocado.current === punto.id) return
    enfocado.current = punto.id

    const sola = (zoom: number) => {
      const b = map.getBounds()
      return indice
        .getClusters([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom)
        .some((f) => !('cluster' in f.properties) && f.properties.id === punto.id)
    }
    let zoom = Math.round(map.getZoom())
    if (!sola(zoom)) {
      while (zoom < ZOOM_MAX && !sola(zoom)) zoom++
      // Si comparte el lugar exacto con otros, ningún zoom lo separa: no se mueve el mapa.
      if (sola(zoom)) map.setView([punto.lat, punto.lng], zoom, { animate: false })
    }

    // En móvil la hoja encoge el mapa: se espera a que Leaflet tome el tamaño nuevo. Si el
    // punto queda cerca del borde o bajo un control (zoom, "Leyenda"), se centra.
    window.requestAnimationFrame(() => {
      map.invalidateSize({ animate: false })
      const tam = map.getSize()
      const p = map.latLngToContainerPoint([punto.lat, punto.lng])
      const cerca = p.x < 60 || p.x > tam.x - 60 || p.y < 60 || p.y > tam.y - 60
      const tapado = zonasTapadas(map.getContainer()).some((z) => tapa(z, p))
      if (!cerca && !tapado) return
      map.panBy([p.x - tam.x / 2, p.y - tam.y / 2], { animate: !sinMovimiento() })
    })
  }, [seleccionado, puntos, indice])

  return <div ref={contenedor} className="rmap__canvas" />
}
