import { Link } from 'react-router'
import type { Reporte } from '../../api/reportes'
import { haceCuanto } from '../../lib/fechas'
import { ChevronRightIcon, EyeOffIcon } from '../Icons'
import { StatusPill } from './StatusPill'

export function ReportRow({ reporte, destacado = false }: { reporte: Reporte; destacado?: boolean }) {
  return (
    <li className={`report-row ${destacado ? 'report-row--new' : ''}`}>
      <Link to={`/reportes/${reporte.id}`} className="report-row__link">
        {reporte.oculto ? (
          // Oculto: su foto no se entrega fuera del panel.
          <span className="report-row__thumb report-row__thumb--oculto" aria-hidden="true">
            <EyeOffIcon size={28} />
          </span>
        ) : (
          <img
            className="report-row__thumb"
            src={reporte.miniatura_url}
            alt=""
            width="72"
            height="72"
            loading="lazy"
            decoding="async"
          />
        )}
        <span className="report-row__body">
          <span className="report-row__title">{reporte.categoria.nombre}</span>
          <span className="report-row__desc">{reporte.descripcion}</span>
          <span className="report-row__meta">
            <StatusPill estado={reporte.estado} />
            {reporte.oculto && (
              <span className="status-pill status-pill--oculto">
                <EyeOffIcon size={16} />
                <span>Oculto</span>
              </span>
            )}
            <time dateTime={reporte.creado}>{haceCuanto(reporte.creado)}</time>
          </span>
        </span>
        <ChevronRightIcon className="report-row__chevron" size={20} />
      </Link>
    </li>
  )
}
