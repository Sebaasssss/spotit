import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { accessTokenStore, apiFetchConOrigen, NetworkError } from '../api/client'
import { clearLocalSession, login, logout, refreshSession } from '../auth/session'
import { ana, calls, json, mockFetch } from '../test/helpers'
import {
  invalidarTrasCrear,
  invalidarTrasVotar,
  leerDeCache,
  prepararCacheParaUsuario,
} from './cacheApi'
import { CABECERA_GUARDADO, CACHE_API, seGuardaEnCache } from './cachesNombres'

/** Cache Storage mínima en memoria (jsdom no la trae). */
function cachesFalsas() {
  const almacen = new Map<string, Map<string, Response>>()
  vi.stubGlobal('caches', {
    has: async (nombre: string) => almacen.has(nombre),
    delete: async (nombre: string) => almacen.delete(nombre),
    open: async (nombre: string) => {
      if (!almacen.has(nombre)) almacen.set(nombre, new Map())
      const cache = almacen.get(nombre)!
      return {
        keys: async () => [...cache.keys()].map((url) => new Request(url)),
        delete: async (req: Request) => cache.delete(req.url),
        match: async (url: string) => cache.get(url)?.clone(),
      }
    },
  })
  const guardar = (ruta: string, cuerpo: unknown, fecha = '2026-11-25T16:40:00.000Z') => {
    if (!almacen.has(CACHE_API)) almacen.set(CACHE_API, new Map())
    almacen.get(CACHE_API)!.set(
      new URL(ruta, window.location.origin).href,
      new Response(JSON.stringify(cuerpo), { headers: { [CABECERA_GUARDADO]: fecha } }),
    )
  }
  const rutas = () =>
    [...(almacen.get(CACHE_API)?.keys() ?? [])].map((u) => {
      const url = new URL(u)
      return url.pathname + url.search
    })
  return { almacen, guardar, rutas }
}

const sesion = (user = ana) => ({ access: 'access-1', user })

beforeEach(() => localStorage.clear())
afterEach(() => {
  clearLocalSession()
  localStorage.clear()
})

describe('qué se guarda', () => {
  it.each([
    ['/api/categorias/', true],
    ['/api/reportes/', true],
    ['/api/reportes/mios/', true],
    ['/api/reportes/mapa/', true],
    ['/api/reportes/42/', true],
    ['/api/auth/refresh/', false],
    ['/api/auth/me/', false],
    ['/api/health/', false],
    ['/api/reportes/42/foto/', false],
    ['/api/reportes/42/voto/', false],
    // El panel lleva emails de ciudadanos: nunca se guarda.
    ['/api/admin/resumen/', false],
    ['/api/admin/reportes/', false],
    ['/api/admin/reportes/42/', false],
  ])('%s → %s', (ruta, esperado) => {
    expect(seGuardaEnCache(ruta)).toBe(esperado)
  })
})

describe('invalidación tras escribir', () => {
  it('votar borra el detalle de ese reporte, las listas y el mapa; no los demás detalles', async () => {
    const { guardar, rutas } = cachesFalsas()
    for (const r of [
      '/api/categorias/',
      '/api/reportes/?page=1',
      '/api/reportes/mios/?page=1',
      '/api/reportes/mapa/?estado=recibido',
      '/api/reportes/7/',
      '/api/reportes/8/',
    ])
      guardar(r, {})

    await invalidarTrasVotar(7)

    expect(rutas().sort()).toEqual(['/api/categorias/', '/api/reportes/8/'])
  })

  it('enviar un reporte borra las listas y el mapa, no los detalles', async () => {
    const { guardar, rutas } = cachesFalsas()
    for (const r of ['/api/reportes/mios/?page=2', '/api/reportes/mapa/', '/api/reportes/7/'])
      guardar(r, {})

    await invalidarTrasCrear()

    expect(rutas()).toEqual(['/api/reportes/7/'])
  })
})

describe('caché por persona', () => {
  it('se borra cuando entra una persona distinta y se conserva con la misma', async () => {
    const { almacen, guardar } = cachesFalsas()
    await prepararCacheParaUsuario(1)
    guardar('/api/reportes/mios/', { de: 'ana' })

    await prepararCacheParaUsuario(1)
    expect(almacen.has(CACHE_API)).toBe(true)

    await prepararCacheParaUsuario(2)
    expect(almacen.has(CACHE_API)).toBe(false)
  })

  it('login de otra cuenta borra la caché antes de usar la sesión', async () => {
    const { almacen, guardar } = cachesFalsas()
    await prepararCacheParaUsuario(99)
    guardar('/api/reportes/mios/', { de: 'otra' })
    mockFetch({ '/api/auth/login/': () => json(sesion()) })

    await login('ana@ejemplo.mx', 'x')

    expect(almacen.has(CACHE_API)).toBe(false)
  })

  it('cerrar sesión o que caduque borra la caché', async () => {
    const { almacen, guardar } = cachesFalsas()
    guardar('/api/reportes/mios/', {})
    mockFetch({ '/api/auth/logout/': () => json(undefined, 204) })

    await logout()

    await vi.waitFor(() => expect(almacen.has(CACHE_API)).toBe(false))
  })
})

describe('lectura sin conexión', () => {
  it('sin red para renovar la sesión, lee la copia guardada sin enviar la petición sin token', async () => {
    const { guardar } = cachesFalsas()
    guardar('/api/reportes/mios/?page=1', { count: 1 })
    const fetchMock = mockFetch({ '/api/auth/refresh/': 'offline' })
    accessTokenStore.set(null)

    const r = await apiFetchConOrigen<{ count: number }>('/api/reportes/mios/?page=1')

    expect(r).toEqual({
      data: { count: 1 },
      guardado: new Date('2026-11-25T16:40:00.000Z'),
      sinConexion: true,
    })
    expect(calls(fetchMock, '/api/reportes/mios/?page=1')).toHaveLength(0)
  })

  it('sin copia guardada falla como sin conexión', async () => {
    cachesFalsas()
    mockFetch({ '/api/auth/refresh/': 'offline' })
    accessTokenStore.set(null)

    await expect(apiFetchConOrigen('/api/reportes/mios/?page=1')).rejects.toBeInstanceOf(
      NetworkError,
    )
  })

  it('una escritura sin red nunca sale de la caché', async () => {
    const { guardar } = cachesFalsas()
    guardar('/api/reportes/7/voto/', { votos: 3 })
    mockFetch({ '/api/reportes/7/voto/': 'offline' })
    accessTokenStore.set('access-1')

    await expect(apiFetchConOrigen('/api/reportes/7/voto/', { method: 'POST' })).rejects.toBeInstanceOf(
      NetworkError,
    )
    expect(await leerDeCache('/api/reportes/7/voto/')).toBeDefined() // seguía ahí, no se usó
  })
})

describe('cerrar sesión con una renovación en curso', () => {
  it('espera a la renovación antes de cerrar, para que su respuesta no reabra la sesión', async () => {
    cachesFalsas()
    let soltar!: () => void
    const orden: string[] = []
    mockFetch({
      '/api/auth/refresh/': () =>
        new Promise<Response>((resolve) => {
          soltar = () => {
            orden.push('refresh')
            resolve(json(sesion()))
          }
        }),
      '/api/auth/logout/': () => {
        orden.push('logout')
        return json(undefined, 204)
      },
    })

    const renovando = refreshSession()
    const saliendo = logout()
    await new Promise((r) => setTimeout(r, 10))
    expect(orden).toEqual([]) // el cierre aún no salió
    soltar()
    await Promise.all([renovando, saliendo])

    expect(orden).toEqual(['refresh', 'logout'])
    expect(accessTokenStore.get()).toBeNull()
  })
})
