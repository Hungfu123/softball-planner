import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicBogenFeed } from '@/api/client'
import type { PublicBogenFeed } from '@/types'
import { buildFeed } from '@/utils/bogenFeed'
import { BogenLiveFeed } from '@/components/spielbogen/BogenLiveFeed'
import { BogenLineupAccordion } from '@/components/spielbogen/BogenLineupAccordion'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { CrossBones } from '@/icons'

const POLL_INTERVAL_MS = 10_000

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('de-DE', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Öffentliche Zuschauer-Seite unter /live/:token — kein Login, kein Layout.
 * Der Endpoint kennt für Tokens nur zwei Antworten (200 oder 404), deshalb
 * heißt jeder Fehlschlag beim allerersten Laden "Link ungültig". Ist schon
 * ein Stand geladen, war ein Fehlschlag danach ein Netzproblem — alten Stand
 * stehen lassen und weiter versuchen.
 */
export default function PublicBogenPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PublicBogenFeed | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [pollError, setPollError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const hasDataRef = useRef(false)

  const load = useCallback(async () => {
    if (!token) {
      setNotFound(true)
      return
    }
    try {
      const feed = await getPublicBogenFeed(token)
      hasDataRef.current = true
      setData(feed)
      setNotFound(false)
      setPollError(false)
      setLastUpdated(new Date())
    } catch {
      if (hasDataRef.current) setPollError(true)
      else setNotFound(true)
    }
  }, [token])

  // Initial laden, danach bei jeder Rückkehr aus dem Hintergrund sofort neu laden.
  useEffect(() => {
    load()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [load])

  // Polling nur solange das Spiel läuft — bei DONE bleibt es beim einmaligen Laden oben.
  // Der Tick selbst prüft die Sichtbarkeit, statt das Intervall bei jedem Tab-Wechsel
  // neu aufzusetzen — spart ein zweites Effekt-Paar für denselben Zweck.
  useEffect(() => {
    if (data?.status !== 'LIVE') return
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [data?.status, load])

  if (notFound) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-navy-900 px-4">
        <div className="max-w-sm text-center">
          <CrossBones size={40} className="mx-auto text-navy-300 mb-4" />
          <h1 className="font-display text-xl font-black text-white uppercase tracking-wide mb-2">
            Dieser Link ist nicht mehr gültig.
          </h1>
          <p className="text-sm text-navy-100">
            Der Spielstand wurde nicht mehr freigegeben, oder es gibt diesen Link nicht.
          </p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-navy-900">
        <LoadingSkeleton variant="ball" />
      </div>
    )
  }

  const feed = buildFeed({
    homeLineup: data.homeLineup,
    awayLineup: data.awayLineup,
    homeAtBats: data.homeAtBats,
    awayAtBats: data.awayAtBats,
    stealingEvents: data.stealingEvents,
    substitutions: data.substitutions,
    inningRuns: data.inningRuns,
  })

  return (
    <div className="min-h-dvh bg-navy-900 sm:py-8 px-0 sm:px-4">
      <div className="mx-auto max-w-xl bg-cream-50 sm:rounded-2xl sm:shadow-2xl overflow-hidden">
        {/* Kopfzeile nennt beide Teams als Fließtext, nicht bloß als title-Tooltip in
            der Aufstellung darunter — sonst weiß ein Zuschauer aufs Handy nicht,
            welches der beiden "Heim" ist. */}
        <header className="px-5 py-4 border-b border-cream-300 bg-white">
          <p className="font-display text-base font-extrabold text-navy-900 truncate">
            {data.awayTeamName} <span className="text-gray-400 font-normal">bei</span> {data.homeTeamName}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(data.date)}{data.location ? ` · ${data.location}` : ''}
          </p>
        </header>

        {pollError && lastUpdated && (
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 font-body">
            Verbindung unterbrochen — letzter Stand von {formatTime(lastUpdated)}
          </div>
        )}

        <BogenLiveFeed
          homeTeamName={data.homeTeamName}
          awayTeamName={data.awayTeamName}
          status={data.status}
          currentInning={data.currentInning}
          currentSide={data.currentSide}
          homeRuns={data.homeRuns}
          awayRuns={data.awayRuns}
          inningRuns={data.inningRuns}
          homeTotals={data.homeTotals}
          awayTotals={data.awayTotals}
          feed={feed}
        />

        <BogenLineupAccordion
          homeLineup={data.homeLineup}
          awayLineup={data.awayLineup}
          homeTeamName={data.homeTeamName}
          awayTeamName={data.awayTeamName}
        />
      </div>
    </div>
  )
}
