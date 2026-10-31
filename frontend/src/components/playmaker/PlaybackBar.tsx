import { RefreshIcon } from '@/icons'

/**
 * Die Wiedergabeleiste der Spieleransicht.
 *
 * Die Schritt-Knoepfe sind nicht Zierrat: beim Erklaeren blaettert man, man spielt nicht
 * ab. Vorher war das nur per Wischen erreichbar und damit unsichtbar.
 *
 * **Weg sind Tempo, Schleife, Zeitleiste und die Zeile „Stand 2 von 4".** Das waren
 * Einstellungen und Anzeigen eines Videospielers; ein Play ist kein Video, das man
 * durchsucht, sondern eine Bewegung, die man sich ansieht. Geblieben sind vier
 * Handlungen: einen Stand zurueck, anhalten, einen vor, und „nochmal" — dasselbe Wort
 * und dasselbe Zeichen wie unter einer Karte im Spielwissen.
 */
export function PlaybackBar({
  playing,
  canPlay,
  onToggle,
  onNochmal,
}: {
  playing: boolean
  canPlay: boolean
  onToggle: () => void
  onNochmal: () => void
}) {
  return (
    <div className="border-t border-cream-50/12 px-4 pb-3 pt-2 safe-bottom">
      <div className="flex items-center gap-2">
        {/*
          Zwei Knoepfe, mehr nicht. Die Pfeile fuer einen Stand vor und zurueck standen
          neben dem Dreieck zum Abspielen und sahen aus wie „vorheriges Play" — drei
          Dreiecke nebeneinander, von denen eines etwas anderes tut. Wer einen einzelnen
          Stand braucht, hat quer und am Rechner die Liste daneben.
        */}
        <Knopf onClick={onToggle} disabled={!canPlay} aria-label={playing ? 'Pause' : 'Abspielen'}>
          {playing ? '❚❚' : '▶'}
        </Knopf>
        {/*
          Ruhig, nicht amber. Amber gibt es auf der Seite genau einmal, und das ist
          „Naechstes Play" in der Zeile darueber — der Weg vorwaerts, wie das „Weiter"
          am Ende einer Karte im Spielwissen. Zwei gleich laute Knoepfe uebereinander
          sahen aus wie zwei Wege, von denen einer rueckwaerts fuehrt.
        */}
        <Knopf onClick={onNochmal} disabled={!canPlay} wide aria-label="Nochmal">
          <span className="flex items-center gap-1.5">
            <RefreshIcon size={14} />
            nochmal
          </span>
        </Knopf>
      </div>
    </div>
  )
}

function Knopf({
  children,
  onClick,
  disabled,
  primary,
  active,
  wide,
  ...rest
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  active?: boolean
  wide?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const basis = wide ? 'px-3.5' : 'w-11'
  /*
   * Die Sprache der Buehne: Amber ist der Knopf, den man drueckt, Cream die Umrisse
   * drumherum. Vorher waren es weisse Knoepfe mit Cream-Kanten — auf Navy unsichtbar.
   */
  const farbe = primary
    ? 'bg-amber-400 text-navy-900 active:brightness-110'
    : active
      ? 'bg-cream-50 text-navy-900'
      : 'border border-cream-50/25 text-cream-50 active:bg-cream-50/10'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-11 shrink-0 rounded-xl font-display text-sm font-bold disabled:opacity-40 ${basis} ${farbe}`}
      {...rest}
    >
      {children}
    </button>
  )
}
