import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Flame, Target, Coffee, Trophy, ChevronDown, Circle, Pencil, MoreVertical, Sparkles, Trash2, BookOpen, Share2, Boxes, UserPlus } from 'lucide-react'
import { BatIcon } from '@/icons'
import type { TrainingPlanSectionResponse, DrillResponse, TrainingPlanResponse, PlanKind } from '@/types'
import { TrainingPlanSkeleton } from './TrainingPlanSkeleton'

type Props = {
  plans: TrainingPlanResponse[]
  loading?: boolean
  activePlanKind: PlanKind
  onSwitchKind: (kind: PlanKind) => void
  drills: DrillResponse[]
  onEdit: () => void
  onRegenerate: () => void
  onDelete: () => void
  onShare: () => void
  onAddBeginnerGroup?: () => void
  onGenerateBeginnerPlan?: () => void
  onGenerateMain?: () => void
}

type SectionStyle = {
  Icon: typeof Flame
  bg: string
  iconColor: string
  border: string
  label: string
}

function styleFor(sectionType: string | null): SectionStyle {
  const t = (sectionType ?? '').toUpperCase()
  if (t === 'WARMUP') return {
    Icon: Flame,
    bg: 'bg-softball-red-50',
    iconColor: 'text-softball-red-600',
    border: 'border-softball-red-200',
    label: 'Aufwärmen',
  }
  if (t === 'DRILL') return {
    Icon: Target,
    bg: 'bg-navy-50',
    iconColor: 'text-navy-700',
    border: 'border-navy-200',
    label: 'Drill',
  }
  if (t === 'BREAK') return {
    Icon: Coffee,
    bg: 'bg-cream-100',
    iconColor: 'text-navy-500',
    border: 'border-cream-300',
    label: 'Pause',
  }
  if (t === 'BATTING') return {
    Icon: BatIcon as typeof Flame,
    bg: 'bg-softball-red-50',
    iconColor: 'text-softball-red-700',
    border: 'border-softball-red-200',
    label: 'Batting',
  }
  if (t === 'GAME' || t === 'SCRIMMAGE') return {
    Icon: Trophy,
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-700',
    border: 'border-emerald-200',
    label: 'Spiel',
  }
  return {
    Icon: Circle,
    bg: 'bg-white',
    iconColor: 'text-navy-500',
    border: 'border-cream-300',
    label: 'Block',
  }
}

function formatTotal(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

function hasDetails(s: TrainingPlanSectionResponse, drill: DrillResponse | undefined): boolean {
  return !!(s.tips || s.userNotes || s.rounds || s.playersPerGroup || s.parallelGroup || drill?.description)
}

type StationGroup = { type: 'single'; idx: number } | { type: 'station'; group: number; indices: number[]; durationMinutes: number | null }

function groupSections(sections: TrainingPlanSectionResponse[]): StationGroup[] {
  const result: StationGroup[] = []
  let i = 0
  while (i < sections.length) {
    const s = sections[i]
    if (s.parallelGroup != null) {
      const group = s.parallelGroup
      const indices: number[] = []
      while (i < sections.length && sections[i].parallelGroup === group) {
        indices.push(i)
        i++
      }
      if (indices.length >= 2) {
        result.push({ type: 'station', group, indices, durationMinutes: sections[indices[0]].durationMinutes })
      } else {
        result.push({ type: 'single', idx: indices[0] })
      }
    } else {
      result.push({ type: 'single', idx: i })
      i++
    }
  }
  return result
}

type IndexedSection = { section: TrainingPlanSectionResponse; index: number }

type SectionRenderItem =
  | { kind: 'all'; items: IndexedSection[]; startIndex: number }
  | { kind: 'parallel'; main: IndexedSection[]; beginner: IndexedSection[]; startIndex: number }

function groupSectionsForRender(sections: TrainingPlanSectionResponse[]): SectionRenderItem[] {
  const result: SectionRenderItem[] = []
  let i = 0
  while (i < sections.length) {
    const s = sections[i]
    const group = s.group ?? 'ALL'
    if (group === 'MAIN' || group === 'BEGINNER') {
      const mainBatch: IndexedSection[] = []
      const beginnerBatch: IndexedSection[] = []
      const startIndex = i
      while (i < sections.length && (sections[i].group === 'MAIN' || sections[i].group === 'BEGINNER')) {
        if (sections[i].group === 'MAIN') mainBatch.push({ section: sections[i], index: i })
        else beginnerBatch.push({ section: sections[i], index: i })
        i++
      }
      result.push({ kind: 'parallel', main: mainBatch, beginner: beginnerBatch, startIndex })
    } else {
      const items: IndexedSection[] = []
      const startIndex = i
      while (i < sections.length && (sections[i].group ?? 'ALL') === 'ALL') {
        items.push({ section: sections[i], index: i })
        i++
      }
      result.push({ kind: 'all', items, startIndex })
    }
  }
  return result
}

function SectionCard({ section, drill, expanded, onToggle, stationPosition }: { section: TrainingPlanSectionResponse; drill: DrillResponse | undefined; expanded: boolean; onToggle: () => void; stationPosition: 'first' | 'middle' | 'last' | null }) {
  const style = styleFor(section.sectionType)
  const details = hasDetails(section, drill)
  const { Icon } = style
  const inStation = stationPosition !== null

  return (
    <div className={`${style.bg} border ${style.border} ${inStation ? 'border-l-4 border-l-navy-700 ml-2' : 'rounded-xl'} ${inStation ? (stationPosition === 'first' ? 'rounded-tr-xl rounded-tl-md' : stationPosition === 'last' ? 'rounded-br-xl rounded-bl-md' : 'rounded-md') : ''} overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        disabled={!details}
        className="w-full flex items-center gap-3 px-3 py-3 text-left cursor-pointer disabled:cursor-default"
      >
        <div className={`shrink-0 ${style.iconColor}`}>
          <Icon size={22} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-navy-500">{style.label}</div>
          <div className="font-bold text-navy-900 text-sm truncate">{section.title ?? '—'}</div>
        </div>
        {drill?.pdfPage && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); window.open(`/drills.pdf?t=${Date.now()}#page=${drill.pdfPage}`, 'drill-handbuch') }}
            className="shrink-0 text-[10px] font-bold tabular-nums text-navy-700 hover:text-navy-900 hover:underline cursor-pointer"
            title="Im Handbuch nachschlagen"
          >
            S.{drill.pdfPage} ↗
          </button>
        )}
        {section.parallelGroup != null && section.parallelGroup > 1 && (
          <span className="shrink-0 text-[10px] font-bold tabular-nums bg-navy-100 text-navy-800 px-1.5 py-0.5 rounded-md">
            {section.parallelGroup}× Stat.
          </span>
        )}
        {section.durationMinutes != null && (
          <span className="shrink-0 text-xs font-bold tabular-nums bg-white/70 text-navy-800 px-2 py-1 rounded-md border border-navy-100">
            {section.durationMinutes} min
          </span>
        )}
        {details && (
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 text-navy-500"
          >
            <ChevronDown size={18} />
          </motion.div>
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && details && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-2 space-y-2 text-sm text-navy-800 border-t border-cream-200 bg-white/40 leading-relaxed">
              {section.rounds != null && (
                <DetailRow label="Runden" value={String(section.rounds)} />
              )}
              {section.parallelGroup != null && section.parallelGroup > 0 && (
                <DetailRow label="Stationen" value={String(section.parallelGroup)} />
              )}
              {section.playersPerGroup != null && (
                <DetailRow label="Sp. / Station" value={String(section.playersPerGroup)} />
              )}
              {section.tips && (
                <DetailRow label="Tipps" value={section.tips} />
              )}
              {section.userNotes && (
                <DetailRow label="Notizen" value={section.userNotes} />
              )}
              {drill?.description && (
                <DetailRow label="Beschreibung" value={drill.description} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-navy-600 mb-0.5">{label}</div>
      <div className="text-sm text-navy-800 whitespace-pre-line leading-relaxed">{value}</div>
    </div>
  )
}

function MenuItem({ Icon, label, onClick, danger = false }: { Icon: typeof Pencil; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-cream-100 cursor-pointer ${danger ? 'text-softball-red-700' : 'text-navy-800'}`}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}

export function TrainingPlanView({ plans, loading = false, activePlanKind, onSwitchKind, drills, onEdit, onRegenerate, onDelete, onShare, onAddBeginnerGroup, onGenerateBeginnerPlan, onGenerateMain }: Props) {
  const activePlan = plans.find(p => p.kind === activePlanKind) ?? plans[0] ?? null
  const planContent = activePlan?.content ?? null
  const sections = planContent?.sections ?? []
  const renderItems = groupSectionsForRender(sections)
  const totalMinutes = sections.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0)
  const hasBeginnerGroup = sections.some(s => s.group === 'BEGINNER')
  const [groupView, setGroupView] = useState<'MAIN' | 'BEGINNER'>('MAIN')
  // Bei Inline-Anfängergruppe: pro Tab gemeinsame (ALL) + gruppen-eigene Blöcke
  const displayed: IndexedSection[] = sections
    .map((section, index) => ({ section, index }))
    .filter(it => !hasBeginnerGroup || (it.section.group ?? 'ALL') === 'ALL' || it.section.group === groupView)
  const displayedMinutes = displayed.reduce((sum, it) => sum + (it.section.durationMinutes ?? 0), 0)
  const hasBeginnerPlan = plans.some(p => p.kind === 'BEGINNER')
  const hasMainPlan = plans.some(p => p.kind === 'MAIN')
  const showKindTabs = plans.length >= 2
  const canGenerateSeparateBeginnerPlan = !hasBeginnerPlan && hasMainPlan && onGenerateBeginnerPlan != null
  const canGenerateSeparateMainPlan = !hasMainPlan && hasBeginnerPlan && onGenerateMain != null
  const initialExpanded = sections.length > 0 && sections.length <= 5
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(initialExpanded ? sections.map((_, i) => i) : []),
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Reset expansion when active plan changes
  useEffect(() => {
    const fresh = sections.length > 0 && sections.length <= 5
    setExpanded(new Set(fresh ? sections.map((_, i) => i) : []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlan?.id])

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const toggle = (idx: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const renderSectionSlice = (items: IndexedSection[], keyPrefix: string) => {
    const slice = items.map(it => it.section)
    const stationGroups = groupSections(slice)
    return stationGroups.map((g, gIdx) => {
      if (g.type === 'single') {
        const originalIdx = items[g.idx].index
        const s = items[g.idx].section
        const drill = s.drillId ? drills.find(d => d.id === s.drillId) : undefined
        return (
          <SectionCard
            key={`${keyPrefix}-s-${originalIdx}`}
            section={s}
            drill={drill}
            expanded={expanded.has(originalIdx)}
            onToggle={() => toggle(originalIdx)}
            stationPosition={null}
          />
        )
      }
      const isBattingGroup = g.indices.some(i => slice[i].sectionType === 'BATTING')
      const GroupIcon = isBattingGroup ? BatIcon : Boxes
      const groupLabel = isBattingGroup ? 'Batting Stationen' : 'Station · parallel'
      return (
        <div key={`${keyPrefix}-g-${gIdx}`} className="bg-navy-50 border border-navy-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-navy-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-navy-800 flex items-center gap-1.5">
              <GroupIcon size={14} className="text-softball-red-600" />
              {groupLabel}
            </span>
            {g.durationMinutes != null && (
              <span className="text-xs font-bold tabular-nums text-navy-900">{g.durationMinutes} min</span>
            )}
          </div>
          <div className="p-2 space-y-1.5">
            {g.indices.map((localIdx, i) => {
              const originalIdx = items[localIdx].index
              const s = items[localIdx].section
              const drill = s.drillId ? drills.find(d => d.id === s.drillId) : undefined
              const pos = i === 0 ? 'first' : i === g.indices.length - 1 ? 'last' : 'middle'
              return (
                <SectionCard
                  key={`${keyPrefix}-s-${originalIdx}`}
                  section={s}
                  drill={drill}
                  expanded={expanded.has(originalIdx)}
                  onToggle={() => toggle(originalIdx)}
                  stationPosition={pos}
                />
              )
            })}
          </div>
        </div>
      )
    })
  }

  const hasPlan = sections.length > 0

  if (loading) {
    return <TrainingPlanSkeleton />
  }

  return (
    <div data-training-plan-view>
      <div className="flex items-center justify-between mb-2 gap-2">
        <h2 className="font-display text-sm font-bold text-navy-700 uppercase tracking-wide">Trainingsplan</h2>
        <div className="flex items-center gap-2">
          {hasPlan && (
            <button
              type="button"
              onClick={onShare}
              aria-label="Plan teilen"
              className="text-xs font-semibold text-navy-700 hover:underline cursor-pointer flex items-center gap-1"
              title="Plan teilen"
            >
              <Share2 size={12} /> Teilen
            </button>
          )}
          <a
            href="/drills.pdf"
            target="drill-handbuch"
            className="text-xs font-semibold text-navy-700 hover:underline cursor-pointer flex items-center gap-1"
            title="Drill-Handbuch öffnen"
          >
            <BookOpen size={12} /> Handbuch
          </a>
        <div className="relative" ref={menuRef}>
          {hasPlan ? (
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Plan-Aktionen"
              aria-expanded={menuOpen}
              className="p-1.5 rounded-md text-navy-600 hover:bg-cream-100 cursor-pointer"
            >
              <MoreVertical size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onRegenerate}
              aria-label="Plan generieren"
              className="text-xs font-semibold text-softball-red-700 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Sparkles size={12} /> Generieren
            </button>
          )}
          {menuOpen && hasPlan && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-cream-300 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
              <MenuItem Icon={Pencil} label="Bearbeiten" onClick={() => { setMenuOpen(false); onEdit() }} />
              <MenuItem Icon={Share2} label="Teilen" onClick={() => { setMenuOpen(false); onShare() }} />
              <MenuItem Icon={Sparkles} label={activePlan?.kind === 'BEGINNER' ? 'Anfänger-Plan neu generieren' : 'Neu generieren'} onClick={() => { setMenuOpen(false); onRegenerate() }} />
              {canGenerateSeparateBeginnerPlan && (
                <MenuItem Icon={UserPlus} label="Separater Anfänger-Plan" onClick={() => { setMenuOpen(false); onGenerateBeginnerPlan!() }} />
              )}
              {canGenerateSeparateMainPlan && (
                <MenuItem Icon={UserPlus} label="Separater Hauptgruppen-Plan" onClick={() => { setMenuOpen(false); onGenerateMain!() }} />
              )}
              <div className="border-t border-cream-200 my-1" />
              <MenuItem Icon={Trash2} label={activePlan?.kind === 'BEGINNER' ? 'Anfänger-Plan löschen' : 'Löschen'} onClick={() => { setMenuOpen(false); onDelete() }} danger />
            </div>
          )}
        </div>
        </div>
      </div>

      {showKindTabs && (
        <div className="mb-3 inline-flex bg-cream-200 rounded-lg p-0.5" role="tablist" aria-label="Plan-Typ">
          <button
            role="tab"
            type="button"
            aria-selected={activePlanKind === 'MAIN'}
            onClick={() => onSwitchKind('MAIN')}
            className={`px-3 py-1.5 rounded font-display text-xs font-bold tracking-widest uppercase cursor-pointer transition-colors ${
              activePlanKind === 'MAIN'
                ? 'bg-navy-900 text-white'
                : 'text-navy-700 hover:bg-navy-100'
            }`}
          >
            Hauptgruppe
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={activePlanKind === 'BEGINNER'}
            onClick={() => onSwitchKind('BEGINNER')}
            className={`px-3 py-1.5 rounded font-display text-xs font-bold tracking-widest uppercase cursor-pointer transition-colors ${
              activePlanKind === 'BEGINNER'
                ? 'bg-amber-700 text-white'
                : 'text-amber-700 hover:bg-amber-100'
            }`}
          >
            Anfänger
          </button>
        </div>
      )}

      {hasBeginnerGroup && (
        <div className="mb-3 inline-flex bg-cream-200 rounded-lg p-0.5" role="tablist" aria-label="Gruppe">
          <button
            role="tab"
            type="button"
            aria-selected={groupView === 'MAIN'}
            onClick={() => setGroupView('MAIN')}
            className={`px-3 py-1.5 rounded font-display text-xs font-bold tracking-widest uppercase cursor-pointer transition-colors ${
              groupView === 'MAIN' ? 'bg-navy-900 text-white' : 'text-navy-700 hover:bg-navy-100'
            }`}
          >
            Hauptgruppe
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={groupView === 'BEGINNER'}
            onClick={() => setGroupView('BEGINNER')}
            className={`px-3 py-1.5 rounded font-display text-xs font-bold tracking-widest uppercase cursor-pointer transition-colors ${
              groupView === 'BEGINNER' ? 'bg-amber-700 text-white' : 'text-amber-700 hover:bg-amber-100'
            }`}
          >
            Anfänger
          </button>
        </div>
      )}

      {!loading && sections.length === 0 ? (
        <div className="bg-white border border-cream-300 rounded-2xl p-4 text-sm text-navy-700">
          <p className="opacity-70 italic">Noch kein Plan für dieses Training.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="text-[11px] text-navy-600 font-semibold tabular-nums pb-1">
            {formatTotal(hasBeginnerGroup ? displayedMinutes : totalMinutes)} · {hasBeginnerGroup ? displayed.length : sections.length} {(hasBeginnerGroup ? displayed.length : sections.length) === 1 ? 'Block' : 'Blöcke'}
          </div>
          {!hasBeginnerGroup && onAddBeginnerGroup && activePlan?.kind !== 'BEGINNER' && (
            <button
              type="button"
              onClick={onAddBeginnerGroup}
              aria-label="Anfänger-Gruppe hinzufügen"
              className="w-full mb-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 text-amber-800 text-xs font-bold uppercase tracking-wider hover:bg-amber-100 hover:border-amber-500 cursor-pointer transition-colors"
            >
              <UserPlus size={14} /> Anfänger-Gruppe hinzufügen
            </button>
          )}
          {hasBeginnerGroup && renderSectionSlice(displayed, 'grp')}
          {!hasBeginnerGroup && renderItems.map((item, idx) => {
            if (item.kind === 'all') {
              return (
                <div key={`all-${idx}`} className="space-y-1.5">
                  {renderSectionSlice(item.items, `all-${idx}`)}
                </div>
              )
            }
            return (
              <div key={`par-${idx}`} className="border-2 border-dashed border-cream-300 rounded-xl p-3">
                <div className="font-display text-[10px] tracking-widest uppercase text-navy-900 font-extrabold mb-2">
                  Skill-Phase · Hauptgruppe + Anfänger (parallel)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="font-display text-[10px] tracking-widest uppercase font-bold text-navy-800 mb-1.5 px-2 py-0.5 bg-navy-50 inline-block rounded">
                      Hauptgruppe
                    </div>
                    <div className="space-y-1.5">
                      {item.main.length > 0 ? (
                        renderSectionSlice(item.main, `par-${idx}-main`)
                      ) : (
                        <div className="text-xs text-navy-500 italic">—</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="font-display text-[10px] tracking-widest uppercase font-bold text-amber-800 mb-1.5 px-2 py-0.5 bg-amber-50 inline-block rounded">
                      Anfänger
                    </div>
                    <div className="space-y-1.5">
                      {item.beginner.length > 0 ? (
                        renderSectionSlice(item.beginner, `par-${idx}-beg`)
                      ) : (
                        <div className="text-xs text-navy-500 italic">—</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {planContent?.overallNotes && (
            <div className="mt-3 p-3 bg-cream-100 border border-cream-300 rounded-xl text-xs text-navy-800">
              <div className="text-[10px] font-bold uppercase tracking-wider text-navy-500 mb-1">Notizen</div>
              <div className="whitespace-pre-line">{planContent.overallNotes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
