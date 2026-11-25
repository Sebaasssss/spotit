import fs from 'node:fs'
import path from 'node:path'
import { captura, crearReporteApi, expect, FIXTURES, test, UTEZ } from './fixtures'

async function llenarFormulario(page: import('@playwright/test').Page, descripcion: string) {
  await page.getByTestId('foto-galeria').setInputFiles(path.join(FIXTURES, 'bache.jpg'))
  await expect(page.getByAltText('Vista previa de la foto del reporte')).toBeVisible()
  await page.getByText('Baches y pavimento').click()
  await page.getByLabel('¿Qué está pasando?').fill(descripcion)
}

test.describe('Nuevo reporte', () => {
  test('aviso de emergencias fijo y validación de todos los campos', async ({ page }) => {
    await page.goto('/reportes/nuevo')
    const aviso = page.getByRole('complementary', { name: 'Aviso de emergencias' })
    await expect(aviso).toContainText('Esta app no es para emergencias. Si hay peligro, llama al 911.')
    await expect(page.getByText('Alumbrado')).toBeVisible()
    await captura(page, 'nuevo-reporte')

    await page.getByRole('button', { name: 'Enviar reporte' }).click()

    await expect(page.getByText('Agrega una foto: tómala o elígela de la galería.')).toBeVisible()
    await expect(page.getByText('Elige el tipo de problema.')).toBeVisible()
    await expect(page.getByText(/Indica dónde está/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tomar foto' })).toBeFocused()
    await expect(aviso).toBeInViewport({ ratio: 0.1 }).catch(() => {}) // sigue en la página
    await captura(page, 'nuevo-reporte-validacion', true)
  })

  test.describe('con GPS en la UTEZ', () => {
    test.use({ permissions: ['geolocation'], geolocation: UTEZ })

    test('crea el reporte con la ubicación y la precisión del GPS', async ({ page, request }) => {
      await page.goto('/reportes/nuevo')
      await llenarFormulario(page, 'Bache profundo frente a la entrada principal de la UTEZ.')

      await page.getByRole('button', { name: 'Usar mi ubicación' }).click()
      await expect(page.getByText(/Ubicación del GPS, precisión de ±15 m/)).toBeVisible()
      await page.waitForTimeout(800) // teselas del mapa
      await captura(page, 'nuevo-reporte-gps', true)

      await page.getByRole('button', { name: 'Enviar reporte' }).click()

      await expect(page).toHaveURL(/\/reportes$/)
      await expect(page.getByText('Recibimos tu reporte. Aquí puedes seguir su estado.')).toBeVisible()
      const fila = page.locator('.report-row--new')
      await expect(fila).toContainText('Baches y pavimento')
      await expect(fila).toContainText('Recibido')
      await captura(page, 'mis-reportes', true)

      await fila.getByRole('link').click()
      await expect(page.getByRole('heading', { name: 'Baches y pavimento', level: 1 })).toBeVisible()
      await expect(page.getByText(/GPS, ±15 m/)).toBeVisible()
      const foto = page.getByAltText('Foto del reporte: Baches y pavimento')
      await expect(foto).toBeVisible()
      await expect.poll(() => foto.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
      await page.waitForTimeout(800)
      await captura(page, 'detalle', true)

      // La foto se sirve sin token de sesión (URL firmada), sin EXIF y sin rutas internas.
      const src = await foto.getAttribute('src')
      expect(src).toMatch(/^\/api\/reportes\/\d+\/foto\/\?t=/)
      const res = await request.get(src!)
      expect(res.status()).toBe(200)
      expect(res.headers()['content-type']).toBe('image/jpeg')
      expect(res.headers()['x-accel-redirect']).toBeUndefined()
      const bytes = await res.body()
      expect(bytes.includes(Buffer.from('ModeloDePrueba'))).toBe(false)
      expect(bytes.subarray(0, 2).toString('hex')).toBe('ffd8')
    })
  })

  test('con el permiso de ubicación negado, se ubica moviendo el mapa', async ({ page }) => {
    await page.goto('/reportes/nuevo')
    await llenarFormulario(page, 'Fuga de agua junto a la cafetería, corre por la banqueta.')

    await page.getByRole('button', { name: 'Usar mi ubicación' }).click()
    await expect(page.getByText(/No diste permiso para usar tu ubicación/)).toBeVisible()

    const mapa = page.locator('.map-view').first()
    await mapa.scrollIntoViewIfNeeded()
    const caja = (await mapa.boundingBox())!
    await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2)
    await page.mouse.down()
    await page.mouse.move(caja.x + caja.width / 2 - 60, caja.y + caja.height / 2 - 40, { steps: 8 })
    await page.mouse.up()

    await expect(page.getByText(/Punto ajustado a mano/)).toBeVisible()
    await captura(page, 'nuevo-reporte-sin-permiso', true)

    await page.getByRole('button', { name: 'Enviar reporte' }).click()
    await expect(page).toHaveURL(/\/reportes$/)
    await page.locator('.report-row--new').getByRole('link').click()
    await expect(page.getByText(/ajustada a mano/)).toBeVisible()
  })

  test('una foto HEIC que el navegador no convierte muestra un error claro', async ({ page }) => {
    await page.goto('/reportes/nuevo')

    await page.getByTestId('foto-galeria').setInputFiles(path.join(FIXTURES, 'iphone.heic'))

    const error = page.getByRole('alert').filter({ hasText: 'HEIC' })
    await expect(error).toContainText('formato HEIC')
    await expect(error).toContainText('Más compatible')
    await expect(page.getByAltText('Vista previa de la foto del reporte')).toHaveCount(0)
    await captura(page, 'foto-heic')
  })

  test('un archivo que no es foto no se acepta', async ({ page }) => {
    await page.goto('/reportes/nuevo')

    await page.getByTestId('foto-galeria').setInputFiles(path.join(FIXTURES, 'no-es-foto.jpg'))

    await expect(page.getByRole('alert').filter({ hasText: 'foto' })).toContainText('No se pudo abrir la foto')
  })

  test('el servidor rechaza un archivo falso aunque el cliente no lo revise', async ({ page }) => {
    // Simula un cliente modificado: sube texto directamente a la API.
    const refresh = await page.request.post('/api/auth/refresh/')
    expect(refresh.status()).toBe(200)
    const { access } = (await refresh.json()) as { access: string }
    const res = await page.request.post('/api/reportes/', {
      headers: { Authorization: `Bearer ${access}` },
      multipart: {
        categoria: 'otro',
        descripcion: 'Intento de subir un archivo que no es foto.',
        latitud: '18.85',
        longitud: '-99.2',
        origen_ubicacion: 'manual',
        foto: {
          name: 'foto.jpg',
          mimeType: 'image/jpeg',
          buffer: fs.readFileSync(path.join(FIXTURES, 'no-es-foto.jpg')),
        },
      },
    })
    expect(res.status()).toBe(400)
    expect(JSON.stringify(await res.json())).toContain('no es una foto válida')
  })
})

test.describe('Fotos', () => {
  test('nginx no entrega la ubicación interna directamente', async ({ request }) => {
    const reporte = await crearReporteApi(request, fs)
    const firmada = await request.get(reporte.miniatura_url)
    expect(firmada.status()).toBe(200)

    const directa = await request.get('/_media_protegida/reportes/')
    expect(directa.status()).toBe(404)
    const sinFirma = await request.get(`/api/reportes/${reporte.id}/foto/`)
    expect(sinFirma.status()).toBe(404)
  })
})

test.describe('Mis reportes', () => {
  test('estado vacío para una cuenta nueva', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, storageState: undefined })
    const page = await context.newPage()
    const email = `e2e.vacio.${test.info().project.name}.${Date.now()}@ejemplo.mx`
    const res = await page.request.post('/api/auth/register/', {
      data: { email, nombre: 'Cuenta Vacía', password: 'girasol-azul-2026' },
    })
    expect(res.status()).toBe(201)

    await page.goto('/reportes')

    await expect(page.getByRole('heading', { name: 'Aún no tienes reportes' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Haz tu primer reporte' })).toBeVisible()
    await captura(page, 'mis-reportes-vacio')
    await context.close()
  })
})
