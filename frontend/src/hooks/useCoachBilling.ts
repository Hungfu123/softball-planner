import { useCallback, useEffect, useState } from 'react'
import * as api from '@/api/client'
import type { CoachBillingProfile } from '@/types'

/**
 * Die Stammdaten der Trainerabrechnung.
 *
 * `profile === undefined` bei `loading === false` heisst: noch nie eingetragen —
 * die Seite fragt sie dann ab, statt eine leere PDF zu bauen.
 */
export function useCoachBilling() {
  const [profile, setProfile] = useState<CoachBillingProfile | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setProfile(await api.getCoachBillingProfile())
      setError(null)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const save = useCallback(async (next: CoachBillingProfile) => {
    const saved = await api.updateCoachBillingProfile(next)
    setProfile(saved)
    return saved
  }, [])

  return { profile, loading, error, save, reload: load }
}
