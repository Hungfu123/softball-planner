import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Abschnittsmarke } from '@/components/shared'
import type { Termin } from '@/hooks/useTermine'
import { heuteIso } from '@/hooks/useTermine'

const MONATE = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MONATSNAMEN = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

/** Hoehe der hoechsten Saeule. Darunter wird linear skaliert, mit 3px Mindesthoehe je Art. */
const MAX_HOEHE = 52

/**
 * Das Jahr auf einen Blick: zwoelf Saeulen, eine je Monat.
 *
 * Kein Monatsraster mit Kaestchen — davon passt am Handy eins auf den Schirm, und die
 * Frage ist nicht "welcher Dienstag", sondern "wie voll wird es noch". Die Saeule
 * beantwortet genau das: Spieltage oben, Trainings darunter, Hoehe = Anzahl.
 *
 * Vergangene Monate stehen blass, der laufende und alle kommenden kraeftig. So liest
 * man ohne Beschriftung, was noch VOR einem liegt — die eigentliche Auskunft.
 *
 * Rot fuer Spieltage, Balkenblau fuer Trainings. Das ist hier keine Wertung (die
 * Analyse-Oberflaeche haelt Rot fuer negative Zahlen frei, diese Seite nicht), sondern
 * dieselbe Unterscheidung, die die App ueberall macht: Spieltag ist das Ereignis,
 * Training der Takt dazwischen.
 */
export function JahresBand({ termine, laden, fehler }: {
  termine: Termin[]
  laden: boolean
  fehler: boolean
}) {
  const jahr = new Date().getFullYear()
  const heute = heuteIso()
  const aktuellerMonat = new Date().getMonth()

  const monate = useMemo(() => {
    const leer = Array.from({ length: 12 }, () => ({ spieltage: 0, trainings: 0 }))
    for (const t of termine) {
      if (!t.datum.startsWith(String(jahr))) continue
      const m = Number(t.datum.slice(5, 7)) - 1
      if (m < 0 || m > 11) continue
      if (t.art === 'SPIELTAG') leer[m].spieltage++
      else leer[m].trainings++
    }
    return leer
  }, [termine, jahr])

  const hoechste = Math.max(1, ...monate.map(m => m.spieltage + m.trainings))
  const offen = termine.filter(t => t.datum >= heute && t.datum.startsWith(String(jahr)))
  const offeneSpieltage = offen.filter(t => t.art === 'SPIELTAG').length
  const offeneTrainings = offen.filter(t => t.art === 'TRAINING').length

  return (
    <section aria-label={`Termine ${jahr}`} className="bg-surface-raised border border-line rounded-2xl shadow-card p-4">
      <h2 className="font-display inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-ink-muted mb-3">
        <Abschnittsmarke size="sm" />
        Dein Jahr {jahr}
      </h2>

      {laden ? (
        <p className="text-sm text-ink-muted">Termine laden …</p>
      ) : fehler ? (
        <p className="text-sm text-ink-muted">Die Termine sind gerade nicht erreichbar.</p>
      ) : (
        <>
          <ol className="flex items-end gap-1" style={{ height: MAX_HOEHE }}>
            {monate.map((m, i) => {
              const gesamt = m.spieltage + m.trainings
              const vorbei = i < aktuellerMonat
              const skala = (n: number) => (n === 0 ? 0 : Math.max(3, (n / hoechste) * MAX_HOEHE))
              return (
                <li
                  key={i}
                  className="flex-1 flex flex-col justify-end gap-px h-full"
                  title={gesamt === 0
                    ? `${MONATSNAMEN[i]}: nichts angesetzt`
                    : `${MONATSNAMEN[i]}: ${m.spieltage} Spieltage, ${m.trainings} Trainings`}
                >
                  {m.spieltage > 0 && (
                    <span
                      className={`block w-full rounded-sm bg-softball-red-600 ${vorbei ? 'opacity-30' : ''}`}
                      style={{ height: skala(m.spieltage) }}
                    />
                  )}
                  {m.trainings > 0 && (
                    <span
                      className={`block w-full rounded-sm bg-bar ${vorbei ? 'opacity-30' : ''}`}
                      style={{ height: skala(m.trainings) }}
                    />
                  )}
                  {gesamt === 0 && <span className="block w-full h-[2px] rounded-sm bg-bar-track" />}
                </li>
              )
            })}
          </ol>

          <ol className="flex gap-1 mt-1.5" aria-hidden>
            {MONATE.map((m, i) => (
              <li key={i} className="flex-1 min-w-0">
                {/* Der laufende Monat traegt einen Strich, nicht nur eine andere Helligkeit:
                    "wo stehe ich gerade" darf nicht an einer Nuance haengen. */}
                <span
                  className={`block text-center font-display text-[10px] font-bold ${
                    i === aktuellerMonat ? 'text-ink' : i < aktuellerMonat ? 'text-ink-faint' : 'text-ink-muted'
                  }`}
                >
                  {m}
                </span>
                <span
                  className={`block h-0.5 rounded-full mt-0.5 ${i === aktuellerMonat ? 'bg-label' : 'bg-transparent'}`}
                />
              </li>
            ))}
          </ol>

          <p className="text-[11px] text-ink-muted mt-3 leading-relaxed">
            Noch offen:{' '}
            <span className="font-semibold text-ink">{offeneSpieltage}</span>{' '}
            {offeneSpieltage === 1 ? 'Spieltag' : 'Spieltage'} ·{' '}
            <span className="font-semibold text-ink">{offeneTrainings}</span>{' '}
            {offeneTrainings === 1 ? 'Training' : 'Trainings'}
          </p>
        </>
      )}

      <Link
        to="/kalender"
        className="font-display mt-1 inline-flex items-center min-h-11 text-[11px] font-bold tracking-widest uppercase text-label hover:text-ink underline decoration-line underline-offset-4 hover:decoration-ink-muted transition-colors"
      >
        Kalender öffnen
      </Link>
    </section>
  )
}
