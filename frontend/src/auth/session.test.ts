import { afterEach, describe, expect, it } from 'vitest'
import { ApiError, NetworkError, accessTokenStore, apiFetch } from '../api/client'
import { ana, calls, json, mockFetch } from '../test/helpers'
import { clearLocalSession, login, logout, PROFILE_KEY, profileCache, refreshSession } from './session'

const session = (access = 'access-1') => ({ access, user: ana })

afterEach(() => {
  clearLocalSession()
  localStorage.clear()
})

describe('sesión', () => {
  it('login guarda el access en memoria y solo el perfil en localStorage', async () => {
    mockFetch({ '/api/auth/login/': () => json(session()) })

    await login('ana@ejemplo.mx', 'girasol-azul')

    expect(accessTokenStore.get()).toBe('access-1')
    expect(profileCache.load()).toEqual(ana)
    const stored = localStorage.getItem(PROFILE_KEY) ?? ''
    expect(stored).not.toContain('access-1')
  })

  it('login con credenciales incorrectas lanza ApiError con el mensaje del servidor', async () => {
    mockFetch({
      '/api/auth/login/': () => json({ detail: 'Email o contraseña incorrectos.' }, 401),
    })

    await expect(login('ana@ejemplo.mx', 'mala')).rejects.toMatchObject({
      status: 401,
      message: 'Email o contraseña incorrectos.',
    })
    expect(profileCache.load()).toBeNull()
  })

  it('varias renovaciones simultáneas hacen una sola petición', async () => {
    const fetchMock = mockFetch({ '/api/auth/refresh/': () => json(session('access-2')) })

    const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()])

    expect(calls(fetchMock, '/api/auth/refresh/')).toHaveLength(1)
    expect(results.every((r) => r?.access === 'access-2')).toBe(true)
  })

  it('refresh con 401 limpia la sesión local y devuelve null', async () => {
    profileCache.save(ana)
    mockFetch({ '/api/auth/refresh/': () => json({ detail: 'expiró' }, 401) })

    await expect(refreshSession()).resolves.toBeNull()
    expect(profileCache.load()).toBeNull()
  })

  it('refresh sin red lanza NetworkError y conserva el perfil', async () => {
    profileCache.save(ana)
    mockFetch({ '/api/auth/refresh/': 'offline' })

    await expect(refreshSession()).rejects.toBeInstanceOf(NetworkError)
    expect(profileCache.load()).toEqual(ana)
  })

  it('logout sin red cierra la sesión local igualmente', async () => {
    profileCache.save(ana)
    accessTokenStore.set('access-1')
    mockFetch({ '/api/auth/logout/': 'offline' })

    await logout()

    expect(profileCache.load()).toBeNull()
    expect(accessTokenStore.get()).toBeNull()
  })
})

describe('apiFetch', () => {
  it('ante un 401 renueva una vez y repite la petición con el access nuevo', async () => {
    accessTokenStore.set('caducado')
    const fetchMock = mockFetch({
      '/api/me/': (init) => {
        const auth = new Headers(init?.headers).get('Authorization')
        return auth === 'Bearer access-2' ? json(ana) : json({ detail: 'caducado' }, 401)
      },
      '/api/auth/refresh/': () => json(session('access-2')),
    })

    await expect(apiFetch('/api/me/')).resolves.toEqual(ana)
    expect(calls(fetchMock, '/api/me/')).toHaveLength(2)
  })

  it('si la renovación falla, propaga el 401 y cierra la sesión', async () => {
    profileCache.save(ana)
    accessTokenStore.set('caducado')
    mockFetch({
      '/api/me/': () => json({ detail: 'caducado' }, 401),
      '/api/auth/refresh/': () => json({ detail: 'expiró' }, 401),
    })

    await expect(apiFetch('/api/me/')).rejects.toBeInstanceOf(ApiError)
    expect(profileCache.load()).toBeNull()
  })

  it('separa errores por campo del mensaje general', async () => {
    mockFetch({
      '/api/x/': () => json({ email: ['Ya existe una cuenta con este email.'] }, 400),
    })

    const error = await apiFetch('/api/x/', {}, { auth: false }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).fieldErrors).toEqual({ email: ['Ya existe una cuenta con este email.'] })
  })

  it('traduce el 429 a un mensaje claro', async () => {
    mockFetch({ '/api/x/': () => json({ detail: 'Request was throttled.' }, 429) })

    await expect(apiFetch('/api/x/', {}, { auth: false })).rejects.toThrow(/Demasiados intentos/)
  })
})
