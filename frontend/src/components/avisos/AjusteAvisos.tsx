import { useId } from 'react'
import { Link } from 'react-router'
import { useAvisos, type MensajeAvisos } from '../../push/useAvisos'
import { AlertIcon, BellIcon, BellOffIcon, CheckIcon, Spinner } from '../Icons'

/** Resultado de una acción: éxito en tinta con check; error en rojo con icono y alerta. */
export function MensajeAviso({ mensaje }: { mensaje: MensajeAvisos }) {
  return mensaje.tono === 'error' ? (
    <p className="field__error ajuste__mensaje" role="alert">
      <AlertIcon size={18} />
      <span>{mensaje.texto}</span>
    </p>
  ) : (
    <p className="ajuste__mensaje ajuste__mensaje--ok">
      <CheckIcon size={18} />
      <span>{mensaje.texto}</span>
    </p>
  )
}

/**
 * "Avisos en este teléfono": el ajuste siempre visible (portada, bajo Cuenta). Un interruptor
 * por dispositivo; si el navegador no puede o el permiso está bloqueado, lo explica.
 */
export function AjusteAvisos() {
  const { estado, ocupado, mensaje, activar, desactivar } = useAvisos()
  const id = useId()

  if (estado.kind === 'apagado' || estado.kind === 'cargando') return null

  const activo = estado.kind === 'listo' && estado.activo
  const puede = estado.kind === 'listo'

  let ayuda: string
  switch (estado.kind) {
    case 'listo':
      ayuda = activo
        ? 'Te avisamos aquí cuando cambie el estado de tus reportes o te dejen una nota.'
        : 'Actívalos para saber cuándo cambia el estado de tus reportes.'
      break
    case 'bloqueado':
      ayuda =
        'Los avisos están bloqueados para SpotIt en este navegador. Para activarlos, permite las notificaciones de este sitio en la configuración del navegador y vuelve aquí.'
      break
    case 'ios-sin-instalar':
      ayuda = 'En iPhone los avisos solo funcionan con SpotIt en la pantalla de inicio.'
      break
    case 'ios-viejo':
      ayuda = 'Tu iPhone necesita iOS 16.4 o superior para recibir avisos.'
      break
    case 'sin-soporte':
      ayuda = 'Este navegador no puede recibir avisos.'
      break
    case 'sin-conexion':
      ayuda = 'Sin conexión: podrás cambiar los avisos cuando vuelva la señal.'
      break
  }

  return (
    <section className="ajuste" aria-labelledby={`${id}-titulo`}>
      <div className="ajuste__fila">
        <span className="ajuste__icono" aria-hidden="true">
          {activo ? <BellIcon size={22} /> : <BellOffIcon size={22} />}
        </span>
        <div className="ajuste__texto">
          <h2 id={`${id}-titulo`} className="ajuste__titulo">
            Avisos en este teléfono
          </h2>
          <p id={`${id}-ayuda`} className="ajuste__ayuda">
            {ayuda}
          </p>
          {estado.kind === 'ios-sin-instalar' && (
            <Link to="/instalar" className="link-button">
              Cómo instalarla
            </Link>
          )}
          {/* Lo anuncia la región viva global; aquí queda escrito para quien lo vea. */}
          {mensaje && <MensajeAviso mensaje={mensaje} />}
        </div>
        {puede && (
          <button
            type="button"
            role="switch"
            className="interruptor"
            aria-checked={activo}
            aria-labelledby={`${id}-titulo`}
            aria-describedby={`${id}-ayuda`}
            // aria-disabled y no disabled: el foco se queda en el control mientras trabaja.
            aria-disabled={ocupado || undefined}
            aria-busy={ocupado || undefined}
            onClick={() => void (activo ? desactivar() : activar())}
          >
            <span className="interruptor__pista" aria-hidden="true">
              <span className="interruptor__perilla">{ocupado && <Spinner size={14} />}</span>
            </span>
            <span className="interruptor__estado" aria-hidden="true">
              {activo ? 'Sí' : 'No'}
            </span>
          </button>
        )}
      </div>
    </section>
  )
}
