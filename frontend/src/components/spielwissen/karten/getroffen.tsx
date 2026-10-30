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
        style={{ borderColor: FARBE.rausHell, color: FARBE.rausHell }}
        className="font-display rounded border-[3px] px-4 py-1 text-2xl font-extrabold uppercase tracking-widest"
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

        {/* Die Spur: sie zeichnet sich hinter ihr ein, damit der Endzustand den Weg zeigt
            und nicht nur eine Person, die irgendwo steht. */}
        <motion.line
          key={`spur-${lauf}`}
          x1="44" y1={boden - 4} y2={boden - 4}
          stroke={FARBE.hell} strokeWidth="1.4" strokeDasharray="5 5" opacity="0.4"
          initial={ruhig ? false : { x2: 44 }}
          animate={{ x2: 148 }}
          transition={takt(ruhig, { delay: treffer + 0.08, duration: 0.85, ease: 'easeOut' })}
        />

        {/* Erst der Schlag, dann ist sie weg. Der Schlaeger faellt dabei aus dem Bild. */}
        <motion.g
          key={`figur-${lauf}`}
          initial={ruhig ? false : { x: 0, rotate: 0 }}
          animate={{ x: 116, rotate: 9 }}
          style={{ originX: '44px', originY: `${boden}px` }}
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
            ? { x: 206, y: 10, opacity: 0.45 }
            : { x: [hand.x + 12, 142, 206], y: [hand.y, 14, 10], opacity: [0, 1, 0.45] }}
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

/**
 * Der Ball beruehrt den Boden nicht. Mehr ist die Regel nicht.
 *
 * Erst stand hier nur ein blasser Fleck als Handschuh, und niemand erkannte ihn: ein
 * grauer Kreis hinter einem Ball ist kein Fanghandschuh, sondern ein grauer Kreis.
 * Jetzt steht eine ganze Person da, mit erhobenem Arm, und der Ball landet sichtbar
 * IN der Hand. Die Flugbahn bleibt die eigentliche Auskunft: hoch, und nie unten.
 */
export function RausGefangen({ lauf, ruhig }: BuehnenProps) {
  const boden = 112
  /* Wo der Handschuh steht. Der Ball endet genau hier. */
  const fang = { x: 166, y: 42 }

  return (
    <div className="relative px-4 pt-4">
      <svg viewBox="0 0 200 128" className="max-h-44 w-full" aria-hidden focusable="false">
        <line x1="4" y1={boden} x2="196" y2={boden} stroke={FARBE.matt} strokeWidth="1.5" />

        {/* Der Fielder: Kopf, Rumpf, Beine. */}
        <circle cx="148" cy="64" r="7" fill={FARBE.hell} />
        <rect x="142" y="73" width="12" height="22" rx="6" fill={FARBE.hell} />
        <rect x="143" y="95" width="4" height="17" rx="2" fill={FARBE.hell} />
        <rect x="149" y="95" width="4" height="17" rx="2" fill={FARBE.hell} />
        {/* Der Arm: kurz und kraeftig. Ein langer duenner Stiel mit einem Kreis obendrauf
            sah aus wie ein Badmintonschlaeger. */}
        <rect
          x="152" y="52" width="6" height="26" rx="3" fill={FARBE.hell}
          transform="rotate(18 155 78)"
        />

        {/*
          Der Fanghandschuh: ein gefuellter Koerper mit Daumen, keine Scheibe mit Loch.
          Im Moment des Fangs geht er kurz auf und wieder zu.
        */}
        <motion.g
          key={`hand-${lauf}`}
          initial={ruhig ? false : { scale: 1 }}
          animate={ruhig ? { scale: 0.94 } : { scale: [1, 1, 1.12, 0.94] }}
          style={{ originX: `${fang.x}px`, originY: `${fang.y}px` }}
          transition={takt(ruhig, { duration: 1.3, times: [0, 0.78, 0.86, 1], ease: 'easeOut' })}
        >
          {/* Die Tasche. */}
          <ellipse cx={fang.x} cy={fang.y} rx="11" ry="12" fill={FARBE.leder} />
          {/* Der Daumen, zur Koerperseite. */}
          <ellipse
            cx={fang.x - 9} cy={fang.y + 3} rx="4.5" ry="8" fill={FARBE.leder}
            transform={`rotate(-22 ${fang.x - 9} ${fang.y + 3})`}
          />
          {/* Zwei Kerben zwischen den Fingern. Nur angedeutet, nicht durchgezeichnet. */}
          <path
            d={`M ${fang.x - 1} ${fang.y - 11} l 2 7 M ${fang.x + 6} ${fang.y - 9} l 0 7`}
            stroke={FARBE.grund} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" fill="none"
          />
        </motion.g>

        <motion.g
          key={`ball-${lauf}`}
          initial={ruhig ? false : { x: 22, y: 100 }}
          animate={ruhig ? { x: fang.x, y: fang.y } : { x: [22, 92, fang.x], y: [100, 14, fang.y] }}
          transition={takt(ruhig, { duration: 1.05, times: [0, 0.55, 1], ease: 'linear' })}
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
