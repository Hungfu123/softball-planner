import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '@/api/client'
import type { TeamDirectoryEntry } from '@/types'
import { useToastContext } from '@/components/layout/Layout'
import { buildHistoryByClub, ClubSheet, syntheticEntry, type ClubGame } from './clubDirectoryShared'

interface SheetData {
  entry: TeamDirectoryEntry
  history: ClubGame[]
  allClubNames: string[]
}

/** Club-Bilanz-Sheet direkt im Spieltag („Bilanz"- und „Historie"-Buttons):
 *  lädt Verzeichnis + alle Spieltage on demand und öffnet dasselbe ClubSheet wie
 *  die Teams-Seite — ohne dass die Seite gewechselt werden muss. Liegt der Club
 *  (noch) nicht im Verzeichnis, wird die Bilanz aus der Spiel-Historie synthetisiert.
 *  Das Sheet wird EINMAL gemountet (mit Skeleton-Inhalt) und bleibt beim Übergang
 *  Laden → Inhalt dieselbe Instanz — kein zweites Aufploppen. */
export function OpponentSheet({ club, onClose }: { club: string; onClose: () => void }) {
  const toast = useToastContext()
  const [data, setData] = useState<SheetData | null>(null)
  // Fehler beim ERSTEN Laden schließt das Sheet (nach Toast); bei Re-Load-Fehlern
  // (nach Umbenennen etc.) bleibt es offen. data im load-Closure wäre stale.
  const everLoadedRef = useRef(false)

  const load = useCallback(async () => {
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
      everLoadedRef.current = true
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
      if (!everLoadedRef.current) onClose()
    }
  }, [club, toast, onClose])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusster Load pro Club (wie TeamDirectoryPage)
  useEffect(() => { setData(null); everLoadedRef.current = false; load() }, [club])

  return (
    <ClubSheet
      key={club}
      entry={data?.entry ?? syntheticEntry(club, [])}
      history={data?.history ?? []}
      allClubNames={data?.allClubNames ?? []}
      loading={!data}
      onClose={onClose}
      onChanged={load}
    />
  )
}
