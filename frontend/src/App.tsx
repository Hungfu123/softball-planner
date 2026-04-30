import { useState, useCallback, lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout, ToastProvider } from '@/components/layout/Layout'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { PlayerManager } from '@/components/players/PlayerManager'
import { GameDayPlanner } from '@/components/planner/GameDayPlanner'
import { LineupSheet } from '@/components/export/LineupSheet'
import { TrainingPage } from '@/components/training/TrainingPage'
import { LoginPage } from '@/components/auth/LoginPage'
import { setAuth, hasAuth, clearAuth } from '@/api/client'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ChunkErrorBoundary } from '@/components/shared/ChunkErrorBoundary'

// Lazy-load heavy pages
const TrainingPlanPage = lazy(() => import('@/components/training-plan/TrainingPlanPage'))
const ScoringPage = lazy(() => import('@/components/scoring/ScoringPage').then(m => ({ default: m.ScoringPage })))
const StatsPage = lazy(() => import('@/components/stats/StatsPage').then(m => ({ default: m.StatsPage })))
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

function LazyTrainingPlan() {
  return <Suspense fallback={<LoadingSkeleton />}><TrainingPlanPage /></Suspense>
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
      { path: '/training', element: <TrainingPage />, errorElement: <ChunkErrorBoundary /> },
      { path: '/training-plan', element: <LazyTrainingPlan />, errorElement: <ChunkErrorBoundary /> },
      { path: '/players', element: <PlayerManager />, errorElement: <ChunkErrorBoundary /> },
      { path: '/gameday/:id', element: <GameDayPlanner />, errorElement: <ChunkErrorBoundary /> },
      { path: '/stats', element: <LazyStats />, errorElement: <ChunkErrorBoundary /> },
      { path: '/spielbogen', element: <LazySpielbogenList />, errorElement: <ChunkErrorBoundary /> },
      { path: '/spielbogen/new', element: <LazySpielbogenWizard />, errorElement: <ChunkErrorBoundary /> },
    ],
  },
  { path: '/spielbogen/:id/scoring', element: <LazySpielbogenPage />, errorElement: <ChunkErrorBoundary /> },
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
