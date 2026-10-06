import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import * as api from '@/api/client'
import type { BattingSlotStats, LineupEntryResponse, PlayerBattingStatsResponse, TeamGameLogResponse } from '@/types'
import { useToastContext } from '@/components/layout/Layout'
import { AnalysisModeTabs } from './AnalysisModeTabs'
import { CrossBones } from '@/icons'
import { AnimatePresence, motion } from 'motion/react'

/** Emil-Kurve: starker ease-out für Expand — sofortige Reaktion, sanftes Auslaufen. */
const EASE_OUT = [0.23, 1, 0.32, 1] as const

/**
 * Spiel-Verlauf — Analyse-Dashboard der eigenen Offensiv-Historie:
 * Filter (Jahr · Liga) schneiden die Kennzahlen und den Hits-Trend zu; jeder
 * Trend-Balken ist ein Spiel (Klick öffnet seinen Box Score). Unter der Liste:
 * das Lineup-Platz-Profil (bewusst über ALLE Spiele — Slots kennen keinen Filter).
 * Jede Zeile trägt eine Run-Sparkline, aufklappbar mit Run-Verlauf-Diagramm,
 * Spieler-Zahlen, gestrandeten Runnern und dem Lineup des Tages.
 * Quelle ist ausschließlich das Old-Scoring; Spiele mit Endstand, aber ohne
 * At-Bat-Daten (z.B. Spielbogen) sind als "nicht ausgewertet" markiert.
 */
export function GameLogPage() {
  const toast = useToastContext()
  const [logs, setLogs] = useState<TeamGameLogResponse[] | null>(null)
  const [slots, setSlots] = useState<BattingSlotStats[] | null>(null)
  /** Zeitraum: 'all' | 'last5' | 'last10' | { year } — exklusiv, ein Chip-Satz. */
  const [range, setRange] = useState<'all' | 'last5' | 'last10' | { year: number }>('all')
  /** Saison = Liga + Jahr (so wie überall in der App) — die natürliche Analyseeinheit. */
  const [seasonFilter, setSeasonFilter] = useState<{ league: string; year: number } | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  /** Auswahl-Modus: Klick auf Trend-Balken nimmt Spiele in die Analyse auf. */
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  useEffect(() => {
    let cancelled = false
    Promise.all([api.getTeamGameLogs(), api.getBattingSlots()])
      .then(([l, s]) => { if (!cancelled) { setLogs(l); setSlots(s) } })
      .catch((e: unknown) => toast.show((e as Error).message, 'error'))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Initial-Load wie TeamDirectoryPage
  }, [])

  const years = useMemo(() => [...new Set(logs?.map(l => l.year).filter((y): y is number => y != null))].sort((a, b) => b - a) ?? [], [logs])

  const seasons = useMemo(() => {
    const seen = new Map<string, { league: string; year: number }>()
    for (const l of logs ?? []) {
      if (l.league != null && l.year != null) seen.set(`${l.league}|${l.year}`, { league: l.league, year: l.year })
    }
    return [...seen.values()].sort((a, b) => b.year - a.year || a.league.localeCompare(b.league))
  }, [logs])

  const seasonScoped = useMemo(() => (logs ?? []).filter(l =>
    seasonFilter == null || (l.league === seasonFilter.league && l.year === seasonFilter.year)
  ), [logs, seasonFilter])

  /** Zeitraum auf die Saison-Vorauswahl: logs sind neueste zuerst, "letzte N" = die neuesten N. */
  const rangeScoped = useMemo(() => {
    if (range === 'all') return seasonScoped
    if (range === 'last5') return seasonScoped.slice(0, 5)
    if (range === 'last10') return seasonScoped.slice(0, 10)
    return seasonScoped.filter(l => l.year === range.year)
  }, [seasonScoped, range])

  /** Im Auswahl-Modus zählt NUR die Auswahl — KPIs und Trend rechnen live mit. */
  const filtered = useMemo(() =>
    selectionMode && selectedIds.size > 0
      ? rangeScoped.filter(l => selectedIds.has(l.gameId))
      : rangeScoped
  , [rangeScoped, selectionMode, selectedIds])

  const totals = useMemo(() => summarize(filtered), [filtered])

  const focusGame = (gameId: number) => {
    setOpenId(prev => prev === gameId ? null : gameId)
    if (openId !== gameId) {
      requestAnimationFrame(() => {
        rowRefs.current.get(gameId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
  }

  const toggleSelected = (gameId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(gameId)) next.delete(gameId)
      else next.add(gameId)
      return next
    })
  }

  const resetSelection = () => {
    setSelectedIds(new Set())
    setSelectionMode(false)
  }

  return (
    <div className="space-y-5">
      <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-wide uppercase">Spiel-Verlauf</h1>
      <AnalysisModeTabs />

      {!logs ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 rounded-2xl bg-cream-100 animate-pulse" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <CrossBones size={48} className="mx-auto text-gray-300" />
          <p className="text-sm text-gray-400">Noch keine gespielten Spiele mit Auswertung.</p>
          <p className="text-xs text-gray-400">
            Sobald ein Spiel per Live-Scoring erfasst oder ein Endstand eingetragen ist, erscheint es hier.
          </p>
        </div>
      ) : (
        <>
          <FilterBar
            years={years} seasons={seasons}
            range={range} seasonFilter={seasonFilter}
            onRange={setRange} onSeason={setSeasonFilter}
            selectionMode={selectionMode}
            onToggleSelectionMode={() => {
              if (selectionMode) resetSelection()
              else setSelectionMode(true)
            }}
          />

          {(selectionMode || selectedIds.size > 0) && (
            <div className="flex items-center justify-between bg-navy-800 text-white rounded-2xl px-4 py-2.5">
              <p className="text-xs font-semibold">
                {selectedIds.size > 0
                  ? selectedIds.size === 2
                    ? '2 Spiele in der Analyse — Lineup-Vergleich unten, Zahlen oben nur damit'
                    : `${selectedIds.size} Spiele in der Analyse — Zahlen oben rechnen nur damit. Zwei wählen für den Lineup-Vergleich`
                  : 'Auswahl-Modus: Balken im Hits-Trend antippen, um Spiele in die Analyse zu nehmen'}
              </p>
              {selectedIds.size > 0 && (
                <button onClick={resetSelection} className="font-display text-[10px] font-bold tracking-widest uppercase rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 cursor-pointer active:scale-95 transition-transform">
                  Auswahl aufheben
                </button>
              )}
            </div>
          )}

          {selectionMode && selectedIds.size === 2 && (
            <LineupCompare
              gameA={rangeScoped.find(l => l.gameId === [...selectedIds][0])}
              gameB={rangeScoped.find(l => l.gameId === [...selectedIds][1])}
            />
          )}

          <SummaryStrip totals={totals} count={filtered.length} />

          {filtered.length > 0 && (
            <TrendChart
              logs={rangeScoped}
              highlightIds={selectionMode ? selectedIds : null}
              onBarClick={selectionMode ? toggleSelected : focusGame}
            />
          )}

          {filtered.some(l => l.hasAtBatData) && <SeasonBreakdown logs={filtered} />}

          {slots && slots.length > 0 && <SlotProfile slots={slots} />}

          <div className="space-y-2.5">
            {filtered.map((log, i) => {
              const prev = filtered[i - 1]
              // Spieltags-Trenner: ein Datum kann mehrere Spiele haben (Double Header)
              const newGameDay = prev == null || prev.date !== log.date
              return (
                <div key={log.gameId} ref={el => { if (el) rowRefs.current.set(log.gameId, el) }}>
                  {newGameDay && (
                    <p className="font-display text-[10px] font-bold tracking-widest uppercase text-gray-400 mt-3 mb-1 first:mt-0">
                      Spieltag · {log.date
                        ? new Date(log.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
                        : 'ohne Datum'}
                    </p>
                  )}
                  <GameRow log={log} open={openId === log.gameId} onToggle={() => focusGame(log.gameId)} />
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// --- Filter: Jahr · Liga ---

function FilterBar({ years, seasons, range, seasonFilter, onRange, onSeason, selectionMode, onToggleSelectionMode }: {
  years: number[]
  seasons: { league: string; year: number }[]
  range: 'all' | 'last5' | 'last10' | { year: number }
  seasonFilter: { league: string; year: number } | null
  onRange: (r: 'all' | 'last5' | 'last10' | { year: number }) => void
  onSeason: (s: { league: string; year: number } | null) => void
  selectionMode: boolean
  onToggleSelectionMode: () => void
}) {
  const chip = (active: boolean) =>
    `font-display text-[10px] font-bold tracking-widest uppercase rounded-full px-3 py-1.5 cursor-pointer transition-colors active:scale-95 ${
      active ? 'bg-navy-800 text-white' : 'border border-cream-300 text-gray-600 hover:bg-cream-100'
    }`
  const short = (name: string) => name.replace(' Series', '').replace(' Liga', '')
  const isYear = (y: number) => typeof range === 'object' && range.year === y

  return (
    <div className="space-y-2">
      {/* Zeitraum: exklusiv — "letzte N" schneidet die Form ab, Jahre die Saison */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Zeitraum wählen">
        <span className="font-display text-[9px] font-bold tracking-widest uppercase text-gray-400 w-14 shrink-0">Zeitraum</span>
        <button className={chip(range === 'all')} onClick={() => onRange('all')}>Alle</button>
        <button className={chip(range === 'last5')} onClick={() => onRange('last5')}>Letzte 5</button>
        <button className={chip(range === 'last10')} onClick={() => onRange('last10')}>Letzte 10</button>
        {years.map(y => (
          <button key={y} className={chip(isYear(y))} onClick={() => onRange(isYear(y) ? 'all' : { year: y })}>{y}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Nach Saison filtern">
        <span className="font-display text-[9px] font-bold tracking-widest uppercase text-gray-400 w-14 shrink-0">Saison</span>
        <button className={chip(seasonFilter == null)} onClick={() => onSeason(null)}>Alle</button>
        {seasons.map(se => {
          const active = seasonFilter != null && seasonFilter.league === se.league && seasonFilter.year === se.year
          return (
            <button
              key={`${se.league}|${se.year}`}
              className={chip(active)}
              onClick={() => onSeason(active ? null : se)}
            >{short(se.league)} {se.year}</button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          className={`font-display text-[10px] font-bold tracking-widest uppercase rounded-full px-3 py-1.5 cursor-pointer transition-colors active:scale-95 ${
            selectionMode ? 'bg-softball-red-600 text-white' : 'border border-navy-300 text-navy-700 hover:bg-navy-50'
          }`}
          onClick={onToggleSelectionMode}
          aria-pressed={selectionMode}
        >
          {selectionMode ? 'Auswahl aktiv' : 'Spiele auswählen'}
        </button>
      </div>
    </div>
  )
}

// --- Kennzahlen (reagieren auf den Filter) ---

function summarize(logs: TeamGameLogResponse[]) {
  const decided = logs.filter(l => l.scoreUs != null && l.scoreThem != null)
  const wins = decided.filter(l => (l.scoreUs ?? 0) > (l.scoreThem ?? 0)).length
  const losses = decided.filter(l => (l.scoreUs ?? 0) < (l.scoreThem ?? 0)).length
  const ties = decided.length - wins - losses
  const evaluated = logs.filter(l => l.hasAtBatData)
  const hits = evaluated.reduce((s, l) => s + l.hits, 0)
  const runs = logs.reduce((s, l) => s + (l.scoreUs ?? 0), 0)
  const onBase = evaluated.reduce((s, l) => s + l.onBase, 0)
  const plateAppearances = evaluated.reduce((s, l) => s + l.plateAppearances, 0)
  const lob = evaluated.reduce((s, l) => s + l.leftOnBase, 0)
  return {
    wins, losses, ties,
    hits, runs, onBase, plateAppearances, lob,
    avgHits: evaluated.length ? hits / evaluated.length : 0,
    avgLob: evaluated.length ? lob / evaluated.length : 0,
    onBasePct: plateAppearances ? onBase / plateAppearances : 0,
    /** Gesamt-Hits + wie viele Spiele dazu beigetragen haben (für die KPI-Unterzeile). */
    hitsTotal: hits,
    evaluatedCount: evaluated.length,
  }
}

function SummaryStrip({ totals, count }: { totals: ReturnType<typeof summarize>; count: number }) {
  const items = [
    { value: `${totals.wins}–${totals.losses}${totals.ties > 0 ? `–${totals.ties}` : ''}`, label: `Bilanz · ${count} Spiele`, tone: 'text-white' },
    { value: totals.avgHits.toFixed(1), label: 'Ø Hits / Spiel', tone: 'text-white',
      sub: `${totals.hitsTotal} Hits in ${totals.evaluatedCount} ausgewerteten Spielen` },
    { value: fmtPct(totals.onBasePct), label: 'auf Base gekommen', tone: 'text-white' },
    { value: totals.avgLob.toFixed(1), label: 'Ø hängengeblieben', tone: 'text-softball-red-300' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(i => (
        <div key={i.label} className="bg-navy-900 rounded-2xl px-4 py-3.5">
          <p className={`font-display text-2xl font-extrabold tabular-nums leading-tight ${i.tone}`}>{i.value}</p>
          <p className="font-display text-[10px] font-bold tracking-widest uppercase text-white/60 mt-0.5">{i.label}</p>
          {i.sub && <p className="text-[10px] text-white/40 mt-1 leading-snug">{i.sub}</p>}
        </div>
      ))}
    </div>
  )
}

// --- Hits-Trend: ein Balken pro Spiel, Klick öffnet das Spiel ---

function TrendChart({ logs, highlightIds, onBarClick }: {
  logs: TeamGameLogResponse[]
  highlightIds: Set<number> | null
  onBarClick: (gameId: number) => void
}) {
  // Balkenchronologie: ältestes links, neuestes rechts — Trend liest sich wie Text.
  // Im Auswahl-Modus zeigt der Chart ALLE Spiele des Zeitraums (geisterhaft) und hebt
  // die Auswahl hervor — man sieht, was man analysiert, im Kontext des Verlaufs.
  const chronological = [...logs].reverse()
  const maxHits = Math.max(1, ...chronological.map(l => l.hits))
  const evaluated = chronological.filter(l => l.hasAtBatData)
  const selecting = highlightIds != null

  return (
    <div className="bg-cream-50 border border-cream-200 rounded-2xl px-4 py-3">
      <div className="flex items-baseline justify-between mb-2">
        <p className="font-display text-sm font-extrabold uppercase tracking-wide text-navy-900">
          Hits pro Spiel <span className="text-gray-400 font-bold">— {selecting ? 'antippen nimmt in die Analyse auf' : 'Balken antippen öffnet das Spiel'}</span>
        </p>
        <p className="text-[10px] text-gray-400 hidden sm:block">rot = Niederlage · navy = Sieg</p>
      </div>
      {evaluated.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Keine ausgewerteten Spiele im Filter.</p>
      ) : (
        <div className="flex items-end gap-1 h-24 overflow-x-auto">
          {chronological.map(l => {
            const result = l.scoreUs != null && l.scoreThem != null
              ? l.scoreUs > l.scoreThem ? 'W' : l.scoreUs < l.scoreThem ? 'L' : 'T'
              : null
            const h = l.hasAtBatData ? 8 + (l.hits / maxHits) * 92 : 8
            const inSelection = selecting && highlightIds.has(l.gameId)
            const dimmed = selecting && !inSelection
            return (
              <button
                key={l.gameId}
                onClick={() => onBarClick(l.gameId)}
                title={`${l.date ?? ''} vs ${l.opponent ?? '?'} — ${l.scoreUs ?? '–'}:${l.scoreThem ?? '–'} · ${l.hits} Hits${l.hasAtBatData ? '' : ' · nicht ausgewertet'}`}
                aria-label={`${l.opponent ?? 'Spiel'}: ${l.hits} Hits`}
                aria-pressed={selecting ? inSelection : undefined}
                className="flex-1 min-w-[10px] h-full flex flex-col justify-end group cursor-pointer"
              >
                <span
                  className={`w-full rounded-t-sm transition-all duration-150 group-hover:scale-x-110 group-active:scale-x-125 ${
                    !l.hasAtBatData ? 'bg-cream-200'
                    : inSelection ? `${result === 'L' ? 'bg-softball-red-500' : 'bg-navy-900'} ring-2 ring-offset-1 ring-navy-900 ring-offset-cream-50`
                    : dimmed ? 'opacity-25 group-hover:opacity-50'
                    : result === 'L' ? 'bg-softball-red-400'
                    : result === 'T' ? 'bg-gray-300'
                    : 'bg-navy-700'
                  }`}
                  style={{ height: `${h}%` }}
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// --- Lineup-Platz-Profil: Balken = On-Base-Anteil pro Platz ---

function SlotProfile({ slots }: { slots: BattingSlotStats[] }) {
  return (
    <details className="group bg-cream-50 border border-cream-200 rounded-2xl overflow-hidden">
      <summary className="cursor-pointer px-4 py-3 flex items-center justify-between select-none">
        <span className="font-display text-sm font-extrabold uppercase tracking-wide text-navy-900">
          Lineup-Plätze <span className="text-gray-400 font-bold">— funktioniert unsere Reihenfolge? (über alle Spiele)</span>
        </span>
        <span className="text-xs text-gray-400 group-open:hidden">aufklappen</span>
      </summary>
      <div className="px-4 pb-4 space-y-1.5">
        <p className="text-xs text-gray-500 pb-1">
          Balken = On-Base-Anteil des Platzes (wie oft der Schlagmann dort eine Base erreichte);
          dunkler Kern = Trefferquote. Platz für Platz lesen: sinkt der Balken nach unten,
          produziert die Order zu wenig.
        </p>
        {slots.map(s => {
          const obp = Math.min(s.onBasePct, 1)
          const avgShare = s.onBasePct > 0 ? (s.battingAverage / s.onBasePct) * obp : 0
          return (
            <div key={s.slot} className="flex items-center gap-3" title={`Platz ${s.slot}: ${s.plateAppearances} PA · AVG ${fmtRate(s.battingAverage)} · OBP ${fmtRate(s.onBasePct)}`}>
              <span className="font-display text-xs font-extrabold text-gray-400 tabular-nums w-5 text-right shrink-0">{s.slot}.</span>
              <div className="flex-1 h-5 bg-cream-200/70 rounded-full overflow-hidden">
                <div className="h-full flex rounded-full overflow-hidden">
                  <div className="h-full bg-navy-800" style={{ width: `${avgShare * 100}%` }} />
                  <div className="h-full bg-navy-400" style={{ width: `${(obp - avgShare) * 100}%` }} />
                </div>
              </div>
              <span className="font-display text-xs font-bold tabular-nums text-navy-900 w-11 text-right shrink-0">{fmtRate(s.onBasePct)}</span>
              <span className="text-[11px] text-gray-500 tabular-nums w-24 text-right shrink-0 hidden sm:block">
                {s.hits} H · {s.walks} BB · {s.strikeouts} K
              </span>
            </div>
          )
        })}
      </div>
    </details>
  )
}

// --- Eine Spiel-Zeile mit Run-Sparkline ---

function GameRow({ log, open, onToggle }: { log: TeamGameLogResponse; open: boolean; onToggle: () => void }) {
  const result = log.scoreUs != null && log.scoreThem != null
    ? log.scoreUs > log.scoreThem ? 'W' : log.scoreUs < log.scoreThem ? 'L' : 'T'
    : null

  return (
    <div className={`rounded-2xl border transition-colors ${open ? 'border-navy-300 bg-navy-900' : 'border-cream-200 bg-white hover:bg-cream-50'}`}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full text-left px-4 py-3 flex items-center gap-4 cursor-pointer active:scale-[0.995] transition-transform"
      >
        {result ? (
          <span className={`font-display w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-lg text-[11px] font-extrabold ${
            result === 'W' ? 'bg-navy-800 text-white' : result === 'L' ? 'bg-softball-red-600 text-white' : 'bg-gray-300 text-navy-900'
          }`}>{result}</span>
        ) : (
          <span className="w-7 h-7 shrink-0 inline-flex items-center justify-center text-gray-300 text-xs">·</span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`font-display text-sm font-bold truncate ${open ? 'text-white' : 'text-navy-900'}`}>{log.opponent ?? 'ohne Gegner'}</span>
            <span className={`text-[10px] uppercase tracking-wide truncate hidden sm:inline ${open ? 'text-white/40' : 'text-gray-400'}`}>
              {log.date
                ? new Date(log.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' }) + ' · ' + (log.league ?? '').replace(' Series', '').replace(' Liga', '')
                : 'ohne Datum'}
            </span>
          </div>
          {log.hasAtBatData ? (
            <Sparkline innings={log.innings} open={open} />
          ) : (
            <span className={`text-[10px] italic ${open ? 'text-white/40' : 'text-gray-400'}`}>nicht ausgewertet — keine Schlag-Daten</span>
          )}
        </div>

        <div className="text-right shrink-0 flex items-center gap-4">
          {log.hasAtBatData && (
            <div className="hidden md:flex items-baseline gap-2.5 font-display text-[11px] font-bold tabular-nums">
              <Stat open={open} value={log.hits} label="H" />
              <Stat open={open} value={log.walks} label="BB" />
              <Stat open={open} value={log.leftOnBase} label="LOB" />
            </div>
          )}
          <span className={`font-display text-lg font-extrabold tabular-nums ${open ? 'text-white' : 'text-navy-900'}`}>
            {log.scoreUs ?? '–'}<span className={open ? 'text-white/40' : 'text-gray-300'}>:</span>{log.scoreThem ?? '–'}
          </span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className={open ? 'text-white/50' : 'text-gray-300'}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m4 6 4 4 4-4" /></svg>
          </motion.span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="boxscore"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: open ? 0.28 : 0.16, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <ScoreSheet log={log} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Inning-Runs als Mini-Balken — der Spielverlauf in der Zeile selbst. */
function Sparkline({ innings, open }: { innings: TeamGameLogResponse['innings']; open: boolean }) {
  const max = Math.max(1, ...innings.map(i => i.runs))
  return (
    <div className="flex items-end gap-1 h-5 mt-1" aria-hidden="true">
      {innings.map(i => (
        <span
          key={i.inning}
          title={`Inning ${i.inning}: ${i.runs} Runs`}
          className={`w-1.5 rounded-sm ${i.runs > 0 ? (open ? 'bg-softball-red-400' : 'bg-navy-700') : (open ? 'bg-white/15' : 'bg-cream-200')}`}
          style={{ height: i.runs > 0 ? `${25 + (i.runs / max) * 75}%` : '25%' }}
        />
      ))}
    </div>
  )
}

function Stat({ open, value, label }: { open: boolean; value: number; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span className={open ? 'text-white' : 'text-navy-900'}>{value}</span>
      <span className={open ? 'text-white/40' : 'text-gray-400'}>{label}</span>
    </span>
  )
}

// --- Das aufgeklappte Score-Sheet ---

function ScoreSheet({ log }: { log: TeamGameLogResponse }) {
  const toast = useToastContext()
  const [players, setPlayers] = useState<PlayerBattingStatsResponse[] | null>(null)
  const [lineup, setLineup] = useState<LineupEntryResponse[] | null>(null)
  // Inning- und Spieler-Fokus: Klick auf ein Inning (Run-Verlauf oder Tabellenzeile)
  // hebt es überall hervor — auch als Spalte in der Hit-Matrix darunter.
  const [focusInning, setFocusInning] = useState<number | null>(null)
  const [focusPlayer, setFocusPlayer] = useState<string | null>(null)

  useEffect(() => {
    if (!log.hasAtBatData) return
    let cancelled = false
    Promise.all([api.getGameBattingStats(log.gameId), api.getLineup(log.gameId)])
      .then(([p, l]) => { if (!cancelled) { setPlayers(p); setLineup(l) } })
      .catch((e: unknown) => { if (!cancelled) toast.show((e as Error).message, 'error') })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusster Load pro Spiel
  }, [log.gameId])

  /** Lineup-Info pro Spieler (Slot + Position, DH-Batter auf dem Slot seines Hosts) —
   *  verschmilzt in der Spieler-Tabelle: wen wir wo stehen hatten, direkt neben seinen Zahlen. */
  const lineupInfo = useMemo(() => {
    const map = new Map<number, { name: string; slot: number; position: string }>()
    if (lineup) for (const e of lineup) {
      if (e.player?.id != null) map.set(e.player.id, { name: e.player.name, slot: e.battingOrder, position: e.position ?? 'nur Schlag' })
      if (e.dhBatterPlayer?.id != null) map.set(e.dhBatterPlayer.id, { name: e.dhBatterPlayer.name, slot: e.battingOrder, position: 'DH' })
    }
    return map
  }, [lineup])

  const section = (i: number) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.04 * i, duration: 0.25, ease: EASE_OUT },
  })

  if (!log.hasAtBatData) {
    return (
      <div className="border-t border-navy-700 px-4 py-4">
        <p className="text-xs text-white/50 italic leading-relaxed">
          Für dieses Spiel liegen keine Schlag-Daten vor (z.B. über den Spielbogen erfasst —
          dessen Daten fließen bewusst nicht in diese Auswertung ein).
        </p>
      </div>
    )
  }

  return (
    <div className="border-t border-navy-700 px-4 py-4 space-y-5">
      {/* Run-Verlauf + Inning-Details */}
      <motion.div {...section(0)} className="grid lg:grid-cols-[1fr_1.3fr] gap-5">
        <div>
          <p className="font-display text-[10px] font-bold tracking-widest uppercase text-white/40 mb-1">Run-Verlauf</p>
          <p className="text-[9px] text-white/25 mb-2">Inning antippen hebt es überall hervor — Zahl = Spielstand danach</p>
          <RunProgress innings={log.innings} focusInning={focusInning} onToggleFocus={setFocusInning} />
          {log.stranded.length > 0 && (
            <div className="mt-3">
              <p className="font-display text-[10px] font-bold tracking-widest uppercase text-white/40 mb-1.5">
                Auf Base gekommen, aber nicht gescoret
              </p>
              <div className="flex flex-wrap gap-1.5">
                {log.stranded.map(s => (
                  <span key={s.playerName} className="inline-flex items-center gap-1 bg-softball-red-500/15 border border-softball-red-400/30 rounded-full px-2.5 py-1 text-[11px] text-softball-red-300 font-semibold">
                    {s.playerName}{s.times > 1 && <span className="font-extrabold text-softball-red-200">×{s.times}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="font-display text-[10px] font-bold tracking-widest uppercase text-white/40 mb-2">Inning für Inning</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="font-display text-[9px] font-bold tracking-widest uppercase text-white/30 text-left border-b border-white/10">
                  <th className="py-1 pr-2">Inn</th>
                  <th className="py-1 pr-2 text-right">R</th>
                  <th className="py-1 pr-2 text-right">H</th>
                  <th className="py-1 pr-2 text-right">OB</th>
                  <th className="py-1 pr-2 text-right">BB</th>
                  <th className="py-1 pr-2 text-right">Aus</th>
                  <th className="py-1 pr-2">Out durch</th>
                  <th className="py-1">Hängengeblieben</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {log.innings.map(i => {
                  const focused = focusInning === i.inning
                  return (
                    <tr key={i.inning} className={`text-white/80 transition-colors ${focused ? 'bg-white/[0.07]' : ''}`}>
                      <td className="py-1 pr-2">
                        <button
                          onClick={() => setFocusInning(focused ? null : i.inning)}
                          title={focused ? 'Fokus aufheben' : 'Inning fokussieren'}
                          className={`font-display font-bold tabular-nums cursor-pointer px-1.5 -ml-1.5 rounded transition-colors ${focused ? 'text-white bg-white/10' : 'text-white hover:text-white hover:bg-white/5'}`}
                        >
                          {i.inning}
                        </button>
                      </td>
                      <td className="py-1 pr-2 text-right tabular-nums font-semibold text-white">{i.runs}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">{i.hits}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">{i.onBase}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">{i.walks}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">{i.outs}</td>
                      <td className="py-1 pr-2 text-white/50 truncate max-w-24">{i.outMaker ?? '—'}</td>
                      <td className="py-1 text-white/40 truncate max-w-40">{i.stranded.length > 0 ? i.stranded.join(', ') : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Hit-Verlauf: wer trifft wann im Spiel, wer nimmt ab */}
      {log.innings.length > 0 && (
        <motion.div {...section(1)}>
          <p className="font-display text-[10px] font-bold tracking-widest uppercase text-white/40 mb-2">
            Hit-Verlauf — wer wann traf
          </p>
          <HitTimeline innings={log.innings} lineupInfo={lineupInfo} focusInning={focusInning} focusPlayer={focusPlayer} onFocusInning={setFocusInning} onFocusPlayer={setFocusPlayer} />
        </motion.div>
      )}

      {/* Lineup des Tages mit den Zahlen daneben — in Batting-Reihenfolge */}
      {players && players.length > 0 && (
        <motion.div {...section(2)}>
          <p className="font-display text-[10px] font-bold tracking-widest uppercase text-white/40 mb-2">
            Lineup des Tages — mit den Zahlen daneben
          </p>
          <PlayerTable players={players} lineupInfo={lineupInfo} />
        </motion.div>
      )}
    </div>
  )
}

// --- Saison-Auswertung: Hits pro Inning + gestrandete Runner über alle gefilterten Spiele ---

function SeasonBreakdown({ logs }: { logs: TeamGameLogResponse[] }) {
  const innings = useMemo(() => {
    const agg = new Map<number, { hits: number; runs: number }>()
    let games = 0
    for (const l of logs) {
      if (!l.hasAtBatData) continue
      games++
      for (const i of l.innings) {
        const e = agg.get(i.inning) ?? { hits: 0, runs: 0 }
        e.hits += i.hits
        e.runs += i.runs
        agg.set(i.inning, e)
      }
    }
    return { byInning: [...agg.entries()].sort((a, b) => a[0] - b[0]), games }
  }, [logs])

  const stranded = useMemo(() => {
    const agg = new Map<string, number>()
    for (const l of logs) {
      if (!l.hasAtBatData) continue
      for (const st of l.stranded) agg.set(st.playerName, (agg.get(st.playerName) ?? 0) + st.times)
    }
    return [...agg.entries()].sort((a, b) => b[1] - a[1])
  }, [logs])

  const maxInningHits = Math.max(1, ...innings.byInning.map(([, e]) => e.hits))
  const maxStranded = Math.max(1, ...stranded.map(([, n]) => n))

  // Wer das Inning beendet hat, während Runner auf Base standen ("Verursacher" der Strandings)
  const outMakers = useMemo(() => {
    const agg = new Map<string, number>()
    let situations = 0
    for (const l of logs) {
      if (!l.hasAtBatData) continue
      for (const i of l.innings) {
        if (i.stranded.length === 0) continue
        situations++
        if (i.outMaker != null) agg.set(i.outMaker, (agg.get(i.outMaker) ?? 0) + 1)
      }
    }
    return { byPlayer: [...agg.entries()].sort((a, b) => b[1] - a[1]), situations }
  }, [logs])
  const maxOutMakers = Math.max(1, ...outMakers.byPlayer.map(([, n]) => n))

  return (
    <div className="grid lg:grid-cols-3 gap-3">
      {/* Hits pro Inning: wo im Spielverlauf entsteht unsere Offensivkraft */}
      <div className="bg-cream-50 border border-cream-200 rounded-2xl px-4 py-3">
        <p className="font-display text-sm font-extrabold uppercase tracking-wide text-navy-900 mb-0.5">
          Hits pro Inning
        </p>
        <p className="text-[10px] text-gray-400 mb-2">aus {innings.games} ausgewerteten Spielen</p>
        <div className="flex items-end gap-2 h-28">
          {innings.byInning.map(([inning, e]) => (
            <div key={inning} className="flex-1 flex flex-col items-center gap-1" title={`Inning ${inning}: ${e.hits} Hits · ${e.runs} Runs`}>
              <span className="font-display text-[10px] font-bold tabular-nums text-navy-900">{e.hits}</span>
              <div
                className={`w-full rounded-t-sm min-h-[3px] ${e.runs >= maxInningHits * 0.8 ? 'bg-softball-red-400' : 'bg-navy-700'}`}
                style={{ height: `${8 + (e.hits / maxInningHits) * 92}%` }}
              />
              <span className="font-display text-[9px] font-bold tabular-nums text-gray-400">{inning}</span>
              <span className="font-display text-[9px] font-bold tabular-nums text-gray-300">R {e.runs}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gestrandete Runner: wer kommt oft auf Base, ohne zu scoren */}
      <div className="bg-cream-50 border border-cream-200 rounded-2xl px-4 py-3">
        <p className="font-display text-sm font-extrabold uppercase tracking-wide text-navy-900 mb-0.5">
          Auf Base hängen geblieben
        </p>
        <p className="text-[10px] text-gray-400 mb-2">wie oft ein Spieler beim Inning-Ende noch auf Base stand</p>
        <div className="space-y-1">
          {stranded.slice(0, 10).map(([name, times]) => (
            <div key={name} className="flex items-center gap-2.5" title={`${name}: ${times}× gestrandet`}>
              <span className="text-[11px] font-semibold text-navy-900 w-20 shrink-0 truncate">{name}</span>
              <div className="flex-1 h-4 bg-cream-200/70 rounded-full overflow-hidden">
                <div className="h-full bg-softball-red-500/80 rounded-full" style={{ width: `${(times / maxStranded) * 100}%` }} />
              </div>
              <span className="font-display text-[11px] font-extrabold tabular-nums text-softball-red-600 w-8 text-right shrink-0">×{times}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Wer das Inning beendet hat, während Läufer hingen — der "Verursacher" der Strandings */}
      <div className="bg-cream-50 border border-cream-200 rounded-2xl px-4 py-3">
        <p className="font-display text-sm font-extrabold uppercase tracking-wide text-navy-900 mb-0.5">
          Wer das Aus danach machte
        </p>
        <p className="text-[10px] text-gray-400 mb-2">Innings mit gestrandeten Runnern: {outMakers.situations}</p>
        {outMakers.byPlayer.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Keine derartigen Situationen im Zeitraum.</p>
        ) : (
          <div className="space-y-1">
            {outMakers.byPlayer.slice(0, 10).map(([name, times]) => (
              <div key={name} className="flex items-center gap-2.5" title={`${name}: ${times}× das letzte Aus bei Runnern auf Base`}>
                <span className="text-[11px] font-semibold text-navy-900 w-20 shrink-0 truncate">{name}</span>
                <div className="flex-1 h-4 bg-cream-200/70 rounded-full overflow-hidden">
                  <div className="h-full bg-navy-700 rounded-full" style={{ width: `${(times / maxOutMakers) * 100}%` }} />
                </div>
                <span className="font-display text-[11px] font-extrabold tabular-nums text-navy-800 w-8 text-right shrink-0">×{times}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[9px] text-gray-400 mt-2 leading-snug">
          Wessen At-Bat das Inning mit 3 Aus beendete, während Teamkameraden auf Base standen —
          reine Zählung, kein Schuldspruch: der letzte Schlagmann ist oft reine Rotationslogik.
        </p>
      </div>
    </div>
  )
}

// --- Hit-Verlauf: Spieler × Inning — wer macht die Hits im Lauf des Spiels ---

function HitTimeline({ innings, lineupInfo, focusInning, focusPlayer, onFocusInning, onFocusPlayer }: {
  innings: TeamGameLogResponse['innings']
  lineupInfo: Map<number, { name: string; slot: number; position: string }>
  focusInning: number | null
  focusPlayer: string | null
  onFocusInning: (inning: number | null) => void
  onFocusPlayer: (name: string | null) => void
}) {
  const maxInning = innings.length > 0 ? innings[innings.length - 1].inning : 0
  // Spieler in Lineup-Reihenfolge; alle, die irgendwann trafen (auch Subs hinten)
  const playersSeen = new Map<string, number>() // name -> slot
  for (const i of innings) {
    for (const name of Object.keys(i.hitsByPlayer)) {
      if (!playersSeen.has(name)) {
        const slot = [...lineupInfo.values()].find(v => v.name === name)?.slot ?? 99
        playersSeen.set(name, slot)
      }
    }
  }
  const names = [...playersSeen.entries()].sort((a, b) => a[1] - b[1]).map(([n]) => n)
  const hitsIn = (name: string, inning: number) => innings.find(i => i.inning === inning)?.hitsByPlayer[name] ?? 0

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-[11px]">
        <colgroup>
          <col className="w-28" />
        </colgroup>
        <thead>
          <tr className="font-display text-[9px] font-bold tracking-widest uppercase text-white/30 text-left border-b border-white/10">
            <th className="py-1 pr-2">Spieler</th>
            {Array.from({ length: maxInning }, (_, idx) => idx + 1).map(inn => {
              const focused = focusInning === inn
              return (
                <th key={inn} className="py-1 text-center">
                  <button
                    onClick={() => onFocusInning(focused ? null : inn)}
                    title={focused ? 'Fokus aufheben' : `Inning ${inn} fokussieren`}
                    className={`px-2 py-0.5 rounded-md tabular-nums cursor-pointer transition-colors ${focused ? 'text-white bg-white/10' : 'text-white/30 hover:text-white/70 hover:bg-white/5'}`}
                  >
                    {inn}
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {names.map(name => {
            const playerFocused = focusPlayer === name
            return (
              <tr
                key={name}
                className={`transition-colors ${playerFocused ? 'bg-white/[0.07]' : ''}`}
              >
                <td className="py-1 pr-2 whitespace-nowrap truncate">
                  <button
                    onClick={() => onFocusPlayer(playerFocused ? null : name)}
                    title={playerFocused ? 'Fokus aufheben' : `${name}: Zeile hervorheben`}
                    className={`font-semibold cursor-pointer truncate max-w-full text-left px-1.5 -ml-1.5 rounded transition-colors ${playerFocused ? 'text-white bg-white/10' : 'text-white/80 hover:text-white hover:bg-white/5'}`}
                  >
                    {name}
                  </button>
                </td>
                {Array.from({ length: maxInning }, (_, idx) => idx + 1).map(inn => {
                  const h = hitsIn(name, inn)
                  const cellFocused = focusInning === inn
                  return (
                    <td
                      key={inn}
                      className={`py-1 text-center transition-colors ${cellFocused ? 'bg-white/[0.07]' : ''}`}
                      title={h > 0 ? `${name} · Inning ${inn}: ${h} ${h === 1 ? 'Hit' : 'Hits'}` : undefined}
                    >
                      {h > 0
                        ? <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-display font-bold tabular-nums ${
                            playerFocused || cellFocused
                              ? 'bg-amber-400/30 text-amber-200 ring-1 ring-amber-300/40'
                              : 'bg-amber-400/15 text-amber-300'
                          }`}>{h}</span>
                        : <span className={cellFocused || playerFocused ? 'text-white/25' : 'text-white/15'}>·</span>}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Kumulativer Run-Verlauf als Treppenlinie — Spielstand über die Innings.
 *  Steile Passagen = Big Inning, flache = Trockenheit. Inning antippen fokussiert. */
function RunProgress({ innings, focusInning, onToggleFocus }: {
  innings: TeamGameLogResponse['innings']
  focusInning: number | null
  onToggleFocus: (inning: number | null) => void
}) {
  // kumulierter Spielstand nach jedem Inning
  const cum: number[] = []
  let c = 0
  for (const i of innings) { c += i.runs; cum.push(c) }
  const max = Math.max(1, c)
  // Y-Position (in % vom Boden): 8% Grundlinie bis 88% Maximalstand
  const y = (v: number) => 8 + (v / max) * 80

  return (
    <div className="flex h-28">
      {innings.map((i, idx) => {
        const prevY = idx === 0 ? y(0) : y(cum[idx - 1])
        const curY = y(cum[idx])
        const focused = focusInning === i.inning
        return (
          <button
            key={i.inning}
            onClick={() => onToggleFocus(focused ? null : i.inning)}
            title={`Inning ${i.inning}: +${i.runs} Runs · ${i.hits} Hits · Spielstand danach ${cum[idx]} · ${i.outs} Aus${focused ? ' — Fokus aufheben' : ''}`}
            aria-label={`Inning ${i.inning}: ${i.runs} Runs, Spielstand ${cum[idx]}`}
            aria-pressed={focused}
            className={`relative flex-1 h-full cursor-pointer rounded-lg transition-colors ${focused ? 'bg-white/[0.07]' : 'hover:bg-white/5'}`}
          >
            {/* Verbindungsstück vom vorigen Stand zu diesem — Treppenstufe */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {idx === 0 && prevY !== curY && (
                <line x1="0" y1={100 - prevY} x2="50" y2={100 - prevY} stroke="var(--color-cream-300)" strokeWidth="1.5" strokeOpacity="0.5" vectorEffect="non-scaling-stroke" />
              )}
              <polyline
                points={idx === 0
                  ? `0,${100 - prevY} 50,${100 - curY}`
                  : `0,${100 - prevY} 50,${100 - prevY} 50,${100 - curY}`}
                fill="none"
                stroke="var(--color-cream-300)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {/* Spielstand nach diesem Inning */}
            <span
              className="absolute left-1/2 -translate-x-1/2 font-display text-[10px] font-bold tabular-nums text-white/70 pointer-events-none"
              style={{ bottom: `calc(${curY}% + 6px)` }}
            >
              {cum[idx]}
            </span>
            {/* Punkt auf der Linie */}
            <span
              className={`absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none transition-all ${
                i.runs > 0
                  ? (focused ? 'bg-cream-50 ring-2 ring-white/50 w-2.5 h-2.5' : 'bg-cream-50 w-2 h-2')
                  : (focused ? 'bg-white/40 ring-2 ring-white/30 w-2 h-2' : 'bg-white/25 w-1.5 h-1.5')
              }`}
              style={{ bottom: `calc(${curY}% - 4px)` }}
            />
            <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 font-display text-[9px] font-bold tabular-nums pointer-events-none ${focused ? 'text-white' : 'text-white/30'}`}>
              {i.inning}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// --- Lineup-Vergleich: 2 gewählte Spiele, Platz für Platz, mit Ausbeute ---

function LineupCompare({ gameA, gameB }: { gameA?: TeamGameLogResponse; gameB?: TeamGameLogResponse }) {
  const toast = useToastContext()
  const [data, setData] = useState<{
    a: { lineup: LineupEntryResponse[]; players: PlayerBattingStatsResponse[] }
    b: { lineup: LineupEntryResponse[]; players: PlayerBattingStatsResponse[] }
  } | null>(null)

  useEffect(() => {
    if (!gameA || !gameB) return
    let cancelled = false
    Promise.all([
      api.getLineup(gameA.gameId), api.getGameBattingStats(gameA.gameId),
      api.getLineup(gameB.gameId), api.getGameBattingStats(gameB.gameId),
    ])
      .then(([la, pa, lb, pb]) => {
        if (!cancelled) setData({ a: { lineup: la, players: pa }, b: { lineup: lb, players: pb } })
      })
      .catch((e: unknown) => { if (!cancelled) toast.show((e as Error).message, 'error') })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusster Load pro Paar
  }, [gameA?.gameId, gameB?.gameId])

  if (!gameA || !gameB) return null

  const bySlot = (lineup: LineupEntryResponse[]) => {
    const map = new Map<number, { name: string; position: string; playerId: number }>()
    for (const e of lineup) {
      if (e.player?.id != null) map.set(e.battingOrder, { name: e.player.name, position: e.position ?? 'nur Schlag', playerId: e.player.id })
      if (e.dhBatterPlayer?.id != null) map.set(e.battingOrder, { name: e.dhBatterPlayer.name, position: 'DH', playerId: e.dhBatterPlayer.id })
    }
    return map
  }

  const dateLabel = (log: TeamGameLogResponse) =>
    log.date ? new Date(log.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : '?'

  if (!data) {
    return (
      <div className="bg-white border border-cream-200 rounded-2xl px-4 py-4">
        <p className="text-xs text-gray-400 animate-pulse">Lineup-Vergleich wird geladen…</p>
      </div>
    )
  }

  const slotsA = bySlot(data.a.lineup)
  const slotsB = bySlot(data.b.lineup)
  const hitsA = new Map(data.a.players.map(p => [p.playerId, p.hits]))
  const hitsB = new Map(data.b.players.map(p => [p.playerId, p.hits]))
  const maxSlot = Math.max(0, ...slotsA.keys(), ...slotsB.keys())

  const cell = (side: 'a' | 'b', slot: number, other: { name: string; playerId: number } | undefined) => {
    const src = side === 'a' ? slotsA : slotsB
    const hits = side === 'a' ? hitsA : hitsB
    const entry = src.get(slot)
    if (!entry) return <span className="text-white/20">—</span>
    const changed = other != null && other.playerId !== entry.playerId
    return (
      <span className={`flex items-baseline gap-1.5 ${changed ? 'bg-softball-red-500/10 border border-softball-red-400/30 rounded-lg px-1.5 -mx-1.5' : ''}`}>
        <span className="font-semibold text-white truncate">{entry.name}</span>
        <span className="text-white/30 shrink-0">{entry.position}</span>
        {(hits.get(entry.playerId) ?? 0) > 0 && <span className="font-display font-bold tabular-nums text-softball-red-300 shrink-0">{hits.get(entry.playerId)} H</span>}
      </span>
    )
  }

  const yieldRow = (log: TeamGameLogResponse) => log.hasAtBatData ? (
    <span className="font-display text-[11px] font-bold tabular-nums text-white/80">
      {log.scoreUs ?? '–'}:{log.scoreThem ?? '–'}
      <span className="text-white/40 font-normal"> · {log.hits} H · {log.onBase} OB · {log.walks} BB · {log.leftOnBase} LOB</span>
    </span>
  ) : (
    <span className="text-[11px] text-white/40 italic">
      {log.scoreUs ?? '–'}:{log.scoreThem ?? '–'} — nicht ausgewertet (keine Schlag-Daten)
    </span>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className="bg-navy-900 rounded-2xl px-4 py-4"
    >
      <p className="font-display text-sm font-extrabold uppercase tracking-wide text-white mb-3">
        Lineup-Vergleich <span className="text-white/40 font-bold">— rote Zellen = am Platz anders besetzt</span>
      </p>

      {/* Kopf: wer spielt gegen wen */}
      <div className="grid grid-cols-[2rem_1fr_1fr] gap-x-2 mb-2">
        <span />
        <span className="font-display text-[10px] font-bold uppercase tracking-widest text-softball-red-300 truncate">
          {gameA.opponent} ({dateLabel(gameA)})
        </span>
        <span className="font-display text-[10px] font-bold uppercase tracking-widest text-softball-red-300 truncate">
          {gameB.opponent} ({dateLabel(gameB)})
        </span>
      </div>

      {/* Platz für Platz */}
      <div className="grid grid-cols-[2rem_1fr_1fr] gap-x-2 gap-y-1 text-[11px]">
        {Array.from({ length: maxSlot }, (_, i) => i + 1).map(slot => (
          <Fragment key={slot}>
            <span className="font-display font-extrabold tabular-nums text-white/30 text-right">{slot}.</span>
            <span className="min-w-0">{cell('a', slot, slotsB.get(slot))}</span>
            <span className="min-w-0">{cell('b', slot, slotsA.get(slot))}</span>
          </Fragment>
        ))}
      </div>

      {/* was wir jeweils bekommen haben */}
      <div className="grid grid-cols-[2rem_1fr_1fr] gap-x-2 mt-3 pt-2 border-t border-white/10">
        <span />
        <span className="min-w-0">{yieldRow(gameA)}</span>
        <span className="min-w-0">{yieldRow(gameB)}</span>
      </div>
    </motion.div>
  )
}

function PlayerTable({ players, lineupInfo }: {
  players: PlayerBattingStatsResponse[]
  lineupInfo: Map<number, { name: string; slot: number; position: string }>
}) {
  const topHits = Math.max(0, ...players.map(p => p.hits))

  // Union: jede Lineup-Spieler (auch ohne Schlagversuch) + jeder gescorten Spieler (Subs ohne Slot)
  const byId = new Map(players.map(p => [p.playerId, p]))
  for (const [pid, info] of lineupInfo) {
    if (!byId.has(pid)) {
      byId.set(pid, {
        playerId: pid, playerName: info.name,
        plateAppearances: 0, atBats: 0, hits: 0, singles: 0, doubles: 0, triples: 0, homeRuns: 0,
        runs: 0, walks: 0, hitByPitch: 0, strikeouts: 0, outs: 0, reachedOnError: 0,
        stolenBases: 0, caughtStealing: 0, pickoffs: 0, runsBattedIn: 0, totalBases: 0,
        battingAverage: 0, onBasePct: 0, sluggingPct: 0, ops: 0, qualified: false,
      } as PlayerBattingStatsResponse)
    }
  }
  const rows = [...byId.values()].sort((a, b) => {
    const sa = lineupInfo.get(a.playerId)?.slot ?? 99
    const sb = lineupInfo.get(b.playerId)?.slot ?? 99
    return sa - sb || a.playerName.localeCompare(b.playerName)
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="font-display text-[9px] font-bold tracking-widest uppercase text-white/30 text-left border-b border-white/10">
            <th className="py-1 pr-1">#</th>
            <th className="py-1 pr-2">Spieler</th>
            <th className="py-1 pr-2 text-right">PA</th>
            <th className="py-1 pr-2 text-right">Hits</th>
            <th className="py-1 pr-2 text-right hidden sm:table-cell">2B·3B·HR</th>
            <th className="py-1 pr-2 text-right">BB</th>
            <th className="py-1 pr-2 text-right">K</th>
            <th className="py-1 pr-2 text-right">Aus</th>
            <th className="py-1 pr-2 text-right">R</th>
            <th className="py-1 pr-2 text-right">RBI</th>
            <th className="py-1 text-right">AVG</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map(p => {
            const info = lineupInfo.get(p.playerId)
            return (
              <tr key={p.playerId} className={`transition-colors ${p.hits > 0 && p.hits === topHits ? 'bg-softball-red-500/10' : ''}`}>
                <td className="py-1 pr-1 font-display font-extrabold tabular-nums text-softball-red-300/60">{info ? `${info.slot}.` : '·'}</td>
                <td className="py-1 pr-2 font-semibold text-white whitespace-nowrap">
                  {p.playerName}
                  {info && <span className="text-white/30 font-normal ml-1.5">{info.position}</span>}
                </td>
                <td className="py-1 pr-2 text-right tabular-nums text-white/70">{p.plateAppearances}</td>
                <td className="py-1 pr-2 text-right tabular-nums font-bold text-white">{p.hits}</td>
                <td className="py-1 pr-2 text-right tabular-nums text-white/40 hidden sm:table-cell">{p.doubles}·{p.triples}·{p.homeRuns}</td>
                <td className="py-1 pr-2 text-right tabular-nums text-white/70">{p.walks}</td>
                <td className="py-1 pr-2 text-right tabular-nums text-white/70">{p.strikeouts}</td>
                <td className="py-1 pr-2 text-right tabular-nums text-white/70">{p.outs}</td>
                <td className="py-1 pr-2 text-right tabular-nums text-white/70">{p.runs}</td>
                <td className="py-1 pr-2 text-right tabular-nums text-white/70">{p.runsBattedIn}</td>
                <td className="py-1 text-right tabular-nums text-white/70">{fmtRate(p.battingAverage)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// --- kleine Helfer ---

function fmtRate(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(3).replace(/^0\./, '.')
}

function fmtPct(value: number): string {
  return `${Math.round(value * 100)} %`
}
