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
  getAllGameDays: vi.fn(),
  getTrainings: vi.fn(),
  getYearBattingStats: vi.fn(),
  getYearStats: vi.fn(),
  getDistinctYears: vi.fn(),
  getPlayerBattingTimeline: vi.fn(),
  getPlayerTrainingMonths: vi.fn(),
  getTrainingWeather: vi.fn(),
  getGameDayWeather: vi.fn(),
  getPlayer: vi.fn(),
  getPlayerUsage: vi.fn(),
}))


import * as api from '@/api/client'
import { StartPage } from './StartPage'
import { COUNTER_STORAGE_KEY } from '@/hooks/useCounter'

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>

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
    mockApi.getAllGameDays.mockResolvedValue([spieltag(1, '2026-07-04'), spieltag(2, '2026-03-01')])
    mockApi.getTrainings.mockResolvedValue([
      training(1, '2026-06-18'), training(2, '2026-06-20'), training(3, '2026-01-10'),
    ])
    mockApi.getDistinctYears.mockResolvedValue([2026, 2025])
    mockApi.getYearBattingStats.mockResolvedValue([ZAHLEN])
    mockApi.getYearStats.mockResolvedValue([
      { playerId: 7, playerName: 'Mia Meier', totalGames: 12, positionCounts: {} } as SeasonPlayerStats,
    ])
    mockApi.getPlayerBattingTimeline.mockResolvedValue([])
    mockApi.getPlayerTrainingMonths.mockResolvedValue({ monate: { '1': 1, '6': 2 }, verpasstSeitdem: 0 })
    mockApi.getTrainingWeather.mockResolvedValue(null)
    mockApi.getGameDayWeather.mockResolvedValue(null)
    mockApi.getPlayer.mockResolvedValue(ICH)
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

    const jahr = await kachel('Termine 2026')
    // Die Zeile ist zugleich die Legende: Menge des Jahres, dann was davon noch kommt.
    expect(jahr.textContent).toMatch(/2\s*Spieltage\s*· noch 1/)
    expect(jahr.textContent).toMatch(/3\s*Trainings\s*· du 3/)
    // Nur bei den Spieltagen steht, was noch kommt: danach richtet sich ein Wochenende.
    // Trainings laufen im Takt weiter, da plant niemand nach einer Restzahl.
    expect(jahr.textContent).not.toMatch(/Trainings\s*·\s*du 3\s*·\s*noch/)
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
   * Seit dem 27.10.2026 sieht man die EIGENE Anwesenheit („du 3"), aber weiterhin nicht die
   * QUOTE, die die Auto-Aufstellung gewichtet — und nicht die der anderen. Der Unterschied
   * ist der ganze Punkt: eine Zahl ueber sich selbst ist Auskunft, eine Quote im Vergleich
   * ist ein Anspruch. Deshalb steht hier eine Zaehlung und nirgends ein Prozentwert.
   */
  it('zeigt die eigene Anwesenheit, aber keine Quote und keine fremde Zahl', async () => {
    rendern()
    const jahr = await kachel('Termine 2026')
    await waitFor(() => expect(jahr.textContent).toMatch(/du 3/))
    expect(mockApi.getPlayerTrainingMonths).toHaveBeenCalledWith(7, 2026)

    expect(screen.queryByText(/Beteiligung|Quote/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\d+\s*%/)).not.toBeInTheDocument()
    expect(mockApi.getPlayerUsage).not.toHaveBeenCalled()
  })

  /* Ohne Auskunft bleibt das Band der reine Terminplan — nicht „du warst nie da". */
  it('zeigt keine eigene Zahl, wenn der Abruf scheitert', async () => {
    mockApi.getPlayerTrainingMonths.mockRejectedValue(new Error('403'))
    rendern()
    const jahr = await kachel('Termine 2026')
    await waitFor(() => expect(jahr.textContent).toMatch(/Trainings/))
    expect(jahr.textContent).not.toMatch(/du \d/)
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
   * Solange nichts laeuft, sind die Lampen eine ABBILDUNG: so sieht das Werkzeug aus, wie
   * das Feld auf der Playmaker-Kachel daneben.
   *
   * Der Unterschied zum laufenden Zaehler steckt nicht im Bild, sondern im Anspruch.
   * Einmal trugen die Lampen auch im Ruhezustand echte Vorlese-Beschriftungen
   * ("Ball: 2 von 3") und brauchten deshalb ein Etikett "Beispiel" — eine Zaehlung, die
   * keine ist, muss man erklaeren. Als Abbildung behauptet sie nichts und ist fuer
   * Screenreader schlicht nicht da. Genau das prueft dieser Test.
   */
  it('zeigt die Lampen ohne laufenden Zähler als Bild, nicht als Auskunft', async () => {
    rendern()
    const karte = await screen.findByRole('link', { name: 'Counter' })
    expect(karte).toHaveAttribute('href', '/counter')
    expect(within(karte).getByText(/Umpen/)).toBeInTheDocument()
    // Kein Etikett — und nichts, was vorgelesen würde.
    expect(within(karte).queryByText('Beispiel')).not.toBeInTheDocument()
    expect(within(karte).queryByRole('img', { name: /^Ball:/ })).not.toBeInTheDocument()
    // Sichtbar ist sie trotzdem.
    expect(within(karte).getByText('Ball')).toBeInTheDocument()
  })

  it('zeigt den laufenden Counter statt der Erklärung', async () => {
    localStorage.setItem(COUNTER_STORAGE_KEY, JSON.stringify({
      current: { balls: 2, strikes: 1, outs: 1, inning: 3, half: 'bottom', home: 4, away: 2 },
      history: [],
    }))
    rendern()
    const karte = await screen.findByRole('link', { name: 'Counter' })
    expect(within(karte).queryByText(/Umpen/)).not.toBeInTheDocument()
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

  /*
   * Der Zeitraum ist das JAHR, nicht eine Saison daraus.
   *
   * Vorher suchte die Seite sich die Saison des naechstgelegenen Spieltags. Wer im selben
   * Jahr eine Liga-Saison und eine fuer Trainingsspiele hat, bekam damit die Bilanz der
   * zuletzt angesetzten — ein Spiel, keine Quoten — unter einer Kachel, die "Dein Jahr"
   * ueberschrieb. Dieser Test haelt Kopf und Band auf demselben Zeitraum.
   */
  it('nimmt die Zahlen des ganzen Jahres, nicht die einer einzelnen Saison', async () => {
    rendern()
    const kopf = await screen.findByRole('region', { name: 'Meine Zahlen' })
    await waitFor(() => expect(within(kopf).getByText('.500')).toBeInTheDocument())
    expect(mockApi.getYearBattingStats).toHaveBeenCalledWith(2026)
    expect(mockApi.getYearStats).toHaveBeenCalledWith(2026)
    // Das Jahr steht waehlbar neben den Zahlen, Vorgabe ist das laufende.
    expect(within(kopf).getByRole('combobox', { name: 'Jahr wählen' })).toHaveValue('2026')
    await kachel('Termine 2026')
  })

  /*
   * Der Verlauf kommt ungefiltert vom Server (alle Jahre). Die Kurve im Kopf und die
   * Kachel "Zuletzt" zeigen nur das laufende Jahr — sonst zoege ein Spiel von 2024 die
   * Jahresbilanz mit.
   */
  it('lässt Spiele anderer Jahre aus dem Verlauf heraus', async () => {
    mockApi.getPlayerBattingTimeline.mockResolvedValue([
      { gameId: 9, date: '2024-05-01', opponent: 'Altes Jahr', seasonId: 9, seasonName: null, year: 2024,
        plateAppearances: 3, atBats: 3, hits: 1, walks: 0, strikeouts: 0, runsBattedIn: 0,
        totalBases: 1, timesOnBase: 1, rollingAverage: 0.33 },
      { gameId: 1, date: '2026-06-01', opponent: 'Berlin Bears', seasonId: 1, seasonName: null, year: 2026,
        plateAppearances: 4, atBats: 4, hits: 2, walks: 0, strikeouts: 1, runsBattedIn: 2,
        totalBases: 3, timesOnBase: 2, rollingAverage: 0.5 },
    ])
    rendern()
    const zuletzt = await kachel('Zuletzt')
    await waitFor(() => expect(zuletzt.textContent).toMatch(/Berlin Bears/))
    expect(zuletzt.textContent).not.toMatch(/Altes Jahr/)
  })

  /*
   * Das Jahr ist die Vorgabe, nicht das Gesetz: wer wissen will, wie er in der Liga
   * dasteht und nicht gemischt mit den Trainingsspielen, stellt hier um. Entscheidend
   * ist, dass die Seite das NICHT selbst tut — genau daran ist sie vorher gescheitert.
   */
  /*
   * Jahre, nicht Saisons: eine Saison ist ein Ausschnitt, ein Jahr ist das, was im naechsten
   * wiederkommt. Entscheidend ist, dass das Terminband MITZIEHT — zwei Zeitraeume auf einer
   * Seite waren der Fehler, an dem die Startseite einmal gescheitert ist.
   */
  it('lässt das Jahr wählen, merkt es sich — und das Terminband zieht mit', async () => {
    rendern()
    const kopf = await screen.findByRole('region', { name: 'Meine Zahlen' })
    await waitFor(() => expect(within(kopf).getByText('.500')).toBeInTheDocument())

    fireEvent.change(within(kopf).getByRole('combobox', { name: 'Jahr wählen' }), { target: { value: '2025' } })

    await waitFor(() => expect(mockApi.getYearBattingStats).toHaveBeenCalledWith(2025))
    expect(mockApi.getYearStats).toHaveBeenCalledWith(2025)
    await kachel('Termine 2025')
    expect(localStorage.getItem('startseite-jahr')).toBe('2025')
  })

  /* Im vergangenen Jahr kommt nichts mehr — „noch 1" waere dort schlicht falsch. */
  it('lässt „noch" weg, sobald ein vergangenes Jahr gewählt ist', async () => {
    rendern()
    const kopf = await screen.findByRole('region', { name: 'Meine Zahlen' })
    await waitFor(() => expect(within(kopf).getByText('.500')).toBeInTheDocument())
    fireEvent.change(within(kopf).getByRole('combobox', { name: 'Jahr wählen' }), { target: { value: '2025' } })

    const band = await kachel('Termine 2025')
    await waitFor(() => expect(band.textContent).toMatch(/Spieltage/))
    expect(band.textContent).not.toMatch(/noch \d/)
  })

  /* Ein gemerktes Jahr ueberlebt den Besuch — darum geht es: naechstes Jahr nachsehen, wie dieses lief. */
  it('nimmt beim Öffnen das zuletzt gewählte Jahr', async () => {
    localStorage.setItem('startseite-jahr', '2025')
    rendern()
    await screen.findByRole('region', { name: 'Meine Zahlen' })
    await waitFor(() => expect(mockApi.getYearBattingStats).toHaveBeenCalledWith(2025))
    await kachel('Termine 2025')
  })

  /* Eine Auswahl mit einem einzigen Eintrag ist keine Auswahl. */
  it('zeigt die Jahreszahl statt einer Auswahl, wenn es nur ein Jahr gibt', async () => {
    mockApi.getDistinctYears.mockResolvedValue([2026])
    rendern()
    const kopf = await screen.findByRole('region', { name: 'Meine Zahlen' })
    await waitFor(() => expect(within(kopf).getByText('.500')).toBeInTheDocument())
    expect(within(kopf).queryByRole('combobox', { name: 'Jahr wählen' })).not.toBeInTheDocument()
    expect(within(kopf).getByText('2026')).toBeInTheDocument()
  })

  /*
   * Wer lange weg war, bekommt eine Einladung — keine Abrechnung. Deshalb steht in der Zeile
   * keine Zahl und kein Datum: „seit 11 Terminen" waere Buchhaltung ueber einen Menschen.
   * Die Schwelle ist bewusst hoch (10 Termine, rund fuenf Wochen): ein Hinweis, der zu Unrecht
   * kommt, ist ein Vorwurf.
   */
  it('lädt zurück ins Training, wenn jemand lange weg war — ohne Zahl und ohne Datum', async () => {
    mockApi.getPlayerTrainingMonths.mockResolvedValue({ monate: {}, verpasstSeitdem: 10 })
    rendern()
    const k = await kachel('Nächstes Training')
    await waitFor(() => expect(k.textContent).toMatch(/Lange nicht da gewesen/))
    expect(k.textContent).toMatch(/Komm doch wieder vorbei/)
    expect(k.textContent).not.toMatch(/10|Termine/)
    // Statt des Ausblicks auf den uebernaechsten Termin — wer weg war, braucht einen Grund
    // fuer den naechsten, keinen Ausblick auf den danach.
    expect(k.textContent).not.toMatch(/Danach/)
  })

  /*
   * Das Wetter loest „Danach …" ab, solange es eins gibt — es sagt mehr ueber den naechsten
   * Termin als das Datum des uebernaechsten. Ausserhalb des Vorhersagefensters antwortet der
   * Server mit nichts, und dann traegt wieder der Ausblick. Nie beides: das waere eine Zeile
   * mehr, und am Handy ist das der Unterschied zwischen passt und scrollt.
   */
  it('zeigt das Wetter statt des übernächsten Termins', async () => {
    mockApi.getTrainingWeather.mockResolvedValue({
      tempMin: 8, tempMax: 14, wmoCode: 61, precipitationProbabilityPct: 70, hours: [],
    })
    rendern()
    const k = await kachel('Nächstes Training')
    await waitFor(() => expect(k.textContent).toMatch(/8–14°/))
    expect(k.textContent).toMatch(/70.*% Regen/)
    expect(k.textContent).not.toMatch(/Danach/)
  })

  /* Beim Spieltag kommt das Wetter dazu — dort gibt es keine Zeile, die es ablösen könnte. */
  it('zeigt das Wetter auch beim Spieltag, wenn es eins gibt', async () => {
    mockApi.getGameDayWeather.mockResolvedValue({
      tempMin: 12, tempMax: 21, wmoCode: 1, precipitationProbabilityPct: 10, hours: [],
    })
    rendern()
    const k = await kachel('Nächster Spieltag')
    await waitFor(() => expect(k.textContent).toMatch(/12–21°/))
    expect(k.textContent).toMatch(/10.*% Regen/)
  })

  it('lässt die Wetterzeile beim Spieltag weg, wenn es keine Vorhersage gibt', async () => {
    rendern()
    const k = await kachel('Nächster Spieltag')
    await waitFor(() => expect(k.textContent).toMatch(/Berlin Bears/))
    expect(k.textContent).not.toMatch(/Regen/)
  })

  it('fällt auf „Danach" zurück, wenn es keine Vorhersage gibt', async () => {
    rendern()
    const k = await kachel('Nächstes Training')
    await waitFor(() => expect(k.textContent).toMatch(/Danach/))
    expect(k.textContent).not.toMatch(/°/)
  })

  /* Die Nachfrage schlaegt das Wetter: sie kommt selten und waere darunter verschenkt. */
  it('stellt die Nachfrage über das Wetter', async () => {
    mockApi.getPlayerTrainingMonths.mockResolvedValue({ monate: {}, verpasstSeitdem: 12 })
    mockApi.getTrainingWeather.mockResolvedValue({
      tempMin: 8, tempMax: 14, wmoCode: 61, precipitationProbabilityPct: 70, hours: [],
    })
    rendern()
    const k = await kachel('Nächstes Training')
    await waitFor(() => expect(k.textContent).toMatch(/Lange nicht da gewesen/))
    expect(k.textContent).not.toMatch(/8–14°/)
  })

  it('schweigt knapp unter der Schwelle', async () => {
    mockApi.getPlayerTrainingMonths.mockResolvedValue({ monate: {}, verpasstSeitdem: 9 })
    rendern()
    const k = await kachel('Nächstes Training')
    await waitFor(() => expect(k.textContent).toMatch(/Do · 18\. Juni/))
    expect(k.textContent).not.toMatch(/Lange nicht/)
    expect(k.textContent).toMatch(/Danach/)
  })

  /* Noch nie da gewesen ist kein „lange nicht gesehen" — das ist die falsche Anrede. */
  it('spricht niemanden an, der noch nie im Training war', async () => {
    mockApi.getPlayerTrainingMonths.mockResolvedValue({ monate: {}, verpasstSeitdem: null })
    rendern()
    const k = await kachel('Nächstes Training')
    await waitFor(() => expect(k.textContent).toMatch(/Do · 18\. Juni/))
    expect(k.textContent).not.toMatch(/Lange nicht/)
  })

  /*
   * Durch die Kurve ZIEHEN, nicht nur tippen: am Handy ist das der natuerliche Griff, und
   * die Linie ist 1,5 Pixel breit — treffen kann man sie ohnehin nicht. Welches Spiel
   * gemeint ist, entscheidet die Position des Fingers.
   *
   * jsdom misst nichts, deshalb werden Rechteck und Zeigerfang von Hand gestellt. Geprueft
   * wird die Rechnung dahinter: halbe Breite => mittleres Spiel.
   */
  it('lässt durch die Kurve ziehen, nicht nur tippen', async () => {
    mockApi.getPlayerBattingTimeline.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        gameId: i + 1, date: `2026-06-0${i + 1}`, opponent: `Gegner ${i + 1}`, seasonId: 1,
        // 10 At-Bats je Spiel: darunter gilt ein Punkt als vorlaeufig und faellt aus der
        // Kurve (MIN_AT_BATS) — mit 4 blieben von fuenf Spielen nur drei uebrig.
        seasonName: null, year: 2026, plateAppearances: 10, atBats: 10, hits: 5, walks: 0,
        strikeouts: 0, runsBattedIn: 0, totalBases: 5, timesOnBase: 5, rollingAverage: 0.5,
      })),
    )
    const { container } = render(<MemoryRouter><StartPage /></MemoryRouter>)
    const kopf = await screen.findByRole('region', { name: 'Meine Zahlen' })
    const svg = await waitFor(() => {
      const s = container.querySelector('svg[role="img"]')
      if (!s) throw new Error('noch keine Kurve')
      return s
    })

    svg.getBoundingClientRect = () => ({ left: 0, width: 100, top: 0, height: 24,
      right: 100, bottom: 24, x: 0, y: 0, toJSON: () => ({}) })
    const flaeche = svg.querySelectorAll('rect')[svg.querySelectorAll('rect').length - 1]
    Object.assign(flaeche, { setPointerCapture: () => {}, hasPointerCapture: () => true })

    fireEvent.pointerDown(flaeche, { clientX: 0, pointerId: 1 })
    await waitFor(() => expect(kopf.textContent).toMatch(/Gegner 1/))

    // Ziehen nach rechts: der Text wandert mit, ohne neues Aufsetzen.
    fireEvent.pointerMove(flaeche, { clientX: 100, pointerId: 1 })
    await waitFor(() => expect(kopf.textContent).toMatch(/Gegner 5/))
    fireEvent.pointerMove(flaeche, { clientX: 50, pointerId: 1 })
    await waitFor(() => expect(kopf.textContent).toMatch(/Gegner 3/))
  })

  it('erklärt leere Zahlen: noch nicht geschlagen und wann sie kommen', async () => {
    mockApi.getYearBattingStats.mockResolvedValue([])
    mockApi.getYearStats.mockResolvedValue([])
    rendern()
    const kopf = await screen.findByRole('region', { name: 'Meine Zahlen' })
    expect(await within(kopf).findByText(/noch nicht geschlagen/)).toBeInTheDocument()
  })

  it('sagt „gerade nicht erreichbar" statt „nicht geschlagen", wenn die Zahlen scheitern', async () => {
    mockApi.getYearBattingStats.mockRejectedValue(new Error('500'))
    rendern()
    const kopf = await screen.findByRole('region', { name: 'Meine Zahlen' })
    expect(await within(kopf).findByText(/gerade nicht erreichbar/)).toBeInTheDocument()
    expect(within(kopf).queryByText(/noch nicht geschlagen/)).not.toBeInTheDocument()
  })
})
