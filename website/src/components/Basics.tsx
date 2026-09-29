import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CaretDown } from '@phosphor-icons/react'
import { Reveal, SectionTag } from '@/components/Reveal'
import { EdgeFade } from '@/components/EdgeFade'

const FACTS = [
  {
    key: 'ball' as const,
    term: 'Ball',
    text: 'Größer als ein Baseball, aber genauso hart. Wer einen abbekommt, merkt den Unterschied nicht.',
  },
  {
    key: 'wurf' as const,
    term: 'Wurf',
    text: 'Unterhand wirft nur die Pitcher:in, der Windmill-Wurf. Alle anderen werfen ganz normal überhand.',
  },
  {
    key: 'feld' as const,
    term: 'Feld',
    text: 'Kleineres Spielfeld, kürzere Wege. Die Plays kommen schneller, das Spiel ist direkter.',
  },
]

const NAVY = '#0a0d35'
const NAVY_SOFT = '#181b4d'
const TAN = '#efe6cf'
const SAGE = '#e8eedc'
const RED = '#c92a38'
const YELLOW = '#f2c94c'

const POSITIONS = [
  { abbr: 'LF', x: 90, y: 130 },
  { abbr: 'CF', x: 200, y: 85 },
  { abbr: 'RF', x: 310, y: 130 },
  { abbr: 'SS', x: 140, y: 168 },
  { abbr: '2B', x: 258, y: 168 },
  { abbr: '1B', x: 268, y: 236 },
  { abbr: '3B', x: 132, y: 236 },
  { abbr: 'P', x: 200, y: 238 },
  { abbr: 'C', x: 200, y: 320 },
]

const CYCLE = { duration: 6, repeat: Infinity, ease: 'linear' } as const
// Pop-Einblendungen (OUT!, HOME RUN!): Segments dazwischen mit starkem ease-out statt linear
const POP_EASE: ('linear' | [number, number, number, number])[] = [
  'linear',
  [0.23, 1, 0.32, 1],
  'linear',
  [0.23, 1, 0.32, 1],
  'linear',
]
const POP_CYCLE = { duration: 6, repeat: Infinity, ease: POP_EASE }

type Xyf = { times: number[]; x: number[]; y: number[]; opacity?: number[] }
type Popf = { times: number[]; opacity: number[]; scale: number[] }

// Szene "Ein Play": Flugball ins Outfield, CF fängt, wirft zur 1. Base, Runner knapp OUT.
const PLAY = {
  ball: {
    times: [0, 0.1, 0.15, 0.2, 0.42, 0.48, 0.5, 0.72, 0.74, 0.98, 1],
    x: [0, 0, 27, 57, 57, 54, 54, 54, 0, 0, 0],
    y: [0, 0, -198, -193, -193, -85, -85, -85, 0, 0, 0],
    opacity: [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1],
  } as Xyf,
  batter: {
    times: [0, 0.1, 0.48, 0.5, 0.72, 0.74, 0.98, 1],
    x: [0, 0, 92, 92, 92, 0, 0, 0],
    y: [0, 0, -92, -92, -92, 0, 0, 0],
    opacity: [1, 1, 1, 0, 0, 0, 0, 1],
  } as Xyf,
  cf: {
    times: [0, 0.12, 0.2, 0.5, 0.6, 0.8, 1],
    x: [0, 0, 95, 95, 30, 0, 0],
    y: [0, 0, 15, 15, 10, 0, 0],
  } as Xyf,
  backup: {
    times: [0, 0.25, 0.4, 0.7, 1],
    x: [0, 0, 20, 0, 0],
    y: [0, 0, 30, 0, 0],
  } as Xyf,
  out: {
    times: [0, 0.46, 0.5, 0.62, 0.68, 1],
    opacity: [0, 0, 1, 1, 0, 0],
    scale: [0.6, 0.6, 1, 1, 0.6, 0.6],
  } as Popf,
}

// Szene "Home Run": Ball über die Feldgrenze, Batter + 2 Runner umrunden die Bases.
const HR = {
  ball: {
    times: [0, 0.1, 0.2, 0.28, 0.3, 0.92, 0.94, 1],
    x: [0, 0, -20, -38, -38, -38, 0, 0],
    y: [0, 0, -260, -273, -273, -273, 0, 0],
    opacity: [1, 1, 1, 1, 0, 0, 0, 1],
  } as Xyf,
  batter: {
    times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.8, 0.95, 0.97, 1],
    x: [0, 0, 92, 0, -92, 0, 0, 0, 0, 0],
    y: [0, 0, -92, -184, -92, 0, 0, 0, 0, 0],
    opacity: [1, 1, 1, 1, 1, 1, 0, 0, 0, 1],
  } as Xyf,
  runner1: {
    times: [0, 0.05, 0.2, 0.35, 0.55, 0.58, 0.92, 0.94, 1],
    x: [0, 0, 0, -92, 0, 0, 0, 0, 0],
    y: [0, 0, 0, 92, 184, 184, 184, 0, 0],
    opacity: [0, 1, 1, 1, 1, 0, 0, 0, 0],
  } as Xyf,
  runner2: {
    times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.8, 0.95, 0.97, 1],
    x: [0, 0, 0, 92, 0, -92, 0, 0, 0, 0],
    y: [0, 0, 0, -92, -184, -92, 0, 0, 0, 0],
    opacity: [0, 1, 1, 1, 1, 1, 0, 0, 0, 1],
  } as Xyf,
  cf: {
    times: [0, 0.25, 0.35, 0.7, 1],
    x: [0, 0, 0, 0, 0],
    y: [0, 0, -25, 0, 0],
  } as Xyf,
  homer: {
    times: [0, 0.78, 0.82, 0.95, 0.98, 1],
    opacity: [0, 0, 1, 1, 0, 0],
    scale: [0.6, 0.6, 1, 1, 0.6, 0.6],
  } as Popf,
}

function PositionDot({ pos }: { pos: (typeof POSITIONS)[number] }) {
  return (
    <>
      <circle cx={pos.x} cy={pos.y} r="11" fill={NAVY} />
      <text
        x={pos.x}
        y={pos.y + 4}
        textAnchor="middle"
        fill="#fff"
        fontSize="11.5"
        fontWeight="700"
        fontFamily="Karla, sans-serif"
      >
        {pos.abbr}
      </text>
    </>
  )
}

type Scene = 'feld' | 'play' | 'homerun'

const SCENES: { key: Scene; label: string; caption: string }[] = [
  {
    key: 'feld',
    label: 'Feld',
    caption:
      'So steht die Verteidigung: neun Positionen, die Pitcher:in in der Mitte des Diamanten.',
  },
  {
    key: 'play',
    label: 'Ein Play',
    caption:
      'Schlagen, Fangen, Werfen, Baserunning: Der Ball fliegt ins Outfield, der CF fängt ihn und wirft zur 1. Base. Der Runner kommt zu spät: OUT.',
  },
  {
    key: 'homerun',
    label: 'Home Run',
    caption:
      'Baserunning pur: Der Ball fliegt über die Feldgrenze. Alle Runner laufen die Runde und scoren.',
  },
]

function FieldDiagram({ scene }: { scene: Scene }) {
  const reduce = useReducedMotion()
  const cfAnim = scene === 'play' ? PLAY.cf : scene === 'homerun' ? HR.cf : null

  const xy = (k: Xyf) =>
    reduce ? undefined : { x: k.x, y: k.y, ...(k.opacity ? { opacity: k.opacity } : {}) }
  const pop = (k: Popf) => (reduce ? undefined : { opacity: k.opacity, scale: k.scale })

  return (
    <svg
      viewBox="0 0 400 340"
      role="img"
      aria-label="Softballfeld mit Positionen und animierten Spielzügen: ein Play über die Verteidigung und ein Home Run"
      className="w-full"
    >
      {/* Rasen */}
      <path d="M20,150 A234,234 0 0 1 380,150 L200,300 Z" fill={SAGE} />
      {/* Infield */}
      <path d="M200,300 L292,208 L200,116 L108,208 Z" fill={TAN} stroke={NAVY} strokeWidth="2" />
      {/* Pitcher-Kreis */}
      <circle cx="200" cy="238" r="16" fill="none" stroke={NAVY} strokeWidth="2" />
      {/* Bases */}
      <rect x="286" y="202" width="12" height="12" fill="#fff" stroke={NAVY} strokeWidth="1.5" />
      <rect x="194" y="110" width="12" height="12" fill="#fff" stroke={NAVY} strokeWidth="1.5" />
      <rect x="102" y="202" width="12" height="12" fill="#fff" stroke={NAVY} strokeWidth="1.5" />
      <rect x="194" y="294" width="12" height="12" fill="#fff" stroke={NAVY} strokeWidth="1.5" />
       {/* Laufweg */}
       <path
         d="M204,284 L282,206 L204,128 L118,206 L196,294"
         fill="none"
         stroke={scene === 'feld' ? RED : 'transparent'}
         strokeWidth="2.5"
         strokeDasharray="6 5"
         markerEnd={scene === 'feld' ? 'url(#arrow-red)' : undefined}
       />
       <defs>
         <marker
           id="arrow-red"
           viewBox="0 0 10 10"
           refX="8"
           refY="5"
           markerWidth="6"
           markerHeight="6"
           orient="auto-start-reverse"
         >
           <path d="M0,0 L10,5 L0,10 Z" fill={RED} />
         </marker>
         <marker
           id="arrow-navy"
           viewBox="0 0 10 10"
           refX="8"
           refY="5"
           markerWidth="6"
           markerHeight="6"
           orient="auto-start-reverse"
         >
           <path d="M0,0 L10,5 L0,10 Z" fill={NAVY_SOFT} />
         </marker>
       </defs>

       {/* Ballflugbahn mit Pfeil */}
       {scene === 'play' && (
         <path
           d="M244,286 Q272,170 295,105"
           fill="none"
           stroke={NAVY_SOFT}
           strokeWidth="2"
           strokeDasharray="4 5"
           markerEnd="url(#arrow-navy)"
         />
       )}
       {scene === 'homerun' && (
         <path
           d="M244,286 Q226,90 202,18"
           fill="none"
           stroke={NAVY_SOFT}
           strokeWidth="2"
           strokeDasharray="4 5"
           markerEnd="url(#arrow-navy)"
         />
       )}

       {/* Statische Positionen */}
       {POSITIONS.filter((p) => p.abbr !== 'CF' && p.abbr !== '2B').map((p) => (
         <g key={p.abbr}>
           <PositionDot pos={p} />
         </g>
       ))}

       {/* 2B: rückt beim Play zur 1. Base nach */}
       {scene === 'play' ? (
         <motion.g animate={xy(PLAY.backup)} transition={{ ...CYCLE, times: PLAY.backup.times }}>
           <PositionDot pos={POSITIONS.find((p) => p.abbr === '2B')!} />
         </motion.g>
       ) : (
         <g>
           <PositionDot pos={POSITIONS.find((p) => p.abbr === '2B')!} />
         </g>
       )}

       {/* CF: läuft zum Ball bzw. schaut beim Home Run zu */}
       {cfAnim ? (
         <motion.g animate={xy(cfAnim)} transition={{ ...CYCLE, times: cfAnim.times }}>
           <PositionDot pos={POSITIONS.find((p) => p.abbr === 'CF')!} />
         </motion.g>
       ) : (
         <g>
           <PositionDot pos={POSITIONS.find((p) => p.abbr === 'CF')!} />
         </g>
       )}

       {(scene === 'play' || scene === 'homerun') && (
         <>
           {/* Batter:in als Runner */}
           <motion.g
             animate={xy(scene === 'play' ? PLAY.batter : HR.batter)}
             transition={{ ...CYCLE, times: (scene === 'play' ? PLAY.batter : HR.batter).times }}
           >
             <circle cx="200" cy="300" r="5.5" fill={RED} />
           </motion.g>

            {/* Ball-Trail: zwei Nachläufer auf der Zeitachse — aus dem Punkt wird ein Vektor, Tempo wird lesbar */}
            {!reduce &&
              [0.02, 0.04].map((delta, idx) => {
                const base = scene === 'play' ? PLAY.ball : HR.ball
                const shifted: Xyf = {
                  ...base,
                  times: base.times.map((t) => Math.min(t + delta, 1)),
                  opacity: base.opacity?.map((o) => o * (idx === 0 ? 0.4 : 0.18)),
                }
                return (
                  <motion.g
                    key={idx}
                    animate={{ x: shifted.x, y: shifted.y, opacity: shifted.opacity }}
                    transition={{ ...CYCLE, times: shifted.times }}
                  >
                    <circle cx="238" cy="293" r={4.5} fill={YELLOW} />
                  </motion.g>
                )
              })}
            {/* Ball */}
            <motion.g
              animate={xy(scene === 'play' ? PLAY.ball : HR.ball)}
              transition={{ ...CYCLE, times: (scene === 'play' ? PLAY.ball : HR.ball).times }}
            >
              <circle cx="238" cy="293" r="5" fill={YELLOW} stroke={NAVY} strokeWidth="1.5" />
            </motion.g>

           {/* Runner für Home Run */}
           {scene === 'homerun' && (
             <>
               <motion.g
                 animate={xy(HR.runner1)}
                 transition={{ ...CYCLE, times: HR.runner1.times }}
               >
                 <circle cx="200" cy="116" r="5.5" fill={RED} opacity="0" />
               </motion.g>
               <motion.g
                 animate={xy(HR.runner2)}
                 transition={{ ...CYCLE, times: HR.runner2.times }}
               >
                 <circle cx="200" cy="116" r="5.5" fill={RED} opacity="0" />
               </motion.g>
             </>
           )}
         </>
       )}

       {scene === 'play' && (
         <motion.text
           x="296"
           y="176"
           fontSize="17"
           fontWeight="800"
           fontFamily="Karla, sans-serif"
           fill={RED}
           opacity="0"
           style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            animate={pop(PLAY.out)}
            transition={{ ...POP_CYCLE, times: PLAY.out.times }}
          >
            OUT!
          </motion.text>
       )}

       {scene === 'homerun' && (
         <motion.text
           x="200"
           y="100"
           textAnchor="middle"
           fontSize="17"
           fontWeight="800"
           fontFamily="Karla, sans-serif"
           fill={RED}
           opacity="0"
           style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            animate={pop(HR.homer)}
            transition={{ ...POP_CYCLE, times: HR.homer.times }}
          >
            HOME RUN!
          </motion.text>
       )}

      {/* Labels */}
      <g fill={NAVY} fontSize="15" fontFamily="Karla, sans-serif">
        <text x="302" y="196">1. Base</text>
        <text x="245" y="112">2. Base</text>
        <text x="96" y="196" textAnchor="end">3. Base</text>
        <text x="250" y="302">Batter:in</text>
      </g>
     </svg>
   )
 }

const LEGEND = [
  'P = Pitcher:in',
  'C = Catcher:in',
  '1B, 2B, 3B = Basemann',
  'SS = Shortstop',
  'LF, CF, RF = Outfield',
]

/** Mixed/Fastpitch + Regel-Karten: gleiche Inhalte für Mobile-Kästchen und Desktop-Karten. */
const TERMS = [
  {
    key: 'mixed' as const,
    title: (active: boolean) => (
      <>
        Mi<span className={active ? 'text-brand-500' : 'text-brand-600'}>xed.</span>
      </>
    ),
    text: 'Männer und Frauen spielen bei den Dead Sox in einem Team. Im Softball kein Sonderfall, sondern Standard.',
  },
  {
    key: 'fastpitch' as const,
    title: (active: boolean) => (
      <>
        Fast<span className={active ? 'text-brand-500' : 'text-brand-600'}>pitch.</span>
      </>
    ),
    text: 'Die schnelle Variante: Der Pitch kommt mit ordentlich Tempo, nicht gemütlich wie beim Slowpitch.',
  },
]

const RULES = [
  {
    key: 'outs' as const,
    title: 'Outs',
    text: 'Die Verteidigung macht ein Out, wenn sie den Ball vor dem Runner zur Base bringt, ihn mit dem Ball taggt oder einen Flugball direkt fängt.',
  },
  {
    key: 'wechsel' as const,
    title: 'Wechsel',
    text: 'Nach drei Outs wird getauscht: Das Schlagteam geht ins Feld, das Feldteam schlägt.',
  },
  {
    key: 'homerun' as const,
    title: 'Home Run',
    text: 'Fliegt der Schlag über die Feldgrenze, gibt es einen Punkt für jeden Runner und einen für die Batter:in.',
  },
]

/**
 * Mobile-Pattern: kleine Auswahl-Kästchen + EIN gemeinsames Aufklapp-Panel
 * darunter — gleiche Interaktion wie die Szenen-Tabs. Kein Kästchen bleibt
 * aufklappbar-leer stehen, die Beschreibung lebt zentral im Panel.
 * Die Kästchen sind gleich hoch (Grid-Stretch), Titel oben, Mehr/Pfeil-Hint
 * unten ausgerichtet (flex-1 auf dem Titel).
 */
function ChipPanel<K extends string>({
  items,
  open,
  onToggle,
  grid,
  titleClass,
}: {
  items: { key: K; title: ReactNode | ((active: boolean) => ReactNode); text: string }[]
  open: K | null
  onToggle: (key: K | null) => void
  grid: string
  titleClass: string
}) {
  return (
    <div className="md:hidden">
      {/* display:grid MUSS mit in die Klasse — grid-cols-2 allein wirkt nicht.
          Die Buttons sind flex-col (damit die Mehr-Hints unten bündig sind),
          also block-level: ohne Grid stehen sie untereinander. */}
      <div className={`grid ${grid}`}>
        {items.map((t) => {
          const isActive = open === t.key
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onToggle(isActive ? null : t.key)}
              className={`press group relative flex flex-col overflow-hidden rounded-sm border p-4 text-left transition-colors duration-200 ${
                isActive
                  ? 'border-navy-900 bg-navy-900 text-cream-50'
                  : 'border-navy-900/15 bg-cream-100 text-navy-900 hover:border-navy-900/30'
              }`}
            >
              <span aria-hidden className="card-accent" />
              <h3 className={`flex-1 ${titleClass}`}>
                {typeof t.title === 'function' ? t.title(isActive) : t.title}
              </h3>
              <span
                className={`mt-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] ${
                  isActive ? 'text-cream-50/70' : 'text-navy-700/60'
                }`}
              >
                {isActive ? 'Weniger' : 'Mehr'}
                <CaretDown
                  size={13}
                  weight="bold"
                  aria-hidden
                  className={`transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`}
                />
              </span>
            </button>
          )
        })}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key={open}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-sm border border-navy-900/15 bg-cream-100 p-4">
              <p className="leading-relaxed text-navy-700 hyphens-auto">
                {items.find((i) => i.key === open)?.text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Basics() {
  const [scene, setScene] = useState<Scene>('feld')
  const [factOpen, setFactOpen] = useState<'ball' | 'wurf' | 'feld' | null>(null)
  const [termOpen, setTermOpen] = useState<'mixed' | 'fastpitch' | null>(null)
  const [ruleOpen, setRuleOpen] = useState<'outs' | 'wechsel' | 'homerun' | null>(null)
  const active = SCENES.find((s) => s.key === scene)!

  return (
    <section className="relative bg-cream-50 text-navy-900">
      <EdgeFade edge="top" />
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <Reveal>
          <SectionTag index="02" tone="dark">
            Die Basics
          </SectionTag>
          <h2 className="mt-6 font-display text-5xl leading-[0.95] tracking-wide md:text-6xl">
            Softball, kurz erklärt.
          </h2>
          <p className="mt-4 max-w-xl text-navy-700">
            Der Schnellkurs: Fastpitch, Mixed und warum das hier kein Baseball ist.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h3 className="font-display text-3xl tracking-wide text-navy-900">
              Softball vs. Baseball
            </h3>
            {/* Mobile: Fakten als Auswahl-Kästchen + Panel (Tap auf "Ball" →
                Erklärung darunter), ab md die editoriale Liste. */}
            <ChipPanel
              items={FACTS.map((f) => ({ key: f.key, title: f.term, text: f.text }))}
              open={factOpen}
              onToggle={setFactOpen}
              grid="mt-6 grid-cols-3 gap-3"
              titleClass="font-display text-xl leading-tight tracking-wide"
            />
            <div className="mt-6 hidden divide-y divide-navy-900/15 border-t border-navy-900/15 md:block">
              {FACTS.map((fact) => (
                <div
                  key={fact.term}
                  className="grid gap-1 py-5 sm:grid-cols-[5rem_1fr] sm:gap-6"
                >
                  <span className="font-display text-2xl tracking-wide text-brand-600">
                    {fact.term}
                  </span>
                  <p className="leading-relaxed text-navy-700">{fact.text}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-navy-700">
              Der Rest: praktisch dieselben Regeln wie beim Baseball.
            </p>
          </Reveal>

          <div className="lg:mt-0">
            <Reveal>
              <h3 className="font-display text-3xl tracking-wide text-navy-900">
                So läuft ein Spiel
              </h3>
            </Reveal>

            <div
              role="tablist"
              aria-label="Ansicht wählen"
              className="mt-5 flex w-fit rounded-sm border border-navy-900/20 bg-cream-100 p-1"
            >
              {SCENES.map((s) => {
                const isActive = scene === s.key
                return (
                  <button
                    key={s.key}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setScene(s.key)}
                    className={`press relative rounded-sm px-3.5 py-2 text-xs sm:px-4 sm:py-1.5 sm:text-sm ${
                      isActive ? 'text-cream-50' : 'text-navy-700 hover:text-navy-900'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="basics-scene-thumb"
                        className="absolute inset-0 rounded-sm bg-navy-900"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative">{s.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="-mx-4 mt-4 sm:mx-0">
              <FieldDiagram scene={scene} />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-navy-700/80 sm:grid-cols-3 sm:text-sm">
              {LEGEND.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-navy-700/70">{active.caption}</p>
          </div>
        </div>

        {/* Regeln: Mobile Auswahl-Kästchen + Panel (gleiche Interaktion wie
            Fakten und Mixed/Fastpitch — gleiche Inhaltsform, gleiche Sprache),
            ab md das 3er-Grid mit vollem Text. */}
        <div className="mt-10 md:mt-12">
          <ChipPanel
            items={RULES}
            open={ruleOpen}
            onToggle={setRuleOpen}
            grid="grid-cols-3 gap-3"
            titleClass="font-display text-xl leading-tight tracking-wide"
          />
          <div className="hidden gap-6 md:grid md:grid-cols-3">
            {RULES.map((r, i) => (
              <Reveal key={r.key} delay={i * 0.08}>
                <div className="group relative size-full overflow-hidden rounded-sm border border-navy-900/15 bg-cream-100 p-6 transition-colors duration-200 hover:border-navy-900/30 hover:bg-cream-50">
                  <span aria-hidden className="card-accent" />
                  <h3 className="font-display text-3xl tracking-wide text-navy-900">{r.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-navy-700">{r.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Mixed/Fastpitch: Mobile Auswahl-Kästchen + Panel, ab md die
            großen Karten mit vollem Text. */}
        <div className="mt-6">
          <ChipPanel
            items={TERMS}
            open={termOpen}
            onToggle={setTermOpen}
            grid="grid-cols-2 gap-4"
            titleClass="font-display text-3xl tracking-wide"
          />
          <div className="hidden gap-6 md:grid md:grid-cols-2">
            {TERMS.map((t, i) => (
              <Reveal key={t.key} delay={i * 0.12}>
                <div className="group relative size-full overflow-hidden rounded-sm border border-navy-900/15 bg-cream-100 p-8 transition-colors duration-200 hover:border-navy-900/30 hover:bg-cream-50">
                  <span aria-hidden className="card-accent" />
                  <h3 className="font-display text-5xl tracking-wide text-navy-900">
                    {t.title(false)}
                  </h3>
                  <p className="mt-4 leading-relaxed text-navy-700 hyphens-auto">{t.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
      <EdgeFade edge="bottom" />
    </section>
  )
}
