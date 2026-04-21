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
 * Standard-Card: weißer Hintergrund, graue Border, abgerundete Ecken, zarter Schatten.
 * Das 60%-Basis-Element der 60/30/10-Palette.
 */
export function Card({ children, padding = 'none', className = '', ...rest }: Props) {
  return (
    <div
      {...rest}
      className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden ${PADDING[padding]} ${className}`}
    >
      {children}
    </div>
  )
}
