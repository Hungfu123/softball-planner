import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { StufePunkte } from './StufePunkte'

/**
 * Eine Zeile, die zu etwas fuehrt, das man lernen kann.
 *
 * **Dieselbe fuer alle drei Ebenen**: ein Kapitel der Offense, eine Kategorie der
 * Defense, ein Play darin. Vorher waren es zwei Sprachen — im Spielwissen gerundete
 * Karten mit Kante und Winkel rechts, im Kapitel randlose Zeilen mit Trennstrich, zwei
 * Links je Zeile (Bild und Text getrennt) und keinem Winkel. Zwei Zeilenformen fuer
 * dieselbe Handlung, zwei Tipp-Flaechen fuer dasselbe Ziel.
 *
 * Gewonnen hat die Karte: sie sieht aus wie etwas, das man antippt, und sie traegt die
 * Vorschau genauso gut wie die flache Zeile. **Ein Link je Zeile** — zwei nebeneinander
 * mit demselben Ziel sind fuer die Tastatur zwei Stationen und fuer den Vorleser zwei
 * Eintraege, die dasselbe sagen.
 */
export function LernZeile({
  to,
  titel,
  satz,
  worte = [],
  stufe,
  bild,
  marke,
}: {
  to: string
  titel: string
  /** Die Frage dahinter oder die Lage in einem Satz. */
  satz: string
  /** Was drinsteht, in Stichworten. */
  worte?: string[]
  /** Nur wo es eine gibt: die Stufe gehoert dem Kapitel, nicht dem einzelnen Play. */
  stufe?: 1 | 2 | 3
  /** Vorschau links — die Feldminiatur oder der erste Stand eines Plays. */
  bild?: ReactNode
  /** Kurze Marke rechts, etwa die Spiellage „Knapp". */
  marke?: string
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-ink-strong transition-colors hover:bg-accent hover:text-accent-ink active:bg-accent active:text-accent-ink"
    >
      {/*
        Die Vorschau bekommt eine Kante, und beim Ueberfahren eine hellere: das Bild ist
        navy, die gefuellte Zeile auch — ohne Kante verschwindet es darin.
      */}
      {bild && (
        <span className="h-12 w-14 shrink-0 overflow-hidden rounded-lg border border-line text-ink-faint group-hover:border-accent-ink/40 group-hover:text-accent-ink/70">
          {bild}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-display truncate text-sm font-extrabold uppercase leading-tight tracking-wide sm:text-base">
            {titel}
          </span>
          {stufe && <StufePunkte stufe={stufe} />}
        </span>
        {/* Einzeilig: mit der Marke daneben brach „Keine Runner · 2 Outs · 4 Staende"
            um, und eine Zeile in der Liste war hoeher als ihre Nachbarn. */}
        <span className="mt-0.5 block truncate text-[12px] leading-tight text-ink-muted group-hover:text-accent-ink sm:text-sm">
          {satz}
        </span>
        {worte.length > 0 && (
          /* Was drinsteht, in Stichworten: ein Kapitel ist rund drei Bildschirme, und wer
             eine Sache sucht, soll nicht drei davon durchwischen muessen. */
          <span className="font-display mt-1 block text-[10px] font-bold uppercase tracking-widest text-ink-faint group-hover:text-accent-ink/70">
            {worte.join(' · ')}
          </span>
        )}
      </span>
      {marke && (
        <span className="font-display shrink-0 whitespace-nowrap rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold text-accent-ink group-hover:bg-accent-ink group-hover:text-accent">
          {marke}
        </span>
      )}
      <ChevronRight size={18} className="shrink-0 text-ink-faint group-hover:text-accent-ink/75" aria-hidden="true" />
    </Link>
  )
}
