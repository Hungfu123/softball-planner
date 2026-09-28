const NAVY = '#070a2e'
const CREAM = '#fbf6ec'

/**
 * Diagonaler Sektions-Übergang.
 * Wichtig: Vollflächiges rect + NUR EIN Dreieck obendrauf — nicht zwei
 * aneinander grenzende Dreiecke. Bei zwei Dreiecken ist die gemeinsame
 * Diagonale an beiden Formen anti-aliased, die Deckung fällt unter 100 %
 * und der Sektions-Hintergrund scheint als helle Naht durch.
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
          <rect x="-1" y="-1" width="1442" height="72" fill={CREAM} />
          <path d="M-1,-1 H1441 L-1,71 Z" fill={NAVY} />
        </svg>
      ) : (
        <svg
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          className="block h-12 w-full md:h-16"
        >
          <rect x="-1" y="-1" width="1442" height="72" fill={CREAM} />
          <path d="M-1,-1 L1441,71 H-1 Z" fill={NAVY} />
        </svg>
      )}
    </div>
  )
}
