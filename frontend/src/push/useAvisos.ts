import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/context'
import { sincronizador } from '../offline/sincronizador'
import {
  activar as activarPush,
  clavePublica,
  desactivar as desactivarPush,
  permiso,
  PermisoDenegado,
  PermisoSinRespuesta,
  PushApagado,
  soporte,
  suscripcionActual,
} from './push'

export type EstadoAvisos =
  | { kind: 'cargando' }
  /** El servidor no tiene claves: no se ofrece nada. */
  | { kind: 'apagado' }
  | { kind: 'sin-conexion' }
  | { kind: 'sin-soporte' }
  | { kind: 'ios-sin-instalar' }
  | { kind: 'ios-viejo' }
  /** El permiso está bloqueado: se explica cómo cambiarlo, sin volver a pedirlo. */
  | { kind: 'bloqueado' }
  | { kind: 'listo'; activo: boolean }

export type MensajeAvisos = { texto: string; tono: 'ok' | 'error' }

async function revisar(): Promise<EstadoAvisos> {
  const s = soporte()
  if (s !== 'disponible') return { kind: s }
  try {
    if (!(await clavePublica())) return { kind: 'apagado' }
  } catch {
    return { kind: 'sin-conexion' }
  }
  if (permiso() === 'denied') return { kind: 'bloqueado' }
  const sub = await suscripcionActual()
  return { kind: 'listo', activo: Boolean(sub) && permiso() === 'granted' }
}

/** Estado y acciones de los avisos de este dispositivo. Los cambios se anuncian. */
export function useAvisos() {
  const { user } = useAuth()
  const [estado, setEstado] = useState<EstadoAvisos>({ kind: 'cargando' })
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState<MensajeAvisos | null>(null)

  const actualizar = useCallback(() => {
    let vigente = true
    void revisar().then((nuevo) => vigente && setEstado(nuevo))
    return () => {
      vigente = false
    }
  }, [])

  // Al abrir, al volver a la pestaña (p. ej. tras permitirlos en el navegador) y al volver
  // la señal: el ajuste refleja el estado real sin recargar.
  useEffect(() => {
    let cancelar = actualizar()
    const otraVez = () => {
      cancelar()
      cancelar = actualizar()
    }
    const alVolver = () => document.visibilityState === 'visible' && otraVez()
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('online', otraVez)
    let permisoNavegador: PermissionStatus | null = null
    navigator.permissions
      ?.query({ name: 'notifications' })
      .then((p) => {
        permisoNavegador = p
        p.onchange = otraVez
      })
      .catch(() => undefined)
    return () => {
      cancelar()
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('online', otraVez)
      if (permisoNavegador) permisoNavegador.onchange = null
    }
  }, [actualizar])

  const avisar = (texto: string, tono: MensajeAvisos['tono']) => {
    setMensaje({ texto, tono })
    sincronizador.anunciar(texto)
  }

  /** Devuelve true si quedaron activos. */
  const activar = async (): Promise<boolean> => {
    if (!user || ocupado) return false
    setOcupado(true)
    setMensaje(null)
    try {
      await activarPush(user.id)
      setEstado({ kind: 'listo', activo: true })
      avisar('Avisos activados en este teléfono.', 'ok')
      return true
    } catch (error) {
      if (error instanceof PermisoDenegado) {
        setEstado({ kind: 'bloqueado' })
        avisar('No se activaron: los avisos están bloqueados en este navegador.', 'error')
      } else if (error instanceof PushApagado) {
        setEstado({ kind: 'apagado' })
        avisar(error.message, 'error')
      } else if (error instanceof PermisoSinRespuesta) {
        avisar(error.message, 'error')
      } else {
        avisar('No se pudieron activar los avisos. Revisa tu conexión e inténtalo de nuevo.', 'error')
      }
      return false
    } finally {
      setOcupado(false)
    }
  }

  const desactivar = async (): Promise<boolean> => {
    if (ocupado) return false
    setOcupado(true)
    setMensaje(null)
    try {
      await desactivarPush()
      setEstado({ kind: 'listo', activo: false })
      avisar('Avisos desactivados en este teléfono.', 'ok')
      return true
    } catch {
      avisar('No se pudieron desactivar los avisos. Revisa tu conexión e inténtalo de nuevo.', 'error')
      return false
    } finally {
      setOcupado(false)
    }
  }

  return { estado, ocupado, mensaje, activar, desactivar }
}
