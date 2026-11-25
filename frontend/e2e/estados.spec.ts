import fs from 'node:fs'
import path from 'node:path'
import { captura, crearReporteApi, expect, FIXTURES, test } from './fixtures'

/** Estados que no aparecen en el flujo normal: carga, error, envío en curso y estados del reporte. */

test('Mis reportes: esqueleto de carga y error de red con reintento', async ({ page }) => {
  let liberar: () => void = () => {}
  const espera = new Promise<void>((r) => (liberar = r))
  await page.route('**/api/reportes/mios/**', async (route) => {
    await espera
    await route.abort('internetdisconnected')
  })

  await page.goto('/reportes')
  await expect(page.locator('.report-row--skeleton').first()).toBeVisible()
  await captura(page, 'mis-reportes-cargando')
  liberar()

  await expect(page.getByText('Sin conexión: no pudimos cargar tus reportes.')).toBeVisible()
  await captura(page, 'mis-reportes-error')

  await page.unroute('**/api/reportes/mios/**')
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.locator('.report-list, .empty').first()).toBeVisible()
})

test('Nuevo reporte: envío en curso con progreso', async ({ page }) => {
  await page.route('**/api/reportes/', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    await new Promise((r) => setTimeout(r, 2500))
    await route.continue()
  })

  await page.goto('/reportes/nuevo')
  await page.getByTestId('foto-galeria').setInputFiles(path.join(FIXTURES, 'bache.jpg'))
  await expect(page.getByAltText('Vista previa de la foto del reporte')).toBeVisible()
  await page.getByText('Basura y limpieza').click()
  await page.getByLabel('¿Qué está pasando?').fill('Contenedor desbordado junto a la parada.')
  await page.getByRole('button', { name: 'El problema está aquí: usar este punto' }).click()
  await page.getByRole('button', { name: 'Enviar reporte' }).click()

  const boton = page.getByRole('button', { name: /Enviando… \d+ %/ })
  await expect(boton).toBeVisible()
  await expect(boton).toBeDisabled()
  await boton.scrollIntoViewIfNeeded()
  await captura(page, 'nuevo-reporte-enviando')
  await expect(page).toHaveURL(/\/reportes$/, { timeout: 15_000 })
})

test('Estados en proceso y resuelto en la lista y el detalle', async ({ page }) => {
  const reporte = await crearReporteApi(page.request, fs)
  // El cambio de estado es del administrador; aquí se simula la respuesta para ver las pastillas.
  await page.route('**/api/reportes/mios/**', async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    // Un 401 (access caducado) lo reintenta la app tras renovar: se deja pasar tal cual.
    if (!Array.isArray(body.results)) return route.fulfill({ response: res })
    body.results = body.results.map((r: { estado: string }, i: number) => ({
      ...r,
      estado: i === 0 ? 'resuelto' : i === 1 ? 'en_proceso' : r.estado,
    }))
    await route.fulfill({ response: res, json: body })
  })
  await page.route(`**/api/reportes/${reporte.id}/`, async (route) => {
    const res = await route.fetch()
    if (!res.ok()) return route.fulfill({ response: res })
    await route.fulfill({ response: res, json: { ...(await res.json()), estado: 'en_proceso' } })
  })

  await page.goto('/reportes')
  await expect(page.locator('.status-pill--resuelto').first()).toContainText('Resuelto')
  await captura(page, 'mis-reportes-estados', true)

  await page.goto(`/reportes/${reporte.id}`)
  await expect(page.locator('.status-pill--en_proceso')).toContainText('En proceso')
})
