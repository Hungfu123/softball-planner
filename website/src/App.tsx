import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from '@/pages/LandingPage'
import Impressum from '@/pages/Impressum'
import Datenschutz from '@/pages/Datenschutz'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/impressum" element={<Impressum />} />
      <Route path="/datenschutz" element={<Datenschutz />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
