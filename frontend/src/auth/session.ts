/**
 * Sesión de SpotIt.
 *
 * - access token: en memoria (accessTokenStore), dura minutos.
 * - refresh token: cookie httpOnly que JS no puede leer; la renueva el servidor.
 * - perfil público (sin tokens): en localStorage, para abrir la app sin conexión.
 */

import {
  ApiError,
  accessTokenStore,
  apiFetch,
  NetworkError,
  postJson,
  setRefreshHandler,
} from '../api/client'

export type Rol = 'ciudadano' | 'administrador'

export type User = {
  id: number
  email: string
  nombre: string
  rol: Rol
  date_joined: string
}

type SessionPayload = { access: string; user: User }

// --- Perfil en caché ---

export const PROFILE_KEY = 'spotit:perfil'

function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false
  const u = value as Record<string, unknown>
  return (
    typeof u.id === 'number' &&
    typeof u.email === 'string' &&
    typeof u.nombre === 'string' &&
    (u.rol === 'ciudadano' || u.rol === 'administrador')
  )
}

export const profileCache = {
  load(): User | null {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null')
      return isUser(parsed) ? parsed : null
    } catch {
      return null
    }
  },
  save(user: User) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(user))
    } catch {
      // almacenamiento lleno o bloqueado: la sesión sigue en memoria
    }
  },
  clear() {
    try {
      localStorage.removeItem(PROFILE_KEY)
    } catch {
      // ignorar
    }
  },
}

// --- Suscriptores (AuthContext) ---

export type EndReason = 'logout' | 'expired'

type Listener = (user: User | null, reason?: EndReason) => void
const listeners = new Set<Listener>()

export function onSessionChange(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit(user: User | null, reason?: EndReason) {
  for (const listener of listeners) listener(user, reason)
}

function applySession({ access, user }: SessionPayload) {
  accessTokenStore.set(access)
  profileCache.save(user)
  emit(user)
}

export function clearLocalSession(reason?: EndReason) {
  accessTokenStore.set(null)
  profileCache.clear()
  emit(null, reason)
}

// --- Operaciones ---

export async function login(email: string, password: string): Promise<User> {
  const session = await apiFetch<SessionPayload>(
    '/api/auth/login/',
    postJson({ email, password }),
    { auth: false },
  )
  applySession(session)
  return session.user
}

export async function register(data: {
  email: string
  nombre: string
  password: string
}): Promise<User> {
  const session = await apiFetch<SessionPayload>('/api/auth/register/', postJson(data), {
    auth: false,
  })
  applySession(session)
  return session.user
}

/** Serializa la renovación entre pestañas: el refresh rota, dos a la vez se pisarían. */
function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request('spotit-auth-refresh', task)
  }
  return task()
}

let inflight: Promise<SessionPayload | null> | null = null

/**
 * Renueva la sesión con la cookie. Una sola petición a la vez aunque la pidan varios sitios.
 * Devuelve null si la sesión ya no es válida (y la limpia). Lanza NetworkError sin conexión.
 */
export function refreshSession(): Promise<SessionPayload | null> {
  inflight ??= withRefreshLock(async () => {
    try {
      const session = await apiFetch<SessionPayload>(
        '/api/auth/refresh/',
        { method: 'POST' },
        { auth: false },
      )
      applySession(session)
      return session
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // Solo es "expiró" si había una sesión guardada; si no, es una visita nueva.
        clearLocalSession(profileCache.load() ? 'expired' : undefined)
        return null
      }
      throw error
    }
  }).finally(() => {
    inflight = null
  })
  return inflight
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<void>('/api/auth/logout/', { method: 'POST' }, { auth: false })
  } catch (error) {
    // Sin conexión no se puede invalidar el refresh en el servidor; la sesión local se cierra igual.
    if (!(error instanceof NetworkError) && !(error instanceof ApiError)) throw error
  } finally {
    clearLocalSession('logout')
  }
}

setRefreshHandler(async () => (await refreshSession())?.access ?? null)
