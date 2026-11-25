import { afterEach, describe, expect, it, vi } from 'vitest'
import { haceCuanto } from './fechas'
import { esHeic, FotoNoValida, MENSAJE_HEIC, prepararFoto } from './foto'
import { GeoError, obtenerUbicacion } from './geo'
import { CENTRO_POR_DEFECTO, parseCentroMapa } from './mapa'

describe('parseCentroMapa', () => {
  it('lee latitud,longitud,zoom', () => {
    expect(parseCentroMapa('18.8502834,-99.2007355,16')).toEqual({
      lat: 18.8502834,
      lng: -99.2007355,
      zoom: 16,
    })
  })

  it.each([
    undefined,
    '',
    '18.85,-99.20',
    '18,85;-99,20;16',
    '95,-99,16',
    '18,-190,16',
    '18,-99,2',
    '18,-99,16.5',
    'a,b,c',
  ])('valor inválido %s → Ciudad de México', (valor) => {
    expect(parseCentroMapa(valor)).toEqual(CENTRO_POR_DEFECTO)
  })
})

describe('foto', () => {
  const heicBytes = new Uint8Array([0, 0, 0, 0x18, ...Array.from('ftypheic', (c) => c.charCodeAt(0))])

  afterEach(() => vi.unstubAllGlobals())

  /** jsdom no decodifica imágenes: se simula un navegador que no puede abrir el archivo. */
  function navegadorSinDecodificar() {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('no decode')))
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} }))
    Object.defineProperty(HTMLImageElement.prototype, 'decode', {
      configurable: true,
      value: () => Promise.reject(new Error('no decode')),
    })
  }

  it('detecta HEIC por tipo, extensión o cabecera', async () => {
    expect(await esHeic(new File(['x'], 'a.jpg', { type: 'image/heic' }))).toBe(true)
    expect(await esHeic(new File(['x'], 'IMG_0001.HEIC', { type: '' }))).toBe(true)
    expect(await esHeic(new File([heicBytes], 'foto.jpg', { type: 'image/jpeg' }))).toBe(true)
    expect(await esHeic(new File(['\xff\xd8\xff'], 'foto.jpg', { type: 'image/jpeg' }))).toBe(false)
  })

  it('rechaza archivos que no son imágenes', async () => {
    await expect(prepararFoto(new File(['hola'], 'notas.txt', { type: 'text/plain' }))).rejects.toThrow(
      /no es una foto/,
    )
  })

  it('HEIC que el navegador no decodifica: error claro, no silencio', async () => {
    navegadorSinDecodificar()

    const archivo = new File([heicBytes], 'IMG_0001.HEIC', { type: 'image/heic' })

    const error = await prepararFoto(archivo).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(FotoNoValida)
    expect((error as Error).message).toBe(MENSAJE_HEIC)
  })

  it('archivo dañado que no es HEIC: mensaje genérico', async () => {
    navegadorSinDecodificar()

    await expect(prepararFoto(new File(['\xff\xd8'], 'a.jpg', { type: 'image/jpeg' }))).rejects.toThrow(
      /dañada/,
    )
  })
})

describe('obtenerUbicacion', () => {
  afterEach(() => vi.unstubAllGlobals())

  function stubGeo(impl: (ok: PositionCallback, fail: PositionErrorCallback) => void) {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: impl },
    })
  }

  const fallo = (code: number) =>
    ({ code, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }) as GeolocationPositionError

  it('devuelve coordenadas y precisión', async () => {
    stubGeo((ok) =>
      ok({ coords: { latitude: 18.85, longitude: -99.2, accuracy: 12 } } as GeolocationPosition),
    )

    await expect(obtenerUbicacion()).resolves.toEqual({ lat: 18.85, lng: -99.2, precision: 12 })
  })

  it.each([
    [1, 'denegado'],
    [2, 'no-disponible'],
    [3, 'tiempo'],
  ])('error %i → %s', async (code, tipo) => {
    stubGeo((_ok, fail) => fail(fallo(code)))

    const error = await obtenerUbicacion().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(GeoError)
    expect((error as GeoError).tipo).toBe(tipo)
  })
})

describe('haceCuanto', () => {
  const ahora = new Date('2026-11-24T12:00:00Z')

  it('formatea tiempos relativos en español', () => {
    expect(haceCuanto('2026-11-24T11:59:30Z', ahora)).toBe('hace un momento')
    expect(haceCuanto('2026-11-24T11:55:00Z', ahora)).toBe('hace 5 minutos')
    expect(haceCuanto('2026-11-23T12:00:00Z', ahora)).toBe('ayer')
    expect(haceCuanto('2026-11-10T12:00:00Z', ahora)).toBe('hace 2 semanas')
    expect(haceCuanto('2026-08-01T12:00:00Z', ahora)).toMatch(/2026/)
  })
})
