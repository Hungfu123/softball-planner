import { useMemo, useState } from 'react'
import { Trophy, ChevronDown, ChevronUp, Info, Zap, Check } from 'lucide-react'
import type { PlayerBattingStatsResponse } from '@/types'

const MIN_AB_LABEL = 'min. 5 ABs'

interface Props {
  stats: PlayerBattingStatsResponse[]
  onOpenGlossary?: () => void
  /** Rate-Stat-Qualifier (≥5 ABs) anwenden — true für aggregierte Scopes (Saison/Jahr/Alle Zeit), false pro Spiel. */
  applyQualifier?: boolean
  /** playerId → gewichteter Game-Zähler (totalGames). Nenner für RBI/G. */
  gamesByPlayerId?: Map<number, number>
  /** RBI/G-Spalte zeigen — nur in aggregierten Scopes wo totalGames vorliegt. */
  showPerGame?: boolean
}

type SortKey =
  | 'playerName' | 'atBats' | 'hits' | 'battingAverage' | 'walks' | 'strikeouts'
  | 'homeRuns' | 'runs' | 'stolenBases' | 'caughtStealing' | 'pickoffs'
  | 'onBasePct' | 'sluggingPct' | 'ops' | 'runsBattedIn' | 'rbiPerGame'
type SortDir = 'asc' | 'desc'

export function BattingStatsTable({ stats, onOpenGlossary, applyQualifier = false, gamesByPlayerId, showPerGame = false }: Props) {
  const [showDetails, setShowDetails] = useState(false)
  const [showUnqualified, setShowUnqualified] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('battingAverage')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

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

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...stats].sort((a, b) => {
      let cmp: number
      if (sortKey === 'playerName') {
        cmp = a.playerName.localeCompare(b.playerName)
      } else if (sortKey === 'rbiPerGame') {
        cmp = (rbiPerGame(a) ?? -1) - (rbiPerGame(b) ?? -1)
      } else {
        cmp = Number(a[sortKey] ?? 0) - Number(b[sortKey] ?? 0)
      }
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

  // Balken-Skala nur aus qualifizierten — sonst sprengt ein 1.000-Mini-Sample die Skala
  const maxBA = useMemo(
    () => Math.max(...(qualified.length ? qualified : sorted).map(s => Number(s.battingAverage)), 0.001),
    [qualified, sorted],
  )

  const sortTh = (key: SortKey, label: string, opts?: { title?: string; align?: 'left' | 'right' }) => {
    const align = opts?.align ?? 'right'
    const alignCls = align === 'right' ? 'text-right' : 'text-left'
    const active = sortKey === key
    return (
      <th
        onClick={() => handleSort(key)}
        title={opts?.title}
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`font-display ${alignCls} px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest cursor-pointer select-none transition-colors ${active ? 'text-white' : 'text-white/70 hover:text-white'}`}
      >
        <span className={`inline-flex items-center gap-0.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
          {label}
          {active
            ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
            : <ChevronDown size={11} className="opacity-0" />}
        </span>
      </th>
    )
  }

  if (stats.length === 0) {
    return (
      <div className="bg-cream-50 border border-cream-300 rounded-xl p-12 text-center text-gray-500">
        <p className="mb-2">Noch keine Schlag-Daten in diesem Zeitraum.</p>
        <p className="text-xs">Scort ein paar At-Bats in einem Spiel um Stats zu sehen.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-2">
        <button
          onClick={() => setShowDetails(x => !x)}
          className="font-display px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase rounded-full border border-cream-300 text-gray-700 hover:bg-cream-100 hover:border-navy-400 cursor-pointer inline-flex items-center gap-1.5"
        >
          {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showDetails ? 'Weniger' : 'Mehr Details (OBP, SLG, OPS)'}
        </button>
        {onOpenGlossary && (
          <button
            onClick={onOpenGlossary}
            className="font-display px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase rounded-full border border-cream-300 text-navy-700 hover:bg-cream-100 hover:border-navy-400 cursor-pointer inline-flex items-center gap-1.5"
          >
            <Info size={12} />
            Abkürzungen
          </button>
        )}
        {applyQualifier && unqualified.length > 0 && (
          <button
            onClick={() => setShowUnqualified(x => !x)}
            role="checkbox"
            aria-checked={showUnqualified}
            className={`font-display px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase rounded-full border cursor-pointer inline-flex items-center gap-1.5 transition-colors ${
              showUnqualified
                ? 'bg-navy-900 border-navy-900 text-white'
                : 'border-cream-300 text-gray-700 hover:bg-cream-100 hover:border-navy-400'
            }`}
            title={`Spieler unter ${MIN_AB_LABEL} ${showUnqualified ? 'ausblenden' : 'einblenden'}`}
          >
            <span
              className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-[4px] border transition-colors ${
                showUnqualified ? 'bg-white border-white text-navy-900' : 'border-gray-400 text-transparent'
              }`}
            >
              <Check size={10} strokeWidth={3.5} />
            </span>
            Auch &lt;5 ABs ({unqualified.length})
          </button>
        )}
      </div>

      {/* Table — 60/30/10: White 60% / Navy 30% / Softball-Red 10% */}
      <div className="bg-cream-50 border border-cream-300 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-900 text-white">
                <th className="font-display text-left px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest">#</th>
                {sortTh('playerName', 'Spieler', { align: 'left' })}
                {sortTh('atBats', 'ABs')}
                {sortTh('hits', 'Treffer')}
                {sortTh('battingAverage', 'AVG', { title: 'Batting Average (AVG)' })}
                <th className="font-display text-right px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest">Quote</th>
                {sortTh('walks', 'Walks')}
                {sortTh('strikeouts', 'K')}
                {sortTh('homeRuns', 'HR')}
                {sortTh('runs', 'R', { title: 'Runs Scored — selbst Home gekreuzt' })}
                {sortTh('stolenBases', 'SB')}
                {sortTh('runsBattedIn', 'RBI', { title: 'Runs Batted In — Läufe durch eigenen Schlag ermöglicht' })}
                {showPerGame && sortTh('rbiPerGame', 'RBI/G', { title: 'RBI pro Spiel (gewichteter Game-Zähler)' })}
                {showDetails && (
                  <>
                    {sortTh('caughtStealing', 'CS', { title: 'Caught Stealing — beim Steal-Versuch erwischt' })}
                    {sortTh('pickoffs', 'PO', { title: 'Pickoff — ohne Steal-Versuch getagt (≠ CS)' })}
                    <th className="font-display text-right px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest">Hits 1/2/3/HR</th>
                    {sortTh('onBasePct', 'OBP', { title: 'Auf-Base-Quote (OBP)' })}
                    {sortTh('sluggingPct', 'SLG', { title: 'Schlagstärke (SLG)' })}
                    {sortTh('ops', 'OPS', { title: 'OBP + SLG = Gesamtstärke' })}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((s, idx) => {
                const baPct = Math.round(Number(s.battingAverage) * 100)
                const barWidth = Math.round((Number(s.battingAverage) / maxBA) * 100)
                const isUnq = applyQualifier && !s.qualified
                const isTop = idx === 0 && s.atBats > 0 && !isUnq
                const dimZero = (v: number) => v === 0 ? 'text-gray-300' : 'text-navy-900'
                return (
                  <tr
                    key={s.playerId}
                    className={`border-b border-cream-200 last:border-0 transition-colors hover:bg-softball-red-50/40 ${
                      idx % 2 === 1 ? 'bg-cream-100/70' : 'bg-cream-50'
                    } ${isUnq ? 'opacity-50' : ''}`}
                  >
                    {/* Rang — Top-1 in Softball-Red (10% Accent); unqualifizierte ohne Rang */}
                    <td className={`font-display px-3 py-2 text-left tabular-nums font-extrabold ${isTop ? 'text-softball-red-600' : 'text-gray-400'}`}>
                      {isUnq ? '–' : isTop ? <Trophy size={16} className="text-softball-red-600" /> : idx + 1}
                    </td>
                    {/* Spieler — Navy für Hierarchie */}
                    <td className="px-3 py-2 font-display font-bold text-navy-900 whitespace-nowrap tracking-wide">
                      {s.playerName}
                      {isUnq && (
                        <span className="ml-2 font-sans text-[9px] font-bold tracking-wide uppercase text-gray-500 bg-cream-200 rounded-full px-1.5 py-0.5 align-middle">
                          &lt;5 ABs
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-display tabular-nums text-gray-700">{s.atBats}</td>
                    <td className="px-3 py-2 text-right font-display tabular-nums text-gray-700">{s.hits}</td>
                    {/* AVG — Headline-Metrik prominent in Navy */}
                    <td className="px-3 py-2 text-right font-display tabular-nums font-extrabold text-navy-900 text-base">
                      {formatDec(Number(s.battingAverage))}
                    </td>
                    {/* Quote mit Balken — Softball-Red (10% Accent) */}
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 sm:w-16 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                          <div className="h-full bg-softball-red-600 rounded-full" style={{ width: `${barWidth}%` }} />
                        </div>
                        <span className="font-semibold text-navy-900 w-10 text-right tabular-nums text-xs">
                          {baPct}%
                        </span>
                      </div>
                    </td>
                    <td className={`px-3 py-2 text-right font-display tabular-nums ${dimZero(s.walks)}`}>{s.walks}</td>
                    <td className={`px-3 py-2 text-right font-display tabular-nums ${dimZero(s.strikeouts)}`}>{s.strikeouts}</td>
                    {/* HR — wenn > 0, Softball-Red Akzent */}
                    <td className={`px-3 py-2 text-right font-display tabular-nums font-bold ${
                      s.homeRuns > 0 ? 'text-softball-red-600' : 'text-gray-300'
                    }`}>
                      {s.homeRuns > 0 ? (
                        <span className="inline-flex items-center gap-0.5">{s.homeRuns} <Zap size={11} /></span>
                      ) : '0'}
                    </td>
                    <td className={`px-3 py-2 text-right font-display tabular-nums font-bold ${s.runs > 0 ? 'text-navy-900' : 'text-gray-300'}`}>{s.runs}</td>
                    <td className={`px-3 py-2 text-right font-display tabular-nums ${dimZero(s.stolenBases)}`}>{s.stolenBases}</td>
                    {/* RBI — Counting-Stat, immer sichtbar */}
                    <td className={`px-3 py-2 text-right font-display tabular-nums font-bold ${dimZero(s.runsBattedIn)}`}>{s.runsBattedIn}</td>
                    {showPerGame && (() => {
                      const pg = rbiPerGame(s)
                      return (
                        <td className="px-3 py-2 text-right font-display tabular-nums text-navy-900">
                          {pg != null ? pg.toFixed(2) : '—'}
                        </td>
                      )
                    })()}
                    {showDetails && (
                      <>
                        <td className={`px-3 py-2 text-right font-display tabular-nums ${dimZero(s.caughtStealing)}`}>{s.caughtStealing}</td>
                        <td className={`px-3 py-2 text-right font-display tabular-nums ${dimZero(s.pickoffs ?? 0)}`}>{s.pickoffs ?? 0}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-600 text-xs" title="Single / Double / Triple / HR">
                          {s.singles}/{s.doubles}/{s.triples}/{s.homeRuns}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-navy-900">{formatPct(Number(s.onBasePct))}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-navy-900">{formatDec(Number(s.sluggingPct))}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-navy-900 font-bold">{formatDec(Number(s.ops))}</td>
                      </>
                    )}
                  </tr>
                )
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={(showDetails ? 16 : 10) + 1 + (showPerGame ? 1 : 0)} className="px-3 py-8 text-center text-sm text-gray-500">
                    Kein Spieler mit {MIN_AB_LABEL} in diesem Zeitraum.
                    {unqualified.length > 0 && (
                      <button onClick={() => setShowUnqualified(true)} className="ml-1 text-navy-700 underline hover:text-softball-red-600 cursor-pointer">
                        Alle anzeigen
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {applyQualifier && unqualified.length > 0 && (
        <p className="text-[11px] text-gray-500 px-1">
          Quoten (AVG/OBP/SLG/OPS) brauchen {MIN_AB_LABEL}, sonst verzerren Mini-Stichproben das Bild
          (z.B. 3-für-3 = 1.000).
        </p>
      )}
    </div>
  )
}

function formatPct(val: number): string {
  return `${Math.round(val * 100)} %`
}

function formatDec(val: number): string {
  return val.toFixed(3).replace(/^0\./, '.')
}
