import { Navigate, type RouteObject } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { PlayerManager } from '@/components/players/PlayerManager'
import { PlayerProfilePage } from '@/components/players/PlayerProfilePage'
import { GameDayPlanner } from '@/components/planner/GameDayPlanner'
import { LineupSheet } from '@/components/export/LineupSheet'
import { RequireAuth } from '@/components/auth/AuthProvider'
import { RequireRole } from '@/components/auth/RequireRole'
import { ChunkErrorBoundary } from '@/components/shared/ChunkErrorBoundary'
import { InvitationListPage } from '@/components/orga/InvitationListPage'
import { OrgaHome } from '@/components/orga/OrgaHome'
import { WhatsappPollPage } from '@/components/orga/WhatsappPollPage'
import { TeamDirectoryPage } from '@/components/orga/TeamDirectoryPage'
import { GameLogPage } from '@/components/orga/GameLogPage'
import {
  LazyCalendar,
  LazyCounter,
  LazyTrainerabrechnung,
  LazyPlaymaker,
  LazyPlaySetup,
  LazyPlayEditor,
  LazyFreiesFeld,
  LazyPlayViewer,
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
      { path: '/training', element: <RequireRole mind="ADMIN"><LazyTrainingToday /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/players', element: <RequireRole mind="ADMIN"><PlayerManager /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/players/:id', element: <PlayerProfilePage />, errorElement: <ChunkErrorBoundary /> },
      { path: '/gameday/:id', element: <RequireRole mind="ADMIN"><GameDayPlanner /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/stats', element: <LazyStats />, errorElement: <ChunkErrorBoundary /> },
      { path: '/spielbogen', element: <RequireRole mind="ADMIN"><LazySpielbogenList /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/spielbogen/new', element: <RequireRole mind="ADMIN"><LazySpielbogenWizard /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga', element: <RequireRole mind="ADMIN"><OrgaHome /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/einladungen', element: <RequireRole mind="ADMIN"><InvitationListPage /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/whatsapp-umfrage', element: <RequireRole mind="ADMIN"><WhatsappPollPage /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/trainerabrechnung', element: <RequireRole mind="ADMIN"><LazyTrainerabrechnung /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/playmaker', element: <LazyPlaymaker />, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/playmaker/neu', element: <RequireRole mind="ADMIN"><LazyPlaySetup /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/teams', element: <TeamDirectoryPage />, errorElement: <ChunkErrorBoundary /> },
      { path: '/teams/spiele', element: <GameLogPage />, errorElement: <ChunkErrorBoundary /> },
    ],
  },
  // Einzige Route ohne RequireAuth — der Zähler soll ohne Anmeldung laufen.
  { path: '/counter', element: <LazyCounter />, errorElement: <ChunkErrorBoundary /> },
  { path: '/spielbogen/:id', element: <RequireAuth><RequireRole mind="ADMIN"><LazySpielbogenPage /></RequireRole></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  { path: '/gameday/:id/export', element: <RequireAuth><LineupSheet /></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  { path: '/gameday/:id/scoring/:gameIndex', element: <RequireAuth><RequireRole scorer><LazyScoring /></RequireRole></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  // Wie die ScoringPage ausserhalb des Layouts: beide fuellen den Bildschirm per h-dvh,
  // innerhalb der Navigation waere der Rest zwangslaeufig ueberlang und die Seite wuerde
  // scrollen — genau das soll sie nicht.
  { path: '/orga/playmaker/:id', element: <RequireAuth><LazyPlayViewer /></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  // Vor der :id-Route, sonst wird "frei" als id gelesen.
  { path: '/orga/playmaker/frei', element: <RequireAuth><LazyFreiesFeld /></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  { path: '/orga/playmaker/:id/bearbeiten', element: <RequireAuth><RequireRole mind="ADMIN"><LazyPlayEditor /></RequireRole></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  // Kein Match (z.B. vertippte URL) fiele sonst auf die pfadlose Layout-Route
  // zurück und zeigte deren errorElement statt einer sinnvollen Seite —
  // abgemeldet die Anmeldung, angemeldet zurück aufs Dashboard.
  { path: '*', element: <RequireAuth><Navigate to="/" replace /></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
]
