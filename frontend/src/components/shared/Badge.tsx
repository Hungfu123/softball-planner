import type { ReactNode } from 'react'

type Color = 'navy' | 'red' | 'gray' | 'emerald' | 'amber' | 'blue' | 'green'
type Size = 'sm' | 'md'

interface Props {
  children: ReactNode
  color?: Color
  size?: Size
  className?: string
  title?: string
  ariaLabel?: string
}

const COLORS: Record<Color, string> = {
  navy: 'bg-navy-100 text-navy-800',
  red: 'bg-softball-red-100 text-softball-red-700',
  gray: 'bg-cream-200 text-gray-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
}

const SIZES: Record<Size, string> = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-0.5',
}

/**
 * Badge / Pill für Status, Counts, Labels.
 * Farben sind bewusst auf Navy/Red/Gray + Status (emerald/amber) beschränkt.
 */
export function Badge({ children, color = 'gray', size = 'md', className = '', title, ariaLabel }: Props) {
  return (
    <span
      title={title}
      aria-label={ariaLabel}
      className={`inline-flex items-center font-semibold tabular-nums rounded-full ${COLORS[color]} ${SIZES[size]} ${className}`}
    >
      {children}
    </span>
  )
}
