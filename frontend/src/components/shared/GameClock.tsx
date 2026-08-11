import { useEffect, useRef, useState } from 'react'

export interface GameClockProps {
  /** Authoritative Sekunden seit Spielstart — kommt später vom Server. */
  elapsedSeconds: number
  /** Zeitlimit in Minuten, oder null für eine reine Stoppuhr ohne Fortschrittsanzeige. */
  limitMinutes: number | null
  running: boolean
  /** false = Uhr wurde nie gestartet, zeigt nur das „Zeit"-Affordance-Wort. */
  started: boolean
  /** Geschätzte Gesamtdauer in Minuten (nur ohne Limit, ab 3 abgeschlossenen Halbinnings —
   *  siehe GameDurationEstimator im Backend). `null`/`undefined` zeigt keine Schätzung. */
  estimatedTotalMinutes?: number | null
  onPress?: () => void
}

type ClockPhase = 'idle' | 'running' | 'paused' | 'over'

interface ClockComputed {
  phase: ClockPhase
  displaySeconds: number
  overSeconds: number
  limitSeconds: number | null
  isOverLimit: boolean
  progress: number
}

/**
 * Tickt die Anzeige lokal zwischen zwei Server-Updates weiter, damit die Uhr sichtbar
 * läuft, auch wenn `elapsedSeconds` nur gelegentlich vom Aufrufer aktualisiert wird.
 * Reine Display-Interpolation — kein Fetch, keine eigene Datenquelle. Bei `running=false`
 * wird exakt der übergebene Wert gezeigt (Pause friert ein, kein Nachlaufen).
 */
function useTickingSeconds(elapsedSeconds: number, running: boolean): number {
  const [displaySeconds, setDisplaySeconds] = useState(elapsedSeconds)
  // time:0 ist nur ein Platzhalter für den Erst-Render (Date.now() darf dort nicht laufen,
  // impure) — der Effekt darunter setzt den echten Anchor sofort nach dem Mount.
  const anchorRef = useRef({ time: 0, value: elapsedSeconds })

  useEffect(() => {
    anchorRef.current = { time: Date.now(), value: elapsedSeconds }
    setDisplaySeconds(elapsedSeconds)
  }, [elapsedSeconds])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const { time, value } = anchorRef.current
      setDisplaySeconds(value + Math.floor((Date.now() - time) / 1000))
    }, 250)
    return () => clearInterval(id)
  }, [running])

  return running ? displaySeconds : elapsedSeconds
}

function useGameClock({ elapsedSeconds, limitMinutes, running, started }: GameClockProps): ClockComputed {
  const displaySeconds = useTickingSeconds(elapsedSeconds, running)
  const limitSeconds = limitMinutes != null ? limitMinutes * 60 : null
  // `>` statt `>=`, exakt wie GameClockCalculator.overLimit im Backend — genau am Limit gilt
  // es noch nicht als "drüber", sonst weichen Server und lokale Ticking-Anzeige eine Sekunde ab.
  const isOverLimit = limitSeconds != null && displaySeconds > limitSeconds
  const overSeconds = isOverLimit && limitSeconds != null ? displaySeconds - limitSeconds : 0
  const progress = limitSeconds ? Math.min(1, displaySeconds / limitSeconds) : 0

  const phase: ClockPhase = !started
    ? 'idle'
    : !running
      ? 'paused'
      : isOverLimit
        ? 'over'
        : 'running'

  return { phase, displaySeconds, overSeconds, limitSeconds, isOverLimit, progress }
}

/** mm:ss, nie negativ, keine Stunden-Sonderbehandlung (Softball-Spiele dauern keine Stunden). */
function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${mm}:${String(ss).padStart(2, '0')}`
}

/** h:mm für die geschätzte GESAMTdauer (anders als formatClock: die kann leicht über eine
 *  Stunde liegen, deshalb mit Stunden-Anteil statt reiner Minutenzahl, z.B. "1:35"). */
function formatDurationEstimate(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(m / 60)
  return `${h}:${String(m % 60).padStart(2, '0')}`
}

/**
 * Spielzeit-Anzeige für den Live-State-Strip des Spielbogens (und später der Legacy-ScoringPage).
 * Gehört in die freie Mitte zwischen Inning und Outs — gleiche Typo-Grammatik (font-display,
 * winziges gesperrtes Label, Tabellenziffern), kein Kasten, wie Inning/Outs auch keinen haben.
 *
 * Rein präsentational: bekommt Sekunden vom Aufrufer, tickt nur lokal zwischen Updates weiter.
 */
export function GameClockReadout(props: GameClockProps) {
  const { onPress } = props
  const { phase, displaySeconds, overSeconds } = useGameClock(props)

  if (phase === 'idle') {
    // Ohne Handler gibt es (noch) nichts, das die Uhr starten könnte — dann darf hier
    // auch keine Affordance stehen. Ein Wort, das eine Aktion verspricht und keine liefert,
    // ist schlechter als gar kein Wort. Reserviert auch keinen Platz in der Mitte.
    if (!onPress) return null

    return (
      <button
        type="button"
        onClick={onPress}
        className="font-display text-[10px] font-bold tracking-widest uppercase text-white/45 hover:text-white/70 transition-colors cursor-pointer"
        aria-label="Spielzeit starten"
      >
        Zeit
      </button>
    )
  }

  const label = phase === 'paused' ? 'Pause' : phase === 'over' ? `+${formatClock(overSeconds)}` : 'Zeit'
  const labelClass = phase === 'paused' || phase === 'over' ? 'text-amber-400' : 'text-white/80'
  const valueClass = phase === 'paused' ? 'text-white/55' : phase === 'over' ? 'text-amber-400' : 'text-white'
  const Tag = onPress ? 'button' : 'span'

  return (
    <Tag
      type={onPress ? 'button' : undefined}
      onClick={onPress}
      className="flex items-baseline gap-1.5 cursor-pointer"
      aria-label={`Spielzeit — ${label}, ${formatClock(displaySeconds)}`}
    >
      <span className={`font-display text-[10px] font-bold tracking-widest uppercase transition-colors ${labelClass}`}>{label}</span>
      <span className={`font-display text-[15px] font-extrabold leading-none tabular-nums tracking-wide transition-colors ${valueClass}`}>
        {formatClock(displaySeconds)}
      </span>
      {props.estimatedTotalMinutes != null && (
        // Nur ohne Limit befüllt (Backend-Gate) — im 'over'-Zustand (nur mit Limit möglich)
        // taucht das also nie neben der Überschreitung auf, konkurriert also nie mit ihr.
        <span className="font-display text-[11px] font-bold tabular-nums text-white/45">
          ≈ {formatDurationEstimate(props.estimatedTotalMinutes)}
        </span>
      )}
    </Tag>
  )
}

/**
 * Der 3px-Strich unter dem Live-State-Strip. War bisher reines Dekor (`border-b-[3px]
 * border-softball-red-600`) — wird zur Zeitleiste, ohne dass die Strip-Zeile Platz verliert.
 *
 * Wichtigste Nebenbedingung: bei `started=false` exakt das heutige Aussehen, keine Abweichung.
 */
export function GameClockRule(props: GameClockProps) {
  const { phase, progress, isOverLimit, limitSeconds } = useGameClock(props)

  if (phase === 'idle') {
    return <div className="h-[3px] bg-softball-red-600" />
  }

  const dimmed = phase === 'paused' ? 'opacity-45' : ''

  if (isOverLimit) {
    return <div className={`h-[3px] bg-amber-500 transition-opacity ${dimmed}`} />
  }

  return (
    <div className="h-[3px] bg-softball-red-600 relative overflow-hidden">
      {limitSeconds != null && (
        <div
          className={`absolute inset-y-0 left-0 bg-amber-400 transition-opacity ${dimmed}`}
          style={{ width: `${progress * 100}%` }}
        />
      )}
    </div>
  )
}
