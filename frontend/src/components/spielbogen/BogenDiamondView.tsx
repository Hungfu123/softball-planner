import type { BogenBaseStateDto, SpielbogenSlotResponse } from '@/types'

interface Props {
  baseState: BogenBaseStateDto | null
  slots: SpielbogenSlotResponse[]
}

const POS = {
  home: { cx: 110, cy: 185 },
  first: { cx: 178, cy: 110 },
  second: { cx: 110, cy: 35 },
  third: { cx: 42, cy: 110 },
} as const

function truncate(name: string, max = 6): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

function BaseMarker({ pos, label, slotId, slots }: {
  pos: { cx: number; cy: number }
  label: string
  slotId: number | null | undefined
  slots: SpielbogenSlotResponse[]
}) {
  const occupied = slotId != null
  const slot = slotId != null ? slots.find(s => s.id === slotId) : null

  return (
    <g>
      <rect
        x={pos.cx - 14}
        y={pos.cy - 14}
        width="28"
        height="28"
        rx="3"
        transform={`rotate(45 ${pos.cx} ${pos.cy})`}
        fill={occupied ? '#dc2626' : 'none'}
        stroke={occupied ? '#b91c1c' : '#9ca3af'}
        strokeWidth="1.5"
      />
      {!occupied && (
        <text x={pos.cx} y={pos.cy + 4} textAnchor="middle" fontSize="9" fontWeight="500" fill="#9ca3af">
          {label}
        </text>
      )}
      {occupied && slot && (
        <>
          <text x={pos.cx} y={pos.cy - 4} textAnchor="middle" fontSize="7" fontWeight="700" fill="white">
            #{slot.battingOrder}
          </text>
          <text x={pos.cx} y={pos.cy + 6} textAnchor="middle" fontSize="7" fontWeight="600" fill="white">
            {truncate(slot.name)}
          </text>
        </>
      )}
    </g>
  )
}

export function BogenDiamondView({ baseState, slots }: Props) {
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
        <BaseMarker pos={POS.first} label="1B" slotId={baseState?.firstSlotId} slots={slots} />
        <BaseMarker pos={POS.second} label="2B" slotId={baseState?.secondSlotId} slots={slots} />
        <BaseMarker pos={POS.third} label="3B" slotId={baseState?.thirdSlotId} slots={slots} />

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
      </svg>
    </div>
  )
}
