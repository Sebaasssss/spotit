import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { ApiError, NetworkError } from '../api/client'
import { fetchMisReportes, type Reporte } from '../api/reportes'
import { FormAlert } from '../components/form/fields'
import { CheckIcon, CloudOffIcon, PlusIcon, RefreshIcon, Spinner } from '../components/Icons'
import { PageHeader } from '../components/PageHeader'
import { ReportRow } from '../components/report/ReportRow'

type Estado =
  | { kind: 'loading' }
  | { kind: 'ok'; reportes: Reporte[]; total: number; siguiente: number | null }
  | { kind: 'error'; message: string; offline: boolean }

function mensajeDeError(error: unknown) {
  if (error instanceof NetworkError)
    return { message: 'Sin conexión: no pudimos cargar tus reportes.', offline: true }
  if (error instanceof ApiError) return { message: error.message, offline: false }
  return { message: 'No pudimos cargar tus reportes.', offline: false }
}

export function MyReports() {
  const location = useLocation()
  const nuevo = (location.state as { nuevo?: number } | null)?.nuevo
  const [estado, setEstado] = useState<Estado>({ kind: 'loading' })
  const [intento, setIntento] = useState(0)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [errorMas, setErrorMas] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchMisReportes(1, controller.signal).then(
      (pagina) =>
        setEstado({
          kind: 'ok',
          reportes: pagina.results,
          total: pagina.count,
          siguiente: pagina.next ? 2 : null,
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
        kind: 'ok',
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

        {estado.kind === 'error' && (
          <FormAlert icon={estado.offline ? <CloudOffIcon size={20} /> : undefined}>
            <p>{estado.message}</p>
            <p className="form-alert__help">
              <button type="button" className="link-button" onClick={reintentar}>
                <RefreshIcon size={18} /> Reintentar
              </button>
            </p>
          </FormAlert>
        )}

        {estado.kind === 'ok' && estado.reportes.length === 0 && (
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
              <p className="list-head__count">
                {estado.total === 1 ? '1 reporte' : `${estado.total} reportes`}
              </p>
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
