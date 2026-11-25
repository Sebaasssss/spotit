import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { AuthProvider } from './auth/AuthContext'
import { PublicOnly, RequireAuth, Splash } from './auth/guards'
import { UpdatePrompt } from './components/UpdatePrompt'
import { Home } from './routes/Home'
import { Login } from './routes/Login'
import { MyReports } from './routes/MyReports'
import { Register } from './routes/Register'

const router = createBrowserRouter([
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
      { path: '/reportes', element: <MyReports /> },
      // Las pantallas con mapa (Leaflet) se cargan aparte para que el inicio siga ligero.
      {
        path: '/reportes/nuevo',
        lazy: async () => ({ Component: (await import('./routes/NewReport')).NewReport }),
        HydrateFallback: Splash,
      },
      {
        path: '/reportes/:id',
        lazy: async () => ({ Component: (await import('./routes/ReportDetail')).ReportDetail }),
        HydrateFallback: Splash,
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <UpdatePrompt />
    </AuthProvider>
  )
}
