import { Link } from 'react-router'
import { ArrowLeftIcon } from './Icons'
import { EstadoConexion } from './offline/EstadoConexion'

type Props = {
  title: string
  back: { to: string; label: string }
  lead?: string
}

/** Encabezado de pantallas internas: franja del plano con "volver" y el título sobre papel. */
export function PageHeader({ title, back, lead }: Props) {
  return (
    <>
      <div className="page-bar">
        <Link to={back.to} className="page-bar__back">
          <ArrowLeftIcon size={20} />
          <span>{back.label}</span>
        </Link>
        <span className="page-bar__brand" aria-hidden="true">
          <img src="/logo.svg" alt="" width="28" height="28" />
          SpotIt
        </span>
      </div>
      <EstadoConexion />
      <header className="page-head">
        <h1 className="page-head__title">{title}</h1>
        {lead && <p className="page-head__lead">{lead}</p>}
      </header>
    </>
  )
}
