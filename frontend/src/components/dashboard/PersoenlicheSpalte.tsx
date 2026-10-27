import { useTermine } from '@/hooks/useTermine'
import { NaechstesTraining } from './NaechstesTraining'
import { JahresBand } from './JahresBand'
import { MeineZahlen } from './MeineZahlen'

/**
 * Die persoenliche Haelfte der Startseite: was als Naechstes ansteht, wie ich dastehe,
 * wie das Jahr aussieht.
 *
 * Beide Startseiten (Trainer und Spieler) setzen dieselbe Spalte ein — die Frage "wann
 * ist Training und wie schlage ich" stellt sich unabhaengig von der Rolle. Was sich
 * unterscheidet, ist die andere Haelfte: der Trainer bekommt dort seine Werkbank, der
 * Spieler die Aufstellung zum Lesen.
 *
 * Die Termine werden EINMAL geladen und an beide Karten weitergereicht. Zwei Haken in
 * zwei Komponenten waeren zwei Abrufe derselben zwei Listen.
 *
 * `playerId` kommt von aussen statt aus `useAuth`: die Spalte soll nichts ueber die
 * Anmeldung wissen muessen, und beide Startseiten haben die Zahl ohnehin schon.
 * `null` heisst "Konto haengt an keinem Spieler" — dann faellt die Zahlenkarte weg.
 * Eine Karte voller Striche ist keine Auskunft, sondern Fuellmaterial.
 */
export function PersoenlicheSpalte({ playerId, seasonId, seasonName, ladefehler = false, className = '' }: {
  playerId: number | null
  seasonId: number | null
  seasonName?: string | null
  /** Die Seite kam schon nicht an die Saison heran — siehe `MeineZahlen`. */
  ladefehler?: boolean
  className?: string
}) {
  const { termine, laden, fehler } = useTermine()

  return (
    <div className={`space-y-3 sm:space-y-4 min-w-0 ${className}`}>
      <NaechstesTraining termine={termine} laden={laden} fehler={fehler} />
      {playerId != null && (
        <MeineZahlen playerId={playerId} seasonId={seasonId} seasonName={seasonName} ladefehler={ladefehler} />
      )}
      <JahresBand termine={termine} laden={laden} fehler={fehler} />
    </div>
  )
}
