import { useId, useRef, useState } from 'react'
import { votarReporte, type Reporte } from '../../api/reportes'
import { alternarVoto, mensajeErrorVoto, textoVotos, type EstadoVoto } from '../../lib/votos'
import { AlertIcon, CheckIcon, VoteIcon } from '../Icons'

type Props = {
  reporte: Pick<Reporte, 'id' | 'votos' | 'votado' | 'puede_votar' | 'es_mio' | 'estado'>
  /** Se llama con el conteo confirmado por el servidor (p. ej. para el mapa). */
  onCambio?: (estado: EstadoVoto) => void
}

/**
 * Voto del reporte. El conteo cambia al instante; si el servidor no lo guarda, vuelve a su
 * estado anterior y lo dice. Botón con `aria-pressed` y nombre fijo ("Votar"): el estado lo
 * anuncia el lector y, a la vista, el relleno verde, el icono de check y el texto del conteo.
 *
 * Montar con `key={reporte.id}` para reiniciarlo al cambiar de reporte.
 */
export function VoteButton({ reporte, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoVoto>({ votos: reporte.votos, votado: reporte.votado })
  const [pendiente, setPendiente] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enVuelo = useRef(false)
  const conteoId = useId()
  const ayudaId = useId()

  const alternar = async () => {
    // Un toque a la vez: el segundo esperaría a un estado que aún no se conoce.
    if (enVuelo.current) return
    enVuelo.current = true
    const anterior = estado
    const optimista = alternarVoto(anterior)
    setEstado(optimista)
    setError(null)
    setPendiente(true)
    try {
      const confirmado = await votarReporte(reporte.id, optimista.votado)
      setEstado(confirmado)
      onCambio?.(confirmado)
    } catch (e) {
      setEstado(anterior)
      setError(mensajeErrorVoto(e, optimista.votado))
    } finally {
      enVuelo.current = false
      setPendiente(false)
    }
  }

  const conteo = textoVotos(estado)

  if (!reporte.puede_votar) {
    let texto = conteo
    if (reporte.es_mio) texto = `Tu reporte · ${conteo.toLowerCase()}`
    else if (reporte.estado === 'resuelto') texto = `${conteo} · ya está resuelto, la votación se cerró`
    return (
      <div className="vote vote--readonly">
        <VoteIcon size={20} />
        <p className="vote__count">{texto}</p>
      </div>
    )
  }

  return (
    <div className="vote">
      <div className="vote__row">
        <button
          type="button"
          className={`vote__btn ${estado.votado ? 'is-on' : ''}`}
          aria-pressed={estado.votado}
          aria-describedby={`${conteoId} ${ayudaId}`}
          aria-disabled={pendiente || undefined}
          onClick={() => void alternar()}
        >
          {estado.votado ? <CheckIcon size={20} /> : <VoteIcon size={20} />}
          <span>Votar</span>
        </button>
        <p id={conteoId} className="vote__count" aria-live="polite">
          {conteo}
        </p>
      </div>
      <p id={ayudaId} className="vote__help">
        {estado.votado
          ? 'Vuelve a tocar para quitar tu voto.'
          : 'Vota si también te afecta: ayuda a decidir qué se atiende primero.'}
      </p>
      {error && (
        <p className="vote__error" role="alert">
          <AlertIcon size={18} />
          {error}
        </p>
      )}
    </div>
  )
}
