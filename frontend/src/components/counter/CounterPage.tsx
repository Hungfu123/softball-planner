import { useState } from 'react'
import { ConfirmModal } from '@/components/shared'
import { hasAuth } from '@/api/client'
import { useCounter } from '@/hooks/useCounter'
import { CounterBoard } from './CounterBoard'
import { CounterPad } from './CounterPad'

/**
 * Zähler für Balls, Strikes, Outs, Inning und Score — läuft ohne Login und ohne Netz.
 * Vollbild ohne Layout: die Tafel sitzt oben fest, das Bedienteil füllt den Rest,
 * gescrollt wird nie.
 *
 * hasAuth() entscheidet hier nur über das Ziel des Zurück-Links; die Seite selbst
 * ist bewusst für alle offen.
 */
export default function CounterPage() {
  const counter = useCounter()
  const [confirmReset, setConfirmReset] = useState(false)

  const loggedIn = hasAuth()

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-cream-100">
      <CounterBoard
        state={counter.state}
        backTo={loggedIn ? '/orga' : '/'}
        backLabel={loggedIn ? 'Zurück zur Orga' : 'Zurück zur Anmeldung'}
      />

      <CounterPad
        onStrike={counter.strike}
        onBall={counter.ball}
        onFoul={counter.foul}
        onOut={counter.out}
        onRunHome={counter.runHome}
        onRunAway={counter.runAway}
        onHalfInning={counter.halfInning}
        onUndo={counter.undo}
        onReset={() => setConfirmReset(true)}
        canUndo={counter.canUndo}
      />

      {confirmReset && (
        <ConfirmModal
          title="Zähler zurücksetzen"
          message="Score, Inning und alle Zähler gehen auf Anfang. Auch der Verlauf für Rückgängig wird gelöscht."
          confirmLabel="Alles zurücksetzen"
          onConfirm={() => {
            counter.reset()
            setConfirmReset(false)
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  )
}
