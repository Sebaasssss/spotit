import { useEffect, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/context'
import { sincronizador, type Instantanea } from './sincronizador'

/** Estado de la cola de la persona con sesión (se actualiza solo). */
export function useCola(): Instantanea {
  return useSyncExternalStore(sincronizador.suscribir, sincronizador.instantanea)
}

/**
 * Conecta la cola con la sesión y con los disparadores de envío:
 * al abrir la app (al tener persona), al volver la conexión y al volver a primer plano.
 * Background Sync queda fuera a propósito (ver docs/decisiones.md).
 */
export function useSincronizacion() {
  const { user } = useAuth()
  const usuario = user?.rol === 'ciudadano' ? user.id : null

  useEffect(() => {
    void sincronizador.setUsuario(usuario)
  }, [usuario])

  useEffect(() => {
    const alVolverConexion = () => {
      sincronizador.anunciar('Conexión recuperada.')
      void sincronizador.sincronizar({ forzar: true })
    }
    const alPerderConexion = () =>
      sincronizador.anunciar('Sin conexión. Lo que envíes se guardará en este teléfono.')
    const alVolverAPrimerPlano = () => {
      if (document.visibilityState === 'visible') void sincronizador.sincronizar()
    }
    window.addEventListener('online', alVolverConexion)
    window.addEventListener('offline', alPerderConexion)
    document.addEventListener('visibilitychange', alVolverAPrimerPlano)
    return () => {
      window.removeEventListener('online', alVolverConexion)
      window.removeEventListener('offline', alPerderConexion)
      document.removeEventListener('visibilitychange', alVolverAPrimerPlano)
    }
  }, [])
}
