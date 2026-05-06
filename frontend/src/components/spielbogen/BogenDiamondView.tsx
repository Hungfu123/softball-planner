import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { BogenBaseStateDto, SpielbogenSlotResponse } from '@/types'

interface Props {
  baseState: BogenBaseStateDto | null
  slots: SpielbogenSlotResponse[]
  /** When set: HR-Runner travels Home → 1B → 2B → 3B → Home, then fades. */
  homerunRunner?: { slotId: number; name: string; battingOrder: number } | null
  /** Tap auf Runner → callback (z.B. für Quick-Stealing). */
  onRunnerTap?: (runner: { slotId: number; name: string; battingOrder: number; base: 1 | 2 | 3 }) => void
}

// Positions im 220x220 viewBox (gleich wie DiamondView)
const POS = {
  home: { cx: 110, cy: 185 },
  first: { cx: 178, cy: 110 },
  second: { cx: 110, cy: 35 },
  third: { cx: 42, cy: 110 },
} as const

function truncate(name: string, max = 6): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

function posForIndex(i: number) {
  if (i === 0) return POS.home
  if (i === 1) return POS.first
  if (i === 2) return POS.second
  if (i === 3) return POS.third
  return POS.home
}

interface RunnerData {
  slotId: number
  name: string
  battingOrder: number
  base: 1 | 2 | 3
}

function Runner({ r, onTap }: { r: RunnerData; onTap?: (r: RunnerData) => void }) {
  const [lastBase, setLastBase] = useState<number>(0)

  const waypoints = useMemo(() => {
    const xs: number[] = []
    const ys: number[] = []
    const start = Math.min(lastBase, r.base)
    const end = Math.max(lastBase, r.base)
    for (let b = start; b <= end; b++) {
      const pos = posForIndex(b)
      xs.push(pos.cx)
      ys.push(pos.cy)
    }
    if (lastBase > r.base) { xs.reverse(); ys.reverse() }
    return { xs, ys }
  }, [r.base, lastBase])

  const distance = Math.abs(r.base - lastBase)
  const hasKeyframes = waypoints.xs.length > 1

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.6, x: POS.home.cx, y: POS.home.cy }}
      animate={{
        opacity: 1,
        scale: 1,
        x: hasKeyframes ? waypoints.xs : waypoints.xs[0],
        y: hasKeyframes ? waypoints.ys : waypoints.ys[0],
      }}
      exit={{ opacity: 0, scale: 0.6, x: POS.home.cx, y: POS.home.cy }}
      transition={{
        duration: 0.3 + Math.max(1, distance) * 0.25,
        ease: 'easeInOut',
      }}
      onAnimationComplete={() => { if (lastBase !== r.base) setLastBase(r.base) }}
      style={{ cursor: onTap ? 'pointer' : 'default' }}
      onClick={() => onTap?.(r)}
    >
      <circle cx={0} cy={0} r="18" fill="#172554" stroke="#fff" strokeWidth="2" />
      <text x={0} y={-4} textAnchor="middle" fontSize="8" fontWeight="700" fill="white" style={{ pointerEvents: 'none' }}>
        #{r.battingOrder}
      </text>
      <text x={0} y={7} textAnchor="middle" fontSize="7" fontWeight="600" fill="white" style={{ pointerEvents: 'none' }}>
        {truncate(r.name)}
      </text>
    </motion.g>
  )
}

interface StaticBaseProps {
  pos: { cx: number; cy: number }
  label: string
  occupied: boolean
}

function StaticBase({ pos, label, occupied }: StaticBaseProps) {
  return (
    <g>
      <motion.rect
        x={pos.cx - 14}
        y={pos.cy - 14}
        width="28"
        height="28"
        rx="3"
        transform={`rotate(45 ${pos.cx} ${pos.cy})`}
        animate={{
          fill: occupied ? '#dc2626' : 'rgba(0,0,0,0)',
          stroke: occupied ? '#b91c1c' : '#9ca3af',
        }}
        transition={{ duration: 0.3 }}
        strokeWidth="1.5"
      />
      {!occupied && (
        <text x={pos.cx} y={pos.cy + 4} textAnchor="middle" fontSize="9" fontWeight="500" fill="#9ca3af">
          {label}
        </text>
      )}
    </g>
  )
}

export function BogenDiamondView({ baseState, slots, homerunRunner, onRunnerTap }: Props) {
  const runners: RunnerData[] = useMemo(() => {
    if (!baseState) return []
    const result: RunnerData[] = []
    const pairs: Array<{ slotId: number | null | undefined; base: 1 | 2 | 3 }> = [
      { slotId: baseState.firstSlotId, base: 1 },
      { slotId: baseState.secondSlotId, base: 2 },
      { slotId: baseState.thirdSlotId, base: 3 },
    ]
    for (const { slotId, base } of pairs) {
      if (slotId == null) continue
      const slot = slots.find(s => s.id === slotId)
      if (!slot) continue
      result.push({ slotId, name: slot.name, battingOrder: slot.battingOrder, base })
    }
    return result
  }, [baseState, slots])

  return (
    <div className="flex justify-center py-2">
      <svg viewBox="0 0 220 220" className="w-full max-w-[280px]">
        {/* Base paths */}
        <path
          d={`M ${POS.home.cx} ${POS.home.cy}
              L ${POS.first.cx} ${POS.first.cy}
              L ${POS.second.cx} ${POS.second.cy}
              L ${POS.third.cx} ${POS.third.cy} Z`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />

        {/* Bases */}
        <StaticBase pos={POS.first} label="1B" occupied={baseState?.firstSlotId != null} />
        <StaticBase pos={POS.second} label="2B" occupied={baseState?.secondSlotId != null} />
        <StaticBase pos={POS.third} label="3B" occupied={baseState?.thirdSlotId != null} />

        {/* Home plate */}
        <polygon
          points={`${POS.home.cx - 12},${POS.home.cy - 4}
                   ${POS.home.cx + 12},${POS.home.cy - 4}
                   ${POS.home.cx + 12},${POS.home.cy + 5}
                   ${POS.home.cx},${POS.home.cy + 12}
                   ${POS.home.cx - 12},${POS.home.cy + 5}`}
          fill="white"
          stroke="#9ca3af"
          strokeWidth="1.5"
        />
        <text x={POS.home.cx} y={POS.home.cy + 24} textAnchor="middle" fontSize="8" fill="#9ca3af">
          Home
        </text>

        {/* Animated runners */}
        <AnimatePresence>
          {runners.map(r => (
            <Runner key={r.slotId} r={r} onTap={onRunnerTap} />
          ))}
        </AnimatePresence>

        {/* Homerun runner — travels Home → 1B → 2B → 3B → Home, then fades */}
        <AnimatePresence>
          {homerunRunner && (
            <motion.g
              key={`hr-${homerunRunner.slotId}`}
              initial={{ opacity: 0, scale: 0.6, x: POS.home.cx, y: POS.home.cy }}
              animate={{
                opacity: [0, 1, 1, 1, 1, 1],
                scale: [0.6, 1, 1, 1, 1, 1.2],
                x: [POS.home.cx, POS.first.cx, POS.second.cx, POS.third.cx, POS.home.cx, POS.home.cx],
                y: [POS.home.cy, POS.first.cy, POS.second.cy, POS.third.cy, POS.home.cy, POS.home.cy],
              }}
              exit={{ opacity: 0, scale: 1.4 }}
              transition={{ duration: 2.0, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 0.95, 1] }}
            >
              <circle cx={0} cy={0} r="18" fill="#CC2936" stroke="#fff" strokeWidth="2.5" />
              <text x={0} y={-4} textAnchor="middle" fontSize="8" fontWeight="700" fill="white" style={{ pointerEvents: 'none' }}>
                #{homerunRunner.battingOrder}
              </text>
              <text x={0} y={7} textAnchor="middle" fontSize="7" fontWeight="600" fill="white" style={{ pointerEvents: 'none' }}>
                {truncate(homerunRunner.name)}
              </text>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  )
}
