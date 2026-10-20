import type { PlayStep } from './board/types'

/**
 * Die Staende untereinander, mit ihren Notizen.
 *
 * Nur am Desktop und am Tablet: dort ist neben dem Feld Platz, der am Handy fehlt. Sie
 * ist Navigation und Ueberblick zugleich — man sieht die ganze Abfolge, statt sie sich
 * aus einem Regler zusammenzuklicken.
 */
export function StepList({
  steps,
  current,
  onSelect,
}: {
  steps: PlayStep[]
  current: number
  onSelect: (index: number) => void
}) {
  return (
    <ol className="min-h-0 overflow-y-auto border-t border-cream-200">
      {steps.map((step, index) => {
        const aktiv = index === current
        return (
          <li key={index}>
            <button
              type="button"
              onClick={() => onSelect(index)}
              className={`flex w-full items-start gap-3 border-b border-cream-200 px-4 py-2.5 text-left ${
                aktiv ? 'bg-cream-200' : 'hover:bg-cream-100'
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-display text-xs font-bold tabular-nums ${
                  aktiv ? 'bg-navy-800 text-cream-50' : 'bg-cream-200 text-gray-500'
                }`}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs leading-snug text-navy-900">
                  {step.note || <span className="text-gray-400">ohne Notiz</span>}
                </span>
                <span className="mt-0.5 block font-display text-[10px] font-bold tabular-nums text-gray-400">
                  {(step.durationMs / 1000).toFixed(1).replace('.', ',')} s · {step.outs}{' '}
                  {step.outs === 1 ? 'Out' : 'Outs'}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
