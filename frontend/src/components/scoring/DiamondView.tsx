import { motion } from 'motion/react'
import type { BaseStateDto, RunnerOnBase } from '@/types'

interface Props {
  baseState: BaseStateDto
  runners: RunnerOnBase[]
  onRunnerTap?: (base: 1 | 2 | 3, runner: RunnerOnBase) => void
}

// Base-Positions im 220x220 viewBox (rotiert 45° Diamond)
const BASE_POSITIONS = {
  home: { cx: 110, cy: 190 },
  first: { cx: 180, cy: 110 },
  second: { cx: 110, cy: 30 },
  third: { cx: 40, cy: 110 },
} as const

function truncate(name: string, max = 7): string {
  if (!name) return ''
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

export function DiamondView({ baseState, runners, onRunnerTap }: Props) {
  const runnerByBase = new Map<number, RunnerOnBase>()
  runners.forEach(r => runnerByBase.set(r.base, r))

  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[280px] mx-auto">
      {/* Base-Paths (dünne Linien) */}
      <path
        d={`M ${BASE_POSITIONS.home.cx} ${BASE_POSITIONS.home.cy}
            L ${BASE_POSITIONS.first.cx} ${BASE_POSITIONS.first.cy}
            L ${BASE_POSITIONS.second.cx} ${BASE_POSITIONS.second.cy}
            L ${BASE_POSITIONS.third.cx} ${BASE_POSITIONS.third.cy} Z`}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="2"
        strokeDasharray="4 3"
      />

      {/* Bases */}
      <Base
        base={1}
        pos={BASE_POSITIONS.first}
        runner={runnerByBase.get(1) ?? null}
        baseStateId={baseState.first}
        onTap={onRunnerTap}
      />
      <Base
        base={2}
        pos={BASE_POSITIONS.second}
        runner={runnerByBase.get(2) ?? null}
        baseStateId={baseState.second}
        onTap={onRunnerTap}
      />
      <Base
        base={3}
        pos={BASE_POSITIONS.third}
        runner={runnerByBase.get(3) ?? null}
        baseStateId={baseState.third}
        onTap={onRunnerTap}
      />

      {/* Home Plate — Pentagon */}
      <polygon
        points={`${BASE_POSITIONS.home.cx - 14},${BASE_POSITIONS.home.cy - 5}
                 ${BASE_POSITIONS.home.cx + 14},${BASE_POSITIONS.home.cy - 5}
                 ${BASE_POSITIONS.home.cx + 14},${BASE_POSITIONS.home.cy + 6}
                 ${BASE_POSITIONS.home.cx},${BASE_POSITIONS.home.cy + 14}
                 ${BASE_POSITIONS.home.cx - 14},${BASE_POSITIONS.home.cy + 6}`}
        fill="#fff"
        stroke="#9ca3af"
        strokeWidth="1.5"
      />
      <text
        x={BASE_POSITIONS.home.cx}
        y={BASE_POSITIONS.home.cy + 28}
        textAnchor="middle"
        className="fill-gray-500 text-[9px] font-medium"
      >
        Home
      </text>
    </svg>
  )
}

interface BaseProps {
  base: 1 | 2 | 3
  pos: { cx: number; cy: number }
  runner: RunnerOnBase | null
  baseStateId: number | null
  onTap?: (base: 1 | 2 | 3, runner: RunnerOnBase) => void
}

function Base({ base, pos, runner, baseStateId, onTap }: BaseProps) {
  const occupied = baseStateId != null && runner != null
  const baseLabel = base === 1 ? '1B' : base === 2 ? '2B' : '3B'

  return (
    <g>
      {/* Base-Rechteck (rotiert 45°) */}
      <rect
        x={pos.cx - 16}
        y={pos.cy - 16}
        width="32"
        height="32"
        rx="4"
        transform={`rotate(45 ${pos.cx} ${pos.cy})`}
        fill={occupied ? '#059669' : 'transparent'}
        stroke={occupied ? '#047857' : '#9ca3af'}
        strokeWidth="2"
      />
      {/* Base-Label (sichtbar nur wenn leer) */}
      {!occupied && (
        <text
          x={pos.cx}
          y={pos.cy + 3}
          textAnchor="middle"
          className="fill-gray-400 text-[10px] font-medium"
        >
          {baseLabel}
        </text>
      )}
      {/* Runner-Kreis + Name */}
      {occupied && runner && (
        <motion.g
          layoutId={`runner-${runner.playerId}`}
          initial={false}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{ cursor: onTap ? 'pointer' : 'default' }}
          onClick={() => onTap?.(base, runner)}
        >
          <circle
            cx={pos.cx}
            cy={pos.cy}
            r="18"
            fill="#172554"
            stroke="#fff"
            strokeWidth="2"
          />
          {runner.battingOrder != null && (
            <text
              x={pos.cx}
              y={pos.cy - 4}
              textAnchor="middle"
              className="fill-white text-[8px] font-bold"
            >
              #{runner.battingOrder}
            </text>
          )}
          <text
            x={pos.cx}
            y={pos.cy + 7}
            textAnchor="middle"
            className="fill-white text-[9px] font-semibold"
          >
            {truncate(runner.playerName)}
          </text>
        </motion.g>
      )}
    </g>
  )
}
