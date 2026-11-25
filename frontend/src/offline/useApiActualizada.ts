import { useEffect, useRef } from 'react'
import { MENSAJE_API_ACTUALIZADA } from './cachesNombres'

/**
 * Stale-while-revalidate: la pantalla recibe al instante la copia guardada y el service
 * worker la revalida en segundo plano. Si lo nuevo es distinto, avisa con la ruta y la
 * pantalla vuelve a pedirla (ahora sale ya actualizada de la caché).
 */
export function useApiActualizada(alActualizarse: (ruta: string) => void) {
  const ref = useRef(alActualizarse)
  useEffect(() => {
    ref.current = alActualizarse
  })

  useEffect(() => {
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined
    if (!sw) return
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; ruta?: string } | null
      if (data?.type === MENSAJE_API_ACTUALIZADA && typeof data.ruta === 'string') {
        ref.current(data.ruta)
      }
    }
    sw.addEventListener('message', onMessage)
    return () => sw.removeEventListener('message', onMessage)
  }, [])
}
