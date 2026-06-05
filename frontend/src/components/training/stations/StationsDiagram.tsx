import type { Station } from './deriveStations'
import { STATION_META } from './stationMeta'

interface Props {
  stations: Station[]
  size?: 'mini' | 'full'
}

// Feld-Koordinatensystem (Lageplan). Home-Plate unten-links, Foul-Linien = die Ecke.
const VB_W = 360
const VB_H = 300
const HOME = { x: 30, y: 262 }
const AREA = { x0: 82, x1: 312, y0: 52, y1: 212 } // Stationen-Platzierungsbereich

/**
 * Auto-Layout: Stationen als Ring-Tour entlang des Feldrands, Start oben-rechts (Station 1 = Live),
 * im Uhrzeigersinn. Die rote Route folgt dem Rand → kreuzt nicht.
 */
function layoutPositions(n: number): { x: number; y: number }[] {
  const L = AREA.x0, R = AREA.x1, T = AREA.y0, B = AREA.y1
  const w = R - L, h = B - T
  if (n === 1) return [{ x: R, y: T }]
  const per = 2 * (w + h)
  const walk = (d: number) => {
    let dd = ((d % per) + per) % per
    if (dd < h) return { x: R, y: T + dd }          // rechte Kante runter
    dd -= h
    if (dd < w) return { x: R - dd, y: B }          // untere Kante nach links
    dd -= w
    if (dd < h) return { x: L, y: B - dd }           // linke Kante hoch
    dd -= h
    return { x: L + dd, y: T }                        // obere Kante nach rechts
  }
  return Array.from({ length: n }, (_, i) => walk((i / n) * per))
}

export function StationsDiagram({ stations, size = 'mini' }: Props) {
  if (stations.length === 0) return null
  const full = size === 'full'
  const pos = layoutPositions(stations.length)

  const puckR = full ? 17 : 14
  const numSize = full ? 17 : 14
  const iconSize = full ? 13 : 11
  const labelSize = full ? 11 : 9

  // Choice-Gruppen für "WÄHLE 1"-Rahmen
  const groups = new Map<number, number[]>()
  stations.forEach((s, i) => {
    if (s.choiceGroup != null) {
      const arr = groups.get(s.choiceGroup) ?? []
      arr.push(i)
      groups.set(s.choiceGroup, arr)
    }
  })

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{ background: 'radial-gradient(120% 90% at 15% 0%, #16305c 0%, transparent 55%), linear-gradient(135deg,#13284a,#0d1b34)' }}
    >
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto block">
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
        {pos.slice(1).map((p, i) => (
          <line
            key={`route-${i}`}
            x1={pos[i].x} y1={pos[i].y} x2={p.x} y2={p.y}
            stroke="#e23b32" strokeWidth={full ? 3 : 2.5} strokeDasharray="6 5" strokeLinecap="round"
            markerEnd="url(#leitfaden-arrow)" opacity={0.9}
          />
        ))}

        {/* WÄHLE-1-Rahmen um Choice-Gruppen */}
        {[...groups.values()].filter(idxs => idxs.length > 1).map((idxs, gi) => {
          const xs = idxs.map(i => pos[i].x)
          const ys = idxs.map(i => pos[i].y)
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
          const { x, y } = pos[i]
          const fill = meta.accent ? '#e23b32' : '#234a86'
          return (
            <g key={st.rotation}>
              {st.type === 'LIVE' ? (
                <rect x={x - puckR} y={y - puckR} width={puckR * 2} height={puckR * 2} rx={4}
                      transform={`rotate(45 ${x} ${y})`} fill={fill} stroke="#f4ecd8" strokeWidth={2.5} />
              ) : (
                <circle cx={x} cy={y} r={puckR} fill={fill} stroke="#f4ecd8" strokeWidth={2.5} />
              )}
              <text x={x} y={y + numSize * 0.35} textAnchor="middle" fill="#f4ecd8" fontSize={numSize} fontWeight={800} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {st.rotation}
              </text>
              {/* Icon-Badge oben-rechts am Puck */}
              <g transform={`translate(${x + puckR - 3} ${y - puckR - iconSize + 3})`}>
                <Icon size={iconSize} className={meta.accent ? 'text-softball-red-200' : 'text-cream-100'} />
              </g>
              {/* Label unter dem Puck */}
              <text x={x} y={y + puckR + labelSize + 3} textAnchor="middle" fill="#f4ecd8" fontSize={labelSize} fontWeight={700}>
                {st.label}
              </text>
              {st.level && (
                <text x={x} y={y + puckR + labelSize * 2 + 4} textAnchor="middle"
                      fill={st.level === 'ADVANCED' ? '#f4a8a3' : '#e7b94a'} fontSize={labelSize - 1} fontWeight={700}
                      style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
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
