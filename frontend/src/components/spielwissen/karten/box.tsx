import { useState } from 'react'
import { motion } from 'motion/react'
import type { BuehnenProps } from '../kapitel'
import { Ball, FARBE, Figur, MiniFeld } from '../buehne'
import { HOME } from '@/components/playmaker/board/geometry'

/**
 * Kapitel 1: was in der Box zaehlt.
 *
 * Jede Buehne bekommt `lauf` (zaehlt bei „nochmal" hoch, haengt an den `key`s) und
 * `ruhig` (reduzierte Bewegung, dann steht sofort der Endzustand da).
 */

const AUS = [0.23, 1, 0.32, 1] as const

/** Dauer und Verzoegerung, bei reduzierter Bewegung auf null. */
const takt = (ruhig: boolean, t: { duration?: number; delay?: number } & Record<string, unknown>) =>
  ruhig ? { duration: 0, delay: 0 } : t

/** Der Stempel, mit dem eine Buehne ihr Urteil hinschreibt. */
function Stempel({ text, art, lauf, ruhig, delay = 0 }: {
  text: string
  art: 'raus' | 'gut' | 'hell'
  lauf: number
  ruhig: boolean
  delay?: number
}) {
  const farbe = art === 'raus'
    ? 'bg-softball-red-600 text-white'
    : art === 'gut'
      ? 'bg-amber-400 text-navy-900'
      : 'bg-cream-50 text-navy-900'
  return (
    <motion.span
      key={`${text}-${lauf}`}
      initial={ruhig ? false : { scale: 1.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={takt(ruhig, { delay, type: 'spring', stiffness: 320, damping: 16 })}
      className={`font-display inline-block rounded px-2.5 py-0.5 text-[13px] font-extrabold uppercase tracking-widest ${farbe}`}
    >
      {text}
    </motion.span>
  )
}

/* ------------------------------------------------------------------ 1 Zone */

/**
 * Die Zone klebt am Menschen, nicht am Boden. Zwei Knoepfe, eine Figur, und das
 * Rechteck wandert mit.
 *
 * Skaliert wird vom Boden aus, denn ein Mensch waechst nach oben. Das Rechteck benutzt
 * `attrY`: `motion` liest ein blankes `y` als Transform und wuerde die Verschiebung auf
 * das Attribut draufrechnen.
 */
export function ZoneAmKoerper({ ruhig }: BuehnenProps) {
  const [gross, setGross] = useState(false)
  const k = gross ? 1.16 : 0.88
  const boden = 152
  const hoehe = (v: number) => boden - (boden - v) * k
  const brust = hoehe(62)
  const knie = hoehe(112)

  return (
    <div className="px-4 pt-4">
      <svg viewBox="0 0 150 165" className="max-h-60 w-full" aria-hidden focusable="false">
        <line x1="4" y1={boden} x2="146" y2={boden} stroke={FARBE.matt} strokeWidth="1.5" />
        <path d="M92 152 l26 0 l0 -5 l-13 -6 l-13 6 z" fill={FARBE.hell} opacity="0.4" />

        <motion.rect
          data-testid="zone"
          initial={false}
          animate={{ attrY: brust, height: knie - brust }}
          transition={takt(ruhig, { duration: 0.45, ease: AUS })}
          x="88" y={brust} height={knie - brust} width="34" rx="2"
          fill={FARBE.gut} opacity="0.22"
        />
        <motion.rect
          initial={false}
          animate={{ attrY: brust, height: knie - brust }}
          transition={takt(ruhig, { duration: 0.45, ease: AUS })}
          x="88" y={brust} height={knie - brust} width="34" rx="2"
          fill="none" stroke={FARBE.gut} strokeWidth="2"
        />
        {[brust, knie].map((y, i) => (
          <motion.line
            key={i}
            initial={false}
            animate={{ y1: y, y2: y }}
            transition={takt(ruhig, { duration: 0.45, ease: AUS })}
            x1="30" x2="88" y1={y} y2={y}
            stroke={FARBE.gut} strokeWidth="1" strokeDasharray="3 3" opacity="0.6"
          />
        ))}

        <motion.g
          initial={false}
          animate={{ scale: k }}
          style={{ originX: '40px', originY: `${boden}px` }}
          transition={takt(ruhig, { duration: 0.45, ease: AUS })}
        >
          <Figur boden={boden} />
        </motion.g>
      </svg>

      <div className="mt-1 flex gap-2">
        {([['Klein', false], ['Groß', true]] as const).map(([label, wert]) => (
          <button
            key={label}
            type="button"
            onClick={() => setGross(wert)}
            aria-pressed={gross === wert}
            className={`font-display min-h-11 flex-1 rounded-lg px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest transition-colors ${
              gross === wert ? 'bg-cream-50 text-navy-900' : 'bg-navy-800 text-cream-50/70 active:bg-navy-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- 2 Drin/Ball */

/** Zwei Pitches, einer in der Zone, einer daneben. Das Urteil haengt am Ort, nicht am Schwung. */
export function DrinIstStrike({ lauf, ruhig }: BuehnenProps) {
  const pitch = (x: number, y: number, verzug: number) => (
    <motion.g
      key={`${x}-${lauf}`}
      initial={ruhig ? false : { x: 76, y: 44, scale: 0.12, opacity: 0 }}
      animate={{ x, y, scale: 1, opacity: 1 }}
      transition={takt(ruhig, { delay: verzug, duration: 0.6, ease: [0.4, 0, 0.9, 0.6] })}
    >
      <Ball r={7} />
    </motion.g>
  )

  return (
    <div className="px-4 pt-4">
      <svg viewBox="0 0 152 120" className="w-full" aria-hidden focusable="false">
        <rect x="52" y="20" width="48" height="80" rx="2" fill={FARBE.gut} opacity="0.14" />
        <rect x="52" y="20" width="48" height="80" rx="2" fill="none" stroke={FARBE.gut} strokeWidth="2" />
        {pitch(76, 58, 0)}
        {pitch(26, 74, 0.75)}
      </svg>
      <div className="flex justify-between pt-1">
        <Stempel text="Ball" art="hell" lauf={lauf} ruhig={ruhig} delay={1.4} />
        <Stempel text="Strike" art="raus" lauf={lauf} ruhig={ruhig} delay={0.65} />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- 3 Auch Strike */

const GRUENDE = [
  'In der Zone, auch ohne Schwung',
  'Geschwungen und nicht getroffen',
  'Foul, solange du unter 2 Strikes bist',
]

/** Drei Wege zum selben Ergebnis. Sie leuchten nacheinander auf, damit man sie zaehlt. */
export function AuchStrike({ lauf, ruhig }: BuehnenProps) {
  return (
    <div className="space-y-2 px-4 py-5">
      {GRUENDE.map((grund, i) => (
        <motion.div
          key={`${i}-${lauf}`}
          initial={ruhig ? false : { opacity: 0.2, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={takt(ruhig, { delay: i * 0.45, duration: 0.3, ease: AUS })}
          className="flex items-center gap-2.5"
        >
          <span className="font-display shrink-0 rounded bg-softball-red-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-white">
            Strike
          </span>
          <span className="text-[13px] leading-snug text-cream-50/85">{grund}</span>
        </motion.div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------ 4 Count-Rennen */

/** Vier gegen drei. Wer zuerst voll ist, gewinnt, und das Ergebnis heisst anders. */
export function CountWettlauf({ lauf, ruhig }: BuehnenProps) {
  const [b, setB] = useState(0)
  const [s, setS] = useState(0)
  const ende = b >= 4 ? 'Walk' : s >= 3 ? 'Out' : null
  const voll = !ende && b === 3 && s === 2

  const reihe = (label: string, n: number, wert: number, farbe: string) => (
    <div className="mb-2.5 flex items-center gap-3">
      <span className="font-display w-16 shrink-0 text-[11px] font-extrabold uppercase tracking-widest text-cream-50/70">
        {label}
      </span>
      <div className="flex flex-1 gap-1.5">
        {Array.from({ length: n }, (_, i) => (
          <motion.span
            key={i}
            initial={false}
            animate={{ scale: i < wert ? 1 : 0.62, opacity: i < wert ? 1 : 0.9 }}
            transition={takt(ruhig, { type: 'spring', stiffness: 420, damping: 18 })}
            className={`h-6 flex-1 rounded-full ${i < wert ? farbe : 'bg-white/20'}`}
          />
        ))}
      </div>
    </div>
  )

  return (
    <div key={lauf} className="px-4 py-4">
      {reihe('Balls', 4, b, 'bg-cream-50')}
      {reihe('Strikes', 3, s, 'bg-softball-red-600')}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => !ende && setB(x => x + 1)}
          className="font-display min-h-11 flex-1 rounded-lg bg-navy-800 px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest text-cream-50 active:bg-navy-700"
        >
          + Ball
        </button>
        <button
          type="button"
          onClick={() => !ende && setS(x => x + 1)}
          className="font-display min-h-11 flex-1 rounded-lg bg-navy-800 px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest text-cream-50 active:bg-navy-700"
        >
          + Strike
        </button>
      </div>

      <div className="flex h-9 items-center justify-center pt-2">
        {ende && <Stempel text={ende} art={ende === 'Out' ? 'raus' : 'gut'} lauf={lauf} ruhig={ruhig} />}
        {voll && (
          <span className="font-display text-[13px] font-extrabold uppercase tracking-wide text-amber-400">
            3 zu 2, voller Count
          </span>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- 5 Bunt wofuer */

/**
 * Wozu man ueberhaupt buntet: die Verteidigung steht tief, der Ball faellt kurz, und du
 * bist schon unterwegs. Das erwarten die wenigsten, deshalb kommt der Zweck vor der Regel.
 */
export function BuntWofuer({ lauf, ruhig }: BuehnenProps) {
  const tief = [
    { x: HOME.x - 46, y: HOME.y - 66 },
    { x: HOME.x, y: HOME.y - 78 },
    { x: HOME.x + 46, y: HOME.y - 66 },
  ]
  const erste = { x: HOME.x + 42.4, y: HOME.y - 42.4 }

  return (
    <div className="px-4 pt-4">
      <MiniFeld ausschnitt="infield" className="max-h-56">
        {tief.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill={FARBE.hell} opacity="0.55" />
        ))}

        {/* Der Ball tropft kurz vor die Platte. */}
        <motion.circle
          key={`ball-${lauf}`}
          r="3.2" fill={FARBE.gut}
          initial={ruhig ? false : { cx: HOME.x, cy: HOME.y }}
          animate={{ cx: HOME.x + 9, cy: HOME.y - 15 }}
          transition={takt(ruhig, { duration: 0.5, ease: 'easeOut' })}
        />

        {/* Und die Schlagfrau ist schon weg. */}
        <motion.circle
          key={`laeufer-${lauf}`}
          r="4.5" fill={FARBE.hell}
          initial={ruhig ? false : { cx: HOME.x, cy: HOME.y }}
          animate={{ cx: erste.x, cy: erste.y }}
          transition={takt(ruhig, { delay: 0.2, duration: 0.9, ease: 'easeOut' })}
        />
      </MiniFeld>
      <p className="pb-1 text-center text-[12px] text-cream-50/70">
        Die Verteidigung steht tief. Der Ball nicht.
      </p>
    </div>
  )
}

/* -------------------------------------------------------------- 6 Bunt-Falle */

/** Dieselbe Bewegung, zwei Strikes auf dem Zaehler, und sie kostet den At-Bat. */
export function BuntFalle({ lauf, ruhig }: BuehnenProps) {
  return (
    <div className="px-4 pt-4">
      <div className="mb-2 flex justify-center gap-1.5">
        {[0, 1].map(i => (
          <span key={i} className="font-display rounded bg-softball-red-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-white">
            Strike
          </span>
        ))}
      </div>

      <div className="relative">
        <svg viewBox="0 0 160 118" className="w-full" aria-hidden focusable="false">
          <line x1="22" y1="104" x2="150" y2="32" stroke={FARBE.hell} strokeWidth="1.2" opacity="0.4" strokeDasharray="4 3" />
          <text x="112" y="112" fontSize="8" fontWeight="800" fill={FARBE.hell} opacity="0.5" className="font-display">FOUL</text>

          {/* Der Schlaeger dreht aus der Schlag- in die Bunt-Haltung. */}
          <motion.rect
            key={`schlaeger-${lauf}`}
            x="34" y="54" width="46" height="5" rx="2.5" fill={FARBE.hell}
            initial={ruhig ? false : { rotate: -62 }}
            animate={{ rotate: 0 }}
            style={{ originX: '36px', originY: '57px' }}
            transition={takt(ruhig, { duration: 0.4, ease: AUS })}
          />
          <circle cx="30" cy="70" r="9" fill={FARBE.hell} opacity="0.22" />

          <motion.g
            key={`ball-${lauf}`}
            initial={ruhig ? false : { x: 120, y: 40, opacity: 0 }}
            animate={ruhig ? { x: 54, y: 96, opacity: 1 } : { x: [120, 80, 62, 54], y: [40, 56, 74, 96], opacity: [0, 1, 1, 1] }}
            transition={takt(ruhig, { delay: 0.35, duration: 0.9, times: [0, 0.35, 0.7, 1], ease: 'easeOut' })}
          >
            <Ball r={5} />
          </motion.g>
        </svg>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <motion.span
            key={`out-${lauf}`}
            initial={ruhig ? false : { scale: 1.7, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: -7 }}
            transition={takt(ruhig, { delay: 1.3, type: 'spring', stiffness: 300, damping: 13 })}
            className="font-display rounded border-[3px] border-softball-red-600 px-4 py-1 text-2xl font-extrabold uppercase tracking-widest text-softball-red-600"
          >
            Out
          </motion.span>
        </div>
      </div>
    </div>
  )
}
