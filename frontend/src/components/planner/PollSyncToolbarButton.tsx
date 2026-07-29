import { Badge } from '@/components/shared'
import { UsersIcon } from '@/icons'
import type { GameDayVotePreview } from '@/types'

interface PollSyncToolbarButtonProps {
  /** Mobile-Zeile (kleinere, kräftigere Buttons) vs. Desktop-Zeile (font-display, kompakt). */
  variant: 'mobile' | 'desktop'
  pollStatus: GameDayVotePreview | null
  onClick: () => void
}

const STYLES = {
  mobile: {
    button: 'px-3 py-2.5 text-sm rounded-lg font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 bg-white border border-cream-300 text-navy-800 hover:bg-navy-800 hover:text-white transition-colors',
    icon: 16,
  },
  desktop: {
    button: 'font-display px-3 py-2 text-xs font-extrabold tracking-widest uppercase rounded-lg cursor-pointer inline-flex items-center gap-1.5 bg-white border border-cream-300 text-navy-800 hover:bg-navy-800 hover:text-white transition-colors',
    icon: 14,
  },
} as const

/**
 * Button „WhatsApp-Stimmen" für die GameDayPlanner-Toolbar — identisch in der mobilen
 * und der Desktop-Zeile verdrahtet (nur der Stil unterscheidet sich), damit beide Stellen
 * garantiert dieselbe Sichtbarkeits- und Badge-Logik verwenden. Sichtbar nur, wenn eine
 * Umfrage existiert UND bereits gesendet wurde; Badge zeigt unbekannte Wähler.
 */
export function PollSyncToolbarButton({ variant, pollStatus, onClick }: PollSyncToolbarButtonProps) {
  if (!pollStatus?.pollExists || !pollStatus.sent) return null

  const style = STYLES[variant]
  const unknownCount = pollStatus.unknownVoters.length

  return (
    <button
      onClick={onClick}
      className={style.button}
      title={variant === 'desktop' ? 'WhatsApp-Stimmen übernehmen' : undefined}
    >
      <UsersIcon size={style.icon} />
      <span>WhatsApp-Stimmen</span>
      {unknownCount > 0 && (
        <Badge color="red" size="sm">⚠️ {unknownCount} unbekannt</Badge>
      )}
    </button>
  )
}
