import { Link, useLocation } from 'react-router'
import { useAuth } from '../../auth/context'
import { useOnline } from '../../lib/useOnline'
import { sincronizador } from '../../offline/sincronizador'
import { useCola } from '../../offline/useCola'
import { AlertIcon, CloudOffIcon, CloudUpIcon, Spinner } from '../Icons'

function reportes(n: number) {
  return n === 1 ? '1 reporte' : `${n} reportes`
}

/**
 * Franja de estado bajo la banda del plano, en todas las pantallas con sesión: sin conexión,
 * enviando, pendientes por enviar o con error. Se oculta cuando no hay nada que decir.
 * No es región viva: los cambios los anuncia <Anuncios /> una sola vez.
 */
export function EstadoConexion() {
  const online = useOnline()
  const { offline: sinRenovar } = useAuth()
  const { pendientes, enviando } = useCola()
  const { pathname } = useLocation()
  const enMisReportes = pathname === '/reportes'

  const sinConexion = !online || sinRenovar
  const porEnviar = pendientes.filter((p) => p.estado !== 'error').length
  const conError = pendientes.length - porEnviar

  const ver = (texto: string) =>
    enMisReportes ? null : (
      <Link to="/reportes" className="conn__action">
        {texto}
      </Link>
    )

  let tono: 'info' | 'error' = 'info'
  let icono = <CloudUpIcon size={20} />
  let texto: string
  let accion: React.ReactNode = null

  if (enviando) {
    icono = <Spinner size={20} />
    texto = `Enviando un reporte pendiente… ${Math.round(enviando.progreso * 100)} %`
  } else if (sinConexion) {
    icono = <CloudOffIcon size={20} />
    texto = porEnviar
      ? `Sin conexión · ${reportes(porEnviar)} por enviar`
      : pathname === '/'
        ? 'Sin conexión. Tu sesión sigue guardada en este teléfono.'
        : 'Sin conexión.' // cada pantalla dice de cuándo es lo que muestra
    if (porEnviar) accion = ver('Ver')
  } else if (conError) {
    tono = 'error'
    icono = <AlertIcon size={20} />
    texto =
      conError === 1 ? '1 reporte no se pudo enviar.' : `${conError} reportes no se pudieron enviar.`
    accion = ver('Revisar')
  } else if (porEnviar) {
    texto = `${reportes(porEnviar)} por enviar`
    // En Mis reportes la sección ya tiene su propio "Enviar ahora".
    accion = enMisReportes ? null : (
      <button
        type="button"
        className="conn__action"
        onClick={() => void sincronizador.sincronizar({ forzar: true })}
      >
        Enviar ahora
      </button>
    )
  } else {
    return null
  }

  return (
    <div className={`conn conn--${tono}`}>
      <div className="conn__inner">
        <span className="conn__icon">{icono}</span>
        <p className="conn__text">{texto}</p>
        {accion}
      </div>
    </div>
  )
}
