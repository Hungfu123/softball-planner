import { Navigate, type RouteObject } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Startseite } from '@/components/dashboard/Startseite'
import { StartPage } from '@/components/start/StartPage'
import { RequireAuth } from '@/components/auth/AuthProvider'
import { RequireRole } from '@/components/auth/RequireRole'
import { ChunkErrorBoundary } from '@/components/shared/ChunkErrorBoundary'
import { OrgaHome } from '@/components/orga/OrgaHome'
import { TeamDirectoryPage } from '@/components/orga/TeamDirectoryPage'
import { GameLogPage } from '@/components/orga/GameLogPage'
import { KontoPage } from '@/components/account/KontoPage'
import {
  LazyAccounts,
  LazyGameDayPlanner,
  LazyInvitationList,
  LazyLineupSheet,
  LazyPlayerManager,
  LazyPlayerProfile,
  LazyWhatsappPoll,
  LazyCalendar,
  LazyHistorie,
  LazyCounter,
  LazyTrainerabrechnung,
  LazyPlaymaker,
  LazyPlaySetup,
  LazyPlayEditor,
  LazyFreiesFeld,
  LazyPlayViewer,
  LazySpielwissen,
  LazySpielwissenKapitel,
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
      /*
       * `/` ist die eigene Startseite, nicht die des Vereins: Name, Position, Zahlen und
       * drei zugeklappte Antworten. Der Spielbetrieb ist eine Werkbank und hat seit dem
       * 27.10.2026 seine eigene Adresse — zusammen auf einer Seite wurde beides lang.
       */
      { path: '/', element: <StartPage />, errorElement: <ChunkErrorBoundary /> },
      { path: '/spielbetrieb', element: <Startseite />, errorElement: <ChunkErrorBoundary /> },
      { path: '/kalender', element: <LazyCalendar />, errorElement: <ChunkErrorBoundary /> },
      { path: '/training', element: <RequireRole mind="ADMIN"><LazyTrainingToday /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/players', element: <RequireRole mind="ADMIN"><LazyPlayerManager /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/players/:id', element: <LazyPlayerProfile />, errorElement: <ChunkErrorBoundary /> },
      { path: '/gameday/:id', element: <RequireRole mind="ADMIN"><LazyGameDayPlanner /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/stats', element: <LazyStats />, errorElement: <ChunkErrorBoundary /> },
      { path: '/spielbogen', element: <RequireRole mind="ADMIN"><LazySpielbogenList /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/spielbogen/new', element: <RequireRole mind="ADMIN"><LazySpielbogenWizard /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga', element: <RequireRole mind="ADMIN"><OrgaHome /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/einladungen', element: <RequireRole mind="ADMIN"><LazyInvitationList /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/whatsapp-umfrage', element: <RequireRole mind="ADMIN"><LazyWhatsappPoll /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/trainerabrechnung', element: <RequireRole mind="ADMIN"><LazyTrainerabrechnung /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/playmaker', element: <LazyPlaymaker />, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/playmaker/neu', element: <RequireRole mind="ADMIN"><LazyPlaySetup /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/accounts', element: <RequireRole mind="ADMIN"><LazyAccounts /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/historie', element: <RequireRole mind="SUPERADMIN"><LazyHistorie /></RequireRole>, errorElement: <ChunkErrorBoundary /> },
      // Das eigene Konto: jede Rolle, daher ohne RequireRole.
      { path: '/konto', element: <KontoPage />, errorElement: <ChunkErrorBoundary /> },
      // Spielwissen gehoert jeder Rolle: es bewertet niemanden.
      { path: '/spielwissen', element: <LazySpielwissen />, errorElement: <ChunkErrorBoundary /> },
      { path: '/teams', element: <TeamDirectoryPage />, errorElement: <ChunkErrorBoundary /> },
      { path: '/teams/spiele', element: <GameLogPage />, errorElement: <ChunkErrorBoundary /> },
    ],
  },
  // Einzige Route ohne RequireAuth — der Zähler soll ohne Anmeldung laufen.
  { path: '/counter', element: <LazyCounter />, errorElement: <ChunkErrorBoundary /> },
  { path: '/spielbogen/:id', element: <RequireAuth><RequireRole mind="ADMIN"><LazySpielbogenPage /></RequireRole></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  { path: '/gameday/:id/export', element: <RequireAuth><LazyLineupSheet /></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  { path: '/gameday/:id/scoring/:gameIndex', element: <RequireAuth><RequireRole scorer><LazyScoring /></RequireRole></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  // Wie die ScoringPage ausserhalb des Layouts: beide fuellen den Bildschirm per h-dvh,
  // innerhalb der Navigation waere der Rest zwangslaeufig ueberlang und die Seite wuerde
  // scrollen — genau das soll sie nicht.
  { path: '/orga/playmaker/:id', element: <RequireAuth><LazyPlayViewer /></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  // Dasselbe fuer die Offense: ein Kapitel ist die Entsprechung eines Plays und fuellt
  // genauso den Bildschirm. Die Uebersicht darueber bleibt im Layout — sie ist eine Liste.
  { path: '/spielwissen/:kapitel', element: <RequireAuth><LazySpielwissenKapitel /></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  // Vor der :id-Route, sonst wird "frei" als id gelesen.
  { path: '/orga/playmaker/frei', element: <RequireAuth><LazyFreiesFeld /></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  { path: '/orga/playmaker/:id/bearbeiten', element: <RequireAuth><RequireRole mind="ADMIN"><LazyPlayEditor /></RequireRole></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
  // Kein Match (z.B. vertippte URL) fiele sonst auf die pfadlose Layout-Route
  // zurück und zeigte deren errorElement statt einer sinnvollen Seite —
  // abgemeldet die Anmeldung, angemeldet zurück aufs Dashboard.
  { path: '*', element: <RequireAuth><Navigate to="/" replace /></RequireAuth>, errorElement: <ChunkErrorBoundary /> },
]
