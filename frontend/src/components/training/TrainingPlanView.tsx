import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Flame, Target, Coffee, Trophy, ChevronDown, Circle, Pencil, MoreVertical, Sparkles, Trash2 } from 'lucide-react'
import type { TrainingPlanContentResponse, TrainingPlanSectionResponse } from '@/types'

type Props = {
  planContent: TrainingPlanContentResponse | null
  onEdit: () => void
  onRegenerate: () => void
  onDelete: () => void
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

function hasDetails(s: TrainingPlanSectionResponse): boolean {
  return !!(s.setupNotes || s.tips || s.rotationPlan || s.adaptationNotes || s.groupSetup || s.userNotes || s.rounds || s.playersPerGroup || s.parallelGroup)
}

function SectionCard({ section, expanded, onToggle }: { section: TrainingPlanSectionResponse; expanded: boolean; onToggle: () => void }) {
  const style = styleFor(section.sectionType)
  const details = hasDetails(section)
  const { Icon } = style

  return (
    <div className={`${style.bg} border ${style.border} rounded-xl overflow-hidden`}>
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
          <div className="font-display font-bold text-navy-900 text-sm truncate">{section.title ?? '—'}</div>
        </div>
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
            <div className="px-4 pb-3 pt-1 space-y-2 text-xs text-navy-800 border-t border-cream-200 bg-white/40">
              {section.rounds != null && (
                <DetailRow label="Runden" value={String(section.rounds)} />
              )}
              {section.parallelGroup != null && section.parallelGroup > 0 && (
                <DetailRow label="Stationen" value={String(section.parallelGroup)} />
              )}
              {section.playersPerGroup != null && (
                <DetailRow label="Sp. / Station" value={String(section.playersPerGroup)} />
              )}
              {section.setupNotes && (
                <DetailRow label="Setup" value={section.setupNotes} />
              )}
              {section.rotationPlan && (
                <DetailRow label="Rotation" value={section.rotationPlan} />
              )}
              {section.adaptationNotes && (
                <DetailRow label="Anpassung" value={section.adaptationNotes} />
              )}
              {section.groupSetup && (
                <DetailRow label="Gruppen" value={section.groupSetup} />
              )}
              {section.tips && (
                <DetailRow label="Tipps" value={section.tips} />
              )}
              {section.userNotes && (
                <DetailRow label="Notizen" value={section.userNotes} />
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
    <div className="flex gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-navy-500 w-20 shrink-0 pt-0.5">{label}</span>
      <span className="flex-1 leading-snug whitespace-pre-line">{value}</span>
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

export function TrainingPlanView({ planContent, onEdit, onRegenerate, onDelete }: Props) {
  const sections = planContent?.sections ?? []
  const totalMinutes = sections.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0)
  const initialExpanded = sections.length > 0 && sections.length <= 5
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(initialExpanded ? sections.map((_, i) => i) : []),
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

  const hasPlan = sections.length > 0

  return (
    <div data-training-plan-view>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-display text-sm font-bold text-navy-700 uppercase tracking-wide">Trainingsplan</h2>
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
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-cream-300 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
              <MenuItem Icon={Pencil} label="Bearbeiten" onClick={() => { setMenuOpen(false); onEdit() }} />
              <MenuItem Icon={Sparkles} label="Neu generieren" onClick={() => { setMenuOpen(false); onRegenerate() }} />
              <div className="border-t border-cream-200 my-1" />
              <MenuItem Icon={Trash2} label="Löschen" onClick={() => { setMenuOpen(false); onDelete() }} danger />
            </div>
          )}
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="bg-white border border-cream-300 rounded-2xl p-4 text-sm text-navy-700">
          <p className="opacity-70 italic">Noch kein Plan für dieses Training.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="text-[11px] text-navy-600 font-semibold tabular-nums pb-1">
            {formatTotal(totalMinutes)} · {sections.length} {sections.length === 1 ? 'Block' : 'Blöcke'}
          </div>
          {sections.map((s, idx) => (
            <SectionCard
              key={idx}
              section={s}
              expanded={expanded.has(idx)}
              onToggle={() => toggle(idx)}
            />
          ))}
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
