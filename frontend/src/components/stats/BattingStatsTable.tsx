import { useMemo, useRef, useState } from 'react'
import { Trophy, Zap, Check, Info } from 'lucide-react'
import type { PlayerBattingStatsResponse } from '@/types'

const MIN_AB_LABEL = 'min. 5 ABs'

interface Props {
  stats: PlayerBattingStatsResponse[]
  /** Öffnet das Glossar. Der Weg dahin gehört unter die Tabelle, nicht nur in die Kopfzeile. */
  onOpenGlossary?: () => void
  /** Rate-Stat-Qualifier (≥5 ABs) anwenden — true für aggregierte Scopes (Saison/Jahr/Alle Zeit), false pro Spiel. */
  applyQualifier?: boolean
  /** playerId → gewichteter Game-Zähler (totalGames). Nenner für RBI/G. */
  gamesByPlayerId?: Map<number, number>
  /** RBI/G- und R/G-Spalte zeigen — nur in aggregierten Scopes wo totalGames vorliegt. */
  showPerGame?: boolean
}

type SortKey =
  | 'playerName' | 'atBats' | 'hits' | 'battingAverage' | 'walks' | 'strikeouts'
  | 'homeRuns' | 'runs' | 'stolenBases' | 'caughtStealing' | 'pickoffs'
  | 'onBasePct' | 'sluggingPct' | 'ops' | 'runsBattedIn' | 'rbiPerGame' | 'runsPerGame'
type SortDir = 'asc' | 'desc'

/*
 * Die Spaltenreihenfolge ist eine Aussage darüber, was zuerst interessiert — auf dem Handy
 * sieht man nur die ersten fünf, der Rest will gewischt werden. Sie geht deshalb von der
 * Frage aus, nicht von der Datenherkunft:
 *
 *   wer      AB  H       — wie oft stand er oben, wie oft hat er getroffen (die Stichprobe
 *                          steht VOR den Quoten, sonst liest man .750 aus vier Versuchen als Wert)
 *   Quoten   AVG OBP SLG OPS   — der Scouting-Block, vier Zahlen, die nur zusammen etwas sagen
 *   Ertrag   RBI R HR SB       — was dabei herauskam, jeweils mit seiner Pro-Spiel-Zahl daneben
 *   Auge     BB K             — Disziplin am Schlag
 *   Laufen   CS PO            — und die Treffer-Aufschlüsselung ganz hinten
 *
 * Vorher standen AVG vorn und OBP/SLG/OPS hinter einem Aufklapper: der Reiter versteckte
 * genau die drei Zahlen, nach denen ein Trainer eine Schlagreihenfolge baut. Es wird nichts
 * mehr zugeklappt.
 *
 * Und es gibt keine Spalte „Quote" mehr. Sie zeigte `.824` als `82 %` ein zweites Mal und
 * nahm dafür die breiteste Stelle der Tabelle ein. Der Balken ist geblieben, er liegt jetzt
 * HINTER der Zahl — und hinter der Zahl, nach der gerade sortiert wird, nicht fest hinter AVG.
 * So zeigt er immer die Rangfolge, die man sehen wollte.
 */

/** Spalten, hinter denen eine Gruppe endet — dort sitzt eine feine Trennlinie. */
const GRUPPENANFANG = 'border-l border-cream-300'
const GRUPPENANFANG_KOPF = 'border-l border-white/20'

const ZELLE = 'px-2.5 py-2 text-right font-display tabular-nums whitespace-nowrap'
/** AB und H — die Stichprobe, zurueckhaltender als die Quoten daneben. */
const ZAEHLUNG = `${ZELLE} text-gray-700`
/** AVG, OBP, SLG, OPS. */
const QUOTE = `${ZELLE} text-navy-900`
/** RBI/G und R/G — abgeleitet, also leiser als die Zaehlung, aus der sie kommen. */
const PRO_SPIEL = `${ZELLE} text-gray-600`

export function BattingStatsTable({ stats, onOpenGlossary, applyQualifier = false, gamesByPlayerId, showPerGame = false }: Props) {
  const [showUnqualified, setShowUnqualified] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('battingAverage')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [amEnde, setAmEnde] = useState(false)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setScrolled(el.scrollLeft > 0)
    // 2 px Luft: Browser runden `scrollWidth` bei Zoom und DPR nicht immer glatt.
    setAmEnde(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2)
  }

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'playerName' ? 'asc' : 'desc') // Namen A→Z, Zahlen hoch→niedrig
    }
  }

  // RBI/G = RBI / gewichtete Spiele. Ohne Game-Zähler (z.B. Scope Spiel) → null.
  const rbiPerGame = (s: PlayerBattingStatsResponse): number | null => {
    const games = gamesByPlayerId?.get(s.playerId) ?? 0
    return games > 0 ? s.runsBattedIn / games : null
  }

  // R/G = Runs / gewichtete Spiele. Ohne Game-Zähler (z.B. Scope Spiel) → null.
  const runsPerGame = (s: PlayerBattingStatsResponse): number | null => {
    const games = gamesByPlayerId?.get(s.playerId) ?? 0
    return games > 0 ? s.runs / games : null
  }

  /** Der Zahlenwert einer Spalte — eine Stelle für Sortierung UND Balkenlänge. */
  const wert = (s: PlayerBattingStatsResponse, key: SortKey): number | null => {
    if (key === 'playerName') return null
    if (key === 'rbiPerGame') return rbiPerGame(s)
    if (key === 'runsPerGame') return runsPerGame(s)
    return Number(s[key] ?? 0)
  }

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...stats].sort((a, b) => {
      const cmp = sortKey === 'playerName'
        ? a.playerName.localeCompare(b.playerName)
        : (wert(a, sortKey) ?? -1) - (wert(b, sortKey) ?? -1)
      if (cmp !== 0) return cmp * dir
      // Tiebreaker immer stabil: Treffer absteigend, dann Name
      return b.hits - a.hits || a.playerName.localeCompare(b.playerName)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, sortKey, sortDir, gamesByPlayerId])

  const { qualified, unqualified } = useMemo(() => {
    if (!applyQualifier) return { qualified: sorted, unqualified: [] as PlayerBattingStatsResponse[] }
    return {
      qualified: sorted.filter(s => s.qualified),
      unqualified: sorted.filter(s => !s.qualified),
    }
  }, [sorted, applyQualifier])

  const visible = showUnqualified ? [...qualified, ...unqualified] : qualified

  // `sticky top-0`: die Koepfe bleiben stehen, waehrend man die Zeilen durchscrollt. Ohne das
  // steht man ab Zeile 6 vor „.667 .667 .833 1.500" und weiss nicht mehr, welche Spalte OBP ist.
  const NUM_TH = 'font-display sticky top-0 z-20 bg-navy-900 text-right px-2.5 py-2.5 font-extrabold text-[10px] uppercase tracking-widest whitespace-nowrap'

  const sortTh = (key: SortKey, label: string, opts?: { title?: string; align?: 'left' | 'right'; className?: string }) => {
    const align = opts?.align ?? 'right'
    const active = sortKey === key
    return (
      <th
        onClick={() => handleSort(key)}
        title={opts?.title}
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`${align === 'right' ? NUM_TH : 'font-display text-left px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest'} cursor-pointer select-none transition-colors ${
          active ? 'text-white' : 'text-white/60 hover:text-white'
        } ${opts?.className ?? ''}`}
      >
        {/* Die aktive Spalte trägt einen Unterstrich statt eines Pfeils: der Pfeil kostete in
            jeder Spalte Breite, auch in den 15 unsortierten. */}
        <span className={active ? 'border-b-2 border-softball-red-500 pb-0.5' : ''}>{label}</span>
      </th>
    )
  }

  if (stats.length === 0) {
    return (
      <div className="bg-cream-50 border border-cream-300 rounded-2xl p-12 text-center text-gray-500">
        <p className="mb-2">Noch keine Schlag-Daten in diesem Zeitraum.</p>
        <p className="text-xs">Sobald ein Spiel im Spielbogen mitgeschrieben ist, stehen die Zahlen hier.</p>
      </div>
    )
  }

  /** Zaehlungen, deren Null blass bleibt: eine Spalte voller kraeftiger Nullen liest sich als Inhalt. */
  const zahl = (v: number, extra = '') =>
    `${ZELLE} ${v === 0 ? 'text-gray-300' : 'text-navy-900'} ${extra}`

  return (
    <div className="space-y-2">
      <div className="bg-cream-50 border border-cream-300 rounded-2xl overflow-hidden">
        {/* `relative`, weil die Verlaufskante am rechten Rand darüber liegt. */}
        <div className="relative">
          {/*
           * Die Hoehe ist gedeckelt, damit die Spaltenkoepfe kleben koennen: `position: sticky`
           * richtet sich nach dem naechsten scrollenden Vorfahren, und das ist dieser Kasten.
           * Ohne Deckel scrollt hier vertikal nichts, und die Koepfe wandern mit der SEITE weg.
           *
           * Gemessen bei 11 Spielern faellt der Deckel nicht ins Gewicht (die Tabelle ist
           * kuerzer) — er greift erst ab ~13 Zeilen, also genau dann, wenn man ihn braucht.
           * `dvh` statt `vh`, weil die Adressleiste am Handy mitwandert.
           *
           * Kein `overscroll-behavior: contain`: laeuft der Finger unten aus der Tabelle
           * heraus, soll die SEITE weiterscrollen und nicht anschlagen.
           */}
          <div ref={scrollRef} onScroll={handleScroll} className="overflow-auto max-h-[70dvh]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-900 text-white">
                  {sortTh('playerName', 'Spieler', {
                    align: 'left',
                    // Die Ecke klebt in BEIDEN Richtungen und muss ueber allem liegen.
                    className: `sticky left-0 top-0 z-30 bg-navy-900 ${scrolled ? 'shadow-[6px_0_10px_-6px_rgba(15,23,42,0.5)]' : ''}`,
                  })}
                  {sortTh('atBats', 'AB', { title: 'At-Bats — gewertete Schlagversuche' })}
                  {sortTh('hits', 'H', { title: 'Hits — Treffer' })}
                  {sortTh('battingAverage', 'AVG', { title: 'Batting Average — Hits ÷ At-Bats', className: GRUPPENANFANG_KOPF })}
                  {sortTh('onBasePct', 'OBP', { title: 'On-Base — wie oft er überhaupt auf Base kommt' })}
                  {sortTh('sluggingPct', 'SLG', { title: 'Slugging — wie hart er trifft (Bases je At-Bat)' })}
                  {sortTh('ops', 'OPS', { title: 'OBP + SLG — die eine Zahl, die Schlagleute rangiert' })}
                  {sortTh('runsBattedIn', 'RBI', { title: 'Runs Batted In — Läufe durch eigenen Schlag ermöglicht', className: GRUPPENANFANG_KOPF })}
                  {showPerGame && sortTh('rbiPerGame', 'RBI/G', { title: 'RBI pro Spiel (gewichteter Game-Zähler)' })}
                  {sortTh('runs', 'R', { title: 'Runs Scored — selbst Home gekreuzt' })}
                  {showPerGame && sortTh('runsPerGame', 'R/G', { title: 'Runs Scored pro Spiel (gewichteter Game-Zähler)' })}
                  {sortTh('homeRuns', 'HR', { title: 'Home Runs' })}
                  {sortTh('stolenBases', 'SB', { title: 'Stolen Bases — geklaute Bases' })}
                  {sortTh('walks', 'BB', { title: 'Walks — 4 Balls, gratis auf 1B', className: GRUPPENANFANG_KOPF })}
                  {sortTh('strikeouts', 'K', { title: 'Strikeouts' })}
                  {sortTh('caughtStealing', 'CS', { title: 'Caught Stealing — beim Steal-Versuch erwischt', className: GRUPPENANFANG_KOPF })}
                  {sortTh('pickoffs', 'PO', { title: 'Pickoff — ohne Steal-Versuch getagt (≠ CS)' })}
                  <th className={`${NUM_TH} text-white/60`} title="Single / Double / Triple / Home Run">1/2/3/HR</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s, idx) => {
                  const isUnq = applyQualifier && !s.qualified
                  const isTop = idx === 0 && s.atBats > 0 && !isUnq
                  const stickyBg = idx % 2 === 1 ? 'bg-cream-100' : 'bg-cream-50'
                  const stickyShadow = scrolled ? 'shadow-[6px_0_10px_-6px_rgba(15,23,42,0.3)]' : ''
                  return (
                    <tr
                      key={s.playerId}
                      className={`group border-b border-cream-200 last:border-0 transition-colors hover:bg-softball-red-50/40 ${
                        idx % 2 === 1 ? 'bg-cream-100/70' : 'bg-cream-50'
                      } ${isUnq ? 'opacity-50' : ''}`}
                    >
                      {/* Rang und Name in EINER Zelle: eine eigene #-Spalte kostete 48 px der
                          knappsten Stelle, um eine Zahl zu zeigen, die in der Zeilenfolge
                          ohnehin steht. */}
                      <td className={`px-3 py-2 sticky left-0 z-10 group-hover:bg-softball-red-50 ${stickyBg} ${stickyShadow}`}>
                        <span className="flex items-center gap-2">
                          <span className="font-display w-4 shrink-0 text-right tabular-nums text-[11px] font-extrabold text-gray-400">
                            {isUnq ? '–' : isTop ? <Trophy size={14} className="text-softball-red-600" /> : idx + 1}
                          </span>
                          <span className="font-display font-bold text-navy-900 whitespace-nowrap tracking-wide">
                            {s.playerName}
                          </span>
                          {isUnq && (
                            <span className="font-sans text-[9px] font-bold tracking-wide uppercase text-gray-500 bg-cream-200 rounded-full px-1.5 py-0.5">
                              &lt;5 ABs
                            </span>
                          )}
                        </span>
                      </td>
                      <td className={ZAEHLUNG}>{s.atBats}</td>
                      <td className={ZAEHLUNG}>{s.hits}</td>
                      {/* AVG stand hier in 16 px, waehrend OBP/SLG/OPS 14 px trugen — aus der
                          Zeit, als AVG allein vorn stand und die drei hinter einem Aufklapper
                          lagen. Jetzt stehen die vier nebeneinander, und eine groessere AVG
                          behauptet einen Vorrang, den sie fachlich nicht hat: OPS rangiert
                          Schlagleute besser. */}
                      <td className={`${QUOTE} font-extrabold ${GRUPPENANFANG}`}>{formatDec(Number(s.battingAverage))}</td>
                      <td className={QUOTE}>{formatDec(Number(s.onBasePct))}</td>
                      <td className={QUOTE}>{formatDec(Number(s.sluggingPct))}</td>
                      <td className={`${QUOTE} font-bold`}>{formatDec(Number(s.ops))}</td>
                      <td className={zahl(s.runsBattedIn, `font-bold ${GRUPPENANFANG}`)}>{s.runsBattedIn}</td>
                      {showPerGame && <td className={PRO_SPIEL}>{proSpiel(rbiPerGame(s))}</td>}
                      <td className={zahl(s.runs, 'font-bold')}>{s.runs}</td>
                      {showPerGame && <td className={PRO_SPIEL}>{proSpiel(runsPerGame(s))}</td>}
                      {/* HR ist das eine, was ein Zuschauer erzählt — bekommt den roten Akzent. */}
                      <td className={`px-2.5 py-2 text-right font-display tabular-nums font-bold whitespace-nowrap ${
                        s.homeRuns > 0 ? 'text-softball-red-600' : 'text-gray-300'
                      }`}>
                        {s.homeRuns > 0 ? (
                          <span className="inline-flex items-center gap-0.5">{s.homeRuns} <Zap size={11} /></span>
                        ) : '0'}
                      </td>
                      <td className={zahl(s.stolenBases)}>{s.stolenBases}</td>
                      <td className={zahl(s.walks, GRUPPENANFANG)}>{s.walks}</td>
                      <td className={zahl(s.strikeouts)}>{s.strikeouts}</td>
                      <td className={zahl(s.caughtStealing, GRUPPENANFANG)}>{s.caughtStealing}</td>
                      <td className={zahl(s.pickoffs ?? 0)}>{s.pickoffs ?? 0}</td>
                      <td className="px-2.5 py-2 text-right tabular-nums text-gray-600 text-xs whitespace-nowrap">
                        {s.singles}/{s.doubles}/{s.triples}/{s.homeRuns}
                      </td>
                    </tr>
                  )
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={16 + (showPerGame ? 2 : 0)} className="px-3 py-8 text-center text-sm text-gray-500">
                      Kein Spieler mit {MIN_AB_LABEL} in diesem Zeitraum.
                      {unqualified.length > 0 && (
                        <button onClick={() => setShowUnqualified(true)} className="ml-1 min-h-11 px-2 inline-flex items-center text-navy-700 underline hover:text-softball-red-600 cursor-pointer">
                          Alle anzeigen
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Die Kante sagt, dass rechts noch etwas steht. Ohne sie endet die Tabelle für das
              Auge am Bildschirmrand, und OPS findet nur, wer auf Verdacht wischt. */}
          {!amEnde && (
            <div
              aria-hidden="true"
              // Token statt `from-cream-50`: die Kante muss im Dunkeln mitgehen, sonst liegt
              // ein heller Schleier auf der dunklen Tabelle. Der Shim deutet nur `bg-`-Klassen
              // um, keine Verlaeufe.
              style={{ backgroundImage: 'linear-gradient(to left, var(--color-surface-raised), transparent)' }}
              className="pointer-events-none absolute inset-y-0 right-0 w-8"
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1">
        {/*
         * Das Glossar gehoert HIERHIN, direkt unter die Koepfe, die es erklaert. Es stand
         * eine Weile nur als graues „i" oben neben der Ueberschrift — am Handy ohne das Wort
         * daneben, eine Bildschirmhoehe entfernt. Wer bei `OBP` stockt, sucht nicht oben.
         * Die Abkuerzungen stehen im Text, damit der Knopf sagt, wovon er handelt.
         */}
        {onOpenGlossary && (
          <button
            onClick={onOpenGlossary}
            className="min-h-11 text-[11px] text-gray-500 hover:text-navy-900 underline underline-offset-2 cursor-pointer inline-flex items-center gap-1"
          >
            <Info size={12} />
            Was heißen AB, OBP, OPS?
          </button>
        )}
        {applyQualifier && unqualified.length > 0 && (
          <>
            <button
              onClick={() => setShowUnqualified(x => !x)}
              role="checkbox"
              aria-checked={showUnqualified}
              className="font-display min-h-11 text-[11px] font-bold tracking-widest uppercase text-gray-700 hover:text-navy-900 cursor-pointer inline-flex items-center gap-1.5"
            >
              <span
                className={`inline-flex items-center justify-center w-4 h-4 rounded-[4px] border transition-colors ${
                  showUnqualified ? 'bg-navy-900 border-navy-900 text-white' : 'border-gray-400 text-transparent'
                }`}
              >
                <Check size={11} strokeWidth={3.5} />
              </span>
              Auch &lt;5 ABs ({unqualified.length})
            </button>
            <p className="text-[11px] text-gray-500">
              Quoten brauchen {MIN_AB_LABEL} — sonst liest sich 3-für-3 als 1.000.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function formatDec(val: number): string {
  return val.toFixed(3).replace(/^0\./, '.')
}

function proSpiel(val: number | null): string {
  return val != null ? val.toFixed(2) : '—'
}
