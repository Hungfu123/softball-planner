import { useRef, useState } from 'react'
import type { Station } from './deriveStations'
import { STATION_META } from './stationMeta'

interface Props {
  stations: Station[]
  size?: 'mini' | 'full'
  /** Wenn true, sind die Marker per Drag verschiebbar. */
  editable?: boolean
  /** Callback beim Verschieben: neue normalisierte Position (0..1). */
  onMove?: (index: number, x: number, y: number) => void
}

// Feld-Koordinatensystem (Lageplan). Home-Plate unten-links, Foul-Linien = die Ecke.
const VB_W = 360
const VB_H = 300
const HOME = { x: 30, y: 262 }
const AREA = { x0: 82, x1: 312, y0: 52, y1: 212 } // Stationen-Bereich (entspricht 0..1)

const toSvg = (nx: number, ny: number) => ({
  x: AREA.x0 + nx * (AREA.x1 - AREA.x0),
  y: AREA.y0 + ny * (AREA.y1 - AREA.y0),
})
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export function StationsDiagram({ stations, size = 'mini', editable = false, onMove }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  if (stations.length === 0) return null
  const full = size === 'full'

  const puckR = full ? 17 : 14
  const numSize = full ? 17 : 14
  const iconSize = full ? 13 : 11
  const labelSize = full ? 11 : 9

  const pts = stations.map(s => toSvg(s.x, s.y))

  // Choice-Gruppen für "WÄHLE 1"-Rahmen
  const groups = new Map<number, number[]>()
  stations.forEach((s, i) => {
    if (s.choiceGroup != null) {
      const arr = groups.get(s.choiceGroup) ?? []
      arr.push(i)
      groups.set(s.choiceGroup, arr)
    }
  })

  // Client-Koordinaten → normalisierte Feld-Position
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
        onPointerMove={e => {
          if (dragIdx == null || !onMove) return
          const n = eventToNorm(e)
          if (n) onMove(dragIdx, n.x, n.y)
        }}
        onPointerUp={() => setDragIdx(null)}
        onPointerLeave={() => setDragIdx(null)}
      >
        <defs>
          <marker id="leitfaden-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="#e23b32" />
          </marker>
        </defs>

        {/* Feld: Foul-Linien (die Ecke) + Home-Plate */}
        <path d={`M${HOME.x} ${HOME.y} L${HOME.x} 30`} stroke="rgba(244,236,216,.45)" strokeWidth={4} strokeLinecap="round" fill="none" />
        <path d={`M${HOME.x} ${HOME.y} L${VB_W - 18} ${HOME.y}`} stroke="rgba(244,236,216,.45)" strokeWidth={4} strokeLinecap="round" fill="none" />
        <path d={`M${HOME.x - 7} ${HOME.y} l14 0 0 -8 -7 -7 -7 7 z`} fill="#f4ecd8" />

        {/* Roter Leitfaden — Rotations-Route mit Pfeilen */}
        {pts.slice(1).map((p, i) => (
          <line
            key={`route-${i}`}
            x1={pts[i].x} y1={pts[i].y} x2={p.x} y2={p.y}
            stroke="#e23b32" strokeWidth={full ? 3 : 2.5} strokeDasharray="6 5" strokeLinecap="round"
            markerEnd="url(#leitfaden-arrow)" opacity={0.9}
          />
        ))}

        {/* WÄHLE-1-Rahmen um Choice-Gruppen */}
        {[...groups.values()].filter(idxs => idxs.length > 1).map((idxs, gi) => {
          const xs = idxs.map(i => pts[i].x)
          const ys = idxs.map(i => pts[i].y)
          const pad = puckR + (full ? 16 : 12)
          const x = Math.min(...xs) - pad
          const y = Math.min(...ys) - pad
          const w = Math.max(...xs) - Math.min(...xs) + pad * 2
          const h = Math.max(...ys) - Math.min(...ys) + pad * 2
          return (
            <g key={`choice-${gi}`}>
              <rect x={x} y={y} width={w} height={h} rx={12} fill="rgba(231,185,74,.08)" stroke="#e7b94a" strokeWidth={1.5} strokeDasharray="7 6" />
              <text x={x + w / 2} y={y - 4} textAnchor="middle" fill="#e7b94a" fontSize={labelSize} fontWeight={700} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
                Wähle 1
              </text>
            </g>
          )
        })}

        {/* Stationen-Marker */}
        {stations.map((st, i) => {
          const meta = STATION_META[st.type]
          const Icon = meta.Icon
          const { x, y } = pts[i]
          const fill = meta.accent ? '#e23b32' : '#234a86'
          return (
            <g
              key={st.rotation}
              style={{ cursor: editable ? 'move' : 'default' }}
              onPointerDown={editable ? e => { (e.target as Element).setPointerCapture?.(e.pointerId); setDragIdx(i) } : undefined}
            >
              {st.type === 'LIVE' ? (
                <rect x={x - puckR} y={y - puckR} width={puckR * 2} height={puckR * 2} rx={4}
                      transform={`rotate(45 ${x} ${y})`} fill={fill} stroke="#f4ecd8" strokeWidth={2.5} />
              ) : (
                <circle cx={x} cy={y} r={puckR} fill={fill} stroke="#f4ecd8" strokeWidth={2.5} />
              )}
              <text x={x} y={y + numSize * 0.35} textAnchor="middle" fill="#f4ecd8" fontSize={numSize} fontWeight={800} style={{ fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' }}>
                {st.rotation}
              </text>
              <g transform={`translate(${x + puckR - 3} ${y - puckR - iconSize + 3})`} style={{ pointerEvents: 'none' }}>
                <Icon size={iconSize} className={meta.accent ? 'text-softball-red-200' : 'text-cream-100'} />
              </g>
              <text x={x} y={y + puckR + labelSize + 3} textAnchor="middle" fill="#f4ecd8" fontSize={labelSize} fontWeight={700} style={{ pointerEvents: 'none' }}>
                {st.label}
              </text>
              {st.level && (
                <text x={x} y={y + puckR + labelSize * 2 + 4} textAnchor="middle"
                      fill={st.level === 'ADVANCED' ? '#f4a8a3' : '#e7b94a'} fontSize={labelSize - 1} fontWeight={700}
                      style={{ letterSpacing: 0.5, textTransform: 'uppercase', pointerEvents: 'none' }}>
                  {st.level === 'ADVANCED' ? 'Advanced' : 'Beginner'}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
