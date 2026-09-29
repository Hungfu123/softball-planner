const NAVY = '#070a2e'
const CREAM = '#fbf6ec'

/**
 * Diagonaler Sektions-Übergang.
 * Wichtig: Vollflächiges rect + NUR EIN Dreieck obendrauf — nicht zwei
 * aneinander grenzende Dreiecke. Bei zwei Dreiecken ist die gemeinsame
 * Diagonale an beiden Formen anti-aliased, die Deckung fällt unter 100 %
 * und der Sektions-Hintergrund scheint als helle Naht durch.
 *
 * Ecke-zu-Ecke (Fix "Linien gehen rechts/links nicht durch"): Die Diagonale
 * läuft EXAKT durch die ViewBox-Ecken (0,0)→(1440,70). Der frühere ±4-Bleed
 * ließ sie ~5 % vor dem Rand durch die obere/untere Box-Kante austreten —
 * an den Bildschirmrändern blieb eine horizontale Stufe statt der Diagonalen.
 * Der Bleed war zudem wirkungslos: SVGs clippen Content außerhalb der
 * ViewBox standardmäßig (overflow: hidden), wurde also nie gerendert.
 *
 * Mobile: h-8 (32px, vorher h-12) — kompaktere Übergänge, nur Mobile.
 */
export function EdgeFade({ edge }: { edge: 'top' | 'bottom' }) {
  return (
    <div aria-hidden className="pointer-events-none">
      {edge === 'top' ? (
        <svg
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          className="block h-8 w-full md:h-16"
        >
          <rect width="1440" height="70" fill={CREAM} />
          <path d="M0,0 H1440 L0,70 Z" fill={NAVY} />
        </svg>
      ) : (
        <svg
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          className="block h-8 w-full md:h-16"
        >
          <rect width="1440" height="70" fill={CREAM} />
          <path d="M0,0 L1440,70 H0 Z" fill={NAVY} />
        </svg>
      )}
    </div>
  )
}
