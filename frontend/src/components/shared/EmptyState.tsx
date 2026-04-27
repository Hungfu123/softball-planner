import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  dashed?: boolean
  className?: string
}

/**
 * Empty-State-Placeholder: "keine Daten", "noch nichts passiert".
 * Optional: Icon, Beschreibung, CTA-Button.
 */
export function EmptyState({ title, description, icon, action, dashed = false, className = '' }: Props) {
  const border = dashed
    ? 'border-2 border-dashed border-cream-300 rounded-xl'
    : ''
  return (
    <div className={`text-center py-8 px-4 text-gray-400 ${border} ${className}`}>
      {icon && <div className="mx-auto mb-2 opacity-40 flex justify-center">{icon}</div>}
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {description && <p className="text-xs mt-1 text-gray-400">{description}</p>}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  )
}
