import { useId } from 'react'

/**
 * Plano de calles dibujado: el campo verde donde "cae" el punto. Decorativo (aria-hidden).
 *
 * Las manzanas y calles son un patrón de 400×300 px que se repite a escala fija, así el plano
 * conserva su densidad en una banda de móvil o en una columna de escritorio. La avenida se
 * estira con la banda pero su trazo no engorda (vector-effect: non-scaling-stroke).
 */
export function MapBand({ className = '' }: { className?: string }) {
  const patternId = `calles-${useId().replace(/:/g, '')}`

  return (
    <div className={`map-band ${className}`} aria-hidden="true">
      <svg className="map-band__streets" width="100%" height="100%" focusable="false">
        <defs>
          <pattern id={patternId} width="400" height="300" patternUnits="userSpaceOnUse">
            <g className="map-band__blocks">
              <path d="M18 24h88l-4 60H14Z" />
              <path d="M134 22h96l4 58H130Z" />
              <path d="M266 20h112v64H262Z" />
              <path d="M12 116h84l-6 70H8Z" />
              <path d="M130 112h66l10 76h-82Z" />
              <path d="M236 116h60l-2 72h-70Z" />
              <path d="M326 118h60v70h-64Z" />
              <path d="M8 216h82l-4 70H4Z" />
              <path d="M116 218h104l6 70H110Z" />
              <path d="M254 220h132v68H248Z" />
            </g>
            <g className="map-band__streets-minor">
              <path d="M0 100h400" />
              <path d="M0 202h400" />
              <path d="M118 0c-3 100-6 200-6 300" />
              <path d="M248 0c-4 110 2 200-4 300" />
              <path d="M312 100c2 40 3 70 2 102" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        <svg viewBox="0 0 400 300" preserveAspectRatio="none" width="100%" height="100%">
          <path
            className="map-band__avenue"
            d="M-10 270C80 232 150 168 230 156s120-62 190-126"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </svg>

      {/* Otros puntos reportados (ilustración): una sola vez, lejos del texto en todo tamaño. */}
      <span className="map-band__spot map-band__spot--a" />
      <span className="map-band__spot map-band__spot--b" />

      <svg className="map-band__pin" viewBox="0 0 64 80" focusable="false">
        <ellipse className="map-band__pin-shadow" cx="32" cy="76" rx="12" ry="3.5" />
        <path
          className="map-band__pin-body"
          d="M32 2C16.5 2 4 14.2 4 29.3 4 49 27.1 70.1 30.3 72.9a2.6 2.6 0 0 0 3.4 0C36.9 70.1 60 49 60 29.3 60 14.2 47.5 2 32 2Z"
        />
        <circle className="map-band__pin-dot" cx="32" cy="29" r="10" />
      </svg>
    </div>
  )
}
