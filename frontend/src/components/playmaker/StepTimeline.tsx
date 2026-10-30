/**
 * Die Zeitleiste als durchgehender Schieberegler.
 *
 * Nicht als Reihe nummerierter Pillen und nicht als Segmente mit Luecken: beides wird bei
 * zwoelf Staenden zur Tapete. Der Regler bleibt gleich breit, egal ob drei oder fuenfzehn,
 * und sieht aus wie jeder andere Regler. Je Stand ein heller Teilstrich.
 *
 * Bei nur einem Stand erscheint sie gar nicht — sonst sieht sie aus wie ein toter Regler.
 */
export function StepTimeline({
  count,
  current,
  fortschritt = 0,
  onSeek,
}: {
  count: number
  current: number
  /**
   * Wie weit der laufende Uebergang ist, 0..1. Ohne ihn stand der Knopf waehrend der
   * ganzen Bewegung still und sprang dann — bei zwei Sekunden Stand sieht das aus, als
   * haenge die Wiedergabe.
   */
  fortschritt?: number
  onSeek: (index: number) => void
}) {
  if (count < 2) return null

  const stelle = Math.min(count - 1, current + Math.max(0, Math.min(1, fortschritt)))
  const anteil = (stelle / (count - 1)) * 100
  /**
   * Hier wird geklemmt, nicht beim Aufrufer. Der Editor reichte den rohen Setter durch;
   * Pfeil-links auf Stand 1 ergab cur = -1, und der Zugriff auf den Stand warf.
   */
  const springe = (ziel: number) => onSeek(Math.max(0, Math.min(count - 1, ziel)))

  return (
    <div
      className="relative h-11 cursor-pointer"
      role="slider"
      aria-label="Stand"
      aria-valuemin={1}
      aria-valuemax={count}
      aria-valuenow={current + 1}
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft') springe(current - 1)
        if (e.key === 'ArrowRight') springe(current + 1)
        if (e.key === 'Home') springe(0)
        if (e.key === 'End') springe(count - 1)
      }}
      onClick={e => {
        const rect = e.currentTarget.getBoundingClientRect()
        const t = (e.clientX - rect.left) / rect.width
        springe(Math.round(t * (count - 1)))
      }}
    >
      {/* Auf der Buehne: die Bahn ist angedeuteter Cream, der gelaufene Teil Amber. */}
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-cream-50/15">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-amber-400"
          style={{ width: `${anteil}%` }}
        />
        {Array.from({ length: count - 2 }, (_, i) => (
          <span
            key={i}
            className="absolute top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream-50 opacity-60"
            style={{ left: `${((i + 1) / (count - 1)) * 100}%` }}
          />
        ))}
      </div>
      <span
        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream-50 shadow"
        style={{ left: `${anteil}%` }}
      />
    </div>
  )
}
