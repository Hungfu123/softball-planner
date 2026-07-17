import { useState, useEffect, useCallback } from 'react'
import { usePlayers } from '@/hooks/usePlayers'
import { useToastContext } from '@/components/layout/Layout'
import { getUnknownVoters, syncWhatsappVotes, assignVoter, assignNewVoter } from '@/api/client'
import { Card, SectionHeader, EmptyState, ResponsiveSheet, LoadingSkeleton } from '@/components/shared'
import { RefreshIcon, PlusCircle, CrossBones } from '@/icons'
import type { UnknownVoter, Player } from '@/types'

const inputCls =
  'w-full border border-cream-300 rounded-lg px-3 py-2 text-sm text-navy-900 bg-cream-100 focus:bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none'
const labelCls = 'block text-xs font-bold uppercase tracking-wide text-navy-500 mb-1'

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function voterKey(v: UnknownVoter): string {
  return `${v.trainingId}:${v.voterName}`
}

export function WhatsappVotersTab() {
  const { players, setWhatsappName } = usePlayers()
  const toast = useToastContext()

  const [voters, setVoters] = useState<UnknownVoter[]>([])
  const [votersLoading, setVotersLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Record<string, string>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [newPlayerVoter, setNewPlayerVoter] = useState<UnknownVoter | null>(null)

  const loadVoters = useCallback(async () => {
    setVotersLoading(true)
    try {
      const data = await getUnknownVoters()
      setVoters(data)
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      setVotersLoading(false)
    }
  }, [toast])

  useEffect(() => { loadVoters() }, [loadVoters])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await syncWhatsappVotes()
      toast.show(`${result.synced} Stimmen gesynct`)
      await loadVoters()
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleAssign = async (voter: UnknownVoter) => {
    const key = voterKey(voter)
    const playerId = Number(selectedPlayer[key])
    if (!playerId) return
    setBusyKey(key)
    try {
      await assignVoter(voter.voterName, playerId)
      toast.show(`„${voter.voterName}" zugewiesen`)
      await loadVoters()
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      setBusyKey(null)
    }
  }

  const handleAssignNew = async (playerName: string) => {
    if (!newPlayerVoter) return
    const voter = newPlayerVoter
    const key = voterKey(voter)
    setBusyKey(key)
    try {
      await assignNewVoter(voter.voterName, playerName)
      toast.show(`${playerName} angelegt und zugewiesen`)
      setNewPlayerVoter(null)
      await loadVoters()
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      setBusyKey(null)
    }
  }

  const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-4">
      {/* Test-Sync */}
      <Card padding="md">
        <SectionHeader title="Test-Sync" />
        <p className="text-sm text-gray-500 mb-3">
          Umfrage-Stimmen manuell mit der Trainings-Anwesenheit abgleichen — normalerweise läuft das automatisch.
        </p>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 bg-navy-800 hover:bg-navy-900 text-white font-bold px-4 py-2.5 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshIcon size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncen…' : 'Jetzt syncen'}
        </button>
      </Card>

      {/* Unbekannte Wähler */}
      <Card padding="md">
        <SectionHeader title={<>Unbekannte Wähler {voters.length > 0 && <span className="text-navy-500 font-bold">({voters.length})</span>}</>} />
        {votersLoading ? (
          <LoadingSkeleton variant="list" rows={2} />
        ) : voters.length === 0 ? (
          <EmptyState
            title="Keine unbekannten Wähler"
            description="Alle Umfrage-Stimmen sind Spielern zugeordnet."
            icon={<CrossBones size={40} />}
          />
        ) : (
          <div className="space-y-2">
            {voters.map(voter => {
              const key = voterKey(voter)
              const busy = busyKey === key
              return (
                <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2.5 border border-cream-300 rounded-lg bg-cream-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-900 truncate">{voter.voterName}</p>
                    <p className="text-xs text-gray-500">{formatDate(voter.trainingDate)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={selectedPlayer[key] ?? ''}
                      onChange={e => setSelectedPlayer(prev => ({ ...prev, [key]: e.target.value }))}
                      disabled={busy}
                      className="border border-cream-300 rounded-lg px-2 py-1.5 text-sm text-navy-900 bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none disabled:opacity-50"
                    >
                      <option value="">Spieler wählen…</option>
                      {sortedPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAssign(voter)}
                      disabled={!selectedPlayer[key] || busy}
                      className="px-3 py-1.5 text-sm font-semibold text-white bg-softball-red-600 rounded-lg hover:bg-softball-red-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Zuweisen
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPlayerVoter(voter)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-navy-700 bg-white border border-navy-200 rounded-lg hover:bg-navy-800 hover:text-white hover:border-navy-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PlusCircle size={14} /> Neuer Spieler
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Alias-Pflege */}
      <Card padding="md">
        <SectionHeader title="Alias-Pflege" />
        <p className="text-sm text-gray-500 mb-3">
          WhatsApp-Anzeigename je Spieler hinterlegen — wird für die automatische Zuordnung der Umfrage-Stimmen genutzt.
        </p>
        {sortedPlayers.length === 0 ? (
          <EmptyState title="Noch keine Spieler angelegt" icon={<CrossBones size={40} />} />
        ) : (
          <div className="divide-y divide-cream-200 border border-cream-300 rounded-lg overflow-hidden">
            {sortedPlayers.map(p => (
              <AliasRow key={p.id} player={p} onSave={setWhatsappName} />
            ))}
          </div>
        )}
      </Card>

      {newPlayerVoter && (
        <NewPlayerModal
          voterName={newPlayerVoter.voterName}
          onCancel={() => setNewPlayerVoter(null)}
          onConfirm={handleAssignNew}
        />
      )}
    </div>
  )
}

function AliasRow({ player, onSave }: { player: Player; onSave: (id: number, whatsappName: string) => Promise<Player> }) {
  const [value, setValue] = useState(player.whatsappName ?? '')
  const [saving, setSaving] = useState(false)
  const toast = useToastContext()

  useEffect(() => { setValue(player.whatsappName ?? '') }, [player.whatsappName])

  const handleBlur = async () => {
    const trimmed = value.trim()
    if (trimmed === (player.whatsappName ?? '')) return
    setSaving(true)
    try {
      await onSave(player.id, trimmed)
      toast.show('Alias gespeichert')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
      setValue(player.whatsappName ?? '')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-white">
      <span className="flex-1 text-sm font-medium text-navy-900 truncate">{player.name}</span>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        placeholder="WhatsApp-Name…"
        disabled={saving}
        className="cursor-pencil w-44 sm:w-56 border border-cream-300 rounded-lg px-3 py-1.5 text-sm text-navy-900 bg-cream-100 focus:bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none disabled:opacity-60 shrink-0"
      />
    </div>
  )
}

function NewPlayerModal({ voterName, onCancel, onConfirm }: { voterName: string; onCancel: () => void; onConfirm: (name: string) => void }) {
  const [name, setName] = useState(voterName)

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm font-semibold text-navy-700 bg-white border border-cream-300 rounded-lg hover:bg-navy-800 hover:text-white hover:border-navy-800 cursor-pointer transition-colors"
      >
        Abbrechen
      </button>
      <button
        type="button"
        onClick={() => onConfirm(name.trim())}
        disabled={!name.trim()}
        className="px-4 py-2 text-sm font-semibold text-white bg-softball-red-600 rounded-lg hover:bg-softball-red-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        Anlegen
      </button>
    </div>
  )

  return (
    <ResponsiveSheet open onClose={onCancel} title="Neuer Spieler" maxWidth="sm" footer={footer}>
      <div className="p-5 space-y-3">
        <p className="text-sm text-gray-500">
          Legt einen neuen Spieler an und ordnet den WhatsApp-Wähler „{voterName}" zu.
        </p>
        <div>
          <label className={labelCls}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} autoFocus className={inputCls} />
        </div>
      </div>
    </ResponsiveSheet>
  )
}
