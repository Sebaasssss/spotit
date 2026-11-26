import { Navigate, Outlet, useLocation } from 'react-router'
import { Spinner } from '../components/Icons'
import { useAuth } from './context'

type FromState = { from?: string } | null

/** Pantalla mientras se comprueba la sesión (solo cuando no hay perfil guardado). */
export function Splash() {
  return (
    <div className="splash" role="status" aria-live="polite">
      <img src="/logo.svg" alt="" width="64" height="64" />
      <p>
        <Spinner size={18} /> Abriendo SpotIt…
      </p>
    </div>
  )
}

/** Rutas que exigen sesión. Sin sesión, manda a /entrar recordando a dónde ibas. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'checking') return <Splash />
  if (status === 'anonymous') {
    return <Navigate to="/entrar" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

/**
 * Panel de administración: un ciudadano no lo ve ni entrando por la URL (vuelve a Inicio).
 * La barrera real es la API, que responde 403 a quien no es administrador.
 */
export function RequireAdmin() {
  const { status, user } = useAuth()
  if (status === 'checking') return <Splash />
  if (status === 'anonymous') return <Navigate to="/entrar" replace />
  if (user?.rol !== 'administrador') return <Navigate to="/" replace />
  return <Outlet />
}

/** /entrar y /registro: con sesión iniciada no tienen sentido; vuelve a donde ibas. */
export function PublicOnly() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'checking') return <Splash />
  if (status === 'authenticated') {
    const from = (location.state as FromState)?.from
    return <Navigate to={from && from.startsWith('/') ? from : '/'} replace />
  }
  return <Outlet />
}
