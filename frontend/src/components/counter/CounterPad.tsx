import { Button } from '@/components/shared'

interface Props {
  onStrike: () => void
  onBall: () => void
  onFoul: () => void
  onOut: () => void
  onRunHome: () => void
  onRunAway: () => void
  onHalfInning: () => void
  onUndo: () => void
  onReset: () => void
  canUndo: boolean
}

const ACTION = 'flex-1 min-h-14 rounded-xl text-base font-bold'
// Utility-Zeile bewusst kleiner (44px statt 56px) — am Feld sicherer für Destruktiv-Knöpfe
const UTILITY = 'flex-1 min-h-11 rounded-xl text-xs font-semibold'

export function CounterPad({
  onStrike,
  onBall,
  onFoul,
  onOut,
  onRunHome,
  onRunAway,
  onHalfInning,
  onUndo,
  onReset,
  canUndo,
}: Props) {
  return (
    <div className="flex shrink-0 flex-col gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex gap-2">
        <Button variant="primary" onClick={onStrike} className={ACTION}>Strike</Button>
        <Button variant="navy" onClick={onBall} className={ACTION}>Ball</Button>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onFoul} className={ACTION}>Foul</Button>
        <Button variant="secondary" onClick={onOut} className={ACTION}>Out</Button>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onRunHome} className={ACTION}>
          <span className="font-display uppercase tracking-widest">Heim + Run</span>
        </Button>
        <Button variant="secondary" onClick={onRunAway} className={ACTION}>
          <span className="font-display uppercase tracking-widest">Gast + Run</span>
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" onClick={onUndo} disabled={!canUndo} className={UTILITY}>
          Rückgängig
        </Button>
        <Button variant="ghost" onClick={onHalfInning} className={UTILITY}>
          Seitenwechsel
        </Button>
        <Button variant="ghost" onClick={onReset} className={UTILITY}>
          Zurücksetzen
        </Button>
      </div>
    </div>
  )
}
