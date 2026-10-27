import type { Player, PositionSlot } from '@/types'
import { POSITION_SLOT_DESCRIPTIONS, POSITION_SLOT_LABELS } from '@/types'

/** Die drei Slots eines Spielers in der Reihenfolge Primär → Sekundär → Tertiär, Leere übersprungen. */
function positionSlots(player: Pick<Player, 'primaryPosition' | 'secondaryPosition' | 'tertiaryPosition'>): PositionSlot[] {
  return [player.primaryPosition, player.secondaryPosition, player.tertiaryPosition]
    .filter((slot): slot is PositionSlot => !!slot)
}

/**
 * Positions-Profil als Chips. Die Rangfolge steckt im Gewicht, nicht in einer
 * Beschriftung: die Erstposition trägt volles Navy, die Zweite ein helles Feld,
 * die Dritte nur eine Kontur. Man liest die Priorität, ohne sie zu lesen.
 */
export function PositionBadges({ player, size = 'md', tone = 'light' }: {
  player: Pick<Player, 'primaryPosition' | 'secondaryPosition' | 'tertiaryPosition'>
  size?: 'sm' | 'md'
  /** 'dark' für Navy-Flächen — dort kehrt sich die Rangfolge der Füllungen um. */
  tone?: 'light' | 'dark'
}) {
  const slots = positionSlots(player)
  if (slots.length === 0) return null

  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
  /*
   * Der erste Platz traegt Tokens, nicht Palette. `bg-navy-800` auf einem <span class="rounded">
   * faellt durch den Shim (dessen Liste kennt rounded-md/lg/xl/full, nicht `rounded`) und stand
   * im Dunkeln als 1,25:1 auf der Karte — ausgerechnet die WICHTIGSTE Position war die
   * unsichtbarste, und der zweite Platz sah aus wie der erste. Die Rangfolge stand auf dem Kopf.
   */
  const rank = tone === 'dark'
    ? ['bg-invers text-invers-ink', 'bg-navy-600 text-cream-100', 'border border-navy-500 text-navy-200']
    : ['bg-accent text-accent-ink', 'bg-navy-100 text-navy-800', 'border border-cream-300 text-gray-500']

  return (
    <span className="inline-flex items-center gap-1">
      {slots.map((slot, i) => (
        <span
          key={slot}
          title={POSITION_SLOT_DESCRIPTIONS[slot]}
          className={`font-display font-bold uppercase tracking-wide rounded ${pad} ${rank[i]}`}
        >
          {POSITION_SLOT_LABELS[slot]}
        </span>
      ))}
    </span>
  )
}
