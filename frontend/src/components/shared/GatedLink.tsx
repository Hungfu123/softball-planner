import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ohneKlickstile } from '@/utils/klickstile'

interface Props {
  /** Darf der Angemeldete dorthin? Sonst bleibt die Fläche stehen, aber ohne Ziel. */
  erlaubt: boolean
  to: string
  className?: string
  'aria-label'?: string
  onClick?: () => void
  children: ReactNode
}

/**
 * Ein Link, der für Angemeldete ohne Recht zur bloßen Fläche wird. Eine Route, die einen
 * Spieler aufs Dashboard zurückschickt, ist ein toter Link — besser, er ist keiner. Hover-,
 * Active- und Cursor-Stile fallen weg, sonst sähe die Fläche weiter klickbar aus.
 */
export function GatedLink({ erlaubt, to, className, onClick, children, ...rest }: Props) {
  if (!erlaubt) return <div className={ohneKlickstile(className)}>{children}</div>
  return (
    <Link to={to} className={className} onClick={onClick} aria-label={rest['aria-label']}>
      {children}
    </Link>
  )
}
