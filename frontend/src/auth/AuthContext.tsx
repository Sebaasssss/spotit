import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NetworkError } from '../api/client'
import * as session from './session'
import { AuthContext, type AuthContextValue, type AuthState } from './context'

function initialState(): AuthState {
  // Con perfil guardado la app entra de inmediato (también sin conexión);
  // la renovación del token ocurre en segundo plano.
  const cached = session.profileCache.load()
  return cached
    ? { status: 'authenticated', user: cached, offline: false }
    : { status: 'checking', user: null, offline: false }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState)

  // Cambios de sesión: login, registro, logout o sesión caducada.
  useEffect(
    () =>
      session.onSessionChange((user, reason) =>
        setState(
          user
            ? { status: 'authenticated', user, offline: false }
            : { status: 'anonymous', user: null, offline: false, reason },
        ),
      ),
    [],
  )

  // Arranque y reconexión: renovar el access token con la cookie.
  useEffect(() => {
    let cancelled = false

    const renew = () =>
      session.refreshSession().then(
        (result) => {
          // Sin sesión válida: clearLocalSession ya avisó (con su motivo) si había una guardada.
          if (!cancelled && !result) {
            setState((prev) =>
              prev.status === 'anonymous' ? prev : { status: 'anonymous', user: null, offline: false },
            )
          }
        },
        (error: unknown) => {
          if (cancelled) return
          const offline = error instanceof NetworkError
          setState((prev) =>
            prev.user
              ? { ...prev, offline } // conserva la sesión guardada
              : { status: 'anonymous', user: null, offline },
          )
        },
      )

    void renew()

    const onOnline = () => void renew()
    // Si otra pestaña cierra la sesión, esta también.
    const onStorage = (event: StorageEvent) => {
      if (event.key === session.PROFILE_KEY && event.newValue === null) {
        session.clearLocalSession('logout')
      }
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('storage', onStorage)
    return () => {
      cancelled = true
      window.removeEventListener('online', onOnline)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login: session.login,
      register: session.register,
      logout: session.logout,
    }),
    [state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
