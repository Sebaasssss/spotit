import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router'
import { ApiError, NetworkError } from '../api/client'
import { fetchReporte, type Reporte } from '../api/reportes'
import { FormAlert } from '../components/form/fields'
import { EyeOffIcon, RefreshIcon, Spinner } from '../components/Icons'
import { PageHeader } from '../components/PageHeader'
import { MapView } from '../components/report/MapView'
import { StatusPill } from '../components/report/StatusPill'
import { VoteButton } from '../components/report/VoteButton'
import { fechaCompleta } from '../lib/fechas'
import { useOnline } from '../lib/useOnline'
import { useApiActualizada } from '../offline/useApiActualizada'
import { NotaGuardado } from '../components/offline/NotaGuardado'
import { formatoCoordenadas } from '../lib/mapa'

type Estado =
  | { kind: 'loading' }
  | { kind: 'ok'; reporte: Reporte; copia: Date | null; sinConexion: boolean }
  | { kind: 'error'; message: string; retry: boolean }

export function ReportDetail() {
  const { id = '' } = useParams()
  const [estado, setEstado] = useState<Estado>({ kind: 'loading' })
  const [intento, setIntento] = useState(0)
  const online = useOnline()
  useApiActualizada((ruta) => {
    if (ruta === `/api/reportes/${id}/`) setIntento((n) => n + 1)
  })

  useEffect(() => {
    const controller = new AbortController()
    fetchReporte(id, controller.signal).then(
      ({ data: reporte, guardado, sinConexion }) =>
        setEstado({ kind: 'ok', reporte, copia: guardado, sinConexion }),
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

        {estado.kind === 'ok' && (estado.sinConexion || (!online && estado.copia)) && (
          <NotaGuardado fecha={estado.copia} />
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

      {reporte.oculto ? (
        <div className="form-alert form-alert--info detail__oculto" role="note">
          <EyeOffIcon size={20} />
          <div>
            <p>
              <strong>Oculto: no aparece en el mapa ni en las listas.</strong>
            </p>
            <p className="form-alert__help">
              Lo revisó el equipo que atiende los reportes. Si te dejaron una nota, la ves abajo en el
              seguimiento.
            </p>
          </div>
        </div>
      ) : (
        <VoteButton key={reporte.id} reporte={reporte} />
      )}

      {reporte.foto_url && (
        <figure className="detail__photo">
          <img src={reporte.foto_url} alt={`Foto del reporte: ${reporte.categoria.nombre}`} />
        </figure>
      )}

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

      <Seguimiento reporte={reporte} />
    </article>
  )
}

function textoEvento(tipo: string, estado: string) {
  if (tipo === 'ocultar') return 'Se ocultó'
  if (tipo === 'mostrar') return 'Se volvió a mostrar'
  return `Pasó a «${estado}»`
}

/** Línea de tiempo: cada cambio con su fecha y su nota pública. Nunca quién ni el motivo. */
function Seguimiento({ reporte }: { reporte: Reporte }) {
  const eventos = [...(reporte.historial ?? [])].reverse()
  return (
    <section className="detail__seguimiento" aria-labelledby="seguimiento-titulo">
      <h2 id="seguimiento-titulo" className="list-head__title">
        Seguimiento
      </h2>
      <ol className="timeline">
        {eventos.map((e, i) => (
          <li key={`${e.fecha}-${i}`} className={`timeline__item timeline__item--${e.tipo}`}>
            <p className="timeline__head">
              <span className="timeline__que">{textoEvento(e.tipo, e.estado_nuevo_display)}</span>
              <time dateTime={e.fecha}>{fechaCompleta(e.fecha)}</time>
            </p>
            {e.nota_publica && <p className="timeline__nota">{e.nota_publica}</p>}
          </li>
        ))}
        <li className="timeline__item timeline__item--inicio">
          <p className="timeline__head">
            <span className="timeline__que">{reporte.es_mio ? 'Lo enviaste' : 'Se envió'}</span>
            <time dateTime={reporte.creado}>{fechaCompleta(reporte.creado)}</time>
          </p>
        </li>
      </ol>
    </section>
  )
}
