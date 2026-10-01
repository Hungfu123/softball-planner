import { useMemo, useState } from 'react'
import * as api from '@/api/client'
import type { Season, TeamDirectoryEntry } from '@/types'
import { Button, ResponsiveSheet } from '@/components/shared'
import { useToastContext } from '@/components/layout/Layout'

const inputCls = 'w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none'
const labelCls = 'font-display block text-[10px] tracking-widest uppercase font-bold text-gray-500 mb-1.5'
const selectCls = 'w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none cursor-pointer'

/**
 * Gegner-Team anlegen — mit Liga-Auswahl. "Liga" = Saison (Team wird über
 * POST /api/seasons/{seasonId}/teams in genau dieser Saison angelegt).
 * Die empfohlene Liga ist vorselektiert (aktiver Liga-Filter der Seite bzw.
 * aktuelle Saison). Existiert der Club-Name schon in einer anderen Liga,
 * wird das neue Team dem bestehenden Club zugefügt (Directory fusioniert
 * per Name) — existiert er schon in der GEWÄHLTEN Liga, blockt der Client
 * vorab (das Backend würde ohnehin 400 liefern).
 */
export function CreateTeamSheet({ seasons, recommendedSeasonId, directory, onClose, onCreated }: {
  seasons: Season[]
  recommendedSeasonId: number | null
  directory: TeamDirectoryEntry[]
  onClose: () => void
  onCreated: (season: Season) => void
}) {
  const toast = useToastContext()
  const [name, setName] = useState('')
  const [seasonId, setSeasonId] = useState<number | ''>(recommendedSeasonId ?? '')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Neuestes Jahr zuerst, innerhalb eines Jahres alphabetisch
  const sortedSeasons = useMemo(
    () => [...seasons].sort((a, b) => b.year - a.year || a.name.localeCompare(b.name)),
    [seasons],
  )
  const selectedSeason = seasons.find(s => s.id === seasonId) ?? null
  const trimmed = name.trim()

  // Club mit gleichem Namen (case-insensitive) — Hinweis-Wirrwarr vermeiden:
  const existingClub = useMemo(
    () => (trimmed ? directory.find(d => d.clubName.toLowerCase() === trimmed.toLowerCase()) ?? null : null),
    [trimmed, directory],
  )
  // … schon in der gewählten Liga vorhanden → harer Block (fail-fast statt 400). seasonId
  // statt Name+Jahr: zwei Saisons können denselben Namen tragen — nur die ID ist eindeutig.
  const existsInSelectedSeason = !!(existingClub && selectedSeason
    && existingClub.leagues.some(l => l.seasonId === selectedSeason.id))
  const otherLeaguesOfClub = existingClub
    ? existingClub.leagues
        .filter(l => !selectedSeason || l.seasonId !== selectedSeason.id)
        .map(l => l.year != null ? `${l.leagueName} (${l.year})` : l.leagueName)
    : []

  const canSubmit = !!trimmed && seasonId !== '' && !creating && !existsInSelectedSeason

  const handleCreate = async () => {
    if (!canSubmit || !selectedSeason) return
    setCreating(true)
    setError(null)
    try {
      const team = await api.createLeagueTeam(selectedSeason.id, trimmed)
      toast.show(`'${team.name}' in ${selectedSeason.name} (${selectedSeason.year}) angelegt`)
      onCreated(selectedSeason)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <ResponsiveSheet
      open
      onClose={() => { if (!creating) onClose() }}
      title="Gegner anlegen"
      footer={
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={creating}
            className="font-display px-4 py-2 text-xs font-bold tracking-widest uppercase text-gray-600 rounded-lg hover:bg-cream-200 cursor-pointer disabled:opacity-50"
          >
            Abbrechen
          </button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!canSubmit}
            className="font-display text-xs font-extrabold tracking-widest uppercase hover:bg-softball-red-700"
          >
            {creating ? 'Anlegen…' : 'Anlegen'}
          </Button>
        </div>
      }
    >
      <div className="p-5 space-y-4">
        <div>
          <label htmlFor="create-team-name" className={labelCls}>Name</label>
          <input
            id="create-team-name"
            value={name}
            onChange={e => { setName(e.target.value); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="z. B. Aachen Aixplosives"
            className={inputCls}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="create-team-league" className={labelCls}>Liga</label>
          {sortedSeasons.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-1">
              Noch keine Liga vorhanden — erst auf dem Dashboard eine Saison anlegen.
            </p>
          ) : (
            <select
              id="create-team-league"
              value={seasonId}
              onChange={e => { setSeasonId(e.target.value ? Number(e.target.value) : ''); setError(null) }}
              className={selectCls}
            >
              {sortedSeasons.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.year}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-gray-400 mt-1.5">
            Ein Team gehört immer zu einer Liga — dieselben Gegner kannst du in weiteren Ligen zusätzlich anlegen.
          </p>
        </div>

        {existsInSelectedSeason && selectedSeason && (
          <p className="text-xs text-softball-red-700 bg-softball-red-50 border border-softball-red-100 rounded-lg px-3 py-2">
            In {selectedSeason.name} ({selectedSeason.year}) existiert bereits ein Team '{existingClub?.clubName}'.
          </p>
        )}
        {!existsInSelectedSeason && existingClub && otherLeaguesOfClub.length > 0 && (
          <p className="text-xs text-gray-600 bg-cream-100 border border-cream-200 rounded-lg px-3 py-2">
            '{existingClub.clubName}' ist schon in {otherLeaguesOfClub.join(', ')} aktiv —
            das neue Team wird dem bestehenden Club zugefügt (Bilanz und Historie laufen zusammen).
          </p>
        )}
        {error && (
          <p className="text-xs text-softball-red-700 bg-softball-red-50 border border-softball-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </ResponsiveSheet>
  )
}
