import type { EstadoReporte } from '../../api/reportes'
import { CheckIcon, InboxIcon, WrenchIcon } from '../Icons'

const ESTADOS: Record<EstadoReporte, { label: string; Icono: typeof CheckIcon }> = {
  recibido: { label: 'Recibido', Icono: InboxIcon },
  en_proceso: { label: 'En proceso', Icono: WrenchIcon },
  resuelto: { label: 'Resuelto', Icono: CheckIcon },
}

/** Estado con icono y texto: el color nunca es la única señal. */
export function StatusPill({ estado }: { estado: EstadoReporte }) {
  const { label, Icono } = ESTADOS[estado] ?? ESTADOS.recibido
  return (
    <span className={`status-pill status-pill--${estado}`}>
      <Icono size={16} />
      <span>
        <span className="visually-hidden">Estado: </span>
        {label}
      </span>
    </span>
  )
}
