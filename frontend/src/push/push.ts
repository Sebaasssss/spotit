/**
 * Avisos push en este dispositivo. La preferencia es por dispositivo: activar = suscribir
 * este navegador; desactivar = quitar la suscripción del servidor y del navegador.
 *
 * - El permiso se pide solo cuando la persona toca "Activar" (nunca al abrir la app).
 * - Si lo niega o lo bloquea, no se vuelve a pedir: se explica cómo activarlo.
 * - iOS: solo con la app instalada en la pantalla de inicio (iOS 16.4+).
 */

import { apiFetch, ApiError, postJson } from '../api/client'

export type Soporte =
  | 'disponible'
  /** iPhone o iPad en Safari, sin instalar: Web Push no existe ahí. */
  | 'ios-sin-instalar'
  /** iOS instalado pero anterior a 16.4 (sin PushManager). */
  | 'ios-viejo'
  | 'sin-soporte'

export class PushApagado extends Error {
  constructor() {
    super('Los avisos no están disponibles por ahora.')
    this.name = 'PushApagado'
  }
}

export class PermisoDenegado extends Error {
  constructor() {
    super('Bloqueaste los avisos para SpotIt en este navegador.')
    this.name = 'PermisoDenegado'
  }
}

/** Cerró el diálogo del permiso sin elegir: no es un error, se puede volver a intentar. */
export class PermisoSinRespuesta extends Error {
  constructor() {
    super('No elegiste. Cuando quieras, vuelve a tocar «Activar avisos».')
    this.name = 'PermisoSinRespuesta'
  }
}

const CLAVE_DUENO = 'spotit:push-de'

export function esIOS(): boolean {
  const ua = navigator.userAgent
  // iPadOS se presenta como Mac; se distingue por la pantalla táctil.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

export function estaInstalada(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true
}

export function soporte(): Soporte {
  const tienePush =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (esIOS()) {
    if (!estaInstalada()) return 'ios-sin-instalar'
    return tienePush ? 'disponible' : 'ios-viejo'
  }
  return tienePush ? 'disponible' : 'sin-soporte'
}

export function permiso(): NotificationPermission {
  return 'Notification' in window ? Notification.permission : 'denied'
}

async function registro(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  // `ready` no resuelve si no hay service worker (p. ej. en desarrollo): límite de 5 s.
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 5_000)),
  ])
}

export async function suscripcionActual(): Promise<PushSubscription | null> {
  if (soporte() !== 'disponible') return null
  const reg = await registro()
  return reg ? reg.pushManager.getSubscription() : null
}

/** "BEl6…" (base64url) → bytes, como pide `applicationServerKey`. */
export function claveABytes(clave: string): Uint8Array<ArrayBuffer> {
  const relleno = '='.repeat((4 - (clave.length % 4)) % 4)
  const base64 = (clave + relleno).replace(/-/g, '+').replace(/_/g, '/')
  const binario = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(binario.length))
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}

export async function clavePublica(): Promise<string | null> {
  const { activo, clave } = await apiFetch<{ activo: boolean; clave: string | null }>(
    '/api/push/clave/',
    {},
    { auth: false },
  )
  return activo ? clave : null
}

function registrarEnServidor(sub: PushSubscription) {
  return apiFetch<{ activo: boolean }>('/api/push/suscripciones/', postJson(sub.toJSON()))
}

/** Activa los avisos en este dispositivo. Pide el permiso aquí (en contexto) si hace falta. */
export async function activar(usuario: number): Promise<void> {
  const clave = await clavePublica()
  if (!clave) throw new PushApagado()
  if (permiso() === 'denied') throw new PermisoDenegado()
  const respuesta = await Notification.requestPermission()
  if (respuesta === 'denied') throw new PermisoDenegado()
  if (respuesta !== 'granted') throw new PermisoSinRespuesta()

  const reg = await registro()
  if (!reg) throw new PushApagado()
  let sub = await reg.pushManager.getSubscription()
  sub ??= await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: claveABytes(clave),
  })
  try {
    await registrarEnServidor(sub)
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) throw new PushApagado()
    throw error
  }
  guardarDueno(usuario)
}

/** Desactiva: la quita del servidor (si hay red y sesión) y siempre del navegador. */
export async function desactivar(): Promise<void> {
  const sub = await suscripcionActual()
  if (sub) {
    try {
      await apiFetch<void>('/api/push/suscripciones/', {
        method: 'DELETE',
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
    } catch {
      // Sin red o sin sesión: al quitarla del navegador, el servicio de push responderá
      // 410 al próximo envío y el servidor la borrará.
    }
    await sub.unsubscribe().catch(() => undefined)
  }
  olvidarDueno()
}

/**
 * Al abrir la app con sesión: si la suscripción de este navegador era de otra cuenta, se
 * quita (teléfono compartido); si es de esta, se vuelve a registrar (el navegador puede
 * haberla renovado, y el service worker no puede avisarle al servidor sin sesión).
 */
export async function sincronizar(usuario: number): Promise<void> {
  const sub = await suscripcionActual()
  if (!sub) return
  const dueno = leerDueno()
  if (dueno !== null && dueno !== usuario) {
    await sub.unsubscribe().catch(() => undefined)
    olvidarDueno()
    return
  }
  if (permiso() !== 'granted') return
  await registrarEnServidor(sub).catch(() => undefined)
  guardarDueno(usuario)
}

function leerDueno(): number | null {
  try {
    const valor = localStorage.getItem(CLAVE_DUENO)
    return valor ? Number(valor) : null
  } catch {
    return null
  }
}

function guardarDueno(usuario: number) {
  try {
    localStorage.setItem(CLAVE_DUENO, String(usuario))
  } catch {
    // ignorar
  }
}

function olvidarDueno() {
  try {
    localStorage.removeItem(CLAVE_DUENO)
  } catch {
    // ignorar
  }
}
