import { useState, useCallback, lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout, ToastProvider } from '@/components/layout/Layout'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { PlayerManager } from '@/components/players/PlayerManager'
import { GameDayPlanner } from '@/components/planner/GameDayPlanner'
import { LineupSheet } from '@/components/export/LineupSheet'
import { LoginPage } from '@/components/auth/LoginPage'
import { setAuth, hasAuth, clearAuth } from '@/api/client'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ChunkErrorBoundary } from '@/components/shared/ChunkErrorBoundary'
import { InvitationListPage } from '@/components/orga/InvitationListPage'
import { OrgaHome } from '@/components/orga/OrgaHome'

// Lazy-load heavy pages
const TrainingTodayPage = lazy(() => import('@/components/training/TrainingTodayPage').then(m => ({ default: m.TrainingTodayPage })))
const EquipmentCatalogPage = lazy(() => import('@/components/equipment/EquipmentCatalogPage'))
const ScoringPage = lazy(() => import('@/components/scoring/ScoringPage').then(m => ({ default: m.ScoringPage })))
const StatsPage = lazy(() => import('@/components/stats/StatsPage').then(m => ({ default: m.StatsPage })))
const CalendarPage = lazy(() => import('@/components/calendar/CalendarPage').then(m => ({ default: m.CalendarPage })))
const SpielbogenList = lazy(() => import('@/components/spielbogen/SpielbogenList'))
const SpielbogenWizard = lazy(() => import('@/components/spielbogen/SpielbogenWizard'))
const SpielbogenPage = lazy(() => import('@/components/spielbogen/SpielbogenPage'))

function LazyScoring() {
  // ScoringPage läuft außerhalb des Layouts — eigener ToastProvider nötig,
  // sonst crasht useToastContext().show() mit null.
  return (
    <ToastProvider>
      <Suspense fallback={<LoadingSkeleton />}><ScoringPage /></Suspense>
    </ToastProvider>
  )
}

function LazyStats() {
  return <Suspense fallback={<LoadingSkeleton />}><StatsPage /></Suspense>
}

function LazySpielbogenList() {
  return <Suspense fallback={<LoadingSkeleton />}><SpielbogenList /></Suspense>
}

function LazySpielbogenWizard() {
  return <Suspense fallback={<LoadingSkeleton />}><SpielbogenWizard /></Suspense>
}

function LazySpielbogenPage() {
  return (
    <ToastProvider>
      <Suspense fallback={<LoadingSkeleton />}><SpielbogenPage /></Suspense>
    </ToastProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <ChunkErrorBoundary />,
    children: [
      { path: '/', element: <Dashboard />, errorElement: <ChunkErrorBoundary /> },
      { path: '/kalender', element: <Suspense fallback={<LoadingSkeleton />}><CalendarPage /></Suspense>, errorElement: <ChunkErrorBoundary /> },
      { path: '/training', element: <Suspense fallback={<LoadingSkeleton />}><TrainingTodayPage /></Suspense>, errorElement: <ChunkErrorBoundary /> },
      { path: '/players', element: <PlayerManager />, errorElement: <ChunkErrorBoundary /> },
      { path: '/gameday/:id', element: <GameDayPlanner />, errorElement: <ChunkErrorBoundary /> },
      { path: '/stats', element: <LazyStats />, errorElement: <ChunkErrorBoundary /> },
      { path: '/spielbogen', element: <LazySpielbogenList />, errorElement: <ChunkErrorBoundary /> },
      { path: '/spielbogen/new', element: <LazySpielbogenWizard />, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga', element: <OrgaHome />, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/einladungen', element: <InvitationListPage />, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/aufbau', element: <Suspense fallback={<LoadingSkeleton />}><EquipmentCatalogPage /></Suspense>, errorElement: <ChunkErrorBoundary /> },
    ],
  },
  { path: '/spielbogen/:id', element: <LazySpielbogenPage />, errorElement: <ChunkErrorBoundary /> },
  { path: '/gameday/:id/export', element: <LineupSheet />, errorElement: <ChunkErrorBoundary /> },
  { path: '/gameday/:id/scoring/:gameIndex', element: <LazyScoring />, errorElement: <ChunkErrorBoundary /> },
])

export default function App() {
  const [loggedIn, setLoggedIn] = useState(hasAuth())
  const [loginError, setLoginError] = useState<string | null>(null)

  const handleLogin = useCallback(async (password: string) => {
    setAuth(password)
    try {
      const res = await fetch('/api/players', {
        headers: { Authorization: `Basic ${btoa(`admin:${password}`)}` },
      })
      if (res.status === 401) {
        clearAuth()
        setLoginError('Falsches Passwort')
        return
      }
      setLoginError(null)
      setLoggedIn(true)
    } catch {
      clearAuth()
      setLoginError('Server nicht erreichbar')
    }
  }, [])

  if (!loggedIn) {
    return <LoginPage onLogin={handleLogin} error={loginError} />
  }

  return <RouterProvider router={router} />
}
