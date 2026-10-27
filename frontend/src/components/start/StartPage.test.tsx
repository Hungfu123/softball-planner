import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { GameDayResponse, MeResponse, Player, PlayerBattingStatsResponse, SeasonPlayerStats, TrainingResponse } from '@/types'

/*
 * Die Startseite haengt an HEUTE: "naechstes Training", "noch offen", "Heute/Morgen".
 * Ohne feste Uhr waere jeder dieser Tests in ein paar Monaten etwas anderes.
 */
const HEUTE = new Date('2026-06-15T10:00:00')

const auth = vi.hoisted(() => ({ me: null as MeResponse | null }))
vi.mock('@/hooks/useRolle', () => ({
  useRolle: () => ({ me: auth.me, istAdmin: false, istSuperadmin: false, darfScoren: false }),
}))

vi.mock('@/api/client', () => ({
  getSeasons: vi.fn(),
  getAllGameDays: vi.fn(),
  getTrainings: vi.fn(),
  getSeasonBattingStats: vi.fn(),
  getSeasonStats: vi.fn(),
  getPlayerBattingTimeline: vi.fn(),
  getPlayer: vi.fn(),
  getPlayerUsage: vi.fn(),
}))

vi.mock('@/api/plays', () => ({ getPlayCategories: vi.fn() }))

import * as api from '@/api/client'
import * as plays from '@/api/plays'
import { StartPage } from './StartPage'
import { COUNTER_STORAGE_KEY } from '@/hooks/useCounter'

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>
const mockPlays = plays as unknown as Record<string, ReturnType<typeof vi.fn>>

const ICH: Player = { id: 7, name: 'Mia Meier', regular: true, defaultBattingOrder: null }
const ME: MeResponse = {
  username: 'mia', role: 'PLAYER', playerId: 7, playerName: 'Mia Meier', mayScore: false, passwordChanged: true,
}

const ZAHLEN: PlayerBattingStatsResponse = {
  playerId: 7, playerName: 'Mia Meier', plateAppearances: 20, atBats: 18, hits: 9,
  singles: 6, doubles: 2, triples: 1, homeRuns: 0, runs: 4, walks: 2, hitByPitch: 0,
  strikeouts: 3, outs: 9, reachedOnError: 0, stolenBases: 0, caughtStealing: 0, pickoffs: 0,
  runsBattedIn: 5, totalBases: 13, battingAverage: 0.5, onBasePct: 0.55, sluggingPct: 0.72,
  ops: 1.27, qualified: true,
}

function spieltag(id: number, date: string): GameDayResponse {
  return {
    id, date, label: 'Spieltag', location: 'Bottrop', seasonId: 1, availablePlayers: [],
    games: [{
      id: id * 10, gameNumber: 1, opponentTeam: { id: 1, name: 'Berlin Bears', ownTeam: false },
      scoreUs: null, scoreThem: null, gameDayId: id, lineupEntryCount: 0,
    }],
  }
}

/*
 * Wie das Backend es Spielern liefert: `attendeeCount` ist null, bevor die Antwort das Haus
 * verlaesst (TrainingController). Die Vorgabe traegt die Null bewusst mit, damit ein Rueckbau
 * im Backend hier und nicht erst in der App auffiele.
 */
function training(id: number, date: string, extra: Partial<TrainingResponse> = {}): TrainingResponse {
  return {
    id, date, time: '19:00', location: 'Halle Nord', cancelled: false,
    attendeeCount: null, periodId: null, type: 'REGULAR', openToAll: true, ...extra,
  }
}

function rendern() {
  return render(<MemoryRouter><StartPage /></MemoryRouter>)
}

/** Eine Bento-Kachel ueber ihr aria-label. */
async function kachel(name: string): Promise<HTMLElement> {
  return screen.findByLabelText(name)
}

describe('Startseite', () => {
  beforeEach(() => {
    // Nur das Datum einfrieren. Mit allen Zeitgebern stuende auch setTimeout still, und
    // findBy*/waitFor warten dann auf eine Uhr, die niemand weiterdreht — zehn Tests liefen
    // in den 5-Sekunden-Abbruch, ohne dass an der Seite etwas falsch war.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(HEUTE)
    // Der Counter liegt im localStorage und ueberlebt sonst in den naechsten Test.
    localStorage.clear()
    auth.me = ME
    vi.clearAllMocks()
    mockApi.getSeasons.mockResolvedValue([{ id: 1, name: 'Saison 2026', year: 2026 }])
    mockApi.getAllGameDays.mockResolvedValue([spieltag(1, '2026-07-04'), spieltag(2, '2026-03-01')])
    mockApi.getTrainings.mockResolvedValue([
      training(1, '2026-06-18'), training(2, '2026-06-20'), training(3, '2026-01-10'),
    ])
    mockApi.getSeasonBattingStats.mockResolvedValue([ZAHLEN])
    mockApi.getSeasonStats.mockResolvedValue([
      { playerId: 7, playerName: 'Mia Meier', totalGames: 12, positionCounts: {} } as SeasonPlayerStats,
    ])
    mockApi.getPlayerBattingTimeline.mockResolvedValue([])
    mockApi.getPlayer.mockResolvedValue(ICH)
    mockPlays.getPlayCategories.mockResolvedValue([
      { id: 1, name: 'Cut-off & Relay', sortOrder: 1 },
      { id: 2, name: 'Bunt-Defense', sortOrder: 2 },
    ])
  })
  afterEach(() => { vi.useRealTimers() })

  it('begrüßt mit Namen und zeigt vier Kennzahlen', async () => {
    rendern()
    expect(await screen.findByRole('heading', { name: /Hallo Mia Meier/ })).toBeInTheDocument()
    const kopf = screen.getByRole('region', { name: 'Meine Zahlen' })
    await waitFor(() => expect(within(kopf).getByText('.500')).toBeInTheDocument())
    for (const label of ['AVG', 'OBP', 'OPS', 'Spiele']) {
      expect(within(kopf).getByText(label)).toBeInTheDocument()
    }
    // Hits ist eine Zaehlung, keine Guete — die steht im Profil, nicht auf der Startseite.
    expect(within(kopf).queryByText('Hits')).not.toBeInTheDocument()
    // OPS geht regelmaessig ueber 1; die Vorzahl muss stehen bleiben (ZAHLEN.ops = 1.27).
    expect(within(kopf).getByText('1.270')).toBeInTheDocument()
  })

  /*
   * Die Abkuerzungen sind Fachsprache, und ein gutes Drittel des Kaders liest sie zum
   * ersten Mal. Ein Tipp auf die Zahl legt die Kurve darunter um UND schreibt hin, was
   * sie bedeutet — die Erklaerung steht dort, wo man gerade hinsieht, nicht in einem
   * Glossar zwei Seiten weiter.
   */
  it('erklärt die Zahl, auf die man tippt, und legt die Kurve um', async () => {
    rendern()
    const kopf = await screen.findByRole('region', { name: 'Meine Zahlen' })
    await waitFor(() => expect(within(kopf).getByText('.500')).toBeInTheDocument())

    const avg = within(kopf).getByRole('button', { name: /^AVG/ })
    expect(avg).toHaveAttribute('aria-pressed', 'true')
    expect(within(kopf).getByText(/Treffer ÷ Versuche/)).toBeInTheDocument()

    fireEvent.click(within(kopf).getByRole('button', { name: /^OPS/ }))
    expect(within(kopf).getByRole('button', { name: /^OPS/ })).toHaveAttribute('aria-pressed', 'true')
    expect(avg).toHaveAttribute('aria-pressed', 'false')
    expect(within(kopf).getByText(/Auf-Base-Quote plus Schlagkraft/)).toBeInTheDocument()
    expect(within(kopf).queryByText(/Treffer ÷ Versuche/)).not.toBeInTheDocument()
  })

  /* "Spiele" ist keine Quote — dahinter steckt keine Kurve, also auch kein Schalter. */
  it('macht aus „Spiele" keinen Schalter', async () => {
    rendern()
    const kopf = await screen.findByRole('region', { name: 'Meine Zahlen' })
    await waitFor(() => expect(within(kopf).getByText('.500')).toBeInTheDocument())
    expect(within(kopf).queryByRole('button', { name: /^Spiele/ })).not.toBeInTheDocument()
    expect(within(kopf).getByRole('link', { name: /Ganzes Profil/ })).toHaveAttribute('href', '/players/7')
  })

  /*
   * Der Kern der Seite: zugeklappt steht die ANTWORT schon da. Wer das Datum des naechsten
   * Trainings wissen will, soll nicht erst tippen muessen — Aufklappen ist fuer Leute, die
   * es genauer wissen wollen, nicht die Bedingung dafuer, ueberhaupt etwas zu erfahren.
   */
  /*
   * Der Kern der Seite: jede Kachel traegt ihre Antwort im Klartext. Niemand muss tippen,
   * um zu erfahren, wann das naechste Spiel ist — vier gleiche Klappzeilen waren vorher
   * genau das, und sahen obendrein monoton aus.
   */
  it('beantwortet die drei Fragen ohne einen einzigen Klick', async () => {
    rendern()
    const spieltag = await kachel('Nächster Spieltag')
    expect(spieltag.textContent).toMatch(/Sa · 04\. Juli/)
    expect(spieltag.textContent).toMatch(/In 3 Wochen/)
    expect(spieltag.textContent).toMatch(/Berlin Bears/)

    const training = await kachel('Nächstes Training')
    expect(training.textContent).toMatch(/Do · 18\. Juni/)
    expect(training.textContent).toMatch(/19:00/)
    expect(training.textContent).toMatch(/Halle Nord/)

    const jahr = await kachel('Dein Jahr 2026')
    expect(jahr.textContent).toMatch(/Noch offen:/)
    expect(jahr.textContent).toMatch(/1\s*Spieltag/)
    expect(jahr.textContent).toMatch(/2\s*Trainings/)
  })

  /* Am Handy ist eine ganze Kachel das bessere Ziel als ein Wort darunter. */
  it('macht die beiden Termin-Kacheln selbst zum Weg dorthin', async () => {
    rendern()
    expect(await kachel('Nächster Spieltag')).toHaveAttribute('href', '/spielbetrieb')
    expect(await kachel('Nächstes Training')).toHaveAttribute('href', '/kalender')
  })

  it('nimmt das nächste Training ab heute, nicht das erste der Liste', async () => {
    mockApi.getTrainings.mockResolvedValue([training(1, '2026-09-01'), training(2, '2026-06-18')])
    rendern()
    const k = await kachel('Nächstes Training')
    expect(k.textContent).toMatch(/Do · 18\. Juni/)
  })

  /*
   * Ein verirrter Termin (im Datenbestand lag einer im Jahr 2090) erzeugte "In 3307 Wochen".
   * Jenseits von etwa zwei Monaten traegt das Datum allein — dann aber mit Jahr.
   */
  it('sagt bei weit entfernten Terminen das Jahr statt einer Wochenzahl', async () => {
    mockApi.getTrainings.mockResolvedValue([training(1, '2090-03-15')])
    rendern()
    const k = await kachel('Nächstes Training')
    expect(k.textContent).toMatch(/2090/)
    expect(k.textContent).not.toMatch(/In \d+ Wochen/)
  })

  it('unterscheidet „nicht erreichbar" von „nichts angesetzt"', async () => {
    mockApi.getAllGameDays.mockRejectedValue(new Error('500'))
    rendern()
    const k = await kachel('Nächster Spieltag')
    await waitFor(() => expect(k.textContent).toMatch(/nicht erreichbar/))
    expect(k.textContent).not.toMatch(/Kein Spieltag angesetzt/)
  })

  /*
   * Die Trainingsbeteiligung fliesst in die Auto-Aufstellung ein und bleibt vor Spielern
   * verborgen, auch vor ihrer eigenen. Geheim ist die BETEILIGUNG, nicht der Termin.
   */
  it('sagt wann trainiert wird, aber nichts über die Beteiligung', async () => {
    rendern()
    await kachel('Nächstes Training')
    expect(screen.queryByText(/Beteiligung|Anwesend|Teilnehmer|Quote/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\d+\s*%/)).not.toBeInTheDocument()
    expect(mockApi.getPlayerUsage).not.toHaveBeenCalled()
  })

  /*
   * Ab Tablet-Breite ist Platz, den das Handy nicht hat. Diese beiden Kacheln sind
   * Nachschlag, keine Antwort auf die Frage, mit der man die Seite oeffnet — deshalb
   * stehen sie erst ab md. Beide kosten keinen zusaetzlichen Abruf: der Verlauf traegt
   * schon die Formkurve, die Termine schon die beiden Kacheln darueber.
   */
  it('zeigt am Schreibtisch zusätzlich die letzten Spiele und die nächsten Termine', async () => {
    mockApi.getPlayerBattingTimeline.mockResolvedValue([
      { gameId: 1, date: '2026-06-01', opponent: 'Berlin Bears', seasonId: 1, seasonName: null, year: 2026,
        plateAppearances: 4, atBats: 4, hits: 2, walks: 0, strikeouts: 1, runsBattedIn: 2,
        totalBases: 3, timesOnBase: 2, rollingAverage: 0.5 },
    ])
    rendern()
    const zuletzt = await kachel('Zuletzt')
    expect(zuletzt.className).toMatch(/hidden md:block/)
    await waitFor(() => expect(zuletzt.textContent).toMatch(/Berlin Bears/))
    expect(zuletzt.textContent).toMatch(/2 von 4/)
    expect(zuletzt.textContent).toMatch(/2 RBI/)

    const ansteht = await kachel('Was ansteht')
    expect(ansteht.className).toMatch(/hidden md:block/)
    expect(ansteht.textContent).toMatch(/Do · 18\. Juni/)
    expect(ansteht).toHaveAttribute('href', '/kalender')
  })

  /*
   * Solange nichts laeuft, zeigt die Kachel einen Beispielstand statt drei Reihen
   * erloschener Punkte — an denen sah man nicht einmal, dass es Lampen sind.
   *
   * Dass es ein Beispiel ist, muss dabeistehen: eine vorgetaeuschte Zaehlung waere
   * schlimmer als gar keine. Deshalb die Marke im Titel UND der Zusatz in jeder
   * Lampenreihe — wer vorgelesen bekommt, sieht die Marke nicht.
   */
  /*
   * Der Playmaker steht dauerhaft auf der Seite, nicht nur in der spielfreien Zeit: man
   * soll ihn SEHEN, ohne dass erst die Saison enden muss. Die Kategorien sind der
   * Ueberblick, und jede fuehrt in genau ihre Liste statt alle auf dieselbe Seite.
   */
  it('zeigt den Playmaker immer, mit den Kategorien als Weg hinein', async () => {
    rendern()
    const playmaker = await kachel('Playmaker')
    const bunt = await within(playmaker).findByRole('link', { name: 'Bunt-Defense' })
    expect(bunt).toHaveAttribute('href', '/orga/playmaker?kategorie=2')
    expect(within(playmaker).getByRole('link', { name: /Alle 2/ }))
      .toHaveAttribute('href', '/orga/playmaker')
    // Und die Spieltag-Kachel bleibt daneben stehen.
    expect(await kachel('Nächster Spieltag')).toBeInTheDocument()
  })

  /* Ohne Kategorien bleibt die Kachel ihr Titel und der Weg hinein — kein leerer Kasten. */
  it('bleibt brauchbar, wenn die Kategorien nicht laden', async () => {
    mockPlays.getPlayCategories.mockRejectedValue(new Error('500'))
    rendern()
    const playmaker = await kachel('Playmaker')
    await waitFor(() => expect(playmaker.textContent).toMatch(/Laufwege/))
    expect(within(playmaker).getByRole('link', { name: /Öffnen/ }))
      .toHaveAttribute('href', '/orga/playmaker')
  })

  it('zeigt einen Beispielstand, solange keiner läuft — und sagt, dass es einer ist', async () => {
    rendern()
    const karte = await screen.findByRole('link', { name: 'Counter' })
    expect(karte).toHaveAttribute('href', '/counter')
    expect(within(karte).getByText(/umpirest/)).toBeInTheDocument()
    expect(within(karte).getByText('Beispiel')).toBeInTheDocument()
    expect(within(karte).getByRole('img', { name: 'Ball: 2 von 3 (Beispiel)' })).toBeInTheDocument()
    expect(within(karte).getByRole('img', { name: 'Strike: 1 von 2 (Beispiel)' })).toBeInTheDocument()
    expect(within(karte).getByRole('img', { name: 'Out: 1 von 2 (Beispiel)' })).toBeInTheDocument()
  })

  it('zeigt den laufenden Counter statt der Erklärung', async () => {
    localStorage.setItem(COUNTER_STORAGE_KEY, JSON.stringify({
      current: { balls: 2, strikes: 1, outs: 1, inning: 3, half: 'bottom', home: 4, away: 2 },
      history: [],
    }))
    rendern()
    const karte = await screen.findByRole('link', { name: 'Counter' })
    expect(within(karte).queryByText(/umpirest/)).not.toBeInTheDocument()
    // Was wirklich gezaehlt wird, traegt keine Beispiel-Marke.
    expect(within(karte).queryByText('Beispiel')).not.toBeInTheDocument()
    // "3. Inning" steht zweimal da: sichtbar und noch einmal ausgeschrieben fuer
    // Screenreader. Der Tafel-Stand "4 : 2" gibt es nur sichtbar.
    const stand = within(karte).getByText(/4 : 2/)
    expect(stand.textContent).toMatch(/3\. Inning/)
    expect(within(karte).getByText(/Heim 4, Gast 2/)).toBeInTheDocument()
    expect(within(karte).getByRole('img', { name: 'Ball: 2 von 3' })).toBeInTheDocument()
    expect(within(karte).getByRole('img', { name: 'Strike: 1 von 2' })).toBeInTheDocument()
    expect(within(karte).getByRole('img', { name: 'Out: 1 von 2' })).toBeInTheDocument()
  })

  it('sagt einem Konto ohne Spieler, was zu tun ist — statt leerer Zahlen', async () => {
    auth.me = { ...ME, playerId: null, playerName: null }
    rendern()
    const kopf = await screen.findByRole('region', { name: 'Meine Zahlen' })
    expect(within(kopf).getByText(/keinem Spieler zugeordnet/)).toBeInTheDocument()
    expect(within(kopf).queryByText('AVG')).not.toBeInTheDocument()
  })

  it('erklärt leere Zahlen: noch nicht geschlagen und wann sie kommen', async () => {
    mockApi.getSeasonBattingStats.mockResolvedValue([])
    mockApi.getSeasonStats.mockResolvedValue([])
    rendern()
    const kopf = await screen.findByRole('region', { name: 'Meine Zahlen' })
    expect(await within(kopf).findByText(/noch nicht geschlagen/)).toBeInTheDocument()
  })

  it('sagt „gerade nicht erreichbar" statt „nicht geschlagen", wenn die Zahlen scheitern', async () => {
    mockApi.getSeasonBattingStats.mockRejectedValue(new Error('500'))
    rendern()
    const kopf = await screen.findByRole('region', { name: 'Meine Zahlen' })
    expect(await within(kopf).findByText(/gerade nicht erreichbar/)).toBeInTheDocument()
    expect(within(kopf).queryByText(/noch nicht geschlagen/)).not.toBeInTheDocument()
  })
})
