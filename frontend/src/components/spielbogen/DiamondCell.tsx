import type { CellNotation } from '@/utils/bogenSheetRenderer'

interface Props {
  notation: CellNotation | undefined
}

/**
 * Single sheet cell SVG — shows at-bat notation inside a 60x60 viewbox.
 * V1: text-centered with optional colored background for run-scored / HR.
 */
export function DiamondCell({ notation }: Props) {
  if (!notation) {
    return (
      <svg viewBox="0 0 60 60" className="w-full h-full">
        <rect x="1" y="1" width="58" height="58" fill="none" stroke="#c8c4b8" strokeWidth="0.5" />
      </svg>
    )
  }

  const isHr = notation.label === 'HR'
  const bgFill = isHr ? '#fee2e2' : notation.runScored ? '#fef9f0' : 'white'
  const textColor = isHr ? '#991b1b' : '#172554'

  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <rect x="1" y="1" width="58" height="58" fill={bgFill} stroke="#c8c4b8" strokeWidth="0.5" rx="1" />
      {notation.runScored && !isHr && (
        <line x1="1" y1="59" x2="59" y2="1" stroke="#f59e0b" strokeWidth="1" opacity="0.4" />
      )}
      <text
        x="30"
        y="34"
        textAnchor="middle"
        fontSize="9"
        fontWeight="bold"
        fontFamily="'Saira Condensed', sans-serif"
        fill={textColor}
        letterSpacing="0.5"
      >
        {notation.label}
      </text>
      {notation.stealingArrow && (
        <line
          x1="15"
          y1="45"
          x2="45"
          y2="15"
          stroke="#dc2626"
          strokeWidth="1.2"
          markerEnd="url(#arr)"
          opacity="0.7"
        />
      )}
    </svg>
  )
}
