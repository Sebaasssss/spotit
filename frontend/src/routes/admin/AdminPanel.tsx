import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { fetchResumen, type Resumen } from '../../api/admin'
import type { EstadoReporte } from '../../api/reportes'
import { FormAlert } from '../../components/form/fields'
import {
  CategoriaIcon,
  ChartIcon,
  ChevronRightIcon,
  CloudOffIcon,
  EyeOffIcon,
  ListIcon,
  RefreshIcon,
  VoteIcon,
} from '../../components/Icons'
import { PageHeader } from '../../components/PageHeader'
import { StatusPill } from '../../components/report/StatusPill'
import '../../map.css'
import './admin.css'
import { mensajeError } from './errores'

/** Marco del panel: franja, título y conmutador Resumen | Reportes. */
export function AdminPanel() {
  const { pathname } = useLocation()
  const enDetalle = /^\/admin-panel\/reportes\/\d+/.test(pathname)
  return (
    <div className="page admin">
      <PageHeader title="Panel" back={{ to: '/', label: 'Inicio' }} />
      {!enDetalle && (
        <nav className="admin__nav" aria-label="Secciones del panel">
          <div className="mapa__views">
            <NavLink to="/admin-panel" end className="mapa__view admin__tab">
              <ChartIcon size={20} />
              Resumen
            </NavLink>
            <NavLink to="/admin-panel/reportes" className="mapa__view admin__tab">
              <ListIcon size={20} />
              Reportes
            </NavLink>
          </div>
        </nav>
      )}
      <Outlet />
    </div>
  )
}

export function AvisoError({
  offline,
  message,
  onReintentar,
}: {
  offline: boolean
  message: string
  onReintentar?: () => void
}) {
  return (
    <FormAlert icon={offline ? <CloudOffIcon size={20} /> : undefined}>
      <p>{message}</p>
      {onReintentar && (
        <p className="form-alert__help">
          <button type="button" className="link-button" onClick={onReintentar}>
            <RefreshIcon size={18} /> Reintentar
          </button>
        </p>
      )}
    </FormAlert>
  )
}

const ESTADOS: { valor: EstadoReporte; nombre: string }[] = [
  { valor: 'recibido', nombre: 'Recibido' },
  { valor: 'en_proceso', nombre: 'En proceso' },
  { valor: 'resuelto', nombre: 'Resuelto' },
]

type Carga =
  | { kind: 'loading' }
  | { kind: 'ok'; resumen: Resumen }
  | { kind: 'error'; message: string; offline: boolean }

function reportes(n: number) {
  return n === 1 ? '1 reporte' : `${n.toLocaleString('es-MX')} reportes`
}

/** Portada del panel: estado general, categorías, más votados y ocultos. */
export function AdminResumen() {
  const [carga, setCarga] = useState<Carga>({ kind: 'loading' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchResumen(controller.signal).then(
      (resumen) => setCarga({ kind: 'ok', resumen }),
      (error: unknown) => {
        if (!controller.signal.aborted) setCarga({ kind: 'error', ...mensajeError(error, 'el resumen') })
      },
    )
    return () => controller.abort()
  }, [intento])

  return (
    <main className="admin__main">
      {carga.kind === 'loading' && (
        <div aria-busy="true">
          <p className="visually-hidden" role="status">
            Cargando el resumen…
          </p>
          <div className="admin-skeleton" aria-hidden="true">
            <span className="skeleton admin-skeleton__bar" />
            <span className="skeleton skeleton--line" />
            <span className="skeleton skeleton--line skeleton--short" />
          </div>
        </div>
      )}

      {carga.kind === 'error' && (
        <AvisoError
          {...carga}
          onReintentar={() => {
            setCarga({ kind: 'loading' })
            setIntento((n) => n + 1)
          }}
        />
      )}

      {carga.kind === 'ok' && <ContenidoResumen resumen={carga.resumen} />}
    </main>
  )
}

function ContenidoResumen({ resumen }: { resumen: Resumen }) {
  const { total, por_estado } = resumen
  const maxCategoria = Math.max(1, ...resumen.por_categoria.map((c) => c.total))

  if (total === 0 && resumen.ocultos === 0) {
    return (
      <section className="empty" aria-labelledby="sin-reportes">
        <h2 id="sin-reportes">Aún no hay reportes</h2>
        <p>Cuando los ciudadanos envíen reportes, aquí verás cuántos hay en cada estado.</p>
      </section>
    )
  }

  return (
    <>
      <section className="admin-block" aria-labelledby="estado-titulo">
        <div className="admin-block__head">
          <h2 id="estado-titulo" className="list-head__title">
            Estado general <span className="list-head__num">{reportes(total)}</span>
          </h2>
          <p className="admin-block__aside">
            {resumen.nuevos_7_dias === 1
              ? '1 nuevo en los últimos 7 días'
              : `${resumen.nuevos_7_dias} nuevos en los últimos 7 días`}
          </p>
        </div>

        {/* Barra proporcional: cada tramo con icono y número en su leyenda (nunca solo color). */}
        <div className="estado-barra" aria-hidden="true">
          {ESTADOS.map((e) =>
            por_estado[e.valor] > 0 ? (
              <span
                key={e.valor}
                className={`estado-barra__tramo estado-barra__tramo--${e.valor}`}
                style={{ flexGrow: por_estado[e.valor] }}
              />
            ) : null,
          )}
        </div>
        <ul className="estado-leyenda">
          {ESTADOS.map((e) => (
            <li key={e.valor}>
              <Link to={`/admin-panel/reportes?estado=${e.valor}&oculto=no`} className="estado-leyenda__link">
                <StatusPill estado={e.valor} />
                <span className="estado-leyenda__num">{por_estado[e.valor].toLocaleString('es-MX')}</span>
                <ChevronRightIcon size={18} className="estado-leyenda__chevron" />
              </Link>
            </li>
          ))}
          <li>
            <Link to="/admin-panel/reportes?oculto=si" className="estado-leyenda__link">
              <span className="status-pill status-pill--oculto">
                <EyeOffIcon size={16} />
                <span>Ocultos</span>
              </span>
              <span className="estado-leyenda__num">{resumen.ocultos.toLocaleString('es-MX')}</span>
              <ChevronRightIcon size={18} className="estado-leyenda__chevron" />
            </Link>
          </li>
        </ul>
      </section>

      <div className="admin-cols">
        <section className="admin-block" aria-labelledby="cat-titulo">
          <h2 id="cat-titulo" className="list-head__title">
            Por tipo de problema
          </h2>
          <table className="cat-tabla">
            <caption className="visually-hidden">Reportes visibles por tipo de problema</caption>
            <thead className="visually-hidden">
              <tr>
                <th scope="col">Tipo</th>
                <th scope="col">Reportes</th>
              </tr>
            </thead>
            <tbody>
              {resumen.por_categoria.map((c) => (
                <tr key={c.slug}>
                  <th scope="row">
                    <Link to={`/admin-panel/reportes?categoria=${c.slug}&oculto=no`} className="cat-tabla__link">
                      <CategoriaIcon icono={c.icono} size={20} />
                      {c.nombre}
                    </Link>
                  </th>
                  <td>
                    <span className="cat-tabla__barra" aria-hidden="true">
                      <span style={{ width: `${(c.total / maxCategoria) * 100}%` }} />
                    </span>
                    <span className="cat-tabla__num">{c.total.toLocaleString('es-MX')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="admin-block" aria-labelledby="votados-titulo">
          <h2 id="votados-titulo" className="list-head__title">
            Más votados
          </h2>
          {resumen.mas_votados.length === 0 ? (
            <p className="admin-block__vacio">Aún nadie ha votado un reporte.</p>
          ) : (
            <ol className="votados">
              {resumen.mas_votados.map((r) => (
                <li key={r.id}>
                  <Link to={`/admin-panel/reportes/${r.id}`} className="votados__link">
                    <span className="votados__votos">
                      <VoteIcon size={16} />
                      {r.votos}
                      <span className="visually-hidden">{r.votos === 1 ? ' voto' : ' votos'}</span>
                    </span>
                    <span className="votados__body">
                      <span className="votados__title">{r.categoria.nombre}</span>
                      <span className="votados__desc">{r.descripcion}</span>
                    </span>
                    <StatusPill estado={r.estado} />
                  </Link>
                </li>
              ))}
            </ol>
          )}
          <Link to="/admin-panel/reportes?orden=votos&oculto=no" className="link-button">
            Ver todos por votos
          </Link>
        </section>
      </div>
    </>
  )
}
