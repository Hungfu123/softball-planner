/**
 * Drei Punkte. Gefüllt heißt schwerer.
 *
 * Punkte statt Wörtern wie „leicht/mittel/schwer": man liest sie in einem Blick, sie
 * brauchen keine Übersetzung, und sie stehen in jeder Zeile an derselben Stelle.
 *
 * Steht hier und nicht in einer der beiden Seiten, weil Spielwissen und Play-Übersicht
 * dieselben Punkte zeigen — eine Kategorie, die dort zwei Punkte hat, soll hier nicht
 * anders aussehen.
 */
/**
 * Die Legende dazu, einmal pro Seite.
 *
 * Punkte sind schnell zu lesen, aber niemand wird mit ihrer Bedeutung geboren: drei
 * gefüllte Punkte heißen hier schwer und nicht etwa „drei Teile". Deshalb steht
 * einmal oben, was sie meinen — in derselben Schreibweise, in der sie unten stehen.
 */
export function StufeLegende({ className = '' }: { className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-faint ${className}`}>
      <span className="font-display font-bold uppercase tracking-widest">Punkte</span>
      {([1, 2, 3] as const).map((stufe, i) => (
        <span key={stufe} className="flex items-center gap-1.5">
          <StufePunkte stufe={stufe} />
          {['für den Anfang', 'wenn das sitzt', 'für Fortgeschrittene'][i]}
        </span>
      ))}
    </p>
  )
}

export function StufePunkte({ stufe }: { stufe: 1 | 2 | 3 }) {
  return (
    <span className="flex shrink-0 items-center gap-1" title={`Stufe ${stufe} von 3`}>
      {/* EINMAL vorlesen: die Farbe macht CSS über die Gruppe, nicht ein zweites Element. */}
      <span className="sr-only">Stufe {stufe} von 3</span>
      {[1, 2, 3].map(i => (
        <span
          key={i}
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${
            i <= stufe
              ? 'bg-ink-strong group-hover:bg-accent-ink'
              : 'bg-line-strong group-hover:bg-accent-ink/30'
          }`}
        />
      ))}
    </span>
  )
}
