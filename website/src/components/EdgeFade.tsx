const NAVY = '#070a2e'
const CREAM = '#fbf6ec'

/**
 * Diagonaler Sektions-Übergang.
 * Wichtig: Vollflächiges rect + NUR EIN Dreieck obendrauf — nicht zwei
 * aneinander grenzende Dreiecke. Bei zwei Dreiecken ist die gemeinsame
 * Diagonale an beiden Formen anti-aliased, die Deckung fällt unter 100 %
 * und der Sektions-Hintergrund scheint als helle Naht durch.
 *
 * Naht-Fix: Alle Formen ragen um 4 Einheiten über die ViewBox hinaus
 * (vertikal UND horizontal). Die Clip-Kante liegt damit mitten in
 * Vollfarbe statt auf einer Kante — auf Hi-DPI-Geräten (DPR 2-3) konnte
 * ein 1-Subpixel-Rest der Kante sonst als weiße Linie durchscheinen.
 * Die Diagonale läuft weiterhin Ecke zu Ecke — durch das Bleed minimal
 * steiler (~7 %), visuell nicht unterscheidbar.
 */
export function EdgeFade({ edge }: { edge: 'top' | 'bottom' }) {
  return (
    <div aria-hidden className="pointer-events-none">
      {edge === 'top' ? (
        <svg
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          className="block h-12 w-full md:h-16"
        >
          <rect x="-4" y="-4" width="1448" height="78" fill={CREAM} />
          <path d="M-4,-4 H1444 L-4,74 Z" fill={NAVY} />
        </svg>
      ) : (
        <svg
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          className="block h-12 w-full md:h-16"
        >
          <rect x="-4" y="-4" width="1448" height="78" fill={CREAM} />
          <path d="M-4,-4 L1444,74 H-4 Z" fill={NAVY} />
        </svg>
      )}
    </div>
  )
}
