import fs from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'
import {
  captura,
  crearReporteApi,
  cuentaNueva,
  expect,
  FIXTURES,
  revisarAccesibilidad,
  test,
  testAdmin,
  UTEZ,
} from './fixtures'

/**
 * Avisos push (Fase 7). El Chromium sin cabeza de Playwright no llega a un servicio de push
 * real y deja el permiso de notificaciones siempre en «denied", así que aquí se simulan el
 * permiso y la suscripción del navegador (PushManager); el servidor y la interfaz son reales.
 * Lo que muestra el service worker se prueba en src/push/avisoSW.test.ts y en el celular.
 */

const FASE = 'fase-7'
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'

test.describe.configure({ timeout: 150_000 })

/** PushManager simulado: suscripción con un endpoint HTTPS falso y conteo de bajas. */
const PUSH_SIMULADO = () => {
  const w = window as unknown as { __bajas: number; PushManager?: { prototype: Record<string, unknown> } }
  w.__bajas = 0
  let sub: object | null = null
  const crear = () => {
    const endpoint = `https://push.ejemplo.test/e2e/${Math.random().toString(36).slice(2)}`
    return {
      endpoint,
      toJSON: () => ({ endpoint, keys: { p256dh: 'BPruebaP256dh', auth: 'pruebaAuth' } }),
      unsubscribe: async () => {
        sub = null
        w.__bajas += 1
        return true
      },
    }
  }
  if (w.PushManager) {
    w.PushManager.prototype.getSubscription = async () => sub
    w.PushManager.prototype.subscribe = async () => (sub = crear())
  }
}

/** Permiso de notificaciones simulado: `default` (se concede al pedirlo) o `denied`. */
const PERMISO = (inicial: string) => {
  let actual = inicial as NotificationPermission
  Object.defineProperty(Notification, 'permission', { get: () => actual })
  Notification.requestPermission = async () => {
    if (actual === 'default') actual = 'granted'
    return actual
  }
}

async function conSW(page: Page) {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  await page.waitForLoadState('networkidle')
  await page.reload()
  await page.waitForLoadState('networkidle')
}

function ajuste(page: Page) {
  return page.getByRole('region', { name: 'Avisos en este teléfono' })
}

test.describe('Ajuste de avisos', () => {
  test('activar y desactivar en este teléfono; se anuncia', async ({ browser, baseURL }) => {
    const { context, page } = await cuentaNueva(browser, baseURL!, { serviceWorkers: 'allow' })
    await context.addInitScript(PUSH_SIMULADO)
    await context.addInitScript(PERMISO, 'default')
    await conSW(page)

    const interruptor = ajuste(page).getByRole('switch', { name: 'Avisos en este teléfono' })
    await expect(interruptor).toHaveAttribute('aria-checked', 'false')
    expect(await revisarAccesibilidad(page)).toEqual([])
    await captura(page, 'ajuste-apagado', true, FASE)

    const alta = page.waitForResponse(
      (r) => r.url().endsWith('/api/push/suscripciones/') && r.request().method() === 'POST',
    )
    await interruptor.click()
    expect((await alta).status()).toBe(201)
    await expect(interruptor).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('status').filter({ hasText: 'Avisos activados en este teléfono.' })).toBeAttached()
    await captura(page, 'ajuste-activo', true, FASE)

    const baja = page.waitForResponse(
      (r) => r.url().endsWith('/api/push/suscripciones/') && r.request().method() === 'DELETE',
    )
    await interruptor.click()
    expect((await baja).status()).toBe(204)
    await expect(interruptor).toHaveAttribute('aria-checked', 'false')
    expect(await page.evaluate(() => (window as unknown as { __bajas: number }).__bajas)).toBe(1)
    await context.close()
  })

  test('si activar falla, lo dice como error y el interruptor sigue apagado', async ({
    browser,
    baseURL,
  }) => {
    const { context, page } = await cuentaNueva(browser, baseURL!, { serviceWorkers: 'allow' })
    await context.addInitScript(PUSH_SIMULADO)
    await context.addInitScript(PERMISO, 'default')
    await page.route('**/api/push/suscripciones/', (route) =>
      route.request().method() === 'POST' ? route.abort('connectionreset') : route.fallback(),
    )
    await conSW(page)

    await ajuste(page).getByRole('switch').click()

    const error = ajuste(page).getByRole('alert')
    await expect(error).toContainText('No se pudieron activar los avisos')
    expect(await error.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(179, 38, 30)')
    await expect(ajuste(page).getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    await captura(page, 'ajuste-error', true, FASE)
    await context.close()
  })

  test('con el permiso bloqueado no lo vuelve a pedir y explica cómo activarlo', async ({
    browser,
    baseURL,
  }) => {
    const { context, page } = await cuentaNueva(browser, baseURL!, { serviceWorkers: 'allow' })
    await context.addInitScript(PUSH_SIMULADO)
    await context.addInitScript(PERMISO, 'denied')
    await conSW(page)

    await expect(ajuste(page)).toContainText('Los avisos están bloqueados para SpotIt')
    await expect(ajuste(page).getByRole('switch')).toHaveCount(0)
    expect(await revisarAccesibilidad(page)).toEqual([])
    await captura(page, 'ajuste-bloqueado', true, FASE)
    await context.close()
  })

  test('en iPhone con Safari sin instalar lo explica y guía la instalación', async ({
    browser,
    baseURL,
  }) => {
    const { context, page } = await cuentaNueva(browser, baseURL!, { userAgent: IPHONE_SAFARI })
    await page.goto('/')

    await expect(ajuste(page)).toContainText(
      'En iPhone los avisos solo funcionan con SpotIt en la pantalla de inicio.',
    )
    expect(await revisarAccesibilidad(page)).toEqual([])
    await captura(page, 'ajuste-iphone', true, FASE)
    await ajuste(page).getByRole('link', { name: 'Cómo instalarla' }).click()
    await expect(page.getByRole('heading', { name: 'Instalar SpotIt', level: 1 })).toBeVisible()
    // En iPhone, los pasos de Safari van primero.
    await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText('En iPhone o iPad (Safari)')
    expect(await revisarAccesibilidad(page)).toEqual([])
    await captura(page, 'instalar-iphone', true, FASE)
    await context.close()
  })

  test('cerrar sesión quita la suscripción de este teléfono', async ({ browser, baseURL }) => {
    const { context, page } = await cuentaNueva(browser, baseURL!, { serviceWorkers: 'allow' })
    await context.addInitScript(PUSH_SIMULADO)
    await context.addInitScript(PERMISO, 'default')
    await conSW(page)
    await ajuste(page).getByRole('switch').click()
    await expect(ajuste(page).getByRole('switch')).toHaveAttribute('aria-checked', 'true')

    const baja = page.waitForRequest(
      (r) => r.url().endsWith('/api/push/suscripciones/') && r.method() === 'DELETE',
    )
    await page.getByRole('button', { name: 'Salir' }).click()
    await baja
    await expect(page).toHaveURL(/\/entrar/)
    await context.close()
  })
})

test.describe('Oferta tras enviar un reporte', () => {

  async function enviarReporte(page: Page) {
    await page.goto('/reportes/nuevo')
    await page.getByTestId('foto-galeria').setInputFiles(path.join(FIXTURES, 'bache.jpg'))
    await expect(page.getByAltText('Vista previa de la foto del reporte')).toBeVisible()
    await page.getByText('Baches y pavimento').click()
    await page.getByLabel('¿Qué está pasando?').fill('Bache profundo junto a la parada del camión.')
    await page.getByRole('button', { name: 'Usar mi ubicación' }).click()
    await expect(page.getByText(/Ubicación del GPS/)).toBeVisible()
    await page.getByRole('button', { name: 'Enviar reporte' }).click()
    await expect(page.getByText('Recibimos tu reporte. Aquí puedes seguir su estado.')).toBeVisible()
  }

  test('se ofrece una vez; «Ahora no» no vuelve a preguntar', async ({ browser, baseURL }) => {
    const { context, page } = await cuentaNueva(browser, baseURL!, {
      serviceWorkers: 'allow',
      permissions: ['geolocation'],
      geolocation: UTEZ,
    })
    await context.addInitScript(PUSH_SIMULADO)
    await context.addInitScript(PERMISO, 'default')
    await conSW(page)
    await enviarReporte(page)

    const oferta = page.getByRole('region', { name: '¿Te avisamos cuando cambie de estado?' })
    await expect(oferta).toBeVisible()
    expect(await revisarAccesibilidad(page)).toEqual([])
    await captura(page, 'oferta', false, FASE)
    await oferta.getByRole('button', { name: 'Ahora no' }).click()
    await expect(oferta).toBeHidden()
    // El foco no se pierde: vuelve al título de la pantalla.
    await expect(page.getByRole('heading', { name: 'Mis reportes', level: 1 })).toBeFocused()

    await enviarReporte(page)
    await expect(page.getByRole('region', { name: '¿Te avisamos cuando cambie de estado?' })).toHaveCount(0)
    await context.close()
  })
})

testAdmin('«Dejar una nota» la ve el ciudadano en su seguimiento', async ({ page, browser, baseURL }) => {
  const ciudadano = await cuentaNueva(browser, baseURL!)
  const reporte = await crearReporteApi(ciudadano.page.request, fs)

  await page.goto(`/admin-panel/reportes/${reporte.id}`)
  await page.getByLabel('Nota pública, sin cambiar el estado').fill('Ya lo revisamos; vamos el lunes.')
  await page.getByRole('button', { name: 'Dejar nota' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Nota enviada' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Historial' })).toContainText('Nota al autor')
  expect(await revisarAccesibilidad(page)).toEqual([])
  await captura(page, 'panel-nota', true, FASE)

  await ciudadano.page.goto(`/reportes/${reporte.id}`)
  const seguimiento = ciudadano.page.getByRole('region', { name: 'Seguimiento' })
  await expect(seguimiento).toContainText('Nota del equipo')
  await expect(seguimiento).toContainText('Ya lo revisamos; vamos el lunes.')
  await ciudadano.context.close()
})
