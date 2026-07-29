import type { GameDayVotePreview } from '@/types'

/** Der WhatsApp-Stimmen-Button erscheint nur, wenn eine Umfrage existiert UND bereits gesendet wurde. */
export function shouldShowPollSyncButton(pollStatus: GameDayVotePreview | null): boolean {
  return !!pollStatus?.pollExists && !!pollStatus.sent
}
