import type { ReactNode, HTMLAttributes } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const PADDING = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
}

/**
 * Standard-Card: cream Papier-Hintergrund, dezente Border, abgerundete Ecken, weicher Schatten.
 * Stadium-Pocket-Theme.
 */
export function Card({ children, padding = 'none', className = '', ...rest }: Props) {
  return (
    <div
      {...rest}
      className={`bg-cream-50 border border-cream-300 rounded-xl shadow-sm overflow-hidden ${PADDING[padding]} ${className}`}
    >
      {children}
    </div>
  )
}
