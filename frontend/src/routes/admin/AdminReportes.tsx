import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import {
  fetchReportesAdmin,
  type FiltrosAdmin,
  type OcultoFiltro,
  type OrdenAdmin,
  type ReporteAdmin,
} from '../../api/admin'
import type { Pagina } from '../../api/reportes'
import { fetchCategorias, type Categoria, type EstadoReporte } from '../../api/reportes'
import {
  CategoriaIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  FilterIcon,
  InboxIcon,
  Spinner,
  VoteIcon,
  WrenchIcon,
} from '../../components/Icons'
import { StatusPill } from '../../components/report/StatusPill'
import { haceCuanto } from '../../lib/fechas'
import { AvisoError } from './AdminPanel'
import { mensajeError } from './errores'

const ESTADOS: { valor: EstadoReporte; nombre: string }[] = [
  { valor: 'recibido', nombre: 'Recibido' },
  { valor: 'en_proceso', nombre: 'En proceso' },
  { valor: 'resuelto', nombre: 'Resuelto' },
]
const ICONO_ESTADO = { recibido: InboxIcon, en_proceso: WrenchIcon, resuelto: CheckIcon } as const

const OCULTOS: { valor: OcultoFiltro; nombre: string }[] = [
  { valor: 'todos', nombre: 'Todos' },
  { valor: 'no', nombre: 'Visibles' },
  { valor: 'si', nombre: 'Ocultos' },
]
const ORDENES: { valor: OrdenAdmin; nombre: string }[] = [
  { valor: 'recientes', nombre: 'Más recientes' },
  { valor: 'antiguos', nombre: 'Más antiguos' },
  { valor: 'votos', nombre: 'Más votados' },
]
const POR_PAGINA = 25

const lista = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])
const fecha = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })

function leerFiltros(p: URLSearchParams): FiltrosAdmin {
  const oculto = p.get('oculto')
  const orden = p.get('orden')
  return {
    estados: lista(p.get('estado')).filter((e): e is EstadoReporte =>
      ESTADOS.some((x) => x.valor === e),
    ),
    categorias: lista(p.get('categoria')),
    desde: p.get('desde') ?? '',
    hasta: p.get('hasta') ?? '',
    votosMin: p.get('votos_min') ?? '',
    q: p.get('q') ?? '',
    oculto: oculto === 'si' || oculto === 'no' ? oculto : 'todos',
    orden: orden === 'antiguos' || orden === 'votos' ? orden : 'recientes',
  }
}

function cuantosFiltros(f: FiltrosAdmin) {
  return (
    f.estados.length +
    f.categorias.length +
    (f.desde ? 1 : 0) +
    (f.hasta ? 1 : 0) +
    (f.votosMin ? 1 : 0) +
    (f.q ? 1 : 0) +
    (f.oculto !== 'todos' ? 1 : 0)
  )
}

type Carga =
  | { kind: 'loading' }
  | { kind: 'ok'; pagina: Pagina<ReporteAdmin>; clave: string }
  | { kind: 'error'; message: string; offline: boolean; clave: string }

export function AdminReportes() {
  const [params, setParams] = useSearchParams()
  const filtros = useMemo(() => leerFiltros(params), [params])
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [cats, setCats] = useState<Categoria[]>([])
  const [carga, setCarga] = useState<Carga>({ kind: 'loading' })
  const [intento, setIntento] = useState(0)
  const [abiertos, setAbiertos] = useState(false)
  const panelId = useId()
  const botonFiltros = useRef<HTMLButtonElement>(null)

  const actualizar = useCallback(
    (cambios: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const sig = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(cambios)) {
            if (v) sig.set(k, v)
            else sig.delete(k)
          }
          if (!('page' in cambios)) sig.delete('page') // otro filtro: vuelve a la primera página
          return sig
        },
        { replace: true },
      )
    },
    [setParams],
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchCategorias(controller.signal).then(setCats, () => {})
    return () => controller.abort()
  }, [])

  const clave = `${params.toString()}|${intento}`
  const actualizando = carga.kind === 'loading' || carga.clave !== clave
  useEffect(() => {
    const controller = new AbortController()
    fetchReportesAdmin(filtros, page, controller.signal).then(
      (pagina) => setCarga({ kind: 'ok', pagina, clave }),
      (error: unknown) => {
        if (!controller.signal.aborted)
          setCarga({ kind: 'error', ...mensajeError(error, 'los reportes'), clave })
      },
    )
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `clave` resume filtros, página e intento
  }, [clave])

  const alternar = (campo: 'estado' | 'categoria', valor: string) => {
    const actual = campo === 'estado' ? (filtros.estados as string[]) : filtros.categorias
    const sig = actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor]
    actualizar({ [campo]: sig.join(',') || null })
  }

  const buscar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const q = new FormData(event.currentTarget).get('q')
    actualizar({ q: typeof q === 'string' && q.trim() ? q.trim() : null })
  }

  const n = cuantosFiltros(filtros)
  const quitar = () =>
    setParams(filtros.orden !== 'recientes' ? { orden: filtros.orden } : {}, { replace: true })

  const total = carga.kind === 'ok' ? carga.pagina.count : null
  const paginas = total ? Math.ceil(total / POR_PAGINA) : 1

  return (
    <main className="admin__main admin-lista">
      <div className="admin-lista__bar">
        <form className="admin-buscar" role="search" onSubmit={buscar}>
          <label htmlFor="admin-q" className="visually-hidden">
            Buscar en la descripción
          </label>
          <input
            id="admin-q"
            name="q"
            type="search"
            className="field__input"
            placeholder="Buscar en la descripción"
            defaultValue={filtros.q}
            key={filtros.q}
            maxLength={100}
          />
          <button type="submit" className="btn btn--secondary">
            Buscar
          </button>
        </form>
        <button
          ref={botonFiltros}
          type="button"
          className={`btn mapa__filter-btn admin-lista__filtros-btn ${n > 0 ? 'is-active' : ''}`}
          aria-expanded={abiertos}
          aria-controls={panelId}
          onClick={() => setAbiertos((v) => !v)}
        >
          <FilterIcon size={20} />
          <span>Filtros</span>
          {n > 0 && (
            <span className="mapa__filter-count">
              {n}
              <span className="visually-hidden"> activos</span>
            </span>
          )}
        </button>
      </div>

      <div className="admin-lista__cuerpo">
        <aside
          id={panelId}
          className={`admin-filtros ${abiertos ? 'is-open' : ''}`}
          aria-label="Filtros de reportes"
        >
          <div className="filter-group" role="group" aria-labelledby={`${panelId}-estado`}>
            <h2 id={`${panelId}-estado`} className="filter-group__title">
              Estado
            </h2>
            <div className="filter-group__options">
              {ESTADOS.map((e) => (
                <button
                  key={e.valor}
                  type="button"
                  className="filter-chip"
                  aria-pressed={filtros.estados.includes(e.valor)}
                  onClick={() => alternar('estado', e.valor)}
                >
                  <EstadoChapa estado={e.valor} />
                  {e.nombre}
                  {filtros.estados.includes(e.valor) && <CheckIcon size={18} className="filter-chip__check" />}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group" role="group" aria-labelledby={`${panelId}-visib`}>
            <h2 id={`${panelId}-visib`} className="filter-group__title">
              Visibilidad
            </h2>
            <div className="filter-group__options">
              {OCULTOS.map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  className="filter-chip"
                  aria-pressed={filtros.oculto === o.valor}
                  onClick={() => actualizar({ oculto: o.valor === 'todos' ? null : o.valor })}
                >
                  {o.valor === 'si' && <EyeOffIcon size={20} />}
                  {o.valor === 'no' && <EyeIcon size={20} />}
                  {o.nombre}
                  {filtros.oculto === o.valor && <CheckIcon size={18} className="filter-chip__check" />}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group" role="group" aria-labelledby={`${panelId}-cat`}>
            <h2 id={`${panelId}-cat`} className="filter-group__title">
              Tipo de problema
            </h2>
            <div className="filter-group__options">
              {cats.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  className="filter-chip"
                  aria-pressed={filtros.categorias.includes(c.slug)}
                  onClick={() => alternar('categoria', c.slug)}
                >
                  <CategoriaIcon icono={c.icono} size={20} />
                  {c.nombre}
                  {filtros.categorias.includes(c.slug) && <CheckIcon size={18} className="filter-chip__check" />}
                </button>
              ))}
              {cats.length === 0 && <p className="filter-group__hint">Cargando los tipos…</p>}
            </div>
          </div>

          <div className="filter-group admin-filtros__campos">
            <div className="field">
              <label className="field__label" htmlFor="admin-desde">
                Enviado desde
              </label>
              <input
                id="admin-desde"
                type="date"
                className="field__input"
                value={filtros.desde}
                max={filtros.hasta || undefined}
                onChange={(e) => actualizar({ desde: e.target.value || null })}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="admin-hasta">
                Hasta
              </label>
              <input
                id="admin-hasta"
                type="date"
                className="field__input"
                value={filtros.hasta}
                min={filtros.desde || undefined}
                onChange={(e) => actualizar({ hasta: e.target.value || null })}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="admin-votos">
                Votos mínimos
              </label>
              <input
                id="admin-votos"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                className="field__input"
                value={filtros.votosMin}
                onChange={(e) =>
                  actualizar({ votos_min: /^\d+$/.test(e.target.value) ? e.target.value : null })
                }
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="admin-orden">
                Ordenar por
              </label>
              <select
                id="admin-orden"
                className="field__input"
                value={filtros.orden}
                onChange={(e) => actualizar({ orden: e.target.value === 'recientes' ? null : e.target.value })}
              >
                {ORDENES.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pie: en escritorio solo "Quitar filtros"; en móvil, además, el resultado y cerrar. */}
          <div className="mapa__filters-foot admin-filtros__pie">
            <p className="mapa__filters-hint admin-filtros__solo-movil">
              {n > 0 ? (n === 1 ? '1 filtro activo.' : `${n} filtros activos.`) : 'Sin filtros ves todos los reportes.'}
            </p>
            {n > 0 && (
              <button type="button" className="link-button" onClick={quitar}>
                Quitar filtros
              </button>
            )}
            <button
              type="button"
              className="btn btn--secondary admin-filtros__solo-movil"
              onClick={() => {
                setAbiertos(false)
                botonFiltros.current?.focus()
              }}
            >
              {total === null || actualizando
                ? 'Ver reportes'
                : total === 1
                  ? 'Ver 1 reporte'
                  : `Ver ${total.toLocaleString('es-MX')} reportes`}
            </button>
          </div>
        </aside>

        <section className="admin-resultados" aria-labelledby="resultados-titulo" aria-busy={actualizando}>
          <div className="list-head">
            <h2 id="resultados-titulo" className="list-head__title">
              Reportes{' '}
              {total !== null && <span className="list-head__num">{total.toLocaleString('es-MX')}</span>}
            </h2>
            {actualizando && carga.kind !== 'loading' && (
              <span className="admin-resultados__cargando">
                <Spinner size={18} /> Actualizando…
              </span>
            )}
          </div>

          {carga.kind === 'loading' && (
            <div aria-busy="true">
              <p className="visually-hidden" role="status">
                Cargando los reportes…
              </p>
              <ul className="report-list" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="report-row report-row--skeleton">
                    <span className="skeleton skeleton--thumb" />
                    <span className="report-row__body">
                      <span className="skeleton skeleton--line" />
                      <span className="skeleton skeleton--line skeleton--short" />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {carga.kind === 'error' && (
            <AvisoError
              offline={carga.offline}
              message={carga.message}
              onReintentar={() => setIntento((x) => x + 1)}
            />
          )}

          {carga.kind === 'ok' && carga.pagina.results.length === 0 && (
            <div className="empty admin-vacio">
              <h3>
                {filtros.q
                  ? `Nada coincide con «${filtros.q}»`
                  : n > 0
                    ? 'Ningún reporte con estos filtros'
                    : 'Aún no hay reportes'}
              </h3>
              {n > 0 && (
                <>
                  <p>Prueba con otra palabra o quita los filtros.</p>
                  <button type="button" className="link-button" onClick={quitar}>
                    {filtros.q ? 'Quitar búsqueda y filtros' : 'Quitar filtros'}
                  </button>
                </>
              )}
            </div>
          )}

          {carga.kind === 'ok' && carga.pagina.results.length > 0 && (
            <>
              <table className="admin-tabla">
                <caption className="visually-hidden">
                  Reportes, página {page} de {paginas}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Reporte</th>
                    <th scope="col">Estado</th>
                    <th scope="col" className="admin-tabla__num">
                      Votos
                    </th>
                    <th scope="col">Enviado</th>
                  </tr>
                </thead>
                <tbody>
                  {carga.pagina.results.map((r) => (
                    <Fila key={r.id} r={r} />
                  ))}
                </tbody>
              </table>

              {paginas > 1 && (
                <nav className="admin-paginas" aria-label="Páginas">
                  <button
                    type="button"
                    className="btn btn--secondary"
                    disabled={page <= 1}
                    onClick={() => actualizar({ page: page > 2 ? String(page - 1) : null })}
                  >
                    Anterior
                  </button>
                  <span>
                    Página {page} de {paginas}
                  </span>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    disabled={page >= paginas}
                    onClick={() => actualizar({ page: String(page + 1) })}
                  >
                    Siguiente
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}

function Fila({ r }: { r: ReporteAdmin }) {
  const { pathname, search } = useLocation()
  return (
    <tr className={r.oculto ? 'is-oculto' : undefined}>
      <td>
        <div className="admin-tabla__reporte">
          <img className="admin-tabla__thumb" src={r.miniatura_url} alt="" width="56" height="56" loading="lazy" />
          <div className="admin-tabla__body">
            <Link
              to={`/admin-panel/reportes/${r.id}`}
              state={{ volverA: pathname + search }}
              className="admin-tabla__link"
            >
              {r.categoria.nombre}
              <span className="visually-hidden"> número {r.id}</span>
            </Link>
            <span className="admin-tabla__desc">{r.descripcion}</span>
            <span className="admin-tabla__meta">
              {r.oculto && (
                <span className="status-pill status-pill--oculto">
                  <EyeOffIcon size={16} />
                  <span>Oculto</span>
                </span>
              )}
              {/* En móvil, votos y fecha van aquí; en escritorio, en sus columnas. */}
              <span className="admin-tabla__solo-movil">
                <StatusPill estado={r.estado} />
              </span>
              <span className="admin-tabla__solo-movil admin-tabla__votos">
                <VoteIcon size={16} /> {r.votos}
                <span className="visually-hidden">{r.votos === 1 ? ' voto' : ' votos'}</span>
              </span>
              <time className="admin-tabla__solo-movil" dateTime={r.creado}>
                {haceCuanto(r.creado)}
              </time>
            </span>
          </div>
        </div>
      </td>
      <td className="admin-tabla__solo-escritorio">
        <StatusPill estado={r.estado} />
      </td>
      <td className="admin-tabla__num admin-tabla__solo-escritorio">{r.votos}</td>
      <td className="admin-tabla__solo-escritorio">
        <time dateTime={r.creado} title={haceCuanto(r.creado)}>
          {fecha.format(new Date(r.creado))}
        </time>
      </td>
    </tr>
  )
}

/** La chapa del estado, como en los filtros del mapa (forma e icono, nunca solo color). */
function EstadoChapa({ estado }: { estado: EstadoReporte }) {
  const Icono = ICONO_ESTADO[estado]
  return (
    <span className={`filter-chip__swatch rmap-chip rmap-chip--${estado}`} aria-hidden="true">
      <Icono size={16} />
    </span>
  )
}
