import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  NetworkError,
  SlowNetworkError,
  accessTokenStore,
  apiFetch,
  setRefreshWaitMs,
} from '../api/client'
import { ana, calls, json, mockFetch } from '../test/helpers'
import {
  clearLocalSession,
  login,
  logout,
  onSessionChange,
  PROFILE_KEY,
  profileCache,
  refreshSession,
} from './session'

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

  it('si renovó antes de enviar y aun así recibe 401, no renueva otra vez', async () => {
    profileCache.save(ana)
    const fetchMock = mockFetch({
      '/api/me/': () => json({ detail: 'no' }, 401),
      '/api/auth/refresh/': () => json(session('access-2')),
    })

    await expect(apiFetch('/api/me/')).rejects.toMatchObject({ status: 401 })
    expect(calls(fetchMock, '/api/auth/refresh/')).toHaveLength(1)
    expect(calls(fetchMock, '/api/me/')).toHaveLength(1)
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

describe('arranque en frío (perfil guardado, sin access en memoria)', () => {
  const sinToken = (init?: RequestInit) => !new Headers(init?.headers).has('Authorization')

  afterEach(() => {
    setRefreshWaitMs(8_000)
    vi.useRealTimers()
  })

  it('espera la renovación y nunca envía la petición sin token', async () => {
    profileCache.save(ana)
    const fetchMock = mockFetch({
      '/api/me/': (init) => (sinToken(init) ? json({ detail: 'sin token' }, 401) : json(ana)),
      '/api/auth/refresh/': () => json(session('access-2')),
    })

    await expect(apiFetch('/api/me/')).resolves.toEqual(ana)

    const peticiones = calls(fetchMock, '/api/me/')
    expect(peticiones).toHaveLength(1)
    expect(new Headers(peticiones[0][1]?.headers).get('Authorization')).toBe('Bearer access-2')
  })

  it('varias pantallas a la vez comparten una sola renovación', async () => {
    profileCache.save(ana)
    const fetchMock = mockFetch({
      '/api/me/': () => json(ana),
      '/api/categorias/': () => json([]),
      '/api/auth/refresh/': () => json(session('access-2')),
    })

    await Promise.all([apiFetch('/api/me/'), apiFetch('/api/categorias/'), refreshSession()])

    expect(calls(fetchMock, '/api/auth/refresh/')).toHaveLength(1)
  })

  it('sin red falla como sin conexión, conserva el perfil y no da la sesión por caducada', async () => {
    profileCache.save(ana)
    const motivos: unknown[] = []
    const off = onSessionChange((user, reason) => motivos.push(user ? 'abierta' : reason))
    const fetchMock = mockFetch({ '/api/auth/refresh/': 'offline', '/api/me/': 'offline' })

    await expect(apiFetch('/api/me/')).rejects.toBeInstanceOf(NetworkError)

    off()
    expect(profileCache.load()).toEqual(ana)
    expect(motivos).toEqual([])
    expect(calls(fetchMock, '/api/me/')).toHaveLength(0)
  })

  it('con red lenta se rinde al llegar al límite y aplica la sesión cuando llega', async () => {
    vi.useFakeTimers()
    setRefreshWaitMs(8_000)
    profileCache.save(ana)
    let responder: (r: Response) => void = () => {}
    const fetchMock = mockFetch({
      '/api/auth/refresh/': () => new Promise<Response>((resolve) => (responder = resolve)),
      '/api/me/': () => json(ana),
    })

    const peticion = apiFetch('/api/me/').catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(8_000)

    const error = await peticion
    expect(error).toBeInstanceOf(SlowNetworkError)
    expect(error).toBeInstanceOf(NetworkError) // las pantallas lo tratan como sin conexión
    expect(calls(fetchMock, '/api/me/')).toHaveLength(0)
    expect(profileCache.load()).toEqual(ana)

    // La renovación seguía en curso: al llegar, deja el access listo para reintentar.
    responder(json(session('access-tarde')))
    await vi.waitFor(() => expect(accessTokenStore.get()).toBe('access-tarde'))
  })

  it('si la sesión ya no es válida, no envía la petición y la cierra', async () => {
    profileCache.save(ana)
    const fetchMock = mockFetch({
      '/api/auth/refresh/': () => json({ detail: 'expiró' }, 401),
      '/api/me/': () => json(ana),
    })

    await expect(apiFetch('/api/me/')).rejects.toMatchObject({ status: 401 })
    expect(calls(fetchMock, '/api/me/')).toHaveLength(0)
    expect(profileCache.load()).toBeNull()
  })

  it('las peticiones públicas no esperan la renovación', async () => {
    const fetchMock = mockFetch({ '/api/health/': () => json({ status: 'ok' }) })

    await apiFetch('/api/health/', {}, { auth: false })

    expect(calls(fetchMock, '/api/auth/refresh/')).toHaveLength(0)
  })
})
