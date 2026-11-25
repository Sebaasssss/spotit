import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ApiError, NetworkError } from '../api/client'
import {
  DESCRIPCION_MAX,
  DESCRIPCION_MIN,
  fetchCategorias,
  type Categoria,
} from '../api/reportes'
import { useAuth } from '../auth/context'
import { FormAlert } from '../components/form/fields'
import { AlertIcon, CloudOffIcon, PhoneIcon, Spinner } from '../components/Icons'
import { PageHeader } from '../components/PageHeader'
import { CategoryPicker } from '../components/report/CategoryPicker'
import { LocationPicker, type Ubicacion } from '../components/report/LocationPicker'
import { PhotoPicker } from '../components/report/PhotoPicker'
import type { FotoPreparada } from '../lib/foto'
import { useOnline } from '../lib/useOnline'
import { ColaLlena, SinEspacio } from '../offline/cola'
import { sincronizador } from '../offline/sincronizador'

type Campo = 'foto' | 'categoria' | 'descripcion' | 'ubicacion'
type Errores = Partial<Record<Campo, string>>

type EstadoCategorias =
  | { kind: 'loading' }
  | { kind: 'ok'; categorias: Categoria[] }
  | { kind: 'error'; message: string }

function validar(datos: {
  foto: FotoPreparada | null
  categoria: string
  descripcion: string
  ubicacion: Ubicacion | null
}): Errores {
  const errores: Errores = {}
  if (!datos.foto) errores.foto = 'Agrega una foto: tómala o elígela de la galería.'
  if (!datos.categoria) errores.categoria = 'Elige el tipo de problema.'
  const texto = datos.descripcion.trim()
  if (texto.length < DESCRIPCION_MIN)
    errores.descripcion = `Cuéntanos un poco más (al menos ${DESCRIPCION_MIN} caracteres).`
  else if (texto.length > DESCRIPCION_MAX)
    errores.descripcion = `Máximo ${DESCRIPCION_MAX} caracteres.`
  if (!datos.ubicacion)
    errores.ubicacion =
      'Indica dónde está: usa tu ubicación, mueve el mapa hasta el punto o toca «usar este punto» si ya está bien.'
  return errores
}

const ORDEN: Campo[] = ['foto', 'categoria', 'descripcion', 'ubicacion']

export function NewReport() {
  const { user } = useAuth()
  const online = useOnline()
  const navigate = useNavigate()

  const [categorias, setCategorias] = useState<EstadoCategorias>({ kind: 'loading' })
  const [intento, setIntento] = useState(0)
  const [foto, setFoto] = useState<FotoPreparada | null>(null)
  const [categoria, setCategoria] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null)
  const [errores, setErrores] = useState<Errores>({})
  const [enviado, setEnviado] = useState(false)
  const [progreso, setProgreso] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const refs = {
    foto: useRef<HTMLButtonElement>(null),
    categoria: useRef<HTMLInputElement>(null),
    descripcion: useRef<HTMLTextAreaElement>(null),
    ubicacion: useRef<HTMLButtonElement>(null),
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchCategorias(controller.signal).then(
      (lista) => setCategorias({ kind: 'ok', categorias: lista }),
      (error: unknown) => {
        if (controller.signal.aborted) return
        setCategorias({
          kind: 'error',
          message:
            error instanceof NetworkError
              ? 'Sin conexión: no pudimos cargar las categorías.'
              : 'No pudimos cargar las categorías.',
        })
      },
    )
    return () => controller.abort()
  }, [intento])

  // Tras el primer intento de envío, los errores se actualizan al corregir.
  const revalidar = (cambios: Partial<Parameters<typeof validar>[0]>) => {
    if (!enviado) return
    setErrores(validar({ foto, categoria, descripcion, ubicacion, ...cambios }))
  }

  const enviando = progreso !== null

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (enviando) return
    setEnviado(true)
    setFormError(null)
    const nuevos = validar({ foto, categoria, descripcion, ubicacion })
    setErrores(nuevos)
    const primero = ORDEN.find((c) => nuevos[c])
    if (primero) {
      refs[primero].current?.focus()
      return
    }

    setProgreso(0)
    const categoriaNombre =
      (categorias.kind === 'ok' && categorias.categorias.find((c) => c.slug === categoria)?.nombre) ||
      categoria
    try {
      // Siempre pasa por la cola: se guarda en el teléfono y luego se intenta enviar.
      // Si la señal falla a mitad, se queda guardado y se envía solo (sin duplicarse).
      const resultado = await sincronizador.guardarYEnviar(
        user!.id,
        {
          categoria,
          categoriaNombre,
          descripcion: descripcion.trim(),
          latitud: ubicacion!.lat,
          longitud: ubicacion!.lng,
          precision_m: ubicacion!.precision,
          origen_ubicacion: ubicacion!.origen,
        },
        foto!.blob,
        (f) => setProgreso(f),
      )
      if (resultado.tipo === 'enviado') {
        navigate('/reportes', { replace: true, state: { nuevo: resultado.reporte.id } })
      } else if (resultado.tipo === 'guardado') {
        navigate('/reportes', { replace: true, state: { guardado: true } })
      } else {
        setProgreso(null)
        mostrarRechazo(resultado.error)
      }
    } catch (error) {
      setProgreso(null)
      setFormError(
        error instanceof ColaLlena || error instanceof SinEspacio
          ? error.message
          : 'No pudimos guardar el reporte en este teléfono. Inténtalo de nuevo.',
      )
    }
  }

  /** El servidor rechazó los datos: se marcan los campos para corregirlos aquí mismo. */
  const mostrarRechazo = (error: unknown) => {
    if (error instanceof ApiError) {
      const servidor: Errores = {}
      for (const campo of ['foto', 'categoria', 'descripcion'] as const) {
        if (error.fieldErrors[campo]) servidor[campo] = error.fieldErrors[campo].join(' ')
      }
      if (error.fieldErrors.latitud || error.fieldErrors.longitud)
        servidor.ubicacion = 'La ubicación no es válida. Vuelve a elegir el punto.'
      if (Object.keys(servidor).length) {
        setErrores(servidor)
        refs[ORDEN.find((c) => servidor[c])!].current?.focus()
        return
      }
      setFormError(error.status === 403 ? 'Tu cuenta no puede crear reportes.' : error.message)
    } else {
      setFormError('Algo salió mal. Inténtalo de nuevo.')
    }
  }

  if (user?.rol === 'administrador') {
    return (
      <div className="page">
        <PageHeader title="Nuevo reporte" back={{ to: '/', label: 'Inicio' }} />
        <main className="page__main">
          <FormAlert tone="info">
            Los reportes los crean los ciudadanos. Como administrador gestionas su estado.
          </FormAlert>
        </main>
      </div>
    )
  }

  const restantes = DESCRIPCION_MAX - descripcion.length
  const porcentaje = progreso === null ? 0 : Math.round(progreso * 100)

  return (
    <div className="page">
      <PageHeader
        title="Nuevo reporte"
        back={{ to: '/', label: 'Inicio' }}
        lead="Foto, tipo de problema, unas palabras y el lugar. Menos de un minuto."
      />

      <main className="page__main">
        <aside className="notice-911" aria-label="Aviso de emergencias">
          <PhoneIcon size={22} />
          <p>
            <strong>Esta app no es para emergencias.</strong> Si hay peligro,{' '}
            <a href="tel:911">llama al 911</a>.
          </p>
        </aside>

        <form className="form form--report" onSubmit={(e) => void onSubmit(e)} noValidate>
          {!online && (
            <FormAlert tone="info" icon={<CloudOffIcon size={20} />}>
              Estás sin conexión. Puedes enviar el reporte igual: se guarda en este teléfono y se
              envía solo cuando vuelva la señal.
            </FormAlert>
          )}
          {formError && <FormAlert>{formError}</FormAlert>}

          <PhotoPicker
            ref={refs.foto}
            value={foto}
            onChange={(f) => {
              setFoto(f)
              revalidar({ foto: f })
            }}
            error={errores.foto}
          />

          {categorias.kind === 'loading' && (
            <div className="field" aria-busy="true">
              <span className="field__label">¿Qué tipo de problema es?</span>
              <p className="picker__status" role="status">
                <Spinner size={18} /> Cargando categorías…
              </p>
            </div>
          )}
          {categorias.kind === 'error' && (
            <div className="field">
              <span className="field__label">¿Qué tipo de problema es?</span>
              <FormAlert>
                <p>{categorias.message}</p>
                <p className="form-alert__help">
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => {
                      setCategorias({ kind: 'loading' })
                      setIntento((n) => n + 1)
                    }}
                  >
                    Reintentar
                  </button>
                </p>
              </FormAlert>
            </div>
          )}
          {categorias.kind === 'ok' && (
            <CategoryPicker
              ref={refs.categoria}
              categorias={categorias.categorias}
              value={categoria}
              onChange={(slug) => {
                setCategoria(slug)
                revalidar({ categoria: slug })
              }}
              error={errores.categoria}
            />
          )}

          <div className={`field ${errores.descripcion ? 'field--invalid' : ''}`}>
            <label className="field__label" htmlFor="descripcion">
              ¿Qué está pasando?
            </label>
            <textarea
              ref={refs.descripcion}
              id="descripcion"
              className="field__input field__textarea"
              rows={4}
              maxLength={DESCRIPCION_MAX}
              value={descripcion}
              placeholder="Ej.: Bache de medio metro frente a la entrada; los coches lo esquivan."
              aria-invalid={errores.descripcion ? true : undefined}
              aria-describedby={`descripcion-contador${errores.descripcion ? ' descripcion-error' : ''}`}
              onChange={(e) => {
                setDescripcion(e.target.value)
                revalidar({ descripcion: e.target.value })
              }}
            />
            {errores.descripcion && (
              <p className="field__error" id="descripcion-error">
                <AlertIcon size={18} />
                <span>{errores.descripcion}</span>
              </p>
            )}
            {/* Con error visible, la pista del mínimo sobra: el error ya lo dice. */}
            {(restantes < 100 || !errores.descripcion) && (
              <p className="field__hint field__counter" id="descripcion-contador">
                {restantes < 100
                  ? `Te quedan ${restantes} caracteres.`
                  : `Mínimo ${DESCRIPCION_MIN} caracteres.`}
              </p>
            )}
          </div>

          <LocationPicker
            ref={refs.ubicacion}
            value={ubicacion}
            onChange={(u) => {
              setUbicacion(u)
              revalidar({ ubicacion: u })
            }}
            error={errores.ubicacion}
          />

          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={enviando}
            aria-disabled={enviando}
          >
            {enviando ? (
              <>
                <Spinner />
                <span>Enviando… {porcentaje} %</span>
              </>
            ) : (
              'Enviar reporte'
            )}
          </button>
          {enviando && (
            <progress className="visually-hidden" max={100} value={porcentaje} aria-label="Progreso del envío" />
          )}
        </form>
      </main>
    </div>
  )
}
