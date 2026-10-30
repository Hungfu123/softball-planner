import { useState } from 'react'
import { motion } from 'motion/react'
import type { BuehnenProps } from '../kapitel'
import { takt, FARBE, MiniFeld, SicherRing } from '../buehne'
import { HOME, FIRST_BASE, SECOND_BASE, PITCHING_PLATE } from '@/components/playmaker/board/geometry'

/**
 * Kapitel 3: wann man von der Base darf.
 *
 * Drei der fuenf Karten zeigen dieselbe Bewegung, 1 nach 2, und unterscheiden sich nur
 * im Anlass: der Ball rutscht durch, oder man hat es vorher entschieden. Das ist der
 * Punkt, nicht ein Mangel an Einfaellen.
 */

/** Der Catcher sitzt ein Stueck hinter der Platte. */
const CATCHER = { x: HOME.x, y: HOME.y + 7 }

/** Der Nachsatz unter den beiden Lauf-Karten. Eine Zeile, und sie ist die Regel. */
function DraufBleiben() {
  return (
    <p className="pb-1 text-center font-display text-[12px] font-bold uppercase tracking-wide text-amber-400">
      Angekommen? Drauf bleiben.
    </p>
  )
}

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

const RELEASE = [
  { text: 'Der Ball liegt in der Hand der Pitcherin. Du stehst auf der Base.', ball: 0, laeufer: 0 },
  { text: 'Jetzt ist er raus. Ab hier darfst du.', ball: 0.5, laeufer: 0 },
  { text: 'Und erst ab hier. Vorher gibt es keinen Vorsprung.', ball: 1, laeufer: 1 },
]

/**
 * Kein Leadoff.
 *
 * Erst stand hier eine zweite, rote Laeuferin, die zu frueh losging und zurueckmusste.
 * Das las niemand: **Rot heisst in dieser App ueberall „raus"**, und die Aufloesung stand
 * als Legende unter dem Bild statt am Punkt. Wer die Bewegung verpasste, sah zwei Punkte
 * und Kleingedrucktes.
 *
 * Jetzt fuehrt ein Knopf durch drei Staende, wie bei `TagUp`. Es gibt nur **eine**
 * Laeuferin, und die Erlaubnis ist sichtbar an den Ball geknuepft: solange er in der Hand
 * liegt, haelt der Ring sie auf der Base. Derselbe Ring wie auf der Karte „Die Base ist
 * sicher", und er meint dort dasselbe.
 */
export function LosBeimRelease({ ruhig }: BuehnenProps) {
  const [schritt, setSchritt] = useState(0)
  const jetzt = RELEASE[schritt]
  const start = FIRST_BASE
  const ziel = SECOND_BASE
  const ballOrt = {
    x: PITCHING_PLATE.x + (CATCHER.x - PITCHING_PLATE.x) * jetzt.ball,
    y: PITCHING_PLATE.y + (CATCHER.y - PITCHING_PLATE.y) * jetzt.ball,
  }

  return (
    <div className="px-4 pt-4">
      <MiniFeld ausschnitt="infield" className="max-h-56">
        <circle cx={PITCHING_PLATE.x} cy={PITCHING_PLATE.y} r="5" fill={FARBE.hell} opacity="0.35" />
        <circle cx={CATCHER.x} cy={CATCHER.y} r="4" fill={FARBE.hell} opacity="0.35" />

        {/* Solange der Ball nicht weg ist, haelt der Ring sie fest. */}
        {jetzt.laeufer === 0 && (
          <motion.circle
            cx={start.x} cy={start.y} r="10"
            fill="none" stroke={FARBE.gut} strokeWidth="1.6"
            initial={ruhig ? false : { opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={takt(ruhig, { duration: 0.3 })}
          />
        )}

        <motion.circle
          data-testid="ball"
          initial={{ cx: ballOrt.x, cy: ballOrt.y }}
          animate={{ cx: ballOrt.x, cy: ballOrt.y }}
          transition={takt(ruhig, { duration: 0.4, ease: 'easeOut' })}
          r="3.2" fill={FARBE.gut}
        />
        <motion.circle
          data-testid="laeufer"
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
        {jetzt.text}
      </p>

      <button
        type="button"
        onClick={() => setSchritt(s => (s + 1) % RELEASE.length)}
        className="font-display mb-1 min-h-11 w-full rounded-lg bg-navy-800 px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest text-cream-50 active:bg-navy-700"
      >
        {schritt === RELEASE.length - 1 ? 'Von vorn' : 'Weiter'}
      </button>
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
        <SicherRing ort={SECOND_BASE} ruhig={ruhig} delay={1.3} />
      </MiniFeld>
      <p className="text-center text-[12px] text-cream-50/70">
        Der Catcher sucht. Du läufst.
      </p>
      <DraufBleiben />
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
        <SicherRing ort={SECOND_BASE} ruhig={ruhig} delay={1.1} />
      </MiniFeld>
      <p className="text-center text-[12px] text-cream-50/70">
        Du entscheidest vorher, nicht unterwegs.
      </p>
      <DraufBleiben />
    </div>
  )
}

/* ------------------------------------------------------------------ 5 Tag up */

const TAGUP = [
  { text: 'Der Ball fliegt. Du bleibst mit einem Fuß auf der Base.', ball: 0.1, laeufer: 0 },
  { text: 'Gefangen. Erst jetzt darfst du los.', ball: 0.55, laeufer: 0 },
  { text: 'Weg. Und zwar legal.', ball: 1, laeufer: 1 },
]

/**
 * Der Zwilling von „Raus: gefangen", aus Sicht der Laeuferin. Der Fehler kostet
 * reihenweise Outs, und er passiert, weil man zu frueh losrennt.
 *
 * Hier fuehrt kein Zeitablauf, sondern ein Knopf: die Reihenfolge ist die Auskunft, und
 * wer sie selbst weiterschaltet, merkt sich, dass es drei Schritte sind.
 */
export function TagUp({ ruhig }: BuehnenProps) {
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
    <div className="px-4 pt-4">
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
