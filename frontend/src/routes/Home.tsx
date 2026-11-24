import { BackendStatus } from '../components/BackendStatus'

export function Home() {
  return (
    <main className="home">
      <header className="home__header">
        <img src="/logo.svg" alt="" width="56" height="56" className="home__logo" />
        <h1>SpotIt</h1>
        <p className="home__lead">
          Reporta baches, luminarias fundidas o fugas de agua y sigue cómo se resuelven.
        </p>
      </header>

      <BackendStatus />

      <p className="home__note">Versión de desarrollo · Fase 1</p>
    </main>
  )
}
