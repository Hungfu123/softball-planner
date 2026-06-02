import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Download, MapPin, Dumbbell } from 'lucide-react'
import * as api from '@/api/client'
import type { GameDayResponse, Season, TrainingResponse } from '@/types'
import { useToastContext } from '@/components/layout/Layout'
import { CalendarPageSkeleton } from './CalendarPageSkeleton'

// Season-Farb-Palette (Brand-Rot bewusst ausgespart — das ist Akzent, nicht Kategorie)
const SEASON_DOT = ['bg-navy-600', 'bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-violet-500', 'bg-teal-500', 'bg-rose-500']
const SEASON_TEXT = ['text-navy-700', 'text-emerald-700', 'text-sky-700', 'text-amber-700', 'text-violet-700', 'text-teal-700', 'text-rose-700']
const SEASON_BG = ['bg-navy-50', 'bg-emerald-50', 'bg-sky-50', 'bg-amber-50', 'bg-violet-50', 'bg-teal-50', 'bg-rose-50']
const TRAINING_DOT = 'bg-gray-400'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function dateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function CalendarPage() {
  const toast = useToastContext()
  const [loading, setLoading] = useState(true)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [gamedays, setGamedays] = useState<GameDayResponse[]>([])
  const [trainings, setTrainings] = useState<TrainingResponse[]>([])
  const [showTrainings, setShowTrainings] = useState(true)
  const [exporting, setExporting] = useState(false)

  const today = new Date()
  const [cursor, setCursor] = useState<{ y: number; m: number }>({ y: today.getFullYear(), m: today.getMonth() })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      api.getSeasons(),
      api.getAllGameDays().catch(() => [] as GameDayResponse[]),
      api.getTrainings().catch(() => [] as TrainingResponse[]),
    ]).then(([s, gd, tr]) => {
      if (cancelled) return
      setSeasons(s)
      setGamedays(gd)
      setTrainings(tr)
    }).catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Season → Farb-Index (stabil über sortierte Reihenfolge)
  const seasonMeta = useMemo(() => {
    const sorted = [...seasons].sort((a, b) => (a.year - b.year) || (a.id - b.id))
    const map = new Map<number, { name: string; dot: string; text: string; bg: string }>()
    sorted.forEach((s, i) => map.set(s.id, {
      name: s.name,
      dot: SEASON_DOT[i % SEASON_DOT.length],
      text: SEASON_TEXT[i % SEASON_TEXT.length],
      bg: SEASON_BG[i % SEASON_BG.length],
    }))
    return map
  }, [seasons])

  // Einträge pro Datum
  const byDate = useMemo(() => {
    const map = new Map<string, { gds: GameDayResponse[]; trs: TrainingResponse[] }>()
    for (const gd of gamedays) {
      if (!gd.date) continue
      const e = map.get(gd.date) ?? { gds: [], trs: [] }
      e.gds.push(gd); map.set(gd.date, e)
    }
    if (showTrainings) {
      for (const tr of trainings) {
        if (!tr.date || tr.cancelled) continue
        const e = map.get(tr.date) ?? { gds: [], trs: [] }
        e.trs.push(tr); map.set(tr.date, e)
      }
    }
    return map
  }, [gamedays, trainings, showTrainings])

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const firstOffset = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7 // Mo-first
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate())

  const goMonth = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  // Agenda dieses Monats (chronologisch)
  const monthEntries = useMemo(() => {
    const out: { key: string; day: number; gds: GameDayResponse[]; trs: TrainingResponse[] }[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(cursor.y, cursor.m, d)
      const e = byDate.get(key)
      if (e && (e.gds.length || e.trs.length)) out.push({ key, day: d, gds: e.gds, trs: e.trs })
    }
    return out
  }, [byDate, cursor, daysInMonth])

  const exportIcs = async () => {
    setExporting(true)
    try {
      await api.downloadCalendarIcs(showTrainings)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <CalendarPageSkeleton />

  return (
    <div className="space-y-4">
      {/* Header: Monats-Nav + ICS-Export */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => goMonth(-1)} aria-label="Vorheriger Monat" className="p-2 rounded-lg text-navy-700 hover:bg-cream-200 cursor-pointer">
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-display text-lg sm:text-xl font-extrabold text-navy-900 uppercase tracking-wide tabular-nums min-w-[150px] sm:min-w-[180px] text-center">
            {monthLabel}
          </h1>
          <button onClick={() => goMonth(1)} aria-label="Nächster Monat" className="p-2 rounded-lg text-navy-700 hover:bg-cream-200 cursor-pointer">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCursor({ y: today.getFullYear(), m: today.getMonth() })}
            className="font-display text-[11px] font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-lg text-navy-700 hover:bg-cream-200 cursor-pointer"
          >
            Heute
          </button>
          <button
            onClick={exportIcs}
            disabled={exporting}
            className="font-display inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-lg bg-navy-900 text-white hover:bg-navy-800 disabled:opacity-50 cursor-pointer transition-colors"
            title="Als .ics exportieren / abonnieren"
          >
            <Download size={13} /> ICS
          </button>
        </div>
      </div>

      {/* Training-Toggle */}
      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={showTrainings} onChange={e => setShowTrainings(e.target.checked)} className="accent-navy-700 w-4 h-4 cursor-pointer" />
        <span className="font-display text-[11px] font-bold tracking-widest uppercase text-navy-700 inline-flex items-center gap-1">
          <Dumbbell size={13} /> Training anzeigen
        </span>
      </label>

      {/* Monats-Grid */}
      <div className="bg-cream-50 border border-cream-300 rounded-2xl shadow-sm shadow-navy-900/5 p-2 sm:p-3">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1">
          {WEEKDAYS.map(w => (
            <div key={w} className="text-center font-display text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-gray-400 py-1">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {Array.from({ length: firstOffset }).map((_, i) => <div key={`pad-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const key = dateKey(cursor.y, cursor.m, day)
            const e = byDate.get(key)
            const isToday = key === todayKey
            const hasEntries = !!e && (e.gds.length > 0 || e.trs.length > 0)
            // Marker-Punkte: je Spieltag ein Season-Punkt (max 3) + Training-Punkt
            const dots: string[] = []
            if (e) {
              for (const gd of e.gds) dots.push(seasonMeta.get(gd.seasonId)?.dot ?? 'bg-gray-500')
              if (e.trs.length > 0) dots.push(TRAINING_DOT)
            }
            return (
              <div
                key={key}
                className={`aspect-square sm:aspect-auto sm:min-h-20 rounded-lg border flex flex-col items-center justify-start pt-1 gap-0.5 ${
                  isToday ? 'border-softball-red-500 bg-softball-red-50'
                    : hasEntries ? 'border-cream-300 bg-white' : 'border-transparent'
                }`}
              >
                <span className={`font-display text-[10px] sm:text-xs font-bold tabular-nums ${isToday ? 'text-softball-red-700' : hasEntries ? 'text-navy-900' : 'text-gray-400'}`}>
                  {day}
                </span>
                {/* Mobile: kompakte Punkte (kein Platz für Text) */}
                {dots.length > 0 && (
                  <div className="flex sm:hidden flex-wrap items-center justify-center gap-0.5 px-0.5">
                    {dots.slice(0, 4).map((c, di) => (
                      <span key={di} className={`w-1.5 h-1.5 rounded-full ${c}`} />
                    ))}
                  </div>
                )}
                {/* Desktop: lesbare Mini-Einträge (Gegner + Ort) */}
                {e && (e.gds.length > 0 || e.trs.length > 0) && (
                  <div className="hidden sm:flex flex-col gap-0.5 w-full px-1 mt-0.5">
                    {e.gds.map(gd => {
                      const meta = seasonMeta.get(gd.seasonId)
                      const opp = (gd.games.map(g => g.opponentTeam?.name).filter(Boolean) as string[])[0]
                      const extra = gd.games.filter(g => g.opponentTeam).length - 1
                      return (
                        <div key={gd.id} className={`rounded px-1 py-0.5 leading-tight ${meta?.bg ?? 'bg-gray-100'}`}>
                          <div className={`text-[9px] font-bold truncate ${meta?.text ?? 'text-gray-700'}`}>
                            {opp ? `vs ${opp}${extra > 0 ? ` +${extra}` : ''}` : (gd.label || 'Spieltag')}
                          </div>
                          {gd.location && <div className="text-[8px] text-gray-500 truncate">{gd.location}</div>}
                        </div>
                      )
                    })}
                    {e.trs.map(tr => (
                      <div key={tr.id} className="text-[9px] text-gray-500 truncate leading-tight">
                        Training{tr.location ? ` · ${tr.location}` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legende */}
      {seasons.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1">
          {[...seasonMeta.entries()].map(([id, meta]) => (
            <span key={id} className="inline-flex items-center gap-1.5 text-[11px] text-gray-600">
              <span className={`w-2 h-2 rounded-full ${meta.dot}`} /> {meta.name}
            </span>
          ))}
          {showTrainings && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-600">
              <span className={`w-2 h-2 rounded-full ${TRAINING_DOT}`} /> Training
            </span>
          )}
        </div>
      )}

      {/* Agenda des Monats */}
      <div className="space-y-2">
        <h2 className="font-display text-[12px] font-extrabold tracking-widest uppercase text-gray-700 px-1">Im {monthLabel}</h2>
        {monthEntries.length === 0 ? (
          <div className="bg-cream-50 border border-cream-300 rounded-xl shadow-sm shadow-navy-900/5 p-4 text-center text-sm text-gray-500">
            Keine Einträge in diesem Monat.
          </div>
        ) : monthEntries.map(entry => {
          const d = new Date(cursor.y, cursor.m, entry.day)
          const wd = d.toLocaleDateString('de-DE', { weekday: 'short' })
          return (
            <div key={entry.key} className="bg-cream-50 border border-cream-300 rounded-xl shadow-sm shadow-navy-900/5 p-3 flex gap-3">
              <div className="shrink-0 w-11 text-center">
                <div className="font-display text-[10px] font-bold uppercase tracking-widest text-gray-400">{wd}</div>
                <div className="font-display text-xl font-extrabold text-navy-900 leading-none tabular-nums">{entry.day}</div>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                {entry.gds.map(gd => {
                  const meta = seasonMeta.get(gd.seasonId)
                  const opponents = gd.games.map(g => g.opponentTeam?.name).filter(Boolean) as string[]
                  return (
                    <Link key={gd.id} to={`/gameday/${gd.id}`} className="block group">
                      <div className="flex items-center gap-2 flex-wrap">
                        {meta && (
                          <span className={`font-display text-[9px] font-extrabold tracking-widest uppercase px-1.5 py-0.5 rounded ${meta.bg} ${meta.text}`}>
                            {meta.name}
                          </span>
                        )}
                        <span className="font-display text-sm font-bold text-navy-900 group-hover:underline truncate">
                          {opponents.length > 0 ? `vs ${opponents.join(', ')}` : (gd.label || 'Spieltag')}
                        </span>
                      </div>
                      {gd.location && (
                        <div className="text-[11px] text-gray-500 inline-flex items-center gap-1 mt-0.5"><MapPin size={10} /> {gd.location}</div>
                      )}
                    </Link>
                  )
                })}
                {entry.trs.map(tr => (
                  <div key={tr.id} className="flex items-center gap-2 text-gray-600">
                    <Dumbbell size={13} className="text-gray-400 shrink-0" />
                    <span className="text-sm font-medium">Training{tr.time ? ` · ${tr.time}` : ''}</span>
                    {tr.location && <span className="text-[11px] text-gray-500 inline-flex items-center gap-1"><MapPin size={10} /> {tr.location}</span>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
