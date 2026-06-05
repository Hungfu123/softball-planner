import { useRef, useState } from 'react'
import type { Station } from './deriveStations'
import { STATION_META } from './stationMeta'
import { assignPlayers } from './stationRoles'

interface Props {
  stations: Station[]
  size?: 'mini' | 'full'
  playerCount?: number
  editable?: boolean
  onMove?: (index: number, x: number, y: number) => void
}

const VB_W = 360
const VB_H = 320
const HOME = { x: 30, y: 286 }
const AREA = { x0: 60, x1: 336, y0: 44, y1: 266 } // füllt die Feld-Ecke besser aus

const toSvg = (nx: number, ny: number) => ({
  x: AREA.x0 + nx * (AREA.x1 - AREA.x0),
  y: AREA.y0 + ny * (AREA.y1 - AREA.y0),
})
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export function StationsDiagram({ stations, size = 'mini', playerCount = 0, editable = false, onMove }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  if (stations.length === 0) return null
  const full = size === 'full'

  const puckR = full ? 17 : 14
  const iconSize = full ? 18 : 15
  const labelSize = full ? 11 : 9
  const badgeR = full ? 9 : 7
  const badgeFont = full ? 11 : 9

  const { stations: withSlots, outfield } = assignPlayers(stations, playerCount)
  const pts = stations.map(s => toSvg(s.x, s.y))

  const groups = new Map<number, number[]>()
  stations.forEach((s, i) => {
    if (s.choiceGroup != null) {
      const arr = groups.get(s.choiceGroup) ?? []
      arr.push(i)
      groups.set(s.choiceGroup, arr)
    }
  })

  const eventToNorm = (e: React.PointerEvent) => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const vx = ((e.clientX - rect.left) / rect.width) * VB_W
    const vy = ((e.clientY - rect.top) / rect.height) * VB_H
    return {
      x: clamp01((vx - AREA.x0) / (AREA.x1 - AREA.x0)),
      y: clamp01((vy - AREA.y0) / (AREA.y1 - AREA.y0)),
    }
  }

  const Badge = ({ x, y, n, role }: { x: number; y: number; n: number; role: 'active' | 'passive' | 'single' }) => (
    <g style={{ pointerEvents: 'none' }}>
      <circle cx={x} cy={y} r={badgeR}
        fill={role === 'active' ? '#e23b32' : role === 'single' ? '#234a86' : '#13284a'}
        stroke={role === 'passive' ? '#9fb3d1' : '#f4ecd8'} strokeWidth={role === 'passive' ? 1.5 : 2} />
      <text x={x} y={y + badgeFont * 0.34} textAnchor="middle" fill="#f4ecd8" fontSize={badgeFont} fontWeight={800}
        style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</text>
    </g>
  )

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{ background: 'radial-gradient(120% 90% at 15% 0%, #16305c 0%, transparent 55%), linear-gradient(135deg,#13284a,#0d1b34)' }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto block"
        style={{ touchAction: editable ? 'none' : undefined }}
        onPointerMove={e => { if (dragIdx != null && onMove) { const n = eventToNorm(e); if (n) onMove(dragIdx, n.x, n.y) } }}
        onPointerUp={() => setDragIdx(null)}
        onPointerLeave={() => setDragIdx(null)}
      >
        <path d={`M${HOME.x} ${HOME.y} L${HOME.x} 30`} stroke="rgba(244,236,216,.45)" strokeWidth={4} strokeLinecap="round" fill="none" />
        <path d={`M${HOME.x} ${HOME.y} L${VB_W - 18} ${HOME.y}`} stroke="rgba(244,236,216,.45)" strokeWidth={4} strokeLinecap="round" fill="none" />
        <path d={`M${HOME.x - 7} ${HOME.y} l14 0 0 -8 -7 -7 -7 7 z`} fill="#f4ecd8" />

        {/* Roter Leitfaden — orthogonale Rotations-Route */}
        {pts.slice(1).map((p, i) => {
          const a = pts[i]
          const eps = 1.5
          const aligned = Math.abs(a.x - p.x) < eps || Math.abs(a.y - p.y) < eps
          const d = aligned ? `M${a.x} ${a.y} L${p.x} ${p.y}` : `M${a.x} ${a.y} L${p.x} ${a.y} L${p.x} ${p.y}`
          return (
            <path key={`route-${i}`} d={d} fill="none"
              stroke="#e23b32" strokeWidth={full ? 3 : 2.5} strokeDasharray="6 5" strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
          )
        })}
        {/* Richtungs-Pfeile (Mittelpunkt jedes Segments, klar sichtbar) */}
        {pts.slice(1).map((p, i) => {
          const a = pts[i]
          const eps = 1.5
          let mx: number, my: number, ang: number
          if (Math.abs(a.x - p.x) < eps || Math.abs(a.y - p.y) < eps) {
            mx = (a.x + p.x) / 2; my = (a.y + p.y) / 2
            ang = (Math.atan2(p.y - a.y, p.x - a.x) * 180) / Math.PI
          } else {
            // Knick a→(p.x,a.y)→p: Pfeil auf das längere Bein
            const legH = Math.abs(p.x - a.x), legV = Math.abs(p.y - a.y)
            if (legH >= legV) { mx = (a.x + p.x) / 2; my = a.y; ang = p.x > a.x ? 0 : 180 }
            else { mx = p.x; my = (a.y + p.y) / 2; ang = p.y > a.y ? 90 : -90 }
          }
          const s = full ? 6 : 5
          return (
            <path key={`arr-${i}`} d={`M${-s} ${-s} L${s * 1.4} 0 L${-s} ${s} Z`} fill="#e23b32"
              transform={`translate(${mx} ${my}) rotate(${ang})`} style={{ pointerEvents: 'none' }} />
          )
        })}

        {[...groups.values()].filter(idxs => idxs.length > 1).map((idxs, gi) => {
          const xs = idxs.map(i => pts[i].x)
          const ys = idxs.map(i => pts[i].y)
          const pad = puckR + (full ? 20 : 15)
          const x = Math.min(...xs) - pad
          const y = Math.min(...ys) - pad
          const w = Math.max(...xs) - Math.min(...xs) + pad * 2
          const h = Math.max(...ys) - Math.min(...ys) + pad * 2
          return (
            <g key={`choice-${gi}`}>
              <rect x={x} y={y} width={w} height={h} rx={12} fill="rgba(231,185,74,.08)" stroke="#e7b94a" strokeWidth={1.5} strokeDasharray="7 6" />
              <text x={x + w / 2} y={y - 4} textAnchor="middle" fill="#e7b94a" fontSize={labelSize} fontWeight={700} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>Wähle 1</text>
            </g>
          )
        })}

        {/* Outfield — verteilt im offenen Feld (Sicherheitsabstand zu den Schlag-Stationen) */}
        {outfield.length > 0 && (() => {
          const n = outfield.length
          const xL = AREA.x0 + 0.34 * (AREA.x1 - AREA.x0)
          const xR = AREA.x0 + 0.78 * (AREA.x1 - AREA.x0)
          const yBase = AREA.y0 + 0.42 * (AREA.y1 - AREA.y0)
          const perRow = Math.min(5, n)
          const gapY = badgeR * 2 + 8
          return (
            <g style={{ pointerEvents: 'none' }}>
              <text x={(xL + xR) / 2} y={yBase - badgeR - 7} textAnchor="middle" fill="#9fb3d1" fontSize={labelSize} fontWeight={700} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>Outfield</text>
              {outfield.map((num, i) => {
                const row = Math.floor(i / perRow)
                const rowCount = Math.min(perRow, n - row * perRow)
                const idxInRow = i % perRow
                const bx = rowCount === 1 ? (xL + xR) / 2 : xL + (idxInRow / (rowCount - 1)) * (xR - xL)
                const by = yBase + row * gapY
                return <Badge key={num} x={bx} y={by} n={num} role="single" />
              })}
            </g>
          )
        })()}

        {withSlots.map((st, i) => {
          const meta = STATION_META[st.type]
          const Icon = meta.Icon
          const { x, y } = pts[i]
          const fill = meta.accent ? '#e23b32' : '#234a86'
          return (
            <g key={i} style={{ cursor: editable ? 'move' : 'default' }}
              onPointerDown={editable ? e => { (e.target as Element).setPointerCapture?.(e.pointerId); setDragIdx(i) } : undefined}>
              {st.type === 'LIVE' ? (
                <rect x={x - puckR} y={y - puckR} width={puckR * 2} height={puckR * 2} rx={4}
                  transform={`rotate(45 ${x} ${y})`} fill={fill} stroke="#f4ecd8" strokeWidth={2.5} />
              ) : (
                <circle cx={x} cy={y} r={puckR} fill={fill} stroke="#f4ecd8" strokeWidth={2.5} />
              )}
              <g transform={`translate(${x - iconSize / 2} ${y - iconSize / 2})`} style={{ pointerEvents: 'none' }}>
                <Icon size={iconSize} className="text-cream-50" />
              </g>
              {st.slots.length === 1 ? (
                <Badge x={x} y={y - puckR - badgeR - 1} n={st.slots[0].number} role="single" />
              ) : (
                <>
                  {/* seitlich am Puck: aktiv links, passiv rechts → weniger Höhe, keine Kollision */}
                  <Badge x={x - puckR - badgeR + 2} y={y} n={st.slots[0].number} role="active" />
                  <Badge x={x + puckR + badgeR - 2} y={y} n={st.slots[1].number} role="passive" />
                </>
              )}
              <text x={x} y={y + puckR + labelSize + 3} textAnchor="middle" fill="#f4ecd8" fontSize={labelSize} fontWeight={700} style={{ pointerEvents: 'none' }}>{st.label}</text>
              {full && st.slots.length === 2 && (
                <text x={x} y={y + puckR + labelSize * 2 + 4} textAnchor="middle" fill="#9fb3d1" fontSize={labelSize - 1} fontWeight={600} style={{ pointerEvents: 'none' }}>
                  {st.slots[0].number} {st.slots[0].roleLabel} · {st.slots[1].number} {st.slots[1].roleLabel}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="px-3 py-2 border-t border-cream-100/10 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-cream-300">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#e23b32' }} /> aktiv (ungerade)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full border" style={{ borderColor: '#9fb3d1' }} /> passiv/Hilfe (gerade)
        </span>
        <span className="text-cream-300/80">Rotation entlang Pfeile: passiv → aktiv → weiter zur nächsten Station · Outfield rotiert nach</span>
      </div>
    </div>
  )
}
