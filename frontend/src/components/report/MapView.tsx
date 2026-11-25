import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'

export type Punto = { lat: number; lng: number }

type Props = {
  center: Punto
  zoom: number
  /** Solo lectura: sin arrastre ni zoom (detalle del reporte). */
  interactive?: boolean
  /** Radio de precisión del GPS, en metros. */
  accuracy?: number | null
  /** Se llama al terminar un movimiento hecho por la persona (no por código). */
  onUserMove?: (centro: Punto) => void
  /** Cambiar este valor recentra el mapa en `center` (p. ej. tras "Usar mi ubicación"). */
  recenterKey?: number
  /** Sin punto elegido el pin va "fantasma" (contorno): no promete una ubicación registrada. */
  hasPoint?: boolean
  label: string
  className?: string
}

const svg = (d: string) =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`
const ZOOM_MAS = svg('M12 5v14M5 12h14')
const ZOOM_MENOS = svg('M5 12h14')

const TESELAS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATRIBUCION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>'

/**
 * Mapa Leaflet con el pin fijo en el centro: se mueve el mapa, no el marcador (más preciso
 * con el dedo). El zoom siempre es alrededor del centro para no mover el punto elegido.
 */
export function MapView({
  center,
  zoom,
  interactive = true,
  accuracy,
  onUserMove,
  recenterKey = 0,
  hasPoint = true,
  label,
  className = '',
}: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const circulo = useRef<L.Circle | null>(null)
  const programatico = useRef(false)
  const onMove = useRef(onUserMove)
  useEffect(() => {
    onMove.current = onUserMove
  }, [onUserMove])

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!contenedor.current) return
    const map = L.map(contenedor.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: false,
      dragging: interactive,
      keyboard: interactive,
      scrollWheelZoom: interactive ? 'center' : false,
      touchZoom: interactive ? 'center' : false,
      doubleClickZoom: interactive ? 'center' : false,
      boxZoom: false,
      attributionControl: true,
    })
    map.attributionControl.setPrefix(false)
    if (interactive) {
      // Iconos dibujados de la familia de la app en lugar de los glifos "+" y "−".
      L.control
        .zoom({
          zoomInText: ZOOM_MAS,
          zoomOutText: ZOOM_MENOS,
          zoomInTitle: 'Acercar',
          zoomOutTitle: 'Alejar',
        })
        .addTo(map)
    }
    L.tileLayer(TESELAS, { maxZoom: 19, attribution: ATRIBUCION }).addTo(map)
    map.on('moveend', () => {
      if (programatico.current) {
        programatico.current = false
        return
      }
      const c = map.getCenter()
      onMove.current?.({ lat: c.lat, lng: c.lng })
    })
    // El contenedor de Leaflet es el que recibe el foco del teclado.
    const el = map.getContainer()
    el.setAttribute('aria-label', label)
    if (!interactive) el.removeAttribute('tabindex')
    mapa.current = map
    return () => {
      map.remove()
      mapa.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se crea una vez
  }, [])

  // Recentrar cuando lo pide el formulario (GPS) o cambia el reporte mostrado.
  useEffect(() => {
    const map = mapa.current
    if (!map) return
    programatico.current = true
    map.setView([center.lat, center.lng], Math.max(map.getZoom(), zoom), { animate: false })
    // setView no dispara moveend si el centro no cambió
    window.setTimeout(() => {
      programatico.current = false
    }, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo por recenterKey
  }, [recenterKey])

  // Círculo de precisión del GPS.
  useEffect(() => {
    const map = mapa.current
    if (!map) return
    circulo.current?.remove()
    circulo.current = null
    if (accuracy && accuracy > 0) {
      circulo.current = L.circle([center.lat, center.lng], {
        radius: accuracy,
        color: '#0e5a4f',
        weight: 2,
        fillColor: '#0e5a4f',
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(map)
    }
  }, [accuracy, center.lat, center.lng])

  return (
    <div className={`map-view ${interactive ? '' : 'map-view--static'} ${className}`}>
      <div ref={contenedor} className="map-view__canvas" />
      <svg
        className={`map-view__pin ${hasPoint ? '' : 'map-view__pin--ghost'}`}
        viewBox="0 0 64 80"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse className="map-view__pin-shadow" cx="32" cy="76" rx="10" ry="3" />
        <path
          className="map-view__pin-body"
          d="M32 2C16.5 2 4 14.2 4 29.3 4 49 27.1 70.1 30.3 72.9a2.6 2.6 0 0 0 3.4 0C36.9 70.1 60 49 60 29.3 60 14.2 47.5 2 32 2Z"
        />
        <circle className="map-view__pin-dot" cx="32" cy="29" r="10" />
      </svg>
    </div>
  )
}
