import { createBrowserRouter, RouterProvider } from 'react-router'
import { UpdatePrompt } from './components/UpdatePrompt'
import { Home } from './routes/Home'

const router = createBrowserRouter([{ path: '/', element: <Home /> }])

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <UpdatePrompt />
    </>
  )
}
