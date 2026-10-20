import { StepTimeline } from './StepTimeline'
import type { PlaybackSpeed } from '@/hooks/usePlayback'

/**
 * Die Wiedergabeleiste der Spieleransicht.
 *
 * Die Schritt-Knoepfe sind nicht Zierrat: beim Erklaeren blaettert man, man spielt nicht
 * ab. Vorher war das nur per Wischen erreichbar und damit unsichtbar. Die Schleife laesst
 * das Play weiterlaufen, waehrend der Trainer redet — am Zaun vermutlich der meistgenutzte
 * Knopf.
 */
export function PlaybackBar({
  count,
  index,
  playing,
  canPlay,
  loop,
  speed,
  onSeek,
  onPrev,
  onNext,
  onToggle,
  onLoop,
  onSpeed,
}: {
  count: number
  index: number
  playing: boolean
  canPlay: boolean
  loop: boolean
  speed: PlaybackSpeed
  onSeek: (i: number) => void
  onPrev: () => void
  onNext: () => void
  onToggle: () => void
  onLoop: () => void
  onSpeed: () => void
}) {
  return (
    <div className="border-t border-cream-200 px-4 pb-3 pt-2 safe-bottom">
      <StepTimeline count={count} current={index} onSeek={onSeek} />
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
        <span className="flex-1 whitespace-nowrap text-center font-display text-xs font-bold tabular-nums text-gray-500">
          <span className="hidden min-[340px]:inline">
            Stand {index + 1} von {count}
          </span>
          <span className="min-[340px]:hidden">
            {index + 1}/{count}
          </span>
        </span>
        <Knopf onClick={onLoop} active={loop} aria-label="Schleife">
          ↻
        </Knopf>
        <Knopf onClick={onSpeed} wide aria-label="Tempo">
          {speed === 0.5 ? '0,5×' : speed === 2 ? '2×' : '1×'}
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
  const farbe = primary
    ? 'bg-navy-800 text-cream-50'
    : active
      ? 'bg-cream-200 text-navy-900 border border-cream-300'
      : 'border border-cream-300 bg-white text-navy-900'
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
