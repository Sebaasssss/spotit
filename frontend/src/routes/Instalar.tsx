import { useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { CheckIcon, PlusIcon, ShareIcon } from '../components/Icons'
import { useAuth } from '../auth/context'
import { esIOS, estaInstalada } from '../push/push'

/** Evento de Chrome/Edge/Android para instalar; Safari no lo tiene (no se asume). */
type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

/**
 * Guía de instalación. En iPhone es la única forma de recibir avisos (iOS 16.4+), así que
 * se explica paso a paso; en Android y escritorio se ofrece el botón del navegador si existe.
 */
export function Instalar() {
  const { status } = useAuth()
  const [evento, setEvento] = useState<EventoInstalar | null>(null)
  const [instalada, setInstalada] = useState(estaInstalada)
  const ios = esIOS()

  useEffect(() => {
    const alOfrecer = (e: Event) => {
      e.preventDefault()
      setEvento(e as EventoInstalar)
    }
    const alInstalar = () => setInstalada(true)
    window.addEventListener('beforeinstallprompt', alOfrecer)
    window.addEventListener('appinstalled', alInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', alOfrecer)
      window.removeEventListener('appinstalled', alInstalar)
    }
  }, [])

  const pasosIOS = (
    <section className="instalar__bloque" aria-labelledby="instalar-ios">
      <h2 id="instalar-ios" className="list-head__title">
        En iPhone o iPad (Safari)
      </h2>
      {/* role="list": con list-style none, Safari/VoiceOver dejaría de anunciarla como lista. */}
      <ol className="instalar__pasos" role="list">
        <li>
          <span className="instalar__num" aria-hidden="true">1</span>
          <span>
            Toca <strong>Compartir</strong> <ShareIcon size={20} className="instalar__icono" /> en la barra
            de Safari. Si no lo ves, abre primero el botón de más opciones de la barra.
          </span>
        </li>
        <li>
          <span className="instalar__num" aria-hidden="true">2</span>
          <span>
            Elige <strong>Agregar a inicio</strong> <PlusIcon size={20} className="instalar__icono" />. Si no
            lo ves, desliza la lista hacia abajo.
          </span>
        </li>
        <li>
          <span className="instalar__num" aria-hidden="true">3</span>
          <span>
            Abre SpotIt <strong>desde el icono</strong> de la pantalla de inicio y activa los avisos en
            Inicio. Necesitas iOS 16.4 o superior.
          </span>
        </li>
      </ol>
    </section>
  )

  const pasosAndroid = (
    <section className="instalar__bloque" aria-labelledby="instalar-android">
      <h2 id="instalar-android" className="list-head__title">
        En Android o en la computadora
      </h2>
      {evento ? (
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={async () => {
            await evento.prompt()
            const { outcome } = await evento.userChoice
            if (outcome === 'accepted') setInstalada(true)
            setEvento(null)
          }}
        >
          <PlusIcon size={22} />
          Instalar SpotIt
        </button>
      ) : (
        <p className="instalar__texto">
          Abre el menú del navegador (los tres puntos, en Chrome) y elige <strong>Instalar app</strong> o{' '}
          <strong>Agregar a la pantalla principal</strong>.
        </p>
      )}
    </section>
  )

  return (
    <div className="page">
      <PageHeader
        title="Instalar SpotIt"
        back={{ to: status === 'authenticated' ? '/' : '/entrar', label: status === 'authenticated' ? 'Inicio' : 'Entrar' }}
        lead="Instalada se abre como una app, funciona sin conexión y, en iPhone, es la única forma de recibir avisos."
      />
      <main className="page__main instalar">
        {instalada ? (
          <p className="success-note" role="status">
            <CheckIcon size={20} />
            Ya estás usando SpotIt instalada.
          </p>
        ) : ios ? (
          <>
            {pasosIOS}
            {pasosAndroid}
          </>
        ) : (
          <>
            {pasosAndroid}
            {pasosIOS}
          </>
        )}
      </main>
    </div>
  )
}
