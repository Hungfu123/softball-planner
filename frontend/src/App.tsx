import { useState, useCallback, lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { PlayerManager } from '@/components/players/PlayerManager'
import { GameDayPlanner } from '@/components/planner/GameDayPlanner'
import { LineupSheet } from '@/components/export/LineupSheet'
import { TrainingPage } from '@/components/training/TrainingPage'
import { LoginPage } from '@/components/auth/LoginPage'
import { setAuth, hasAuth, clearAuth } from '@/api/client'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'

// Lazy-load heavy pages
const TrainingPlanPage = lazy(() => import('@/components/training-plan/TrainingPlanPage'))
const ScoringPage = lazy(() => import('@/components/scoring/ScoringPage').then(m => ({ default: m.ScoringPage })))

function LazyScoring() {
  return <Suspense fallback={<LoadingSkeleton />}><ScoringPage /></Suspense>
}

function LazyTrainingPlan() {
  return <Suspense fallback={<LoadingSkeleton />}><TrainingPlanPage /></Suspense>
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/training', element: <TrainingPage /> },
      { path: '/training-plan', element: <LazyTrainingPlan /> },
      { path: '/players', element: <PlayerManager /> },
      { path: '/gameday/:id', element: <GameDayPlanner /> },
    ],
  },
  { path: '/gameday/:id/export', element: <LineupSheet /> },
  { path: '/gameday/:id/scoring/:gameIndex', element: <LazyScoring /> },
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
