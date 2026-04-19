import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useTraining } from '@/hooks/useTraining'
import { usePlayers } from '@/hooks/usePlayers'
import { useToastContext } from '@/components/layout/Layout'
import { PlusCircle, CrossBones, ChevronDown, ChevronUp, XMark, Pencil, UploadIcon, ExportDoc } from '@/icons'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import type { TrainingResponse } from '@/types'
import * as api from '@/api/client'

export function TrainingPage() {
  const {
    trainings, attendance, periods, activePeriodId, loading,
    selectPeriod, toggleAttendance, createTraining, createBulk, deleteTraining, cancelTraining, renamePeriod, deletePeriod, importCsv,
  } = useTraining()
  const { players, loading: playersLoading, update: updatePlayer } = usePlayers()
  const toast = useToastContext()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [headerMenuId, setHeaderMenuId] = useState<number | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)
  const [statsFilter, setStatsFilter] = useState<'8weeks' | '12weeks' | 'season' | 'all' | '3months' | 'allTime'>('3months')
  const [crossSeasonStats, setCrossSeasonStats] = useState<{ playerId: number; playerName: string; attended: number; totalTrainings: number; regular: boolean }[]>([])
  const [crossSeasonLoading, setCrossSeasonLoading] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [deletePeriodId, setDeletePeriodId] = useState<number | null>(null)
  const [renamingPeriod, setRenamingPeriod] = useState<{ id: number; name: string } | null>(null)
  const [hoveredPlayer, setHoveredPlayer] = useState<number | null>(null)
  const [hoveredTraining, setHoveredTraining] = useState<number | null>(null)

  // Cross-season Stats laden wenn Filter aktiv
  useEffect(() => {
    if (statsFilter !== '3months' && statsFilter !== 'allTime') return
    setCrossSeasonLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const since = statsFilter === '3months'
      ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : undefined
    api.getTrainingStats(undefined, since, today).then(data => {
      setCrossSeasonStats(data.map(s => ({
        playerId: s.playerId, playerName: s.playerName,
        attended: Number(s.attended), totalTrainings: Number(s.totalTrainings),
        regular: s.regular,
      })))
    }).finally(() => setCrossSeasonLoading(false))
  }, [statsFilter])

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Touch-scroll detection: track start position to distinguish tap vs scroll
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const didScrollRef = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    didScrollRef.current = false
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - touchStartRef.current.x)
    const dy = Math.abs(touch.clientY - touchStartRef.current.y)
    if (dx > 10 || dy > 10) {
      didScrollRef.current = true
    }
  }, [])

  const handleHeaderClick = useCallback((trainingId: number) => {
    // On touch devices, ignore if user scrolled
    if (didScrollRef.current) return
    setHeaderMenuId(prev => prev === trainingId ? null : trainingId)
  }, [])

  // Close header menu on click outside
  useEffect(() => {
    if (!headerMenuId) return
    const handler = () => {
      setHeaderMenuId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [headerMenuId])

  // Initial load (with auto-period selection) is handled by useTraining hook

  // Auto-scroll to the training closest to today's date
  useEffect(() => {
    if (!loading && scrollContainerRef.current && trainings.length > 0) {
      const today = new Date().toISOString().slice(0, 10)
      let targetIndex = trainings.length - 1 // fallback: last column
      for (let i = 0; i < trainings.length; i++) {
        if (trainings[i].date >= today) { targetIndex = i; break }
      }
      const colWidth = 56 // w-14
      const container = scrollContainerRef.current
      container.scrollLeft = targetIndex * colWidth - container.clientWidth / 2 + colWidth / 2
    }
  }, [loading, trainings.length])

  // Precompute: player totals + training counts (avoid recalculating in render loop)
  const playerTotals = useMemo(() => {
    const map = new Map<number, number>()
    for (const t of trainings) {
      if (t.cancelled) continue
      const att = attendance.get(t.id)
      if (!att) continue
      for (const [pId, present] of att) {
        if (present) map.set(pId, (map.get(pId) ?? 0) + 1)
      }
    }
    return map
  }, [trainings, attendance])

  const trainingCounts = useMemo(() => {
    const map = new Map<number, number>()
    for (const t of trainings) {
      const att = attendance.get(t.id)
      if (!att) { map.set(t.id, 0); continue }
      let count = 0
      for (const present of att.values()) { if (present) count++ }
      map.set(t.id, count)
    }
    return map
  }, [trainings, attendance])

  // Stable sort: memoized, re-sorts only when players or totals change
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.regular !== b.regular) return a.regular ? -1 : 1
      return (playerTotals.get(b.id) ?? 0) - (playerTotals.get(a.id) ?? 0) || a.name.localeCompare(b.name)
    })
  }, [players, playerTotals])

  const getPlayerTotal = (playerId: number) => playerTotals.get(playerId) ?? 0
  const getTrainingCount = (t: { id: number }) => trainingCounts.get(t.id) ?? 0

  const exportCsv = () => {
    const nonCancelled = trainings.filter(t => !t.cancelled)
    if (nonCancelled.length === 0) return

    const formatDate = (d: string) => {
      const [y, m, day] = d.split('-')
      return `${day}.${m}.${y}`
    }

    const header = ['', ...nonCancelled.map(t => formatDate(t.date))]
    const rows = sortedPlayers.map(p => {
      const cells = nonCancelled.map(t => {
        const map = attendance.get(t.id)
        const present = map?.get(p.id)
        return present === true ? 'TRUE' : present === false ? 'FALSE' : ''
      })
      return [p.name, ...cells]
    })

    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const periodName = activePeriodId ? periods.find(p => p.id === activePeriodId)?.name : null
    a.download = `training${periodName ? '_' + periodName : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const handleCreateSingle = async (data: { date: string; time?: string; location?: string; type?: string }) => {
    try {
      await createTraining(data)
      setShowCreateModal(false)
      toast.show('Training erstellt')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleCreateBulk = async (data: { weekdays: number[]; startDate: string; endDate: string; time?: string; location?: string; periodName?: string; type?: string }) => {
    try {
      await createBulk(data)
      setShowCreateModal(false)
      toast.show('Trainings erstellt')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleToggle = async (trainingId: number, playerId: number) => {
    try {
      await toggleAttendance(trainingId, playerId)
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleteId(null)
    try {
      await deleteTraining(deleteId)
      toast.show('Training geloescht')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleCancel = async (id: number) => {
    setHeaderMenuId(null)
    try {
      await cancelTraining(id)
      toast.show('Training abgesagt')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  if (loading || playersLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-navy-800 rounded-full animate-[shimmer_1s_ease-in-out_infinite]" />
        </div>
        <p className="text-sm text-gray-400">Laden…</p>
      </div>
    )
  }

  // Compute filtered stats client-side based on date range
  const filteredTrainings = (() => {
    const nonCancelled = trainings.filter(t => !t.cancelled)
    if (statsFilter === 'all') return nonCancelled
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const pastOnly = nonCancelled.filter(t => new Date(t.date) <= today)
    if (statsFilter === '8weeks') {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 56) // 8 weeks
      return pastOnly.filter(t => new Date(t.date) >= cutoff)
    }
    if (statsFilter === '12weeks') {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 84) // 12 weeks
      return pastOnly.filter(t => new Date(t.date) >= cutoff)
    }
    // 'season' = from first training in current view, up to today
    return pastOnly
  })()

  const filteredStats = (() => {
    const totalFiltered = filteredTrainings.length
    const attendedCount = new Map<number, number>()
    for (const t of filteredTrainings) {
      const tAttendance = attendance.get(t.id)
      if (!tAttendance) continue
      for (const [playerId, present] of tAttendance) {
        if (present) {
          attendedCount.set(playerId, (attendedCount.get(playerId) ?? 0) + 1)
        }
      }
    }
    return players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      attended: attendedCount.get(p.id) ?? 0,
      totalTrainings: totalFiltered,
      regular: p.regular,
    }))
  })()

  const activeTotalTrainings = filteredTrainings.length

  // Issue #6: distinguish "no trainings at all" from "no players and no trainings"
  const hasPlayers = players.length > 0
  const hasTrainings = trainings.length > 0

  return (
    <div className="space-y-6">
      {/* Section 1: Attendance Matrix */}
      <section>
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-softball-red-600 rounded-full" />
              <h1 className="text-2xl font-bold text-gray-950">Anwesenheit</h1>
            </div>
            {/* Desktop: all buttons inline */}
            <div className="hidden sm:flex items-center gap-2">
              {periods.length > 0 && (
                <div className="flex items-center gap-1">
                  <select
                    value={activePeriodId ?? ''}
                    onChange={e => selectPeriod(e.target.value ? Number(e.target.value) : null)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none cursor-pointer"
                  >
                    <option value="">Alle Zeiträume</option>
                    {periods.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {activePeriodId && (
                    <>
                      <button
                        onClick={() => {
                          const p = periods.find(p => p.id === activePeriodId)
                          if (p) setRenamingPeriod({ id: p.id, name: p.name })
                        }}
                        className="p-1.5 text-gray-400 hover:text-navy-600 rounded-lg hover:bg-navy-50 cursor-pointer"
                        title="Zeitraum umbenennen"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeletePeriodId(activePeriodId)}
                        className="p-1.5 text-gray-400 hover:text-softball-red-600 rounded-lg hover:bg-softball-red-50 cursor-pointer"
                        title="Zeitraum löschen"
                      >
                        <XMark size={16} />
                      </button>
                    </>
                  )}
                </div>
              )}
              <button
                onClick={exportCsv}
                disabled={trainings.filter(t => !t.cancelled).length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-navy-800 hover:text-white hover:border-navy-800 cursor-pointer disabled:opacity-40 disabled:cursor-default transition-colors"
              >
                <ExportDoc size={16} /> CSV Export
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-navy-800 hover:text-white hover:border-navy-800 cursor-pointer transition-colors"
              >
                <UploadIcon size={16} /> CSV Import
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-softball-red-600 text-white text-sm font-medium hover:bg-softball-red-500 cursor-pointer"
              >
                <PlusCircle size={16} /> Neues Training
              </button>
            </div>
          </div>

          {/* Mobile: stacked controls */}
          <div className="flex sm:hidden flex-wrap items-center gap-2">
            {periods.length > 0 && (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <select
                  value={activePeriodId ?? ''}
                  onChange={e => selectPeriod(e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 outline-none cursor-pointer"
                >
                  <option value="">Alle Zeiträume</option>
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {activePeriodId && (
                  <>
                    <button
                      onClick={() => {
                        const p = periods.find(p => p.id === activePeriodId)
                        if (p) setRenamingPeriod({ id: p.id, name: p.name })
                      }}
                      className="p-1.5 text-gray-400 hover:text-navy-600 cursor-pointer"
                      title="Zeitraum umbenennen"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeletePeriodId(activePeriodId)}
                      className="p-1.5 text-gray-400 hover:text-softball-red-600 cursor-pointer"
                      title="Zeitraum löschen"
                    >
                      <XMark size={16} />
                    </button>
                  </>
                )}
              </div>
            )}
            <button
              onClick={exportCsv}
              disabled={trainings.filter(t => !t.cancelled).length === 0}
              className="p-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-navy-800 hover:text-white hover:border-navy-800 cursor-pointer disabled:opacity-40 disabled:cursor-default transition-colors"
              title="CSV Export"
            >
              <ExportDoc size={18} />
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="p-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-navy-800 hover:text-white hover:border-navy-800 cursor-pointer transition-colors"
              title="CSV Import"
            >
              <UploadIcon size={18} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2.5 rounded-lg bg-softball-red-600 text-white hover:bg-softball-red-500 cursor-pointer"
              title="Neues Training"
            >
              <PlusCircle size={18} />
            </button>
          </div>
        </div>

        {!hasPlayers && !hasTrainings ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
            <CrossBones size={48} className="mx-auto mb-3 opacity-40" />
            <p>Noch keine Trainings vorhanden.</p>
          </div>
        ) : hasPlayers && !hasTrainings ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
            <CrossBones size={48} className="mx-auto mb-3 opacity-40" />
            <p className="mb-4">Noch keine Trainings erstellt.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-softball-red-600 text-white text-sm font-medium hover:bg-navy-500 cursor-pointer"
            >
              <PlusCircle size={16} /> Neues Training
            </button>
          </div>
        ) : (
          <div
            className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            onMouseLeave={() => { setHoveredPlayer(null); setHoveredTraining(null) }}
          >
            <div className="flex">
              {/* Sticky player column */}
              <div className="flex-shrink-0 z-10 bg-white border-r border-gray-200">
                {/* Header corner */}
                <div className="h-14 border-b border-gray-200 px-3 flex items-center sticky top-0 bg-white z-20">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Spieler</span>
                </div>
                {/* Player names */}
                {sortedPlayers.map(p => (
                  <div
                    key={p.id}
                    className={`h-11 border-b border-gray-100 px-3 flex items-center gap-2 transition-colors ${
                      hoveredPlayer === p.id ? 'bg-softball-red-100' : ''
                    }`}
                    onMouseEnter={() => setHoveredPlayer(p.id)}
                    onMouseLeave={() => setHoveredPlayer(null)}
                  >
                    <button
                      onClick={async () => {
                        try {
                          await updatePlayer(p.id, { regular: !p.regular })
                          toast.show(p.regular ? 'Stammspieler entfernt' : 'Als Stammspieler markiert')
                        } catch (e: unknown) {
                          toast.show((e as Error).message, 'error')
                        }
                      }}
                      className={`text-xs cursor-pointer ${p.regular ? 'text-softball-red-600' : 'text-gray-300 hover:text-softball-red-400'}`}
                      title={p.regular ? 'Stammspieler (klicken zum Entfernen)' : 'Als Stammspieler markieren'}
                    >
                      {p.regular ? '\u2605' : '\u2606'}
                    </button>
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                      {p.name}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto tabular-nums">
                      {getPlayerTotal(p.id)}
                    </span>
                  </div>
                ))}
                {/* Bottom row corner */}
                <div className="h-11 px-3 flex items-center">
                  <span className="text-xs font-semibold text-gray-500">Gesamt</span>
                </div>
              </div>

              {/* Scrollable training columns */}
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-x-auto"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
              >
                <div className="inline-flex min-w-full">
                  {trainings.map((t, colIndex) => (
                    <div
                      key={t.id}
                      className="flex-shrink-0 w-14"
                      onMouseEnter={() => setHoveredTraining(t.id)}
                      onMouseLeave={() => setHoveredTraining(null)}
                    >
                      {/* Date header */}
                      <div
                        className={`h-14 border-b border-gray-200 flex flex-col items-center justify-center cursor-pointer relative group/header sticky top-0 z-20 ${
                          hoveredTraining === t.id ? 'bg-softball-red-100' : t.cancelled ? 'bg-gray-100' : 'bg-white hover:bg-navy-50'
                        }`}
                        onClick={() => handleHeaderClick(t.id)}
                      >
                        <span className={`text-xs font-medium ${t.cancelled ? 'line-through text-gray-400' : t.type === 'PITCHER_CATCHER' ? 'text-softball-red-700' : 'text-gray-700'}`}>
                          {formatDate(t.date)}
                        </span>
                        {t.type === 'PITCHER_CATCHER' ? (
                          <span className="text-[9px] font-bold text-softball-red-600 leading-none">P/C</span>
                        ) : (
                          <ChevronDown
                            size={10}
                            className="text-gray-400 opacity-100 sm:opacity-0 sm:group-hover/header:opacity-100 transition-opacity mt-0.5"
                          />
                        )}
                        {headerMenuId === t.id && (
                          <TrainingHeaderMenu
                            training={t}
                            isFirstColumn={colIndex === 0}
                            isLastColumn={colIndex === trainings.length - 1}
                            onCancel={() => handleCancel(t.id)}
                            onDelete={() => { setHeaderMenuId(null); setDeleteId(t.id) }}
                          />
                        )}
                      </div>
                      {/* Attendance cells */}
                      {sortedPlayers.map(p => {
                        const map = attendance.get(t.id)
                        const present = map?.get(p.id) ?? false
                        const isHighlighted = hoveredPlayer === p.id || hoveredTraining === t.id
                        return (
                          <div
                            key={p.id}
                            className={`h-11 border-b border-gray-100 flex items-center justify-center cursor-pointer transition-colors ${
                              t.cancelled
                                ? 'bg-red-50/60 cursor-not-allowed'
                                : present
                                  ? t.type === 'PITCHER_CATCHER'
                                    ? isHighlighted ? 'bg-softball-red-700 text-white ring-2 ring-navy-400 ring-inset' : 'bg-softball-red-700 text-white hover:bg-softball-red-600'
                                    : isHighlighted ? 'bg-navy-900 text-white ring-2 ring-softball-red-400 ring-inset' : 'bg-navy-900 text-white hover:bg-navy-800'
                                  : isHighlighted ? 'bg-navy-100 text-gray-500' : 'bg-gray-50 text-gray-300 hover:bg-gray-100'
                            }`}
                            onMouseEnter={() => setHoveredPlayer(p.id)}
                            onMouseLeave={() => setHoveredPlayer(null)}
                            onClick={() => !t.cancelled && handleToggle(t.id, p.id)}
                          >
                            <span className="text-sm font-medium">
                              {t.cancelled ? '' : present ? '\u2713' : '\u2014'}
                            </span>
                          </div>
                        )
                      })}
                      {/* Bottom count */}
                      <div className="h-11 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-500 tabular-nums">
                          {t.cancelled ? '-' : `${getTrainingCount(t)}/${players.length}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Section 2: Statistics */}
      <section>
        <button
          onClick={() => setStatsOpen(!statsOpen)}
          className="flex items-center gap-3 mb-4 group cursor-pointer"
        >
          <div className="w-1 h-8 bg-softball-red-600 rounded-full" />
          <h2 className="text-xl font-bold text-gray-950">Statistik</h2>
          {statsOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </button>

        {statsOpen && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            {/* Filter chips */}
            <div className="flex gap-1.5">
              {([
                ['3months', 'Letzte 3 Monate'],
                ['allTime', 'Gesamt'],
                ['8weeks', '8 Wochen (Saison)'],
                ['12weeks', '12 Wochen (Saison)'],
                ['season', 'Saison'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStatsFilter(key)}
                  className={`px-3 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                    statsFilter === key
                      ? 'bg-navy-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Stats content — cross-season oder perioden-basiert */}
            {(() => {
              const isCrossSeason = statsFilter === '3months' || statsFilter === 'allTime'
              const displayStats = isCrossSeason ? crossSeasonStats : filteredStats
              const displayTotal = isCrossSeason
                ? (crossSeasonStats[0]?.totalTrainings ?? 0)
                : activeTotalTrainings
              const displayMax = Math.max(...displayStats.map(s => s.attended), 1)

              if (crossSeasonLoading && isCrossSeason) {
                return <p className="text-sm text-gray-400 text-center py-4">Lade Statistik...</p>
              }

              const hint = isCrossSeason
                ? `${statsFilter === '3months' ? 'Letzte 3 Monate' : 'Seit Beginn'} · Alle Zeiträume · ${displayTotal} Trainings`
                : activeTotalTrainings > 0 ? (() => {
                    const fmt = (d: string) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    const sorted = [...filteredTrainings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    return `${fmt(sorted[0].date)} – ${fmt(sorted[sorted.length - 1].date)} · ${activeTotalTrainings} Trainings`
                  })() : null

              return <>
                {hint && <p className="text-xs text-gray-400">{hint}</p>}
                {displayStats.length === 0 || displayTotal === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Keine Daten im gewählten Zeitraum.</p>
                ) : (
                  [...displayStats]
                    .sort((a, b) => b.attended - a.attended)
                    .map(s => {
                      const pct = displayTotal > 0
                        ? Math.round((s.attended / displayTotal) * 100)
                        : 0
                      const barWidth = Math.round((s.attended / displayMax) * 100)
                      return (
                        <div key={s.playerId} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-900 w-32 truncate">
                            {s.playerName}
                          </span>
                          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all bg-navy-800"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 tabular-nums w-16 text-right">
                            {s.attended}/{displayTotal} ({pct}%)
                          </span>
                        </div>
                      )
                    })
                )}
              </>
            })()}
          </div>
        )}
      </section>

      {/* Create Training Modal (Einzeln + Wöchentlich) */}
      {showCreateModal && (
        <CreateTrainingModal
          periods={periods}
          onCreateSingle={handleCreateSingle}
          onCreateBulk={handleCreateBulk}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportTrainingModal
          onSubmit={async (csv, periodName) => {
            try {
              const result = await importCsv(csv, periodName)
              setShowImportModal(false)
              toast.show(`${result.trainingsCreated} Trainings importiert${result.trainingsSkipped ? `, ${result.trainingsSkipped} übersprungen` : ''}${result.playersNotFound ? `, ${result.playersNotFound} Spieler nicht gefunden` : ''}`)
            } catch (e: unknown) {
              toast.show((e as Error).message, 'error')
            }
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {/* Delete Training Confirm */}
      {deleteId && (
        <ConfirmModal
          title="Training loeschen"
          message="Dieses Training wirklich loeschen? Alle Anwesenheitsdaten gehen verloren."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* Rename Period Modal */}
      {renamingPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setRenamingPeriod(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Zeitraum umbenennen</h2>
              <button onClick={() => setRenamingPeriod(null)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                <XMark size={20} />
              </button>
            </div>
            <div className="px-4 py-4">
              <input
                type="text"
                value={renamingPeriod.name}
                onChange={e => setRenamingPeriod({ ...renamingPeriod, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter' && renamingPeriod.name.trim()) {
                    renamePeriod(renamingPeriod.id, renamingPeriod.name.trim())
                      .then(() => { setRenamingPeriod(null); toast.show('Zeitraum umbenannt') })
                      .catch((err: Error) => toast.show(err.message, 'error'))
                  }
                }}
              />
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setRenamingPeriod(null)} className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer">
                Abbrechen
              </button>
              <button
                onClick={() => {
                  renamePeriod(renamingPeriod.id, renamingPeriod.name.trim())
                    .then(() => { setRenamingPeriod(null); toast.show('Zeitraum umbenannt') })
                    .catch((err: Error) => toast.show(err.message, 'error'))
                }}
                disabled={!renamingPeriod.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-softball-red-600 rounded-lg hover:bg-navy-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Period Confirm */}
      {deletePeriodId && (
        <ConfirmModal
          title="Zeitraum löschen"
          message={`Zeitraum "${periods.find(p => p.id === deletePeriodId)?.name}" und alle zugehörigen Trainings löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
          onConfirm={async () => {
            try {
              await deletePeriod(deletePeriodId)
              setDeletePeriodId(null)
              toast.show('Zeitraum gelöscht')
            } catch (e: unknown) {
              toast.show((e as Error).message, 'error')
              setDeletePeriodId(null)
            }
          }}
          onCancel={() => setDeletePeriodId(null)}
        />
      )}
    </div>
  )
}

function TrainingHeaderMenu({
  training,
  isFirstColumn,
  isLastColumn,
  onCancel,
  onDelete,
}: {
  training: TrainingResponse
  isFirstColumn: boolean
  isLastColumn: boolean
  onCancel: () => void
  onDelete: () => void
}) {
  // Position menu to avoid overflow on first/last columns
  const positionClass = isFirstColumn
    ? 'left-0'
    : isLastColumn
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2'

  return (
    <div
      className={`absolute top-12 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-36 ${positionClass}`}
      onMouseDown={e => e.stopPropagation()}
    >
      {!training.cancelled && (
        <button
          onClick={onCancel}
          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-navy-50 cursor-pointer"
        >
          Absagen
        </button>
      )}
      <button
        onClick={onDelete}
        className="w-full text-left px-3 py-2 text-sm text-softball-red-600 hover:bg-navy-50 cursor-pointer"
      >
        Löschen
      </button>
    </div>
  )
}

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function countBulkTrainings(weekdays: number[], startDate: string, endDate: string): number {
  if (!startDate || !endDate || weekdays.length === 0) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (end < start) return 0
  let count = 0
  const current = new Date(start)
  while (current <= end) {
    // JS getDay(): 0=Sun, we need 1=Mon..7=Sun
    const jsDay = current.getDay()
    const isoDay = jsDay === 0 ? 7 : jsDay
    if (weekdays.includes(isoDay)) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

function CreateTrainingModal({
  periods,
  onCreateSingle,
  onCreateBulk,
  onClose,
}: {
  periods: { id: number; name: string }[]
  onCreateSingle: (data: { date: string; time?: string; location?: string; type?: string }) => void
  onCreateBulk: (data: { weekdays: number[]; startDate: string; endDate: string; time?: string; location?: string; periodName?: string; type?: string }) => void
  onClose: () => void
}) {
  const [mode, setMode] = useState<'single' | 'weekly'>('single')

  // Shared state
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState<'REGULAR' | 'PITCHER_CATCHER'>('REGULAR')

  // Single mode
  const [date, setDate] = useState('')

  // Weekly mode
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [periodSelect, setPeriodSelect] = useState<'existing' | 'new'>(periods.length > 0 ? 'existing' : 'new')
  const [selectedPeriodName, setSelectedPeriodName] = useState(periods.length > 0 ? periods[0].name : '')
  const [newPeriodName, setNewPeriodName] = useState('')

  const periodName = periodSelect === 'existing' ? selectedPeriodName : newPeriodName

  const toggleDay = (day: number) => {
    setWeekdays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  const trainingCount = countBulkTrainings(weekdays, startDate, endDate)

  // Validation
  const today = new Date().toISOString().slice(0, 10)
  const dateInPast = mode === 'single' && date && date < today
  const endBeforeStart = mode === 'weekly' && startDate && endDate && endDate < startDate
  const missingPeriodName = mode === 'weekly' && periodSelect === 'new' && !newPeriodName.trim()
  const spanTooLong = mode === 'weekly' && startDate && endDate && !endBeforeStart &&
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24) > 365

  const canSubmitSingle = !!date
  const canSubmitWeekly = weekdays.length > 0 && startDate && endDate && trainingCount > 0 && !endBeforeStart && !missingPeriodName

  const handleSubmit = () => {
    if (mode === 'single') {
      onCreateSingle({
        date,
        time: time || undefined,
        location: location || undefined,
        type: type !== 'REGULAR' ? type : undefined,
      })
    } else {
      onCreateBulk({
        weekdays,
        startDate,
        endDate,
        time: time || undefined,
        location: location || undefined,
        periodName: periodName.trim() || undefined,
        type: type !== 'REGULAR' ? type : undefined,
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Neues Training</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
            <XMark size={20} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg border cursor-pointer transition-colors ${
                mode === 'single'
                  ? 'bg-navy-800 text-white border-navy-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-navy-400'
              }`}
            >
              Einzeln
            </button>
            <button
              type="button"
              onClick={() => setMode('weekly')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg border cursor-pointer transition-colors ${
                mode === 'weekly'
                  ? 'bg-navy-800 text-white border-navy-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-navy-400'
              }`}
            >
              Wöchentlich
            </button>
          </div>

          {/* Type toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Typ</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('REGULAR')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border cursor-pointer transition-colors ${
                  type === 'REGULAR'
                    ? 'bg-navy-800 text-white border-navy-800'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-navy-400'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setType('PITCHER_CATCHER')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border cursor-pointer transition-colors ${
                  type === 'PITCHER_CATCHER'
                    ? 'bg-softball-red-600 text-white border-softball-red-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-softball-red-400'
                }`}
              >
                P/C Training
              </button>
            </div>
          </div>

          {/* Single mode: date */}
          {mode === 'single' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                autoFocus
              />
              {dateInPast && (
                <p className="text-xs text-amber-600 mt-1">Datum liegt in der Vergangenheit (Nachtragen?)</p>
              )}
            </div>
          )}

          {/* Weekly mode: period, weekdays, date range */}
          {mode === 'weekly' && (
            <>
              {/* Period selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Zeitraum</label>
                <div className="flex gap-1.5 mb-2">
                  {periods.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setPeriodSelect('existing'); if (!selectedPeriodName) setSelectedPeriodName(periods[0].name) }}
                      className={`px-3 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                        periodSelect === 'existing' ? 'bg-navy-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Bestehend
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPeriodSelect('new')}
                    className={`px-3 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                      periodSelect === 'new' ? 'bg-navy-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Neu
                  </button>
                </div>
                {periodSelect === 'existing' && (
                  <>
                    <select
                      value={selectedPeriodName}
                      onChange={e => setSelectedPeriodName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none cursor-pointer"
                    >
                      {periods.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Bestehende Daten werden aktualisiert, Anwesenheit bleibt erhalten.</p>
                  </>
                )}
                {periodSelect === 'new' && (
                  <>
                    <input
                      type="text"
                      value={newPeriodName}
                      onChange={e => setNewPeriodName(e.target.value)}
                      placeholder="z.B. Sommersaison 2026"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                    />
                    {newPeriodName.trim() ? (
                      <p className="text-xs text-gray-400 mt-1">Neuer Zeitraum wird erstellt.</p>
                    ) : (
                      <p className="text-xs text-softball-red-600 mt-1">Name ist erforderlich.</p>
                    )}
                  </>
                )}
              </div>

              {/* Weekday chips */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Wochentage *</label>
                <div className="flex gap-1.5">
                  {WEEKDAY_LABELS.map((label, i) => {
                    const day = i + 1
                    const selected = weekdays.includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                          selected
                            ? 'bg-navy-800 text-white border-navy-800'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-navy-400 hover:text-navy-700'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enddatum *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                />
                {endBeforeStart && (
                  <p className="text-xs text-softball-red-600 mt-1">Enddatum muss nach dem Startdatum liegen.</p>
                )}
                {spanTooLong && (
                  <p className="text-xs text-amber-600 mt-1">Zeitraum ist länger als 1 Jahr.</p>
                )}
              </div>
            </>
          )}

          {/* Shared: time + location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Uhrzeit</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="z.B. Sportplatz"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
            />
          </div>

          {/* Preview count (weekly mode) */}
          {mode === 'weekly' && trainingCount > 0 && (
            <p className="text-sm text-navy-700 font-medium bg-navy-50 rounded-lg px-3 py-2">
              {trainingCount} {trainingCount === 1 ? 'Training wird' : 'Trainings werden'} erstellt
            </p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={mode === 'single' ? !canSubmitSingle : !canSubmitWeekly}
            className="px-4 py-2 text-sm font-medium text-white bg-softball-red-600 rounded-lg hover:bg-navy-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Erstellen
          </button>
        </div>
      </div>
    </div>
  )
}


function ImportTrainingModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (csv: string, periodName?: string) => void
  onClose: () => void
}) {
  const [csv, setCsv] = useState('')
  const [periodName, setPeriodName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setCsv(e.target?.result as string ?? '')
    }
    reader.readAsText(file)
  }

  const lineCount = csv.trim() ? csv.trim().split('\n').length - 1 : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">CSV Import</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
            <XMark size={20} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zeitraum-Name *</label>
            <input
              type="text"
              value={periodName}
              onChange={e => setPeriodName(e.target.value)}
              placeholder="z.B. Wintersaison 2025/26"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CSV-Datei</label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-navy-600 bg-navy-50' : 'border-gray-300 hover:border-navy-400'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(false)
                const file = e.dataTransfer.files[0]
                if (file) handleFile(file)
              }}
            >
              <UploadIcon size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">CSV hierher ziehen oder klicken</p>
              <p className="text-xs text-gray-400 mt-1">Google Sheets: Datei → Herunterladen → CSV</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Oder direkt einfügen</label>
            <textarea
              value={csv}
              onChange={e => setCsv(e.target.value)}
              placeholder={"Datum,Hung,Khang,Mike,...\n10.01.2026,TRUE,TRUE,FALSE,..."}
              rows={5}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none resize-y"
            />
          </div>

          {lineCount > 0 && (
            <p className="text-sm text-navy-700 font-medium bg-navy-50 rounded-lg px-3 py-2">
              {lineCount} {lineCount === 1 ? 'Zeile' : 'Zeilen'} erkannt
            </p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={() => onSubmit(csv, periodName.trim())}
            disabled={!csv.trim() || !periodName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-softball-red-600 rounded-lg hover:bg-navy-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Importieren
          </button>
        </div>
      </div>
    </div>
  )
}
