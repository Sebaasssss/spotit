import fs from 'node:fs'
import path from 'node:path'
import type { Browser, BrowserContext, Page } from '@playwright/test'
import {
  captura,
  contarReportes,
  crearReporteApi,
  cuentaNueva,
  expect,
  FIXTURES,
  PASSWORD,
  revisarAccesibilidad,
  test,
  UTEZ,
} from './fixtures'

/**
 * Modo sin conexión y cola de reportes (Fase 5). La cola vive en IndexedDB y la envía la
 * app (no el service worker); cada reporte lleva su clave de idempotencia, así que repetir
 * un envío nunca lo duplica en el servidor.
 */

const FASE = 'fase-5'

// Margen para esperar el límite de registros por minuto (una cuenta por prueba).
test.describe.configure({ timeout: 150_000 })

function descripcionUnica(que: string) {
  return `${que} (${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)})`
}

async function llenarFormulario(page: Page, descripcion: string) {
  await page.goto('/reportes/nuevo')
  await page.getByTestId('foto-galeria').setInputFiles(path.join(FIXTURES, 'bache.jpg'))
  await expect(page.getByAltText('Vista previa de la foto del reporte')).toBeVisible()
  await page.getByText('Baches y pavimento').click()
  await page.getByLabel('¿Qué está pasando?').fill(descripcion)
  await page.getByRole('button', { name: 'Usar mi ubicación' }).click()
  await expect(page.getByText(/Ubicación del GPS/)).toBeVisible()
}

/** Guarda un reporte sin conexión y deja la página en Mis reportes (aún sin conexión). */
async function guardarSinConexion(page: Page, context: BrowserContext, descripcion: string) {
  await llenarFormulario(page, descripcion)
  await context.setOffline(true)
  await expect(page.getByText(/Estás sin conexión\. Puedes enviar el reporte igual/)).toBeVisible()
  await page.getByRole('button', { name: 'Enviar reporte' }).click()
  await expect(page).toHaveURL(/\/reportes$/)
  await expect(page.getByText(/Tu reporte quedó guardado en este teléfono/)).toBeVisible()
}

function seccionPendientes(page: Page) {
  return page.getByRole('region', { name: /Por enviar/ })
}

/** Peticiones de creación de reportes con su clave y respuesta. */
function registrarEnvios(page: Page) {
  const envios: { clave: string | null; status: number; repetido: boolean }[] = []
  page.on('response', async (res) => {
    const req = res.request()
    if (req.method() !== 'POST' || new URL(res.url()).pathname !== '/api/reportes/') return
    envios.push({
      clave: await req.headerValue('idempotency-key'),
      status: res.status(),
      repetido: (await res.headerValue('idempotent-replayed')) === 'true',
    })
  })
  return envios
}

/**
 * Cada prueba que corta la red usa su propia cuenta y su propio contexto: así un problema de
 * sesión se ve en la prueba que lo causa y no contagia a las demás por la sesión compartida.
 */
const contextos: BrowserContext[] = []

async function cuentaPropia(browser: Browser, baseURL: string) {
  const cuenta = await cuentaNueva(browser, baseURL, {
    permissions: ['geolocation'],
    geolocation: UTEZ,
  })
  contextos.push(cuenta.context)
  return cuenta
}

test.afterEach(async () => {
  await Promise.all(contextos.splice(0).map((c) => c.close().catch(() => {})))
})

test.describe('Cola sin conexión', () => {
  test('sin conexión guarda el reporte, lo muestra pendiente y lo envía solo al volver la señal', async ({ browser, baseURL }) => {
    const { context, page } = await cuentaPropia(browser, baseURL!)
    const descripcion = descripcionUnica('Bache guardado sin señal junto a la cafetería')
    const envios = registrarEnvios(page)
    await guardarSinConexion(page, context, descripcion)

    const pendientes = seccionPendientes(page)
    await expect(pendientes.getByRole('heading', { name: /Por enviar\s*1/ })).toBeVisible()
    const fila = pendientes.getByRole('listitem').filter({ hasText: descripcion })
    await expect(fila).toContainText('Baches y pavimento')
    await expect(fila).toContainText('Por enviar')
    // Lo que espera se envía solo: "Reintentar" es solo para lo que falló.
    await expect(fila.getByRole('button', { name: 'Reintentar' })).toBeHidden()
    await expect(fila.getByRole('button', { name: 'Descartar' })).toBeVisible()
    await expect(page.getByText('Sin conexión · 1 reporte por enviar')).toBeVisible()
    await expect(pendientes.getByRole('button', { name: 'Enviar ahora' })).toBeDisabled()
    expect(envios).toEqual([]) // sin red ni siquiera se intenta
    expect(await revisarAccesibilidad(page)).toEqual([])
    await captura(page, 'pendiente-sin-conexion', true, FASE)

    await context.setOffline(false)

    await expect(pendientes).toBeHidden({ timeout: 20_000 })
    await expect(page.getByRole('status').filter({ hasText: 'Se envió 1 reporte pendiente.' })).toBeAttached()
    await expect(page.locator('.report-row').filter({ hasText: descripcion })).toBeVisible()
    expect(envios).toHaveLength(1)
    expect(envios[0].clave).toMatch(/^[0-9a-f-]{36}$/)
    expect(envios[0].status).toBe(201)
    expect(await contarReportes(page, descripcion)).toBe(1)
  })

  test('si la señal se corta a mitad de la subida, el reintento no duplica el reporte', async ({ browser, baseURL }) => {
    const { page } = await cuentaPropia(browser, baseURL!)
    const descripcion = descripcionUnica('Fuga en el baño de la planta baja')
    const envios = registrarEnvios(page)
    let cortes = 0
    // El servidor recibe y crea el reporte, pero la respuesta nunca llega al teléfono.
    await page.route('**/api/reportes/', async (route) => {
      if (route.request().method() === 'POST' && cortes === 0) {
        cortes++
        await route.fetch()
        await route.abort('connectionreset')
        return
      }
      await route.fallback()
    })

    await llenarFormulario(page, descripcion)
    await page.getByRole('button', { name: 'Enviar reporte' }).click()

    // Quedó guardado (el teléfono no sabe si llegó) y Mis reportes lo reintenta al abrirse:
    // el servidor reconoce la clave y devuelve el mismo reporte.
    await expect(page).toHaveURL(/\/reportes$/)
    await expect(seccionPendientes(page)).toBeHidden({ timeout: 15_000 })
    await expect(page.locator('.report-row').filter({ hasText: descripcion })).toHaveCount(1)

    expect(envios.map((e) => e.status)).toEqual([200]) // el primero se abortó antes de llegar
    expect(envios[0].repetido).toBe(true)
    expect(cortes).toBe(1)
    expect(await contarReportes(page, descripcion)).toBe(1)
  })

  test('los pendientes sobreviven a cerrar la app y se envían al abrirla', async ({ browser, baseURL }) => {
    const { context, page } = await cuentaPropia(browser, baseURL!)
    const descripcion = descripcionUnica('Luminaria fundida en el andador')
    await guardarSinConexion(page, context, descripcion)
    await page.close()

    await context.setOffline(false)
    const nueva = await context.newPage()
    const envios = registrarEnvios(nueva)
    await nueva.goto('/')

    await expect.poll(() => envios.length, { timeout: 15_000 }).toBe(1)
    await expect(nueva.getByText(/por enviar/)).toBeHidden()
    await nueva.waitForLoadState('networkidle') // la sesión compartida se guarda al terminar
    expect(await contarReportes(nueva, descripcion)).toBe(1)
  })

  test('un rechazo del servidor queda con su motivo, se puede descartar o reintentar', async ({ browser, baseURL }) => {
    const { context, page } = await cuentaPropia(browser, baseURL!)
    const aDescartar = descripcionUnica('Bache que se va a descartar')
    const aReintentar = descripcionUnica('Bache que se reintenta después')
    // El servidor rechaza la foto de todo envío mientras dure esta ruta.
    await page.route('**/api/reportes/', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ foto: ['La foto no se pudo leer. Elige otra.'] }),
          })
        : route.fallback(),
    )
    await guardarSinConexion(page, context, aDescartar)
    await context.setOffline(false)
    await guardarSinConexion(page, context, aReintentar)
    await context.setOffline(false)

    const pendientes = seccionPendientes(page)
    const filaDescartar = pendientes.getByRole('listitem').filter({ hasText: aDescartar })
    const filaReintentar = pendientes.getByRole('listitem').filter({ hasText: aReintentar })
    await expect(filaDescartar).toContainText('No se envió', { timeout: 15_000 })
    await expect(filaDescartar).toContainText('La foto no se pudo leer. Elige otra.')
    await expect(filaReintentar).toContainText('No se envió')
    await expect(page.getByText('2 reportes no se pudieron enviar.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Revisar' })).toBeHidden() // ya está aquí
    expect(await revisarAccesibilidad(page)).toEqual([])
    await captura(page, 'pendientes-con-error', true, FASE)

    // Descartar pide confirmación, en el sitio, y el foco va a la opción segura.
    await filaDescartar.getByRole('button', { name: 'Descartar' }).click()
    await expect(filaDescartar.getByRole('button', { name: 'Cancelar' })).toBeFocused()
    await expect(filaDescartar).toContainText('Se borra de este teléfono y no se puede deshacer.')
    expect(await revisarAccesibilidad(page)).toEqual([])
    await captura(page, 'descartar-confirmacion', true, FASE)
    await filaDescartar.getByRole('button', { name: 'Sí, descartar' }).click()
    await expect(filaDescartar).toBeHidden()
    // El foco no se pierde: pasa a la fila que ocupa su lugar.
    await expect(filaReintentar.getByRole('button', { name: 'Reintentar' })).toBeFocused()
    await expect(page.getByRole('status').filter({ hasText: 'Reporte descartado.' })).toBeAttached()

    // En otra pantalla, la franja avisa del que falta.
    await page.goto('/')
    await expect(page.getByText('1 reporte no se pudo enviar.')).toBeVisible()
    await captura(page, 'franja-error-portada', false, FASE)
    await page.getByRole('link', { name: 'Revisar' }).click()

    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await seccionPendientes(page).getByRole('button', { name: 'Reintentar' }).click()
    await expect(seccionPendientes(page)).toBeHidden()

    expect(await contarReportes(page, aReintentar)).toBe(1)
    expect(await contarReportes(page, aDescartar)).toBe(0)
  })

  test('el límite por hora deja el reporte esperando y dice a qué hora se enviará', async ({ browser, baseURL }) => {
    const { context, page } = await cuentaPropia(browser, baseURL!)
    const descripcion = descripcionUnica('Bache que espera el límite por hora')
    await guardarSinConexion(page, context, descripcion)
    await page.route('**/api/reportes/', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 429,
            headers: { 'Retry-After': '1200' },
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Request was throttled.' }),
          })
        : route.fallback(),
    )
    await context.setOffline(false)

    const fila = seccionPendientes(page).getByRole('listitem').filter({ hasText: descripcion })
    await expect(fila).toContainText(/Llegaste al límite de envíos por hora\. Se enviará a las/, {
      timeout: 15_000,
    })
    await expect(fila).not.toContainText('a.m..')
    await expect(fila).toContainText('Por enviar') // espera, no es un error
    await expect(page.getByText('1 reporte por enviar')).toBeVisible()
    // Forzarlo solo traería otro 429: no se ofrece "Enviar ahora" ni "Reintentar".
    await expect(page.getByRole('button', { name: 'Enviar ahora' })).toHaveCount(0)
    await expect(fila.getByRole('button', { name: 'Reintentar' })).toBeHidden()
    await captura(page, 'pendiente-limite', true, FASE)
    expect(await contarReportes(page, descripcion)).toBe(0)
  })

  test('si renovar la sesión falla por red la cola espera; al volver la señal renueva y envía', async ({ browser, baseURL }) => {
    const { context, page } = await cuentaPropia(browser, baseURL!)
    const descripcion = descripcionUnica('Coladera tapada en la entrada')
    await guardarSinConexion(page, context, descripcion)
    await page.close()

    // App recién abierta (sin access en memoria) y el refresh no llega al servidor.
    await context.setOffline(false)
    await context.route('**/api/auth/refresh/', (route) => route.abort('internetdisconnected'))
    const nueva = await context.newPage()
    const envios = registrarEnvios(nueva)
    await nueva.goto('/reportes')
    const fila = seccionPendientes(nueva).getByRole('listitem').filter({ hasText: descripcion })
    await expect(fila).toContainText('Se cortó la señal al enviarlo. Lo volvemos a intentar.')
    expect(envios).toEqual([]) // no se envió nada sin token

    await context.unrouteAll({ behavior: 'ignoreErrors' })
    await context.setOffline(true)
    await context.setOffline(false) // evento `online`: renueva la sesión y envía

    await expect(seccionPendientes(nueva)).toBeHidden({ timeout: 15_000 })
    expect(envios.map((e) => e.status)).toEqual([201])
    await nueva.waitForLoadState('networkidle') // la sesión compartida se guarda al terminar
    expect(await contarReportes(nueva, descripcion)).toBe(1)
  })
})

test.describe('Cerrar sesión con pendientes', () => {
  test('"Guardarlos y salir" los conserva y se envían al volver a entrar', async ({
    browser,
    baseURL,
  }) => {
    const { context, page, email } = await cuentaNueva(browser, baseURL!, {
      permissions: ['geolocation'],
      geolocation: UTEZ,
    })
    const descripcion = descripcionUnica('Bache que espera a su dueña')
    // Que no se envíe antes de salir: el servidor no responde por ahora.
    await page.route('**/api/reportes/', (route) =>
      route.request().method() === 'POST' ? route.abort('connectionreset') : route.fallback(),
    )
    await guardarSinConexion(page, context, descripcion)
    const renovada = page.waitForResponse(
      (r) => r.url().endsWith('/api/auth/refresh/') && r.status() === 200,
    )
    await context.setOffline(false)
    await renovada // no recargar a mitad de la renovación que dispara `online`
    await page.goto('/')

    await page.getByRole('button', { name: 'Salir' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Tienes 1 reporte sin enviar' })
    await expect(dialogo).toBeVisible()
    await expect(dialogo.getByRole('button', { name: 'Guardarlos y salir' })).toBeFocused()
    expect(await revisarAccesibilidad(page)).toEqual([])
    await captura(page, 'dialogo-salir', false, FASE)

    // Escape cancela sin salir.
    await page.keyboard.press('Escape')
    await expect(dialogo).toBeHidden()
    await expect(page.getByRole('heading', { name: /^Hola,/ })).toBeVisible()

    await page.getByRole('button', { name: 'Salir' }).click()
    await dialogo.getByRole('button', { name: 'Guardarlos y salir' }).click()
    await expect(page).toHaveURL(/\/entrar/)
    await expect(page.getByText(/Hay 1 reporte guardado en este teléfono sin enviar/)).toBeVisible()
    await captura(page, 'entrar-con-guardados', false, FASE)

    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('heading', { name: /^Hola,/ })).toBeVisible()

    await expect.poll(() => contarReportes(page, descripcion), { timeout: 15_000 }).toBe(1)
    await context.close()
  })

  test('"Borrarlos y salir" los quita del teléfono', async ({ browser, baseURL }) => {
    const { context, page, email } = await cuentaNueva(browser, baseURL!, {
      permissions: ['geolocation'],
      geolocation: UTEZ,
    })
    const descripcion = descripcionUnica('Bache en un teléfono compartido')
    // Que no se envíe antes de salir: el servidor no responde por ahora.
    await page.route('**/api/reportes/', (route) =>
      route.request().method() === 'POST' ? route.abort('connectionreset') : route.fallback(),
    )
    await guardarSinConexion(page, context, descripcion)
    const renovada = page.waitForResponse(
      (r) => r.url().endsWith('/api/auth/refresh/') && r.status() === 200,
    )
    await context.setOffline(false)
    await renovada // no recargar a mitad de la renovación que dispara `online`
    await page.goto('/')

    await page.getByRole('button', { name: 'Salir' }).click()
    await page.getByRole('button', { name: 'Borrarlos y salir' }).click()
    await expect(page).toHaveURL(/\/entrar/)
    await expect(page.getByText(/guardado en este teléfono sin enviar/)).toBeHidden()

    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('heading', { name: /^Hola,/ })).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(await contarReportes(page, descripcion)).toBe(0)
    await context.close()
  })
})

test.describe('Caché de lectura del service worker', () => {
  test('sin conexión abre la app, Mis reportes y el mapa con lo guardado y sus teselas', async ({
    browser,
    baseURL,
  }) => {
    const { context, page } = await cuentaNueva(browser, baseURL!, { serviceWorkers: 'allow' })
    const tesela = fs.readFileSync(path.join(FIXTURES, 'tesela.png'))
    const pedidasTeselas: string[] = []
    // Las teselas se sirven localmente (no se cargan los servidores de OSM desde las pruebas).
    await context.route('https://tile.openstreetmap.org/**', (route) => {
      pedidasTeselas.push(route.request().url())
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=86400' },
        body: tesela,
      })
    })
    const reporte = await crearReporteApi(page.request, fs)

    // Primera visita: instala el SW; la segunda ya pasa por él y llena la caché.
    // Cada navegación espera a la red en calma: recargar a mitad de la renovación de la sesión
    // pierde su respuesta (lo que la gracia de 60 s cubre una sola vez).
    await page.goto('/')
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
    await page.waitForLoadState('networkidle')
    await page.reload()
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
    await page.waitForLoadState('networkidle')
    await page.goto('/reportes')
    await expect(page.locator('.report-row').first()).toBeVisible()
    await page.waitForLoadState('networkidle') // si se sale antes, la petición se aborta
    await page.goto('/mapa')
    await expect(page.locator('.rmap-chip, .rmap-cluster').first()).toBeVisible()
    await page.waitForLoadState('networkidle')
    await page.goto(`/reportes/${reporte.id}`)
    await expect(page.getByRole('heading', { name: 'Alumbrado', level: 1 })).toBeVisible()
    await page.waitForLoadState('networkidle')

    // Nunca se guarda nada de /api/auth/ y las teselas no son respuestas opacas.
    const guardado = await page.evaluate(async () => {
      const api = await (await caches.open('spotit-api-v1')).keys()
      const teselas = await (await caches.open('spotit-teselas-v1')).keys()
      const unaTesela = teselas.length ? await caches.match(teselas[0]) : undefined
      return {
        api: api.map((r) => new URL(r.url).pathname),
        teselas: teselas.length,
        teselaOpaca: unaTesela?.type === 'opaque',
      }
    })
    expect(guardado.api.some((p) => p.startsWith('/api/auth/'))).toBe(false)
    expect(guardado.api).toEqual(
      expect.arrayContaining(['/api/categorias/', '/api/reportes/mios/', '/api/reportes/mapa/']),
    )
    expect(guardado.teselas).toBeGreaterThan(0)
    expect(guardado.teselaOpaca).toBe(false)

    // Sin conexión y con la app recién abierta (sin access token en memoria).
    // Una sola pestaña: la primera, al volver la red, renovaría la sesión por su cuenta.
    await page.close()
    await context.setOffline(true)
    const fria = await context.newPage()
    await fria.goto('/reportes')
    await expect(fria.getByText(/Sin conexión: datos guardados el/)).toBeVisible()
    await expect(fria.locator('.report-row').first()).toBeVisible()
    await expect(fria.getByText('Sin conexión.', { exact: true })).toBeVisible()
    await captura(fria, 'mis-reportes-sin-conexion', true, FASE)

    await fria.goto('/mapa')
    await expect(fria.locator('.rmap-chip, .rmap-cluster').first()).toBeVisible()
    await expect(fria.getByText(/Sin conexión: datos guardados el/)).toBeVisible()
    const teselaVisible = fria.locator('.leaflet-tile-loaded').first()
    await expect(teselaVisible).toBeVisible()
    expect(await revisarAccesibilidad(fria)).toEqual([])
    await captura(fria, 'mapa-sin-conexion', false, FASE)

    await fria.goto(`/reportes/${reporte.id}`)
    await expect(fria.getByRole('heading', { name: 'Alumbrado', level: 1 })).toBeVisible()
    await expect(fria.getByText(/Sin conexión: datos guardados el/)).toBeVisible()

    // Al cerrar sesión se borra la caché de lectura (depende de quién la pidió).
    // Se espera la renovación que dispara `online` antes de navegar: recargar justo al
    // volver la red pierde esa respuesta (ver docs/decisiones.md, "refresh perdido").
    const renovada = fria.waitForResponse(
      (r) => r.url().endsWith('/api/auth/refresh/') && r.status() === 200,
    )
    await context.setOffline(false)
    await renovada
    await fria.waitForLoadState('networkidle')
    await fria.goto('/')
    await fria.getByRole('button', { name: 'Salir' }).click()
    await expect(fria).toHaveURL(/\/entrar/)
    await expect.poll(() => fria.evaluate(() => caches.has('spotit-api-v1'))).toBe(false)
    await context.close()
  })
})
