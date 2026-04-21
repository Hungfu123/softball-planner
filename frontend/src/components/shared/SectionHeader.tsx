import type { ReactNode } from 'react'

interface Props {
  title: ReactNode
  actions?: ReactNode
  size?: 'sm' | 'md'
}

/**
 * Section-Header mit konsistenter Red-Stripe-Akzentuierung.
 * Ersetzt die 15+ Duplikate von `<span className="w-1 h-5 bg-softball-red-500..." />`
 */
export function SectionHeader({ title, actions, size = 'md' }: Props) {
  const stripeH = size === 'sm' ? 'h-4' : 'h-6'
  const titleClass = size === 'sm'
    ? 'text-sm font-semibold text-gray-600 uppercase tracking-wide'
    : 'text-sm font-bold uppercase tracking-wide text-gray-950'
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className={`w-1 ${stripeH} bg-softball-red-600 rounded-full shrink-0`} />
      <h2 className={`${titleClass} flex items-center gap-2 flex-1 min-w-0`}>
        {title}
      </h2>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
