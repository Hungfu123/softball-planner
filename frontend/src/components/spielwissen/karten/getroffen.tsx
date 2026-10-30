import { motion } from 'motion/react'
import type { BuehnenProps } from '../kapitel'
import { takt, Ball, FARBE, Figur, MiniFeld } from '../buehne'
import { HOME, FIRST_BASE, SECOND_BASE } from '@/components/playmaker/board/geometry'

/**
 * Kapitel 2: was nach dem Treffer passiert.
 *
 * Drei der fuenf Karten beantworten dieselbe Frage („wann bin ich raus?") und sehen
 * deshalb absichtlich gleich aus: gleicher Ausschnitt, gleicher Stempel, nur der Weg des
 * Balls ist ein anderer. Wer sie nacheinander sieht, zaehlt drei Faelle und nicht drei
 * Bilder.
 */

/** Wo ein Ball landet, wenn er unter `winkel` Grad `laenge` Fuss weit fliegt. */
function flug(winkel: number, laenge: number) {
  const r = (winkel * Math.PI) / 180
  return { x: HOME.x + Math.cos(r) * laenge, y: HOME.y - Math.sin(r) * laenge }
}

function OutStempel({ lauf, ruhig, delay }: { lauf: number; ruhig: boolean; delay: number }) {
  return (
    <div className="pointer-events-none absolute right-4 top-3">
      <motion.span
        key={lauf}
        initial={ruhig ? false : { scale: 1.6, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: -7 }}
        transition={takt(ruhig, { delay, type: 'spring', stiffness: 300, damping: 13 })}
        className="font-display rounded border-[3px] border-softball-red-600 px-4 py-1 text-2xl font-extrabold uppercase tracking-widest text-softball-red-600"
      >
        Out
      </motion.span>
    </div>
  )
}

/* ------------------------------------------------------------- 1 Lauf sofort */

/**
 * Der haeufigste Fehler im Team: nach dem Schlag hinsehen, wo der Ball hinfliegt.
 *
 * Die Karte zeigt deshalb den ganzen Ablauf bis zum Treffer, aber **nicht, wo der Ball
 * landet**: er verblasst auf halber Strecke. Was man sieht, ist der Schlaeger, der
 * Kontakt und eine Figur, die schon weg ist, waehrend der Ball noch fliegt.
 */
export function LaufSofort({ lauf, ruhig }: BuehnenProps) {
  const boden = 152
  /* Die Haende: darum dreht der Schlaeger, und dort ist der Kontakt. */
  const hand = { x: 54, y: boden - 112 }
  const treffer = 0.3

  return (
    <div className="px-4 pt-4">
      <svg viewBox="0 0 220 165" className="max-h-52 w-full" aria-hidden focusable="false">
        <line x1="4" y1={boden} x2="216" y2={boden} stroke={FARBE.matt} strokeWidth="1.5" />

        {/* Erst der Schlag, dann ist sie weg. Der Schlaeger faellt dabei aus dem Bild. */}
        <motion.g
          key={`figur-${lauf}`}
          initial={ruhig ? false : { x: 0 }}
          animate={{ x: 130 }}
          transition={takt(ruhig, { delay: treffer + 0.08, duration: 0.85, ease: 'easeOut' })}
        >
          <Figur boden={boden} ohneSchlaeger />
          <motion.g
            key={`schlaeger-${lauf}`}
            initial={ruhig ? false : { rotate: -48, opacity: 1 }}
            animate={ruhig ? { rotate: 100, opacity: 0 } : { rotate: [-48, 62, 100], opacity: [1, 1, 0] }}
            style={{ originX: `${hand.x}px`, originY: `${hand.y}px` }}
            transition={takt(ruhig, { duration: 0.62, times: [0, treffer / 0.62, 1], ease: 'easeOut' })}
          >
            <rect x="52" y={boden - 138} width="5" height="46" rx="2.5" fill={FARBE.naht} />
          </motion.g>
        </motion.g>

        {/* Der Kontakt: ein Blitz, der sofort wieder weg ist. */}
        <motion.circle
          key={`kontakt-${lauf}`}
          cx={hand.x + 12} cy={hand.y}
          fill="none" stroke={FARBE.gut} strokeWidth="2.5"
          initial={ruhig ? false : { r: 2, opacity: 0 }}
          animate={ruhig ? { r: 2, opacity: 0 } : { r: [2, 14], opacity: [0.95, 0] }}
          transition={takt(ruhig, { delay: treffer, duration: 0.35, ease: 'easeOut' })}
        />

        {/* Der Ball fliegt los und verblasst. Wohin, steht hier absichtlich nicht. */}
        <motion.g
          key={`ball-${lauf}`}
          initial={ruhig ? false : { x: hand.x + 12, y: hand.y, opacity: 0 }}
          animate={ruhig
            ? { x: 196, y: 22, opacity: 0.2 }
            : { x: [hand.x + 12, 140, 196], y: [hand.y, 18, 22], opacity: [0, 1, 0.2] }}
          transition={takt(ruhig, { delay: treffer, duration: 1, ease: 'easeOut' })}
        >
          <Ball r={6} />
        </motion.g>
      </svg>
      <p className="pb-1 text-center text-[12px] text-cream-50/70">
        Wo er landet, ist nicht deine Aufgabe.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------- 2 Foul */

/**
 * Zwei Baelle, acht Grad Unterschied, identischer Abflug. Der Punkt ist nicht, welcher
 * fair ist, sondern dass man es von der Platte aus nicht sehen kann.
 */
export function FoulSiehstDuNicht({ lauf, ruhig }: BuehnenProps) {
  // Die rechte Foul-Linie laeuft unter 45 Grad. Steiler als 45 liegt INNERHALB.
  const fair = flug(53, 86)
  const foul = flug(37, 86)
  const gemeinsam = flug(45, 32)

  const weg = (ziel: { x: number; y: number }, farbe: string, testid: string) => (
    <motion.circle
      key={`${testid}-${lauf}`}
      data-testid={testid}
      r="3.4" fill={farbe}
      initial={ruhig ? false : { cx: HOME.x, cy: HOME.y }}
      animate={ruhig ? { cx: ziel.x, cy: ziel.y } : { cx: [HOME.x, gemeinsam.x, ziel.x], cy: [HOME.y, gemeinsam.y, ziel.y] }}
      transition={takt(ruhig, { duration: 1.4, times: [0, 0.38, 1], ease: 'easeOut' })}
    />
  )

  return (
    <div className="px-4 pt-4">
      <MiniFeld ausschnitt="infield" className="max-h-56">
        {weg(fair, FARBE.gut, 'ball-fair')}
        {weg(foul, FARBE.raus, 'ball-foul')}
        <motion.g
          key={`schrift-${lauf}`}
          initial={ruhig ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={takt(ruhig, { delay: 1.45 })}
        >
          <text x={fair.x - 6} y={fair.y - 3} textAnchor="end" fontSize="7" fontWeight="800" fill={FARBE.gut} className="font-display">FAIR</text>
          <text x={foul.x + 6} y={foul.y + 6} fontSize="7" fontWeight="800" fill={FARBE.raus} className="font-display">FOUL</text>
        </motion.g>
      </MiniFeld>
      <p className="pb-1 text-center text-[12px] text-cream-50/70">
        Acht Grad Unterschied. Von der Platte aus siehst du keinen.
      </p>
    </div>
  )
}

/* --------------------------------------------------------------- 3 Gefangen */

/** Der Ball berührt den Boden nicht. Mehr braucht es nicht. */
export function RausGefangen({ lauf, ruhig }: BuehnenProps) {
  return (
    <div className="relative px-4 pt-4">
      <svg viewBox="0 0 200 122" className="max-h-44 w-full" aria-hidden focusable="false">
        <line x1="4" y1="112" x2="196" y2="112" stroke={FARBE.matt} strokeWidth="1.5" />
        {/* Der Handschuh wartet. */}
        <ellipse cx="108" cy="62" rx="13" ry="15" fill={FARBE.hell} opacity="0.3" />

        <motion.g
          key={`ball-${lauf}`}
          initial={ruhig ? false : { x: 22, y: 96 }}
          animate={ruhig ? { x: 108, y: 62 } : { x: [22, 66, 108], y: [96, 16, 62] }}
          transition={takt(ruhig, { duration: 1.1, times: [0, 0.55, 1], ease: 'linear' })}
        >
          <Ball r={6} />
        </motion.g>
      </svg>
      <OutStempel lauf={lauf} ruhig={ruhig} delay={1.2} />
      <p className="pb-1 text-center text-[12px] text-cream-50/70">
        Der Ball hat den Boden nie berührt.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------ 4 Wurf zur 1 */

/** Ein Wettlauf, den der Ball gewinnt. Er fliegt, du läufst. */
export function RausWurfZurEins({ lauf, ruhig }: BuehnenProps) {
  return (
    <div className="relative px-4 pt-4">
      <MiniFeld ausschnitt="infield" className="max-h-56">
        {/* Der Wurf von der Mitte des Infields. */}
        <motion.circle
          key={`ball-${lauf}`}
          r="3.4" fill={FARBE.raus}
          initial={ruhig ? false : { cx: SECOND_BASE.x - 12, cy: SECOND_BASE.y + 16 }}
          animate={{ cx: FIRST_BASE.x, cy: FIRST_BASE.y }}
          transition={takt(ruhig, { delay: 0.3, duration: 0.5, ease: 'linear' })}
        />
        {/* Die Laeuferin ist frueher los und trotzdem spaeter da. */}
        <motion.circle
          key={`laeufer-${lauf}`}
          r="4.5" fill={FARBE.hell}
          initial={ruhig ? false : { cx: HOME.x, cy: HOME.y }}
          animate={{ cx: FIRST_BASE.x - 7, cy: FIRST_BASE.y + 7 }}
          transition={takt(ruhig, { duration: 1.1, ease: 'linear' })}
        />
      </MiniFeld>
      <OutStempel lauf={lauf} ruhig={ruhig} delay={0.9} />
      <p className="pb-1 text-center text-[12px] text-cream-50/70">
        Er fliegt, du läufst.
      </p>
    </div>
  )
}

/* ---------------------------------------------------------------- 5 Getickt */

/** Zwischen zwei Bases gehört dir nichts. Wer dich dort berührt, hat dich. */
export function RausGetickt({ lauf, ruhig }: BuehnenProps) {
  const mitte = { x: (FIRST_BASE.x + SECOND_BASE.x) / 2, y: (FIRST_BASE.y + SECOND_BASE.y) / 2 }

  return (
    <div className="relative px-4 pt-4">
      <MiniFeld ausschnitt="infield" className="max-h-56">
        <motion.circle
          key={`laeufer-${lauf}`}
          r="4.5" fill={FARBE.hell}
          initial={ruhig ? false : { cx: FIRST_BASE.x, cy: FIRST_BASE.y }}
          animate={{ cx: mitte.x, cy: mitte.y }}
          transition={takt(ruhig, { duration: 0.6, ease: 'easeOut' })}
        />
        <motion.circle
          key={`ball-${lauf}`}
          r="3.4" fill={FARBE.raus}
          initial={ruhig ? false : { cx: SECOND_BASE.x, cy: SECOND_BASE.y }}
          animate={{ cx: mitte.x + 5, cy: mitte.y }}
          transition={takt(ruhig, { delay: 0.45, duration: 0.45, ease: 'easeOut' })}
        />
      </MiniFeld>
      <OutStempel lauf={lauf} ruhig={ruhig} delay={1} />
      <p className="pb-1 text-center text-[12px] text-cream-50/70">
        Zwischen zwei Bases gehört dir nichts.
      </p>
    </div>
  )
}
