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

/** Ab hier trägt die Quote genug Schlagversuche, um nicht mehr wild zu springen. */
export const PROVISIONAL_UNTIL_PA = 20

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
  plateAppearances: number
  average: number
  onBase: number
  slugging: number
  ops: number
  /** Noch zu wenig Schlagversuche — Kurve wird gestrichelt gezeichnet. */
  provisional: boolean
}

/**
 * Laufende Gesamtquote statt gleitendem Fenster.
 *
 * Jeder Punkt ist der Stand **nach** diesem Spiel, über alle Schlagversuche davor —
 * so wie eine Saisonbilanz wächst. Vorher zeigte die Kurve einen Schnitt über die
 * letzten 20 Schlagversuche; der sprang bei jedem guten oder schlechten Spiel stark
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
      plateAppearances,
      average,
      onBase,
      slugging,
      ops: onBase + slugging,
      provisional: plateAppearances < PROVISIONAL_UNTIL_PA,
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
export function xFractions(dates: (string | null)[], range?: { from: string; to: string }): number[] {
  const n = dates.length
  const evenly = (i: number) => (n <= 1 ? 0.5 : i / (n - 1))
  if (dates.some(d => d == null)) return dates.map((_, i) => evenly(i))

  const times = (dates as string[]).map(d => new Date(d + 'T00:00:00').getTime())
  if (times.some(t => Number.isNaN(t))) return dates.map((_, i) => evenly(i))

  const from = range ? new Date(range.from + 'T00:00:00').getTime() : Math.min(...times)
  const to = range ? new Date(range.to + 'T00:00:00').getTime() : Math.max(...times)
  if (!(to > from)) return dates.map((_, i) => evenly(i))

  return times.map(t => (t - from) / (to - from))
}

/** Früheste und späteste Datumsangabe mehrerer Reihen — der gemeinsame Zeitraum. */
export function dateRange(...series: CumulativePoint[][]): { from: string; to: string } | undefined {
  const dates = series.flat().map(p => p.date).filter((d): d is string => d != null).sort()
  if (dates.length === 0) return undefined
  return { from: dates[0], to: dates[dates.length - 1] }
}

/** Quoten im Softball ohne führende Null: .312, nicht 0.312. */
export function fmt(value: number): string {
  return value.toFixed(3).replace(/^0/, '')
}

export function fmtDate(date: string | null): string {
  if (!date) return 'ohne Datum'
  return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
