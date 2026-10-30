import { useState } from 'react'
import { motion } from 'motion/react'
import type { BuehnenProps } from '../kapitel'
import { FARBE, MiniFeld } from '../buehne'
import { HOME, FIRST_BASE, SECOND_BASE, PITCHING_PLATE } from '@/components/playmaker/board/geometry'

/**
 * Kapitel 3: wann man von der Base darf.
 *
 * Drei der fuenf Karten zeigen dieselbe Bewegung, 1 nach 2, und unterscheiden sich nur
 * im Anlass: der Ball rutscht durch, oder man hat es vorher entschieden. Das ist der
 * Punkt, nicht ein Mangel an Einfaellen.
 */

const takt = (ruhig: boolean, t: { duration?: number; delay?: number } & Record<string, unknown>) =>
  ruhig ? { duration: 0, delay: 0 } : t

/** Der Catcher sitzt ein Stueck hinter der Platte. */
const CATCHER = { x: HOME.x, y: HOME.y + 7 }

/* --------------------------------------------------------------- 1 Sicher */

/** Solange du draufstehst, kann dir niemand etwas. Die ruhigste Karte des Kapitels. */
export function BaseIstSicher({ lauf, ruhig }: BuehnenProps) {
  return (
    <div className="px-4 pt-4">
      <MiniFeld ausschnitt="infield" className="max-h-56">
        <motion.circle
          key={`ring-${lauf}`}
          cx={FIRST_BASE.x} cy={FIRST_BASE.y}
          fill="none" stroke={FARBE.gut} strokeWidth="1.6"
          initial={ruhig ? false : { r: 4, opacity: 0 }}
          animate={{ r: 11, opacity: 0.75 }}
          transition={takt(ruhig, { duration: 0.5, ease: 'easeOut' })}
        />
        <circle cx={FIRST_BASE.x} cy={FIRST_BASE.y} r="4.5" fill={FARBE.hell} />

        {/* Der Ball kommt vorbei und richtet nichts aus. */}
        <motion.circle
          key={`ball-${lauf}`}
          r="3.4" fill={FARBE.raus}
          initial={ruhig ? false : { cx: SECOND_BASE.x, cy: SECOND_BASE.y }}
          animate={ruhig
            ? { cx: HOME.x + 30, cy: HOME.y - 20 }
            : { cx: [SECOND_BASE.x, FIRST_BASE.x + 14, HOME.x + 30], cy: [SECOND_BASE.y, FIRST_BASE.y + 6, HOME.y - 20] }}
          transition={takt(ruhig, { delay: 0.4, duration: 1, ease: 'linear' })}
        />
      </MiniFeld>
      <p className="pb-1 text-center text-[12px] text-cream-50/70">
        Steh drauf, und der Ball geht dich nichts an.
      </p>
    </div>
  )
}

/* -------------------------------------------------------------- 2 Release */

/**
 * Kein Leadoff. Zwei Laeuferinnen nebeneinander: die eine geht zu frueh und muss
 * zurueck, die andere geht mit dem Abwurf und ist weg.
 */
export function LosBeimRelease({ lauf, ruhig }: BuehnenProps) {
  const ziel = { x: (FIRST_BASE.x + SECOND_BASE.x) / 2, y: (FIRST_BASE.y + SECOND_BASE.y) / 2 }

  return (
    <div className="px-4 pt-4">
      <MiniFeld ausschnitt="infield" className="max-h-56">
        {/* Der Pitch verlaesst die Hand erst nach einem Moment. */}
        <circle cx={PITCHING_PLATE.x} cy={PITCHING_PLATE.y} r="4" fill={FARBE.hell} opacity="0.45" />
        <motion.circle
          key={`ball-${lauf}`}
          r="3.2" fill={FARBE.gut}
          initial={ruhig ? false : { cx: PITCHING_PLATE.x, cy: PITCHING_PLATE.y }}
          animate={{ cx: CATCHER.x, cy: CATCHER.y }}
          transition={takt(ruhig, { delay: 0.6, duration: 0.45, ease: 'linear' })}
        />

        {/* Zu frueh: sie laeuft an und steht am Ende wieder auf ihrer Base. */}
        <motion.circle
          key={`frueh-${lauf}`}
          data-testid="laeufer-frueh"
          r="4.5" fill={FARBE.raus}
          initial={ruhig ? false : { cx: FIRST_BASE.x, cy: FIRST_BASE.y }}
          animate={ruhig
            ? { cx: FIRST_BASE.x, cy: FIRST_BASE.y }
            : { cx: [FIRST_BASE.x, FIRST_BASE.x - 9, FIRST_BASE.x], cy: [FIRST_BASE.y, FIRST_BASE.y - 9, FIRST_BASE.y] }}
          transition={takt(ruhig, { duration: 1.1, times: [0, 0.3, 1], ease: 'easeOut' })}
        />

        {/* Mit dem Abwurf: sie ist unterwegs. */}
        <motion.circle
          key={`rechtzeitig-${lauf}`}
          data-testid="laeufer-rechtzeitig"
          r="4.5" fill={FARBE.hell}
          initial={ruhig ? false : { cx: FIRST_BASE.x + 7, cy: FIRST_BASE.y + 7 }}
          animate={{ cx: ziel.x + 7, cy: ziel.y + 7 }}
          transition={takt(ruhig, { delay: 0.6, duration: 0.8, ease: 'easeOut' })}
        />
      </MiniFeld>
      <div className="flex justify-center gap-4 pb-1 text-[11px]">
        <span className="text-softball-red-600">Zu früh, zurück</span>
        <span className="text-cream-50/80">Mit dem Abwurf, weg</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ 3 Wild Pitch */

/** Der Ball rutscht am Catcher vorbei. Das ist geschenkt, und es ist schnell vorbei. */
export function WildPitch({ lauf, ruhig }: BuehnenProps) {
  const vorbei = { x: HOME.x - 30, y: HOME.y + 16 }

  return (
    <div className="px-4 pt-4">
      <MiniFeld ausschnitt="infield" className="max-h-56">
        <circle cx={CATCHER.x} cy={CATCHER.y} r="4" fill={FARBE.hell} opacity="0.45" />

        <motion.circle
          key={`ball-${lauf}`}
          data-testid="ball-wild"
          r="3.2" fill={FARBE.gut}
          initial={ruhig ? false : { cx: PITCHING_PLATE.x, cy: PITCHING_PLATE.y }}
          animate={ruhig ? { cx: vorbei.x, cy: vorbei.y } : { cx: [PITCHING_PLATE.x, CATCHER.x - 6, vorbei.x], cy: [PITCHING_PLATE.y, CATCHER.y, vorbei.y] }}
          transition={takt(ruhig, { duration: 0.75, ease: 'linear' })}
        />

        <motion.circle
          key={`laeufer-${lauf}`}
          r="4.5" fill={FARBE.hell}
          initial={ruhig ? false : { cx: FIRST_BASE.x, cy: FIRST_BASE.y }}
          animate={{ cx: SECOND_BASE.x, cy: SECOND_BASE.y }}
          transition={takt(ruhig, { delay: 0.5, duration: 0.9, ease: 'easeOut' })}
        />
      </MiniFeld>
      <p className="pb-1 text-center text-[12px] text-cream-50/70">
        Er sucht den Ball. Du nicht.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ 4 Steal */

/** Derselbe Weg wie beim Wild Pitch, nur ohne Fehler der Gegenseite. */
export function Steal({ lauf, ruhig }: BuehnenProps) {
  return (
    <div className="px-4 pt-4">
      <MiniFeld ausschnitt="infield" className="max-h-56">
        <circle cx={CATCHER.x} cy={CATCHER.y} r="4" fill={FARBE.hell} opacity="0.45" />

        <motion.circle
          key={`ball-${lauf}`}
          r="3.2" fill={FARBE.gut}
          initial={ruhig ? false : { cx: PITCHING_PLATE.x, cy: PITCHING_PLATE.y }}
          animate={{ cx: CATCHER.x, cy: CATCHER.y }}
          transition={takt(ruhig, { duration: 0.45, ease: 'linear' })}
        />

        {/* Sie startet mit dem Abwurf, nicht mit dem Fehler. */}
        <motion.circle
          key={`laeufer-${lauf}`}
          r="4.5" fill={FARBE.hell}
          initial={ruhig ? false : { cx: FIRST_BASE.x, cy: FIRST_BASE.y }}
          animate={{ cx: SECOND_BASE.x, cy: SECOND_BASE.y }}
          transition={takt(ruhig, { duration: 1, ease: 'easeOut' })}
        />
        {/* Der Wurf des Catchers hinterher. */}
        <motion.circle
          key={`wurf-${lauf}`}
          r="3.2" fill={FARBE.raus}
          initial={ruhig ? false : { cx: CATCHER.x, cy: CATCHER.y, opacity: 0 }}
          animate={{ cx: SECOND_BASE.x + 6, cy: SECOND_BASE.y + 6, opacity: 1 }}
          transition={takt(ruhig, { delay: 0.55, duration: 0.5, ease: 'linear' })}
        />
      </MiniFeld>
      <p className="pb-1 text-center text-[12px] text-cream-50/70">
        Du entscheidest vorher, nicht unterwegs.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ 5 Tag up */

const TAGUP = [
  { text: 'Der Ball fliegt. Du bleibst auf der Base.', ball: 0.1, laeufer: 0 },
  { text: 'Gefangen. Jetzt erst berührst du die Base und läufst.', ball: 0.55, laeufer: 0 },
  { text: 'Weg. Und zwar legal.', ball: 1, laeufer: 1 },
]

/**
 * Der Zwilling von „Raus: gefangen", aus Sicht der Laeuferin. Der Fehler kostet
 * reihenweise Outs, und er passiert, weil man zu frueh losrennt.
 *
 * Hier fuehrt kein Zeitablauf, sondern ein Knopf: die Reihenfolge ist die Auskunft, und
 * wer sie selbst weiterschaltet, merkt sich, dass es drei Schritte sind.
 */
export function TagUp({ lauf, ruhig }: BuehnenProps) {
  const [schritt, setSchritt] = useState(0)
  const jetzt = TAGUP[schritt]
  const ziel = { x: SECOND_BASE.x, y: SECOND_BASE.y }
  const start = FIRST_BASE
  // Ins linke Mittelfeld, weit weg von der Laeuferin auf der 1.
  const ballOrt = {
    x: HOME.x - 44 + jetzt.ball * 8,
    y: HOME.y - 62 - jetzt.ball * 22,
  }

  return (
    <div key={lauf} className="px-4 pt-4">
      <MiniFeld ausschnitt="infield" className="max-h-56">
        <motion.circle
          initial={{ cx: ballOrt.x, cy: ballOrt.y }}
          animate={{ cx: ballOrt.x, cy: ballOrt.y }}
          transition={takt(ruhig, { duration: 0.45, ease: 'easeOut' })}
          r="3.2" fill={FARBE.gut}
        />
        <motion.circle
          initial={{ cx: start.x, cy: start.y }}
          animate={{
            cx: start.x + (ziel.x - start.x) * jetzt.laeufer,
            cy: start.y + (ziel.y - start.y) * jetzt.laeufer,
          }}
          transition={takt(ruhig, { duration: 0.6, ease: 'easeOut' })}
          r="4.5" fill={FARBE.hell}
        />
      </MiniFeld>

      <p className="min-h-10 px-1 text-center text-[12px] leading-snug text-cream-50/80">
        <span data-testid="tagup-schritt" className="sr-only">{schritt + 1}</span>
        {jetzt.text}
      </p>

      <button
        type="button"
        onClick={() => setSchritt(s => (s + 1) % TAGUP.length)}
        className="font-display mb-1 min-h-11 w-full rounded-lg bg-navy-800 px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest text-cream-50 active:bg-navy-700"
      >
        {schritt === TAGUP.length - 1 ? 'Von vorn' : 'Weiter'}
      </button>
    </div>
  )
}
