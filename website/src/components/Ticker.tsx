const ITEMS = [
  'College Series',
  'RFL · Ruhr Fun Liga',
  'Indoor Series',
  'Funturniere in DE & NL',
  'Mixed Fastpitch',
  'Probetraining offen',
]

function Row() {
  return (
    <div className="flex shrink-0 items-center">
      {ITEMS.map((item) => (
        <span key={item} className="flex items-center">
          <span className="whitespace-nowrap px-6 font-mono text-xs uppercase tracking-[0.22em] text-ink-200">
            {item}
          </span>
          <svg aria-hidden viewBox="0 0 8 8" className="size-2 shrink-0 fill-brand-500">
            <rect x="4" y="0" width="2.83" height="2.83" transform="rotate(45 4 0)" />
          </svg>
        </span>
      ))}
    </div>
  )
}

export function Ticker() {
  return (
    <div
      aria-hidden
      className="overflow-hidden border-y border-navy-700/70 bg-navy-950 py-3.5 select-none"
    >
      <div className="ticker-track">
        <Row />
        <Row />
      </div>
    </div>
  )
}
