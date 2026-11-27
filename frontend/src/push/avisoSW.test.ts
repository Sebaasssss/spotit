import { describe, expect, it } from 'vitest'
import { aviso, leerDatos, rutaSegura } from './avisoSW'

describe('aviso del service worker', () => {
  it('muestra el texto del servidor con etiqueta por reporte y vuelve a sonar', () => {
    const { titulo, opciones } = aviso(
      leerDatos(
        JSON.stringify({
          title: 'SpotIt',
          body: 'Tu reporte cambió a «En proceso».',
          url: '/reportes/7',
          tag: 'reporte-7',
        }),
      ),
    )

    expect(titulo).toBe('SpotIt')
    expect(opciones).toMatchObject({
      body: 'Tu reporte cambió a «En proceso».',
      tag: 'reporte-7',
      renotify: true,
      lang: 'es-MX',
      data: { url: '/reportes/7' },
    })
  })

  it('sin datos legibles muestra un aviso genérico y no rompe', () => {
    const { titulo, opciones } = aviso(leerDatos('no es json'))
    expect(titulo).toBe('SpotIt')
    expect(opciones.body).toBe('Hay novedades en tu reporte.')
    expect(opciones.renotify).toBeUndefined() // renotify exige etiqueta
  })

  it.each([
    ['/reportes/7', '/reportes/7'],
    ['https://otro-sitio.example/x', '/reportes'],
    ['//otro-sitio.example/x', '/reportes'],
    [undefined, '/reportes'],
  ])('al tocarlo solo abre rutas propias: %s → %s', (entrada, salida) => {
    expect(rutaSegura(entrada)).toBe(salida)
  })
})
