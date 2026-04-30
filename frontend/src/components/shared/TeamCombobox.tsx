import { useState, useEffect, useRef } from 'react'
import type { LeagueTeamResponse } from '@/types'
import * as api from '@/api/client'

interface Props {
  /** Saison-Kontext zum Erstellen neuer Teams. */
  seasonId: number
  /** Verfügbare Teams. ownTeam wird intern ausgefiltert. */
  teams: LeagueTeamResponse[]
  /** Aktuelle Auswahl (oder null). */
  selected: LeagueTeamResponse | null
  /** Trigger-Button-Variante. 'button' = vollformatiger Button mit Placeholder, 'inline' = nur Popover öffnen via externe UI. */
  variant?: 'button' | 'inline'
  /** Placeholder im Button (variant='button'). */
  placeholder?: string
  /** Wenn true: zusätzlicher "Auswahl entfernen"-Item. */
  clearable?: boolean
  /** Wenn true: Popover sucht automatisch optimale Richtung (oben/unten). */
  autoFlip?: boolean
  /** Manuelle Open-Steuerung — wenn nicht gesetzt, intern. */
  open?: boolean
  /** Wird gerufen wenn Open-State sich ändern soll (manuelle Variante). */
  onOpenChange?: (open: boolean) => void
  onSelect: (team: LeagueTeamResponse | null) => void
  /** Wird gerufen wenn neues Team erstellt wurde (Liste sollte refresh) */
  onTeamCreated?: (team: LeagueTeamResponse) => void
}

/**
 * Shared Team-Combobox: Suchen + Erstellen.
 * Wird von Standings (variant='button') + GameTabs (variant='inline') genutzt.
 */
export function TeamCombobox({
  seasonId, teams, selected, variant = 'button', placeholder = 'Team',
  clearable = true, autoFlip = false,
  open: openProp, onOpenChange, onSelect, onTeamCreated,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp != null ? openProp : internalOpen
  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next)
    else setInternalOpen(next)
  }

  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    if (autoFlip && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setOpenUp(rect.bottom + 250 > window.innerHeight)
    }
  }, [open, autoFlip])

  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) && !t.ownTeam,
  )
  const exactMatch = teams.some(t => t.name.toLowerCase() === search.trim().toLowerCase())
  const showCreate = search.trim().length > 0 && !exactMatch

  const handleCreate = async () => {
    if (creating || !search.trim()) return
    setCreating(true)
    try {
      const team = await api.createLeagueTeam(seasonId, search.trim())
      onSelect(team)
      onTeamCreated?.(team)
      setOpen(false)
      setSearch('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      {variant === 'button' && (
        <button
          onClick={() => { setOpen(!open); setSearch('') }}
          className={`border border-cream-300 rounded-lg px-2.5 py-1.5 text-sm outline-none min-w-[100px] text-left cursor-pointer hover:border-cream-300 ${
            selected ? 'text-gray-900' : 'text-gray-400'
          }`}
        >
          {selected ? selected.name : placeholder}
        </button>
      )}

      {open && (
        <div className={`absolute left-0 z-50 bg-cream-50 border border-cream-300 rounded-lg shadow-lg w-56 ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          <div className="p-2">
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && showCreate) handleCreate()
                if (e.key === 'Enter' && filtered.length === 1) {
                  onSelect(filtered[0])
                  setOpen(false)
                  setSearch('')
                }
                if (e.key === 'Escape') setOpen(false)
              }}
              placeholder="Suchen oder erstellen..."
              className="w-full border border-cream-300 rounded px-2.5 py-1.5 text-sm outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-100"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {clearable && selected && (
              <button
                onClick={() => { onSelect(null); setOpen(false); setSearch('') }}
                className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-cream-100 cursor-pointer"
              >
                Auswahl entfernen
              </button>
            )}
            {filtered.map(team => (
              <button
                key={team.id}
                onClick={() => { onSelect(team); setOpen(false); setSearch('') }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-navy-50 cursor-pointer ${
                  selected?.id === team.id ? 'bg-navy-50 text-navy-700 font-medium' : 'text-gray-900'
                }`}
              >
                {team.name}
              </button>
            ))}
            {filtered.length === 0 && !showCreate && (
              <div className="px-3 py-2 text-xs text-gray-400">Keine Teams gefunden</div>
            )}
            {!showCreate && search.trim().length === 0 && filtered.length > 0 && (
              <div className="px-3 py-2 text-[11px] text-gray-400 border-t border-cream-200">
                Name eingeben um neues Team zu erstellen
              </div>
            )}
            {showCreate && (
              <>
                {filtered.length > 0 && <div className="border-t border-cream-200" />}
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full text-left px-3 py-2 text-sm text-navy-600 hover:bg-navy-50 font-medium cursor-pointer disabled:opacity-50"
                >
                  + „{search.trim()}" erstellen
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
