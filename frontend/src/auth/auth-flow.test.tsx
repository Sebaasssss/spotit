import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { Home } from '../routes/Home'
import { Login } from '../routes/Login'
import { Register } from '../routes/Register'
import { ana, calls, json, mockFetch } from '../test/helpers'
import { AuthProvider } from './AuthContext'
import { PublicOnly, RequireAuth } from './guards'
import { clearLocalSession, profileCache } from './session'

function renderApp(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: <PublicOnly />,
        children: [
          { path: '/entrar', element: <Login /> },
          { path: '/registro', element: <Register /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: <Home /> },
          { path: '/perfil', element: <p>Perfil privado</p> },
        ],
      },
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

afterEach(() => {
  clearLocalSession()
  localStorage.clear()
})

describe('rutas protegidas', () => {
  it('sin sesión manda a /entrar', async () => {
    mockFetch({ '/api/auth/refresh/': () => json({ detail: 'sin sesión' }, 401) })

    const router = renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Entra' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/entrar')
  })

  it('con la cookie válida entra aunque no haya perfil guardado', async () => {
    mockFetch({ '/api/auth/refresh/': () => json({ access: 'a', user: ana }) })

    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Hola, Ana' })).toBeInTheDocument()
  })

  it('sin conexión y con perfil guardado, la sesión sigue abierta', async () => {
    profileCache.save(ana)
    mockFetch({ '/api/auth/refresh/': 'offline' })

    renderApp('/')

    expect(screen.getByRole('heading', { name: 'Hola, Ana' })).toBeInTheDocument()
    await waitFor(() => expect(profileCache.load()).toEqual(ana))
    expect(screen.getByRole('heading', { name: 'Hola, Ana' })).toBeInTheDocument()
  })

  it('perfil guardado pero sesión caducada en el servidor: vuelve a /entrar', async () => {
    profileCache.save(ana)
    mockFetch({ '/api/auth/refresh/': () => json({ detail: 'expiró' }, 401) })

    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Entra' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Tu sesión expiró')
  })

  it('sin conexión avisa que la sesión sigue guardada', async () => {
    profileCache.save(ana)
    mockFetch({ '/api/auth/refresh/': 'offline' })

    renderApp('/')

    expect(await screen.findByText(/Sin conexión\. Tu sesión sigue guardada/)).toBeInTheDocument()
  })

  it('al salir invalida la sesión en el servidor y lo confirma en /entrar', async () => {
    const fetchMock = mockFetch({
      '/api/auth/refresh/': () => json({ access: 'a', user: ana }),
      '/api/auth/logout/': () => new Response(null, { status: 204 }),
    })
    const router = renderApp('/')

    await userEvent.click(await screen.findByRole('button', { name: 'Salir' }))

    expect(await screen.findByText('Cerraste sesión. Vuelve cuando quieras.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/entrar')
    expect(calls(fetchMock, '/api/auth/logout/')).toHaveLength(1)
    expect(profileCache.load()).toBeNull()
  })
})

describe('formulario de entrada', () => {
  it('valida en el cliente sin llamar al servidor', async () => {
    const fetchMock = mockFetch({ '/api/auth/refresh/': () => json({}, 401) })
    renderApp('/entrar')

    await userEvent.click(await screen.findByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('Escribe tu email.')).toBeInTheDocument()
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveFocus()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(calls(fetchMock, '/api/auth/login/')).toHaveLength(0)
  })

  it('muestra el error de credenciales del servidor', async () => {
    mockFetch({
      '/api/auth/refresh/': () => json({}, 401),
      '/api/auth/login/': () => json({ detail: 'Email o contraseña incorrectos.' }, 401),
    })
    renderApp('/entrar')

    await userEvent.type(await screen.findByLabelText('Email'), 'ana@ejemplo.mx')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'equivocada')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Email o contraseña incorrectos.')
    expect(alert).toHaveTextContent('la contraseña distingue mayúsculas')
    expect(screen.getByRole('link', { name: '¿Aún no tienes cuenta? Créala' })).toHaveAttribute(
      'href',
      '/registro',
    )
  })

  it('al entrar vuelve a la página que pedía sesión', async () => {
    mockFetch({
      '/api/auth/refresh/': () => json({}, 401),
      '/api/auth/login/': () => json({ access: 'a', user: ana }),
    })
    const router = renderApp('/perfil')

    await userEvent.type(await screen.findByLabelText('Email'), 'ana@ejemplo.mx')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'girasol-azul')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Perfil privado')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/perfil')
  })

  it('el botón de contraseña la muestra y la oculta', async () => {
    mockFetch({ '/api/auth/refresh/': () => json({}, 401) })
    renderApp('/entrar')

    const input = await screen.findByLabelText('Contraseña')
    expect(input).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(input).toHaveAttribute('type', 'text')
  })
})

describe('formulario de registro', () => {
  it('coloca los errores del servidor en su campo', async () => {
    mockFetch({
      '/api/auth/refresh/': () => json({}, 401),
      '/api/auth/register/': () => json({ email: ['Ya existe una cuenta con este email.'] }, 400),
    })
    renderApp('/registro')

    await userEvent.type(await screen.findByLabelText('Nombre'), 'Ana López')
    await userEvent.type(screen.getByLabelText('Email'), 'ana@ejemplo.mx')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'girasol-azul')
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText('Ya existe una cuenta con este email.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entrar con ese email' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveFocus()
  })

  it('marca los requisitos de la contraseña mientras se escribe', async () => {
    mockFetch({ '/api/auth/refresh/': () => json({}, 401) })
    renderApp('/registro')

    await userEvent.type(await screen.findByLabelText('Contraseña'), '1234567890')

    expect(screen.getByText(/Al menos 10 caracteres/).closest('li')).toHaveClass('is-ok')
    expect(screen.getByText(/No solo números/).closest('li')).not.toHaveClass('is-ok')
  })
})
