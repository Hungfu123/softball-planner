import type { PlayerFormPoint } from '@/types'

/**
 * Die vier Quoten, die man im Verlauf lesen kann. Steals und Walks sind Zählwerte,
 * keine Quoten — sie stehen im Teamvergleich darunter, nicht in der Kurve.
 */
export const METRICS = {
  average: { label: 'AVG', long: 'Schlagdurchschnitt' },
  onBase: { label: 'OBP', long: 'On-Base-Quote' },
  slugging: { label: 'SLG', long: 'Schlagkraft' },
  ops: { label: 'OPS', long: 'OBP plus SLG' },
} as const

export type Metric = keyof typeof METRICS

/**
 * Ab so vielen At-Bats trägt die laufende Quote genug, um gezeichnet zu werden.
 *
 * Davor sagt sie nichts: ein 1-aus-1 im ersten Spiel ergibt kumulativ 1.000 und zöge
 * die Achse auf 1.250 hoch — der belastbare Teil läge dann gequetscht in der Mitte.
 * Die Werte selbst zählen trotzdem ab dem ersten Spiel mit, nur der Anfang der Linie
 * wartet.
 */
export const MIN_AT_BATS = 10

export type CumulativePoint = {
  gameId: number
  date: string | null
  opponent: string | null
  /** Zahlen dieses einen Spiels — für die Detailzeile unter dem Graphen. */
  gameHits: number
  gameAtBats: number
  gameWalks: number
  gameStolenBases: number
  /** Aufsummiert bis einschließlich dieses Spiels. */
  atBats: number
  plateAppearances: number
  average: number
  onBase: number
  slugging: number
  ops: number
  /** Noch zu wenig At-Bats — die Linie beginnt erst danach. */
  provisional: boolean
}

/** Nenner der jeweiligen Kennzahl: AVG und SLG je At-Bat, OBP und OPS je PA. */
export function denominator(point: CumulativePoint, metric: Metric): { value: number; label: string } {
  return metric === 'onBase' || metric === 'ops'
    ? { value: point.plateAppearances, label: 'PA' }
    : { value: point.atBats, label: 'At-Bats' }
}

/**
 * Laufende Gesamtquote statt gleitendem Fenster.
 *
 * Jeder Punkt ist der Stand **nach** diesem Spiel, über alle At-Bats davor —
 * so wie eine Saisonbilanz wächst. Vorher zeigte die Kurve einen Schnitt über die
 * letzten 20 At-Bats; der sprang bei jedem guten oder schlechten Spiel stark
 * und ließ sich zwischen Spielern nicht vergleichen, weil hinter jedem Punkt eine
 * andere Stichprobe stand.
 *
 * Gerechnet wird über die **übergebenen** Punkte: schneidet der Zeitraum-Filter die
 * Reihe auf ein Jahr zu, beginnt die Summe bei dessen erstem Spiel.
 */
export function cumulativeSeries(points: PlayerFormPoint[]): CumulativePoint[] {
  let atBats = 0
  let hits = 0
  let totalBases = 0
  let timesOnBase = 0
  let plateAppearances = 0

  return points.map(p => {
    atBats += p.atBats
    hits += p.hits
    totalBases += p.totalBases
    timesOnBase += p.timesOnBase
    plateAppearances += p.plateAppearances

    const average = atBats > 0 ? hits / atBats : 0
    const onBase = plateAppearances > 0 ? timesOnBase / plateAppearances : 0
    const slugging = atBats > 0 ? totalBases / atBats : 0

    return {
      gameId: p.gameId,
      date: p.date,
      opponent: p.opponent,
      gameHits: p.hits,
      gameAtBats: p.atBats,
      gameWalks: p.walks,
      gameStolenBases: p.stolenBases,
      atBats,
      plateAppearances,
      average,
      onBase,
      slugging,
      ops: onBase + slugging,
      provisional: atBats < MIN_AT_BATS,
    }
  })
}

/** Mögliche Abstände der Hilfslinien, aufsteigend. */
const GUIDE_STEPS = [0.1, 0.2, 0.25, 0.5, 1]
const MAX_GUIDES = 5

/**
 * Y-Achse von **0** bis zur nächsten runden Hilfslinie über dem Höchstwert.
 *
 * Die Achse umschloss früher die Daten, begann also irgendwo bei .150. Das zeigt
 * zwar die Ausschläge größer, macht aber zwei Spieler unvergleichbar: derselbe
 * Kurvenverlauf bedeutete bei jedem etwas anderes. Mit festem Nullpunkt liest man
 * zwei Linien im selben Maßstab.
 */
export function axis(values: number[]): { max: number; guides: number[] } {
  const peak = values.length > 0 ? Math.max(...values) : 0
  const step = GUIDE_STEPS.find(s => peak / s <= MAX_GUIDES - 1) ?? GUIDE_STEPS[GUIDE_STEPS.length - 1]
  const max = Math.max(step, Math.ceil(peak / step) * step)
  const guides: number[] = []
  for (let g = 0; g <= max + 1e-9; g += step) guides.push(Number(g.toFixed(3)))
  return { max, guides }
}

/**
 * Waagerechte Lage je Punkt, als Anteil 0…1.
 *
 * Nach **Datum**, nicht nach Position in der Liste: beim Spielervergleich haben
 * zwei Leute verschiedene Spiele gespielt, und nur über das Datum liegen die Kurven
 * im selben Zeitraum übereinander. Ohne Datumsangaben bleibt die gleichmäßige
 * Verteilung übrig.
 */
/**
 * Waagerechte Lage je Punkt, als Anteil 0…1 — **ein Spiel, ein Schritt**.
 *
 * Nach Datum sah es ehrlicher aus, las sich aber schlecht: mehrere Spiele desselben
 * Spieltags fielen übereinander, Saisonpausen rissen Löcher. Gleiche Schritte geben
 * jedem Spiel dieselbe Breite. Beim Vergleich liegt Spiel 5 über Spiel 5 — „nach
 * ebenso vielen Spielen", nicht „am selben Tag".
 *
 * @param count Punkte dieser Reihe
 * @param span Längste beteiligte Reihe, damit die kürzere früher endet statt
 *             gedehnt zu werden.
 */
export function xFractions(count: number, span = count): number[] {
  const schritte = Math.max(span - 1, 1)
  if (count === 1) return [span <= 1 ? 0.5 : 0]
  return Array.from({ length: count }, (_, i) => i / schritte)
}

/** Quoten im Softball ohne führende Null: .312, nicht 0.312. */
export function fmt(value: number): string {
  return value.toFixed(3).replace(/^0/, '')
}

const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

/**
 * Monatswechsel in der Reihe — die Zeit zurück auf eine Achse, die nach Spielen zählt.
 *
 * Gleiche Schritte je Spiel lesen sich besser als echte Datumsabstände, verschweigen
 * aber, ob zwischen zwei Punkten eine Woche oder drei Monate lagen. Die Marken zeigen
 * es wieder: liegen fünf Spiele zwischen „Mai" und „Jun", war der Monat dicht.
 *
 * @returns Index in der Reihe und Beschriftung, erstes Spiel immer dabei.
 */
export function monthTicks(points: CumulativePoint[]): { index: number; label: string }[] {
  const ticks: { index: number; label: string }[] = []
  let letzter = ''
  points.forEach((p, index) => {
    if (!p.date) return
    const d = new Date(p.date + 'T00:00:00')
    if (Number.isNaN(d.getTime())) return
    const schluessel = `${d.getFullYear()}-${d.getMonth()}`
    if (schluessel === letzter) return
    letzter = schluessel
    const jahrWechsel = ticks.length > 0 && !ticks[ticks.length - 1].label.endsWith(String(d.getFullYear() % 100))
      && d.getMonth() === 0
    ticks.push({ index, label: jahrWechsel ? `${MONATE[d.getMonth()]} ${d.getFullYear() % 100}` : MONATE[d.getMonth()] })
  })
  return ticks
}

export function fmtDate(date: string | null): string {
  if (!date) return 'ohne Datum'
  return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
