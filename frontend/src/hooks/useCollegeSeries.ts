import { useCallback, useEffect, useState } from 'react'
import {
  fetchCollegeSeriesStandings,
  fetchCollegeSeriesSchedule,
  type CollegeSeriesRow,
  type CollegeSeriesGame,
} from '@/api/collegeSeries'

interface State {
  standings: CollegeSeriesRow[]
  schedule: CollegeSeriesGame[]
  loading: boolean
  error: string | null
  reload: () => void
}

export function useCollegeSeries(): State {
  const [standings, setStandings] = useState<CollegeSeriesRow[]>([])
  const [schedule, setSchedule] = useState<CollegeSeriesGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([fetchCollegeSeriesStandings(), fetchCollegeSeriesSchedule()])
      .then(([st, sc]) => {
        setStandings(st)
        setSchedule(sc)
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'College-Series-Daten konnten nicht geladen werden'),
      )
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { standings, schedule, loading, error, reload }
}
