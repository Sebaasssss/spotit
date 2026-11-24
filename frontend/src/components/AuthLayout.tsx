import type { ReactNode } from 'react'
import { MapBand } from './MapBand'

type Props = {
  title: string
  lead: string
  children: ReactNode
  footer?: ReactNode
}

/** Plantilla de entrada: el plano verde con el punto y, sobre papel, el formulario. */
export function AuthLayout({ title, lead, children, footer }: Props) {
  return (
    <div className="auth">
      <header className="auth__field">
        <MapBand />
        <div className="auth__brand">
          <img src="/logo.svg" alt="" width="36" height="36" />
          <span>SpotIt</span>
        </div>
        <p className="auth__claim">Marca lo que está mal en tu entorno y sigue cómo se arregla.</p>
      </header>

      <main className="auth__main">
        <div className="auth__content">
          <h1 className="auth__title">{title}</h1>
          <p className="auth__lead">{lead}</p>
          {children}
          {footer && <div className="auth__footer">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
