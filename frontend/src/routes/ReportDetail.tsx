import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router'
import { ApiError, NetworkError } from '../api/client'
import { fetchReporte, type Reporte } from '../api/reportes'
import { FormAlert } from '../components/form/fields'
import { RefreshIcon, Spinner } from '../components/Icons'
import { PageHeader } from '../components/PageHeader'
import { MapView } from '../components/report/MapView'
import { StatusPill } from '../components/report/StatusPill'
import { VoteButton } from '../components/report/VoteButton'
import { fechaCompleta } from '../lib/fechas'
import { formatoCoordenadas } from '../lib/mapa'

type Estado =
  | { kind: 'loading' }
  | { kind: 'ok'; reporte: Reporte }
  | { kind: 'error'; message: string; retry: boolean }

export function ReportDetail() {
  const { id = '' } = useParams()
  const [estado, setEstado] = useState<Estado>({ kind: 'loading' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchReporte(id, controller.signal).then(
      (reporte) => setEstado({ kind: 'ok', reporte }),
      (error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 404) {
          setEstado({ kind: 'error', message: 'Este reporte no existe.', retry: false })
        } else {
          setEstado({
            kind: 'error',
            message:
              error instanceof NetworkError
                ? 'Sin conexión: no pudimos cargar el reporte.'
                : 'No pudimos cargar el reporte.',
            retry: true,
          })
        }
      },
    )
    return () => controller.abort()
  }, [id, intento])

  const titulo = estado.kind === 'ok' ? estado.reporte.categoria.nombre : 'Reporte'
  // Desde el mapa se vuelve al mapa con sus filtros. Si se abrió por enlace o tras recargar:
  // el propio vuelve a "Mis reportes" y uno ajeno al mapa, con su hoja abierta.
  const volverA = (useLocation().state as { volverA?: string } | null)?.volverA
  const back = volverA?.startsWith('/mapa')
    ? { to: volverA, label: 'Mapa' }
    : estado.kind === 'ok' && !estado.reporte.es_mio
      ? { to: `/mapa?r=${estado.reporte.id}`, label: 'Mapa' }
      : { to: '/reportes', label: 'Mis reportes' }

  return (
    <div className="page">
      <PageHeader title={titulo} back={back} />

      <main className="page__main">
        {estado.kind === 'loading' && (
          <p className="picker__status" role="status">
            <Spinner size={18} /> Cargando el reporte…
          </p>
        )}

        {estado.kind === 'error' && (
          <FormAlert>
            <p>{estado.message}</p>
            {estado.retry && (
              <p className="form-alert__help">
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setEstado({ kind: 'loading' })
                    setIntento((n) => n + 1)
                  }}
                >
                  <RefreshIcon size={18} /> Reintentar
                </button>
              </p>
            )}
          </FormAlert>
        )}

        {estado.kind === 'ok' && <Detalle reporte={estado.reporte} />}
      </main>
    </div>
  )
}

function Detalle({ reporte }: { reporte: Reporte }) {
  const lat = Number(reporte.latitud)
  const lng = Number(reporte.longitud)

  return (
    <article className="detail">
      <div className="detail__status">
        <StatusPill estado={reporte.estado} />
      </div>

      <VoteButton key={reporte.id} reporte={reporte} />

      <figure className="detail__photo">
        <img src={reporte.foto_url} alt={`Foto del reporte: ${reporte.categoria.nombre}`} />
      </figure>

      <p className="detail__text">{reporte.descripcion}</p>

      <dl className="account">
        <div>
          <dt>Enviado</dt>
          <dd>
            <time dateTime={reporte.creado}>{fechaCompleta(reporte.creado)}</time>
          </dd>
        </div>
        <div>
          <dt>Ubicación</dt>
          <dd>
            {formatoCoordenadas(lat, lng)}
            {reporte.origen_ubicacion === 'gps' && reporte.precision_m
              ? ` · GPS, ±${reporte.precision_m} m`
              : ' · ajustada a mano'}
          </dd>
        </div>
      </dl>

      <MapView
        center={{ lat, lng }}
        zoom={17}
        interactive={false}
        label={`Mapa con la ubicación del reporte: ${formatoCoordenadas(lat, lng)}`}
        className="map-view--detail"
      />
    </article>
  )
}
