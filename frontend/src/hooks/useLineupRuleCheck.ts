import { useEffect, useState } from 'react'
import * as api from '@/api/client'
import type { LineupRuleCheck, LocalLineupEntry } from '@/types'

/** Wartezeit, bevor ein Entwurf zur Prüfung geht — Ziehen soll keine Request-Kette auslösen. */
const DEBOUNCE_MS = 400

/**
 * Prüft den Aufstellungs-Entwurf gegen die Liga-Regeln (Frauen-Quote).
 *
 * Gerechnet wird im Backend: die Regel gehört in die Domäne, nicht in zwei
 * Implementierungen. Der Entwurf liegt aber lokal im Editor, deshalb geht er
 * entdrosselt als Payload mit — gespeichert wird dabei nichts.
 */
export function useLineupRuleCheck(gameId: number | null, entries: LocalLineupEntry[]): LineupRuleCheck | null {
  const [check, setCheck] = useState<LineupRuleCheck | null>(null)

  // Nur Spieler mit Position sind für die Quote überhaupt interessant; leere Slots
  // tragen negative Platzhalter-Ids und würden das Backend 404 werfen lassen.
  const payload = entries
    .filter(e => !e.isEmptySlot && e.player.id > 0)
    .map((e, i) => ({
      playerId: e.player.id,
      position: e.position,
      battingOrder: i + 1,
      dhBatterPlayerId: e.dhBatterId ?? null,
    }))
  const signature = `${gameId}|${payload.map(e => `${e.playerId}:${e.position ?? ''}`).join(',')}`

  useEffect(() => {
    if (gameId == null || payload.length === 0) {
      setCheck(null)
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      api.checkLineupRules(gameId, payload)
        .then(result => { if (!cancelled) setCheck(result) })
        // Ein fehlgeschlagener Check darf den Editor nicht stören — dann eben kein Hinweis.
        .catch(() => { if (!cancelled) setCheck(null) })
    }, DEBOUNCE_MS)
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  return check
}
