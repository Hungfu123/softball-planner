import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { UpdateWaechter } from '@/pwa/UpdateWaechter'
import { routes } from './routes'

const router = createBrowserRouter(routes)

export default function App() {
  return (
    <AuthProvider>
      {/* Ueber dem Router: so deckt er auch die Scoring-Seiten ab, die ausserhalb des Layouts laufen. */}
      <UpdateWaechter />
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
