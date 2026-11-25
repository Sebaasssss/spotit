import { useState } from 'react'
import { useAuth } from '../auth/context'
import { BackendStatus } from '../components/BackendStatus'
import { Link } from 'react-router'
import {
  ChevronRightIcon,
  CloudOffIcon,
  ListIcon,
  LogOutIcon,
  MapIcon,
  PlusIcon,
  Spinner,
} from '../components/Icons'
import { MapBand } from '../components/MapBand'
import { useOnline } from '../lib/useOnline'

const ROLE_LABEL = { ciudadano: 'Ciudadano', administrador: 'Administrador' } as const

export function Home() {
  const { user, offline, logout } = useAuth()
  const [leaving, setLeaving] = useState(false)
  const online = useOnline()
  const showOffline = offline || !online

  if (!user) return null
  const firstName = user.nombre.split(' ')[0] || user.nombre

  const onLogout = async () => {
    setLeaving(true)
    // Al cerrar la sesión, <RequireAuth> lleva a /entrar, que muestra el motivo.
    await logout()
  }

  return (
    <div className="home">
      <header className="home__field">
        <MapBand className="map-band--compact" />
        <div className="home__bar">
          <div className="auth__brand">
            <img src="/logo.svg" alt="" width="32" height="32" />
            <span>SpotIt</span>
          </div>
          <button
            type="button"
            className="btn btn--on-field"
            onClick={() => void onLogout()}
            disabled={leaving}
          >
            {leaving ? <Spinner size={18} /> : <LogOutIcon size={18} />}
            <span>{leaving ? 'Saliendo…' : 'Salir'}</span>
          </button>
        </div>
        <div className="home__greeting">
          <h1>Hola, {firstName}</h1>
          <p className="home__role">{ROLE_LABEL[user.rol]}</p>
        </div>
      </header>

      <main className="home__main">
        {showOffline && (
          <p className="offline-pill" role="status">
            <CloudOffIcon size={18} />
            Sin conexión. Tu sesión sigue guardada en este dispositivo.
          </p>
        )}

        <nav className="home__actions" aria-label="Acciones principales">
          {user.rol === 'ciudadano' && (
            <Link to="/reportes/nuevo" className="action action--primary">
              <span className="action__icon">
                <PlusIcon size={26} />
              </span>
              <span className="action__text">
                <span className="action__title">Nuevo reporte</span>
                <span className="action__desc">Foto, tipo de problema y lugar.</span>
              </span>
              <ChevronRightIcon size={22} className="action__chevron" />
            </Link>
          )}
          <Link to="/mapa" className="action">
            <span className="action__icon">
              <MapIcon size={24} />
            </span>
            <span className="action__text">
              <span className="action__title">Mapa de reportes</span>
              <span className="action__desc">Mira qué se reportó y vota lo que te afecta.</span>
            </span>
            <ChevronRightIcon size={22} className="action__chevron" />
          </Link>
          <Link to="/reportes" className="action">
            <span className="action__icon">
              <ListIcon size={24} />
            </span>
            <span className="action__text">
              <span className="action__title">Mis reportes</span>
              <span className="action__desc">Sigue en qué estado están.</span>
            </span>
            <ChevronRightIcon size={22} className="action__chevron" />
          </Link>
        </nav>

        <dl className="account">
          <div>
            <dt>Cuenta</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Nombre</dt>
            <dd>{user.nombre}</dd>
          </div>
        </dl>

        {/* Sin red el aviso de arriba ya lo explica; no repetirlo en rojo. */}
        {/* Diagnóstico técnico: solo en desarrollo o para administradores. */}
        {!showOffline && (import.meta.env.DEV || user.rol === 'administrador') && <BackendStatus />}
      </main>
    </div>
  )
}
