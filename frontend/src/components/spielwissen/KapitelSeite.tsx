import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { KAPITEL, findeKapitel, type Kapitel } from './kapitel'
import { Karte } from './Karte'

/**
 * Ein Kapitel, **eine Karte auf einmal**.
 *
 * Vorher lagen alle untereinander. Gemessen war ein Kapitel damit rund drei Bildschirme
 * hoch, und bis zu drei Karten standen gleichzeitig weit genug im Bild, um loszulaufen —
 * drei Sequenzen nebeneinander, keine mit einem Blick darauf. Dagegen half, immer nur die
 * mittlere spielen zu lassen; der Grund dafuer blieb aber bestehen: eine Animation, die
 * etwas erklaert, braucht die ganze Flaeche und einen Anfang, den man nicht verpasst.
 *
 * Beim Blaettern bekommt sie beides. Der Preis ist das Ueberfliegen, und den traegt die
 * Uebersicht: sie nennt je Kapitel die Stichworte, man landet also nicht im falschen.
 *
 * **Ein unbekanntes Kapitel geht zurueck auf die Uebersicht.** Die Adresse steht jedem
 * offen, und ein Tippfehler darf keine leere Seite ergeben.
 */
export default function KapitelSeite() {
  const { kapitel: id } = useParams()
  const kapitel = findeKapitel(id)

  if (!kapitel) return <Navigate to="/spielwissen" replace />

  /*
   * Der `key` setzt den Blaetterer beim Kapitelwechsel zurueck. Als Effekt waere das
   * abgeleiteter Zustand: ein zweiter Rendergang, in dem die Seite kurz die falsche
   * Karte zeigt.
   */
  return <Blaetterer key={kapitel.id} kapitel={kapitel} />
}

function Blaetterer({ kapitel }: { kapitel: Kapitel }) {
  const [nr, setNr] = useState(0)
  const [richtung, setRichtung] = useState(1)
  const ruhig = Boolean(useReducedMotionConfig())

  const anzahl = kapitel.karten.length

  const blaettern = useCallback((schritt: number) => {
    setRichtung(schritt)
    setNr(n => Math.min(Math.max(n + schritt, 0), anzahl - 1))
  }, [anzahl])

  /* Am Rechner blaettert man mit den Pfeiltasten, nicht mit der Maus zum Knopf. */
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') blaettern(1)
      if (e.key === 'ArrowLeft') blaettern(-1)
    }
    window.addEventListener('keydown', taste)
    return () => window.removeEventListener('keydown', taste)
  }, [blaettern])

  const karte = kapitel.karten[nr]
  const letzte = nr === kapitel.karten.length - 1
  const naechstesKapitel = KAPITEL[KAPITEL.findIndex(k => k.id === kapitel.id) + 1]

  /*
   * 8rem sind Kopfleiste, Seitenpolster und die eigene Fussleiste. Gemessen bei 393x760
   * MIT dem Admin-Band: ohne den Abzug lief die Seite um 15 px ueber — und dann hat man
   * eine Blaetter-Ansicht, die trotzdem scrollt.
   */
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-2xl flex-col gap-3 pb-4">
      <div>
        <Link
          to="/spielwissen"
          className="font-display inline-flex min-h-11 items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:text-ink-strong active:text-ink-strong"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Spielwissen
        </Link>
        <h1 className="font-headline text-2xl font-extrabold uppercase tracking-wide text-ink-strong sm:text-3xl">
          {kapitel.titel}
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">{kapitel.frage}</p>
      </div>

      {/*
        `touch-pan-y`: das Wischen nach links und rechts gehoert der Karte, das Scrollen
        nach unten bleibt beim Browser. Ohne das streiten sich beide und es ruckelt.
      */}
      <div className="flex-1 touch-pan-y">
        <AnimatePresence mode="wait" initial={false} custom={richtung}>
          <motion.div
            key={karte.id}
            custom={richtung}
            initial={ruhig ? false : { opacity: 0, x: richtung * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={ruhig ? { opacity: 0 } : { opacity: 0, x: richtung * -40 }}
            transition={{ duration: ruhig ? 0 : 0.22, ease: [0.23, 1, 0.32, 1] }}
            drag={ruhig ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              /* Ein kurzer Schnipser reicht, man muss nicht die halbe Breite ziehen. */
              const weit = Math.abs(info.offset.x) > 70
              const schnell = Math.abs(info.velocity.x) > 320
              if (!weit && !schnell) return
              if (info.offset.x < 0 && !letzte) blaettern(1)
              if (info.offset.x > 0 && nr > 0) blaettern(-1)
            }}
          >
            <Karte karte={karte} aktiv />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Die Leiste: zurueck, wo man ist, weiter. */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => blaettern(-1)}
          disabled={nr === 0}
          aria-label="Vorherige Karte"
          className="flex min-h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface-raised text-ink-strong transition-colors disabled:opacity-35 hover:bg-accent hover:text-accent-ink active:bg-accent active:text-accent-ink"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>

        <span className="font-display flex-1 text-center text-[11px] font-bold uppercase tracking-widest text-ink-muted">
          {`${nr + 1} von ${kapitel.karten.length}`}
        </span>

        {letzte ? (
          naechstesKapitel ? (
            <Link
              to={`/spielwissen/${naechstesKapitel.id}`}
              className="font-display flex min-h-11 items-center gap-1.5 rounded-xl bg-accent px-4 text-[11px] font-extrabold uppercase tracking-widest text-accent-ink active:brightness-110"
            >
              {naechstesKapitel.titel}
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          ) : (
            <Link
              to="/spielwissen"
              className="font-display flex min-h-11 items-center gap-1.5 rounded-xl bg-accent px-4 text-[11px] font-extrabold uppercase tracking-widest text-accent-ink active:brightness-110"
            >
              Fertig
            </Link>
          )
        ) : (
          <button
            type="button"
            onClick={() => blaettern(1)}
            className="font-display flex min-h-11 items-center gap-1.5 rounded-xl bg-accent px-4 text-[11px] font-extrabold uppercase tracking-widest text-accent-ink active:brightness-110"
          >
            Weiter
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
