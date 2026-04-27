import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

/*
 * Button-Varianten (60/30/10-konsistent):
 *   primary   → Softball-Red CTA (10% — Hauptaktion)
 *   secondary → Navy-Rand mit Dark-Hover (30% — normale Aktionen)
 *   ghost     → Gray Transparent (60% — Tertiäraktionen)
 *   danger    → Red Warning (Destruktive Aktionen, selten)
 */
const VARIANTS: Record<Variant, string> = {
  primary:   'bg-softball-red-600 text-white hover:bg-softball-red-500 shadow-sm disabled:opacity-50',
  secondary: 'border border-cream-300 text-gray-700 bg-white hover:bg-navy-800 hover:text-white hover:border-navy-800 disabled:opacity-50',
  ghost:     'text-gray-600 hover:bg-cream-200 hover:text-gray-900 disabled:opacity-40',
  danger:    'bg-white border border-softball-red-300 text-softball-red-700 hover:bg-softball-red-50 disabled:opacity-50',
}

const SIZES: Record<Size, string> = {
  sm: 'text-xs px-2.5 py-1 rounded-md gap-1',
  md: 'text-sm px-4 py-2 rounded-lg gap-1.5',
  lg: 'text-base px-5 py-2.5 rounded-lg gap-2',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {icon}
      {children}
    </button>
  )
}
