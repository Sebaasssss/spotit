import { useEffect } from 'react'
import { fetchCategorias } from '../../api/reportes'
import { useAuth } from '../../auth/context'
import { useSincronizacion } from '../../offline/useCola'
import { Anuncios } from './Anuncios'

/**
 * Una sola vez para toda la app: conecta la cola con la sesión y sus disparadores, y monta
 * la región viva de anuncios. También deja las categorías en la caché de lectura para que
 * se pueda reportar sin conexión aunque nunca se haya abierto el formulario con señal.
 */
export function ColaGlobal() {
  useSincronizacion()
  const { user } = useAuth()
  const ciudadano = user?.rol === 'ciudadano'

  // Avisos: si la suscripción de este navegador era de otra cuenta se quita; si es de esta,
  // se vuelve a registrar (el navegador pudo renovarla).
  const usuario = ciudadano ? user!.id : null
  useEffect(() => {
    if (usuario === null || !navigator.onLine) return
    void import('../../push/push').then((m) => m.sincronizar(usuario)).catch(() => undefined)
  }, [usuario])

  useEffect(() => {
    if (!ciudadano || !navigator.onLine) return
    const controller = new AbortController()
    fetchCategorias(controller.signal).catch(() => undefined)
    return () => controller.abort()
  }, [ciudadano])

  return <Anuncios />
}
