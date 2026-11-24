import { useEffect, useState } from 'react'
import { fetchHealth, HealthError, type Health } from '../api/health'

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; health: Health }
  | { kind: 'error'; message: string }

export function BackendStatus() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  // Cada reintento incrementa el contador y vuelve a disparar el efecto.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    fetchHealth(controller.signal).then(
      (health) => setState({ kind: 'ok', health }),
      (error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          kind: 'error',
          message: error instanceof HealthError ? error.message : 'Error inesperado.',
        })
      },
    )

    return () => controller.abort()
  }, [attempt])

  const retry = () => {
    setState({ kind: 'loading' })
    setAttempt((n) => n + 1)
  }

  return (
    <section
      className="status"
      data-state={state.kind}
      aria-live="polite"
      aria-busy={state.kind === 'loading'}
    >
      <span className="status__dot" aria-hidden="true" />
      <div className="status__body">
        {state.kind === 'loading' && <p className="status__title">Conectando con el servidor…</p>}

        {state.kind === 'ok' && (
          <>
            <p className="status__title">Servidor en línea</p>
            <p className="status__meta">API v{state.health.version} · base de datos OK</p>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <p className="status__title">Sin conexión con el servidor</p>
            <p className="status__meta">{state.message}</p>
          </>
        )}
      </div>

      {state.kind === 'error' && (
        <button type="button" className="button" onClick={retry}>
          Reintentar
        </button>
      )}
    </section>
  )
}
