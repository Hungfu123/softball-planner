import type { CreateSpielbogenRequest, SetLineupRequest } from '@/types'

const KEY = 'spielbogen_wizard_draft'

export interface WizardDraft {
  step: 1 | 2 | 3
  meta: Partial<CreateSpielbogenRequest>
  homeLineup: SetLineupRequest['slots']
  awayLineup: SetLineupRequest['slots']
  savedAt: number
}

export function saveDraft(draft: WizardDraft): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    /* localStorage full — silent */
  }
}

export function loadDraft(): WizardDraft | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as WizardDraft
  } catch {
    return null
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* silent */
  }
}
