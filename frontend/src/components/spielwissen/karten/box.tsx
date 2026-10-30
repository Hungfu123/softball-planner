import { useState } from 'react'
import { motion } from 'motion/react'
import type { BuehnenProps } from '../kapitel'
import { takt, Ball, FARBE, Figur, MiniFeld, SicherRing } from '../buehne'
import { HOME, FIRST_BASE, SECOND_BASE } from '@/components/playmaker/board/geometry'

/**
 * Kapitel 1: was in der Box zaehlt.
 *
 * Jede Buehne bekommt `lauf` (zaehlt bei „nochmal" hoch, haengt an den `key`s) und
 * `ruhig` (reduzierte Bewegung, dann steht sofort der Endzustand da).
 */

const AUS = [0.23, 1, 0.32, 1] as const

/** Dauer und Verzoegerung, bei reduzierter Bewegung auf null. */
/** Der Stempel, mit dem eine Buehne ihr Urteil hinschreibt. */
function Stempel({ text, art, lauf, ruhig, delay = 0 }: {
  text: string
  art: 'raus' | 'gut' | 'hell'
  lauf: number
  ruhig: boolean
  delay?: number
}) {
  /*
   * Feste Werte statt Paletten-Klassen: die Buehne ist in beiden Themes navy, der
   * Dunkel-Shim aber deutet `text-navy-900` zu Weiss um. Auf Amber ergab das rund 1,7:1,
   * also einen unlesbaren Stempel — ausgerechnet die Pointe der Count-Karte.
   */
  const flaeche = art === 'raus' ? FARBE.raus : art === 'gut' ? FARBE.gut : FARBE.hell
  const schrift = art === 'raus' ? FARBE.hell : FARBE.grund
  return (
    <motion.span
      key={`${text}-${lauf}`}
      initial={ruhig ? false : { scale: 1.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={takt(ruhig, { delay, type: 'spring', stiffness: 320, damping: 16 })}
      style={{ backgroundColor: flaeche, color: schrift }}
      className="font-display inline-block rounded px-2.5 py-0.5 text-[13px] font-extrabold uppercase tracking-widest"
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
            /* Auch hier feste Werte: mit Paletten-Klassen war im Dunkeln der NICHT
               gewaehlte Knopf der hellere, also sagte das Bild das Gegenteil von
               `aria-pressed`. */
            style={gross === wert
              ? { backgroundColor: FARBE.hell, color: FARBE.grund }
              : { backgroundColor: 'rgb(255 255 255 / 0.12)', color: 'rgb(251 246 236 / 0.75)' }}
            className="font-display min-h-11 flex-1 rounded-lg px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest transition-colors active:brightness-125"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- 2 Drin/Ball */

/**
 * Drei Pitches, und der mittlere ist der, den niemand erwartet.
 *
 * Die Zone ist kein Punkt, sondern ein Raum, und **sie endet nicht an der Mitte des
 * Balls, sondern an seinem Rand**: beruehrt irgendein Teil des Balls die Zone, ist es
 * Strike. Genau daran gehen Neue vorbei, weil der Ball fuer sie „aussen" aussieht.
 *
 * Deshalb liegt der zweite Ball exakt auf der Kante, halb drin und halb draussen, und
 * bekommt seinen eigenen Stempel. Haette er keinen, waere er nur ein dritter Punkt.
 */
export function DrinIstStrike({ lauf, ruhig }: BuehnenProps) {
  const ZONE = { x: 50, y: 14, w: 54, h: 92 }
  const pitches = [
    { x: 77, y: 40, text: 'Strike', farbe: FARBE.raus, ty: 26, verzug: 0 },
    { x: ZONE.x, y: 78, text: 'Kante: auch Strike', farbe: FARBE.gut, ty: 120, verzug: 0.85 },
    { x: 20, y: 40, text: 'Ball', farbe: FARBE.hell, ty: 26, verzug: 1.7 },
  ]

  return (
    <div className="px-4 pt-4">
      <svg viewBox="0 0 152 128" className="max-h-60 w-full" aria-hidden focusable="false">
        <rect x={ZONE.x} y={ZONE.y} width={ZONE.w} height={ZONE.h} rx="2" fill={FARBE.gut} opacity="0.14" />
        <rect x={ZONE.x} y={ZONE.y} width={ZONE.w} height={ZONE.h} rx="2" fill="none" stroke={FARBE.gut} strokeWidth="2" />

        {pitches.map(p => (
          <motion.g
            key={`${p.text}-${lauf}`}
            initial={ruhig ? false : { x: 77, y: 56, scale: 0.12, opacity: 0 }}
            animate={{ x: p.x, y: p.y, scale: 1, opacity: 1 }}
            transition={takt(ruhig, { delay: p.verzug, duration: 0.55, ease: [0.4, 0, 0.9, 0.6] })}
          >
            <Ball r={7} />
          </motion.g>
        ))}

        {pitches.map(p => (
          <motion.text
            key={`t-${p.text}-${lauf}`}
            x={p.x} y={p.ty} textAnchor="middle"
            fontSize="8" fontWeight="800" fill={p.farbe} className="font-display"
            initial={ruhig ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={takt(ruhig, { delay: p.verzug + 0.5, duration: 0.25 })}
          >
            {p.text}
          </motion.text>
        ))}
      </svg>
      <p className="pb-1 text-center text-[12px] text-cream-50/70">
        Berührt der Ball die Zone, zählt er. Auch mit dem Rand.
      </p>
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

/** Was aus dem Wettlauf wird: ein Gang auf die 1 oder ein Out an der Platte. */
function Ausgang({ art, ruhig, runde }: { art: 'Walk' | 'Out'; ruhig: boolean; runde: number }) {
  const walk = art === 'Walk'
  return (
    <div className="relative">
      <MiniFeld ausschnitt="infield" className="max-h-40">
        <motion.circle
          key={`laeufer-${runde}`}
          r="4.5" fill={FARBE.hell}
          initial={ruhig ? false : { cx: HOME.x, cy: HOME.y }}
          animate={walk ? { cx: FIRST_BASE.x, cy: FIRST_BASE.y } : { cx: HOME.x, cy: HOME.y }}
          transition={takt(ruhig, { duration: 0.8, ease: 'easeOut' })}
        />
        {walk && <SicherRing ort={FIRST_BASE} ruhig={ruhig} delay={0.8} />}
      </MiniFeld>
      <div className="absolute right-2 top-1">
        <Stempel text={art} art={walk ? 'gut' : 'raus'} lauf={runde} ruhig={ruhig} delay={walk ? 0.9 : 0.2} />
      </div>
    </div>
  )
}

/**
 * Vier gegen drei. Wer zuerst voll ist, gewinnt, und das Ergebnis heisst anders.
 *
 * Der Wettlauf ist der eine Teil, **was danach passiert der andere**: ein Zaehler, der
 * nur „Walk" hinschreibt, erklaert nicht, dass man dafuer auf die erste Base geht. Also
 * zeigt die Karte es, mit demselben Feld und demselben Ring wie die Lauf-Karten.
 *
 * Am Ende sind die beiden Knoepfe **gesperrt** und machen dem Von-vorn-Knopf Platz. Vorher
 * sahen sie druckbar aus und taten nichts.
 */
export function CountWettlauf({ ruhig }: BuehnenProps) {
  const [b, setB] = useState(0)
  const [s, setS] = useState(0)
  const [runde, setRunde] = useState(0)
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

  const zuruecksetzen = () => { setB(0); setS(0); setRunde(r => r + 1) }

  return (
    <div className="px-4 py-4">
      {/* Fuer wen nichts zu sehen ist: der Stand in Worten. */}
      <span className="sr-only">{`${b} Balls, ${s} Strikes`}</span>
      {reihe('Balls', 4, b, 'bg-cream-50')}
      {reihe('Strikes', 3, s, 'bg-softball-red-600')}

      <div className="mt-2 min-h-9 text-center">
        {voll && (
          <span className="font-display text-[13px] font-extrabold uppercase tracking-wide text-amber-400">
            3 zu 2, voller Count
          </span>
        )}
      </div>

      {ende && <Ausgang art={ende} ruhig={ruhig} runde={runde} />}

      <div className="mt-3 flex gap-2">
        {ende ? (
          <button
            type="button"
            onClick={zuruecksetzen}
            className="font-display min-h-11 flex-1 rounded-lg bg-navy-800 px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest text-cream-50 active:bg-navy-700"
          >
            Von vorn
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setB(x => x + 1)}
              className="font-display min-h-11 flex-1 rounded-lg bg-navy-800 px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest text-cream-50 active:bg-navy-700"
            >
              + Ball
            </button>
            <button
              type="button"
              onClick={() => setS(x => x + 1)}
              className="font-display min-h-11 flex-1 rounded-lg bg-navy-800 px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest text-cream-50 active:bg-navy-700"
            >
              + Strike
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------- 5 Dritter Strike am Boden */

/** Der Catcher sitzt ein Stueck hinter der Platte. Wie in Kapitel 3. */
const CATCHER = { x: HOME.x, y: HOME.y + 7 }

/**
 * Der nicht gefangene dritte Strike, und die Bedingung, die ihn fast immer aufhebt.
 *
 * Regel 5.1.46: der Schlagmann darf laufen, wenn bei weniger als zwei Aus die erste Base
 * **frei** ist, oder wenn zwei Aus vorliegen. Steht dort jemand, ist er aus (5.4.4 a.ii).
 * Die Karte ist deshalb kein Ablauf, sondern ein **Schalter**: der Ball liegt in beiden
 * Faellen am Boden, und trotzdem ist das Ergebnis ein anderes. Ein Zeitablauf koennte nur
 * einen der beiden zeigen.
 *
 * Die zwei Aus stehen in der Bildunterschrift und nicht als dritter Knopf: sie sind die
 * Ausnahme der Ausnahme, und drei Knoepfe fuer zwei Faelle liest niemand.
 */
export function DritterStrikeAmBoden({ ruhig }: BuehnenProps) {
  const [frei, setFrei] = useState(true)
  /* Sie steht ein Stueck VOR der Platte, nicht darauf: auf HOME selbst verschmolz sie
     mit dem Catcher zu einem Fleck, und dann sieht man nicht, dass da zwei stehen. */
  const box = { x: HOME.x, y: HOME.y - 6 }
  const ziel = frei ? FIRST_BASE : box

  return (
    <div className="px-4 pt-4">
      <div className="relative">
        <MiniFeld ausschnitt="infield" className="max-h-52">
          <circle cx={CATCHER.x} cy={CATCHER.y} r="4" fill={FARBE.hell} opacity="0.45" />
          {/* Der Ball ist ihm durchgerutscht und liegt hinter ihm. Die gestrichelte Spur
              sagt, dass er dort nicht hingelegt wurde, sondern hingerollt ist. */}
          {/* Seitlich nach hinten und nicht geradeaus: der Ausschnitt endet 20 Einheiten
              hinter der Platte, und ein Ball, der genau dorthin rollt, wird abgeschnitten. */}
          <line
            x1={CATCHER.x - 3} y1={CATCHER.y + 2} x2={CATCHER.x - 15} y2={CATCHER.y + 6}
            stroke={FARBE.hell} strokeWidth="1" strokeDasharray="2 2" opacity="0.35"
          />
          <circle cx={CATCHER.x - 18} cy={CATCHER.y + 5} r="3.4" fill={FARBE.gut} />

          {/* Wer schon auf der 1 steht, nimmt dir das Recht zu laufen. Umrandet, damit er
              sich von der Schlagfrau unterscheidet, ohne eine zweite Farbe zu brauchen. */}
          {!frei && (
            <circle
              cx={FIRST_BASE.x} cy={FIRST_BASE.y} r="4.2"
              fill={FARBE.hell} opacity="0.45" stroke={FARBE.hell} strokeWidth="1.2"
            />
          )}
          {frei && <SicherRing ort={FIRST_BASE} ruhig={ruhig} delay={0.7} />}

          <motion.circle
            data-testid="dts-laeufer"
            initial={{ cx: ziel.x, cy: ziel.y }}
            animate={{ cx: ziel.x, cy: ziel.y }}
            transition={takt(ruhig, { duration: 0.7, ease: 'easeOut' })}
            r="4.5" fill={FARBE.hell}
          />
        </MiniFeld>
        <div className="absolute right-2 top-1">
          <Stempel
            text={frei ? 'Lauf' : 'Out'}
            art={frei ? 'gut' : 'raus'}
            lauf={frei ? 1 : 0}
            ruhig={ruhig}
            delay={frei ? 0.8 : 0.2}
          />
        </div>
      </div>

      <p className="px-1 pt-1 text-center text-[12px] leading-snug text-cream-50/70">
        Bei zwei Outs darfst du immer los.
      </p>

      <div className="mt-1 flex gap-2">
        {([['Die 1 ist frei', true], ['Die 1 ist besetzt', false]] as const).map(([label, wert]) => (
          <button
            key={label}
            type="button"
            onClick={() => setFrei(wert)}
            aria-pressed={frei === wert}
            style={frei === wert
              ? { backgroundColor: FARBE.hell, color: FARBE.grund }
              : { backgroundColor: 'rgb(255 255 255 / 0.12)', color: 'rgb(251 246 236 / 0.75)' }}
            className="font-display min-h-11 flex-1 rounded-lg px-2 py-2 text-[11px] font-extrabold uppercase tracking-widest transition-colors active:brightness-125"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------- 6 Ein Fuss bleibt drin */

/**
 * Die Box von oben, zwei Abdruecke, und ein Knopf durch drei Staende.
 *
 * Von oben und nicht von der Seite, weil es um **Fuesse und eine Linie** geht: in der
 * Seitenansicht liegen beide Fuesse uebereinander, und genau ihr Unterschied ist die
 * Regel. Die Zone-Karte bleibt aus demselben Grund in der Seitenansicht; dort geht es um
 * Brust und Knie.
 *
 * Die Regeln dahinter: vor dem Pitch beide Fuesse vollstaendig drin (5.4.2 d), zwischen
 * den Pitches mindestens einer (5.4.2 e), und wer mit beiden raustritt und verzoegert,
 * bekommt einen Strike **ohne dass gepitcht wird** (5.4.3 c.vii). Die acht Ausnahmen der
 * Regel 5.4.2 e stehen absichtlich nicht auf der Karte: sie beschreiben Faelle, in denen
 * man ohnehin schon draussen ist (Schwung, Wild-Pitch, Time), und keiner davon ist eine
 * Entscheidung, die ein Schlagmann trifft.
 */
const FUSS = [
  { text: 'Vor dem Pitch stehst du drin. Mit beiden Füßen.', hinten: 0, vorne: 0, strike: false },
  { text: 'Zwischen zwei Pitches darf einer raus. Einer bleibt drin.', hinten: 1, vorne: 0, strike: false },
  { text: 'Beide raus und du verzögerst: Strike. Ganz ohne Pitch.', hinten: 1, vorne: 1, strike: true },
]

export function EinFussBleibtDrin({ ruhig }: BuehnenProps) {
  const [schritt, setSchritt] = useState(0)
  const jetzt = FUSS[schritt]
  /* Die Box von oben. Raus geht nach links, also WEG von der Platte: wer nach rechts
     tritt, stuende auf der Platte, und das ist eine andere Regel. */
  const box = { x: 84, y: 20, w: 52, h: 80 }
  const drin = 110
  const raus = 74

  const abdruck = (id: string, cy: number, weg: number) => (
    <motion.ellipse
      data-testid={id}
      key={id}
      initial={{ cx: weg ? raus : drin, cy }}
      animate={{ cx: weg ? raus : drin, cy }}
      transition={takt(ruhig, { duration: 0.35, ease: AUS })}
      rx="6" ry="9" fill={FARBE.hell} opacity="0.9"
    />
  )

  return (
    <div className="px-4 pt-4">
      <div className="relative">
        <svg viewBox="56 6 118 108" className="max-h-48 w-full" aria-hidden focusable="false">
          {/* Die Home-Plate, von oben. */}
          <path d="M142 46 h22 v18 l-11 10 l-11 -10 z" fill={FARBE.hell} opacity="0.4" />

          <rect
            data-testid="box"
            x={box.x} y={box.y} width={box.w} height={box.h}
            fill="none" stroke={FARBE.hell} strokeWidth="1.6" strokeDasharray="5 4" opacity="0.55"
          />
          <text x={box.x + box.w / 2} y={box.y - 5} textAnchor="middle" fontSize="8" fontWeight="800" fill={FARBE.hell} opacity="0.5" className="font-display">
            BOX
          </text>

          {abdruck('fuss-vorne', 40, jetzt.vorne)}
          {abdruck('fuss-hinten', 80, jetzt.hinten)}
        </svg>

        {jetzt.strike && (
          <div className="absolute right-2 top-1">
            <Stempel text="Strike" art="raus" lauf={schritt} ruhig={ruhig} delay={0.2} />
          </div>
        )}
      </div>

      <p className="min-h-10 px-1 text-center text-[12px] leading-snug text-cream-50/80">
        {jetzt.text}
      </p>

      <button
        type="button"
        onClick={() => setSchritt(s => (s + 1) % FUSS.length)}
        className="font-display mb-1 min-h-11 w-full rounded-lg bg-navy-800 px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest text-cream-50 active:bg-navy-700"
      >
        {schritt === FUSS.length - 1 ? 'Von vorn' : 'Nächster Schritt'}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------- 7 Bunt wofuer */

/**
 * Wozu man ueberhaupt buntet, und das sind **zwei** Gruende.
 *
 * Der eine ist fuer einen selbst: die Verteidigung steht tief, der Ball faellt kurz, und
 * man ist schon unterwegs. Der andere ist fuer die Mannschaft und wird oefter gespielt:
 * **der Laeufer vor einem kommt eine Base weiter**, auch wenn man selbst dabei out geht.
 * Deshalb laufen hier zwei, nicht einer.
 */
export function BuntWofuer({ lauf, ruhig }: BuehnenProps) {
  /* Zurueckgezogen, aber NEBEN den Bases: der mittlere stand vorher genau auf der 2,
     wo der Laeufer ankommt, und beide Punkte wurden zu einem. */
  const tief = [
    { x: HOME.x - 48, y: HOME.y - 62 },
    { x: HOME.x - 2, y: HOME.y - 72 },
    { x: HOME.x + 48, y: HOME.y - 62 },
  ]

  return (
    <div className="px-4 pt-4">
      <MiniFeld ausschnitt="infield" className="max-h-56">
        {/* Die Verteidigung: hohle Ringe. Gefuellt ist, wer laeuft. */}
        {tief.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="none" stroke={FARBE.hell} strokeWidth="1.4" opacity="0.6" />
        ))}

        {/* Der Ball tropft kurz vor die Platte. */}
        <motion.circle
          key={`ball-${lauf}`}
          r="3.2" fill={FARBE.gut}
          initial={ruhig ? false : { cx: HOME.x, cy: HOME.y }}
          animate={{ cx: HOME.x + 9, cy: HOME.y - 15 }}
          transition={takt(ruhig, { duration: 0.5, ease: 'easeOut' })}
        />

        {/* Der Laeufer, der schon auf der 1 stand, zieht auf die 2. Das ist der Zweck. */}
        <motion.circle
          key={`vorne-${lauf}`}
          r="4.5" fill={FARBE.hell}
          initial={ruhig ? false : { cx: FIRST_BASE.x, cy: FIRST_BASE.y }}
          animate={{ cx: SECOND_BASE.x, cy: SECOND_BASE.y }}
          transition={takt(ruhig, { delay: 0.2, duration: 0.9, ease: 'easeOut' })}
        />
        <SicherRing ort={SECOND_BASE} ruhig={ruhig} delay={1.15} />

        {/* Und die Schlagfrau selbst. */}
        <motion.circle
          key={`schlag-${lauf}`}
          r="4.5" fill={FARBE.hell}
          initial={ruhig ? false : { cx: HOME.x, cy: HOME.y }}
          animate={{ cx: FIRST_BASE.x, cy: FIRST_BASE.y }}
          transition={takt(ruhig, { delay: 0.2, duration: 0.95, ease: 'easeOut' })}
        />
      </MiniFeld>
      <p className="pb-1 text-center text-[12px] text-cream-50/70">
        Der vor dir kommt eine Base weiter. Dafür lohnt es sich auch, selbst out zu gehen.
      </p>
    </div>
  )
}

/* -------------------------------------------------------------- 8 Bunt-Falle */

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

          {/* Die Schlagfrau, von der Seite, und ihr Schlaeger dreht in die Bunt-Haltung. */}
          <g transform="translate(-6 -34) scale(0.78)">
            <Figur boden={152} ohneSchlaeger />
          </g>
          <motion.rect
            key={`schlaeger-${lauf}`}
            x="34" y="54" width="44" height="5" rx="2.5" fill={FARBE.matt}
            initial={ruhig ? false : { rotate: -62 }}
            animate={{ rotate: 0 }}
            style={{ originX: '36px', originY: '57px' }}
            transition={takt(ruhig, { duration: 0.4, ease: AUS })}
          />

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
            style={{ borderColor: FARBE.rausHell, color: FARBE.rausHell }}
            className="font-display rounded border-[3px] px-4 py-1 text-2xl font-extrabold uppercase tracking-widest"
          >
            Out
          </motion.span>
        </div>
      </div>
    </div>
  )
}
