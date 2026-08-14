import { useState } from 'react'
import { ConfirmModal } from '@/components/shared'
import { hasAuth } from '@/api/client'
import { useCounter } from '@/hooks/useCounter'
import { CounterBoard } from './CounterBoard'
import { CounterPad } from './CounterPad'

/**
 * Zähler für Balls, Strikes, Outs, Inning und Score — läuft ohne Login und ohne Netz.
 * Vollbild ohne Layout: die Tafel füllt den freien Raum nach oben, das Bedienteil sitzt in
 * seiner natürlichen Höhe unten am Rand — dort, wo der Daumen hinkommt.
 *
 * Beide Teile schrumpfen nie unter ihren Inhalt (`shrink-0`); nur die Tafel wächst (`grow`).
 *
 * Höhe ist `svh`, nicht `dvh`: `dvh` misst den Viewport ohne eingeblendete Browserleiste,
 * also rutscht die unterste Knopfreihe darunter, sobald die Leiste erscheint. `svh` ist die
 * Höhe bei größtmöglicher Browser-UI und passt deshalb immer.
 *
 * Im Querformat passt der Inhalt trotzdem nicht auf 412px — dann darf gescrollt werden
 * (`overflow-y-auto`), statt die unterste Knopfreihe abzuschneiden. Die PWA ist ohnehin
 * auf `portrait` festgenagelt.
 *
 * hasAuth() entscheidet hier nur, ob es einen Zurück-Pfeil gibt und wohin er führt — die
 * Seite selbst ist bewusst für alle offen. Ohne Anmeldung entfällt der Pfeil: wer über einen
 * geteilten Link kommt, hat kein Konto und käme auf der Anmeldung nicht weiter.
 */
export default function CounterPage() {
  const counter = useCounter()
  const [confirmReset, setConfirmReset] = useState(false)

  const loggedIn = hasAuth()

  return (
    <div className="flex h-svh flex-col overflow-y-auto bg-cream-100">
      <CounterBoard
        state={counter.state}
        backTo={loggedIn ? '/orga' : undefined}
        backLabel={loggedIn ? 'Zurück zur Orga' : undefined}
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
