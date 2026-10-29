import { useAuth } from '@/components/auth/AuthProvider'
import { spielermodusAktiv } from '@/hooks/useSpielermodus'

/**
 * Was die Oberfläche dem Angemeldeten zeigt. Die Oberfläche versteckt, das Backend verbietet —
 * diese Flags sind nur das Verstecken.
 *
 * `me` ist null, solange /api/me nicht beantwortet ist (Netzfehler beim Seitenaufbau, PWA
 * offline: der Nutzer bleibt angemeldet). Dann wird nichts versteckt: ein Admin ohne
 * Verbindung soll seine App nicht auf drei Reiter schrumpfen sehen, und verboten ist dem
 * Spieler das Dahinterliegende ohnehin im Backend. `RequireRole` hängt am selben Wert —
 * andersherum flöge ein Admin bei jedem Netzhänger aus der Scoring-Seite, mitten im Spiel.
 *
 * Für Dinge, die ein Spieler auch im Zweifel nicht sehen soll, gibt es {@link istBestaetigtAdmin}:
 * dort zählt nur eine beantwortete Auskunft, der Unbekannt-Fall gilt als Spieler. Das ist für
 * Anzeigen gedacht, die niemandem fehlen — nicht für Wege, die jemand gerade braucht.
 *
 * Im **Spielermodus** (`useSpielermodus`) antwortet alles hier wie für einen Spieler — auch im
 * Unbekannt-Fall, der sonst großzügig ist: wer die kleinere Sicht ausdrücklich eingeschaltet
 * hat, soll sie nicht bei jedem Netzhänger wieder verlieren. Verboten ist dem Modus das
 * Dahinterliegende ohnehin im Backend; das hier ist nur das Verstecken.
 */
export function useRolle() {
  const { me } = useAuth()
  const spielermodus = spielermodusAktiv()
  const unbekannt = me === null
  const istSuperadmin = !spielermodus && (unbekannt || me.role === 'SUPERADMIN')
  const istAdmin = !spielermodus && (unbekannt || me.role === 'ADMIN' || me.role === 'SUPERADMIN')
  return {
    me,
    istSuperadmin,
    istAdmin,
    /** Nur mit beantworteter Auskunft. Im Unbekannt-Fall falsch, nicht wahr. */
    istBestaetigtAdmin: !spielermodus && !unbekannt && (me.role === 'ADMIN' || me.role === 'SUPERADMIN'),
    /** Admins schreiben immer, Spieler nur mit dem Scorer-Recht. */
    darfScoren: istAdmin || (me?.mayScore ?? false),
    /** Läuft gerade die Spieleransicht? Für den Streifen und den Menüpunkt. */
    spielermodus,
    /** Die ECHTE Rolle, unabhängig vom Modus — nur wer wirklich Superadmin ist, darf umschalten. */
    darfSichtWechseln: !unbekannt && me.role === 'SUPERADMIN',
  }
}
