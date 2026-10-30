import { StepTimeline } from './StepTimeline'
import { RefreshIcon } from '@/icons'

/**
 * Die Wiedergabeleiste der Spieleransicht.
 *
 * Die Schritt-Knoepfe sind nicht Zierrat: beim Erklaeren blaettert man, man spielt nicht
 * ab. Vorher war das nur per Wischen erreichbar und damit unsichtbar.
 *
 * **Tempo und Schleife sind raus.** Beides waren Einstellungen, keine Handlungen: wer
 * zuschaut, will nicht halbe Geschwindigkeit waehlen, sondern die Stelle noch einmal
 * sehen. Dafuer steht jetzt „nochmal" da — derselbe Knopf wie unter einer Karte im
 * Spielwissen, mit demselben Wort.
 */
export function PlaybackBar({
  count,
  index,
  fortschritt,
  playing,
  canPlay,
  onSeek,
  onPrev,
  onNext,
  onToggle,
  onNochmal,
}: {
  count: number
  index: number
  /** Fortschritt im laufenden Uebergang, 0..1 — fuer den Knopf der Zeitleiste. */
  fortschritt: number
  playing: boolean
  canPlay: boolean
  onSeek: (i: number) => void
  onPrev: () => void
  onNext: () => void
  onToggle: () => void
  onNochmal: () => void
}) {
  return (
    <div className="border-t border-cream-50/12 px-4 pb-3 pt-2 safe-bottom">
      <StepTimeline count={count} current={index} fortschritt={fortschritt} onSeek={onSeek} />
      <div className="mt-2 flex items-center gap-2">
        <Knopf onClick={onPrev} disabled={index === 0} aria-label="Vorheriger Stand">
          ◀
        </Knopf>
        <Knopf onClick={onToggle} disabled={!canPlay} primary aria-label={playing ? 'Pause' : 'Abspielen'}>
          {playing ? '❚❚' : '▶'}
        </Knopf>
        <Knopf onClick={onNext} disabled={index >= count - 1} aria-label="Nächster Stand">
          ▶
        </Knopf>
        <span className="flex-1 whitespace-nowrap text-center font-display text-xs font-bold tabular-nums text-cream-50/60">
          <span className="hidden min-[340px]:inline">
            Stand {index + 1} von {count}
          </span>
          <span className="min-[340px]:hidden">
            {index + 1}/{count}
          </span>
        </span>
        <Knopf onClick={onNochmal} disabled={!canPlay} wide aria-label="Nochmal">
          <span className="flex items-center gap-1.5">
            <RefreshIcon size={14} />
            nochmal
          </span>
        </Knopf>
      </div>
    </div>
  )
}

function Knopf({
  children,
  onClick,
  disabled,
  primary,
  active,
  wide,
  ...rest
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  active?: boolean
  wide?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const basis = wide ? 'px-3.5' : 'w-11'
  /*
   * Die Sprache der Buehne: Amber ist der Knopf, den man drueckt, Cream die Umrisse
   * drumherum. Vorher waren es weisse Knoepfe mit Cream-Kanten — auf Navy unsichtbar.
   */
  const farbe = primary
    ? 'bg-amber-400 text-navy-900 active:brightness-110'
    : active
      ? 'bg-cream-50 text-navy-900'
      : 'border border-cream-50/25 text-cream-50 active:bg-cream-50/10'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-11 shrink-0 rounded-xl font-display text-sm font-bold disabled:opacity-40 ${basis} ${farbe}`}
      {...rest}
    >
      {children}
    </button>
  )
}
