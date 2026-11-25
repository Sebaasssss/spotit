import fs from 'node:fs'
import { captura, crearReporteApi, expect, revisarAccesibilidad, test } from './fixtures'

/** Revisión automática (axe, WCAG 2.2 A/AA) de cada pantalla y sus estados principales. */

test.describe('Accesibilidad sin sesión', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const [ruta, titulo] of [
    ['/entrar', 'Entra'],
    ['/registro', 'Crea tu cuenta'],
  ] as const) {
    test(`${ruta}`, async ({ page }) => {
      await page.goto(ruta)
      await expect(page.getByRole('heading', { name: titulo })).toBeVisible()
      expect(await revisarAccesibilidad(page)).toEqual([])
    })
  }
})

test.describe('Accesibilidad con sesión', () => {
  test('portada', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /Nuevo reporte/ })).toBeVisible()
    await captura(page, 'portada', true)
    expect(await revisarAccesibilidad(page)).toEqual([])
  })

  test('nuevo reporte, en reposo y con errores', async ({ page }) => {
    await page.goto('/reportes/nuevo')
    await expect(page.getByText('Alumbrado')).toBeVisible()
    await page.waitForTimeout(600)
    expect(await revisarAccesibilidad(page)).toEqual([])

    await page.getByRole('button', { name: 'Enviar reporte' }).click()
    await expect(page.getByText('Elige el tipo de problema.')).toBeVisible()
    expect(await revisarAccesibilidad(page)).toEqual([])
  })

  test('mis reportes y detalle', async ({ page }) => {
    const reporte = await crearReporteApi(page.request, fs)

    await page.goto('/reportes')
    await expect(page.locator('.report-row').first()).toBeVisible()
    expect(await revisarAccesibilidad(page)).toEqual([])

    await page.goto(`/reportes/${reporte.id}`)
    await expect(page.getByRole('heading', { name: 'Alumbrado', level: 1 })).toBeVisible()
    await page.waitForTimeout(600)
    expect(await revisarAccesibilidad(page)).toEqual([])
  })

  test('reporte inexistente', async ({ page }) => {
    await page.goto('/reportes/999999')
    await expect(page.getByRole('alert')).toContainText('Este reporte no existe.')
    expect(await revisarAccesibilidad(page)).toEqual([])
  })
})
