import { useEffect, useRef } from 'react'
import { CloudUpIcon, Spinner, TrashIcon } from '../Icons'

type Props = {
  abierto: boolean
  pendientes: number
  saliendo: 'guardar' | 'borrar' | null
  onGuardar: () => void
  onBorrar: () => void
  onCancelar: () => void
}

/**
 * Cerrar sesión con reportes sin enviar: se guardan (por defecto) y se envían al volver
 * a entrar, o se borran del teléfono (teléfono compartido). Diálogo modal nativo: foco
 * atrapado, Escape cancela y el foco vuelve al botón "Salir".
 */
export function DialogoSalir({ abierto, pendientes, saliendo, onGuardar, onBorrar, onCancelar }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (abierto && !dialogo.open) dialogo.showModal()
    if (!abierto && dialogo.open) dialogo.close()
  }, [abierto])

  const n = pendientes === 1 ? '1 reporte' : `${pendientes} reportes`
  const ocupado = saliendo !== null

  return (
    <dialog
      ref={ref}
      className="dialogo"
      aria-labelledby="salir-titulo"
      aria-describedby="salir-texto"
      onCancel={(e) => {
        e.preventDefault()
        if (!ocupado) onCancelar()
      }}
    >
      <h2 id="salir-titulo" className="dialogo__title">
        Tienes {n} sin enviar
      </h2>
      <p id="salir-texto" className="dialogo__text">
        {pendientes === 1
          ? 'Si lo guardas, se queda en este teléfono y se envía cuando vuelvas a entrar con tu cuenta. Si compartes el teléfono con otras personas, mejor bórralo.'
          : 'Si los guardas, se quedan en este teléfono y se envían cuando vuelvas a entrar con tu cuenta. Si compartes el teléfono con otras personas, mejor bórralos.'}
      </p>
      <div className="dialogo__actions">
        {/* autoFocus: la opción segura es la que recibe el foco al abrir. */}
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={onGuardar}
          disabled={ocupado}
          autoFocus
        >
          {saliendo === 'guardar' ? <Spinner size={20} /> : <CloudUpIcon size={20} />}
          {saliendo === 'guardar' ? 'Saliendo…' : 'Guardarlos y salir'}
        </button>
        <button type="button" className="btn btn--danger btn--block" onClick={onBorrar} disabled={ocupado}>
          {saliendo === 'borrar' ? <Spinner size={20} /> : <TrashIcon size={20} />}
          {saliendo === 'borrar' ? 'Borrando…' : 'Borrarlos y salir'}
        </button>
        <button type="button" className="link-button" onClick={onCancelar} disabled={ocupado}>
          Cancelar, seguir aquí
        </button>
      </div>
    </dialog>
  )
}
