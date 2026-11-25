/**
 * La caché de lectura de la API vista desde la app (la llena el service worker).
 *
 * Las respuestas dependen de quién pregunta (`es_mio`, `votado`), así que la caché se
 * borra al cerrar sesión, al caducar la sesión y cuando entra una persona distinta.
 * Tras votar o enviar un reporte se borran las entradas afectadas para no ver datos viejos.
 */

import { CACHE_API, CABECERA_GUARDADO } from './cachesNombres'

const CLAVE_DUENO = 'spotit:cache-api-de'

function hayCaches() {
  return typeof caches !== 'undefined'
}

export async function borrarCacheApi(): Promise<void> {
  if (!hayCaches()) return
  try {
    await caches.delete(CACHE_API)
  } catch {
    // sin acceso a Cache Storage (modo privado estricto): no hay nada que borrar
  }
}

async function borrarSi(debeBorrarse: (pathname: string) => boolean): Promise<void> {
  if (!hayCaches()) return
  try {
    if (!(await caches.has(CACHE_API))) return
    const cache = await caches.open(CACHE_API)
    for (const request of await cache.keys()) {
      if (debeBorrarse(new URL(request.url).pathname)) await cache.delete(request)
    }
  } catch {
    // ignorar: en el peor caso se ve una copia vieja hasta la siguiente revalidación
  }
}

const LISTAS = new Set(['/api/reportes/', '/api/reportes/mios/', '/api/reportes/mapa/'])

/** Un reporte nuevo cambia las listas y el mapa. */
export function invalidarTrasCrear() {
  return borrarSi((p) => LISTAS.has(p))
}

/** Un voto cambia el detalle de ese reporte, las listas (conteo) y el mapa. */
export function invalidarTrasVotar(id: number) {
  return borrarSi((p) => LISTAS.has(p) || p === `/api/reportes/${id}/`)
}

/** Copia guardada de un GET, sin tocar la red (arranque sin conexión y sin token). */
export async function leerDeCache(path: string): Promise<Response | undefined> {
  if (!hayCaches()) return undefined
  try {
    if (!(await caches.has(CACHE_API))) return undefined
    const cache = await caches.open(CACHE_API)
    return await cache.match(new URL(path, window.location.origin).href)
  } catch {
    return undefined
  }
}

export function fechaGuardada(response: Response): Date | null {
  const valor = response.headers.get(CABECERA_GUARDADO)
  const fecha = valor ? new Date(valor) : null
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha : null
}

/** Si la caché es de otra persona (o de nadie conocido), se borra antes de usar la sesión. */
export async function prepararCacheParaUsuario(usuario: number): Promise<void> {
  let dueno: string | null = null
  try {
    dueno = localStorage.getItem(CLAVE_DUENO)
  } catch {
    // sin localStorage: por seguridad se borra
  }
  if (dueno === String(usuario)) return
  await borrarCacheApi()
  try {
    localStorage.setItem(CLAVE_DUENO, String(usuario))
  } catch {
    // ignorar
  }
}

/** Cierre de sesión o sesión caducada: nada de lo guardado debe verlo la siguiente persona. */
export async function olvidarCacheApi(): Promise<void> {
  try {
    localStorage.removeItem(CLAVE_DUENO)
  } catch {
    // ignorar
  }
  await borrarCacheApi()
  // Una revalidación del service worker que ya estaba en vuelo puede volver a crearla:
  // se borra otra vez cuando termina. (Además, el siguiente inicio de sesión la borra.)
  setTimeout(() => void borrarCacheApi(), 3_000)
}
