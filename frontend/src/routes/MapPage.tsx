import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ApiError, NetworkError } from '../api/client'
import {
  fetchCategorias,
  fetchPuntosMapa,
  fetchReporte,
  type Categoria,
  type EstadoReporte,
  type PuntoMapa,
  type Reporte,
} from '../api/reportes'
import { useAuth } from '../auth/context'
import { NotaGuardado } from '../components/offline/NotaGuardado'
import { FormAlert } from '../components/form/fields'
import {
  CategoriaIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  CloudOffIcon,
  FilterIcon,
  InfoIcon,
  ListIcon,
  MapIcon,
  RefreshIcon,
  Spinner,
} from '../components/Icons'
import { ReportsMap } from '../components/map/ReportsMap'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/report/StatusPill'
import { VoteButton } from '../components/report/VoteButton'
import { haceCuanto } from '../lib/fechas'
import { useOnline } from '../lib/useOnline'
import { useApiActualizada } from '../offline/useApiActualizada'
import '../map.css'

const ESTADOS: { valor: EstadoReporte; nombre: string }[] = [
  { valor: 'recibido', nombre: 'Recibido' },
  { valor: 'en_proceso', nombre: 'En proceso' },
  { valor: 'resuelto', nombre: 'Resuelto' },
]
const ES_ESTADO = (v: string): v is EstadoReporte => ESTADOS.some((e) => e.valor === v)
const LISTA_PASO = 30

const lista = (valor: string | null) => (valor ? valor.split(',').filter(Boolean) : [])

type Carga =
  | { kind: 'loading' }
  | {
      kind: 'ok'
      puntos: PuntoMapa[]
      truncado: boolean
      clave: string
      /** Copia guardada por el service worker (null si vino de la red). */
      guardado: Date | null
      sinConexion: boolean
    }
  | { kind: 'error'; message: string; offline: boolean; clave: string }

function mensajeError(error: unknown, que: string) {
  if (error instanceof NetworkError) return `Sin conexión: no pudimos cargar ${que}.`
  if (error instanceof ApiError) return error.message
  return `No pudimos cargar ${que}.`
}

export function MapPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const estados = useMemo(() => lista(params.get('estado')).filter(ES_ESTADO), [params])
  const categorias = useMemo(() => lista(params.get('categoria')), [params])
  const vista = params.get('vista') === 'lista' ? 'lista' : 'mapa'
  const seleccionado = Number(params.get('r')) || null
  const hayFiltros = estados.length + categorias.length > 0

  const [cats, setCats] = useState<Categoria[]>([])
  const [carga, setCarga] = useState<Carga>({ kind: 'loading' })
  const [intento, setIntento] = useState(0)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [grupo, setGrupo] = useState<number[] | null>(null)
  const [leyenda, setLeyenda] = useState(false)
  const panelId = useId()
  const botonFiltros = useRef<HTMLButtonElement>(null)

  const nombres = useMemo(() => Object.fromEntries(cats.map((c) => [c.slug, c.nombre])), [cats])
  const iconos = useMemo(() => Object.fromEntries(cats.map((c) => [c.slug, c.icono])), [cats])

  // Cambia la URL sin apilar historial: volver desde el detalle conserva filtros y selección.
  const actualizar = useCallback(
    (cambios: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const sig = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(cambios)) {
            if (v) sig.set(k, v)
            else sig.delete(k)
          }
          return sig
        },
        { replace: true },
      )
    },
    [setParams],
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchCategorias(controller.signal).then(setCats, () => {
      // Sin categorías el mapa funciona igual; las etiquetas dicen "Reporte".
    })
    return () => controller.abort()
  }, [])

  // Mientras llega la respuesta de otros filtros se siguen viendo los puntos anteriores.
  const clave = `${estados.join(',')}|${categorias.join(',')}|${intento}`
  const actualizando = carga.kind === 'loading' || carga.clave !== clave
  useEffect(() => {
    const controller = new AbortController()
    fetchPuntosMapa({ estados, categorias }, controller.signal).then(
      ({ data: { results, truncado }, guardado, sinConexion }) =>
        setCarga({ kind: 'ok', puntos: results, truncado, clave, guardado, sinConexion }),
      (error: unknown) => {
        if (controller.signal.aborted) return
        setCarga({
          kind: 'error',
          message: mensajeError(error, 'los reportes'),
          offline: error instanceof NetworkError,
          clave,
        })
      },
    )
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `clave` resume filtros e intento
  }, [clave])

  const puntos = carga.kind === 'ok' ? carga.puntos : []

  // La copia guardada se mostró al instante; si el servidor trae otra, se vuelve a pedir.
  useApiActualizada((ruta) => {
    if (ruta === '/api/reportes/mapa/') setIntento((n) => n + 1)
  })

  // El conteo confirmado de un voto se refleja en la chapa del mapa y en la lista.
  const onVoto = useCallback((id: number, votos: number) => {
    setCarga((prev) =>
      prev.kind === 'ok'
        ? { ...prev, puntos: prev.puntos.map((p) => (p.id === id ? { ...p, votos } : p)) }
        : prev,
    )
  }, [])

  const alternarFiltro = (clave: 'estado' | 'categoria', valor: string) => {
    const actual = clave === 'estado' ? (estados as string[]) : categorias
    const sig = actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor]
    actualizar({ [clave]: sig.join(',') || null })
  }

  const quitarFiltros = () => actualizar({ estado: null, categoria: null })

  // Foco: al abrir la hoja va a su título; al cerrarla vuelve a la chapa (o al mapa).
  const titulo = useRef<HTMLHeadingElement>(null)
  const ultimoElegido = useRef<number | null>(null)
  const elegir = (id: number) => {
    ultimoElegido.current = id
    setGrupo(null)
    setLeyenda(false)
    actualizar({ r: String(id) })
  }
  const cerrar = () => {
    actualizar({ r: null })
    const id = ultimoElegido.current
    window.setTimeout(() => {
      const chapa = document.querySelector<HTMLButtonElement>(`.rmap-chip[data-id="${id}"]`)
      ;(chapa ?? document.querySelector<HTMLElement>('.rmap__canvas'))?.focus()
    }, 0)
  }

  const totalTexto =
    carga.kind === 'ok'
      ? puntos.length === 1
        ? '1 reporte'
        : `${puntos.length.toLocaleString('es-MX')} reportes`
      : ''

  return (
    <div className="mapa">
      <PageHeader title="Mapa de reportes" back={{ to: '/', label: 'Inicio' }} />

      <div className="mapa__controls">
        <button
          ref={botonFiltros}
          type="button"
          className={`btn mapa__filter-btn ${hayFiltros ? 'is-active' : ''}`}
          aria-expanded={filtrosAbiertos}
          aria-controls={panelId}
          onClick={() => setFiltrosAbiertos((v) => !v)}
        >
          <FilterIcon size={20} />
          <span>Filtros</span>
          {hayFiltros && (
            <span className="mapa__filter-count">
              {estados.length + categorias.length}
              <span className="visually-hidden"> activos</span>
            </span>
          )}
        </button>

        <div className="mapa__views" role="group" aria-label="Ver como">
          <button
            type="button"
            className="mapa__view"
            aria-pressed={vista === 'mapa'}
            onClick={() => actualizar({ vista: null })}
          >
            <MapIcon size={20} />
            Mapa
          </button>
          <button
            type="button"
            className="mapa__view"
            aria-pressed={vista === 'lista'}
            onClick={() => actualizar({ vista: 'lista' })}
          >
            <ListIcon size={20} />
            Lista
          </button>
        </div>
      </div>

      {filtrosAbiertos && (
        <section id={panelId} className="mapa__filters" aria-label="Filtros del mapa">
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
                  aria-pressed={estados.includes(e.valor)}
                  onClick={() => alternarFiltro('estado', e.valor)}
                >
                  <span className={`filter-chip__swatch rmap-chip rmap-chip--${e.valor}`} aria-hidden="true">
                    <StatusGlyph estado={e.valor} />
                  </span>
                  {e.nombre}
                  {estados.includes(e.valor) && <CheckIcon size={18} className="filter-chip__check" />}
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
                  aria-pressed={categorias.includes(c.slug)}
                  onClick={() => alternarFiltro('categoria', c.slug)}
                >
                  <CategoriaIcon icono={c.icono} size={20} />
                  {c.nombre}
                  {categorias.includes(c.slug) && <CheckIcon size={18} className="filter-chip__check" />}
                </button>
              ))}
              {cats.length === 0 && <p className="filter-group__hint">Cargando los tipos…</p>}
            </div>
          </div>

          {/* Fijo al pie del panel: lo marcado siempre se ve, aunque quede fuera del scroll. */}
          <div className="mapa__filters-foot">
            <p className="mapa__filters-hint">
              {hayFiltros
                ? `Marcaste: ${[
                    ...ESTADOS.filter((e) => estados.includes(e.valor)).map((e) => e.nombre),
                    ...categorias.map((slug) => nombres[slug] ?? slug),
                  ].join(', ')}.`
                : 'Sin filtros ves todos los reportes.'}
            </p>
            {hayFiltros && (
              <button type="button" className="link-button" onClick={quitarFiltros}>
                Quitar filtros
              </button>
            )}
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setFiltrosAbiertos(false)
                botonFiltros.current?.focus()
              }}
            >
              {actualizando || carga.kind !== 'ok' ? 'Ver reportes' : `Ver ${totalTexto}`}
            </button>
          </div>
        </section>
      )}

      <p className="visually-hidden" role="status">
        {carga.kind === 'loading' || actualizando ? 'Cargando reportes…' : totalTexto}
      </p>

      {carga.kind === 'error' && (
        <div className="mapa__alert">
          <FormAlert>
            <p className="mapa__alert-title">
              {carga.offline && <CloudOffIcon size={20} />}
              {carga.message}
            </p>
            <p className="form-alert__help">
              <button type="button" className="link-button" onClick={() => setIntento((n) => n + 1)}>
                <RefreshIcon size={18} /> Reintentar
              </button>
            </p>
          </FormAlert>
        </div>
      )}

      <div className={`mapa__body mapa__body--${vista}`}>
        {vista === 'mapa' ? (
          <div className="rmap map-view">
            <ReportsMap
              puntos={puntos}
              nombres={nombres}
              seleccionado={seleccionado}
              onSelect={elegir}
              onSelectGrupo={(ids) => {
                actualizar({ r: null })
                setGrupo(ids)
              }}
              label={`Mapa de reportes. ${totalTexto}. Usa las flechas para moverlo.`}
            />
            <button
              type="button"
              className="mapa__legend-btn"
              aria-expanded={leyenda}
              onClick={() => {
                actualizar({ r: null })
                setGrupo(null)
                setLeyenda((v) => !v)
              }}
            >
              <InfoIcon size={20} />
              Leyenda
            </button>
            {/* Con los filtros abiertos, su pie ya dice el resultado ("Ver 0 reportes"). */}
            <MapaAviso
              oculto={filtrosAbiertos}
              carga={carga}
              actualizando={actualizando}
              hayFiltros={hayFiltros}
              onQuitarFiltros={quitarFiltros}
              puedeReportar={user?.rol === 'ciudadano'}
            />
          </div>
        ) : (
          <ListaReportes
            carga={carga}
            nombres={nombres}
            iconos={iconos}
            hayFiltros={hayFiltros}
            onQuitarFiltros={quitarFiltros}
            onElegir={elegir}
          />
        )}

        {seleccionado ? (
          <HojaReporte
            key={seleccionado}
            id={seleccionado}
            tituloRef={titulo}
            onCerrar={cerrar}
            onVoto={onVoto}
            volverA={`/mapa?${params.toString()}`}
          />
        ) : grupo && vista === 'mapa' ? (
          <HojaGrupo
            puntos={puntos.filter((p) => grupo.includes(p.id))}
            nombres={nombres}
            iconos={iconos}
            onElegir={elegir}
            onCerrar={() => {
              setGrupo(null)
              document.querySelector<HTMLElement>('.rmap__canvas')?.focus()
            }}
          />
        ) : leyenda && vista === 'mapa' ? (
          <Leyenda
            hoja
            onCerrar={() => {
              setLeyenda(false)
              document.querySelector<HTMLElement>('.mapa__legend-btn')?.focus()
            }}
          />
        ) : (
          vista === 'mapa' && <Leyenda />
        )}
      </div>
    </div>
  )
}

function StatusGlyph({ estado }: { estado: EstadoReporte }) {
  // El mismo icono que lleva la chapa en el mapa.
  const d = {
    recibido: (
      <>
        <path d="M3.5 13.5 6 5.5h12l2.5 8v5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1Z" />
        <path d="M3.5 13.5h5l1 2h5l1-2h5" />
      </>
    ),
    en_proceso: (
      <path d="M14.5 5.5a4 4 0 0 0 4.9 4.9l-8.6 8.6a2 2 0 0 1-2.8-2.8l8.6-8.6a4 4 0 0 1-2.1-2.1Z" />
    ),
    resuelto: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  }[estado]
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {d}
    </svg>
  )
}

/**
 * Clave de las chapas. En escritorio ocupa la columna de la hoja mientras no hay reporte
 * elegido; en móvil se abre como hoja desde el botón "Leyenda" sobre el mapa.
 */
function Leyenda({ hoja = false, onCerrar }: { hoja?: boolean; onCerrar?: () => void }) {
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (hoja) titulo.current?.focus({ preventScroll: true })
  }, [hoja])
  useEffect(() => {
    if (!hoja || !onCerrar) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hoja, onCerrar])

  return (
    <aside className={`mapa__legend ${hoja ? 'sheet' : ''}`} aria-labelledby="leyenda-titulo">
      <div className="sheet__head">
        <h2 id="leyenda-titulo" ref={titulo} tabIndex={-1} className="mapa__legend-title sheet__title">
          Cómo leer el mapa
        </h2>
        {hoja && (
          <button type="button" className="sheet__close" onClick={onCerrar} aria-label="Cerrar la leyenda">
            <CloseIcon size={22} />
          </button>
        )}
      </div>
      <ul>
        {ESTADOS.map((e) => (
          <li key={e.valor}>
            <span className={`rmap-chip rmap-chip--${e.valor} rmap-chip--static`} aria-hidden="true">
              <StatusGlyph estado={e.valor} />
            </span>
            {e.nombre}
          </li>
        ))}
        <li>
          <span className="rmap-cluster rmap-cluster--sm rmap-chip--static" aria-hidden="true">
            8
          </span>
          Varios reportes juntos: tócalo para acercarte
        </li>
      </ul>
      <p>Toca un punto para ver el reporte y votarlo.</p>
    </aside>
  )
}

function MapaAviso({
  oculto,
  carga,
  actualizando,
  hayFiltros,
  onQuitarFiltros,
  puedeReportar,
}: {
  oculto: boolean
  carga: Carga
  actualizando: boolean
  hayFiltros: boolean
  onQuitarFiltros: () => void
  puedeReportar: boolean
}) {
  const online = useOnline()
  if (oculto) return null
  if (carga.kind === 'loading' || (actualizando && carga.kind !== 'error')) {
    return (
      <p className="rmap__notice rmap__notice--quiet" aria-hidden="true">
        <Spinner size={18} /> Cargando reportes…
      </p>
    )
  }
  if (carga.kind === 'ok' && carga.puntos.length === 0) {
    return hayFiltros ? (
      <div className="rmap__notice">
        <p className="rmap__notice-title">No hay reportes con estos filtros.</p>
        <button type="button" className="link-button" onClick={onQuitarFiltros}>
          Quitar filtros
        </button>
      </div>
    ) : (
      <div className="rmap__notice">
        <p className="rmap__notice-title">Aún no hay reportes en el mapa.</p>
        {puedeReportar && (
          <Link to="/reportes/nuevo" className="link-button">
            Haz el primer reporte
          </Link>
        )}
      </div>
    )
  }
  if (carga.kind === 'ok' && (carga.sinConexion || (!online && carga.guardado))) {
    return (
      <div className="rmap__notice rmap__notice--quiet">
        <NotaGuardado fecha={carga.guardado} />
      </div>
    )
  }
  if (carga.kind === 'ok' && carga.truncado) {
    return (
      <p className="rmap__notice rmap__notice--quiet">
        Ves los {carga.puntos.length.toLocaleString('es-MX')} más recientes. Usa los filtros para ver otros.
      </p>
    )
  }
  return null
}

function FilaPunto({
  p,
  nombres,
  iconos,
  onElegir,
}: {
  p: PuntoMapa
  nombres: Record<string, string>
  iconos: Record<string, string>
  onElegir: (id: number) => void
}) {
  return (
    <li className="map-list__row">
      <button type="button" className="map-list__link" onClick={() => onElegir(p.id)}>
        <span className="map-list__icon" aria-hidden="true">
          <CategoriaIcon icono={iconos[p.categoria] ?? 'otro'} size={22} />
        </span>
        <span className="map-list__body">
          <span className="map-list__title">{nombres[p.categoria] ?? 'Reporte'}</span>
          <span className="map-list__meta">
            <StatusPill estado={p.estado} />
            <span>{p.votos === 0 ? 'Aún sin votos' : p.votos === 1 ? '1 voto' : `${p.votos} votos`}</span>
          </span>
        </span>
        <ChevronRightIcon size={20} className="map-list__chevron" />
      </button>
    </li>
  )
}

const porVotos = (a: PuntoMapa, b: PuntoMapa) => b.votos - a.votos || b.id - a.id

/** Varios reportes en el mismo lugar: el zoom ya no los separa, así que se listan. */
function HojaGrupo({
  puntos,
  nombres,
  iconos,
  onElegir,
  onCerrar,
}: {
  puntos: PuntoMapa[]
  nombres: Record<string, string>
  iconos: Record<string, string>
  onElegir: (id: number) => void
  onCerrar: () => void
}) {
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    titulo.current?.focus({ preventScroll: true })
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCerrar])

  return (
    <section className="sheet" aria-labelledby="grupo-titulo">
      <div className="sheet__head">
        <h2 id="grupo-titulo" ref={titulo} tabIndex={-1} className="sheet__title">
          {puntos.length} reportes en este lugar
        </h2>
        <button type="button" className="sheet__close" onClick={onCerrar} aria-label="Cerrar la lista">
          <CloseIcon size={22} />
        </button>
      </div>
      <ul className="map-list">
        {[...puntos].sort(porVotos).map((p) => (
          <FilaPunto key={p.id} p={p} nombres={nombres} iconos={iconos} onElegir={onElegir} />
        ))}
      </ul>
    </section>
  )
}

function ListaReportes({
  carga,
  nombres,
  iconos,
  hayFiltros,
  onQuitarFiltros,
  onElegir,
}: {
  carga: Carga
  nombres: Record<string, string>
  iconos: Record<string, string>
  hayFiltros: boolean
  onQuitarFiltros: () => void
  onElegir: (id: number) => void
}) {
  const [visibles, setVisibles] = useState(LISTA_PASO)
  const ordenados = useMemo(
    () =>
      carga.kind === 'ok'
        ? [...carga.puntos].sort(porVotos)
        : [],
    [carga],
  )

  if (carga.kind === 'loading') {
    return (
      <ul className="map-list" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="map-list__row map-list__row--skeleton">
            <span className="skeleton map-list__icon" />
            <span className="skeleton skeleton--line" />
          </li>
        ))}
      </ul>
    )
  }
  if (carga.kind === 'error') return null
  if (ordenados.length === 0) {
    return (
      <div className="empty map-list__empty">
        <h2>{hayFiltros ? 'No hay reportes con estos filtros' : 'Aún no hay reportes'}</h2>
        {hayFiltros && (
          <button type="button" className="link-button" onClick={onQuitarFiltros}>
            Quitar filtros
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="map-list__wrap">
      <p className="map-list__head">Más votados primero</p>
      <ul className="map-list">
        {ordenados.slice(0, visibles).map((p) => (
          <FilaPunto key={p.id} p={p} nombres={nombres} iconos={iconos} onElegir={onElegir} />
        ))}
      </ul>
      {ordenados.length > visibles && (
        <button
          type="button"
          className="btn btn--secondary btn--block-secondary"
          onClick={() => setVisibles((n) => n + LISTA_PASO)}
        >
          Mostrar más ({ordenados.length - visibles} restantes)
        </button>
      )}
    </div>
  )
}

type CargaHoja =
  | { kind: 'loading' }
  | { kind: 'ok'; reporte: Reporte; copia: Date | null; sinConexion: boolean }
  | { kind: 'error'; message: string; retry: boolean }

function HojaReporte({
  id,
  tituloRef,
  onCerrar,
  onVoto,
  volverA,
}: {
  id: number
  tituloRef: RefObject<HTMLHeadingElement | null>
  onCerrar: () => void
  onVoto: (id: number, votos: number) => void
  volverA: string
}) {
  const [carga, setCarga] = useState<CargaHoja>({ kind: 'loading' })
  const [intento, setIntento] = useState(0)
  const online = useOnline()
  useApiActualizada((ruta) => {
    if (ruta === `/api/reportes/${id}/`) setIntento((n) => n + 1)
  })

  useEffect(() => {
    const controller = new AbortController()
    fetchReporte(id, controller.signal).then(
      ({ data: reporte, guardado, sinConexion }) =>
        setCarga({ kind: 'ok', reporte, copia: guardado, sinConexion }),
      (error: unknown) => {
        if (controller.signal.aborted) return
        const noExiste = error instanceof ApiError && error.status === 404
        setCarga({
          kind: 'error',
          message: noExiste ? 'Este reporte ya no existe.' : mensajeError(error, 'el reporte'),
          retry: !noExiste,
        })
      },
    )
    return () => controller.abort()
  }, [id, intento])

  // El foco entra a la hoja al abrirla, para que el lector anuncie qué se abrió.
  useEffect(() => {
    tituloRef.current?.focus({ preventScroll: true })
  }, [tituloRef])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCerrar])

  const titulo = carga.kind === 'ok' ? carga.reporte.categoria.nombre : 'Reporte'

  return (
    <section className="sheet" aria-labelledby="hoja-titulo">
      <div className="sheet__head">
        <h2 id="hoja-titulo" ref={tituloRef} tabIndex={-1} className="sheet__title">
          {titulo}
        </h2>
        <button type="button" className="sheet__close" onClick={onCerrar} aria-label="Cerrar el reporte">
          <CloseIcon size={22} />
        </button>
      </div>

      {carga.kind === 'loading' && (
        <div className="sheet__skeleton" aria-hidden="true">
          <span className="skeleton skeleton--thumb" />
          <span className="sheet__skeleton-lines">
            <span className="skeleton skeleton--line" />
            <span className="skeleton skeleton--line skeleton--short" />
          </span>
        </div>
      )}

      {carga.kind === 'error' && (
        <FormAlert>
          <p>{carga.message}</p>
          {carga.retry && (
            <p className="form-alert__help">
              <button type="button" className="link-button" onClick={() => setIntento((n) => n + 1)}>
                <RefreshIcon size={18} /> Reintentar
              </button>
            </p>
          )}
        </FormAlert>
      )}

      {carga.kind === 'ok' && (
        <>
          {(carga.sinConexion || (!online && carga.copia)) && <NotaGuardado fecha={carga.copia} />}
          <div className="sheet__summary">
            <img
              className="sheet__thumb"
              src={carga.reporte.miniatura_url}
              alt=""
              width="72"
              height="72"
              decoding="async"
            />
            <div className="sheet__body">
              <p className="sheet__meta">
                <StatusPill estado={carga.reporte.estado} />
                <time dateTime={carga.reporte.creado}>{haceCuanto(carga.reporte.creado)}</time>
              </p>
              <p className="sheet__desc">{carga.reporte.descripcion}</p>
            </div>
          </div>

          <VoteButton
            key={carga.reporte.id}
            reporte={carga.reporte}
            onCambio={({ votos }) => onVoto(carga.reporte.id, votos)}
          />

          <Link
            to={`/reportes/${carga.reporte.id}`}
            state={{ volverA }}
            className="btn btn--secondary sheet__more"
          >
            Ver el reporte completo
            <ChevronRightIcon size={20} />
          </Link>
        </>
      )}
    </section>
  )
}
