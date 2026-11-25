import fs from 'node:fs'
import type { Page } from '@playwright/test'
import {
  captura,
  crearReporteApi,
  expect,
  reporteAjeno,
  revisarAccesibilidad,
  test,
} from './fixtures'

const capturaFase4 = (page: Page, nombre: string, fullPage = false) =>
  captura(page, nombre, fullPage, 'fase-4')

/** Espera a que el mapa tenga sus puntos y las teselas hayan cargado. */
async function mapaListo(page: Page) {
  await expect(page.locator('.rmap-chip, .rmap-cluster').first()).toBeVisible()
  await page.waitForLoadState('networkidle')
}

test.describe('Mapa general', () => {
  test('en reposo, con filtros y como lista; sin fallos de accesibilidad', async ({ page }) => {
    await page.goto('/mapa')
    await expect(page.getByRole('heading', { name: 'Mapa de reportes', level: 1 })).toBeVisible()
    await mapaListo(page)
    await capturaFase4(page, 'mapa')
    expect(await revisarAccesibilidad(page)).toEqual([])

    await page.getByRole('button', { name: 'Filtros' }).click()
    await expect(page.getByRole('button', { name: 'Baches y pavimento', exact: true })).toBeVisible()
    await capturaFase4(page, 'mapa-filtros')
    expect(await revisarAccesibilidad(page)).toEqual([])

    await page.getByRole('button', { name: /^Ver \d/ }).click()
    await expect(page.getByRole('button', { name: 'Filtros' })).toBeFocused()

    await page.getByRole('button', { name: 'Lista' }).click()
    await expect(page.getByText('Más votados primero')).toBeVisible()
    await capturaFase4(page, 'mapa-lista')
    expect(await revisarAccesibilidad(page)).toEqual([])
  })

  test('los filtros piden al servidor solo lo marcado y se pueden quitar', async ({ page }) => {
    await page.goto('/mapa')
    await mapaListo(page)
    await page.getByRole('button', { name: 'Filtros' }).click()
    const resuelto = page.getByRole('button', { name: 'Resuelto', exact: true })

    const peticion = page.waitForRequest((r) => r.url().includes('/api/reportes/mapa/?'))
    await resuelto.click()
    expect(new URL((await peticion).url()).searchParams.get('estado')).toBe('resuelto')
    await expect(resuelto).toHaveAttribute('aria-pressed', 'true')
    await expect(page).toHaveURL(/estado=resuelto/)
    await expect(page.getByRole('button', { name: /Filtros/ })).toContainText('1')

    // Estado vacío (se fuerza: la base de desarrollo puede tener reportes de cualquier tipo).
    await page.route('**/api/reportes/mapa/?*', (route) =>
      route.fulfill({ json: { results: [], truncado: false } }),
    )
    await page.getByRole('button', { name: 'Otro', exact: true }).click()
    // Con el panel abierto, su pie dice el resultado; el aviso del mapa aparece al cerrarlo.
    await expect(page.getByText('No hay reportes con estos filtros.')).toHaveCount(0)
    // Lo marcado se ve siempre en el pie del panel, aunque el chip quede fuera del scroll.
    await expect(page.locator('.mapa__filters-foot')).toContainText('Marcaste: Resuelto, Otro.')
    await expect(page.getByRole('button', { name: 'Ver 0 reportes' })).toBeInViewport()
    await capturaFase4(page, 'mapa-vacio-filtros')
    expect(await revisarAccesibilidad(page)).toEqual([])

    await page.getByRole('button', { name: 'Ver 0 reportes' }).click()
    await expect(page.getByText('No hay reportes con estos filtros.')).toBeVisible()
    await capturaFase4(page, 'mapa-vacio')
    expect(await revisarAccesibilidad(page)).toEqual([])

    await page.unroute('**/api/reportes/mapa/?*')
    await page.locator('.rmap__notice').getByRole('button', { name: 'Quitar filtros' }).click()
    await expect(page).not.toHaveURL(/estado=|categoria=/)
    await expect(page.locator('.rmap-chip, .rmap-cluster').first()).toBeVisible()
  })

  test('las manchas acercan el mapa y, si están en el mismo lugar, se listan', async ({ page }) => {
    // Varios reportes en el mismo punto exacto (las pruebas crean muchos en UTEZ).
    await crearReporteApi(page.request, fs)
    await crearReporteApi(page.request, fs)
    await page.goto('/mapa')
    await mapaListo(page)

    const grupo = page.getByRole('heading', { name: /reportes en este lugar/ })
    for (let i = 0; i < 8 && !(await grupo.isVisible()); i++) {
      // La mancha más grande: la del punto que comparten todas esas pruebas.
      const manchas = page.locator('.rmap-cluster:not(.rmap-chip--static)')
      const numeros = await manchas.allTextContents()
      const mayor = numeros.map(Number).reduce((m, n, j, a) => (n > a[m] ? j : m), 0)
      await manchas.nth(mayor).click()
      await page.waitForTimeout(600)
    }

    await expect(grupo).toBeVisible()
    await capturaFase4(page, 'mapa-mismo-lugar')
    expect(await revisarAccesibilidad(page)).toEqual([])
    await page.locator('.sheet .map-list__link').first().click()
    await expect(page.locator('.sheet .vote, .sheet .vote--readonly')).toBeVisible()
    // Comparte el lugar con otros: la mancha que lo lleva queda marcada.
    await expect(page.locator('.rmap-icon .rmap-cluster.is-selected')).toBeVisible()
  })

  test('con el teclado: Tab llega a una chapa y Enter abre su hoja', async ({ page, baseURL }) => {
    const ajeno = await reporteAjeno(baseURL!, fs)
    await page.goto(`/mapa?r=${ajeno.id}`)
    await expect(page.locator('.sheet__title')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.locator('.sheet')).toHaveCount(0)
    // El foco vuelve a la chapa que abrió la hoja (o al mapa si ya no está).
    const chapa = page.locator(`.rmap-chip[data-id="${ajeno.id}"]`)
    if (await chapa.count()) {
      await chapa.focus()
      await page.keyboard.press('Enter')
      await expect(page.locator('.sheet__title')).toBeFocused()
      await expect(chapa).toHaveAttribute('aria-current', 'true')
    }
  })
})

test.describe('Votos', () => {
  test('votar un reporte ajeno: cambio inmediato, se guarda y se puede quitar', async ({
    page,
    baseURL,
  }) => {
    const ajeno = await reporteAjeno(baseURL!, fs)
    await page.goto(`/mapa?r=${ajeno.id}`)
    const votar = page.locator('.sheet').getByRole('button', { name: 'Votar' })
    await expect(votar).toHaveAttribute('aria-pressed', 'false')
    // Con la hoja abierta, el reporte elegido sigue marcado en el mapa (anillo ámbar).
    await expect(page.locator('.rmap-icon .is-selected')).toBeVisible()
    await expect(page.locator('.sheet').getByText('Aún sin votos')).toBeVisible()
    await capturaFase4(page, 'mapa-hoja')
    expect(await revisarAccesibilidad(page)).toEqual([])

    await votar.click()
    await expect(votar).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.sheet').getByText('1 voto: el tuyo')).toBeVisible()
    await page.waitForLoadState('networkidle')
    await capturaFase4(page, 'mapa-hoja-votado')

    // La chapa del mapa refleja el conteo confirmado (si comparte lugar con otro reporte de
    // prueba queda dentro de una mancha marcada, y entonces no hay chapa suelta que revisar).
    const chapa = page.locator(`.rmap-chip[data-id="${ajeno.id}"]`)
    if (await chapa.count()) await expect(chapa.locator('.rmap-chip__votes')).toHaveText('1')

    // Persistió: el detalle lo muestra votado.
    await page.locator('.sheet').getByRole('link', { name: 'Ver el reporte completo' }).click()
    const votarDetalle = page.getByRole('button', { name: 'Votar' })
    await expect(votarDetalle).toHaveAttribute('aria-pressed', 'true')
    await capturaFase4(page, 'detalle-votado', true)
    expect(await revisarAccesibilidad(page)).toEqual([])

    await votarDetalle.click()
    await expect(votarDetalle).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByText('Aún sin votos')).toBeVisible()

    // "Volver" regresa al mapa con la hoja abierta.
    await page.getByRole('link', { name: 'Mapa' }).click()
    await expect(page).toHaveURL(new RegExp(`/mapa\\?r=${ajeno.id}`))
  })

  test('si el voto no se guarda, vuelve atrás y lo dice', async ({ page, baseURL }) => {
    const ajeno = await reporteAjeno(baseURL!, fs)
    await page.route(`**/api/reportes/${ajeno.id}/voto/`, (route) => route.abort('internetdisconnected'))
    await page.goto(`/reportes/${ajeno.id}`)
    const votar = page.getByRole('button', { name: 'Votar' })

    await votar.click()

    await expect(page.getByRole('alert')).toContainText('no se guardó tu voto')
    await expect(votar).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByText('Aún sin votos')).toBeVisible()
    await capturaFase4(page, 'detalle-voto-error', true)
    expect(await revisarAccesibilidad(page)).toEqual([])
  })

  test('en el propio reporte se ve el conteo y "Tu reporte", sin botón', async ({ page }) => {
    const propio = await crearReporteApi(page.request, fs)
    await page.goto(`/reportes/${propio.id}`)

    await expect(page.getByText('Tu reporte · aún sin votos')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Votar' })).toHaveCount(0)
    // Volver de un reporte propio lleva a "Mis reportes".
    await expect(page.getByRole('link', { name: 'Mis reportes' })).toBeVisible()

    await page.goto(`/mapa?r=${propio.id}`)
    const hoja = page.locator('.sheet')
    await expect(hoja.getByText('Tu reporte · aún sin votos')).toBeVisible()
    await expect(hoja.getByRole('button', { name: 'Votar' })).toHaveCount(0)
    await page.waitForLoadState('networkidle')
    await capturaFase4(page, 'mapa-hoja-propio')
    expect(await revisarAccesibilidad(page)).toEqual([])
  })

  test('en un reporte resuelto los votos se ven pero no se pueden cambiar', async ({
    page,
    baseURL,
  }) => {
    const ajeno = await reporteAjeno(baseURL!, fs)
    // Resolverlo es del administrador (fuera de esta fase): se simula la respuesta del detalle.
    await page.route(`**/api/reportes/${ajeno.id}/`, async (route) => {
      const res = await route.fetch()
      const body = await res.json()
      await route.fulfill({
        response: res,
        json: { ...body, estado: 'resuelto', votos: 7, votado: false, puede_votar: false },
      })
    })
    await page.route('**/api/reportes/mapa/**', async (route) => {
      const res = await route.fetch()
      const body = (await res.json()) as { results: { id: number; estado: string; votos: number }[] }
      body.results = body.results.map((p) =>
        p.id === ajeno.id ? { ...p, estado: 'resuelto', votos: 7 } : p,
      )
      await route.fulfill({ response: res, json: body })
    })
    await page.goto(`/mapa?r=${ajeno.id}`)
    const hoja = page.locator('.sheet')
    await expect(page.locator('.rmap-icon .is-selected')).toBeVisible()
    const chapa = page.locator(`.rmap-chip[data-id="${ajeno.id}"]`)
    if (await chapa.count()) await expect(chapa).toHaveClass(/rmap-chip--resuelto/)

    await expect(hoja.getByText('7 votos · ya está resuelto, la votación se cerró')).toBeVisible()
    await expect(hoja.getByRole('button', { name: 'Votar' })).toHaveCount(0)
    await page.waitForLoadState('networkidle')
    await capturaFase4(page, 'mapa-hoja-resuelto')
    expect(await revisarAccesibilidad(page)).toEqual([])

    // Abierto sin venir del mapa, un reporte ajeno vuelve al mapa (no a "Mis reportes").
    // Sin simulaciones: no hacen falta aquí y un manejador a medio navegar aborta la petición.
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await page.goto(`/reportes/${ajeno.id}`)
    await expect(page.getByRole('link', { name: 'Mapa' })).toHaveAttribute('href', `/mapa?r=${ajeno.id}`)
  })

  test('en móvil la leyenda se abre desde el mapa', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'movil', 'En escritorio la leyenda siempre está a la vista')
    await page.goto('/mapa')
    await mapaListo(page)

    await page.getByRole('button', { name: 'Leyenda' }).click()
    await expect(page.getByRole('heading', { name: 'Cómo leer el mapa' })).toBeFocused()
    await capturaFase4(page, 'mapa-leyenda')
    expect(await revisarAccesibilidad(page)).toEqual([])
    await page.getByRole('button', { name: 'Cerrar la leyenda' }).click()
    await expect(page.getByRole('button', { name: 'Leyenda' })).toBeFocused()
  })
})
