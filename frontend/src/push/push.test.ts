import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { accessTokenStore } from '../api/client'
import { calls, json, mockFetch } from '../test/helpers'
import {
  activar,
  claveABytes,
  desactivar,
  PermisoDenegado,
  PermisoSinRespuesta,
  PushApagado,
  sincronizar,
  soporte,
} from './push'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
// 65 bytes en base64url, como una clave pública VAPID real (87 caracteres).
const CLAVE = 'B' + 'A'.repeat(86)

type FalsaSub = { endpoint: string; toJSON: () => object; unsubscribe: ReturnType<typeof vi.fn> }

function falsaSuscripcion(endpoint = 'https://push.ejemplo.test/1'): FalsaSub {
  return {
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: 'p', auth: 'a' } }),
    unsubscribe: vi.fn(async () => true),
  }
}

/** Navegador simulado: UA, standalone, Notification y PushManager. */
function navegador({
  ua = ANDROID,
  standalone = false,
  permiso = 'default' as NotificationPermission,
  respuesta = 'granted' as NotificationPermission,
  suscripcion = null as FalsaSub | null,
  conPush = true,
} = {}) {
  const estado = { sub: suscripcion }
  const registro = {
    pushManager: {
      getSubscription: vi.fn(async () => estado.sub),
      subscribe: vi.fn(async (_opciones: PushSubscriptionOptionsInit) => (estado.sub = falsaSuscripcion())),
    },
  }
  vi.stubGlobal('navigator', {
    ...navigator,
    userAgent: ua,
    maxTouchPoints: 5,
    standalone,
    ...(conPush ? { serviceWorker: { ready: Promise.resolve(registro) } } : {}),
  })
  window.matchMedia = vi.fn(() => ({ matches: standalone })) as unknown as typeof window.matchMedia
  if (conPush) {
    vi.stubGlobal('PushManager', function PushManager() {})
    vi.stubGlobal(
      'Notification',
      Object.assign(function Notification() {}, {
        permission: permiso,
        requestPermission: vi.fn(async () => respuesta),
      }),
    )
  } else {
    // @ts-expect-error -- simular un navegador sin push
    delete window.PushManager
  }
  return registro
}

beforeEach(() => {
  localStorage.clear()
  accessTokenStore.set('access-1')
})

afterEach(() => {
  accessTokenStore.set(null)
})

describe('soporte', () => {
  it('iPhone en Safari sin instalar: explicar que hay que instalarla', () => {
    navegador({ ua: IPHONE, standalone: false })
    expect(soporte()).toBe('ios-sin-instalar')
  })

  it('iPhone instalado con iOS 16.4+: disponible', () => {
    navegador({ ua: IPHONE, standalone: true })
    expect(soporte()).toBe('disponible')
  })

  it('iPhone instalado sin PushManager: iOS anterior a 16.4', () => {
    navegador({ ua: IPHONE, standalone: true, conPush: false })
    expect(soporte()).toBe('ios-viejo')
  })

  it('Android con push: disponible', () => {
    navegador()
    expect(soporte()).toBe('disponible')
  })
})

describe('activar', () => {
  it('pide el permiso, suscribe con la clave y lo registra en el servidor', async () => {
    const registro = navegador()
    const fetchMock = mockFetch({
      '/api/push/clave/': () => json({ activo: true, clave: CLAVE }),
      '/api/push/suscripciones/': () => json({ activo: true }, 201),
    })

    await activar(7)

    expect(Notification.requestPermission).toHaveBeenCalledTimes(1)
    const opciones = registro.pushManager.subscribe.mock.calls[0][0] as PushSubscriptionOptionsInit
    expect(opciones.userVisibleOnly).toBe(true)
    expect(opciones.applicationServerKey).toEqual(claveABytes(CLAVE))
    expect(calls(fetchMock, '/api/push/suscripciones/')).toHaveLength(1)
    expect(localStorage.getItem('spotit:push-de')).toBe('7')
  })

  it('si el permiso está bloqueado no lo vuelve a pedir', async () => {
    navegador({ permiso: 'denied' })
    mockFetch({ '/api/push/clave/': () => json({ activo: true, clave: CLAVE }) })

    await expect(activar(7)).rejects.toBeInstanceOf(PermisoDenegado)
    expect(Notification.requestPermission).not.toHaveBeenCalled()
  })

  it('si lo niega en el diálogo, no se suscribe', async () => {
    const registro = navegador({ respuesta: 'denied' })
    mockFetch({ '/api/push/clave/': () => json({ activo: true, clave: CLAVE }) })

    await expect(activar(7)).rejects.toBeInstanceOf(PermisoDenegado)
    expect(registro.pushManager.subscribe).not.toHaveBeenCalled()
  })

  it('si cierra el diálogo sin elegir, no es un error definitivo', async () => {
    navegador({ respuesta: 'default' })
    mockFetch({ '/api/push/clave/': () => json({ activo: true, clave: CLAVE }) })

    await expect(activar(7)).rejects.toBeInstanceOf(PermisoSinRespuesta)
  })

  it('sin claves en el servidor no pide permiso', async () => {
    navegador()
    mockFetch({ '/api/push/clave/': () => json({ activo: false, clave: null }) })

    await expect(activar(7)).rejects.toBeInstanceOf(PushApagado)
    expect(Notification.requestPermission).not.toHaveBeenCalled()
  })
})

describe('desactivar y sincronizar', () => {
  it('desactivar la quita del servidor y del navegador', async () => {
    const sub = falsaSuscripcion()
    navegador({ permiso: 'granted', suscripcion: sub })
    const fetchMock = mockFetch({ '/api/push/suscripciones/': () => json(undefined, 204) })
    localStorage.setItem('spotit:push-de', '7')

    await desactivar()

    const [, init] = calls(fetchMock, '/api/push/suscripciones/')[0]
    expect(init?.method).toBe('DELETE')
    expect(JSON.parse(String(init?.body))).toEqual({ endpoint: sub.endpoint })
    expect(sub.unsubscribe).toHaveBeenCalled()
    expect(localStorage.getItem('spotit:push-de')).toBeNull()
  })

  it('sin red la quita igual del navegador', async () => {
    const sub = falsaSuscripcion()
    navegador({ permiso: 'granted', suscripcion: sub })
    mockFetch({ '/api/push/suscripciones/': 'offline' })

    await desactivar()

    expect(sub.unsubscribe).toHaveBeenCalled()
  })

  it('al entrar otra cuenta en el mismo teléfono, la suscripción anterior se quita', async () => {
    const sub = falsaSuscripcion()
    navegador({ permiso: 'granted', suscripcion: sub })
    const fetchMock = mockFetch({})
    localStorage.setItem('spotit:push-de', '7')

    await sincronizar(8)

    expect(sub.unsubscribe).toHaveBeenCalled()
    expect(calls(fetchMock, '/api/push/suscripciones/')).toHaveLength(0)
  })

  it('la misma cuenta la vuelve a registrar (el navegador pudo renovarla)', async () => {
    const sub = falsaSuscripcion()
    navegador({ permiso: 'granted', suscripcion: sub })
    const fetchMock = mockFetch({ '/api/push/suscripciones/': () => json({ activo: true }) })
    localStorage.setItem('spotit:push-de', '7')

    await sincronizar(7)

    expect(sub.unsubscribe).not.toHaveBeenCalled()
    expect(calls(fetchMock, '/api/push/suscripciones/')).toHaveLength(1)
  })
})
