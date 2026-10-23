import { useAuth } from '@/components/auth/AuthProvider'

/**
 * Was die Oberfläche dem Angemeldeten zeigt. Die Oberfläche versteckt, das Backend verbietet —
 * diese Flags sind nur das Verstecken.
 *
 * `me` ist null, solange /api/me nicht beantwortet ist (Netzfehler beim Seitenaufbau, PWA
 * offline: der Nutzer bleibt angemeldet). Dann wird nichts versteckt: ein Admin ohne
 * Verbindung soll seine App nicht auf drei Reiter schrumpfen sehen, und verboten ist dem
 * Spieler das Dahinterliegende ohnehin im Backend.
 */
export function useRolle() {
  const { me } = useAuth()
  const unbekannt = me === null
  const istSuperadmin = unbekannt || me.role === 'SUPERADMIN'
  const istAdmin = unbekannt || me.role === 'ADMIN' || me.role === 'SUPERADMIN'
  return {
    me,
    istSuperadmin,
    istAdmin,
    /** Admins schreiben immer, Spieler nur mit dem Scorer-Recht. */
    darfScoren: istAdmin || (me?.mayScore ?? false),
  }
}
