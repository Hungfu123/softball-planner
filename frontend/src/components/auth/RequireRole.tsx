import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useRolle } from '@/hooks/useRolle'

type Props = { children: ReactNode } & ({ mind: 'ADMIN' | 'SUPERADMIN'; scorer?: never } | { scorer: true; mind?: never })

/**
 * Zweite Schranke hinter RequireAuth: wer zu wenig Rolle hat, landet auf dem Dashboard.
 * `mind` prüft die Rolle, `scorer` das Recht — die Scoring-Seite hängt nicht an der Rolle,
 * sondern an `mayScore` (Admins dürfen immer). Versteckt wird hier nur; verboten ist es im Backend.
 */
export function RequireRole({ mind, scorer, children }: Props) {
  const { istAdmin, istSuperadmin, darfScoren } = useRolle()
  const darf = scorer ? darfScoren : mind === 'SUPERADMIN' ? istSuperadmin : istAdmin
  if (!darf) return <Navigate to="/" replace />
  return <>{children}</>
}
