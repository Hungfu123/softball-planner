const NAVY = '#070a2e'
const CREAM = '#fbf6ec'

/**
 * Diagonaler Sektions-Übergang.
 *
 * Design-Regeln (jede wurde durch einen echten Bug erarbeitet — nicht ändern):
 *
 * 1) Vollflächiges rect + NUR EIN Dreieck obendrauf — nicht zwei aneinander
 *    grenzende Dreiecke. Bei zwei Dreiecken ist die gemeinsame Diagonale an
 *    beiden Formen anti-aliased, die Deckung fällt unter 100 % und der
 *    Sektions-Hintergrund scheint als helle Naht durch.
 *
 * 2) Diagonale EXAKT Ecke-zu-Ecke: Sie läuft durch die ViewBox-Ecken
 *    (0,0)→(1440,70) und wird nur mathematisch darüber hinaus verlängert
 *    (Steigung 70/1440). Ein früherer Versuch, die Eckpunkte selbst zu
 *    verbiegen, ließ die Diagonale ~5 % vor dem Bildschirmrand durch die
 *    obere/untere Box-Kante austreten — an den Rändern blieben horizontale
 *    Stufen ("Linien gehen nicht durch").
 *
 * 3) Kanten-Bleed mit Nachbar-Farbe + overflow-visible: SVGs clippen Content
 *    außerhalb der ViewBox standardmäßig — ein Bleed ohne `overflow-visible`
 *    ist toter Code (desswegen tauchte die Subpixel-Naht am oberen Rand der
 *    Galerie wieder auf, sobald Elementhöhen auf Bruchpixel landeten). Jede
 *    Form ragt jetzt 4 Einheiten (≈2-4px) über die OBER-/UNTER-Kante hinaus,
 *    aber nur mit der Farbe der Sektion, die dort angrenzt: Das Navy-Dreieck
 *    blutet oben in die Navy-Sektion, das Cream-Rect unten in die Cream-
 *    Sektion — die Naht wird zugestellt, ohne dass Farbe sichtbar "spillt".
 *    Die mittlere Zahl der Pfade ist die verlängerte Diagonale
 *    (±4 · 70/1440 ≈ 0.194).
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
          className="block h-8 w-full overflow-visible md:h-16"
        >
          {/* Cream bis 4 unter die Unterkante (Sektion darunter ist Cream) */}
          <rect y="0" width="1440" height="74" fill={CREAM} />
          {/* Navy: oben 4 über die Oberkante (Sektion darüber ist Navy),
              Diagonale exakt durch (1440,0) und (0,70) */}
          <path d="M-4,-4 H1444 L1444,-0.194 L-4,70.194 Z" fill={NAVY} />
        </svg>
      ) : (
        <svg
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          className="block h-8 w-full overflow-visible md:h-16"
        >
          {/* Cream: oben 4 über die Oberkante (Sektion darüber ist Cream) */}
          <rect y="-4" width="1440" height="74" fill={CREAM} />
          {/* Navy: unten 4 unter die Unterkante (Sektion darunter ist Navy),
              Diagonale exakt durch (0,0) und (1440,70) */}
          <path d="M-4,-0.194 L1444,70.194 L1444,74 H-4 Z" fill={NAVY} />
        </svg>
      )}
    </div>
  )
}
