import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileJson } from 'lucide-react'
import * as api from '@/api/client'
import type { AtBatResult, BattingSlotStats, InningAtBat, InningLog, LineupEntryResponse, PlayerBattingStatsResponse, TeamGameLogResponse } from '@/types'
import { AT_BAT_RESULT_LABELS } from '@/types'
import { useToastContext } from '@/components/layout/Layout'
import { AnalysisModeTabs } from '@/components/analysis/AnalysisModeTabs'
import { CrossBones } from '@/icons'
import { AnimatePresence, motion } from 'motion/react'
import { generateGameLogPdf, formatSignedDiff, type SlotComparison } from '@/utils/gameLogPdf'
import { exportGameLogJson } from '@/utils/gameLogExport'
import { CHEVRON_DOWN } from '@/components/shared'

/** Emil-Kurve: starker ease-out für Expand — sofortige Reaktion, sanftes Auslaufen. */
const EASE_OUT = [0.23, 1, 0.32, 1] as const

/** Zeitraum-Filter: 'all' | 'lastN' (1/2/3/5/10) — exklusiv; das Jahr ist ein eigener Filter. */
type RangeFilter = 'all' | 'last1' | 'last2' | 'last3' | 'last5' | 'last10'

/** Label je Zeitraum-Filter — für den PDF-Kopf und den Dateinamen. */
const RANGE_LABELS: Record<RangeFilter, string> = {
  all: 'Alle Spiele',
  last1: 'Letztes Spiel',
  last2: 'Letzte 2 Spiele',
  last3: 'Letzte 3 Spiele',
  last5: 'Letzte 5 Spiele',
  last10: 'Letzte 10 Spiele',
}

/** Chevron-Daten-URI für native Selects und Dropdown-Buttons (appearance-none). */

/** Ab 4 ausgewerteten Spielen: die Auswahl in eine frühere und eine neuere Hälfte teilen
 *  (logs sind neueste zuerst) — beantwortet „Hat sich die Form je Platz verbessert?".
 *  Genutzt von UI und Exporten, damit beide dieselbe Zahl zeigen. */
async function fetchSlotComparison(evaluated: TeamGameLogResponse[]): Promise<SlotComparison | null> {
  if (evaluated.length < 4) return null
  const half = Math.ceil(evaluated.length / 2)
  const newer = evaluated.slice(0, half)
  const older = evaluated.slice(half)
  const [before, after] = await Promise.all([
    api.getBattingSlots(older.map(l => l.gameId)),
    api.getBattingSlots(newer.map(l => l.gameId)),
  ])
  return {
    beforeLabel: `ältere ${older.length} Spiele`,
    afterLabel: `neuere ${newer.length} Spiele`,
    before, after,
  }
}

/**
 * Spiel-Verlauf — Analyse-Dashboard der eigenen Offensiv-Historie:
 * Filter (Jahr · Liga · Zeitraum · Auswahl) schneiden die Kennzahlen und den
 * Hits-Trend zu; jeder Trend-Balken ist ein Spiel (Klick öffnet seinen Box Score).
 * Das Lineup-Platz-Profil folgt derselben Auswahl (bei „Alle Spiele" = alle).
 * Jede Zeile trägt eine Run-Sparkline, aufklappbar mit Run-Verlauf-Diagramm,
 * Spieler-Zahlen, gestrandeten Runnern und dem Lineup des Tages.
 * Quelle ist ausschließlich das Old-Scoring; Spiele mit Endstand, aber ohne
 * At-Bat-Daten (z.B. Spielbogen) sind als "nicht ausgewertet" markiert.
 */
export function GameLogPage() {
  const toast = useToastContext()
  const [logs, setLogs] = useState<TeamGameLogResponse[] | null>(null)
  const [slots, setSlots] = useState<BattingSlotStats[] | null>(null)
  /** Vorher/Nachher je Platz — dieselbe Hälften-Teilung wie im PDF/JSON-Export. */
  const [comparison, setComparison] = useState<SlotComparison | null>(null)
  /** Zeitraum: 'all' | 'lastN' — exklusiv. Default „Letztes Spiel": schneller Check, wie das letzte Game lief. */
  const [range, setRange] = useState<RangeFilter>('last1')
  /** Jahr: eigener Filter (null = alle Jahre) — ergänzt den Zeitraum, statt in ihm versteckt. */
  const [yearFilter, setYearFilter] = useState<number | null>(null)
  /** Saison = Liga + Jahr — Mehrfachauswahl möglich (leer = alle). */
  const [seasonFilter, setSeasonFilter] = useState<{ league: string; year: number }[]>([])
  const [openId, setOpenId] = useState<number | null>(null)
  /** Auswahl-Modus: Klick auf Trend-Balken nimmt Spiele in die Analyse auf. */
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  useEffect(() => {
    let cancelled = false
    api.getTeamGameLogs()
      .then(l => { if (!cancelled) setLogs(l) })
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
    seasonFilter.length === 0 || seasonFilter.some(se => se.league === l.league && se.year === l.year)
  ), [logs, seasonFilter])

  /** Zeitraum auf die Jahr-/Saison-Vorauswahl: logs sind neueste zuerst, "letzte N" = die neuesten N. */
  const rangeScoped = useMemo(() => {
    const scoped = yearFilter == null ? seasonScoped : seasonScoped.filter(l => l.year === yearFilter)
    if (range === 'all') return scoped
    const n = Number(range.replace('last', ''))
    return Number.isNaN(n) ? scoped : scoped.slice(0, n)
  }, [seasonScoped, yearFilter, range])

  /** Im Auswahl-Modus zählt NUR die Auswahl — KPIs und Trend rechnen live mit. */
  const filtered = useMemo(() =>
    selectionMode && selectedIds.size > 0
      ? rangeScoped.filter(l => selectedIds.has(l.gameId))
      : rangeScoped
  , [rangeScoped, selectionMode, selectedIds])

  const totals = useMemo(() => summarize(filtered), [filtered])

  /** Das Platz-Profil folgt der gefilterten Auswahl — bei „Alle Spiele" ohne gameIds-Param
   *  (= Verhalten wie früher). So lassen sich Form-Fragen beantworten: „Hat sich Platz 4
   *  in den letzten 5 Spielen verbessert?" Key als String: stabile Effekt-Abhängigkeit. */
  const slotGameIds = useMemo(() => filtered.map(l => l.gameId), [filtered])
  const slotIdsKey = slotGameIds.join(',')
  /** Reale Stichprobe: nur Spiele mit At-Bat-Daten produzieren Platz-Zahlen. */
  const slotGameCount = useMemo(() => filtered.filter(l => l.hasAtBatData).length, [filtered])

  useEffect(() => {
    if (!logs) return
    if (slotGameIds.length === 0) { setSlots([]); return }
    let cancelled = false
    const allSelected = slotGameIds.length === logs.length
    api.getBattingSlots(allSelected ? undefined : slotGameIds)
      .then(s => { if (!cancelled) setSlots(s) })
      .catch((e: unknown) => { if (!cancelled) toast.show((e as Error).message, 'error') })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slotIdsKey repräsentiert slotGameIds stabil
  }, [logs, slotIdsKey])

  /** UI-Formvergleich: gleiche Berechnung wie der Export, damit Badge und Tabelle dieselbe Zahl zeigen. */
  useEffect(() => {
    if (!logs) return
    const evaluated = filtered.filter(l => l.hasAtBatData)
    if (evaluated.length < 4) { setComparison(null); return }
    let cancelled = false
    fetchSlotComparison(evaluated)
      .then(c => { if (!cancelled) setComparison(c) })
      .catch(() => { if (!cancelled) setComparison(null) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slotIdsKey repräsentiert filtered stabil (Reihenfolge + Auswahl)
  }, [logs, slotIdsKey])

  /** Filter-Beschreibung für den PDF-Kopf — spiegelt die Filterleiste. */
  const exportContextLabel = useMemo(() => {
    const parts = [RANGE_LABELS[range], yearFilter != null ? `Jahr ${yearFilter}` : 'Alle Jahre']
    parts.push(seasonFilter.length > 0 ? seasonFilter.map(s => `${s.league} ${s.year}`).join(', ') : 'Alle Saisons')
    if (selectionMode && selectedIds.size > 0) {
      parts.push(`Auswahl: ${selectedIds.size} ${selectedIds.size === 1 ? 'Spiel' : 'Spiele'}`)
    }
    return parts.join(' · ')
  }, [range, yearFilter, seasonFilter, selectionMode, selectedIds])

  const [exporting, setExporting] = useState<'pdf' | 'json' | null>(null)

  /** Sammelt, was alle Exporte brauchen: Lineups der gefilterten Spiele + Vorher/Nachher-Vergleich. */
  const collectExportData = async () => {
    const entries = await Promise.all(
      filtered.map(l => api.getLineup(l.gameId).catch(() => [] as LineupEntryResponse[])),
    )
    const lineups = new Map<number, LineupEntryResponse[]>()
    filtered.forEach((l, i) => lineups.set(l.gameId, entries[i]))

    /** Ab 4 ausgewerteten Spielen: die gefilterte Auswahl in eine frühere und eine neuere Hälfte teilen —
     *  beantwortet „Hat sich die Form in den Platz-Statistiken verbessert?" */
    const comparison = await fetchSlotComparison(filtered.filter(l => l.hasAtBatData))
    return { lineups, comparison }
  }

  const scopeLabel = `${filtered.length} ${filtered.length === 1 ? 'Spiel' : 'Spiele'}`

  const handleExportPdf = async () => {
    if (exporting || filtered.length === 0) return
    setExporting('pdf')
    try {
      const { lineups, comparison } = await collectExportData()
      generateGameLogPdf({
        logs: filtered,
        lineups,
        slots,
        comparison,
        contextLabel: exportContextLabel,
        scopeLabel,
      })
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setExporting(null)
    }
  }

  const handleExportJson = async () => {
    if (exporting || filtered.length === 0) return
    setExporting('json')
    try {
      const { lineups, comparison } = await collectExportData()
      exportGameLogJson({
        logs: filtered,
        lineups,
        slots,
        comparison,
        contextLabel: exportContextLabel,
        scopeLabel,
      })
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setExporting(null)
    }
  }


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
    <div className="space-y-5 pb-10">
      <div className="flex items-center gap-2 sm:gap-3">
        <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-wide uppercase">Spiel-Verlauf</h1>
        {logs && logs.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={handleExportPdf}
              disabled={exporting != null || filtered.length === 0}
              className="font-display group relative inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-[11px] font-bold tracking-widest uppercase text-white bg-navy-900 hover:bg-softball-red-600 rounded-full cursor-pointer transition-colors shadow-sm disabled:opacity-50 disabled:cursor-wait"
              title="Gefilterte Daten als PDF exportieren"
            >
              <Download size={12} className="transition-transform group-hover:translate-y-0.5" />
              {exporting === 'pdf' ? 'Export …' : 'PDF'}
            </button>
            <button
              onClick={handleExportJson}
              disabled={exporting != null || filtered.length === 0}
              className="font-display group relative inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-[11px] font-bold tracking-widest uppercase text-white bg-navy-900 hover:bg-softball-red-600 rounded-full cursor-pointer transition-colors shadow-sm disabled:opacity-50 disabled:cursor-wait"
              title="Gefilterte Daten als JSON exportieren"
            >
              <FileJson size={12} className="transition-transform group-hover:translate-y-0.5" />
              {exporting === 'json' ? 'Export …' : 'JSON'}
            </button>
          </div>
        )}
      </div>
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
            range={range} yearFilter={yearFilter} seasonFilter={seasonFilter}
            onRange={setRange} onYear={setYearFilter} onSeason={setSeasonFilter}
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
                    : `${selectedIds.size} ${selectedIds.size === 1 ? 'Spiel' : 'Spiele'} in der Analyse — Zahlen oben rechnen nur damit. Zwei wählen für den Lineup-Vergleich`
                  : 'Auswahl-Modus: Balken oder Spielzeile antippen, um Spiele in die Analyse zu nehmen'}
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

          {/* Ab 3 Spielen zeigt der Chart einen echten Vergleich; bei 1–2 Spielen trägt
              ein Balkendiagramm keine Information, die die Zahl nicht direkt zeigt —
              kompakte Zeilen statt leerer Chart-Fläche (Emil-Review Runde 16). */}
          {filtered.length > 0 && (
            rangeScoped.length >= 3 ? (
              <TrendChart
                logs={rangeScoped}
                highlightIds={selectionMode ? selectedIds : null}
                onBarClick={selectionMode ? toggleSelected : focusGame}
              />
            ) : (
              <CompactGameStrip
                logs={rangeScoped}
                highlightIds={selectionMode ? selectedIds : null}
                onBarClick={selectionMode ? toggleSelected : focusGame}
              />
            )
          )}

          {filtered.some(l => l.hasAtBatData) && <SeasonBreakdown logs={filtered} />}

          {slots && slots.length > 0 && (
            <SlotProfile
              slots={slots}
              gameCount={slotGameCount}
              allGames={logs.length > 0 && slotGameIds.length === logs.length}
              comparison={comparison}
            />
          )}

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
                  <GameRow
                    log={log}
                    open={openId === log.gameId}
                    onToggle={() => focusGame(log.gameId)}
                    selecting={selectionMode}
                    selected={selectedIds.has(log.gameId)}
                    onSelect={() => toggleSelected(log.gameId)}
                  />
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

function FilterBar({ years, seasons, range, yearFilter, seasonFilter, onRange, onYear, onSeason, selectionMode, onToggleSelectionMode }: {
  years: number[]
  seasons: { league: string; year: number }[]
  range: RangeFilter
  yearFilter: number | null
  seasonFilter: { league: string; year: number }[]
  onRange: (r: RangeFilter) => void
  onYear: (y: number | null) => void
  onSeason: (s: { league: string; year: number }[]) => void
  selectionMode: boolean
  onToggleSelectionMode: () => void
}) {
  const parseRange = (v: string): RangeFilter => {
    switch (v) {
      case 'all': case 'last1': case 'last2': case 'last3': case 'last5': case 'last10': return v
      default: return 'all'
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {/* Zeitraum + Jahr + Saison: kompakte Dropdowns statt langer Pill-Reihen */}
      <div className="flex items-center gap-1.5">
        <span className="font-display text-[9px] font-bold tracking-widest uppercase text-gray-400 w-14 shrink-0">Zeitraum</span>
        <select
          aria-label="Zeitraum wählen"
          value={range}
          onChange={e => onRange(parseRange(e.target.value))}
          className="appearance-none bg-no-repeat font-display text-[10px] font-bold tracking-widest uppercase rounded-full pl-3 pr-8 py-2 cursor-pointer border border-cream-300 bg-white text-gray-700 hover:bg-cream-100 transition-colors"
          style={{ backgroundImage: CHEVRON_DOWN, backgroundPosition: 'right 0.7rem center', backgroundSize: '0.65rem' }}
        >
          <option value="all">Alle Spiele</option>
          <option value="last1">Letztes Spiel</option>
          <option value="last2">Letzte 2 Spiele</option>
          <option value="last3">Letzte 3 Spiele</option>
          <option value="last5">Letzte 5 Spiele</option>
          <option value="last10">Letzte 10 Spiele</option>
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-display text-[9px] font-bold tracking-widest uppercase text-gray-400 shrink-0">Jahr</span>
        <select
          aria-label="Jahr wählen"
          value={yearFilter ?? 'all'}
          onChange={e => onYear(e.target.value === 'all' ? null : Number(e.target.value))}
          className="appearance-none bg-no-repeat font-display text-[10px] font-bold tracking-widest uppercase rounded-full pl-3 pr-8 py-2 cursor-pointer border border-cream-300 bg-white text-gray-700 hover:bg-cream-100 transition-colors"
          style={{ backgroundImage: CHEVRON_DOWN, backgroundPosition: 'right 0.7rem center', backgroundSize: '0.65rem' }}
        >
          <option value="all">Alle Jahre</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <SeasonSelect seasons={seasons} value={seasonFilter} onChange={onSeason} />
      <button
        className={`font-display text-[10px] font-bold tracking-widest uppercase rounded-full px-3 py-2 cursor-pointer transition-colors active:scale-95 ${
          selectionMode ? 'bg-softball-red-600 text-white' : 'border border-navy-300 text-navy-700 hover:bg-navy-50'
        }`}
        onClick={onToggleSelectionMode}
        aria-pressed={selectionMode}
      >
        {selectionMode ? 'Auswahl aktiv' : 'Spiele auswählen'}
      </button>
    </div>
  )
}

/** Saison-Filter als kompaktes Multi-Select-Dropdown mit Checkboxen (statt Pill-Reihe). */
function SeasonSelect({ seasons, value, onChange }: {
  seasons: { league: string; year: number }[]
  value: { league: string; year: number }[]
  onChange: (s: { league: string; year: number }[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const short = (name: string) => name.replace(' Series', '').replace(' Liga', '')
  const isActive = (se: { league: string; year: number }) =>
    value.some(f => f.league === se.league && f.year === se.year)
  const toggle = (se: { league: string; year: number }) =>
    onChange(isActive(se) ? value.filter(f => f.league !== se.league || f.year !== se.year) : [...value, se])

  const label = value.length === 0
    ? 'Alle'
    : value.length <= 2
      ? value.map(s => `${short(s.league)} ${s.year}`).join(' · ')
      : `${value.length} Saisons`

  return (
    <div ref={ref} className="relative flex items-center gap-1.5">
      <span className="font-display text-[9px] font-bold tracking-widest uppercase text-gray-400 w-14 shrink-0">Saison</span>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="appearance-none bg-no-repeat font-display text-[10px] font-bold tracking-widest uppercase rounded-full pl-3 pr-8 py-2 cursor-pointer border border-cream-300 bg-white text-gray-700 hover:bg-cream-100 transition-colors"
        style={{ backgroundImage: CHEVRON_DOWN, backgroundPosition: 'right 0.7rem center', backgroundSize: '0.65rem' }}
      >
        <span className="inline-block max-w-48 truncate align-middle">{label}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute left-14 top-full z-20 mt-1 w-64 max-h-64 overflow-y-auto rounded-xl border border-cream-300 bg-white p-1.5 shadow-xl">
            <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-cream-100 cursor-pointer text-xs font-semibold text-navy-900">
              <input
                type="checkbox"
                className="accent-navy-800"
                checked={value.length === 0}
                onChange={() => onChange([])}
              />
              Alle
            </label>
            {seasons.map(se => (
              <label key={`${se.league}|${se.year}`} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-cream-100 cursor-pointer text-xs text-gray-700">
                <input
                  type="checkbox"
                  className="accent-navy-800"
                  checked={isActive(se)}
                  onChange={() => toggle(se)}
                />
                {short(se.league)} {se.year}
              </label>
            ))}
          </div>
        </>
      )}
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
    { value: `${totals.wins}–${totals.losses}${totals.ties > 0 ? `–${totals.ties}` : ''}`, label: `Bilanz · ${count} ${count === 1 ? 'Spiel' : 'Spiele'}`, tone: 'text-white' },
    { value: totals.avgHits.toFixed(1), label: 'Ø Hits / Spiel', tone: 'text-white',
      sub: `${totals.hitsTotal} Hits in ${totals.evaluatedCount} ${totals.evaluatedCount === 1 ? 'ausgewertetem Spiel' : 'ausgewerteten Spielen'}` },
    { value: fmtPct(totals.onBasePct), label: 'auf Base gekommen', tone: 'text-white' },
    { value: totals.avgLob.toFixed(1), label: 'Ø hängengeblieben', tone: 'text-softball-red-300' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(i => (
        <div key={i.label} className="bg-navy-900 rounded-2xl px-4 py-3.5">
          <p className={`font-display text-2xl font-extrabold tabular-nums leading-tight ${i.tone}`}>{i.value}</p>
          <p className="font-display text-[10px] font-bold tracking-widest uppercase text-white/60 mt-0.5">{i.label}</p>
          {i.sub && <p className="text-[10px] text-white/60 mt-1 leading-snug">{i.sub}</p>}
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
  // Hover-/Fokus-Readout: welches Spiel gerade über dem Balken steht (Datum, Gegner, Score).
  const [hoverId, setHoverId] = useState<number | null>(null)
  const hovered = hoverId != null ? chronological.find(l => l.gameId === hoverId) ?? null : null
  // X-Achse: Datum unter jedem n-ten Balken — Step nach Spielzahl, damit die Labels
  // sich nicht überlappen. Erster und letzter Balken immer beschriftet, leere Spalten
  // behalten die Geometrie (jedes Feld sitzt genau unter seinem Balken).
  const lastIndex = chronological.length - 1
  const labelStep = Math.max(1, Math.ceil(chronological.length / 9))
  const showLabel = (i: number) => i === lastIndex || (i % labelStep === 0 && lastIndex - i >= labelStep)
  const years = new Set(chronological.map(l => l.date ? new Date(l.date).getFullYear() : null))
  const multiYear = years.size > 1
  const fmtDate = (date: string) => new Date(date).toLocaleDateString('de-DE',
    multiYear ? { day: '2-digit', month: '2-digit', year: '2-digit' } : { day: '2-digit', month: '2-digit' })

  return (
    <div className="bg-cream-50 border border-cream-200 rounded-2xl px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 mb-2">
        <p className="font-display text-sm font-extrabold uppercase tracking-wide text-navy-900">
          Hits pro Spiel <span className="text-gray-400 font-bold">— {selecting ? 'antippen nimmt in die Analyse auf' : 'Balken antippen öffnet das Spiel'}</span>
        </p>
        <p className="text-[10px] text-right">
          {hovered ? (
            <span className="font-semibold text-navy-800">
              {hovered.date ? fmtDate(hovered.date) : 'ohne Datum'} vs {hovered.opponent ?? '?'}
              {' — '}{hovered.scoreUs ?? '–'}:{hovered.scoreThem ?? '–'}
              {' · '}{hovered.hits} H{hovered.hasAtBatData ? '' : ' · nicht ausgewertet'}
            </span>
          ) : (
            <span className="text-gray-400">rot = Niederlage · navy = Sieg</span>
          )}
        </p>
      </div>
      {evaluated.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Keine ausgewerteten Spiele im Filter.</p>
      ) : (
        <>
          {/* Wert-Achse: Hits dauerhaft über dem Balken — Hover gibt es auf Mobile nicht.
              Gleiche Slot-Geometrie wie Balken- und Datums-Zeile (flex-1 + max-w-12),
              damit jedes Label exakt über seinem Balken sitzt. */}
          <div className="flex justify-center gap-px sm:gap-1 mb-0.5" aria-hidden="true">
            {chronological.map((l, i) => {
              const result = l.scoreUs != null && l.scoreThem != null
                ? l.scoreUs > l.scoreThem ? 'W' : l.scoreUs < l.scoreThem ? 'L' : 'T'
                : null
              const dimmed = selecting && !highlightIds.has(l.gameId)
              const valueColour = result === 'L' ? 'text-softball-red-500'
                : result === 'T' ? 'text-gray-400' : 'text-navy-700'
              // Bei vielen Spielen auf schmalen Screens nur jedes n-te Label — unsichtbar
              // statt weggelassen, damit jedes Label exakt über seinem Balken bleibt.
              const sparseOnMobile = chronological.length > 14 && i !== lastIndex && i % (labelStep * 2) !== 0
              return (
                <span
                  key={l.gameId}
                  className={`flex-1 min-w-0 max-w-12 text-center text-[9px] leading-tight tabular-nums font-semibold ${
                    l.hasAtBatData ? valueColour : ''
                  } ${dimmed ? 'opacity-25' : ''} ${sparseOnMobile ? 'invisible sm:visible' : ''}`}
                >
                  {l.hasAtBatData ? l.hits : ''}
                </span>
              )
            })}
          </div>
          <div className="flex items-end justify-center gap-px sm:gap-1 h-24">
            {chronological.map(l => {
              const result = l.scoreUs != null && l.scoreThem != null
                ? l.scoreUs > l.scoreThem ? 'W' : l.scoreUs < l.scoreThem ? 'L' : 'T'
                : null
              const h = l.hasAtBatData ? 8 + (l.hits / maxHits) * 92 : 8
              const inSelection = selecting && highlightIds.has(l.gameId)
              const dimmed = selecting && !inSelection
              // Farbe und Auswahl-Zustand getrennt: genau EINE bg-Klasse, der Ring kommt
              // immer oben drauf — sonst überstimmt die Farb-Kette die Auswahl (z.B. Cream).
              const barBg = !l.hasAtBatData
                ? inSelection ? 'bg-cream-300' : 'bg-cream-200'
                : result === 'L'
                  ? inSelection ? 'bg-softball-red-500' : 'bg-softball-red-400'
                  : inSelection ? 'bg-navy-900'
                  : result === 'T' ? 'bg-gray-300'
                  : 'bg-navy-700'
              const barState = inSelection
                ? 'ring-2 ring-offset-1 ring-navy-900 ring-offset-cream-50'
                : dimmed ? 'opacity-25 group-hover:opacity-50' : ''
              return (
                <button
                  key={l.gameId}
                  onClick={() => { setHoverId(l.gameId); onBarClick(l.gameId) }}
                  onMouseEnter={() => setHoverId(l.gameId)}
                  onMouseLeave={() => setHoverId(h => (h === l.gameId ? null : h))}
                  onFocus={() => setHoverId(l.gameId)}
                  onBlur={() => setHoverId(h => (h === l.gameId ? null : h))}
                  title={`${l.date ?? ''} vs ${l.opponent ?? '?'} — ${l.scoreUs ?? '–'}:${l.scoreThem ?? '–'} · ${l.hits} Hits${l.hasAtBatData ? '' : ' · nicht ausgewertet'}`}
                  aria-label={`${l.opponent ?? 'Spiel'}: ${l.hits} Hits`}
                  aria-pressed={selecting ? inSelection : undefined}
                  className="flex-1 min-w-0 max-w-12 h-full flex flex-col justify-end group cursor-pointer"
                >
                  <span
                    className={`chart-bar w-full rounded-t-sm ${barBg} ${barState}`}
                    style={{ height: `${h}%` }}
                  />
                </button>
              )
            })}
          </div>
          {/* X-Achse: Datum pro Balken-Slot, nur alle n-ten beschriftet (siehe showLabel) */}
          <div className="flex justify-center gap-px sm:gap-1 mt-1" aria-hidden="true">
            {chronological.map((l, i) => {
              const labelled = showLabel(i) && l.date
              // Auf schmalen Screens nur jedes zweite Label — unsichtbar statt weggelassen,
              // damit jedes Label exakt unter seinem Balken bleibt.
              const sparseOnMobile = i !== lastIndex && i % (labelStep * 2) !== 0
              return (
                <span
                  key={l.gameId}
                  className={`flex-1 min-w-0 max-w-12 text-center text-[10px] leading-tight tabular-nums whitespace-nowrap overflow-hidden ${
                    hoverId === l.gameId ? 'text-navy-900 font-bold' : 'text-gray-400'
                  } ${labelled && sparseOnMobile ? 'invisible sm:visible' : ''}`}
                >
                  {labelled ? fmtDate(l.date as string) : ''}
                </span>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// --- 1–2 Spiele: kompakte Zeilen statt Balkendiagramm ---

function CompactGameStrip({ logs, highlightIds, onBarClick }: {
  logs: TeamGameLogResponse[]
  highlightIds: Set<number> | null
  onBarClick: (gameId: number) => void
}) {
  // Ein Balkendiagramm mit <3 Balken zeigt keine Information, die die Zahl nicht
  // direkt zeigt — also die Zahlen selbst, kompakt (Emil-Review Runde 16).
  const chronological = [...logs].reverse()
  const selecting = highlightIds != null
  const fmtDate = (date: string) => new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  return (
    <div className="bg-cream-50 border border-cream-200 rounded-2xl px-4 py-3">
      <p className="font-display text-sm font-extrabold uppercase tracking-wide text-navy-900 mb-2">
        Hits pro Spiel <span className="text-gray-400 font-bold">— {selecting ? 'Zeile antippen nimmt in die Analyse auf' : 'Zeile antippen öffnet das Spiel'}</span>
      </p>
      <div className="space-y-1">
        {chronological.map(l => {
          const result = l.scoreUs != null && l.scoreThem != null
            ? l.scoreUs > l.scoreThem ? 'W' : l.scoreUs < l.scoreThem ? 'L' : 'T'
            : null
          const inSelection = selecting && highlightIds.has(l.gameId)
          return (
            <button
              key={l.gameId}
              onClick={() => onBarClick(l.gameId)}
              aria-pressed={selecting ? inSelection : undefined}
              aria-label={`${l.opponent ?? 'Spiel'}: ${l.hits} Hits`}
              className={`w-full flex items-center gap-3 text-left rounded-xl px-3 py-2 cursor-pointer transition-colors ${
                inSelection ? 'bg-cream-100 ring-2 ring-inset ring-navy-900' : 'hover:bg-cream-100'
              }`}
            >
              <span className="text-[11px] text-gray-400 tabular-nums shrink-0 w-10">{l.date ? fmtDate(l.date) : '–'}</span>
              <span className="font-semibold text-sm text-navy-900 truncate">vs {l.opponent ?? '?'}</span>
              <span className="text-xs text-gray-500 tabular-nums shrink-0">{l.scoreUs ?? '–'}:{l.scoreThem ?? '–'}</span>
              <span className={`ml-auto font-display text-lg font-extrabold tabular-nums shrink-0 ${
                !l.hasAtBatData ? 'text-gray-300' : result === 'L' ? 'text-softball-red-500' : 'text-navy-900'
              }`}>
                {l.hasAtBatData ? l.hits : '–'}
                {l.hasAtBatData && <span className="text-[10px] font-bold text-gray-400 ml-1">H</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// --- Lineup-Platz-Profil: Balken = On-Base-Anteil pro Platz ---

function SlotProfile({ slots, gameCount, allGames, comparison }: {
  slots: BattingSlotStats[]
  gameCount: number
  allGames: boolean
  comparison?: SlotComparison | null
}) {
  const scopeLabel = allGames
    ? 'über alle Spiele'
    : gameCount === 1
      ? 'über 1 Spiel'
      : `über ${gameCount} Spiele`
  const beforeBySlot = useMemo(() => new Map((comparison?.before ?? []).map(s => [s.slot, s])), [comparison])
  const afterBySlot = useMemo(() => new Map((comparison?.after ?? []).map(s => [s.slot, s])), [comparison])
  return (
    <details className="group bg-cream-50 border border-cream-200 rounded-2xl overflow-hidden">
      <summary className="cursor-pointer px-4 py-3 flex items-center justify-between select-none">
        <span className="font-display text-sm font-extrabold uppercase tracking-wide text-navy-900">
          Lineup-Plätze <span className="text-gray-400 font-bold">— funktioniert unsere Reihenfolge? ({scopeLabel})</span>
        </span>
        <span className="text-xs text-gray-400 group-open:hidden">aufklappen</span>
      </summary>
      <div className="px-4 pb-4 space-y-1.5">
        <ul className="text-xs text-gray-500 pb-2 list-disc pl-4 space-y-0.5">
          <li>
            <span className="font-semibold text-gray-600">Balken:</span>{' '}
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-navy-800 align-middle" /> dunkel = Hits,{' '}
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-navy-400 align-middle" /> mittel = Walks,{' '}
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-cream-300 align-middle" /> hell = nicht auf Base
          </li>
          <li><span className="font-semibold text-gray-600">Gut oder schlecht?</span> Je länger der farbige Teil (dunkel + mittel), desto öfter kommt dieser Platz auf Base — die Zahl rechts (.718) ist genau dieser Anteil.</li>
          <li><span className="font-semibold text-gray-600">Spieler:</span> „68× · 74 %" = 68 Schläge, davon 74 % auf Base</li>
          <li>Plätze 1–3 sollten die längsten Balken haben — ein langer Balken weit hinten heißt: starker Schläger zu weit hinten</li>
          {comparison && (
            <li>
              <span className="font-semibold text-gray-600">Formvergleich:</span>{' '}
              die Zahl neben OBP zeigt die Veränderung {comparison.beforeLabel} → {comparison.afterLabel} —{' '}
              <span className="font-semibold text-amber-700">positiv</span> = Verbesserung,{' '}
              <span className="font-semibold text-softball-red-600">negativ</span> = Abwärtstrend
            </li>
          )}
          {!allGames && gameCount < 3 && (
            <li className="text-amber-700">Kleine Stichprobe — die Balken schwanken noch stark. Zum Vergleich: Zeitraum auf „Alle Spiele“ stellen.</li>
          )}
        </ul>
        {slots.map(s => {
          const obp = Math.min(s.onBasePct, 1)
          const avgShare = s.onBasePct > 0 ? (s.battingAverage / s.onBasePct) * obp : 0
          return (
            <div key={s.slot}>
              <div className="flex items-center gap-3" title={`Platz ${s.slot}: ${s.plateAppearances}× am Schlag · AVG ${fmtRate(s.battingAverage)} · OBP ${fmtRate(s.onBasePct)}`}>
                <span className="font-display text-xs font-extrabold text-gray-400 tabular-nums w-5 text-right shrink-0">{s.slot}.</span>
                <div className="flex-1 h-5 bg-cream-200/70 rounded-full overflow-hidden">
                  <div className="h-full flex rounded-full overflow-hidden">
                    <div className="h-full bg-navy-800" style={{ width: `${avgShare * 100}%` }} />
                    <div className="h-full bg-navy-400" style={{ width: `${(obp - avgShare) * 100}%` }} />
                  </div>
                </div>
                <span className="font-display text-xs font-bold tabular-nums text-navy-900 w-11 text-right shrink-0">{fmtRate(s.onBasePct)}</span>
                {comparison && beforeBySlot.get(s.slot) && afterBySlot.get(s.slot) && (() => {
                  const before = beforeBySlot.get(s.slot)!
                  const after = afterBySlot.get(s.slot)!
                  const delta = after.onBasePct - before.onBasePct
                  const color = Math.abs(delta) < 0.0005 ? 'text-gray-400' : delta > 0 ? 'text-amber-700' : 'text-softball-red-600'
                  return (
                    <span
                      className={`font-display text-[11px] font-bold tabular-nums w-12 text-right shrink-0 ${color}`}
                      title={`OBP ${comparison.beforeLabel}: ${fmtRate(before.onBasePct)} → ${comparison.afterLabel}: ${fmtRate(after.onBasePct)}`}
                    >
                      {formatSignedDiff(before.onBasePct, after.onBasePct)}
                    </span>
                  )
                })()}
                <span className="text-[11px] text-gray-500 tabular-nums w-24 text-right shrink-0 hidden sm:block">
                  {s.hits} H · {s.walks} BB · {s.strikeouts} K
                </span>
              </div>
              {/* Besatzung: wer stand hier — nach Häufigkeit, mit seiner eigenen Quote am Platz */}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-8 pb-1.5">
                {(s.players ?? []).slice(0, 4).map(pl => (
                  <span key={pl.name} className="text-[10px] text-gray-500" title={`${pl.name}: ${pl.plateAppearances}× am Schlag auf Platz ${s.slot} · ${pl.plateAppearances > 0 ? Math.round(pl.onBase / pl.plateAppearances * 100) : 0} % auf Base`}>
                    <span className="font-semibold text-navy-800">{pl.name}</span>
                    {' '}{pl.plateAppearances}× · {pl.plateAppearances > 0 ? Math.round(pl.onBase / pl.plateAppearances * 100) : 0} %
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </details>
  )
}

// --- Eine Spiel-Zeile mit Run-Sparkline ---

function GameRow({ log, open, onToggle, selecting = false, selected = false, onSelect }: {
  log: TeamGameLogResponse
  open: boolean
  onToggle: () => void
  selecting?: boolean
  selected?: boolean
  onSelect?: () => void
}) {
  const result = log.scoreUs != null && log.scoreThem != null
    ? log.scoreUs > log.scoreThem ? 'W' : log.scoreUs < log.scoreThem ? 'L' : 'T'
    : null

  // Auswahl-Modus: die Zeile markiert statt aufzuklappen — Ring als sichtbares Signal.
  // Offene Zeile + Auswahl: heller Ring, sonst verschwindet er im Navy.
  const wrapperCls = open
    ? `border-navy-300 bg-navy-900${selected ? ' outline outline-2 outline-offset-2 outline-white/70' : ''}`
    : selected
      ? 'border-navy-900 bg-cream-100 outline outline-2 outline-offset-2 outline-navy-900'
      : 'border-cream-200 bg-white hover:bg-cream-50'

  return (
    <div className={`rounded-2xl border transition-colors ${wrapperCls}`}>
      <button
        onClick={() => (selecting ? onSelect?.() : onToggle())}
        aria-expanded={selecting ? undefined : open}
        aria-pressed={selecting ? selected : undefined}
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
            <span className={`text-[10px] uppercase tracking-wide truncate hidden sm:inline ${open ? 'text-white/60' : 'text-gray-400'}`}>
              {log.date
                ? new Date(log.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' }) + ' · ' + (log.league ?? '').replace(' Series', '').replace(' Liga', '')
                : 'ohne Datum'}
            </span>
          </div>
          {log.hasAtBatData ? (
            <Sparkline innings={log.innings} open={open} />
          ) : (
            <span className={`text-[10px] italic ${open ? 'text-white/60' : 'text-gray-400'}`}>nicht ausgewertet — keine Schlag-Daten</span>
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
            {log.scoreUs ?? '–'}<span className={open ? 'text-white/60' : 'text-gray-300'}>:</span>{log.scoreThem ?? '–'}
          </span>
          {selecting ? (
            <span className={`w-5 h-5 shrink-0 inline-flex items-center justify-center rounded-full border-2 transition-colors ${
              selected ? 'bg-navy-900 border-navy-900 text-white' : 'border-gray-300 text-transparent'
            }`}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m3 8.5 3.5 3.5L13 5" /></svg>
            </span>
          ) : (
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className={open ? 'text-white/50' : 'text-gray-300'}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m4 6 4 4 4-4" /></svg>
            </motion.span>
          )}
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
      <span className={open ? 'text-white/60' : 'text-gray-400'}>{label}</span>
    </span>
  )
}

// --- Schlagfolge eines fokussierten Innings: wer kam wann dran, wer hing, wer machte das Aus ---

/** Kurz-Notation je Ergebnis — der Tooltip zeigt das volle Label. */
const RESULT_SHORT: Record<AtBatResult, string> = {
  SINGLE: '1B', DOUBLE: '2B', TRIPLE: '3B', HOMERUN: 'HR', INSIDE_PARK_HR: 'HR',
  WALK: 'BB', HIT_BY_PITCH: 'HBP', STRIKEOUT: 'K', OUT: 'Out',
  REACHED_ON_ERROR: 'ROE', AUTOMATIC_OUT: 'AO',
}

const HIT_RESULTS: ReadonlySet<AtBatResult> = new Set(['SINGLE', 'DOUBLE', 'TRIPLE', 'HOMERUN', 'INSIDE_PARK_HR'])
const OUT_RESULTS: ReadonlySet<AtBatResult> = new Set(['STRIKEOUT', 'OUT', 'AUTOMATIC_OUT'])

/** Basen-Bewegungen eines Innings: wer durch wessen At-Bat weitergerückt ist.
 *  Das Legacy-Scoring speichert keine Bewegungen, nur den Zustand nach jedem
 *  At-Bat — das Backend leitet sie aus dem Diff ab. Zeilen gibt es nur für
 *  At-Bats, bei denen sich wirklich jemand bewegt hat. */
function InningAdvances({ atBats }: { atBats: InningAtBat[] }) {
  const withMoves = atBats.filter(ab => (ab.advances?.length ?? 0) > 0)
  if (withMoves.length === 0) return null
  const base = (n: number) => (n === 4 ? 'Home' : `${n}B`)
  return (
    <ul className="mt-1.5 space-y-0.5" aria-label="Basen-Bewegungen">
      {withMoves.map((ab, i) => (
        <li key={i} className="text-[10px] leading-tight text-white/55">
          <span className="text-white/35">{ab.batter} {RESULT_SHORT[ab.result]}</span>
          {' · '}
          {ab.advances!.map((adv, j) => (
            <Fragment key={j}>
              {j > 0 && <span className="text-white/25"> · </span>}
              <span className={adv.toBase === 4 ? 'font-semibold text-amber-300' : 'text-white/70'}>
                {adv.runner} {base(adv.fromBase)}→{base(adv.toBase)}
              </span>
            </Fragment>
          ))}
        </li>
      ))}
    </ul>
  )
}

/** Horizontale Schlagfolge: At-Bats in zeitlicher Reihenfolge; gestrandete Runner rot,
 *  der Out-Macher gerahmt — beantwortet „wer stand zwischen den beiden am Schlag?". */
function InningAtBatChain({ inning }: { inning: InningLog }) {
  const atBats = inning.atBats ?? []
  if (atBats.length === 0) {
    return <p className="mt-2 text-[10px] italic text-white/40">Keine At-Bat-Daten für Inning {inning.inning}.</p>
  }
  const stranded = new Set(inning.stranded)
  return (
    <motion.div
      className="mt-2"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.22, ease: EASE_OUT }}
    >
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1" aria-label={`Schlagfolge Inning ${inning.inning}`}>
        {atBats.map((ab, i) => {
          const isStranded = stranded.has(ab.batter)
          const isOutMaker = inning.outMaker != null && ab.batter === inning.outMaker && i === atBats.length - 1
          const isHit = HIT_RESULTS.has(ab.result)
          const isOut = OUT_RESULTS.has(ab.result)
          return (
            <Fragment key={i}>
              {i > 0 && <span aria-hidden="true" className="text-white/25 text-[9px] select-none">→</span>}
              <span
                title={`${ab.batter}: ${AT_BAT_RESULT_LABELS[ab.result]}${ab.runsScored > 0 ? ` · ${ab.runsScored} ${ab.runsScored === 1 ? 'Run' : 'Runs'}` : ''}${isStranded ? ' · hängen geblieben' : ''}${isOutMaker ? ' · letztes Aus' : ''}`}
                className={`inline-flex items-baseline gap-1 rounded-md px-1.5 py-0.5 text-[11px] tabular-nums ${
                  isStranded
                    ? 'bg-softball-red-500/15 text-softball-red-300'
                    : isHit
                      ? 'bg-amber-400/15 text-amber-300'
                      : `bg-white/5 ${isOut ? 'text-white/50' : 'text-white/75'}`
                } ${isOutMaker ? 'ring-1 ring-white/40' : ''}`}
              >
                <span className="font-semibold">{ab.batter}</span>
                <span className="opacity-70">{RESULT_SHORT[ab.result]}</span>
                {ab.runsScored > 0 && <span className="font-bold text-amber-300">+{ab.runsScored}</span>}
              </span>
            </Fragment>
          )
        })}
      </div>
      <InningAdvances atBats={atBats} />
      <p className="mt-1.5 text-[9px] text-white/35">
        rot = hängen geblieben · Rahmen = letztes Aus{inning.outMaker == null ? ' (dieses Inning endete ohne Aus)' : ''}
      </p>
    </motion.div>
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

  /** Das per Klick fokussierte Inning — Grundlage für die Schlagfolge unter der Tabelle. */
  const focusedInningLog = focusInning == null
    ? null
    : log.innings.find(i => i.inning === focusInning) ?? null

  useEffect(() => {
    let cancelled = false
    // Lineup gibt es auch für nicht ausgewertete Spiele (Spielbogen) — immer laden.
    // Schlag-Zahlen nur, wenn At-Bat-Daten existieren.
    api.getLineup(log.gameId)
      .then(l => { if (!cancelled) setLineup(l) })
      .catch((e: unknown) => { if (!cancelled) toast.show((e as Error).message, 'error') })
    if (log.hasAtBatData) {
      api.getGameBattingStats(log.gameId)
        .then(p => { if (!cancelled) setPlayers(p) })
        .catch((e: unknown) => { if (!cancelled) toast.show((e as Error).message, 'error') })
    }
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusster Load pro Spiel
  }, [log.gameId, log.hasAtBatData])

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
      <div className="border-t border-navy-700 px-4 py-4 space-y-4">
        <p className="text-xs text-white/50 italic leading-relaxed">
          Keine Schlag-Daten für dieses Spiel — Spielbogen-Daten zählen hier bewusst nicht.
        </p>
        {lineup && lineup.length > 0 && (
          <div>
            <p className="font-display text-[10px] font-bold tracking-widest uppercase text-white/60 mb-2">
              Lineup des Tages
            </p>
            <div className="space-y-1">
              {[...lineup].sort((a, b) => a.battingOrder - b.battingOrder).map(e => (
                <div key={e.id} className="flex items-baseline gap-3 text-xs">
                  <span className="font-display font-extrabold tabular-nums text-softball-red-300/70 w-5 shrink-0 text-right">{e.battingOrder}.</span>
                  <span className="font-semibold text-white truncate">{e.player?.name ?? '—'}</span>
                  <span className="text-white/55 shrink-0">{e.position ?? 'nur Schlag'}</span>
                  {e.dhBatterPlayer && (
                    <span className="text-white/60 truncate">
                      <span className="font-display font-bold text-softball-red-300/70 mr-1">DH</span>{e.dhBatterPlayer.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="border-t border-navy-700 px-4 py-4 space-y-5">
      {/* Run-Verlauf + Inning-Details */}
      <motion.div {...section(0)} className="grid lg:grid-cols-[1fr_1.3fr] gap-5">
        <div>
          <p className="font-display text-[10px] font-bold tracking-widest uppercase text-white/55 mb-1">Run-Verlauf</p>
          <p className="text-[10px] text-white/55 mb-2">Inning antippen hebt es überall hervor — Zahl = Spielstand danach</p>
          <RunProgress innings={log.innings} focusInning={focusInning} onToggleFocus={setFocusInning} />
          {log.stranded.length > 0 && (
            <div className="mt-3">
              <p className="font-display text-[10px] font-bold tracking-widest uppercase text-white/60 mb-1.5">
                Auf Base hängen geblieben
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
          {(log.basesGainedOnError?.length ?? 0) > 0 && (
            <div className="mt-3">
              <p className="font-display text-[10px] font-bold tracking-widest uppercase text-white/60 mb-1.5">
                Basen durch gegnerische Fehler
              </p>
              <div className="flex flex-wrap gap-1.5">
                {log.basesGainedOnError!.map(b => (
                  <span key={b.player} className="inline-flex items-center gap-1 bg-amber-400/15 border border-amber-400/30 rounded-full px-2.5 py-1 text-[11px] text-amber-300 font-semibold">
                    {b.player}<span className="font-extrabold text-amber-200">+{b.bases}</span>
                  </span>
                ))}
              </div>
              {/* Ehrlich bleiben: ein Overthrow wird ins vorherige At-Bat
                  zurueckgeschrieben und traegt dessen Ergebnis — er taucht hier
                  also nicht auf, obwohl er auch ein Fehler des Gegners ist. */}
              <p className="mt-1 text-[9px] text-white/35">
                Zählt At-Bats mit „Reached on Error". Overthrows stecken im jeweils vorherigen At-Bat und fehlen hier.
              </p>
            </div>
          )}
        </div>

        <div>
          <p className="font-display text-[10px] font-bold tracking-widest uppercase text-white/55 mb-2">Inning für Inning</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="font-display text-[9px] font-bold tracking-widest uppercase text-white/55 text-left border-b border-white/10">
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
                    <tr key={i.inning} className={`text-white/90 transition-colors ${focused ? 'bg-white/[0.07]' : ''}`}>
                      <td className="py-1 pr-2">
                        <button
                          onClick={() => setFocusInning(focused ? null : i.inning)}
                          title={focused ? 'Fokus aufheben' : 'Inning fokussieren'}
                          className={`font-display font-bold tabular-nums cursor-pointer px-2 py-1 -ml-2 rounded-md inline-flex items-center justify-center min-w-6 transition-all ${focused ? 'text-white bg-white/10' : 'text-white hover:text-white hover:bg-white/5 active:scale-95'}`}
                        >
                          {i.inning}
                        </button>
                      </td>
                      <td className="py-1 pr-2 text-right tabular-nums font-semibold text-white">{i.runs}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">{i.hits}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">{i.onBase}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">{i.walks}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">{i.outs}</td>
                      <td className="py-1 pr-2 text-white/65 truncate max-w-24">{i.outMaker ?? '—'}</td>
                      <td className="py-1 text-white/55 truncate max-w-40">{i.stranded.length > 0 ? i.stranded.join(', ') : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Schlagfolge des fokussierten Innings: wer kam zwischen Reach und Schluss-Aus dran */}
          <AnimatePresence initial={false}>
            {focusedInningLog && (
              <InningAtBatChain key={focusedInningLog.inning} inning={focusedInningLog} />
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Hit-Verlauf: wer trifft wann im Spiel, wer nimmt ab */}
      {log.innings.length > 0 && (
        <motion.div {...section(1)}>
          <p className="font-display text-[10px] font-bold tracking-widest uppercase text-white/60 mb-2">
            Hit-Verlauf — wer wann traf
          </p>
          <HitTimeline innings={log.innings} lineupInfo={lineupInfo} focusInning={focusInning} focusPlayer={focusPlayer} onFocusInning={setFocusInning} onFocusPlayer={setFocusPlayer} />
        </motion.div>
      )}

      {/* Lineup des Tages mit den Zahlen daneben — in Batting-Reihenfolge */}
      {players && players.length > 0 && (
        <motion.div {...section(2)}>
          <p className="font-display text-[10px] font-bold tracking-widest uppercase text-white/60 mb-2">
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
    // Ø pro Inning: Nenner = Spiele, die dieses Inning tatsächlich gespielt haben
    // (Mercy Rule / vorzeitiges Ende → späte Innings haben weniger Spiele im Nenner)
    const agg = new Map<number, { hits: number; runs: number; games: number }>()
    let games = 0
    for (const l of logs) {
      if (!l.hasAtBatData) continue
      games++
      for (const i of l.innings) {
        const e = agg.get(i.inning) ?? { hits: 0, runs: 0, games: 0 }
        e.hits += i.hits
        e.runs += i.runs
        e.games++
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

  const maxInningHits = Math.max(0.1, ...innings.byInning.map(([, e]) => e.hits / e.games))
  const maxInningRuns = Math.max(0.1, ...innings.byInning.map(([, e]) => e.runs / e.games))
  const maxInningVal = Math.max(maxInningHits, maxInningRuns)
  // Deutsche Anzeige: Komma als Dezimaltrenner
  const fmtAvg = (v: number) => v.toFixed(1).replace('.', ',')
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
        <div className="flex items-baseline justify-between mb-0.5">
          <p className="font-display text-sm font-extrabold uppercase tracking-wide text-navy-900">
            Hits pro Inning
          </p>
          <p className="text-[10px] text-gray-400">
            <span className="inline-block w-2 h-2 rounded-sm bg-navy-800 mr-1 align-middle" />Hits
            <span className="inline-block w-2 h-2 rounded-sm bg-amber-400 ml-2.5 mr-1 align-middle" />Runs
          </p>
        </div>
        <p className="text-[10px] text-gray-400 mb-2">Ø pro Spiel und Inning — aus {innings.games} {innings.games === 1 ? 'ausgewertetem Spiel' : 'ausgewerteten Spielen'} · Konversion Hits → Runs</p>
        <div className="flex items-end gap-1.5">
          {innings.byInning.map(([inning, e]) => (
            <div key={inning} className="flex-1 flex flex-col items-center gap-1" title={`Inning ${inning}: Ø ${fmtAvg(e.hits / e.games)} Hits · Ø ${fmtAvg(e.runs / e.games)} Runs (${e.games} Spiele)`}>
              <div className="w-full h-24 flex items-end justify-center gap-1">
                <div className="flex-1 flex flex-col items-center justify-end gap-0.5 h-full max-w-7">
                  <span className="font-display text-[11px] font-extrabold tabular-nums text-navy-900 leading-none">{fmtAvg(e.hits / e.games)}</span>
                  <div
                    className="w-full rounded-t-md bg-navy-800 transition-colors"
                    style={{ height: `${Math.max(4, Math.round((e.hits / e.games / maxInningVal) * 64))}px` }}
                  />
                </div>
                <div className="flex-1 flex flex-col items-center gap-0.5 max-w-7">
                  <span className="font-display text-[11px] font-extrabold tabular-nums text-amber-600">{fmtAvg(e.runs / e.games)}</span>
                  <div
                    className="w-full rounded-t-md bg-amber-400 transition-colors"
                    style={{ height: `${Math.max(4, Math.round((e.runs / e.games / maxInningVal) * 64))}px` }}
                  />
                </div>
              </div>
              <span className={`font-display text-[10px] font-bold tabular-nums ${e.games < innings.games ? 'text-amber-600' : 'text-navy-800'}`}>{inning}{e.games < innings.games ? '*' : ''}</span>
            </div>
          ))}
        </div>
        {innings.byInning.some(([, e]) => e.games < innings.games) && (
          <p className="mt-1.5 text-[10px] text-gray-400">* Inning nicht in allen Spielen erreicht (z. B. Mercy Rule) — Ø über die Spiele, die dieses Inning gespielt haben</p>
        )}
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
        <p className="text-[10px] text-gray-400 mt-2 leading-snug">
          Wessen At-Bat das Inning beendete, während Runner auf Base standen — reine Zählung, keine Wertung.
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
          <tr className="font-display text-[9px] font-bold tracking-widest uppercase text-white/55 text-left border-b border-white/10">
            <th className="py-1 pr-2">Spieler</th>
            {Array.from({ length: maxInning }, (_, idx) => idx + 1).map(inn => {
              const focused = focusInning === inn
              return (
                <th key={inn} className="py-1 text-center">
                  <button
                    onClick={() => onFocusInning(focused ? null : inn)}
                    title={focused ? 'Fokus aufheben' : `Inning ${inn} fokussieren`}
                    className={`px-2 py-1 rounded-md tabular-nums text-[10px] cursor-pointer inline-flex items-center justify-center min-w-7 transition-all ${focused ? 'text-white bg-white/10' : 'text-white/50 hover:text-white/70 hover:bg-white/5 active:scale-95'}`}
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
                    className={`font-semibold cursor-pointer truncate max-w-full text-left px-2 py-1 -ml-2 rounded-md transition-all ${playerFocused ? 'text-white bg-white/10' : 'text-white/80 hover:text-white hover:bg-white/5 active:scale-95'}`}
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

/**
 * Kumulativer Run-Verlauf als EINE durchgehende Linie — Spielstand über die Innings.
 * Steile Passagen = Big Inning, flache = Trockenheit. Inning antippen fokussiert es überall.
 */
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
  const n = innings.length
  // Y-Position (in % vom Boden): 8% Grundlinie bis 88% Maximalstand
  const y = (v: number) => 8 + (v / max) * 80
  // Linien-Punkte über ALLE Innings: x = Mitte der jeweiligen Inning-Spalte
  const pts = innings.map((_, idx) => `${((idx + 0.5) / n) * 100},${100 - y(cum[idx])}`)

  return (
    <div className="relative h-28">
      {/* Die EINE durchgehende Linie + dezente Fläche darunter */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="runFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-cream-300)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--color-cream-300)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${pts.join(' ')} 100,100`} fill="url(#runFill)" />
        <polyline
          points={pts.join(' ')}
          fill="none"
          stroke="var(--color-cream-300)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* Inning-Spalten: klickbar für den Fokus, tragen Spielstand-Zahl + Inning-Nummer */}
      <div className="absolute inset-0 flex">
        {innings.map((i, idx) => {
          const curY = y(cum[idx])
          const focused = focusInning === i.inning
          return (
            <button
              key={i.inning}
              onClick={() => onToggleFocus(focused ? null : i.inning)}
              title={`Inning ${i.inning}: +${i.runs} Runs · ${i.hits} Hits · Spielstand danach ${cum[idx]} · ${i.outs} Aus${focused ? ' — Fokus aufheben' : ''}`}
              aria-label={`Inning ${i.inning}: ${i.runs} Runs, Spielstand ${cum[idx]}`}
              aria-pressed={focused}
              className={`relative flex-1 h-full cursor-pointer rounded-lg transition-all active:scale-[0.98] ${focused ? 'bg-white/[0.07]' : 'hover:bg-white/5'}`}
            >
              {/* Spielstand nach diesem Inning */}
              <span
                className="absolute left-1/2 -translate-x-1/2 font-display text-[11px] font-extrabold tabular-nums text-white/90 pointer-events-none"
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
              <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 font-display text-[10px] font-bold tabular-nums pointer-events-none ${focused ? 'text-white' : 'text-white/60'}`}>
                {i.inning}
              </span>
            </button>
          )
        })}
      </div>
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
        <span className="text-white/50 shrink-0">{entry.position}</span>
        {(hits.get(entry.playerId) ?? 0) > 0 && <span className="font-display font-bold tabular-nums text-softball-red-300 shrink-0">{hits.get(entry.playerId)} H</span>}
      </span>
    )
  }

  const yieldRow = (log: TeamGameLogResponse) => log.hasAtBatData ? (
    <span className="font-display text-[11px] font-bold tabular-nums text-white/80">
      {log.scoreUs ?? '–'}:{log.scoreThem ?? '–'}
      <span className="text-white/50 font-medium"> · {log.hits} H · {log.onBase} OB · {log.walks} BB · {log.leftOnBase} LOB</span>
    </span>
  ) : (
    <span className="text-[11px] text-white/60 italic">
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
        Lineup-Vergleich <span className="text-white/60 font-bold">— rote Zellen = am Platz anders besetzt</span>
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
            <span className="font-display font-extrabold tabular-nums text-white/50 text-right">{slot}.</span>
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

  // Union: jede Lineup-Spieler (auch ohne At-Bat) + jeder gescorten Spieler (Subs ohne Slot)
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
          <tr className="font-display text-[9px] font-bold tracking-widest uppercase text-white/50 text-left border-b border-white/10">
            <th className="py-1 pr-1">#</th>
            <th className="py-1 pr-2">Spieler</th>
            <th className="py-1 pr-2 text-right" title="Plate Appearances – wie oft der Spieler am Schlag war">Schläge</th>
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
                  {info && <span className="text-white/55 font-medium ml-1.5">{info.position}</span>}
                </td>
                <td className="py-1 pr-2 text-right tabular-nums text-white/70">{p.plateAppearances}</td>
                <td className="py-1 pr-2 text-right tabular-nums font-bold text-white">{p.hits}</td>
                <td className="py-1 pr-2 text-right tabular-nums text-white/60 hidden sm:table-cell">{p.doubles}·{p.triples}·{p.homeRuns}</td>
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
