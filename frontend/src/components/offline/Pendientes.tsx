import { useEffect, useId, useRef, useState } from 'react'
import { haceCuanto } from '../../lib/fechas'
import { useOnline } from '../../lib/useOnline'
import type { Pendiente } from '../../offline/cola'
import { sincronizador } from '../../offline/sincronizador'
import { useCola } from '../../offline/useCola'
import { hora } from '../../offline/clasificar'
import { AlertIcon, CloudUpIcon, RefreshIcon, Spinner, TrashIcon } from '../Icons'

/** URL local de la foto guardada; se libera al desmontar. */
function useFotoLocal(foto: Pendiente['foto']) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const creada = URL.createObjectURL(new Blob([foto.buffer], { type: foto.tipo }))
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recurso externo que se libera al salir
    setUrl(creada)
    return () => URL.revokeObjectURL(creada)
  }, [foto])
  return url
}

function PastillaPendiente({ pendiente, progreso }: { pendiente: Pendiente; progreso: number | null }) {
  if (progreso !== null) {
    return (
      <span className="status-pill status-pill--enviando">
        <Spinner size={16} />
        <span>Enviando… {Math.round(progreso * 100)} %</span>
      </span>
    )
  }
  if (pendiente.estado === 'error') {
    return (
      <span className="status-pill status-pill--no-enviado">
        <AlertIcon size={16} />
        <span>No se envió</span>
      </span>
    )
  }
  return (
    <span className="status-pill status-pill--por-enviar">
      <CloudUpIcon size={16} />
      <span>Por enviar</span>
    </span>
  )
}

/** Texto del motivo, armado al pintar (la hora y la conexión cambian después de guardarlo). */
function motivoVisible(pendiente: Pendiente, online: boolean): string | null {
  if (pendiente.estado === 'error') return pendiente.error
  if (pendiente.motivo === 'limite' && pendiente.proximoIntento) {
    return `Llegaste al límite de envíos por hora. Se enviará a las ${hora(pendiente.proximoIntento)}.`
  }
  if (pendiente.motivo === 'red' && online) return 'Se cortó la señal al enviarlo. Lo volvemos a intentar.'
  return pendiente.error
}

function FilaPendiente({
  pendiente,
  progreso,
  onDescartado,
}: {
  pendiente: Pendiente
  progreso: number | null
  onDescartado: () => void
}) {
  const online = useOnline()
  const foto = useFotoLocal(pendiente.foto)
  const [confirmando, setConfirmando] = useState(false)
  const [trabajando, setTrabajando] = useState(false)
  const id = useId()
  const cancelarRef = useRef<HTMLButtonElement>(null)
  const descartarRef = useRef<HTMLButtonElement>(null)
  const enviandoEste = progreso !== null
  const esError = pendiente.estado === 'error'
  const creado = new Date(pendiente.creado).toISOString()
  const motivo = motivoVisible(pendiente, online)

  useEffect(() => {
    if (confirmando) cancelarRef.current?.focus()
  }, [confirmando])

  const cancelar = () => {
    setConfirmando(false)
    // Devuelve el foco al botón que abrió la pregunta.
    requestAnimationFrame(() => descartarRef.current?.focus())
  }

  const descartar = async () => {
    setTrabajando(true)
    const hecho = await sincronizador.descartar(pendiente.clave)
    if (hecho) {
      onDescartado() // la fila desaparece: el foco pasa a la siguiente
    } else {
      setTrabajando(false)
      cancelar()
    }
  }

  const reintentar = async () => {
    setTrabajando(true)
    try {
      await sincronizador.reintentar(pendiente.clave)
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <li className={`report-row pend-row ${esError ? 'pend-row--error' : ''}`}>
      <div className="pend-row__main">
        {foto ? (
          <img className="report-row__thumb" src={foto} alt="" width="72" height="72" />
        ) : (
          <span className="report-row__thumb" aria-hidden="true" />
        )}
        <span className="report-row__body">
          <span className="report-row__title">{pendiente.datos.categoriaNombre}</span>
          <span className="report-row__desc">{pendiente.datos.descripcion}</span>
          <span className="report-row__meta">
            <PastillaPendiente pendiente={pendiente} progreso={progreso} />
            <time dateTime={creado}>Guardado {haceCuanto(creado)}</time>
          </span>
        </span>
      </div>

      {motivo && !enviandoEste && (
        <p className={`pend-row__motivo ${esError ? 'pend-row__motivo--error' : ''}`}>
          {esError && <AlertIcon size={18} />}
          <span>{motivo}</span>
        </p>
      )}

      {!enviandoEste &&
        (confirmando ? (
          <div className="pend-row__confirm" role="group" aria-labelledby={`${id}-pregunta`}>
            <p id={`${id}-pregunta`}>
              ¿Descartar este reporte? Se borra de este teléfono y no se puede deshacer.
            </p>
            <div className="pend-row__actions">
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => void descartar()}
                disabled={trabajando}
              >
                {trabajando ? <Spinner size={18} /> : <TrashIcon size={18} />}
                Sí, descartar
              </button>
              <button
                ref={cancelarRef}
                type="button"
                className="link-button"
                onClick={cancelar}
                disabled={trabajando}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="pend-row__actions">
            {/* Solo donde algo falló; lo que espera se envía solo. */}
            {esError && (
              <button
                type="button"
                className="link-button"
                onClick={() => void reintentar()}
                disabled={trabajando}
                aria-describedby={`${id}-titulo`}
              >
                <RefreshIcon size={18} />
                Reintentar
              </button>
            )}
            <button
              ref={descartarRef}
              type="button"
              className="link-button link-button--quiet"
              onClick={() => setConfirmando(true)}
              disabled={trabajando}
              aria-describedby={`${id}-titulo`}
            >
              <TrashIcon size={18} />
              Descartar
            </button>
            <span id={`${id}-titulo`} className="visually-hidden">
              {pendiente.datos.categoriaNombre}, guardado {haceCuanto(creado)}
            </span>
          </div>
        ))}
    </li>
  )
}

/** Reportes guardados en este teléfono que aún no llegan al servidor. */
export function PendientesDeEnvio() {
  const { pendientes, enviando } = useCola()
  const online = useOnline()
  const seccionRef = useRef<HTMLElement>(null)

  /** Tras descartar, el foco va a la fila que ocupa su lugar, al título o al de la página. */
  const enfocarTrasDescartar = (indice: number) => {
    requestAnimationFrame(() => {
      const seccion = seccionRef.current
      const filas = seccion ? [...seccion.querySelectorAll<HTMLElement>('.pend-row')] : []
      const fila = filas[indice] ?? filas[indice - 1]
      const destino =
        fila?.querySelector<HTMLElement>('.pend-row__actions button') ??
        seccion?.querySelector<HTMLElement>('#pend-titulo') ??
        document.querySelector<HTMLElement>('.page-head__title')
      if (destino && !destino.matches('button')) destino.tabIndex = -1
      destino?.focus()
    })
  }

  if (!pendientes.length) return null

  // Forzar un envío que espera el límite por hora solo traería otro 429.
  const porEnviar = pendientes.some((p) => p.estado === 'pendiente' && p.motivo !== 'limite')

  return (
    <section ref={seccionRef} className="pend" aria-labelledby="pend-titulo">
      <div className="list-head">
        <h2 id="pend-titulo" className="list-head__title" tabIndex={-1}>
          Por enviar <span className="list-head__num">{pendientes.length}</span>
        </h2>
        {porEnviar && (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => void sincronizador.sincronizar({ forzar: true })}
            disabled={!online || Boolean(enviando)}
            aria-disabled={!online || Boolean(enviando)}
          >
            {enviando ? <Spinner size={20} /> : <CloudUpIcon size={20} />}
            {enviando ? 'Enviando…' : 'Enviar ahora'}
          </button>
        )}
      </div>
      <p className="pend__lead">
        {online
          ? 'Guardados en este teléfono. Se envían solos; si alguno falla, aquí te decimos por qué.'
          : 'Guardados en este teléfono. Se enviarán solos cuando vuelva la conexión.'}
      </p>
      <ul className="report-list">
        {pendientes.map((p, i) => (
          <FilaPendiente
            key={p.clave}
            pendiente={p}
            progreso={enviando?.clave === p.clave ? enviando.progreso : null}
            onDescartado={() => enfocarTrasDescartar(i)}
          />
        ))}
      </ul>
    </section>
  )
}
