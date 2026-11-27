/**
 * Lógica pura del aviso push que usa el service worker (src/sw.ts). Aparte para poder
 * probarla sin navegador: el servidor manda {title, body, url, tag} y aquí se decide qué
 * se muestra y adónde lleva al tocarlo.
 */

export type DatosAviso = { title?: string; body?: string; url?: string; tag?: string }

export const TITULO_POR_DEFECTO = 'SpotIt'
export const TEXTO_POR_DEFECTO = 'Hay novedades en tu reporte.'

/** El JSON del push, o vacío si no se puede leer (nunca rompe el service worker). */
export function leerDatos(texto: string | null | undefined): DatosAviso {
  if (!texto) return {}
  try {
    const datos: unknown = JSON.parse(texto)
    return datos && typeof datos === 'object' ? (datos as DatosAviso) : {}
  } catch {
    return {}
  }
}

/** Solo rutas propias: un aviso nunca abre otro sitio. */
export function rutaSegura(url: string | undefined): string {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/reportes'
}

/**
 * Título y opciones de `showNotification`. La etiqueta por reporte junta los avisos del
 * mismo reporte y `renotify` hace que el segundo vuelva a sonar en lugar de reemplazar al
 * primero en silencio.
 */
export function aviso(datos: DatosAviso): {
  titulo: string
  opciones: NotificationOptions & { renotify?: boolean }
} {
  const opciones: NotificationOptions & { renotify?: boolean } = {
    body: datos.body || TEXTO_POR_DEFECTO,
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    lang: 'es-MX',
    data: { url: rutaSegura(datos.url) },
  }
  if (datos.tag) {
    opciones.tag = datos.tag
    opciones.renotify = true
  }
  return { titulo: datos.title || TITULO_POR_DEFECTO, opciones }
}
