import { useEffect, useRef, useState } from 'react'
import { permiso } from '../../push/push'
import { useAvisos } from '../../push/useAvisos'
import { BellIcon, CheckIcon, Spinner } from '../Icons'
import { MensajeAviso } from './AjusteAvisos'

const CLAVE = 'spotit:oferta-avisos'

function yaSeRespondio() {
  try {
    return localStorage.getItem(CLAVE) !== null
  } catch {
    return true
  }
}

function recordar(valor: 'aceptada' | 'ahora-no' | 'bloqueada') {
  try {
    localStorage.setItem(CLAVE, valor)
  } catch {
    // ignorar
  }
}

/** Tras cerrar la oferta, el foco vuelve al título de la pantalla (no se pierde en el body). */
function enfocarTitulo() {
  requestAnimationFrame(() => {
    const titulo = document.querySelector<HTMLElement>('.page-head__title')
    if (!titulo) return
    titulo.tabIndex = -1
    titulo.focus()
  })
}

/**
 * Tras enviar un reporte: "¿Te avisamos cuando cambie de estado?". Se ofrece una sola vez por
 * dispositivo y solo si se puede (y el permiso no se pidió antes). "Ahora no" no vuelve a
 * preguntar; el ajuste de la portada sigue disponible.
 */
export function OfertaAvisos() {
  const { estado, ocupado, mensaje, activar } = useAvisos()
  const [fase, setFase] = useState<'oferta' | 'activada' | 'cerrada'>(() =>
    yaSeRespondio() ? 'cerrada' : 'oferta',
  )
  const exitoRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (fase === 'activada') exitoRef.current?.focus()
  }, [fase])

  if (fase === 'cerrada') return null
  if (fase === 'activada') {
    return (
      <p ref={exitoRef} tabIndex={-1} className="success-note oferta-avisos__hecho" role="status">
        <CheckIcon size={20} />
        Avisos activados en este teléfono.
      </p>
    )
  }
  // Bloqueado al responder: se deja la explicación a la vista, sin volver a ofrecer.
  const bloqueada = estado.kind === 'bloqueado'
  if (!bloqueada && (estado.kind !== 'listo' || estado.activo || permiso() !== 'default')) return null

  return (
    <section className="oferta-avisos" aria-labelledby="oferta-avisos-titulo">
      <BellIcon size={22} className="oferta-avisos__icono" />
      <div className="oferta-avisos__cuerpo">
        <h2 id="oferta-avisos-titulo" className="oferta-avisos__titulo">
          ¿Te avisamos cuando cambie de estado?
        </h2>
        <p>
          Te mandamos un aviso a este teléfono cuando el equipo atienda tu reporte. Puedes apagarlos
          cuando quieras en Inicio.
        </p>
        {mensaje && <MensajeAviso mensaje={mensaje} />}
        {!bloqueada && (
          <div className="oferta-avisos__acciones">
            <button
              type="button"
              className="btn btn--secondary"
              aria-disabled={ocupado || undefined}
              onClick={async () => {
                if (ocupado) return
                if (await activar()) {
                  recordar('aceptada')
                  setFase('activada')
                } else if (permiso() === 'denied') {
                  recordar('bloqueada') // queda la explicación a la vista; no se vuelve a ofrecer
                }
              }}
            >
              {ocupado ? <Spinner size={20} /> : <BellIcon size={20} />}
              {ocupado ? 'Activando…' : 'Activar avisos'}
            </button>
            <button
              type="button"
              className="link-button link-button--quiet"
              aria-disabled={ocupado || undefined}
              onClick={() => {
                if (ocupado) return
                recordar('ahora-no')
                setFase('cerrada')
                enfocarTitulo()
              }}
            >
              Ahora no
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
