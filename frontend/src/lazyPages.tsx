import { lazy, Suspense } from 'react'
import { ToastProvider } from '@/components/layout/Layout'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'

/*
 * Die schweren Seiten und ihre Suspense-Hüllen. Eigene Datei, weil sie Komponenten
 * exportiert — die Routentabelle daneben exportiert Daten, und beides in einer Datei
 * bricht Fast Refresh.
 */

const TrainingTodayPage = lazy(() => import('@/components/training/TrainingTodayPage').then(m => ({ default: m.TrainingTodayPage })))
const EquipmentCatalogPage = lazy(() => import('@/components/equipment/EquipmentCatalogPage'))
const ScoringPage = lazy(() => import('@/components/scoring/ScoringPage').then(m => ({ default: m.ScoringPage })))
const StatsPage = lazy(() => import('@/components/stats/StatsPage').then(m => ({ default: m.StatsPage })))
const CalendarPage = lazy(() => import('@/components/calendar/CalendarPage').then(m => ({ default: m.CalendarPage })))
const SpielbogenList = lazy(() => import('@/components/spielbogen/SpielbogenList'))
const SpielbogenWizard = lazy(() => import('@/components/spielbogen/SpielbogenWizard'))
const SpielbogenPage = lazy(() => import('@/components/spielbogen/SpielbogenPage'))
const CounterPage = lazy(() => import('@/components/counter/CounterPage'))
// pdf-lib wiegt schwer und wird einmal im Monat gebraucht — nicht ins Hauptbundle.
const TrainerabrechnungPage = lazy(() => import('@/components/orga/TrainerabrechnungPage'))
const PlaymakerOverview = lazy(() => import('@/components/playmaker/PlaymakerOverview'))
const PlaySetupPage = lazy(() => import('@/components/playmaker/PlaySetupPage'))
const PlayEditorPage = lazy(() => import('@/components/playmaker/PlayEditorPage'))
const PlayViewerPage = lazy(() => import('@/components/playmaker/PlayViewerPage'))

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

export function LazyEquipmentCatalog() {
  return <Suspense fallback={<LoadingSkeleton />}><EquipmentCatalogPage /></Suspense>
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

export function LazyPlayViewer() {
  return <Suspense fallback={<LoadingSkeleton />}><PlayViewerPage /></Suspense>
}

export function LazyTrainerabrechnung() {
  return <Suspense fallback={<LoadingSkeleton />}><TrainerabrechnungPage /></Suspense>
}
