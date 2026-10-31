import { useState } from 'react'
import { motion } from 'motion/react'
import type { BuehnenProps } from '../kapitel'
import { takt, FARBE, MiniFeld, SicherRing, Verteidiger } from '../buehne'
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

/* --------------------------------------------------------------- 1 Sicher */

/** Solange du draufstehst, kann dir niemand etwas. Die ruhigste Karte des Kapitels. */
export function BaseIstSicher({ lauf, ruhig }: BuehnenProps) {
  return (
    <div className="flex h-full min-h-0 flex-col justify-center px-4 py-3">
      <MiniFeld ausschnitt="diamant" className="min-h-0">
        <motion.circle
          key={`ring-${lauf}`}
          cx={FIRST_BASE.x} cy={FIRST_BASE.y}
          fill="none" stroke={FARBE.gut} strokeWidth="1.6"
          initial={ruhig ? false : { r: 4, opacity: 0 }}
          animate={{ r: 11, opacity: 0.75 }}
          transition={takt(ruhig, { duration: 0.5, ease: 'easeOut' })}
        />
        <circle cx={FIRST_BASE.x} cy={FIRST_BASE.y} r="4.5" fill={FARBE.gut} stroke={FARBE.grund} strokeWidth="0.8" />

        {/* Der Ball kommt vorbei und richtet nichts aus. */}
        <motion.circle
          key={`ball-${lauf}`}
          r="3.4" fill={FARBE.ball} stroke={FARBE.naht} strokeWidth="1.15"
          initial={ruhig ? false : { cx: SECOND_BASE.x, cy: SECOND_BASE.y }}
          animate={ruhig
            ? { cx: HOME.x + 30, cy: HOME.y - 20 }
            : { cx: [SECOND_BASE.x, FIRST_BASE.x + 14, HOME.x + 30], cy: [SECOND_BASE.y, FIRST_BASE.y + 6, HOME.y - 20] }}
          transition={takt(ruhig, { delay: 0.4, duration: 1, ease: 'linear' })}
        />
      </MiniFeld>
    </div>
  )
}

/* ----------------------------------------------------------- 2 Schrittfuss */

const RELEASE = [
  { text: 'Der Ball liegt in der Hand der Pitcherin. Du stehst auf der Base.', ball: 0, fuss: false, laeufer: 0 },
  { text: 'Ihr Schrittfuß landet. Ab hier darfst du.', ball: 0.16, fuss: true, laeufer: 0 },
  { text: 'Und erst ab hier. Vorher gibt es keinen Vorsprung.', ball: 1, fuss: true, laeufer: 1 },
]

/**
 * Kein Leadoff, und zwar ab **dem Schrittfuss**.
 *
 * Die Karte sagte erst „erst wenn der Ball die Hand verlaesst". Das Regelwerk 2026 bis
 * 2029 nennt einen anderen Moment: Regel 5.10.3 b.ii) verlangt Kontakt zum Base, „bis der
 * Schrittfuss des Pitchers waehrend seiner Pitch-Bewegung den Boden beruehrt". Der liegt
 * einen Wimpernschlag **vor** dem Release, und die Strafe ist nicht nur das Out, sondern
 * zusaetzlich „NO PITCH" — der Pitch zaehlt also nicht einmal. Das Wort Release bleibt
 * trotzdem unter dem Bild stehen: so sagt es das halbe Team, und wer danach sucht, soll
 * die Karte wiederfinden.
 *
 * Erst stand hier eine zweite, rote Laeuferin, die zu frueh losging und zurueckmusste.
 * Das las niemand: **Rot heisst in dieser App ueberall „out"**, und die Aufloesung stand
 * als Legende unter dem Bild statt am Punkt. Wer die Bewegung verpasste, sah zwei Punkte
 * und Kleingedrucktes.
 *
 * Jetzt fuehrt ein Knopf durch drei Staende, wie bei `TagUp`. Es gibt nur **eine**
 * Laeuferin, und die Erlaubnis haengt sichtbar am Abdruck: solange keiner da ist, haelt
 * der Ring sie auf der Base. Derselbe Ring wie auf der Karte „Die Base ist sicher", und
 * er meint dort dasselbe.
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
    <div className="flex h-full min-h-0 flex-col justify-center px-4 py-3">
      <MiniFeld ausschnitt="diamant" className="min-h-0">
        <Verteidiger x={PITCHING_PLATE.x} y={PITCHING_PLATE.y} kuerzel="P" r={5} />
        <Verteidiger x={CATCHER.x} y={CATCHER.y} kuerzel="C" r={4.5} />

        {/*
          Der Abdruck des Schrittfusses: der Moment, auf den es ankommt. Er steht schraeg
          vor der Platte, weil der Schritt Richtung Home geht.

          **Cream und nicht Amber**, obwohl er die Erlaubnis ausloest: der Ball ist auf
          dieser Karte amber und faellt unmittelbar daneben. Zwei amberfarbene Flecken
          nebeneinander waren im Browser nicht auseinanderzuhalten. Ein Fuss ist ohnehin
          ein Koerperteil, und Koerperteile sind hier cream. Das Signal „jetzt darfst du"
          traegt der Ring, der im selben Stand verschwindet.
        */}
        {jetzt.fuss && (
          <motion.ellipse
            data-testid="schrittfuss"
            cx={PITCHING_PLATE.x + 8} cy={PITCHING_PLATE.y + 8}
            rx="2.2" ry="3.4"
            fill={FARBE.hell}
            transform={`rotate(-28 ${PITCHING_PLATE.x + 8} ${PITCHING_PLATE.y + 8})`}
            initial={ruhig ? false : { opacity: 0, scale: 2 }}
            animate={{ opacity: 0.95, scale: 1 }}
            style={{ originX: `${PITCHING_PLATE.x + 8}px`, originY: `${PITCHING_PLATE.y + 8}px` }}
            transition={takt(ruhig, { duration: 0.3, ease: 'easeOut' })}
          />
        )}

        {/* Solange der Fuss nicht unten ist, haelt der Ring sie fest. Ab Stand 2 ist er
            weg, obwohl sie noch steht: die Erlaubnis kommt vor der Bewegung. */}
        {!jetzt.fuss && (
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
          r="3.2" fill={FARBE.ball} stroke={FARBE.naht} strokeWidth="1.1"
        />
        <motion.circle
          data-testid="laeufer"
          initial={{ cx: start.x, cy: start.y }}
          animate={{
            cx: start.x + (ziel.x - start.x) * jetzt.laeufer,
            cy: start.y + (ziel.y - start.y) * jetzt.laeufer,
          }}
          transition={takt(ruhig, { duration: 0.6, ease: 'easeOut' })}
          r="4.5" fill={FARBE.gut} stroke={FARBE.grund} strokeWidth="0.8"
        />
      </MiniFeld>

      <p className="min-h-10 px-1 text-center text-[12px] leading-snug text-cream-50/80">
        {jetzt.text}
      </p>
      <p className="px-1 pb-1 text-center text-[11px] text-cream-50/55">
        Viele sagen Release dazu. Der Fuß ist einen Hauch früher.
      </p>

      <button
        type="button"
        onClick={() => setSchritt(s => (s + 1) % RELEASE.length)}
        className="font-display mb-1 flex h-12 w-full items-center justify-center rounded-xl border border-cream-50/25 px-3 text-[11px] font-extrabold uppercase tracking-widest text-cream-50 active:bg-cream-50/10"
      >
        {schritt === RELEASE.length - 1 ? 'Von vorn' : 'Nächster Schritt'}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------ 3 Wild Pitch */

/** Der Ball rutscht am Catcher vorbei. Das ist geschenkt, und es ist schnell vorbei. */
export function WildPitch({ lauf, ruhig }: BuehnenProps) {
  const vorbei = { x: HOME.x - 30, y: HOME.y + 16 }

  return (
    <div className="flex h-full min-h-0 flex-col justify-center px-4 py-3">
      <MiniFeld ausschnitt="diamant" className="min-h-0">
        <Verteidiger x={CATCHER.x} y={CATCHER.y} kuerzel="C" r={4.5} />

        <motion.circle
          key={`ball-${lauf}`}
          data-testid="ball-wild"
          r="3.2" fill={FARBE.ball} stroke={FARBE.naht} strokeWidth="1.1"
          initial={ruhig ? false : { cx: PITCHING_PLATE.x, cy: PITCHING_PLATE.y }}
          animate={ruhig ? { cx: vorbei.x, cy: vorbei.y } : { cx: [PITCHING_PLATE.x, CATCHER.x - 6, vorbei.x], cy: [PITCHING_PLATE.y, CATCHER.y, vorbei.y] }}
          transition={takt(ruhig, { duration: 0.75, ease: 'linear' })}
        />

        <motion.circle
          key={`laeufer-${lauf}`}
          r="4.5" fill={FARBE.gut} stroke={FARBE.grund} strokeWidth="0.8"
          initial={ruhig ? false : { cx: FIRST_BASE.x, cy: FIRST_BASE.y }}
          animate={{ cx: SECOND_BASE.x, cy: SECOND_BASE.y }}
          transition={takt(ruhig, { delay: 0.5, duration: 0.9, ease: 'easeOut' })}
        />
        <SicherRing ort={SECOND_BASE} ruhig={ruhig} delay={1.3} />
      </MiniFeld>
    </div>
  )
}

/* ------------------------------------------------------------------ 4 Steal */

/** Derselbe Weg wie beim Wild Pitch, nur ohne Fehler der Gegenseite. */
export function Steal({ lauf, ruhig }: BuehnenProps) {
  return (
    <div className="flex h-full min-h-0 flex-col justify-center px-4 py-3">
      <MiniFeld ausschnitt="diamant" className="min-h-0">
        <Verteidiger x={CATCHER.x} y={CATCHER.y} kuerzel="C" r={4.5} />

        <motion.circle
          key={`ball-${lauf}`}
          r="3.2" fill={FARBE.ball} stroke={FARBE.naht} strokeWidth="1.1"
          initial={ruhig ? false : { cx: PITCHING_PLATE.x, cy: PITCHING_PLATE.y }}
          animate={{ cx: CATCHER.x, cy: CATCHER.y }}
          transition={takt(ruhig, { duration: 0.45, ease: 'linear' })}
        />

        {/* Sie startet mit dem Abwurf, nicht mit dem Fehler. */}
        <motion.circle
          key={`laeufer-${lauf}`}
          r="4.5" fill={FARBE.gut} stroke={FARBE.grund} strokeWidth="0.8"
          initial={ruhig ? false : { cx: FIRST_BASE.x, cy: FIRST_BASE.y }}
          animate={{ cx: SECOND_BASE.x, cy: SECOND_BASE.y }}
          transition={takt(ruhig, { duration: 1, ease: 'easeOut' })}
        />
        {/* Der Wurf des Catchers hinterher. */}
        <motion.circle
          key={`wurf-${lauf}`}
          r="3.2" fill={FARBE.ball} stroke={FARBE.naht} strokeWidth="1.1"
          initial={ruhig ? false : { cx: CATCHER.x, cy: CATCHER.y, opacity: 0 }}
          animate={{ cx: SECOND_BASE.x + 6, cy: SECOND_BASE.y + 6, opacity: 1 }}
          transition={takt(ruhig, { delay: 0.55, duration: 0.5, ease: 'linear' })}
        />
        <SicherRing ort={SECOND_BASE} ruhig={ruhig} delay={1.1} />
      </MiniFeld>
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
    <div className="flex h-full min-h-0 flex-col justify-center px-4 py-3">
      <MiniFeld ausschnitt="diamant" className="min-h-0">
        <motion.circle
          initial={{ cx: ballOrt.x, cy: ballOrt.y }}
          animate={{ cx: ballOrt.x, cy: ballOrt.y }}
          transition={takt(ruhig, { duration: 0.45, ease: 'easeOut' })}
          r="3.2" fill={FARBE.ball} stroke={FARBE.naht} strokeWidth="1.1"
        />
        {jetzt.laeufer === 0 && <SicherRing ort={start} ruhig={ruhig} />}
        <motion.circle
          initial={{ cx: start.x, cy: start.y }}
          animate={{
            cx: start.x + (ziel.x - start.x) * jetzt.laeufer,
            cy: start.y + (ziel.y - start.y) * jetzt.laeufer,
          }}
          transition={takt(ruhig, { duration: 0.6, ease: 'easeOut' })}
          r="4.5" fill={FARBE.gut} stroke={FARBE.grund} strokeWidth="0.8"
        />
      </MiniFeld>

      <p className="min-h-10 px-1 text-center text-[12px] leading-snug text-cream-50/80">
        <span data-testid="tagup-schritt" className="sr-only">{schritt + 1}</span>
        {jetzt.text}
      </p>

      <button
        type="button"
        onClick={() => setSchritt(s => (s + 1) % TAGUP.length)}
        className="font-display mb-1 flex h-12 w-full items-center justify-center rounded-xl border border-cream-50/25 px-3 text-[11px] font-extrabold uppercase tracking-widest text-cream-50 active:bg-cream-50/10"
      >
        {schritt === TAGUP.length - 1 ? 'Von vorn' : 'Nächster Schritt'}
      </button>
    </div>
  )
}
