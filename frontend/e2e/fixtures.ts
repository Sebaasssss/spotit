import AxeBuilder from '@axe-core/playwright'
import { test as base, expect, request, type APIRequestContext, type Page } from '@playwright/test'
import path from 'node:path'

export const PASSWORD = 'girasol-azul-2026'
export const UTEZ = { latitude: 18.8502834, longitude: -99.2007355, accuracy: 15 }
export const FIXTURES = path.join(import.meta.dirname, 'fixtures')
export const CAPTURAS = process.env.CAPTURAS === '1'

export const ADMIN_EMAIL = 'e2e.admin@ejemplo.mx'

export function estadoPath(proyecto: string) {
  return path.join('e2e', '.auth', `${proyecto}.json`)
}

export function estadoAdminPath(proyecto: string) {
  return path.join('e2e', '.auth', `admin-${proyecto}.json`)
}

/**
 * Cada prueba arranca con la sesión que dejó la anterior y, al terminar, guarda la sesión
 * rotada (el refresh token cambia en cada uso y el anterior deja de valer).
 */
/** Prueba con una sesión guardada que rota en cada uso y se vuelve a guardar al terminar. */
function conSesion(ruta: (proyecto: string) => string) {
  return base.extend({
    storageState: async ({}, use, testInfo) => {
      await use(ruta(testInfo.project.name))
    },
    page: async ({ page, storageState }, use, testInfo) => {
      await use(page)
      // Solo si la prueba usó la sesión compartida (las de "sin sesión" la sobrescribirían vacía).
      const compartida = ruta(testInfo.project.name)
      if (storageState === compartida) {
        // Espera a que termine el refresh que la app lanza al cargar: si se guarda antes, la
        // cookie guardada es la anterior a la rotación y la siguiente prueba arranca sin sesión.
        await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
        await page.context().storageState({ path: compartida })
      }
    },
  })
}

/**
 * Cada prueba arranca con la sesión que dejó la anterior y, al terminar, guarda la sesión
 * rotada (el refresh token cambia en cada uso y el anterior deja de valer).
 */
export const test = conSesion(estadoPath)

/** Igual, con la sesión del administrador de pruebas. */
export const testAdmin = conSesion(estadoAdminPath)

export { expect }

/** Guarda una captura en docs/capturas/ solo con CAPTURAS=1. */
export async function captura(page: Page, nombre: string, fullPage = false, fase = 'fase-3') {
  if (!CAPTURAS) return
  const proyecto = test.info().project.name
  await page.screenshot({
    path: path.join('..', 'docs', 'capturas', `${fase}-${proyecto}-${nombre}.png`),
    fullPage,
    animations: 'disabled',
  })
}

/** Revisión automática WCAG 2.2 A/AA con axe. Devuelve un resumen legible de lo que falle. */
export async function revisarAccesibilidad(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  return resultado.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
  )
}

/** Crea un reporte por la API (para pruebas que necesitan uno existente). */
export async function crearReporteApi(
  request: APIRequestContext,
  fs: typeof import('node:fs'),
  donde: { latitude: number; longitude: number } = UTEZ,
) {
  const refresh = await request.post('/api/auth/refresh/')
  expect(refresh.ok()).toBeTruthy()
  const { access } = (await refresh.json()) as { access: string }
  const res = await request.post('/api/reportes/', {
    headers: { Authorization: `Bearer ${access}` },
    multipart: {
      categoria: 'alumbrado',
      descripcion: 'Luminaria fundida junto al estacionamiento norte.',
      latitud: String(donde.latitude),
      longitud: String(donde.longitude),
      precision_m: '15',
      origen_ubicacion: 'gps',
      foto: {
        // Foto sintética coherente con la categoría (luminaria apagada).
        name: 'luminaria.jpg',
        mimeType: 'image/jpeg',
        buffer: fs.readFileSync(path.join(FIXTURES, 'luminaria.jpg')),
      },
    },
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as { id: number; foto_url: string; miniatura_url: string }
}

/**
 * Crea un reporte de OTRA persona (cuenta nueva, contexto aparte) en un punto propio, para
 * poder votarlo: el propio no se vota. No toca la sesión compartida de las pruebas.
 */
export async function reporteAjeno(baseURL: string, fs: typeof import('node:fs')) {
  const otra = await request.newContext({ baseURL })
  const email = `e2e.otra.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@ejemplo.mx`
  const res = await otra.post('/api/auth/register/', {
    data: { email, nombre: 'Otra Persona', password: PASSWORD },
  })
  expect(res.status(), await res.text()).toBe(201)
  // Lejos del punto de las demás pruebas y repartido en ~10 × 10 km, para que rara vez quede
  // a menos de unos metros de otro reporte de prueba (entonces ni el zoom máximo los separa).
  const donde = {
    latitude: UTEZ.latitude + 0.02 + Math.random() * 0.09,
    longitude: UTEZ.longitude + 0.02 + Math.random() * 0.09,
  }
  const reporte = await crearReporteApi(otra, fs, donde)
  await otra.dispose()
  return reporte
}

/** Access token nuevo con la cookie de `request` (rota el refresh: úsalo con page.request). */
export async function accessDe(request: APIRequestContext) {
  const refresh = await request.post('/api/auth/refresh/')
  expect(refresh.ok(), await refresh.text()).toBeTruthy()
  return ((await refresh.json()) as { access: string }).access
}

/**
 * Cuántos reportes ENVIADOS con esta descripción muestra Mis reportes (para detectar
 * duplicados). Se lee de la propia app y no con `page.request`: renovar la sesión desde la
 * prueba a la vez que la app hace que una respuesta tardía pise la cookie.
 */
export async function contarReportes(page: Page, descripcion: string) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.goto('/reportes')
  await expect(page.getByRole('heading', { name: 'Mis reportes', level: 1 })).toBeVisible()
  await page.waitForLoadState('networkidle').catch(() => {})
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0) // la lista ya cargó
  return page
    .locator('.report-row:not(.pend-row)')
    .filter({ hasText: descripcion })
    .count()
}

/**
 * Cuenta de ciudadano nueva en su propio contexto de navegador, para pruebas que cierran la
 * sesión o necesitan el service worker sin tocar la sesión compartida.
 */
export async function cuentaNueva(
  browser: import('@playwright/test').Browser,
  baseURL: string,
  opciones: import('@playwright/test').BrowserContextOptions = {},
) {
  const api = await request.newContext({ baseURL })
  const email = `e2e.offline.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@ejemplo.mx`
  // El registro tiene límite por minuto: si se alcanza, se espera lo que pide el servidor.
  let res = await api.post('/api/auth/register/', {
    data: { email, nombre: 'Prueba Sin Señal', password: PASSWORD },
  })
  for (let intento = 0; res.status() === 429 && intento < 5; intento++) {
    const espera = Number(res.headers()['retry-after'] ?? '10')
    await new Promise((r) => setTimeout(r, (espera + 1) * 1000))
    res = await api.post('/api/auth/register/', {
      data: { email, nombre: 'Prueba Sin Señal', password: PASSWORD },
    })
  }
  expect(res.status(), await res.text()).toBe(201)
  const storageState = await api.storageState()
  await api.dispose()
  const context = await browser.newContext({ ...test.info().project.use, ...opciones, storageState })
  const page = await context.newPage()
  return { context, page, email }
}
