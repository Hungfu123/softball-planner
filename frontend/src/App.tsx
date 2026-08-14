import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout, ToastProvider } from '@/components/layout/Layout'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { PlayerManager } from '@/components/players/PlayerManager'
import { GameDayPlanner } from '@/components/planner/GameDayPlanner'
import { LineupSheet } from '@/components/export/LineupSheet'
import { AuthProvider, RequireAuth } from '@/components/auth/AuthProvider'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ChunkErrorBoundary } from '@/components/shared/ChunkErrorBoundary'
import { InvitationListPage } from '@/components/orga/InvitationListPage'
import { OrgaHome } from '@/components/orga/OrgaHome'
import { WhatsappPollPage } from '@/components/orga/WhatsappPollPage'

// Lazy-load heavy pages
const TrainingTodayPage = lazy(() => import('@/components/training/TrainingTodayPage').then(m => ({ default: m.TrainingTodayPage })))
const EquipmentCatalogPage = lazy(() => import('@/components/equipment/EquipmentCatalogPage'))
const ScoringPage = lazy(() => import('@/components/scoring/ScoringPage').then(m => ({ default: m.ScoringPage })))
const StatsPage = lazy(() => import('@/components/stats/StatsPage').then(m => ({ default: m.StatsPage })))
const CalendarPage = lazy(() => import('@/components/calendar/CalendarPage').then(m => ({ default: m.CalendarPage })))
const SpielbogenList = lazy(() => import('@/components/spielbogen/SpielbogenList'))
const SpielbogenWizard = lazy(() => import('@/components/spielbogen/SpielbogenWizard'))
const SpielbogenPage = lazy(() => import('@/components/spielbogen/SpielbogenPage'))
const CounterPage = lazy(() => import('@/components/counter/CounterPage'))

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

function LazyCounter() {
  return <Suspense fallback={<LoadingSkeleton />}><CounterPage /></Suspense>
}

// Als eigener Export gehalten, damit App.routes.test.tsx jede Route unabhängig
// vom App-Root (und dessen AuthProvider/RouterProvider-Verdrahtung) durchgehen kann.
export const routes = [
  {
    element: <RequireAuth><Layout /></RequireAuth>,
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
      { path: '/orga/whatsapp-umfrage', element: <WhatsappPollPage />, errorElement: <ChunkErrorBoundary /> },
    ],
  },
  // Einzige Route ohne RequireAuth — der Zähler soll ohne Anmeldung laufen.
  { path: '/counter', element: <LazyCounter />, errorElement: <ChunkErrorBoundary /> },
  { path: '/spielbogen/:id', element: <RequireAuth><LazySpielbogenPage /></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  { path: '/gameday/:id/export', element: <RequireAuth><LineupSheet /></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  { path: '/gameday/:id/scoring/:gameIndex', element: <RequireAuth><LazyScoring /></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
]

const router = createBrowserRouter(routes)

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
