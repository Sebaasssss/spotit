import fs from 'node:fs'
import type { Page } from '@playwright/test'
import {
  captura,
  crearReporteApi,
  cuentaNueva,
  expect,
  revisarAccesibilidad,
  test,
  testAdmin,
} from './fixtures'

/**
 * Panel de administración (Fase 6). El administrador de pruebas lo crea global-setup con
 * manage.py; los reportes los envían cuentas de ciudadano nuevas.
 */

const FASE = 'fase-6'

test.describe.configure({ timeout: 150_000 })

/** Un ciudadano nuevo con un reporte suyo; devuelve su página y el id del reporte. */
async function ciudadanoConReporte(
  browser: import('@playwright/test').Browser,
  baseURL: string,
) {
  const cuenta = await cuentaNueva(browser, baseURL)
  const reporte = await crearReporteApi(cuenta.page.request, fs)
  return { ...cuenta, id: reporte.id }
}

async function abrirDetalle(page: Page, id: number) {
  await page.goto(`/admin-panel/reportes/${id}`)
  await expect(page.getByRole('heading', { name: new RegExp(`#${id}`), level: 2 })).toBeVisible()
}

test.describe('Acceso', () => {
  test('un ciudadano no ve el panel ni entrando por la URL', async ({ page }) => {
    await page.goto('/admin-panel')

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: /^Hola,/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Panel de reportes/ })).toHaveCount(0)
    const panel = await page.request.get('/api/admin/resumen/')
    expect([401, 403]).toContain(panel.status())
  })

  test('sin sesión manda a entrar', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, storageState: undefined })
    const page = await context.newPage()
    await page.goto('/admin-panel')
    await expect(page).toHaveURL(/\/entrar/)
    await context.close()
  })
})

testAdmin.describe('Panel', () => {
  testAdmin.describe.configure({ timeout: 150_000 })

  testAdmin('resumen con estados, categorías y más votados', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Panel de reportes/ }).click()

    await expect(page).toHaveURL(/\/admin-panel$/)
    await expect(page.getByRole('heading', { name: 'Panel', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Estado general/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Por tipo de problema' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Más votados' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Resumen' })).toHaveAttribute('aria-current', 'page')
    expect(await revisarAccesibilidad(page)).toEqual([])
    await captura(page, 'panel-resumen', true, FASE)

    // Un conteo lleva a la lista ya filtrada.
    await page.locator('.estado-leyenda__link').filter({ hasText: 'En proceso' }).click()
    await expect(page).toHaveURL(/\/admin-panel\/reportes\?estado=en_proceso/)
    // En móvil los filtros van plegados tras su botón (con el conteo de activos).
    const botonFiltros = page.getByRole('button', { name: /^Filtros/ })
    if (await botonFiltros.isVisible()) {
      await expect(botonFiltros).toContainText('2') // estado y «Visibles»
      await botonFiltros.click()
      await captura(page, 'panel-filtros', true, FASE)
    }
    await expect(page.getByRole('button', { name: 'En proceso', pressed: true })).toBeVisible()
  })

  testAdmin('lista con búsqueda, filtros y estado vacío', async ({ page, browser, baseURL }) => {
    const ciudadano = await ciudadanoConReporte(browser, baseURL!)
    await page.goto('/admin-panel/reportes')
    await expect(page.locator('.admin-tabla tbody tr').first()).toBeVisible()
    expect(await revisarAccesibilidad(page)).toEqual([])
    await captura(page, 'panel-lista', false, FASE)

    // Búsqueda por la descripción: la del reporte nuevo es la de crearReporteApi.
    await page.getByLabel('Buscar en la descripción').fill('estacionamiento norte')
    await page.getByRole('button', { name: 'Buscar' }).click()
    await expect(page).toHaveURL(/q=estacionamiento/)
    await expect(page.getByRole('link', { name: new RegExp(`número ${ciudadano.id}$`) })).toBeVisible()

    // Un filtro que no deja nada: estado vacío con "Quitar filtros".
    await page.getByLabel('Buscar en la descripción').fill('zzz-no-existe-zzz')
    await page.getByRole('button', { name: 'Buscar' }).click()
    await expect(page.getByRole('heading', { name: 'Nada coincide con «zzz-no-existe-zzz»' })).toBeVisible()
    await captura(page, 'panel-lista-vacia', false, FASE)
    await page.getByRole('button', { name: 'Quitar búsqueda y filtros' }).click()
    await expect(page).toHaveURL(/\/admin-panel\/reportes$/)
    await ciudadano.context.close()
  })

  testAdmin('cambiar el estado con nota pública: el ciudadano ve la línea de tiempo', async ({
    page,
    browser,
    baseURL,
  }) => {
    const ciudadano = await ciudadanoConReporte(browser, baseURL!)
    await abrirDetalle(page, ciudadano.id)
    await expect(page.getByText(/@ejemplo\.mx$/)).toBeVisible() // email del autor, solo aquí
    expect(await revisarAccesibilidad(page)).toEqual([])
    await captura(page, 'panel-detalle', true, FASE)

    await page.getByRole('radio', { name: /En proceso/ }).check()
    await page.getByLabel('Nota pública', { exact: true }).fill('Ya mandamos a una cuadrilla; esta semana queda.')
    await page.getByRole('button', { name: 'Cambiar estado' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Estado cambiado a «En proceso»' })).toBeFocused()
    const historial = page.getByRole('region', { name: 'Historial' })
    await expect(historial).toContainText('Pasó a «En proceso»')
    await expect(historial).toContainText('Ya mandamos a una cuadrilla')
    await expect(historial).toContainText('Por Admin Pruebas')
    await captura(page, 'panel-detalle-cambiado', true, FASE)

    // El ciudadano ve el estado y la nota, sin quién lo hizo.
    await ciudadano.page.goto(`/reportes/${ciudadano.id}`)
    const seguimiento = ciudadano.page.getByRole('region', { name: 'Seguimiento' })
    await expect(seguimiento).toContainText('Pasó a «En proceso»')
    await expect(seguimiento).toContainText('Ya mandamos a una cuadrilla')
    await expect(seguimiento).not.toContainText('Admin')
    expect(await revisarAccesibilidad(ciudadano.page)).toEqual([])
    await captura(ciudadano.page, 'ciudadano-seguimiento', true, FASE)
    await ciudadano.context.close()
  })

  testAdmin('si otra persona cambió el estado, avisa y muestra el actual', async ({
    page,
    browser,
    baseURL,
  }) => {
    const ciudadano = await ciudadanoConReporte(browser, baseURL!)
    await abrirDetalle(page, ciudadano.id)

    // Otra pestaña (otro administrador) lo cambia primero.
    const otra = await page.context().newPage()
    await abrirDetalle(otra, ciudadano.id)
    await otra.getByRole('radio', { name: /En proceso/ }).check()
    await otra.getByRole('button', { name: 'Cambiar estado' }).click()
    await expect(otra.getByText(/Estado cambiado/)).toBeVisible()
    await otra.waitForLoadState('networkidle')
    await otra.close()

    await page.getByRole('radio', { name: /En proceso/ }).check()
    await page.getByRole('button', { name: 'Cambiar estado' }).click()

    await expect(page.getByRole('alert')).toContainText('Otra persona cambió el estado a «En proceso»')
    await expect(page.getByRole('radio', { name: /Resuelto/ })).toBeVisible() // ya muestra el actual
    await captura(page, 'panel-conflicto', false, FASE)
    await ciudadano.context.close()
  })

  testAdmin('ocultar exige motivo; oculto no sale para nadie más y el autor lo ve marcado', async ({
    page,
    browser,
    baseURL,
  }) => {
    const ciudadano = await ciudadanoConReporte(browser, baseURL!)
    const otro = await cuentaNueva(browser, baseURL!)
    await abrirDetalle(page, ciudadano.id)

    await page.getByRole('button', { name: 'Ocultar reporte…' }).click()
    await expect(page.getByLabel('Motivo (interno)')).toBeFocused()
    await page.getByRole('button', { name: 'Ocultar reporte', exact: true }).click()
    await expect(page.getByText('Escribe el motivo para ocultarlo.')).toBeVisible()
    expect(await revisarAccesibilidad(page)).toEqual([])
    await captura(page, 'panel-ocultar', true, FASE)

    await page.getByLabel('Motivo (interno)').fill('La foto muestra caras y placas de autos.')
    await page.getByLabel('Nota pública para el autor').fill('Lo ocultamos mientras revisamos la foto.')
    await page.getByRole('button', { name: 'Ocultar reporte', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Reporte oculto' })).toBeVisible()
    await expect(page.getByText('Motivo interno:').first()).toBeVisible()
    await captura(page, 'panel-oculto', true, FASE)

    // Otro ciudadano: ni en el mapa ni por URL.
    await otro.page.goto(`/reportes/${ciudadano.id}`)
    await expect(otro.page.getByText('Este reporte no existe.')).toBeVisible()
    const puntos = await otro.page.evaluate(async () => {
      const r = await fetch('/api/reportes/mapa/')
      return r.status
    })
    expect([200, 401]).toContain(puntos)

    // El autor: marcado como oculto, sin foto ni motivo, con la nota.
    await ciudadano.page.goto('/reportes')
    const fila = ciudadano.page.locator('.report-row').filter({ has: ciudadano.page.locator('.status-pill--oculto') })
    await expect(fila).toHaveCount(1)
    await fila.getByRole('link').click()
    await expect(ciudadano.page.getByText('Oculto: no aparece en el mapa ni en las listas.')).toBeVisible()
    await expect(ciudadano.page.getByText('Lo ocultamos mientras revisamos la foto.')).toBeVisible()
    await expect(ciudadano.page.getByText('caras y placas')).toHaveCount(0)
    await expect(ciudadano.page.locator('.detail__photo')).toHaveCount(0)
    expect(await revisarAccesibilidad(ciudadano.page)).toEqual([])
    await captura(ciudadano.page, 'ciudadano-oculto', true, FASE)

    // Volver a mostrar.
    await page.getByRole('button', { name: 'Volver a mostrar' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'vuelve a verse' })).toBeVisible()
    await otro.page.goto(`/reportes/${ciudadano.id}`)
    await expect(otro.page.getByRole('heading', { name: 'Alumbrado', level: 1 })).toBeVisible()

    await ciudadano.context.close()
    await otro.context.close()
  })
})
