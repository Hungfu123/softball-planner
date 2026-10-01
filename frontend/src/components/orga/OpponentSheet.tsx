import { useCallback, useEffect, useState } from 'react'
import * as api from '@/api/client'
import type { TeamDirectoryEntry } from '@/types'
import { useToastContext } from '@/components/layout/Layout'
import { ResponsiveSheet } from '@/components/shared'
import { buildHistoryByClub, ClubSheet, syntheticEntry, type ClubGame } from './clubDirectoryShared'

interface SheetData {
  entry: TeamDirectoryEntry
  history: ClubGame[]
  allClubNames: string[]
}

/** Club-Bilanz-Sheet direkt im Spieltag („Bilanz"- und „Historie"-Buttons):
 *  lädt Verzeichnis + alle Spieltage on demand und öffnet dasselbe ClubSheet wie
 *  die Teams-Seite — ohne dass die Seite gewechselt werden muss. Liegt der Club
 *  (noch) nicht im Verzeichnis, wird die Bilanz aus der Spiel-Historie synthetisiert. */
export function OpponentSheet({ club, onClose }: { club: string; onClose: () => void }) {
  const toast = useToastContext()
  const [data, setData] = useState<SheetData | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      const [directory, gameDays, seasons] = await Promise.all([
        api.getTeamDirectory(),
        api.getAllGameDays(),
        api.getSeasons(),
      ])
      const historyByClub = buildHistoryByClub(gameDays, seasons)
      const history = historyByClub.get(club) ?? []
      setData({
        entry: directory.find(d => d.clubName === club) ?? syntheticEntry(club, history),
        history,
        allClubNames: directory.map(d => d.clubName),
      })
    } catch (e: unknown) {
      setFailed(true)
      toast.show((e as Error).message, 'error')
    }
  }, [club, toast])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusster Load pro Club (wie TeamDirectoryPage)
  useEffect(() => { setData(null); load() }, [club])

  if (failed) return null

  if (!data) {
    // Sheet-Frame sofort zeigen (Klick fühlt sich an wie geöffnet), Inhalt als Skeleton
    return (
      <ResponsiveSheet open onClose={onClose} title={club}>
        <div className="p-5 space-y-3">
          <div className="bg-cream-50 border border-cream-200 rounded-2xl p-4 space-y-3">
            <div className="h-4 w-1/3 rounded bg-cream-200 animate-pulse" />
            <div className="h-1.5 w-full rounded bg-cream-200 animate-pulse" />
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-9 rounded-xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      </ResponsiveSheet>
    )
  }

  return (
    <ClubSheet
      key={data.entry.clubName}
      entry={data.entry}
      history={data.history}
      allClubNames={data.allClubNames}
      onClose={onClose}
      onChanged={load}
    />
  )
}
