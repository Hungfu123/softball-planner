import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { UpdateWaechter } from '@/pwa/UpdateWaechter'
import { SpielermodusLeiste } from '@/components/layout/SpielermodusLeiste'
import { useZiehenSperre } from '@/hooks/useZiehenSperre'
import { routes } from './routes'

const router = createBrowserRouter(routes)

export default function App() {
  // Das Ziehen-zum-Neuladen bleibt der installierten App als einziger Handgriff — nur auf
  // den Scoring-Seiten nicht.
  useZiehenSperre(router)

  return (
    <AuthProvider>
      {/* Ueber dem Router: so deckt er auch die Scoring-Seiten ab, die ausserhalb des Layouts laufen. */}
      <UpdateWaechter />
      <RouterProvider router={router} />
      {/* Ebenfalls ueber dem Router: der Streifen muss auch auf den Seiten stehen,
          die ausserhalb des Layouts laufen (Scoring). */}
      <SpielermodusLeiste />
    </AuthProvider>
  )
}
