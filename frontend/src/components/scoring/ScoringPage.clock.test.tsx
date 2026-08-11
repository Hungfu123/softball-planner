import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { GameDayResponse, ScoreboardResponse, ClockStateResponse } from '@/types'

// Task 5: Spielzeit-Uhr in der Legacy-Kopfzeile. Zwei Dinge müssen stimmen:
//   1) Regressionsschutz — ohne gestartete Uhr bleibt der Rest der Kopfzeile (Inning, Outs,
//      der 3px-Strich) exakt wie vor dieser Änderung. Geprüft wird das gerenderte DOM, nicht
//      die an GameClockReadout/-Rule übergebenen Props.
//   2) Die neue Bedienung — Tap auf die Uhr startet/pausiert/setzt fort, das Start-Sheet bietet
//      50/90 min, freie Eingabe und "Ohne Limit".

const mockStartClock = vi.fn()
const mockPauseClock = vi.fn()
const mockResumeClock = vi.fn()
const mockResetClock = vi.fn()
const mockToastShow = vi.fn()

let scoreboardValue: ScoreboardResponse | null = null

vi.mock('@/hooks/useScoring', () => ({
  useScoring: () => ({
    atBats: [],
    stealingEvents: [],
    scoreboard: scoreboardValue,
    loading: false,
    error: null,
    reload: vi.fn(),
    recordAtBat: vi.fn(),
    undo: vi.fn(),
    recordStealingEvent: vi.fn(),
    recordAutomaticOut: vi.fn(),
    deleteStealingEvent: vi.fn(),
    startClock: mockStartClock,
    pauseClock: mockPauseClock,
    resumeClock: mockResumeClock,
    resetClock: mockResetClock,
  }),
}))

vi.mock('@/components/layout/Layout', () => ({
  useToastContext: () => ({ show: mockToastShow, dismiss: vi.fn() }),
}))

vi.mock('@/api/client', () => ({
  getGameDay: vi.fn(),
  getLineup: vi.fn().mockResolvedValue([]),
  getSubstitutions: vi.fn().mockResolvedValue([]),
}))

import { getGameDay } from '@/api/client'
import { ScoringPage } from './ScoringPage'

function clockState(overrides: Partial<ClockStateResponse>): ClockStateResponse {
  return { elapsedSeconds: 0, running: false, started: false, limitMinutes: null, overLimit: false, ...overrides }
}

function scoreboardFixture(overrides: Partial<ScoreboardResponse> = {}): ScoreboardResponse {
  return {
    gameId: 555,
    scoreUs: 0,
    scoreThem: 0,
    currentInning: 1,
    outsInCurrentInning: 0,
    baseState: { first: null, second: null, third: null },
    runners: [],
    currentBatterId: null,
    currentBatterName: null,
    currentBatterOrder: null,
    totalAtBats: 0,
    clock: clockState({}),
    ...overrides,
  }
}

function gameDayFixture(battingSide: 'top' | 'bottom' | null = 'bottom'): GameDayResponse {
  return {
    id: 1,
    date: '2026-08-10',
    label: 'Testspieltag',
    location: null,
    seasonId: 9,
    availablePlayers: [],
    games: [{
      id: 555,
      gameNumber: 1,
      opponentTeam: null,
      scoreUs: null,
      scoreThem: null,
      gameDayId: 1,
      lineupEntryCount: 0,
      battingSide,
    }],
  }
}

function renderScoringPage() {
  const router = createMemoryRouter(
    [{ path: '/gameday/:id/scoring/:gameIndex', element: <ScoringPage /> }],
    { initialEntries: ['/gameday/1/scoring/0'] },
  )
  return render(<RouterProvider router={router} />)
}

// battingSide='bottom' im Fixture hält den Seiten-Auswahl-Prompt (nur relevant wenn battingSide
// noch unbekannt ist) fern — der ist für diese Suite irrelevant und würde nur Rauschen erzeugen.

beforeEach(() => {
  vi.clearAllMocks()
  scoreboardValue = null
  mockStartClock.mockResolvedValue(clockState({ started: true, running: true, limitMinutes: 50 }))
  mockPauseClock.mockResolvedValue(clockState({ started: true, running: false }))
  mockResumeClock.mockResolvedValue(clockState({ started: true, running: true }))
  mockResetClock.mockResolvedValue(clockState({ started: false, running: false }))
  vi.mocked(getGameDay).mockResolvedValue(gameDayFixture())
  // Erzwingt den Desktop-Zweig von ResponsiveSheet (CenterModal) — der mobile Zweig
  // portalt über vaul's Drawer und ist hier nicht Gegenstand des Tests.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

describe('ScoringPage — Legacy-Kopfzeile bleibt unverändert ohne Uhr', () => {
  it('Regressionsschutz: ohne Scoreboard/Uhr rendert Inning, Outs und der rote Strich exakt wie bisher', async () => {
    scoreboardValue = null
    renderScoringPage()

    // Über den eindeutigen Outs-Button zur Live-State-Strip-Zeile hoch — "Inning" als Text
    // kommt auch im Header-Button "Inning löschen" vor, ist dort also nicht eindeutig genug.
    const outsButton = await screen.findByRole('button', { name: 'Automatisches Out' })
    const strip = outsButton.closest('div.bg-navy-900')
    expect(strip).toBeTruthy()
    expect(within(strip as HTMLElement).getByText('Inning')).toBeInTheDocument()
    expect(strip).toHaveTextContent('1') // displayInning-Fallback ohne Scoreboard

    // Der 3px-Strich unter der Navy-Leiste — GameClockRule im idle-Zustand rendert exakt
    // dieses eine Element, byte-identisch zum bisherigen `border-b-[3px]`-Look.
    const ruleBar = Array.from(document.querySelectorAll('div'))
      .find(el => el.className === 'h-[3px] bg-softball-red-600')
    expect(ruleBar).toBeTruthy()
  })
})

describe('ScoringPage — Spielzeit-Uhr im Legacy-Header', () => {
  it('idle Uhr zeigt eine tappbare "Zeit"-Affordanz statt der bisherigen Leere', async () => {
    scoreboardValue = scoreboardFixture()
    renderScoringPage()

    expect(await screen.findByRole('button', { name: 'Spielzeit starten' })).toBeInTheDocument()
  })

  it('Tap auf "Zeit" öffnet das Start-Sheet mit 50/90 min, freier Eingabe und "Ohne Limit"', async () => {
    const user = userEvent.setup()
    scoreboardValue = scoreboardFixture()
    renderScoringPage()

    await user.click(await screen.findByRole('button', { name: 'Spielzeit starten' }))

    expect(screen.getByText('Uhr starten')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '50 min' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '90 min' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ohne Limit' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('eigenes Limit (min)')).toBeInTheDocument()
  })

  it('Schnellwahl "50 min" startet die Uhr mit Limit 50 und schließt das Sheet', async () => {
    const user = userEvent.setup()
    scoreboardValue = scoreboardFixture()
    renderScoringPage()

    await user.click(await screen.findByRole('button', { name: 'Spielzeit starten' }))
    await user.click(screen.getByRole('button', { name: '50 min' }))

    expect(mockStartClock).toHaveBeenCalledWith(50)
    await waitFor(() => expect(screen.queryByText('Uhr starten')).not.toBeInTheDocument())
  })

  it('"Ohne Limit" startet die Uhr mit limitMinutes=null', async () => {
    const user = userEvent.setup()
    scoreboardValue = scoreboardFixture()
    renderScoringPage()

    await user.click(await screen.findByRole('button', { name: 'Spielzeit starten' }))
    await user.click(screen.getByRole('button', { name: 'Ohne Limit' }))

    expect(mockStartClock).toHaveBeenCalledWith(null)
  })

  it('freie Eingabe: Start bleibt deaktiviert ohne gültige Zahl ≥1, aktiviert sich danach', async () => {
    const user = userEvent.setup()
    scoreboardValue = scoreboardFixture()
    renderScoringPage()

    await user.click(await screen.findByRole('button', { name: 'Spielzeit starten' }))
    const startButton = screen.getByRole('button', { name: 'Start' })
    expect(startButton).toBeDisabled()

    // fireEvent.change statt userEvent.type: jsdom unterstützt keine Selection-APIs auf
    // type="number"-Feldern, was userEvent.clear()/type() dort unzuverlässig macht
    // (Konvention aus WhatsappVotersTab.test.tsx für dieselbe Eingabeart).
    const input = screen.getByPlaceholderText('eigenes Limit (min)')
    fireEvent.change(input, { target: { value: '0' } })
    expect(startButton).toBeDisabled()

    fireEvent.change(input, { target: { value: '30' } })
    expect(startButton).toBeEnabled()

    await user.click(startButton)
    expect(mockStartClock).toHaveBeenCalledWith(30)
  })

  it('laufende Uhr: Tap pausiert', async () => {
    const user = userEvent.setup()
    scoreboardValue = scoreboardFixture({ clock: clockState({ started: true, running: true, elapsedSeconds: 125, limitMinutes: 50 }) })
    renderScoringPage()

    const clockButton = await screen.findByRole('button', { name: 'Spielzeit — Zeit, 2:05' })
    await user.click(clockButton)

    expect(mockPauseClock).toHaveBeenCalledTimes(1)
    expect(mockStartClock).not.toHaveBeenCalled()
  })

  it('pausierte Uhr: Tap setzt fort', async () => {
    const user = userEvent.setup()
    scoreboardValue = scoreboardFixture({ clock: clockState({ started: true, running: false, elapsedSeconds: 340, limitMinutes: 50 }) })
    renderScoringPage()

    const clockButton = await screen.findByRole('button', { name: 'Spielzeit — Pause, 5:40' })
    await user.click(clockButton)

    expect(mockResumeClock).toHaveBeenCalledTimes(1)
  })

  it('Backend-Ablehnung (z.B. Pause auf gestoppter Uhr) landet als Toast statt zu verschwinden', async () => {
    const user = userEvent.setup()
    mockPauseClock.mockRejectedValueOnce(new Error('Die Uhr läuft nicht — Pause nicht möglich.'))
    scoreboardValue = scoreboardFixture({ clock: clockState({ started: true, running: true, elapsedSeconds: 10 }) })
    renderScoringPage()

    const clockButton = await screen.findByRole('button', { name: 'Spielzeit — Zeit, 0:10' })
    await user.click(clockButton)

    await waitFor(() =>
      expect(mockToastShow).toHaveBeenCalledWith('Die Uhr läuft nicht — Pause nicht möglich.', 'error'))
  })
})

// Task 6, Addition 2: Reset-Kontrolle. Task 5 verdrahtete nur Start/Pause/Fortsetzen — ohne
// Reset gab es keinen Weg zurück aus einem Fehlstart. Erreichbar über eine eigene
// "Uhr-Optionen"-Schaltfläche (Tap auf die Uhr selbst bleibt Pause/Fortsetzen, unverändert).
describe('ScoringPage — Uhr zurücksetzen', () => {
  it('idle Uhr zeigt keine Uhr-Optionen-Schaltfläche — nichts zum Zurücksetzen', async () => {
    scoreboardValue = scoreboardFixture()
    renderScoringPage()

    await screen.findByRole('button', { name: 'Spielzeit starten' })
    expect(screen.queryByRole('button', { name: 'Uhr-Optionen' })).not.toBeInTheDocument()
  })

  it('laufende Uhr: Uhr-Optionen öffnet den Zurücksetzen-Dialog statt der Start-Optionen', async () => {
    const user = userEvent.setup()
    scoreboardValue = scoreboardFixture({ clock: clockState({ started: true, running: true, elapsedSeconds: 125, limitMinutes: 50 }) })
    renderScoringPage()

    await user.click(await screen.findByRole('button', { name: 'Uhr-Optionen' }))

    expect(screen.getByRole('button', { name: 'Uhr zurücksetzen' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '50 min' })).not.toBeInTheDocument()
  })

  it('Bestätigtes Zurücksetzen ruft resetClock auf und schließt den Dialog', async () => {
    const user = userEvent.setup()
    scoreboardValue = scoreboardFixture({ clock: clockState({ started: true, running: false, elapsedSeconds: 340, limitMinutes: 50 }) })
    renderScoringPage()

    await user.click(await screen.findByRole('button', { name: 'Uhr-Optionen' }))
    await user.click(screen.getByRole('button', { name: 'Uhr zurücksetzen' }))
    expect(screen.getByText(/Score, Innings und At-Bats bleiben unverändert/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Zurücksetzen' }))

    expect(mockResetClock).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Uhr zurücksetzen' })).not.toBeInTheDocument())
  })
})
