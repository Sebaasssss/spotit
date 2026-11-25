import AxeBuilder from '@axe-core/playwright'
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test'
import path from 'node:path'

export const PASSWORD = 'girasol-azul-2026'
export const UTEZ = { latitude: 18.8502834, longitude: -99.2007355, accuracy: 15 }
export const FIXTURES = path.join(import.meta.dirname, 'fixtures')
export const CAPTURAS = process.env.CAPTURAS === '1'

export function estadoPath(proyecto: string) {
  return path.join('e2e', '.auth', `${proyecto}.json`)
}

/**
 * Cada prueba arranca con la sesión que dejó la anterior y, al terminar, guarda la sesión
 * rotada (el refresh token cambia en cada uso y el anterior deja de valer).
 */
export const test = base.extend({
  storageState: async ({}, use, testInfo) => {
    await use(estadoPath(testInfo.project.name))
  },
  page: async ({ page, storageState }, use, testInfo) => {
    await use(page)
    // Solo si la prueba usó la sesión compartida (las de "sin sesión" la sobrescribirían vacía).
    const compartida = estadoPath(testInfo.project.name)
    if (storageState === compartida) {
      // Espera a que termine el refresh que la app lanza al cargar: si se guarda antes, la
      // cookie guardada es la anterior a la rotación y la siguiente prueba arranca sin sesión.
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
      await page.context().storageState({ path: compartida })
    }
  },
})

export { expect }

/** Guarda una captura en docs/capturas/ solo con CAPTURAS=1. */
export async function captura(page: Page, nombre: string, fullPage = false) {
  if (!CAPTURAS) return
  const proyecto = test.info().project.name
  await page.screenshot({
    path: path.join('..', 'docs', 'capturas', `fase-3-${proyecto}-${nombre}.png`),
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
export async function crearReporteApi(request: APIRequestContext, fs: typeof import('node:fs')) {
  const refresh = await request.post('/api/auth/refresh/')
  expect(refresh.ok()).toBeTruthy()
  const { access } = (await refresh.json()) as { access: string }
  const res = await request.post('/api/reportes/', {
    headers: { Authorization: `Bearer ${access}` },
    multipart: {
      categoria: 'alumbrado',
      descripcion: 'Luminaria fundida junto al estacionamiento norte.',
      latitud: String(UTEZ.latitude),
      longitud: String(UTEZ.longitude),
      precision_m: '15',
      origen_ubicacion: 'gps',
      foto: {
        name: 'bache.jpg',
        mimeType: 'image/jpeg',
        buffer: fs.readFileSync(path.join(FIXTURES, 'bache.jpg')),
      },
    },
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as { id: number; foto_url: string; miniatura_url: string }
}
