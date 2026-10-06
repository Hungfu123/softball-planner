import { Navigate, type RouteObject } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { PlayerManager } from '@/components/players/PlayerManager'
import { GameDayPlanner } from '@/components/planner/GameDayPlanner'
import { LineupSheet } from '@/components/export/LineupSheet'
import { RequireAuth } from '@/components/auth/AuthProvider'
import { ChunkErrorBoundary } from '@/components/shared/ChunkErrorBoundary'
import { InvitationListPage } from '@/components/orga/InvitationListPage'
import { OrgaHome } from '@/components/orga/OrgaHome'
import { WhatsappPollPage } from '@/components/orga/WhatsappPollPage'
import { TeamDirectoryPage } from '@/components/orga/TeamDirectoryPage'
import { GameLogPage } from '@/components/orga/GameLogPage'
import {
  LazyCalendar,
  LazyCounter,
  LazyEquipmentCatalog,
  LazyScoring,
  LazySpielbogenList,
  LazySpielbogenPage,
  LazySpielbogenWizard,
  LazyStats,
  LazyTrainingToday,
} from './lazyPages'

/*
 * Die Routentabelle liegt in einer eigenen Datei, nicht in App.tsx: routes.test.tsx baut
 * daraus einen Memory-Router und geht jeden Pfad unabhängig vom App-Root durch. Die
 * Suspense-Hüllen der schweren Seiten stehen in lazyPages.tsx — Komponenten und Daten in
 * einer Datei brechen Fast Refresh.
 */
export const routes: RouteObject[] = [
  {
    element: <RequireAuth><Layout /></RequireAuth>,
    errorElement: <ChunkErrorBoundary />,
    children: [
      { path: '/', element: <Dashboard />, errorElement: <ChunkErrorBoundary /> },
      { path: '/kalender', element: <LazyCalendar />, errorElement: <ChunkErrorBoundary /> },
      { path: '/training', element: <LazyTrainingToday />, errorElement: <ChunkErrorBoundary /> },
      { path: '/players', element: <PlayerManager />, errorElement: <ChunkErrorBoundary /> },
      { path: '/gameday/:id', element: <GameDayPlanner />, errorElement: <ChunkErrorBoundary /> },
      { path: '/stats', element: <LazyStats />, errorElement: <ChunkErrorBoundary /> },
      { path: '/spielbogen', element: <LazySpielbogenList />, errorElement: <ChunkErrorBoundary /> },
      { path: '/spielbogen/new', element: <LazySpielbogenWizard />, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga', element: <OrgaHome />, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/einladungen', element: <InvitationListPage />, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/aufbau', element: <LazyEquipmentCatalog />, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/whatsapp-umfrage', element: <WhatsappPollPage />, errorElement: <ChunkErrorBoundary /> },
      { path: '/teams', element: <TeamDirectoryPage />, errorElement: <ChunkErrorBoundary /> },
      { path: '/teams/spiele', element: <GameLogPage />, errorElement: <ChunkErrorBoundary /> },
    ],
  },
  // Einzige Route ohne RequireAuth — der Zähler soll ohne Anmeldung laufen.
  { path: '/counter', element: <LazyCounter />, errorElement: <ChunkErrorBoundary /> },
  { path: '/spielbogen/:id', element: <RequireAuth><LazySpielbogenPage /></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  { path: '/gameday/:id/export', element: <RequireAuth><LineupSheet /></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  { path: '/gameday/:id/scoring/:gameIndex', element: <RequireAuth><LazyScoring /></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  // Kein Match (z.B. vertippte URL) fiele sonst auf die pfadlose Layout-Route
  // zurück und zeigte deren errorElement statt einer sinnvollen Seite —
  // abgemeldet die Anmeldung, angemeldet zurück aufs Dashboard.
  { path: '*', element: <RequireAuth><Navigate to="/" replace /></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
]
