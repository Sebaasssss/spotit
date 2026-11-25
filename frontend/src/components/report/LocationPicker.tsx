import { forwardRef, useId, useState } from 'react'
import type { OrigenUbicacion } from '../../api/reportes'
import { obtenerUbicacion, GeoError } from '../../lib/geo'
import { CENTRO_MAPA, formatoCoordenadas } from '../../lib/mapa'
import { FormAlert } from '../form/fields'
import { AlertIcon, LocateIcon, Spinner } from '../Icons'
import { MapView } from './MapView'

export type Ubicacion = {
  lat: number
  lng: number
  precision: number | null
  origen: OrigenUbicacion
}

type Props = {
  value: Ubicacion | null
  onChange: (ubicacion: Ubicacion) => void
  error?: string | null
}

/**
 * "Usar mi ubicación" pide el permiso solo al tocarlo. Si se niega o falla, el mapa sigue
 * funcionando: se mueve hasta que el punto del centro quede sobre el problema.
 */
export const LocationPicker = forwardRef<HTMLButtonElement, Props>(function LocationPicker(
  { value, onChange, error },
  ref,
) {
  const id = useId()
  const [buscando, setBuscando] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [recenter, setRecenter] = useState(0)

  const usarMiUbicacion = async () => {
    setBuscando(true)
    setGeoError(null)
    try {
      const pos = await obtenerUbicacion()
      onChange({ lat: pos.lat, lng: pos.lng, precision: pos.precision, origen: 'gps' })
      setRecenter((n) => n + 1)
    } catch (err) {
      setGeoError(err instanceof GeoError ? err.message : 'No pudimos obtener tu ubicación.')
    } finally {
      setBuscando(false)
    }
  }

  const centro = value ?? { lat: CENTRO_MAPA.lat, lng: CENTRO_MAPA.lng }
  const errorId = error ? `${id}-error` : undefined
  const estadoId = `${id}-estado`

  return (
    <fieldset
      className={`field ${error ? 'field--invalid' : ''}`}
      aria-describedby={[estadoId, errorId].filter(Boolean).join(' ')}
    >
      <legend className="field__label">¿Dónde está?</legend>

      <button
        ref={ref}
        type="button"
        className="btn btn--secondary btn--block-secondary"
        onClick={() => void usarMiUbicacion()}
        disabled={buscando}
      >
        {buscando ? <Spinner size={20} /> : <LocateIcon size={20} />}
        <span>{buscando ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}</span>
      </button>

      {geoError && <FormAlert tone="info">{geoError}</FormAlert>}

      <MapView
        center={centro}
        zoom={value ? 17 : CENTRO_MAPA.zoom}
        accuracy={value?.origen === 'gps' ? value.precision : null}
        recenterKey={recenter}
        hasPoint={!!value}
        onUserMove={(c) => {
          setGeoError(null)
          onChange({ lat: c.lat, lng: c.lng, precision: null, origen: 'manual' })
        }}
        label="Mapa para elegir el punto. El punto queda en el centro: arrastra el mapa o usa las flechas del teclado para moverlo."
      />

      {!value && (
        <button
          type="button"
          className="link-button"
          onClick={() =>
            onChange({ lat: centro.lat, lng: centro.lng, precision: null, origen: 'manual' })
          }
        >
          El problema está aquí: usar este punto
        </button>
      )}

      <p className="location-status" id={estadoId} aria-live="polite">
        {!value &&
          'Aún no eliges el punto. Usa tu ubicación, mueve el mapa o usa el punto del centro.'}
        {value?.origen === 'gps' &&
          `Ubicación del GPS${value.precision ? `, precisión de ±${Math.round(value.precision)} m` : ''}. Mueve el mapa si el punto no es exacto.`}
        {value?.origen === 'manual' && `Punto ajustado a mano: ${formatoCoordenadas(value.lat, value.lng)}.`}
      </p>

      {error && (
        <p className="field__error" id={errorId}>
          <AlertIcon size={18} />
          <span>{error}</span>
        </p>
      )}
    </fieldset>
  )
})
