import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Reporte } from '../api/reportes'
import { AuthProvider } from '../auth/AuthContext'
import { clearLocalSession, profileCache } from '../auth/session'
import { ana, json, mockFetch } from '../test/helpers'
import { cerrarParaPruebas } from '../offline/cola'
import { MyReports } from './MyReports'
import { NewReport } from './NewReport'

// Leaflet no funciona en jsdom: el mapa se sustituye por un botón que simula moverlo.
vi.mock('../components/report/MapView', () => ({
  MapView: ({ onUserMove }: { onUserMove?: (c: { lat: number; lng: number }) => void }) => (
    <button type="button" onClick={() => onUserMove?.({ lat: 18.8505, lng: -99.2009 })}>
      Mover mapa (prueba)
    </button>
  ),
}))

// La preparación real usa canvas; aquí se devuelve un JPEG falso.
vi.mock('../lib/foto', async (original) => ({
  ...(await original<typeof import('../lib/foto')>()),
  prepararFoto: vi.fn(async () => ({ blob: new Blob(['jpg'], { type: 'image/jpeg' }), ancho: 10, alto: 10 })),
}))

const crearReporte = vi.fn()
vi.mock('../api/reportes', async (original) => ({
  ...(await original<typeof import('../api/reportes')>()),
  crearReporte: (...args: unknown[]) => crearReporte(...args),
}))

const categorias = [
  { id: 1, nombre: 'Baches y pavimento', slug: 'baches-y-pavimento', icono: 'bache' },
  { id: 2, nombre: 'Alumbrado', slug: 'alumbrado', icono: 'alumbrado' },
]

function reporte(extra: Partial<Reporte> = {}): Reporte {
  return {
    id: 7,
    categoria: categorias[0],
    descripcion: 'Bache frente a la biblioteca.',
    latitud: '18.850283',
    longitud: '-99.200736',
    precision_m: 12,
    origen_ubicacion: 'gps',
    estado: 'recibido',
    estado_display: 'Recibido',
    creado: new Date().toISOString(),
    actualizado: new Date().toISOString(),
    foto_url: '/api/reportes/7/foto/?t=x',
    miniatura_url: '/api/reportes/7/foto/?t=y',
    es_mio: true,
    puede_editar: true,
    votos: 0,
    votado: false,
    puede_votar: false,
    ...extra,
  }
}

function pagina(results: Reporte[], next: string | null = null, count = results.length) {
  return { count, next, previous: null, results }
}

function renderEn(path: string, user = ana) {
  profileCache.save(user)
  const router = createMemoryRouter(
    [
      { path: '/reportes/nuevo', element: <NewReport /> },
      { path: '/reportes', element: <MyReports /> },
      { path: '/', element: <p>Inicio</p> },
    ],
    { initialEntries: [path] },
  )
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

function stubGeo(impl: (ok: PositionCallback, fail: PositionErrorCallback) => void) {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: impl } })
}

beforeEach(async () => {
  await cerrarParaPruebas()
  globalThis.indexedDB = new IDBFactory()
  crearReporte.mockReset()
})

afterEach(() => {
  clearLocalSession()
  localStorage.clear()
})

describe('Nuevo reporte', () => {
  const rutas = {
    '/api/auth/refresh/': () => json({ access: 'a', user: ana }),
    '/api/categorias/': () => json(categorias),
  }

  async function elegirFoto() {
    const input = screen.getByTestId('foto-galeria') as HTMLInputElement
    await userEvent.upload(input, new File(['x'], 'foto.jpg', { type: 'image/jpeg' }))
    await screen.findByAltText('Vista previa de la foto del reporte')
  }

  it('muestra el aviso fijo de emergencias', async () => {
    mockFetch(rutas)
    renderEn('/reportes/nuevo')

    const aviso = await screen.findByRole('complementary', { name: 'Aviso de emergencias' })
    expect(aviso).toHaveTextContent('Esta app no es para emergencias. Si hay peligro, llama al 911.')
    expect(screen.getByRole('link', { name: 'llama al 911' })).toHaveAttribute('href', 'tel:911')
  })

  it('valida todo y enfoca el primer campo con error', async () => {
    mockFetch(rutas)
    renderEn('/reportes/nuevo')
    await screen.findByText('Alumbrado')

    await userEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(screen.getByText('Agrega una foto: tómala o elígela de la galería.')).toBeInTheDocument()
    expect(screen.getByText('Elige el tipo de problema.')).toBeInTheDocument()
    expect(screen.getByText(/Cuéntanos un poco más/)).toBeInTheDocument()
    expect(screen.getByText(/Indica dónde está/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tomar foto' })).toHaveFocus()
    expect(crearReporte).not.toHaveBeenCalled()
  })

  it('con el permiso de ubicación negado, se puede ubicar moviendo el mapa y enviar', async () => {
    mockFetch(rutas)
    stubGeo((_ok, fail) =>
      fail({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
    )
    crearReporte.mockResolvedValue(reporte())
    const router = renderEn('/reportes/nuevo')
    await screen.findByText('Alumbrado')

    await elegirFoto()
    await userEvent.click(screen.getByLabelText('Baches y pavimento'))
    await userEvent.type(screen.getByLabelText('¿Qué está pasando?'), 'Bache profundo en la entrada.')
    await userEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }))

    expect(await screen.findByText(/No diste permiso para usar tu ubicación/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Mover mapa (prueba)' }))
    expect(screen.getByText(/Punto ajustado a mano/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/reportes'))
    expect(crearReporte).toHaveBeenCalledWith(
      expect.objectContaining({
        categoria: 'baches-y-pavimento',
        descripcion: 'Bache profundo en la entrada.',
        origen_ubicacion: 'manual',
        precision_m: null,
        latitud: 18.8505,
      }),
      expect.any(Function),
      // La clave de la cola: el mismo envío repetido no se duplica en el servidor.
      expect.stringMatching(/^[0-9a-f-]{36}$/),
    )
  })

  it('con GPS usa la ubicación y su precisión', async () => {
    mockFetch(rutas)
    stubGeo((ok) =>
      ok({ coords: { latitude: 18.8502834, longitude: -99.2007355, accuracy: 9 } } as GeolocationPosition),
    )
    renderEn('/reportes/nuevo')
    await screen.findByText('Alumbrado')

    await userEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }))

    expect(await screen.findByText(/Ubicación del GPS, precisión de ±9 m/)).toBeInTheDocument()
  })

  it('sin GPS ni arrastre, "usar este punto" fija el centro del mapa', async () => {
    mockFetch(rutas)
    renderEn('/reportes/nuevo')
    await screen.findByText('Alumbrado')

    await userEvent.click(screen.getByRole('button', { name: 'El problema está aquí: usar este punto' }))

    expect(screen.getByText(/Punto ajustado a mano/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'El problema está aquí: usar este punto' }),
    ).not.toBeInTheDocument()
  })

  it('muestra en su campo el error de foto del servidor', async () => {
    mockFetch(rutas)
    const { ApiError } = await import('../api/client')
    crearReporte.mockRejectedValue(new ApiError(400, 'Revisa', { foto: ['Las fotos HEIC del iPhone no se pueden subir.'] }))
    renderEn('/reportes/nuevo')
    await screen.findByText('Alumbrado')

    await elegirFoto()
    await userEvent.click(screen.getByLabelText('Alumbrado'))
    await userEvent.type(screen.getByLabelText('¿Qué está pasando?'), 'Luminaria fundida en el pasillo.')
    await userEvent.click(screen.getByRole('button', { name: 'Mover mapa (prueba)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByText('Las fotos HEIC del iPhone no se pueden subir.')).toBeInTheDocument()
  })

  it('si fallan las categorías, permite reintentar', async () => {
    let llamadas = 0
    mockFetch({
      ...rutas,
      '/api/categorias/': () => (++llamadas === 1 ? json({ detail: 'x' }, 500) : json(categorias)),
    })
    renderEn('/reportes/nuevo')

    expect(await screen.findByText('No pudimos cargar las categorías.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Alumbrado')).toBeInTheDocument()
  })

  it('un administrador no ve el formulario', async () => {
    const admin = { ...ana, rol: 'administrador' as const }
    mockFetch({ ...rutas, '/api/auth/refresh/': () => json({ access: 'a', user: admin }) })
    renderEn('/reportes/nuevo', admin)

    expect(await screen.findByText(/Los reportes los crean los ciudadanos/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar reporte' })).not.toBeInTheDocument()
  })
})

describe('Mis reportes', () => {
  const refresh = { '/api/auth/refresh/': () => json({ access: 'a', user: ana }) }

  it('estado vacío con acción para reportar', async () => {
    mockFetch({ ...refresh, '/api/reportes/mios/?page=1': () => json(pagina([])) })
    renderEn('/reportes')

    expect(await screen.findByRole('heading', { name: 'Aún no tienes reportes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Haz tu primer reporte' })).toHaveAttribute('href', '/reportes/nuevo')
  })

  it('lista con estado en texto y paginación', async () => {
    mockFetch({
      ...refresh,
      '/api/reportes/mios/?page=1': () =>
        json(pagina([reporte(), reporte({ id: 8, estado: 'en_proceso' })], '/api/reportes/mios/?page=2', 3)),
      '/api/reportes/mios/?page=2': () => json(pagina([reporte({ id: 9, estado: 'resuelto' })], null, 3)),
    })
    renderEn('/reportes')

    expect(await screen.findByText('3 reportes')).toBeInTheDocument()
    expect(screen.getByText('En proceso')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cargar más' }))

    expect(await screen.findByText('Resuelto')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument()
  })

  it('error con reintento', async () => {
    let llamadas = 0
    mockFetch({
      ...refresh,
      '/api/reportes/mios/?page=1': () => (++llamadas === 1 ? json({}, 500) : json(pagina([reporte()]))),
    })
    renderEn('/reportes')

    expect(await screen.findByRole('alert')).toHaveTextContent('El servidor tuvo un problema')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('1 reporte')).toBeInTheDocument()
  })

  it('sin conexión lo dice', async () => {
    mockFetch({ ...refresh, '/api/reportes/mios/?page=1': 'offline' })
    renderEn('/reportes')

    expect(await screen.findByText('Sin conexión: no pudimos cargar tus reportes.')).toBeInTheDocument()
  })

  it('al abrir la app sin conexión cae al modo sin conexión con el perfil guardado', async () => {
    const fetchMock = mockFetch({
      '/api/auth/refresh/': 'offline',
      '/api/reportes/mios/?page=1': 'offline',
    })
    const router = renderEn('/reportes')

    expect(await screen.findByText('Sin conexión: no pudimos cargar tus reportes.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/reportes')
    expect(screen.queryByText(/sesión expiró/i)).not.toBeInTheDocument()
    expect(profileCache.load()).toEqual(ana)
    // Sin token no se envía la lista: no hay 401 que confunda el diagnóstico.
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/reportes/mios/?page=1')).toHaveLength(0)
  })

  it('al abrir la app no pide la lista sin token', async () => {
    const fetchMock = mockFetch({
      ...refresh,
      '/api/reportes/mios/?page=1': (init) =>
        new Headers(init?.headers).has('Authorization')
          ? json(pagina([reporte()]))
          : json({ detail: 'sin token' }, 401),
    })
    renderEn('/reportes')

    expect(await screen.findByText('1 reporte')).toBeInTheDocument()
    const lista = fetchMock.mock.calls.filter(([url]) => url === '/api/reportes/mios/?page=1')
    expect(lista.every(([, init]) => new Headers(init?.headers).has('Authorization'))).toBe(true)
  })
})
