import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { ApiError, NetworkError } from '../api/client'
import { fetchMisReportes, fetchMisReportesConOrigen, type Reporte } from '../api/reportes'
import { NotaGuardado } from '../components/offline/NotaGuardado'
import { PendientesDeEnvio } from '../components/offline/Pendientes'
import { OfertaAvisos } from '../components/avisos/OfertaAvisos'
import { useOnline } from '../lib/useOnline'
import { useApiActualizada } from '../offline/useApiActualizada'
import { sincronizador } from '../offline/sincronizador'
import { useCola } from '../offline/useCola'
import { FormAlert } from '../components/form/fields'
import { CheckIcon, CloudOffIcon, CloudUpIcon, PlusIcon, RefreshIcon, Spinner } from '../components/Icons'
import { PageHeader } from '../components/PageHeader'
import { ReportRow } from '../components/report/ReportRow'

type Estado =
  | { kind: 'loading' }
  | {
      kind: 'ok'
      reportes: Reporte[]
      total: number
      siguiente: number | null
      copia: Date | null
      sinConexion: boolean
    }
  | { kind: 'error'; message: string; offline: boolean }

function mensajeDeError(error: unknown) {
  if (error instanceof NetworkError)
    return { message: 'Sin conexión: no pudimos cargar tus reportes.', offline: true }
  if (error instanceof ApiError) return { message: error.message, offline: false }
  return { message: 'No pudimos cargar tus reportes.', offline: false }
}

export function MyReports() {
  const location = useLocation()
  const navState = location.state as { nuevo?: number; guardado?: boolean } | null
  const nuevo = navState?.nuevo
  const guardado = navState?.guardado
  const online = useOnline()
  const { pendientes } = useCola()
  const [estado, setEstado] = useState<Estado>({ kind: 'loading' })
  const [intento, setIntento] = useState(0)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [errorMas, setErrorMas] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchMisReportesConOrigen(1, controller.signal).then(
      ({ data: pagina, guardado: copia, sinConexion }) =>
        setEstado({
          kind: 'ok',
          reportes: pagina.results,
          total: pagina.count,
          siguiente: pagina.next ? 2 : null,
          copia,
          sinConexion,
        }),
      (error: unknown) => {
        if (!controller.signal.aborted) setEstado({ kind: 'error', ...mensajeDeError(error) })
      },
    )
    return () => controller.abort()
  }, [intento])

  const cargarMas = async () => {
    if (estado.kind !== 'ok' || !estado.siguiente) return
    setCargandoMas(true)
    setErrorMas(null)
    try {
      const pagina = await fetchMisReportes(estado.siguiente)
      setEstado({
        ...estado,
        reportes: [...estado.reportes, ...pagina.results],
        total: pagina.count,
        siguiente: pagina.next ? estado.siguiente + 1 : null,
      })
    } catch (error) {
      setErrorMas(mensajeDeError(error).message)
    } finally {
      setCargandoMas(false)
    }
  }

  // La copia guardada se mostró al instante; si el servidor trae otra, se vuelve a pedir.
  // También cuando la cola termina de enviar: el reporte nuevo ya está en el servidor.
  useApiActualizada((ruta) => {
    if (ruta === '/api/reportes/mios/') setIntento((n) => n + 1)
  })
  // Si no se pudo cargar sin conexión, se vuelve a pedir al volver la señal.
  const [onlineAntes, setOnlineAntes] = useState(online)
  if (online !== onlineAntes) {
    setOnlineAntes(online)
    if (online && estado.kind === 'error') setIntento((n) => n + 1)
  }
  // Al entrar con conexión se reintenta ya lo que espera: si llegó y la respuesta se perdió,
  // la clave hace que el servidor devuelva el mismo reporte y sale de la cola.
  useEffect(() => {
    if (online) void sincronizador.sincronizar({ forzar: true })
  }, [online])
  const numPendientes = pendientes.length
  const [pendientesAntes, setPendientesAntes] = useState(numPendientes)
  if (numPendientes !== pendientesAntes) {
    setPendientesAntes(numPendientes)
    if (numPendientes < pendientesAntes) setIntento((n) => n + 1)
  }

  const reintentar = () => {
    setEstado({ kind: 'loading' })
    setIntento((n) => n + 1)
  }

  return (
    <div className="page">
      <PageHeader title="Mis reportes" back={{ to: '/', label: 'Inicio' }} />

      <main className="page__main">
        {nuevo && estado.kind === 'ok' && (
          <p className="success-note" role="status">
            <CheckIcon size={20} />
            Recibimos tu reporte. Aquí puedes seguir su estado.
          </p>
        )}
        {/* Recién enviado: el momento con sentido para ofrecer los avisos (una sola vez). */}
        {nuevo && estado.kind === 'ok' && <OfertaAvisos />}

        {guardado && pendientes.some((p) => p.estado !== 'error') && (
          <p className="saved-success" role="status">
            <CloudUpIcon size={20} />
            Tu reporte quedó guardado en este teléfono y se enviará solo; aquí ves cómo va.
          </p>
        )}

        <PendientesDeEnvio />

        {estado.kind === 'ok' && (estado.sinConexion || (!online && estado.copia)) && (
          <NotaGuardado fecha={estado.copia} />
        )}

        {estado.kind === 'loading' && (
          <div aria-busy="true">
            <p className="visually-hidden" role="status">
              Cargando tus reportes…
            </p>
            <ul className="report-list" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className="report-row report-row--skeleton">
                  <span className="skeleton skeleton--thumb" />
                  <span className="report-row__body">
                    <span className="skeleton skeleton--line" />
                    <span className="skeleton skeleton--line skeleton--short" />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {estado.kind === 'error' && estado.offline && !online && (
          // Sin conexión es un estado esperado, no un error: se recarga sola al volver la señal.
          <FormAlert tone="info" icon={<CloudOffIcon size={20} />}>
            Sin conexión. Tus reportes enviados aparecerán al volver la señal.
          </FormAlert>
        )}

        {estado.kind === 'error' && !(estado.offline && !online) && (
          <FormAlert icon={estado.offline ? <CloudOffIcon size={20} /> : undefined}>
            <p>{estado.message}</p>
            <p className="form-alert__help">
              <button type="button" className="link-button" onClick={reintentar}>
                <RefreshIcon size={18} /> Reintentar
              </button>
            </p>
          </FormAlert>
        )}

        {estado.kind === 'ok' && estado.reportes.length === 0 && pendientes.length === 0 && (
          <section className="empty" aria-labelledby="vacio-titulo">
            <h2 id="vacio-titulo">Aún no tienes reportes</h2>
            <p>Cuando veas un bache, una luminaria fundida o una fuga, repórtalo aquí.</p>
            <Link to="/reportes/nuevo" className="btn btn--primary btn--block">
              <PlusIcon size={20} />
              Haz tu primer reporte
            </Link>
          </section>
        )}

        {estado.kind === 'ok' && estado.reportes.length > 0 && (
          <>
            <div className="list-head">
              {pendientes.length > 0 ? (
                <h2 className="list-head__title">
                  Enviados <span className="list-head__num">{estado.total}</span>
                </h2>
              ) : (
                <p className="list-head__count">
                  {estado.total === 1 ? '1 reporte' : `${estado.total} reportes`}
                </p>
              )}
              <Link to="/reportes/nuevo" className="btn btn--secondary">
                <PlusIcon size={20} />
                Nuevo
              </Link>
            </div>
            <ul className="report-list">
              {estado.reportes.map((r) => (
                <ReportRow key={r.id} reporte={r} destacado={r.id === nuevo} />
              ))}
            </ul>
            {errorMas && <FormAlert>{errorMas}</FormAlert>}
            {estado.siguiente && (
              <button
                type="button"
                className="btn btn--secondary btn--block-secondary"
                onClick={() => void cargarMas()}
                disabled={cargandoMas}
              >
                {cargandoMas ? <Spinner size={20} /> : null}
                {cargandoMas ? 'Cargando…' : 'Cargar más'}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  )
}
