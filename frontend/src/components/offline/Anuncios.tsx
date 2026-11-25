import { useCola } from '../../offline/useCola'

/**
 * Región viva única para los cambios de conexión y de la cola ("Se envió 1 reporte
 * pendiente", "Sin conexión…"). Cada anuncio cambia el nodo hijo para que se lea aunque
 * el texto se repita.
 */
export function Anuncios() {
  const { anuncio } = useCola()
  return (
    <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      {anuncio && <span key={anuncio.id}>{anuncio.texto}</span>}
    </div>
  )
}
