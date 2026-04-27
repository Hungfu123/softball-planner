import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { AtBatResult } from '@/types'

interface Props {
  onRecord: (result: AtBatResult) => void
  disabled?: boolean
}

type Mode = 'idle' | 'hit-expanded'

export function ActionButtons({ onRecord, disabled }: Props) {
  const [mode, setMode] = useState<Mode>('idle')

  const handleHit = () => setMode('hit-expanded')
  const handleCancel = () => setMode('idle')

  const handleRecord = (result: AtBatResult) => {
    onRecord(result)
    setMode('idle')
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="wait">
        {mode === 'idle' ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.12 }}
            className="space-y-2"
          >
            {/* Reihe 1: 3 Primary Buttons (72px) */}
            <div className="grid grid-cols-3 gap-2">
              <PrimaryButton color="emerald" label="TREFFER" onClick={handleHit} disabled={disabled} />
              <PrimaryButton color="red" label="STRIKEOUT" onClick={() => handleRecord('STRIKEOUT')} disabled={disabled} />
              <PrimaryButton color="gray" label="AUS" subtitle="Grounder / Fly" onClick={() => handleRecord('OUT')} disabled={disabled} />
            </div>
            {/* Reihe 2: 2 Secondary Buttons (60px) */}
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton color="sky" label="WALK" onClick={() => handleRecord('WALK')} disabled={disabled} />
              <SecondaryButton color="amber" label="HBP" subtitle="Hit-by-Pitch" onClick={() => handleRecord('HIT_BY_PITCH')} disabled={disabled} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="hit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.12 }}
            className="space-y-2"
          >
            <div className="grid grid-cols-4 gap-2">
              <HitSubButton label="Single" onClick={() => handleRecord('SINGLE')} />
              <HitSubButton label="Double" onClick={() => handleRecord('DOUBLE')} />
              <HitSubButton label="Triple" onClick={() => handleRecord('TRIPLE')} />
              <HitSubButton label="Homerun" onClick={() => handleRecord('HOMERUN')} accent />
            </div>
            <button
              onClick={handleCancel}
              className="w-full h-11 rounded-lg border border-cream-300 text-gray-600 text-sm font-medium hover:bg-cream-200 cursor-pointer"
            >
              ← Abbrechen
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/*
 * Button-Farben nach Outcome-Semantik (WCAG-AA auf weißem Text):
 *   navy-800   → TREFFER (Brand-Haupt, aktives Positives)
 *   emerald-600 → WALK (free base, entspanntes Positives)
 *   softball-red-600 → STRIKEOUT (Out, negativ)
 *   gray-500   → AUS (neutral, Grounder/Fly)
 *   amber-600  → HBP (Warn/Schmerz — dunkler als -500 für AA-Kontrast mit white)
 */
const COLOR_CLASSES = {
  emerald: 'bg-navy-800 hover:bg-navy-900 active:bg-navy-950 text-white',
  red: 'bg-softball-red-600 hover:bg-softball-red-700 active:bg-softball-red-800 text-white',
  gray: 'bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white',
  sky: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white',
  amber: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white',
} as const

type Color = keyof typeof COLOR_CLASSES

function PrimaryButton({ color, label, subtitle, onClick, disabled }: { color: Color; label: string; subtitle?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-display h-16 sm:h-[72px] rounded-xl font-extrabold text-base sm:text-lg tracking-widest uppercase cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-0.5 ${COLOR_CLASSES[color]}`}
    >
      <span>{label}</span>
      {subtitle && <span className="font-body text-[9px] sm:text-[10px] font-medium opacity-85 tracking-normal normal-case">{subtitle}</span>}
    </button>
  )
}

function SecondaryButton({ color, label, subtitle, onClick, disabled }: { color: Color; label: string; subtitle?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-display h-12 sm:h-[60px] rounded-xl font-extrabold text-sm sm:text-base tracking-widest uppercase cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-0.5 ${COLOR_CLASSES[color]}`}
    >
      <span>{label}</span>
      {subtitle && <span className="font-body text-[9px] sm:text-[10px] font-medium opacity-85 tracking-normal normal-case">{subtitle}</span>}
    </button>
  )
}

function HitSubButton({ label, onClick, accent }: { label: string; onClick: () => void; accent?: boolean }) {
  const cls = accent
    ? 'bg-gradient-to-br from-navy-700 to-softball-red-600 text-white'
    : 'bg-navy-800 hover:bg-navy-900 active:bg-navy-950 text-white'
  return (
    <button
      onClick={onClick}
      className={`font-display h-16 sm:h-[72px] rounded-xl font-extrabold text-base sm:text-lg tracking-widest uppercase cursor-pointer transition-colors ${cls}`}
    >
      {label}
    </button>
  )
}
