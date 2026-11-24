import { vi } from 'vitest'
import type { User } from '../auth/session'

export const ana: User = {
  id: 1,
  email: 'ana@ejemplo.mx',
  nombre: 'Ana López',
  rol: 'ciudadano',
  date_joined: '2026-11-24T10:00:00Z',
}

export const json = (body: unknown, status = 200) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

type Route = (init: RequestInit | undefined, url: string) => Response | Promise<Response>

/** fetch falso por ruta. Una ruta ausente responde 404; `'offline'` simula sin red. */
export function mockFetch(routes: Record<string, Route | 'offline'>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const route = routes[url]
    if (route === 'offline') throw new TypeError('Failed to fetch')
    if (!route) return json({ detail: 'no encontrado' }, 404)
    return route(init, url)
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

export function calls(fetchMock: ReturnType<typeof mockFetch>, url: string) {
  return fetchMock.mock.calls.filter(([input]) => input === url)
}
