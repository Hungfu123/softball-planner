import { motion, AnimatePresence } from 'motion/react'
import type { BaseStateDto, RunnerOnBase } from '@/types'

interface Props {
  baseState: BaseStateDto
  runners: RunnerOnBase[]
  onRunnerTap?: (base: 1 | 2 | 3, runner: RunnerOnBase) => void
}

// Positions im 220x220 viewBox
const POS = {
  home: { cx: 110, cy: 190 },
  first: { cx: 180, cy: 110 },
  second: { cx: 110, cy: 30 },
  third: { cx: 40, cy: 110 },
} as const

function posForBase(base: number) {
  if (base === 1) return POS.first
  if (base === 2) return POS.second
  if (base === 3) return POS.third
  return POS.home
}

function truncate(name: string, max = 7): string {
  if (!name) return ''
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

export function DiamondView({ baseState, runners, onRunnerTap }: Props) {
  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[280px] mx-auto">
      {/* Base-Paths */}
      <path
        d={`M ${POS.home.cx} ${POS.home.cy}
            L ${POS.first.cx} ${POS.first.cy}
            L ${POS.second.cx} ${POS.second.cy}
            L ${POS.third.cx} ${POS.third.cy} Z`}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="2"
        strokeDasharray="4 3"
      />

      {/* Bases — statisch */}
      <StaticBase pos={POS.first} label="1B" occupied={baseState.first != null} />
      <StaticBase pos={POS.second} label="2B" occupied={baseState.second != null} />
      <StaticBase pos={POS.third} label="3B" occupied={baseState.third != null} />

      {/* Home Plate */}
      <polygon
        points={`${POS.home.cx - 14},${POS.home.cy - 5}
                 ${POS.home.cx + 14},${POS.home.cy - 5}
                 ${POS.home.cx + 14},${POS.home.cy + 6}
                 ${POS.home.cx},${POS.home.cy + 14}
                 ${POS.home.cx - 14},${POS.home.cy + 6}`}
        fill="#fff"
        stroke="#9ca3af"
        strokeWidth="1.5"
      />
      <text
        x={POS.home.cx}
        y={POS.home.cy + 28}
        textAnchor="middle"
        className="fill-gray-500 text-[9px] font-medium"
      >
        Home
      </text>

      {/* Runners — motion.g positioniert sich per x/y-translate,
          Children bewegen sich mit.
          - initial: Runner taucht am Home-Plate auf (als wäre er Batter) und läuft zur Base
          - animate: zur aktuellen Base-Position (bei Base-Wechsel animiert Motion automatisch)
          - exit: läuft zum Home-Plate während fade (= Runner scort) */}
      <AnimatePresence>
        {runners.map(r => {
          const p = posForBase(r.base)
          return (
            <motion.g
              key={r.playerId}
              initial={{ opacity: 0, scale: 0.6, x: POS.home.cx, y: POS.home.cy }}
              animate={{ opacity: 1, scale: 1, x: p.cx, y: p.cy }}
              exit={{
                opacity: 0,
                scale: 0.6,
                x: POS.home.cx,
                y: POS.home.cy,
              }}
              transition={{ type: 'spring', stiffness: 220, damping: 24 }}
              style={{ cursor: onRunnerTap ? 'pointer' : 'default' }}
              onClick={() => onRunnerTap?.(r.base as 1 | 2 | 3, r)}
            >
              {/* Kreis + Texte relativ zu 0/0 — bewegen sich mit dem g */}
              <circle
                cx={0}
                cy={0}
                r="18"
                fill="#172554"
                stroke="#fff"
                strokeWidth="2"
              />
              {r.battingOrder != null && (
                <text
                  x={0}
                  y={-4}
                  textAnchor="middle"
                  className="fill-white text-[8px] font-bold pointer-events-none"
                >
                  #{r.battingOrder}
                </text>
              )}
              <text
                x={0}
                y={7}
                textAnchor="middle"
                className="fill-white text-[9px] font-semibold pointer-events-none"
              >
                {truncate(r.playerName)}
              </text>
            </motion.g>
          )
        })}
      </AnimatePresence>
    </svg>
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
        x={pos.cx - 16}
        y={pos.cy - 16}
        width="32"
        height="32"
        rx="4"
        transform={`rotate(45 ${pos.cx} ${pos.cy})`}
        animate={{
          fill: occupied ? '#dc2626' : 'rgba(0,0,0,0)',
          stroke: occupied ? '#b91c1c' : '#9ca3af',
        }}
        transition={{ duration: 0.3 }}
        strokeWidth="2"
      />
      {!occupied && (
        <text
          x={pos.cx}
          y={pos.cy + 3}
          textAnchor="middle"
          className="fill-gray-400 text-[10px] font-medium pointer-events-none"
        >
          {label}
        </text>
      )}
    </g>
  )
}
