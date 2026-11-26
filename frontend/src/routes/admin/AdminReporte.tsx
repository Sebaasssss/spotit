import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import {
  cambiarEstado,
  fetchReporteAdmin,
  mostrarReporte,
  ocultarReporte,
  type EventoAdmin,
  type ReporteAdminDetalle,
} from '../../api/admin'
import type { EstadoReporte } from '../../api/reportes'
import { FormAlert } from '../../components/form/fields'
import {
  AlertIcon,
  ArrowLeftIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  Spinner,
  VoteIcon,
} from '../../components/Icons'
import { MapView } from '../../components/report/MapView'
import { StatusPill } from '../../components/report/StatusPill'
import { fechaCompleta } from '../../lib/fechas'
import { formatoCoordenadas } from '../../lib/mapa'
import { AvisoError } from './AdminPanel'
import { mensajeError } from './errores'

const NOTA_MAX = 500
const MOTIVO_MIN = 5
const MOTIVO_MAX = 500

type Carga =
  | { kind: 'loading' }
  | { kind: 'ok'; reporte: ReporteAdminDetalle }
  | { kind: 'error'; message: string; offline: boolean; noExiste: boolean }

export function AdminReporte() {
  const { id = '' } = useParams()
  const volverA = (useLocation().state as { volverA?: string } | null)?.volverA
  const [carga, setCarga] = useState<Carga>({ kind: 'loading' })
  const [intento, setIntento] = useState(0)
  const [aviso, setAviso] = useState<{ id: number; texto: string } | null>(null)
  const avisoRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchReporteAdmin(id, controller.signal).then(
      (reporte) => setCarga({ kind: 'ok', reporte }),
      (error: unknown) => {
        if (controller.signal.aborted) return
        const noExiste = error instanceof ApiError && error.status === 404
        setCarga({
          kind: 'error',
          noExiste,
          ...(noExiste
            ? { offline: false, message: 'Este reporte no existe.' }
            : mensajeError(error, 'el reporte')),
        })
      },
    )
    return () => controller.abort()
  }, [id, intento])

  useEffect(() => {
    if (aviso) avisoRef.current?.focus()
  }, [aviso])

  /** Tras una acción: muestra el reporte que devolvió el servidor y lo anuncia. */
  const aplicar = (reporte: ReporteAdminDetalle, texto: string) => {
    setCarga({ kind: 'ok', reporte })
    setAviso({ id: Date.now(), texto })
  }

  const volver = volverA?.startsWith('/admin-panel/reportes') ? volverA : '/admin-panel/reportes'

  return (
    <main className="admin__main">
      <Link to={volver} className="admin-volver">
        <ArrowLeftIcon size={20} />
        Reportes
      </Link>

      {carga.kind === 'loading' && (
        <p className="picker__status" role="status">
          <Spinner size={18} /> Cargando el reporte…
        </p>
      )}

      {carga.kind === 'error' && (
        <AvisoError
          offline={carga.offline}
          message={carga.message}
          onReintentar={
            carga.noExiste
              ? undefined
              : () => {
                  setCarga({ kind: 'loading' })
                  setIntento((n) => n + 1)
                }
          }
        />
      )}

      {carga.kind === 'ok' && (
        <Detalle
          reporte={carga.reporte}
          aviso={aviso}
          avisoRef={avisoRef}
          onCambio={aplicar}
          onRecargar={() => setIntento((n) => n + 1)}
        />
      )}
    </main>
  )
}

function Detalle({
  reporte,
  aviso,
  avisoRef,
  onCambio,
  onRecargar,
}: {
  reporte: ReporteAdminDetalle
  aviso: { id: number; texto: string } | null
  avisoRef: React.RefObject<HTMLParagraphElement | null>
  onCambio: (r: ReporteAdminDetalle, texto: string) => void
  onRecargar: () => void
}) {
  const lat = Number(reporte.latitud)
  const lng = Number(reporte.longitud)

  return (
    <article className="admin-detalle" aria-labelledby="reporte-titulo">
      <header className="admin-detalle__head">
        <h2 id="reporte-titulo" className="admin-detalle__title">
          {reporte.categoria.nombre} <span className="admin-detalle__id">#{reporte.id}</span>
        </h2>
        <p className="admin-detalle__pills">
          <StatusPill estado={reporte.estado} />
          {reporte.oculto && (
            <span className="status-pill status-pill--oculto">
              <EyeOffIcon size={16} />
              <span>Oculto</span>
            </span>
          )}
          <span className="admin-detalle__votos">
            <VoteIcon size={16} /> {reporte.votos === 1 ? '1 voto' : `${reporte.votos} votos`}
          </span>
        </p>
      </header>

      {aviso && (
        <p ref={avisoRef} tabIndex={-1} className="success-note" role="status" key={aviso.id}>
          <CheckIcon size={20} />
          {aviso.texto}
        </p>
      )}

      <div className="admin-detalle__cols">
        <div className="admin-detalle__reporte">
          <figure className="detail__photo">
            <img src={reporte.foto_url} alt={`Foto del reporte: ${reporte.categoria.nombre}`} />
          </figure>
          <p className="detail__text">{reporte.descripcion}</p>
          <dl className="account">
            <div>
              <dt>Enviado</dt>
              <dd>
                <time dateTime={reporte.creado}>{fechaCompleta(reporte.creado)}</time>
              </dd>
            </div>
            <div>
              <dt>Ubicación</dt>
              <dd>
                {formatoCoordenadas(lat, lng)}
                {reporte.origen_ubicacion === 'gps' && reporte.precision_m
                  ? ` · GPS, ±${reporte.precision_m} m`
                  : ' · ajustada a mano'}
              </dd>
            </div>
          </dl>
          <MapView
            center={{ lat, lng }}
            zoom={17}
            interactive={false}
            label={`Mapa con la ubicación del reporte: ${formatoCoordenadas(lat, lng)}`}
            className="map-view--detail"
          />
        </div>

        <aside className="admin-acciones" aria-label="Acciones del administrador">
          <CambioEstado reporte={reporte} onCambio={onCambio} onRecargar={onRecargar} />

          <section className="admin-seccion" aria-labelledby="autor-titulo">
            <h3 id="autor-titulo" className="admin-seccion__title">
              Quién lo envió
            </h3>
            {reporte.autor ? (
              <dl className="admin-autor">
                <dt className="visually-hidden">Nombre</dt>
                <dd className="admin-autor__nombre">{reporte.autor.nombre}</dd>
                <dt className="visually-hidden">Email</dt>
                <dd>
                  <a href={`mailto:${reporte.autor.email}?subject=${encodeURIComponent(`Tu reporte #${reporte.id} en SpotIt`)}`}>
                    {reporte.autor.email}
                  </a>
                </dd>
              </dl>
            ) : (
              <p className="admin-seccion__hint">La cuenta que lo envió ya no existe.</p>
            )}
          </section>

          <Moderacion reporte={reporte} onCambio={onCambio} />
        </aside>
      </div>

      <Historial reporte={reporte} />
    </article>
  )
}

function contador(texto: string, max: number) {
  const quedan = max - texto.length
  return quedan < 100 ? `Te quedan ${quedan} caracteres.` : `Opcional, hasta ${max} caracteres.`
}

function CambioEstado({
  reporte,
  onCambio,
  onRecargar,
}: {
  reporte: ReporteAdminDetalle
  onCambio: (r: ReporteAdminDetalle, texto: string) => void
  onRecargar: () => void
}) {
  const [destino, setDestino] = useState<EstadoReporte | ''>('')
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<{ texto: string; conflicto: boolean } | null>(null)
  const id = useId()

  const enviar = async (event: FormEvent) => {
    event.preventDefault()
    if (!destino) {
      setError({ texto: 'Elige el nuevo estado.', conflicto: false })
      return
    }
    setEnviando(true)
    setError(null)
    try {
      const nuevo = await cambiarEstado(reporte.id, {
        estado: destino,
        desde: reporte.estado,
        nota_publica: nota.trim(),
      })
      setDestino('')
      setNota('')
      onCambio(nuevo, `Estado cambiado a «${nuevo.estado_display}».${nota.trim() ? ' El ciudadano verá tu nota.' : ''}`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError({ texto: e.message, conflicto: true })
        setDestino('')
        onRecargar() // se muestra el estado real; la nota escrita se conserva
      } else if (e instanceof ApiError) {
        setError({ texto: Object.values(e.fieldErrors)[0]?.[0] ?? e.message, conflicto: false })
      } else {
        setError({ texto: 'Sin conexión: el estado no cambió. Inténtalo de nuevo.', conflicto: false })
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="admin-seccion" aria-labelledby={`${id}-titulo`}>
      <h3 id={`${id}-titulo`} className="admin-seccion__title">
        Cambiar estado
      </h3>
      {error && (
        <FormAlert>
          <p>{error.texto}</p>
          {error.conflicto && <p className="form-alert__help">Ya ves el estado actual.</p>}
        </FormAlert>
      )}
      <form className="admin-form" onSubmit={(e) => void enviar(e)} noValidate>
        <fieldset className="admin-opciones">
          <legend className="field__label">
            Pasar de «{reporte.estado_display}» a
          </legend>
          {reporte.transiciones.map((t) => (
            <label key={t.estado} className="admin-opcion">
              <input
                type="radio"
                name={`${id}-estado`}
                value={t.estado}
                checked={destino === t.estado}
                onChange={() => setDestino(t.estado)}
              />
              <StatusPill estado={t.estado} />
              {reporte.estado === 'resuelto' && <span className="admin-opcion__hint">reabrir</span>}
              {destino === t.estado && <CheckIcon size={18} className="admin-opcion__check" />}
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label className="field__label" htmlFor={`${id}-nota`}>
            Nota pública
          </label>
          <textarea
            id={`${id}-nota`}
            className="field__input field__textarea"
            rows={3}
            maxLength={NOTA_MAX}
            value={nota}
            placeholder="Ej.: Ya mandamos a una cuadrilla; esperamos resolverlo esta semana."
            aria-describedby={`${id}-nota-ayuda`}
            onChange={(e) => setNota(e.target.value)}
          />
          <p className="field__hint" id={`${id}-nota-ayuda`}>
            La verá el ciudadano en su reporte. {contador(nota, NOTA_MAX)}
          </p>
        </div>
        <button type="submit" className="btn btn--primary btn--block" disabled={enviando} aria-disabled={enviando}>
          {enviando ? (
            <>
              <Spinner /> Guardando…
            </>
          ) : (
            'Cambiar estado'
          )}
        </button>
      </form>
    </section>
  )
}

function Moderacion({
  reporte,
  onCambio,
}: {
  reporte: ReporteAdminDetalle
  onCambio: (r: ReporteAdminDetalle, texto: string) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null)
  const id = useId()
  const motivoRef = useRef<HTMLTextAreaElement>(null)
  const abrirRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (abierto) motivoRef.current?.focus()
  }, [abierto])

  const cerrar = () => {
    setAbierto(false)
    setMotivo('')
    setNota('')
    setError(null)
    setErrorMotivo(null)
    requestAnimationFrame(() => abrirRef.current?.focus())
  }

  const ocultar = async (event: FormEvent) => {
    event.preventDefault()
    if (motivo.trim().length < MOTIVO_MIN) {
      setErrorMotivo(
        motivo.trim()
          ? `Explica un poco más el motivo (al menos ${MOTIVO_MIN} caracteres).`
          : 'Escribe el motivo para ocultarlo.',
      )
      motivoRef.current?.focus()
      return
    }
    setEnviando(true)
    setError(null)
    setErrorMotivo(null)
    try {
      const nuevo = await ocultarReporte(reporte.id, { motivo: motivo.trim(), nota_publica: nota.trim() })
      setAbierto(false)
      setMotivo('')
      setNota('')
      onCambio(nuevo, 'Reporte oculto: los ciudadanos ya no lo ven en el mapa ni en las listas.')
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors.motivo) setErrorMotivo(e.fieldErrors.motivo[0])
      else setError(e instanceof ApiError ? e.message : 'Sin conexión: no se ocultó. Inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const mostrar = async (event: FormEvent) => {
    event.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      const nuevo = await mostrarReporte(reporte.id, { nota_publica: nota.trim() })
      setNota('')
      onCambio(nuevo, 'El reporte vuelve a verse en el mapa y en las listas.')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sin conexión: no cambió. Inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="admin-seccion" aria-labelledby={`${id}-titulo`}>
      <h3 id={`${id}-titulo`} className="admin-seccion__title">
        Moderación
      </h3>
      {error && <FormAlert>{error}</FormAlert>}

      {reporte.oculto ? (
        <>
          <div className="admin-oculto">
            <p className="admin-oculto__estado">
              <EyeOffIcon size={20} />
              <span>
                Oculto{reporte.oculto_por ? ` por ${reporte.oculto_por}` : ''}
                {reporte.oculto_en ? (
                  <>
                    {' '}
                    el <time dateTime={reporte.oculto_en}>{fechaCompleta(reporte.oculto_en)}</time>
                    {/* "p.m." ya cierra con punto. */}
                    {fechaCompleta(reporte.oculto_en).endsWith('.') ? '' : '.'}
                  </>
                ) : (
                  '.'
                )}
              </span>
            </p>
            <p>
              <span className="admin-oculto__label">Motivo interno: </span>
              {reporte.oculto_motivo}
            </p>
          </div>
          <form className="admin-form" onSubmit={(e) => void mostrar(e)} noValidate>
            <NotaOpcional id={`${id}-nota-mostrar`} nota={nota} setNota={setNota} />
            <button type="submit" className="btn btn--secondary btn--block-secondary" disabled={enviando}>
              {enviando ? <Spinner size={20} /> : <EyeIcon size={20} />}
              {enviando ? 'Guardando…' : 'Volver a mostrar'}
            </button>
          </form>
        </>
      ) : abierto ? (
        <form className="admin-form admin-ocultar" onSubmit={(e) => void ocultar(e)} noValidate>
          <p className="admin-ocultar__aviso">
            Dejará de verse en el mapa y en las listas, y su foto solo la verán administradores. Su
            autor lo verá marcado como oculto, sin el motivo. No se borra nada y lo puedes volver a mostrar.
          </p>
          <div className={`field ${errorMotivo ? 'field--invalid' : ''}`}>
            <label className="field__label" htmlFor={`${id}-motivo`}>
              Motivo (interno)
            </label>
            <textarea
              ref={motivoRef}
              id={`${id}-motivo`}
              className="field__input field__textarea"
              rows={3}
              maxLength={MOTIVO_MAX}
              required
              value={motivo}
              placeholder="Ej.: La foto muestra caras y placas de autos."
              aria-invalid={errorMotivo ? true : undefined}
              aria-describedby={`${id}-motivo-ayuda${errorMotivo ? ` ${id}-motivo-error` : ''}`}
              onChange={(e) => setMotivo(e.target.value)}
            />
            {errorMotivo && (
              <p className="field__error" id={`${id}-motivo-error`}>
                <AlertIcon size={18} />
                <span>{errorMotivo}</span>
              </p>
            )}
            <p className="field__hint" id={`${id}-motivo-ayuda`}>
              Obligatorio. Solo lo ven los administradores.
            </p>
          </div>
          <NotaOpcional id={`${id}-nota-ocultar`} nota={nota} setNota={setNota} />
          <div className="pend-row__actions admin-ocultar__acciones">
            <button type="submit" className="btn btn--danger" disabled={enviando}>
              {enviando ? <Spinner size={20} /> : <EyeOffIcon size={20} />}
              {enviando ? 'Ocultando…' : 'Ocultar reporte'}
            </button>
            <button type="button" className="link-button" onClick={cerrar} disabled={enviando}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="admin-seccion__hint">
            Si la foto muestra caras o placas, o el reporte es inapropiado, ocúltalo. No se borra nada.
          </p>
          <button ref={abrirRef} type="button" className="btn btn--danger" onClick={() => setAbierto(true)}>
            <EyeOffIcon size={20} />
            Ocultar reporte…
          </button>
        </>
      )}
    </section>
  )
}

function NotaOpcional({ id, nota, setNota }: { id: string; nota: string; setNota: (v: string) => void }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        Nota pública para el autor
      </label>
      <textarea
        id={id}
        className="field__input field__textarea"
        rows={2}
        maxLength={NOTA_MAX}
        value={nota}
        aria-describedby={`${id}-ayuda`}
        onChange={(e) => setNota(e.target.value)}
      />
      <p className="field__hint" id={`${id}-ayuda`}>
        {contador(nota, NOTA_MAX)}
      </p>
    </div>
  )
}

function textoEvento(e: EventoAdmin) {
  if (e.tipo === 'ocultar') return 'Se ocultó'
  if (e.tipo === 'mostrar') return 'Se volvió a mostrar'
  return `Pasó a «${e.estado_nuevo_display}»`
}

function Historial({ reporte }: { reporte: ReporteAdminDetalle }) {
  const eventos = [...reporte.historial].reverse() // lo más reciente arriba
  return (
    <section className="admin-historial" aria-labelledby="historial-titulo">
      <h3 id="historial-titulo" className="list-head__title">
        Historial
      </h3>
      <ol className="timeline">
        {eventos.map((e, i) => (
          <li key={`${e.fecha}-${i}`} className={`timeline__item timeline__item--${e.tipo}`}>
            <p className="timeline__head">
              <span className="timeline__que">{textoEvento(e)}</span>
              <time dateTime={e.fecha}>{fechaCompleta(e.fecha)}</time>
            </p>
            <p className="timeline__quien">{e.admin ? `Por ${e.admin}` : 'Por una cuenta eliminada'}</p>
            {e.nota_publica && (
              <p className="timeline__nota">
                <span className="timeline__label">Nota pública: </span>
                {e.nota_publica}
              </p>
            )}
            {e.motivo && (
              <p className="timeline__nota timeline__nota--interna">
                <span className="timeline__label">Motivo interno: </span>
                {e.motivo}
              </p>
            )}
          </li>
        ))}
        <li className="timeline__item timeline__item--inicio">
          <p className="timeline__head">
            <span className="timeline__que">Lo envió el ciudadano</span>
            <time dateTime={reporte.creado}>{fechaCompleta(reporte.creado)}</time>
          </p>
        </li>
      </ol>
    </section>
  )
}
