import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NetworkError } from '../api/client'
import type { Reporte } from '../api/reportes'
import { clasificar, espera } from './clasificar'
import { cerrarParaPruebas, cola, ColaLlena, TOPE_PENDIENTES, type Pendiente } from './cola'
import { crearSincronizador, type Dependencias } from './sincronizador'

const ANA = 1
const BETO = 2

const datos = {
  categoria: 'baches-y-pavimento',
  categoriaNombre: 'Baches y pavimento',
  descripcion: 'Bache profundo frente a la biblioteca.',
  latitud: 18.85,
  longitud: -99.2,
  precision_m: 12,
  origen_ubicacion: 'gps' as const,
}

const foto = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3])], { type: 'image/jpeg' })

function reporte(id: number): Reporte {
  return { id } as Reporte
}

let reloj = 1_000_000
let enLinea = true
let claves = 0

function nuevo(enviar: Dependencias['enviar']) {
  return crearSincronizador({
    enviar,
    ahora: () => reloj,
    online: () => enLinea,
    nuevaClave: () => `clave-${++claves}`,
  })
}

function pendiente(clave: string, extra: Partial<Pendiente> = {}): Pendiente {
  return {
    clave,
    usuario: ANA,
    creado: reloj++,
    datos,
    foto: { buffer: new ArrayBuffer(6), tipo: 'image/jpeg' },
    estado: 'pendiente',
    intentos: 0,
    proximoIntento: 0,
    motivo: null,
    error: null,
    ...extra,
  }
}

beforeEach(async () => {
  await cerrarParaPruebas()
  globalThis.indexedDB = new IDBFactory()
  reloj = 1_000_000
  enLinea = true
  claves = 0
})

afterEach(() => {
  vi.useRealTimers()
})

describe('clasificar', () => {
  it('sin red espera con escalones crecientes', () => {
    const d = clasificar(new NetworkError(), 1, 0)
    expect(d).toMatchObject({ tipo: 'esperar', motivo: 'red', hasta: 5_000 })
    expect([1, 2, 3, 4, 9].map(espera)).toEqual([5_000, 30_000, 120_000, 600_000, 600_000])
  })

  it('el 429 respeta Retry-After y dice a qué hora se enviará', () => {
    const d = clasificar(new ApiError(429, 'x', {}, 1800), 1, 0)
    expect(d).toMatchObject({ tipo: 'esperar', motivo: 'limite', hasta: 1_800_000 })
    if (d.tipo === 'esperar') expect(d.mensaje).toMatch(/límite de envíos por hora/)
  })

  it.each([500, 502, 503, 504, 408])('el %i se reintenta', (status) => {
    expect(clasificar(new ApiError(status, 'x'), 2, 0)).toMatchObject({
      tipo: 'esperar',
      motivo: 'servidor',
      hasta: 30_000,
    })
  })

  it('el 401 pausa hasta que vuelva a entrar', () => {
    expect(clasificar(new ApiError(401, 'x'), 1, 0).tipo).toBe('sesion')
  })

  it('una foto inválida es definitiva y muestra el mensaje del servidor', () => {
    const error = new ApiError(400, 'Revisa', { foto: ['Las fotos HEIC no se pueden subir.'] })
    expect(clasificar(error, 1, 0)).toEqual({
      tipo: 'error',
      mensaje: 'Las fotos HEIC no se pueden subir.',
    })
  })

  it.each([
    [413, 'La foto es demasiado grande para enviarse.'],
    [403, 'Tu cuenta no puede crear reportes.'],
  ])('el %i es definitivo', (status, mensaje) => {
    expect(clasificar(new ApiError(status, 'x'), 1, 0)).toEqual({ tipo: 'error', mensaje })
  })
})

describe('cola en IndexedDB', () => {
  it('cada persona ve solo sus pendientes, en orden de creación', async () => {
    await cola.agregar(pendiente('b'))
    await cola.agregar(pendiente('a'))
    await cola.agregar(pendiente('z', { usuario: BETO }))

    expect((await cola.listar(ANA)).map((p) => p.clave)).toEqual(['b', 'a'])
    expect((await cola.listar(BETO)).map((p) => p.clave)).toEqual(['z'])
  })

  it(`no guarda más de ${TOPE_PENDIENTES} por persona`, async () => {
    for (let i = 0; i < TOPE_PENDIENTES; i++) await cola.agregar(pendiente(`p${i}`))

    await expect(cola.agregar(pendiente('extra'))).rejects.toBeInstanceOf(ColaLlena)
    await expect(cola.agregar(pendiente('de-beto', { usuario: BETO }))).resolves.toBeUndefined()
  })

  it('guarda la foto como bytes y la devuelve intacta', async () => {
    const bytes = new Uint8Array([9, 8, 7])
    await cola.agregar(pendiente('f', { foto: { buffer: bytes.buffer, tipo: 'image/jpeg' } }))

    const guardado = await cola.obtener('f')
    expect(new Uint8Array(guardado!.foto.buffer)).toEqual(bytes)
  })

  it('un envío que quedó a medias vuelve a pendiente', async () => {
    await cola.agregar(pendiente('a', { estado: 'enviando' }))
    await cola.agregar(pendiente('b', { estado: 'error' }))

    await cola.recuperarEnviando()

    expect((await cola.obtener('a'))!.estado).toBe('pendiente')
    expect((await cola.obtener('b'))!.estado).toBe('error')
  })

  it('borrar los de una persona no toca los de otra', async () => {
    await cola.agregar(pendiente('a'))
    await cola.agregar(pendiente('z', { usuario: BETO }))

    await cola.borrarDeUsuario(ANA)

    expect(await cola.contar()).toBe(1)
    expect(await cola.contar(BETO)).toBe(1)
  })
})

describe('sincronizador', () => {
  it('envía los pendientes al tener persona, con su clave, y los quita de la cola', async () => {
    await cola.agregar(pendiente('a'))
    await cola.agregar(pendiente('b'))
    const enviar = vi.fn(async (p: Pendiente) => reporte(p.clave === 'a' ? 1 : 2))
    const s = nuevo(enviar)

    await s.setUsuario(ANA)

    expect(enviar.mock.calls.map(([p]) => p.clave)).toEqual(['a', 'b'])
    expect(await cola.contar(ANA)).toBe(0)
    expect(s.instantanea().pendientes).toEqual([])
    expect(s.instantanea().anuncio?.texto).toBe('Se enviaron 2 reportes pendientes.')
    s.detener()
  })

  it('no envía los de otra persona', async () => {
    await cola.agregar(pendiente('z', { usuario: BETO }))
    const enviar = vi.fn(async () => reporte(1))
    const s = nuevo(enviar)

    await s.setUsuario(ANA)

    expect(enviar).not.toHaveBeenCalled()
    expect(await cola.contar(BETO)).toBe(1)
    s.detener()
  })

  it('sin conexión no intenta nada y conserva todo', async () => {
    enLinea = false
    await cola.agregar(pendiente('a'))
    const enviar = vi.fn(async () => reporte(1))
    const s = nuevo(enviar)

    await s.setUsuario(ANA)

    expect(enviar).not.toHaveBeenCalled()
    expect(s.instantanea().pendientes).toHaveLength(1)
    s.detener()
  })

  it('un corte de red deja el pendiente con su espera y detiene la vuelta', async () => {
    await cola.agregar(pendiente('a'))
    await cola.agregar(pendiente('b'))
    const enviar = vi.fn(async () => {
      throw new NetworkError()
    })
    const s = nuevo(enviar)

    await s.setUsuario(ANA)

    expect(enviar).toHaveBeenCalledTimes(1)
    const a = await cola.obtener('a')
    expect(a).toMatchObject({ estado: 'pendiente', intentos: 1, motivo: 'red' })
    expect(a!.proximoIntento).toBe(reloj + 5_000)
    expect((await cola.obtener('b'))!.intentos).toBe(0)
    s.detener()
  })

  it('al abrir la app o entrar lo intenta ya, aunque su espera no haya terminado', async () => {
    await cola.agregar(pendiente('a', { intentos: 3, proximoIntento: reloj + 600_000 }))
    const enviar = vi.fn(async (_p: Pendiente) => reporte(7))
    const s = nuevo(enviar)

    await s.setUsuario(ANA)

    expect(enviar).toHaveBeenCalledTimes(1)
    s.detener()
  })

  it('al volver la conexión reintenta ya con la misma clave aunque no toque', async () => {
    const enviar = vi.fn(async (_p: Pendiente) => reporte(7))
    const s = nuevo(enviar)
    await s.setUsuario(ANA)
    await cola.agregar(pendiente('a', { intentos: 3, proximoIntento: reloj + 600_000 }))
    await s.sincronizar()
    expect(enviar).not.toHaveBeenCalled() // aún no toca

    await s.sincronizar({ forzar: true })

    expect(enviar).toHaveBeenCalledTimes(1)
    expect(enviar.mock.calls[0][0].clave).toBe('a')
    expect(await cola.contar(ANA)).toBe(0)
    s.detener()
  })

  it('con el temporizador reintenta solo cuando le toca', async () => {
    // Solo setTimeout: fake-indexeddb usa setImmediate y debe seguir funcionando.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await cola.agregar(pendiente('a'))
    let falla = true
    const enviar = vi.fn(async () => {
      if (falla) throw new NetworkError()
      return reporte(1)
    })
    const s = nuevo(enviar)
    await s.setUsuario(ANA)
    expect(enviar).toHaveBeenCalledTimes(1)

    falla = false
    reloj += 5_000
    await vi.advanceTimersByTimeAsync(5_000)
    await vi.waitFor(async () => expect(await cola.contar(ANA)).toBe(0))

    expect(enviar).toHaveBeenCalledTimes(2)
    s.detener()
  })

  it('el límite por hora deja el pendiente esperando, no en error', async () => {
    await cola.agregar(pendiente('a'))
    const s = nuevo(async () => {
      throw new ApiError(429, 'x', {}, 120)
    })

    await s.setUsuario(ANA)

    expect(await cola.obtener('a')).toMatchObject({
      estado: 'pendiente',
      motivo: 'limite',
      proximoIntento: reloj + 120_000,
    })
    s.detener()
  })

  it('forzar el envío nunca adelanta la espera del límite por hora', async () => {
    await cola.agregar(pendiente('a'))
    const enviar = vi.fn(async (_p: Pendiente): Promise<Reporte> => {
      throw new ApiError(429, 'x', {}, 1200)
    })
    const s = nuevo(enviar)
    await s.setUsuario(ANA)

    await s.sincronizar({ forzar: true })

    expect(enviar).toHaveBeenCalledTimes(1)
    s.detener()
  })

  it('un rechazo por datos queda en error y la vuelta sigue con los demás', async () => {
    await cola.agregar(pendiente('mala'))
    await cola.agregar(pendiente('buena'))
    const s = nuevo(async (p) => {
      if (p.clave === 'mala') throw new ApiError(400, 'x', { foto: ['La foto no es válida.'] })
      return reporte(2)
    })

    await s.setUsuario(ANA)

    expect(await cola.obtener('mala')).toMatchObject({
      estado: 'error',
      error: 'La foto no es válida.',
    })
    expect(await cola.obtener('buena')).toBeUndefined()
    s.detener()
  })

  it('un pendiente en error no se reenvía solo, pero sí con "Reintentar"', async () => {
    await cola.agregar(pendiente('a', { estado: 'error', error: 'x' }))
    const enviar = vi.fn(async () => reporte(1))
    const s = nuevo(enviar)
    await s.setUsuario(ANA)
    await s.sincronizar({ forzar: true })
    expect(enviar).not.toHaveBeenCalled()

    await s.reintentar('a')

    expect(enviar).toHaveBeenCalledTimes(1)
    expect(await cola.contar(ANA)).toBe(0)
    s.detener()
  })

  it('con la sesión inválida se queda esperando sin contar el intento', async () => {
    await cola.agregar(pendiente('a'))
    const s = nuevo(async () => {
      throw new ApiError(401, 'x')
    })

    await s.setUsuario(ANA)

    expect(await cola.obtener('a')).toMatchObject({
      estado: 'pendiente',
      motivo: 'sesion',
      intentos: 0,
    })
    s.detener()
  })

  it('"Descartar" lo borra y lo anuncia', async () => {
    await cola.agregar(pendiente('a', { estado: 'error' }))
    const s = nuevo(async () => reporte(1))
    await s.setUsuario(ANA)

    expect(await s.descartar('a')).toBe(true)

    expect(await cola.contar(ANA)).toBe(0)
    expect(s.instantanea().anuncio?.texto).toBe('Reporte descartado.')
    s.detener()
  })

  it('dos vueltas a la vez no envían dos veces el mismo pendiente', async () => {
    await cola.agregar(pendiente('a'))
    let soltar!: () => void
    const enviar = vi.fn(
      () => new Promise<Reporte>((resolve) => (soltar = () => resolve(reporte(1)))),
    )
    const s = nuevo(enviar)
    const primera = s.setUsuario(ANA)
    await vi.waitFor(() => expect(enviar).toHaveBeenCalledTimes(1))

    const segunda = s.sincronizar({ forzar: true })
    soltar()
    await Promise.all([primera, segunda])

    expect(enviar).toHaveBeenCalledTimes(1)
    s.detener()
  })

  it('un envío que la app dejó a medias se reenvía al abrir', async () => {
    await cola.agregar(pendiente('a', { estado: 'enviando' }))
    const enviar = vi.fn(async () => reporte(1))
    const s = nuevo(enviar)

    await s.setUsuario(ANA)

    expect(enviar).toHaveBeenCalledTimes(1)
    s.detener()
  })
})

describe('guardarYEnviar (formulario)', () => {
  it('con conexión lo guarda, lo envía y lo quita de la cola', async () => {
    const enviar = vi.fn(async (p: Pendiente) => {
      expect(await cola.obtener(p.clave)).toMatchObject({ estado: 'enviando' })
      return reporte(42)
    })
    const s = nuevo(enviar)
    await s.setUsuario(ANA)
    const progreso = vi.fn()

    const r = await s.guardarYEnviar(ANA, datos, foto(), progreso)

    expect(r).toEqual({ tipo: 'enviado', reporte: reporte(42) })
    expect(enviar.mock.calls[0][0].clave).toBe('clave-1')
    expect(await cola.contar(ANA)).toBe(0)
    s.detener()
  })

  it('sin conexión lo deja guardado y lo anuncia', async () => {
    enLinea = false
    const enviar = vi.fn(async () => reporte(1))
    const s = nuevo(enviar)
    await s.setUsuario(ANA)

    const r = await s.guardarYEnviar(ANA, datos, foto())

    expect(r.tipo).toBe('guardado')
    expect(enviar).not.toHaveBeenCalled()
    expect(s.instantanea().pendientes).toHaveLength(1)
    expect(s.instantanea().anuncio?.texto).toMatch(/guardado en este teléfono/i)
    s.detener()
  })

  it('si la subida se corta lo deja en la cola para reintentarlo', async () => {
    const s = nuevo(async () => {
      throw new NetworkError()
    })
    await s.setUsuario(ANA)

    const r = await s.guardarYEnviar(ANA, datos, foto())

    expect(r.tipo).toBe('guardado')
    expect(await cola.obtener('clave-1')).toMatchObject({ intentos: 1, motivo: 'red' })
    s.detener()
  })

  it('si el servidor rechaza los datos lo quita de la cola y devuelve el error', async () => {
    const error = new ApiError(400, 'x', { descripcion: ['Muy corta.'] })
    const s = nuevo(async () => {
      throw error
    })
    await s.setUsuario(ANA)

    const r = await s.guardarYEnviar(ANA, datos, foto())

    expect(r).toEqual({ tipo: 'rechazado', error })
    expect(await cola.contar(ANA)).toBe(0)
    s.detener()
  })

  it('con la cola llena no guarda y avisa', async () => {
    for (let i = 0; i < TOPE_PENDIENTES; i++) await cola.agregar(pendiente(`p${i}`))
    enLinea = false
    const s = nuevo(async () => reporte(1))
    await s.setUsuario(ANA)

    await expect(s.guardarYEnviar(ANA, datos, foto())).rejects.toBeInstanceOf(ColaLlena)
    s.detener()
  })
})
