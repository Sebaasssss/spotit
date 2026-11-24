import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { AuthProvider } from './auth/AuthContext'
import { PublicOnly, RequireAuth } from './auth/guards'
import { UpdatePrompt } from './components/UpdatePrompt'
import { Home } from './routes/Home'
import { Login } from './routes/Login'
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
    children: [{ path: '/', element: <Home /> }],
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
