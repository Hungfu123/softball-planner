import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { BaseStateDto, RunnerOnBase } from '@/types'

interface Props {
  baseState: BaseStateDto
  runners: RunnerOnBase[]
  onRunnerTap?: (base: 1 | 2 | 3, runner: RunnerOnBase) => void
  /** Wenn gesetzt: HR-Runner läuft über alle Bases Home → 1B → 2B → 3B → Home und fadet aus. */
  homerunRunner?: { playerId: number; playerName: string; battingOrder: number | null } | null
  /** Wenn true: Runner-Exit fadet in-place statt durch Bases zu Home zu laufen.
      Für Undo: Runner soll nicht so wirken als hätte er gescort. */
  skipExitToHome?: boolean
  /** Player-IDs deren Exit als Out gilt (in-place fade statt Home-Animation).
      Für CAUGHT_STEALING und OUT_ON_PLAY. */
  outRunnerIds?: Set<number>
}

// Positions im 220x220 viewBox
const POS = {
  home: { cx: 110, cy: 190 },
  first: { cx: 180, cy: 110 },
  second: { cx: 110, cy: 30 },
  third: { cx: 40, cy: 110 },
} as const

function truncate(name: string, max = 7): string {
  if (!name) return ''
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

export function DiamondView({ baseState, runners, onRunnerTap, homerunRunner, skipExitToHome, outRunnerIds }: Props) {
  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[420px] mx-auto">
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

      {/* Runners — bei erstem Erscheinen laufen sie über alle Zwischenbases.
          Danach: simple Position-Animation (z.B. Advance von 1B → 2B direkt). */}
      <AnimatePresence>
        {runners.map(r => (
          <Runner
            key={r.playerId}
            r={r}
            onRunnerTap={onRunnerTap}
            skipExitToHome={skipExitToHome || outRunnerIds?.has(r.playerId)}
          />
        ))}
      </AnimatePresence>

      {/* Homerun-Runner — rennt Home → 1B → 2B → 3B → Home, dann fade */}
      <AnimatePresence>
        {homerunRunner && (
          <motion.g
            key={`hr-${homerunRunner.playerId}`}
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
            {homerunRunner.battingOrder != null && (
              <text x={0} y={-4} textAnchor="middle" className="fill-white text-[8px] font-bold pointer-events-none">
                #{homerunRunner.battingOrder}
              </text>
            )}
            <text x={0} y={7} textAnchor="middle" className="fill-white text-[9px] font-semibold pointer-events-none">
              {truncate(homerunRunner.playerName)}
            </text>
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  )
}

/**
 * Base-Index für Waypoint-Berechnung: 0 = Home, 1-3 = Bases.
 * Gibt Position für jeden Index zurück.
 */
function posForIndex(i: number) {
  if (i === 0) return POS.home
  if (i === 1) return POS.first
  if (i === 2) return POS.second
  if (i === 3) return POS.third
  return POS.home
}

/**
 * Runner mit Waypoint-Animation:
 * Läuft immer von der VORHERIGEN Base über alle Zwischenbases zur
 * aktuellen. Auf Initial-Mount: von Home (0). Nach Advance 1→3 (Double):
 * über 2B. Nach direktem Advance 1→2: einfach 1B→2B.
 *
 * lastBase-State merkt wo wir waren. Nach onAnimationComplete wird
 * er auf die aktuelle Base aktualisiert.
 */
function Runner({ r, onRunnerTap, skipExitToHome }: { r: RunnerOnBase; onRunnerTap?: (base: 1 | 2 | 3, runner: RunnerOnBase) => void; skipExitToHome?: boolean }) {
  // lastBase = 0 auf Initial-Mount (Runner kommt von Home)
  const [lastBase, setLastBase] = useState<number>(0)

  // Waypoints: jede Base zwischen lastBase und r.base
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
    // Wenn Runner rückwärts läuft (selten, via Korrektur), Reihenfolge anpassen
    if (lastBase > r.base) { xs.reverse(); ys.reverse() }
    return { xs, ys }
  }, [r.base, lastBase])

  // Exit-Waypoints: wenn Runner scort (verlässt baseList), Animation über
  // verbleibende Bases zu Home, statt direkt zu teleportieren.
  // Beispiel: Runner war auf 1B, scort via Double → Animation 1B → 2B → 3B → Home.
  const exitWaypoints = useMemo(() => {
    const xs: number[] = []
    const ys: number[] = []
    // Start = aktuelle Position (r.base, gleich der letzten animierten Position)
    for (let b = r.base; b <= 3; b++) {
      const pos = posForIndex(b)
      xs.push(pos.cx)
      ys.push(pos.cy)
    }
    // End = Home
    xs.push(POS.home.cx)
    ys.push(POS.home.cy)
    return { xs, ys }
  }, [r.base])

  const distance = Math.abs(r.base - lastBase)
  const hasKeyframes = waypoints.xs.length > 1
  const currentPos = posForIndex(r.base)

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.6, x: POS.home.cx, y: POS.home.cy }}
      animate={{
        opacity: 1,
        scale: 1,
        x: hasKeyframes ? waypoints.xs : waypoints.xs[0],
        y: hasKeyframes ? waypoints.ys : waypoints.ys[0],
      }}
      exit={skipExitToHome ? {
        // Undo: in-place fade (Runner geht NICHT nach Home)
        opacity: 0,
        scale: 0.4,
        x: currentPos.cx,
        y: currentPos.cy,
        transition: { duration: 0.4, ease: 'easeOut' },
      } : {
        opacity: [1, 1, 0],
        scale: [1, 1, 0.6],
        x: exitWaypoints.xs,
        y: exitWaypoints.ys,
        transition: {
          duration: 0.3 + (4 - r.base) * 0.25,
          ease: 'easeInOut',
        },
      }}
      transition={{
        duration: 0.3 + Math.max(1, distance) * 0.25,
        ease: 'easeInOut',
      }}
      onAnimationComplete={() => { if (lastBase !== r.base) setLastBase(r.base) }}
      style={{ cursor: onRunnerTap ? 'pointer' : 'default' }}
      onClick={() => onRunnerTap?.(r.base as 1 | 2 | 3, r)}
    >
      <circle cx={0} cy={0} r="18" fill="#172554" stroke="#fff" strokeWidth="2" />
      {r.battingOrder != null && (
        <text x={0} y={-4} textAnchor="middle" className="fill-white text-[8px] font-bold pointer-events-none">
          #{r.battingOrder}
        </text>
      )}
      <text x={0} y={7} textAnchor="middle" className="fill-white text-[9px] font-semibold pointer-events-none">
        {truncate(r.playerName)}
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
