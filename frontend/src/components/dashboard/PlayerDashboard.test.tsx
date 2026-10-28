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
import { NOCH_NICHT_FREIGEGEBEN } from '@/utils/aufstellungsLage'

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>

const ICH: Player = { id: 7, name: 'Mia Meier', regular: true, defaultBattingOrder: null }
const ANDERE: Player = { id: 8, name: 'Tom Test', regular: true, defaultBattingOrder: null }
const DRITTER: Player = { id: 9, name: 'Uli Unter', regular: true, defaultBattingOrder: null }

const ME: MeResponse = {
  username: 'mia', role: 'PLAYER', playerId: 7, playerName: 'Mia Meier', mayScore: false, passwordChanged: true,
}

/*
 * Die Lage rechnet das Backend; der Mock spiegelt sie grob, damit die Tests sie nicht je Zeile
 * mitschreiben muessen. Wer eine bestimmte Lage prueft, setzt sie in `extra` ausdruecklich.
 */
function lageFuer(date: string, freigegeben: boolean): GameDayResponse['aufstellungsLage'] {
  if (date < '2026-01-01') return 'OFFEN_VERGANGEN'
  return freigegeben ? 'FREIGEGEBEN' : 'GESPERRT'
}

function gameDay(id: number, date: string, extra: Partial<GameDayResponse> = {}): GameDayResponse {
  const freigegeben = (extra.lineupsReleasedAt === undefined ? 'ja' : extra.lineupsReleasedAt) !== null
  return {
    aufstellungsLage: lageFuer(date, freigegeben),
    id, date, label: 'Spieltag', location: 'Sportplatz Nord', seasonId: 1,
    // Wie im echten Backend: die Saison-Liste liefert die Zusagen leer, nur der Einzelabruf füllt sie.
    availablePlayers: [],
    // Vorgabe: freigegeben — das Bestandsverhalten. Die Tests zur Sperre setzen null.
    lineupsReleasedAt: '2099-01-01T08:00:00', lineupsChangedSinceRelease: false,
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

  describe('vor der Freigabe', () => {
    const NICHT_FREIGEGEBEN = { lineupsReleasedAt: null }

    beforeEach(() => {
      // Wie das Backend es liefert: kein Fehler, nur leere Listen.
      mockApi.getGameDays.mockResolvedValue([gameDay(1, ZUKUNFT, NICHT_FREIGEGEBEN)])
      mockApi.getGameDay.mockImplementation((id: number) =>
        Promise.resolve(gameDay(id, ZUKUNFT, { ...NICHT_FREIGEGEBEN, availablePlayers: [ICH, ANDERE] })))
      mockApi.getLineup.mockResolvedValue([])
    })

    function zweiSpiele(extra: Partial<GameDayResponse>) {
      const gd = gameDay(1, ZUKUNFT, extra)
      gd.games.push({ ...gd.games[0], id: 11, gameNumber: 2 })
      return gd
    }

    it('sagt vor der Freigabe, dass die Aufstellung noch nicht steht', async () => {
      mockApi.getGameDays.mockResolvedValue([zweiSpiele(NICHT_FREIGEGEBEN)])
      rendern()
      const lineup = await screen.findByRole('region', { name: 'Lineup' })
      expect(await within(lineup).findByText(/Die Aufstellung steht noch nicht\. Sobald sie steht, findest du sie hier\./)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Spiel 2' })).not.toBeInTheDocument()
      expect(within(lineup).queryByText(/Für dieses Spiel gibt es noch keine Aufstellung/)).not.toBeInTheDocument()
    })

    it('zeigt die Zusage auch vor der Freigabe', async () => {
      rendern()
      expect(await screen.findByText('Du bist dabei')).toBeInTheDocument()
      const block = screen.getByRole('region', { name: 'Bin ich dabei' })
      expect(within(block).getByText(/Die Aufstellung steht noch nicht/)).toBeInTheDocument()
      expect(within(block).queryByText(/Es gibt noch keine Aufstellung/)).not.toBeInTheDocument()
    })

    it('zeigt vorhandene Einträge auch ohne Freigabe (Scorer), ohne den Satz', async () => {
      mockApi.getLineup.mockResolvedValue([eintrag(ANDERE, 'P', 1), eintrag(ICH, 'SS', 2)])
      mockApi.getGameDays.mockResolvedValue([zweiSpiele(NICHT_FREIGEGEBEN)])
      rendern()
      const lineup = await screen.findByRole('region', { name: 'Lineup' })
      await waitFor(() => expect(within(lineup).getAllByRole('listitem')).toHaveLength(2))
      expect(screen.getByRole('button', { name: 'Spiel 2' })).toBeInTheDocument()
      expect(screen.queryByText(/steht noch nicht/)).not.toBeInTheDocument()
      const block = screen.getByRole('region', { name: 'Bin ich dabei' })
      expect(await within(block).findAllByText(/Schlagplatz 2/)).toHaveLength(2)
    })

    it('sagt den Satz nur einmal in „Bin ich dabei?", auch bei zwei Spielen', async () => {
      mockApi.getGameDays.mockResolvedValue([zweiSpiele(NICHT_FREIGEGEBEN)])
      rendern()
      const block = await screen.findByRole('region', { name: 'Bin ich dabei' })
      expect(await within(block).findAllByText(/Die Aufstellung steht noch nicht/)).toHaveLength(1)
    })

    it('sagt vor 7 Uhr am Spieltag, dass die Aufstellung noch nicht steht', async () => {
      mockApi.getGameDays.mockResolvedValue([gameDay(1, ZUKUNFT, { ...NICHT_FREIGEGEBEN, aufstellungsLage: 'HEUTE_VOR_SIEBEN', istHeute: true })])
      rendern()
      const lineup = await screen.findByRole('region', { name: 'Lineup' })
      expect(await within(lineup).findByText(/Die Aufstellung steht noch nicht/)).toBeInTheDocument()
    })

    it('sagt bei offenem Spieltag und leerem Spiel den anderen Satz', async () => {
      mockApi.getGameDays.mockResolvedValue([gameDay(1, ZUKUNFT, { ...NICHT_FREIGEGEBEN, aufstellungsLage: 'OFFEN_AB_SIEBEN', istHeute: true })])
      rendern()
      const lineup = await screen.findByRole('region', { name: 'Lineup' })
      expect(await within(lineup).findByText(/Für dieses Spiel gibt es noch keine Aufstellung/)).toBeInTheDocument()
      expect(screen.queryByText(/steht noch nicht/)).not.toBeInTheDocument()
    })

    it('sagt bei gesperrtem Spieltag nicht „steht noch nicht", wenn ein Spiel Einträge hat (Admin, Spiel 2 leer)', async () => {
      mockApi.getLineup.mockImplementation((id: number) =>
        Promise.resolve(id === 10 ? [eintrag(ANDERE, 'P', 1)] : []))
      mockApi.getGameDays.mockResolvedValue([zweiSpiele(NICHT_FREIGEGEBEN)])
      rendern()
      const lineup = await screen.findByRole('region', { name: 'Lineup' })
      await waitFor(() => expect(within(lineup).getAllByRole('listitem')).toHaveLength(1))
      fireEvent.click(screen.getByRole('button', { name: 'Spiel 2' }))
      expect(await within(lineup).findByText(/Für dieses Spiel gibt es noch keine Aufstellung/)).toBeInTheDocument()
      expect(screen.queryByText(/steht noch nicht/)).not.toBeInTheDocument()
    })

    it('sagt bei Netzfehler weder das eine noch das andere', async () => {
      mockApi.getLineup.mockRejectedValue(new Error('500'))
      rendern()
      expect(await screen.findAllByText(/nicht erreichbar/)).not.toHaveLength(0)
      expect(screen.queryByText(/steht noch nicht/)).not.toBeInTheDocument()
      expect(screen.queryByText(/noch keine Aufstellung/)).not.toBeInTheDocument()
    })

    it('„Bin ich dabei?" und die Lineup-Karte sagen denselben Satz', async () => {
      rendern()
      const block = await screen.findByRole('region', { name: 'Bin ich dabei' })
      const lineup = screen.getByRole('region', { name: 'Lineup' })
      expect(await within(block).findByText(NOCH_NICHT_FREIGEGEBEN)).toBeInTheDocument()
      expect(await within(lineup).findByText(NOCH_NICHT_FREIGEGEBEN)).toBeInTheDocument()
    })

    it('zeigt einen vergangenen Spieltag nicht als kommenden', async () => {
      mockApi.getGameDays.mockResolvedValue([gameDay(1, VERGANGEN, NICHT_FREIGEGEBEN)])
      rendern()
      expect(await screen.findByText(/Kein Spiel angesetzt/)).toBeInTheDocument()
    })

    it('unterscheidet freigegeben-aber-leer von nicht-freigegeben', async () => {
      mockApi.getGameDays.mockResolvedValue([gameDay(1, ZUKUNFT)])
      rendern()
      const lineup = await screen.findByRole('region', { name: 'Lineup' })
      expect(await within(lineup).findByText('Für dieses Spiel gibt es noch keine Aufstellung. Sobald der Trainer sie macht, steht sie hier.')).toBeInTheDocument()
      expect(screen.queryByText(/steht noch nicht/)).not.toBeInTheDocument()
    })

    it('zeigt nach der Freigabe die volle Liste wie bisher', async () => {
      mockApi.getGameDays.mockResolvedValue([gameDay(1, ZUKUNFT)])
      mockApi.getLineup.mockResolvedValue([eintrag(ANDERE, 'P', 1), eintrag(ICH, 'SS', 2)])
      rendern()
      const lineup = await screen.findByRole('region', { name: 'Lineup' })
      await waitFor(() => expect(within(lineup).getAllByRole('listitem')).toHaveLength(2))
      expect(screen.queryByText(/steht noch nicht/)).not.toBeInTheDocument()
    })
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
  /*
   * Der Spielbetrieb ist seit dem 27.10.2026 wieder nur Spielbetrieb: Zahlen, Termine
   * und Zaehler stehen auf der Startseite. Hier darf gar nichts mehr verlinkt sein —
   * die Liste ist leer, und das ist die schaerfste Fassung, die es je hatte.
   */
  const ERLAUBTE_LINKS: RegExp[] = []

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

  

  
  
  it('sagt „Heute" nach istHeute, auch wenn die Lage FREIGEGEBEN trägt (vor 7 Uhr)', async () => {
    mockApi.getGameDays.mockResolvedValue([gameDay(1, ZUKUNFT, { aufstellungsLage: 'FREIGEGEBEN', istHeute: true })])
    rendern()
    expect(await screen.findByText(/Heute · Nächster Spieltag/)).toBeInTheDocument()
  })

  it('sagt nicht „Heute", wenn istHeute fehlt', async () => {
    rendern()
    expect(await screen.findByText('Nächster Spieltag')).toBeInTheDocument()
    expect(screen.queryByText(/Heute · /)).not.toBeInTheDocument()
  })

  it('kommt ohne nächstes Spiel zurecht (Saisonende)', async () => {
    mockApi.getGameDays.mockResolvedValue([gameDay(3, VERGANGEN)])
    rendern()
    expect(await screen.findByText(/Kein Spiel angesetzt/)).toBeInTheDocument()
    expect(screen.getByText(/WhatsApp/)).toBeInTheDocument()
    expect(mockApi.getLineup).not.toHaveBeenCalled()
  })

  it('kommt ganz ohne Saison zurecht', async () => {
    mockApi.getSeasons.mockResolvedValue([])
    rendern()
    expect(await screen.findByText(/Kein Spiel angesetzt/)).toBeInTheDocument()
  })

  
  it('sagt „nicht erreichbar" statt „Saison durch", wenn die Spieltage nicht laden', async () => {
    mockApi.getGameDays.mockRejectedValue(new Error('500'))
    rendern()
    expect(await screen.findByText(/Spiele gerade nicht erreichbar/)).toBeInTheDocument()
    expect(screen.queryByText(/Saison durch/)).not.toBeInTheDocument()
  })

  it('nimmt die Saison mit dem höchsten Jahr, nicht die letzte der Liste', async () => {
    mockApi.getSeasons.mockResolvedValue([
      { id: 9, name: 'Saison 2099', year: 2099 },
      { id: 2, name: 'Saison 2025', year: 2025 },
    ])
    rendern()
    await screen.findByText('Berlin Bears')
    expect(mockApi.getGameDays).toHaveBeenCalledWith(9)
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


  })
