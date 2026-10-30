import { lazy, Suspense } from 'react'
import { ToastProvider } from '@/components/layout/Layout'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'

/*
 * Die schweren Seiten und ihre Suspense-Hüllen. Eigene Datei, weil sie Komponenten
 * exportiert — die Routentabelle daneben exportiert Daten, und beides in einer Datei
 * bricht Fast Refresh.
 */

const TrainingTodayPage = lazy(() => import('@/components/training/TrainingTodayPage').then(m => ({ default: m.TrainingTodayPage })))
const ScoringPage = lazy(() => import('@/components/scoring/ScoringPage').then(m => ({ default: m.ScoringPage })))
const StatsPage = lazy(() => import('@/components/stats/StatsPage').then(m => ({ default: m.StatsPage })))
const CalendarPage = lazy(() => import('@/components/calendar/CalendarPage').then(m => ({ default: m.CalendarPage })))
const SpielbogenList = lazy(() => import('@/components/spielbogen/SpielbogenList'))
const SpielbogenWizard = lazy(() => import('@/components/spielbogen/SpielbogenWizard'))
const SpielbogenPage = lazy(() => import('@/components/spielbogen/SpielbogenPage'))
const CounterPage = lazy(() => import('@/components/counter/CounterPage'))
// pdf-lib wiegt schwer und wird einmal im Monat gebraucht — nicht ins Hauptbundle.
const TrainerabrechnungPage = lazy(() => import('@/components/orga/TrainerabrechnungPage'))
const AccountsPage = lazy(() => import('@/components/orga/AccountsPage'))
const HistoriePage = lazy(() => import('@/components/orga/HistoriePage'))
const PlaymakerOverview = lazy(() => import('@/components/playmaker/PlaymakerOverview'))
const PlaySetupPage = lazy(() => import('@/components/playmaker/PlaySetupPage'))
const PlayEditorPage = lazy(() => import('@/components/playmaker/PlayEditorPage'))
const FreiesFeldPage = lazy(() => import('@/components/playmaker/FreiesFeldPage'))
const PlayViewerPage = lazy(() => import('@/components/playmaker/PlayViewerPage'))
const SpielwissenHome = lazy(() => import('@/components/spielwissen/SpielwissenHome'))
const KapitelSeite = lazy(() => import('@/components/spielwissen/KapitelSeite'))
/*
 * Schwere Seiten, auf denen niemand LANDET: der Planer, die Umfragen, der Kader, das
 * Spielerprofil, der Aufstellungsbogen. Sie lagen im Eintrittsbuendel und mussten geladen
 * und ausgewertet sein, bevor die Startseite ihr erstes Pixel zeigt — obwohl man sie
 * fruehestens nach einem Klick sieht.
 */
const GameDayPlanner = lazy(() => import('@/components/planner/GameDayPlanner').then(m => ({ default: m.GameDayPlanner })))
const WhatsappPollPage = lazy(() => import('@/components/orga/WhatsappPollPage').then(m => ({ default: m.WhatsappPollPage })))
const PlayerManager = lazy(() => import('@/components/players/PlayerManager').then(m => ({ default: m.PlayerManager })))
const PlayerProfilePage = lazy(() => import('@/components/players/PlayerProfilePage').then(m => ({ default: m.PlayerProfilePage })))
const LineupSheet = lazy(() => import('@/components/export/LineupSheet').then(m => ({ default: m.LineupSheet })))
const InvitationListPage = lazy(() => import('@/components/orga/InvitationListPage').then(m => ({ default: m.InvitationListPage })))

export function LazyScoring() {
  // ScoringPage läuft außerhalb des Layouts — eigener ToastProvider nötig,
  // sonst crasht useToastContext().show() mit null.
  return (
    <ToastProvider>
      <Suspense fallback={<LoadingSkeleton />}><ScoringPage /></Suspense>
    </ToastProvider>
  )
}

export function LazySpielbogenPage() {
  return (
    <ToastProvider>
      <Suspense fallback={<LoadingSkeleton />}><SpielbogenPage /></Suspense>
    </ToastProvider>
  )
}

export function LazyStats() {
  return <Suspense fallback={<LoadingSkeleton />}><StatsPage /></Suspense>
}

export function LazySpielbogenList() {
  return <Suspense fallback={<LoadingSkeleton />}><SpielbogenList /></Suspense>
}

export function LazySpielbogenWizard() {
  return <Suspense fallback={<LoadingSkeleton />}><SpielbogenWizard /></Suspense>
}

export function LazyCounter() {
  return <Suspense fallback={<LoadingSkeleton />}><CounterPage /></Suspense>
}

export function LazyTrainingToday() {
  return <Suspense fallback={<LoadingSkeleton />}><TrainingTodayPage /></Suspense>
}

export function LazyCalendar() {
  return <Suspense fallback={<LoadingSkeleton />}><CalendarPage /></Suspense>
}

export function LazyPlaymaker() {
  return <Suspense fallback={<LoadingSkeleton />}><PlaymakerOverview /></Suspense>
}

export function LazyPlaySetup() {
  return <Suspense fallback={<LoadingSkeleton />}><PlaySetupPage /></Suspense>
}

export function LazyPlayEditor() {
  return <Suspense fallback={<LoadingSkeleton />}><PlayEditorPage /></Suspense>
}

export function LazyFreiesFeld() {
  return <Suspense fallback={<LoadingSkeleton />}><FreiesFeldPage /></Suspense>
}

export function LazyPlayViewer() {
  return <Suspense fallback={<LoadingSkeleton />}><PlayViewerPage /></Suspense>
}

export function LazySpielwissen() {
  return <Suspense fallback={<LoadingSkeleton />}><SpielwissenHome /></Suspense>
}

export function LazySpielwissenKapitel() {
  return <Suspense fallback={<LoadingSkeleton />}><KapitelSeite /></Suspense>
}

export function LazyTrainerabrechnung() {
  return <Suspense fallback={<LoadingSkeleton />}><TrainerabrechnungPage /></Suspense>
}

export function LazyAccounts() {
  return <Suspense fallback={<LoadingSkeleton />}><AccountsPage /></Suspense>
}

export function LazyHistorie() {
  return <Suspense fallback={<LoadingSkeleton />}><HistoriePage /></Suspense>
}

export function LazyGameDayPlanner() {
  return <Suspense fallback={<LoadingSkeleton />}><GameDayPlanner /></Suspense>
}

export function LazyWhatsappPoll() {
  return <Suspense fallback={<LoadingSkeleton />}><WhatsappPollPage /></Suspense>
}

export function LazyPlayerManager() {
  return <Suspense fallback={<LoadingSkeleton />}><PlayerManager /></Suspense>
}

export function LazyPlayerProfile() {
  return <Suspense fallback={<LoadingSkeleton />}><PlayerProfilePage /></Suspense>
}

export function LazyLineupSheet() {
  return <Suspense fallback={<LoadingSkeleton />}><LineupSheet /></Suspense>
}

export function LazyInvitationList() {
  return <Suspense fallback={<LoadingSkeleton />}><InvitationListPage /></Suspense>
}
