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
  onSeek,
}: {
  count: number
  current: number
  onSeek: (index: number) => void
}) {
  if (count < 2) return null

  const anteil = (current / (count - 1)) * 100

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
        if (e.key === 'ArrowLeft') onSeek(current - 1)
        if (e.key === 'ArrowRight') onSeek(current + 1)
      }}
      onClick={e => {
        const rect = e.currentTarget.getBoundingClientRect()
        const t = (e.clientX - rect.left) / rect.width
        onSeek(Math.round(t * (count - 1)))
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-cream-200">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-navy-800"
          style={{ width: `${anteil}%` }}
        />
        {Array.from({ length: count - 2 }, (_, i) => (
          <span
            key={i}
            className="absolute top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream-50 opacity-75"
            style={{ left: `${((i + 1) / (count - 1)) * 100}%` }}
          />
        ))}
      </div>
      <span
        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-navy-800 shadow"
        style={{ left: `${anteil}%` }}
      />
    </div>
  )
}
