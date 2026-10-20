import type { Play, PlayCategory, PlayStep } from '@/components/playmaker/board/types'

const API = '/api'

function getAuthHeaders(): Record<string, string> {
  const creds = localStorage.getItem('auth')
  if (!creds) return {}
  return { Authorization: `Basic ${creds}` }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Fehler ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export interface PlayPayload {
  title: string
  categoryId: number
  gameState: Play['gameState']
  gameStateNote: string | null
  counterpartPlayId: number | null
  steps: Omit<PlayStep, 'id'>[]
}

/**
 * Liefert alle Plays vollstaendig, mit Staenden.
 *
 * Absichtlich fett: die Uebersicht braucht ohnehin den ersten Stand jedes Plays fuer die
 * Vorschau, und ein einziger Aufruf waermt damit den Offline-Cache fuer jedes Play — auch
 * fuer die, die noch niemand geoeffnet hat. Am Platz gibt es kein WLAN.
 */
export const getPlays = () => request<Play[]>('/plays')

export const getPlay = (id: number) => request<Play>(`/plays/${id}`)

export const createPlay = (payload: PlayPayload) =>
  request<Play>('/plays', { method: 'POST', body: JSON.stringify(payload) })

export const updatePlay = (id: number, payload: PlayPayload) =>
  request<Play>(`/plays/${id}`, { method: 'PUT', body: JSON.stringify(payload) })

export const duplicatePlay = (id: number) =>
  request<Play>(`/plays/${id}/duplicate`, { method: 'POST' })

export const deletePlay = (id: number) => request<void>(`/plays/${id}`, { method: 'DELETE' })

export const getPlayCategories = () => request<PlayCategory[]>('/play-categories')

export const createPlayCategory = (name: string) =>
  request<PlayCategory>('/play-categories', { method: 'POST', body: JSON.stringify({ name }) })

export const renamePlayCategory = (id: number, name: string) =>
  request<PlayCategory>(`/play-categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) })

export const mergePlayCategories = (fromId: number, toId: number) =>
  request<void>(`/play-categories/${fromId}/merge/${toId}`, { method: 'POST' })

export const deletePlayCategory = (id: number) =>
  request<void>(`/play-categories/${id}`, { method: 'DELETE' })
