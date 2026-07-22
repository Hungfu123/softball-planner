import { useState } from 'react'
import type { GameDayResponse } from '@/types'
import { XMark } from '@/icons'
import { Button } from '@/components/shared'
import * as api from '@/api/client'
import { useToastContext } from '@/components/layout/Layout'

interface Props {
  gameDay: GameDayResponse
  onSaved: (updated: GameDayResponse) => void
  onClose: () => void
}

export function EditGameDayModal({ gameDay, onSaved, onClose }: Props) {
  const [date, setDate] = useState(gameDay.date)
  const [label, setLabel] = useState(gameDay.label ?? '')
  const [location, setLocation] = useState(gameDay.location ?? '')
  const [numberOfGames, setNumberOfGames] = useState(gameDay.games.length)
  const [saving, setSaving] = useState(false)
  const toast = useToastContext()

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await api.updateGameDay(gameDay.id, {
        date,
        label: label.trim() || null,
        location: location.trim() || null,
        numberOfGames,
      })
      onSaved(updated)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const shrinking = numberOfGames < gameDay.games.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-cream-50 border border-cream-300 rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-300">
          <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide flex items-center gap-2">
            <span className="w-1 h-5 bg-softball-red-600 rounded-full shrink-0" />
            Spieltag bearbeiten
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <XMark size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-500 mb-1">Datum</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-500 mb-1">Label</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="z.B. Spieltag 1"
              className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-500 mb-1">Ort</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="z.B. Bottrop"
              className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-500 mb-1">Anzahl Spiele</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNumberOfGames(n => Math.max(1, n - 1))}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-cream-300 text-navy-700 font-bold text-lg hover:bg-cream-100 cursor-pointer"
              >−</button>
              <span className="w-12 text-center font-display text-lg font-bold text-navy-900 tabular-nums">{numberOfGames}</span>
              <button
                type="button"
                onClick={() => setNumberOfGames(n => Math.min(10, n + 1))}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-cream-300 text-navy-700 font-bold text-lg hover:bg-cream-100 cursor-pointer"
              >+</button>
              <span className="ml-2 text-xs text-navy-500">aktuell: {gameDay.games.length}</span>
            </div>
            {shrinking && (
              <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-300 rounded-md px-2 py-1.5">
                ⚠ Reduzieren entfernt Spiele {numberOfGames + 1}–{gameDay.games.length} inkl. Lineups. Nicht möglich wenn Scoring-Daten existieren.
              </p>
            )}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-cream-200 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <button
            onClick={handleSave}
            disabled={saving || !date}
            className="px-4 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-700 disabled:opacity-50"
          >
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
