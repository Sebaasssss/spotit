import { CloudOffIcon } from '../Icons'

const formato = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

/** "Sin conexión: datos guardados el 25 nov, 10:40." Solo cuando lo que se ve es una copia. */
export function NotaGuardado({ fecha }: { fecha: Date | null }) {
  return (
    <p className="saved-note">
      <CloudOffIcon size={18} />
      <span>
        {fecha
          ? `Sin conexión: datos guardados el ${formato.format(fecha).replace(/\.$/, '')}.`
          : 'Sin conexión: datos guardados en este teléfono.'}
      </span>
    </p>
  )
}
