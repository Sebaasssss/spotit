import fs from 'node:fs'
import type { Page } from '@playwright/test'
import { crearReporteApi, expect, test } from './fixtures'

/**
 * Arranque en frío: con el perfil guardado la app entra antes de tener access token (vive solo
 * en memoria). Ninguna pantalla debe enviar una petición sin token que acabe en 401; si
 * aparece un 401 aquí es un problema real (ver docs/decisiones.md, "El 401 del arranque").
 */

function registrar401(page: Page) {
  const vistos: string[] = []
  page.on('response', (res) => {
    if (res.status() === 401) vistos.push(`${res.request().method()} ${new URL(res.url()).pathname}`)
  })
  return vistos
}

test('al abrir la app con la sesión guardada no hay ninguna respuesta 401', async ({ page }) => {
  const reporte = await crearReporteApi(page.request, fs)

  // Primera visita: deja el perfil en localStorage, como una persona que ya usó la app.
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /^Hola,/ })).toBeVisible()

  const pantallas: [string, (p: Page) => Promise<void>][] = [
    ['/', (p) => expect(p.getByRole('heading', { name: /^Hola,/ })).toBeVisible()],
    ['/reportes', (p) => expect(p.getByRole('heading', { name: 'Mis reportes', level: 1 })).toBeVisible()],
    [
      `/reportes/${reporte.id}`,
      (p) => expect(p.getByRole('heading', { name: 'Alumbrado', level: 1 })).toBeVisible(),
    ],
    ['/reportes/nuevo', (p) => expect(p.getByText('Baches y pavimento')).toBeVisible()],
    ['/mapa', (p) => expect(p.locator('.rmap-chip, .rmap-cluster').first()).toBeVisible()],
  ]

  for (const [ruta, lista] of pantallas) {
    // Pestaña nueva del mismo navegador = cookie y perfil guardados, sin access en memoria.
    const fria = await page.context().newPage()
    const vistos = registrar401(fria)
    await fria.goto(ruta)
    await lista(fria)
    await fria.waitForLoadState('networkidle')
    expect(vistos, `401 al abrir ${ruta}`).toEqual([])
    await fria.close()
  }
})
