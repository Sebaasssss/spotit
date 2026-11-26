/** Nombres compartidos por la app y el service worker (src/sw.ts). */

/** Respuestas GET de la API (categorías, listas, mapa, detalle). Dependen del usuario. */
export const CACHE_API = 'spotit-api-v1'

/** Teselas de OpenStreetMap ya vistas (nunca se descargan por adelantado). */
export const CACHE_TESELAS = 'spotit-teselas-v1'

/** Cabecera que el service worker añade a la copia guardada: cuándo se guardó (ISO). */
export const CABECERA_GUARDADO = 'X-SpotIt-Guardado'

/** Mensaje del service worker cuando la revalidación trae datos distintos a los guardados. */
export const MENSAJE_API_ACTUALIZADA = 'spotit:api-actualizada'

/** Rutas de la API que nunca se guardan: sesión, salud y el panel (lleva emails). */
export const API_SIN_CACHE = [/^\/api\/auth\//, /^\/api\/health\//, /^\/api\/admin\//]

/** Rutas GET de la API que sí se guardan. */
export const API_CON_CACHE = [/^\/api\/categorias\/$/, /^\/api\/reportes\/(mios\/|mapa\/|\d+\/)?$/]

export function seGuardaEnCache(pathname: string): boolean {
  return (
    !API_SIN_CACHE.some((r) => r.test(pathname)) && API_CON_CACHE.some((r) => r.test(pathname))
  )
}
