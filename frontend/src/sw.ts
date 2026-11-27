/// <reference lib="webworker" />
/**
 * Service worker de SpotIt (vite-plugin-pwa, estrategia injectManifest).
 *
 * Se encarga de la caché (precache del shell, caché de lectura de la API y teselas) y de
 * mostrar los avisos push (Fase 7). No renueva la sesión ni envía reportes: la cola la envía
 * la app (ver docs/decisiones.md, "Background Sync queda fuera").
 */

import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import type { WorkboxPlugin } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import {
  CABECERA_GUARDADO,
  CACHE_API,
  CACHE_TESELAS,
  MENSAJE_API_ACTUALIZADA,
  seGuardaEnCache,
} from './offline/cachesNombres'
import { aviso, leerDatos, rutaSegura } from './push/avisoSW'

declare let self: ServiceWorkerGlobalScope

const DIA = 24 * 60 * 60

// El aviso "Hay una versión nueva" (UpdatePrompt) activa la versión en espera.
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting()
})

// --- Shell de la app ---

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    // Estas rutas las atiende Django, no la SPA.
    denylist: [/^\/api\//, /^\/admin(\/|$)/, /^\/django-static\//],
  }),
)

/** Copia con la fecha en que se guardó (la app la muestra sin conexión). */
async function conFecha(response: Response): Promise<Response> {
  const headers = new Headers(response.headers)
  headers.set(CABECERA_GUARDADO, new Date().toISOString())
  return new Response(await response.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

// --- API: stale-while-revalidate ---
// Respuestas que dependen del usuario: la app borra esta caché al cerrar sesión, al caducar
// la sesión y al entrar otra persona. Nunca /api/auth/ ni /api/health/ (seGuardaEnCache).

const fechaYAviso: WorkboxPlugin = {
  cacheWillUpdate: async ({ response }) => (response.status === 200 ? conFecha(response) : null),
  // Si la revalidación trae algo distinto, la pantalla abierta vuelve a pedirlo.
  cacheDidUpdate: async ({ oldResponse, newResponse, request }) => {
    if (!oldResponse || !newResponse) return
    const [antes, ahora] = await Promise.all([
      oldResponse.clone().text(),
      newResponse.clone().text(),
    ])
    if (antes === ahora) return
    const ruta = new URL(request.url).pathname
    for (const cliente of await self.clients.matchAll({ type: 'window' })) {
      cliente.postMessage({ type: MENSAJE_API_ACTUALIZADA, ruta })
    }
  },
}

registerRoute(
  ({ url, request }) =>
    url.origin === self.location.origin &&
    request.method === 'GET' &&
    seGuardaEnCache(url.pathname),
  new StaleWhileRevalidate({
    cacheName: CACHE_API,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      fechaYAviso,
      new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 7 * DIA, purgeOnQuotaError: true }),
    ],
  }),
)

// --- Teselas de OpenStreetMap ---
// Política de uso de OSM: solo se guardan las que la persona ya vio (nada por adelantado),
// se respeta el Cache-Control del servidor de teselas mientras hay conexión y se limita
// el tamaño (500 teselas, unos 10 MB) y la antigüedad (7 días). Las teselas se piden con
// CORS (crossOrigin en Leaflet) para no guardar respuestas opacas, que Chrome cuenta como
// varios MB cada una.

function sigueVigente(response: Response): boolean {
  const guardado = Date.parse(response.headers.get(CABECERA_GUARDADO) ?? '')
  const maxAge = /max-age=(\d+)/.exec(response.headers.get('Cache-Control') ?? '')
  const segundos = maxAge ? Number(maxAge[1]) : DIA
  return Number.isFinite(guardado) && Date.now() - guardado < segundos * 1000
}

const teselaSegunCabeceras: WorkboxPlugin = {
  cacheWillUpdate: async ({ response }) => (response.status === 200 ? conFecha(response) : null),
  // Caducada según el servidor y con red: se pide de nuevo. Sin red: se usa la guardada.
  cachedResponseWillBeUsed: async ({ cachedResponse }) => {
    if (!cachedResponse) return null
    return sigueVigente(cachedResponse) || !self.navigator.onLine ? cachedResponse : null
  },
}

registerRoute(
  ({ url }) => url.hostname === 'tile.openstreetmap.org',
  new CacheFirst({
    cacheName: CACHE_TESELAS,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      teselaSegunCabeceras,
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 7 * DIA, purgeOnQuotaError: true }),
    ],
  }),
)

// --- Avisos push ---
// El servidor manda {title, body, url, tag}; el texto ya es sobrio (sin notas ni datos del
// reporte). La etiqueta por reporte junta avisos del mismo reporte y `renotify` hace que el
// segundo vuelva a sonar en lugar de reemplazar al primero en silencio.

self.addEventListener('push', (event) => {
  let texto: string | null = null
  try {
    texto = event.data?.text() ?? null
  } catch {
    texto = null
  }
  const { titulo, opciones } = aviso(leerDatos(texto))
  event.waitUntil(self.registration.showNotification(titulo, opciones))
})

// Al tocar el aviso: la app abierta va al detalle del reporte; si no hay, se abre.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(
    rutaSegura((event.notification.data as { url?: string } | null)?.url),
    self.location.origin,
  ).href
  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const propia = ventanas.find((c) => new URL(c.url).origin === self.location.origin)
      if (propia) {
        await propia.focus()
        await propia.navigate(url).catch(() => self.clients.openWindow(url))
        return
      }
      await self.clients.openWindow(url)
    })(),
  )
})

// Si el navegador renueva la suscripción, el service worker no puede avisar al servidor (no
// tiene sesión): la app la vuelve a registrar al abrirse (push.sincronizar).
