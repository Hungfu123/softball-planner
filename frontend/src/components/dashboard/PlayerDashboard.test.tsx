import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type {
  GameDayResponse, LineupEntryResponse, MeResponse, Player,
  PlayerBattingStatsResponse, SeasonPlayerStats, TrainingResponse,
} from '@/types'

const auth = vi.hoisted(() => ({ me: null as MeResponse | null }))
vi.mock('@/hooks/useRolle', () => ({
  useRolle: () => ({
    me: auth.me,
    istAdmin: auth.me === null,
    istSuperadmin: auth.me === null,
    darfScoren: auth.me === null,
  }),
}))

vi.mock('@/api/client', () => ({
  getSeasons: vi.fn(),
  getGameDays: vi.fn(),
  getGameDay: vi.fn(),
  getLineup: vi.fn(),
  getSeasonBattingStats: vi.fn(),
  getSeasonStats: vi.fn(),
  getPlayerUsage: vi.fn(),
  getAllGameDays: vi.fn(),
  getTrainings: vi.fn(),
  getPlayerBattingTimeline: vi.fn(),
  getPlayer: vi.fn(),
}))

import * as api from '@/api/client'
import { PlayerDashboard } from './PlayerDashboard'

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>

const ICH: Player = { id: 7, name: 'Mia Meier', regular: true, defaultBattingOrder: null }
const ANDERE: Player = { id: 8, name: 'Tom Test', regular: true, defaultBattingOrder: null }
const DRITTER: Player = { id: 9, name: 'Uli Unter', regular: true, defaultBattingOrder: null }

const ME: MeResponse = {
  username: 'mia', role: 'PLAYER', playerId: 7, playerName: 'Mia Meier', mayScore: false, passwordChanged: true,
}

function gameDay(id: number, date: string, extra: Partial<GameDayResponse> = {}): GameDayResponse {
  return {
    id, date, label: 'Spieltag', location: 'Sportplatz Nord', seasonId: 1,
    // Wie im echten Backend: die Saison-Liste liefert die Zusagen leer, nur der Einzelabruf füllt sie.
    availablePlayers: [],
    games: [{
      id: id * 10, gameNumber: 1, opponentTeam: { id: 1, name: 'Berlin Bears', ownTeam: false },
      scoreUs: null, scoreThem: null, gameDayId: id, lineupEntryCount: 2,
    }],
    ...extra,
  }
}

function eintrag(player: Player, position: string | null, battingOrder: number, dh: Player | null = null): LineupEntryResponse {
  return { id: battingOrder, player, position, battingOrder, dhBatterPlayer: dh }
}

const ZAHLEN: PlayerBattingStatsResponse = {
  playerId: 7, playerName: 'Mia Meier', plateAppearances: 20, atBats: 18, hits: 9,
  singles: 6, doubles: 2, triples: 1, homeRuns: 0, runs: 4, walks: 2, hitByPitch: 0,
  strikeouts: 3, outs: 9, reachedOnError: 0, stolenBases: 0, caughtStealing: 0, pickoffs: 0,
  runsBattedIn: 5, totalBases: 13, battingAverage: 0.5, onBasePct: 0.55, sluggingPct: 0.72,
  ops: 1.27, qualified: true,
}

/*
 * Wie das Backend es Spielern liefert: `attendeeCount` ist null, bevor die Antwort das
 * Haus verlaesst (TrainingController). Die Vorgabe traegt die Null bewusst mit, damit
 * ein Rueckbau im Backend hier und nicht erst in der App auffiele.
 */
const TRAINING: TrainingResponse = {
  id: 1, date: '2099-06-18', time: '19:00', location: 'Halle Nord', cancelled: false,
  attendeeCount: null, periodId: null, type: 'REGULAR', openToAll: true,
}

const ZUKUNFT = '2099-06-20'
const ZUKUNFT_2 = '2099-07-04'
const VERGANGEN = '2000-06-20'

function rendern() {
  return render(<MemoryRouter><PlayerDashboard /></MemoryRouter>)
}

describe('PlayerDashboard', () => {
  beforeEach(() => {
    auth.me = ME
    vi.clearAllMocks()
    mockApi.getSeasons.mockResolvedValue([{ id: 1, name: 'Saison 2099', year: 2099 }])
    mockApi.getGameDays.mockResolvedValue([gameDay(1, ZUKUNFT), gameDay(2, ZUKUNFT_2)])
    mockApi.getGameDay.mockImplementation((id: number) =>
      Promise.resolve(gameDay(id, ZUKUNFT, { availablePlayers: [ICH, ANDERE] })))
    mockApi.getLineup.mockResolvedValue([eintrag(ICH, 'SS', 3), eintrag(ANDERE, 'P', 1)])
    mockApi.getSeasonBattingStats.mockResolvedValue([ZAHLEN])
    mockApi.getSeasonStats.mockResolvedValue([
      { playerId: 7, playerName: 'Mia Meier', totalGames: 12, positionCounts: {} } as SeasonPlayerStats,
    ])
    mockApi.getAllGameDays.mockResolvedValue([gameDay(1, ZUKUNFT), gameDay(2, ZUKUNFT_2)])
    mockApi.getTrainings.mockResolvedValue([TRAINING])
    mockApi.getPlayerBattingTimeline.mockResolvedValue([])
    mockApi.getPlayer.mockResolvedValue(ICH)
  })

  it('zeigt das nächste Spiel', async () => {
    rendern()
    expect(await screen.findByText('Berlin Bears')).toBeInTheDocument()
    expect(screen.getByText(/Sportplatz Nord/)).toBeInTheDocument()
    expect(screen.getByText(/Nächster Spieltag/)).toBeInTheDocument()
  })

  it('sagt ob der Spieler aufgestellt ist, mit Position und Schlagplatz', async () => {
    rendern()
    const block = await screen.findByRole('region', { name: 'Bin ich dabei' })
    await waitFor(() => expect(within(block).getByText(/Du bist dabei/)).toBeInTheDocument())
    expect(within(block).getByText(/Shortstop|SS/)).toBeInTheDocument()
    expect(within(block).getByText(/Schlagplatz 3/)).toBeInTheDocument()
  })

  it('sagt dass er nicht aufgestellt ist, wenn er fehlt', async () => {
    mockApi.getLineup.mockResolvedValue([eintrag(ANDERE, 'P', 1), eintrag(DRITTER, 'C', 2)])
    rendern()
    const block = await screen.findByRole('region', { name: 'Bin ich dabei' })
    await waitFor(() => expect(within(block).getByText(/Nicht aufgestellt/)).toBeInTheDocument())
  })

  it('sagt dass er nicht auf der Zusageliste steht und wie er dahin kommt', async () => {
    mockApi.getGameDay.mockResolvedValue(gameDay(1, ZUKUNFT, { availablePlayers: [ANDERE] }))
    rendern()
    const block = await screen.findByRole('region', { name: 'Bin ich dabei' })
    expect(await within(block).findByText(/nicht auf der Zusageliste/)).toBeInTheDocument()
    expect(within(block).getByText(/WhatsApp-Umfrage/)).toBeInTheDocument()
    // angezeigt, nicht gesetzt
    expect(within(block).queryByRole('button')).not.toBeInTheDocument()
  })

  it('liest die Zusagen aus dem Einzelabruf, nicht aus der Saison-Liste (die ist dort leer)', async () => {
    rendern()
    const block = await screen.findByRole('region', { name: 'Bin ich dabei' })
    expect(await within(block).findByText(/Du bist dabei/)).toBeInTheDocument()
    expect(mockApi.getGameDay).toHaveBeenCalledWith(1)
  })

  it('sagt „nicht erreichbar" statt „nicht auf der Zusageliste", wenn der Einzelabruf scheitert', async () => {
    mockApi.getGameDay.mockRejectedValue(new Error('500'))
    rendern()
    const block = await screen.findByRole('region', { name: 'Bin ich dabei' })
    expect(await within(block).findByText(/Zusageliste ist gerade nicht erreichbar/)).toBeInTheDocument()
    expect(within(block).queryByText(/nicht auf der Zusageliste/)).not.toBeInTheDocument()
  })

  it('sagt dass das Lineup noch fehlt und was dann passiert', async () => {
    mockApi.getLineup.mockResolvedValue([])
    rendern()
    const block = await screen.findByRole('region', { name: 'Bin ich dabei' })
    expect(await within(block).findByText(/noch keine Aufstellung/)).toBeInTheDocument()
    const lineup = screen.getByRole('region', { name: 'Lineup' })
    expect(within(lineup).getByText(/noch keine Aufstellung/)).toBeInTheDocument()
  })

  it('erkennt den Spieler als DH-Schlagmann', async () => {
    mockApi.getLineup.mockResolvedValue([eintrag(ANDERE, 'P', 1, ICH)])
    rendern()
    const block = await screen.findByRole('region', { name: 'Bin ich dabei' })
    expect(await within(block).findByText(/als DH/)).toBeInTheDocument()
  })

  it('zeigt das Lineup vollständig', async () => {
    mockApi.getLineup.mockResolvedValue([
      eintrag(ANDERE, 'P', 1), eintrag(ICH, 'SS', 2), eintrag(DRITTER, 'C', 3),
    ])
    rendern()
    const lineup = await screen.findByRole('region', { name: 'Lineup' })
    await waitFor(() => expect(within(lineup).getAllByRole('listitem')).toHaveLength(3))
    expect(within(lineup).getByText('Tom Test')).toBeInTheDocument()
    expect(within(lineup).getByText('Uli Unter')).toBeInTheDocument()
  })

  /*
   * Der Wächter für „Spieler: Lineups nur lesen". Kein Suchen nach verbotenen Wörtern,
   * sondern eine Erlaubnisliste über die GANZE Seite: jedes bedienbare Element, das nicht
   * ausdrücklich zugelassen ist, macht den Test rot — egal wie es heißt oder ob es ein Label hat.
   */
  const ERLAUBTE_KNOEPFE = [/^Spiel \d+$/, /^\+ \d+ weitere/, /^Weniger anzeigen$/]
  // `/kalender` ist fuer Spieler ein eigener Reiter (PLAYER_TABS) — die Termin-Karten
  // verlinken dorthin, nicht in eine Werkbank.
  const ERLAUBTE_LINKS = [/^\/players\/7$/, /^\/counter$/, /^\/kalender$/]

  async function bedienbar() {
    await screen.findByRole('region', { name: 'Lineup' })
    await waitFor(() => expect(mockApi.getLineup).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByRole('region', { name: 'Lineup' }).querySelectorAll('li').length).toBeGreaterThan(0))
    const sel = 'button, a, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="tab"], [draggable="true"], [tabindex]:not([tabindex="-1"]), [contenteditable]'
    return Array.from(document.body.querySelectorAll<HTMLElement>(sel))
  }

  function unerlaubt(elemente: HTMLElement[]): string[] {
    return elemente.flatMap(el => {
      const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim()
      if (el.tagName === 'A') {
        return ERLAUBTE_LINKS.some(r => r.test(el.getAttribute('href') ?? '')) ? [] : [`Link ${el.getAttribute('href')}`]
      }
      if (el.tagName === 'BUTTON') {
        return ERLAUBTE_KNOEPFE.some(r => r.test(name)) ? [] : [`Knopf "${name}"`]
      }
      return [`${el.tagName.toLowerCase()} "${name}"`]
    })
  }

  const ROLLEN: [string, MeResponse][] = [
    ['Spieler', ME],
    ['Spieler mit Scorer-Recht', { ...ME, mayScore: true }],
  ]

  it.each(ROLLEN)('hat für %s nichts Bedienbares außer der Erlaubnisliste (ein Spiel)', async (_n, me) => {
    auth.me = me
    rendern()
    expect(unerlaubt(await bedienbar())).toEqual([])
  })

  it.each(ROLLEN)('hat für %s mit zwei Spielen und Reitern nichts Bedienbares außer der Erlaubnisliste', async (_n, me) => {
    auth.me = me
    const zwei = gameDay(1, ZUKUNFT)
    zwei.games.push({ ...zwei.games[0], id: 11, gameNumber: 2, opponentTeam: { id: 2, name: 'Köln Kings', ownTeam: false } })
    mockApi.getGameDays.mockResolvedValue([zwei, gameDay(2, ZUKUNFT_2), gameDay(3, '2099-07-11'), gameDay(4, '2099-07-18'), gameDay(5, '2099-07-25')])
    rendern()
    const el = await bedienbar()
    expect(el.filter(e => /^Spiel \d$/.test(e.textContent ?? ''))).toHaveLength(2)
    expect(unerlaubt(el)).toEqual([])
  })

  it('der Wächter schlägt an: ein Ändern-Knopf, ein Link in den Planer und ein Drag-Handle fallen durch', () => {
    const b = document.createElement('button'); b.textContent = 'Ändern'
    const a = document.createElement('a'); a.setAttribute('href', '/gameday/1')
    const d = document.createElement('div'); d.setAttribute('draggable', 'true')
    expect(unerlaubt([b, a, d])).toHaveLength(3)
  })

  it('wechselt zwischen den Spielen eines Spieltags', async () => {
    const zwei = gameDay(1, ZUKUNFT)
    zwei.games.push({ ...zwei.games[0], id: 11, gameNumber: 2, opponentTeam: { id: 2, name: 'Köln Kings', ownTeam: false } })
    mockApi.getGameDays.mockResolvedValue([zwei])
    mockApi.getLineup.mockImplementation((id: number) =>
      Promise.resolve(id === 11 ? [eintrag(DRITTER, 'C', 1)] : [eintrag(ANDERE, 'P', 1)]))
    rendern()
    const lineup = await screen.findByRole('region', { name: 'Lineup' })
    await waitFor(() => expect(within(lineup).getByText('Tom Test')).toBeInTheDocument())
    fireEvent.click(within(lineup).getByRole('button', { name: /Spiel 2/ }))
    expect(within(lineup).getByText('Uli Unter')).toBeInTheDocument()
    expect(within(lineup).queryByText('Tom Test')).not.toBeInTheDocument()
  })

  it('zeigt vier Kennzahlen: AVG, OBP, Spiele, Hits', async () => {
    rendern()
    const zahlen = await screen.findByRole('region', { name: 'Meine Zahlen' })
    await waitFor(() => expect(within(zahlen).getByText('.500')).toBeInTheDocument())
    expect(within(zahlen).getByText('AVG')).toBeInTheDocument()
    expect(within(zahlen).getByText('.550')).toBeInTheDocument()
    expect(within(zahlen).getByText('OBP')).toBeInTheDocument()
    expect(within(zahlen).getByText('12')).toBeInTheDocument()
    expect(within(zahlen).getByText('Spiele')).toBeInTheDocument()
    expect(within(zahlen).getByText('9')).toBeInTheDocument()
    expect(within(zahlen).getByText('Hits')).toBeInTheDocument()
  })

  /*
   * Hier stand frueher: das Wort "Training" darf auf der Seite nicht vorkommen. Das war
   * eine Abkuerzung, kein Kriterium — geheim ist die BETEILIGUNG (sie fliesst in die
   * Auto-Aufstellung ein und bleibt auch vor der eigenen Person verborgen), nicht der
   * Termin. Seit die Startseite sagt, wann trainiert wird, kommt das Wort vor und muss
   * es auch. Geprueft wird deshalb, was tatsaechlich nicht herausdarf.
   */
  it('sagt wann trainiert wird, aber nichts über die Beteiligung', async () => {
    rendern()
    const karte = await screen.findByRole('region', { name: 'Nächstes Training' })
    await waitFor(() => expect(within(karte).getByText(/19:00/)).toBeInTheDocument())
    expect(within(karte).getByText(/Halle Nord/)).toBeInTheDocument()

    expect(screen.queryByText(/Beteiligung|Anwesend|Teilnehmer|Quote|dabei gewesen/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\d+\s*%/)).not.toBeInTheDocument()
    expect(mockApi.getPlayerUsage).not.toHaveBeenCalled()
    // Die Vorgabe traegt `attendeeCount: null` wie das Backend. Stuende dort eine Zahl,
    // duerfte sie trotzdem nirgends auftauchen — deshalb auch die Suche nach blossen
    // Ziffern in der Karte selbst, abseits von Datum und Uhrzeit.
    expect(within(karte).queryByText(/^\d+$/)).not.toBeInTheDocument()
  })

  it('verlinkt ins volle Profil', async () => {
    rendern()
    const link = await screen.findByRole('link', { name: /Ganzes Profil/ })
    expect(link).toHaveAttribute('href', '/players/7')
  })

  it('erklärt leere Zahlen: noch nicht geschlagen und wann sie kommen', async () => {
    mockApi.getSeasonBattingStats.mockResolvedValue([])
    mockApi.getSeasonStats.mockResolvedValue([])
    rendern()
    const zahlen = await screen.findByRole('region', { name: 'Meine Zahlen' })
    expect(await within(zahlen).findByText(/noch nicht geschlagen/)).toBeInTheDocument()
    expect(within(zahlen).getByRole('link', { name: /Ganzes Profil/ })).toBeInTheDocument()
  })

  it('kommt ohne nächstes Spiel zurecht (Saisonende)', async () => {
    mockApi.getGameDays.mockResolvedValue([gameDay(3, VERGANGEN)])
    rendern()
    expect(await screen.findByText(/Kein Spiel angesetzt/)).toBeInTheDocument()
    expect(screen.getByText(/WhatsApp/)).toBeInTheDocument()
    expect(mockApi.getLineup).not.toHaveBeenCalled()
    // Zahlen bleiben trotzdem da
    const zahlen = screen.getByRole('region', { name: 'Meine Zahlen' })
    await waitFor(() => expect(within(zahlen).getByText('.500')).toBeInTheDocument())
  })

  it('kommt ganz ohne Saison zurecht', async () => {
    mockApi.getSeasons.mockResolvedValue([])
    rendern()
    expect(await screen.findByText(/Kein Spiel angesetzt/)).toBeInTheDocument()
    const zahlen = screen.getByRole('region', { name: 'Meine Zahlen' })
    expect(within(zahlen).getByText(/noch keine Saison angelegt/)).toBeInTheDocument()
    expect(within(zahlen).queryByText(/noch nicht geschlagen/)).not.toBeInTheDocument()
  })

  it('sagt „gerade nicht erreichbar" statt „nicht geschlagen", wenn der Abruf der Zahlen scheitert', async () => {
    mockApi.getSeasonBattingStats.mockRejectedValue(new Error('500'))
    rendern()
    const zahlen = await screen.findByRole('region', { name: 'Meine Zahlen' })
    expect(await within(zahlen).findByText(/gerade nicht erreichbar/)).toBeInTheDocument()
    expect(within(zahlen).queryByText(/noch nicht geschlagen/)).not.toBeInTheDocument()
    expect(within(zahlen).queryByText('AVG')).not.toBeInTheDocument()
  })

  it('sagt „nicht erreichbar" statt „Saison durch", wenn die Spieltage nicht laden', async () => {
    mockApi.getGameDays.mockRejectedValue(new Error('500'))
    rendern()
    expect(await screen.findByText(/Spiele gerade nicht erreichbar/)).toBeInTheDocument()
    expect(screen.queryByText(/Saison durch/)).not.toBeInTheDocument()
    const zahlen = screen.getByRole('region', { name: 'Meine Zahlen' })
    expect(within(zahlen).getByText(/gerade nicht erreichbar/)).toBeInTheDocument()
  })

  it('nimmt die Saison mit dem höchsten Jahr, nicht die letzte der Liste', async () => {
    mockApi.getSeasons.mockResolvedValue([
      { id: 9, name: 'Saison 2099', year: 2099 },
      { id: 2, name: 'Saison 2025', year: 2025 },
    ])
    rendern()
    await screen.findByText('Berlin Bears')
    expect(mockApi.getGameDays).toHaveBeenCalledWith(9)
    await waitFor(() => expect(mockApi.getSeasonBattingStats).toHaveBeenCalledWith(9))
  })

  it('stürzt nicht, wenn me noch null ist, und sagt warum Persönliches fehlt', async () => {
    auth.me = null
    rendern()
    expect(await screen.findByText(/Dein Konto wird noch geladen/)).toBeInTheDocument()
    expect(await screen.findByText('Berlin Bears')).toBeInTheDocument()
  })

  it('sagt einem Konto ohne Spieler, was zu tun ist', async () => {
    auth.me = { ...ME, playerId: null, playerName: null }
    rendern()
    expect(await screen.findByText(/noch keinem Spieler zugeordnet/)).toBeInTheDocument()
    expect(mockApi.getSeasonBattingStats).not.toHaveBeenCalled()
  })

  it('listet die weiteren Spieltage unter „Was kommt"', async () => {
    rendern()
    const kommt = await screen.findByRole('region', { name: 'Was kommt' })
    expect(within(kommt).getByText(/04\.07\./)).toBeInTheDocument()
  })

  /*
   * Der Playmaker stand hier mit und ist raus: ein Taktikbrett sucht niemand am Spieltag
   * auf der Startseite. Der Zaehler bleibt — aber nur mit dem Satz, der sagt, wofuer man
   * ihn braucht. "Counter" allein ist ein Knopf, den niemand drueckt.
   */
  it('erklärt den Zähler, statt ihn nur zu verlinken — und bleibt 44 px hoch', async () => {
    rendern()
    const karte = await screen.findByRole('region', { name: 'Zähler' })
    expect(within(karte).getByText(/umpirest/)).toBeInTheDocument()
    expect(within(karte).getByText(/ohne Netz/)).toBeInTheDocument()
    const link = within(karte).getByRole('link', { name: /Zähler öffnen/ })
    expect(link).toHaveAttribute('href', '/counter')
    expect(link.className).toMatch(/min-h-11/)
  })

  it('verlinkt den Playmaker nicht mehr von der Startseite', async () => {
    rendern()
    await screen.findByRole('region', { name: 'Zähler' })
    expect(screen.queryByRole('link', { name: /Playmaker/ })).not.toBeInTheDocument()
  })
})
