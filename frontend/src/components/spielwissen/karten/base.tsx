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

/* --------------------------------------------------------------- 2 Force */

/**
 * Der Force: hinter dir rueckt einer nach, also musst du.
 *
 * „Die Base ist sicher" nennt die Ausnahme in ihrem Satz, zeigt sie aber nicht — und sie
 * ist der haeufigste Grund, aus dem ein Anfaenger out geht: er bleibt auf der Base
 * stehen, obwohl der Schlagmann auf dieselbe Base zulaeuft. Niemand muss ihn ticken, der
 * Ball an der Base genuegt.
 *
 * Gezeigt wird zuerst, was NICHT geht: ein durchgestrichener Weg zurueck. Erst danach
 * laufen beide los. Andersherum saehe es aus wie ein gewoehnlicher Lauf mit einem roten
 * Zeichen daneben.
 */
export function ForceAufDerBase({ lauf, ruhig }: BuehnenProps) {
  const zurueck = { x: (FIRST_BASE.x + HOME.x) / 2, y: (FIRST_BASE.y + HOME.y) / 2 }

  return (
    <div className="flex h-full min-h-0 flex-col justify-center px-4 py-3">
      <MiniFeld ausschnitt="diamant" className="min-h-0">
        {/* Der Weg zurueck, durchgestrichen. Rot heisst in dieser App „out", und genau
            das waere er hier auch. */}
        <motion.g
          key={`zurueck-${lauf}`}
          data-testid="kein-zurueck"
          initial={ruhig ? false : { opacity: 0 }}
          animate={ruhig ? { opacity: 1 } : { opacity: [0, 1, 1, 0.25] }}
          transition={takt(ruhig, { duration: 1.6, times: [0, 0.2, 0.6, 1] })}
        >
          <line
            x1={FIRST_BASE.x - 3} y1={FIRST_BASE.y + 3} x2={HOME.x + 14} y2={HOME.y - 14}
            stroke={FARBE.rausHell} strokeWidth="1.4" strokeDasharray="4 3"
          />
          <g stroke={FARBE.rausHell} strokeWidth="1.8" strokeLinecap="round">
            <line x1={zurueck.x - 4} y1={zurueck.y - 4} x2={zurueck.x + 4} y2={zurueck.y + 4} />
            <line x1={zurueck.x + 4} y1={zurueck.y - 4} x2={zurueck.x - 4} y2={zurueck.y + 4} />
          </g>
        </motion.g>

        {/* Der Schlagmann kommt nach: er ist der Grund. */}
        <motion.circle
          key={`batter-${lauf}`}
          data-testid="force-batter"
          r="4.5" fill={FARBE.gut} stroke={FARBE.grund} strokeWidth="0.8"
          initial={ruhig ? false : { cx: HOME.x, cy: HOME.y }}
          animate={{ cx: FIRST_BASE.x, cy: FIRST_BASE.y }}
          transition={takt(ruhig, { delay: 0.6, duration: 1, ease: 'easeOut' })}
        />

        {/* Und du raeumst die Base. */}
        <motion.circle
          key={`laeufer-${lauf}`}
          data-testid="force-laeufer"
          r="4.5" fill={FARBE.gut} stroke={FARBE.grund} strokeWidth="0.8"
          initial={ruhig ? false : { cx: FIRST_BASE.x, cy: FIRST_BASE.y }}
          animate={{ cx: SECOND_BASE.x, cy: SECOND_BASE.y }}
          transition={takt(ruhig, { delay: 0.7, duration: 1, ease: 'easeOut' })}
        />
      </MiniFeld>
    </div>
  )
}

/* ----------------------------------------------------------- 3 Schrittfuss */

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
  /*
   * Der Ball liegt seitlich in ihrer Hand und wandert von dort zum Catcher.
   *
   * Genau auf der Mittellinie lag er der Scheibe mit dem „P" direkt auf dem Buchstaben,
   * seit die Pitcherin mit dem Schritt nach vorne kommt — zwei cremefarbene Kreise
   * uebereinander, und man sah weder den Ball noch, wer da steht. Die Auslenkung laeuft
   * mit dem Wurf aus.
   */
  const ballOrt = {
    x: PITCHING_PLATE.x + 5 * (1 - jetzt.ball) + (CATCHER.x - PITCHING_PLATE.x) * jetzt.ball,
    y: PITCHING_PLATE.y + (CATCHER.y - PITCHING_PLATE.y) * jetzt.ball,
  }

  return (
    <div className="flex h-full min-h-0 flex-col justify-center px-4 py-3">
      <MiniFeld ausschnitt="diamant" className="min-h-0">
        {/*
          **Kein Fussabdruck, sondern der Pitcher selbst.**

          Von oben sieht man keinen Fuss. Erst stand hier ein Oval, das aus doppelter
          Groesse auf seinen Platz schrumpfte — das sah aus, als falle etwas ins Bild, wie
          ein Ball. Dann ein Schuhabdruck, der bei acht Einheiten Laenge wie ein Knochen
          aussah. Was man von oben WIRKLICH sieht, ist die Pitcherin, die mit dem Schritt
          ein Stueck nach vorne kommt. Genau das zeigt die Karte jetzt, und der Ring am
          Runner verschwindet im selben Moment: das ist die Erlaubnis.
        */}
        <motion.g
          data-testid="pitcher"
          /* Der Stand steht als Wort dran: ob die Pitcherin den Schritt gemacht hat,
             laesst sich an einer Bewegung aus JavaScript nicht ablesen. */
          data-schritt={jetzt.fuss ? 'vorne' : 'hinten'}
          initial={false}
          animate={{ y: jetzt.fuss ? 6 : 0 }}
          transition={takt(ruhig, { duration: 0.35, ease: [0.23, 1, 0.32, 1] })}
        >
          <Verteidiger x={PITCHING_PLATE.x} y={PITCHING_PLATE.y} kuerzel="P" r={5} />
        </motion.g>
        <Verteidiger x={CATCHER.x} y={CATCHER.y} kuerzel="C" r={4.5} />

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
