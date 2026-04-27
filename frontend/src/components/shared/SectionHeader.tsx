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
  const stripeH = size === 'sm' ? 'h-4' : 'h-5'
  const titleClass = size === 'sm'
    ? 'font-display text-[11px] font-bold tracking-widest uppercase text-gray-600'
    : 'font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-navy-900'
  return (
    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-cream-200">
      <span className={`w-1 ${stripeH} bg-softball-red-600 rounded-full shrink-0`} />
      <h2 className={`${titleClass} flex items-center gap-2 flex-1 min-w-0`}>
        {title}
      </h2>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
