import { useState, useEffect, useCallback } from 'react'
import { usePlayers } from '@/hooks/usePlayers'
import { useToastContext } from '@/components/layout/Layout'
import { getUnknownVoters, assignVoter, assignNewVoter, unassignVoter } from '@/api/client'
import { Card, SectionHeader, EmptyState, LoadingSkeleton, ConfirmModal, UnknownVoterRow } from '@/components/shared'
import { PlusCircle, CrossBones, XMark } from '@/icons'
import type { UnknownVoter, Player } from '@/types'

const labelCls = 'block text-xs font-bold uppercase tracking-wide text-navy-500 mb-1'

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function voterKey(v: UnknownVoter): string {
  return `${v.targetId}:${v.voterName}`
}

export function WhatsappVotersTab() {
  const { players, setWhatsappName, reload: reloadPlayers } = usePlayers()
  const toast = useToastContext()

  const [voters, setVoters] = useState<UnknownVoter[]>([])
  const [votersLoading, setVotersLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Player | null>(null)

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

  const handleAssign = async (voter: UnknownVoter, playerId: number) => {
    const key = voterKey(voter)
    setBusyKey(key)
    try {
      await assignVoter(voter.voterName, playerId)
      toast.show(`„${voter.voterName}" zugewiesen`)
      await Promise.all([loadVoters(), reloadPlayers()])
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      setBusyKey(null)
    }
  }

  const handleAssignNew = async (voter: UnknownVoter, playerName: string) => {
    const key = voterKey(voter)
    setBusyKey(key)
    try {
      await assignNewVoter(voter.voterName, playerName)
      toast.show(`${playerName} angelegt und zugewiesen`)
      await Promise.all([loadVoters(), reloadPlayers()])
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
      // Rethrow: UnknownVoterRow hält das NewPlayerModal bei Fehlschlag offen (Retry ohne erneutes Tippen).
      throw e
    } finally {
      setBusyKey(null)
    }
  }

  const handleDeleteAlias = async (playerId: number) => {
    try {
      await unassignVoter(playerId)
      toast.show('Alias gelöscht — Stimmen wieder unbekannt')
      await Promise.all([loadVoters(), reloadPlayers()])
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name))
  const withAlias = sortedPlayers.filter(p => p.whatsappName)
  const withoutAlias = sortedPlayers.filter(p => !p.whatsappName)

  return (
    <div className="space-y-4">
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
              const prefix = voter.source === 'GAME_DAY' ? 'Spieltag' : 'Training'
              const subline = voter.date ? `${prefix} ${formatDate(voter.date)}` : undefined
              return (
                <UnknownVoterRow
                  key={key}
                  voterName={voter.voterName}
                  subline={subline}
                  players={sortedPlayers}
                  busy={busyKey === key}
                  onAssign={playerId => handleAssign(voter, playerId)}
                  onCreate={playerName => handleAssignNew(voter, playerName)}
                />
              )
            })}
          </div>
        )}
      </Card>

      {/* Alias-Pflege */}
      <Card padding="md">
        <SectionHeader title="Alias-Pflege" />
        <p className="text-sm text-gray-500 mb-3">
          WhatsApp-Anzeigename je Spieler — für die automatische Zuordnung der Umfrage-Stimmen.
        </p>
        {sortedPlayers.length === 0 ? (
          <EmptyState title="Noch keine Spieler angelegt" icon={<CrossBones size={40} />} />
        ) : (
          <div className="space-y-4">
            {withAlias.length > 0 && (
              <div>
                <p className={labelCls}>Zugeordnet ({withAlias.length})</p>
                <div className="flex flex-wrap gap-2">
                  {withAlias.map(p => (
                    <span key={p.id} className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-navy-50 border border-navy-100 text-sm">
                      <span className="font-semibold text-navy-900">{p.name}</span>
                      <span className="text-navy-600/40">·</span>
                      <span className="text-navy-700 truncate max-w-[10rem]">{p.whatsappName}</span>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(p)}
                        title="Alias löschen — zugeordnete Stimmen werden wieder unbekannt"
                        aria-label={`Alias von ${p.name} löschen`}
                        className="ml-0.5 p-1 text-gray-400 hover:text-softball-red-600 rounded-full hover:bg-white cursor-pointer"
                      >
                        <XMark size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {withoutAlias.length > 0 && (
              <div>
                <p className={labelCls}>Ohne Alias ({withoutAlias.length})</p>
                <div className="flex flex-wrap gap-2">
                  {withoutAlias.map(p => assigningId === p.id ? (
                    <AliasInlineInput key={p.id} player={p} onSave={setWhatsappName} onDone={() => setAssigningId(null)} />
                  ) : (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setAssigningId(p.id)}
                      title={`WhatsApp-Alias für ${p.name} setzen`}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cream-100 border border-cream-300 text-sm text-navy-700 hover:border-navy-600 hover:bg-white cursor-pointer transition-colors"
                    >
                      {p.name}
                      <PlusCircle size={13} className="text-navy-600/50" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {pendingDelete && (
        <ConfirmModal
          title="Alias löschen?"
          message={`Der Alias „${pendingDelete.whatsappName}" von ${pendingDelete.name} wird entfernt. Bereits zugeordnete Umfrage-Stimmen werden wieder als „unbekannt" gelistet. Die Anwesenheit bleibt unberührt.`}
          confirmLabel="Alias löschen"
          onConfirm={() => { const id = pendingDelete.id; setPendingDelete(null); handleDeleteAlias(id) }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}

// Inline-Chip zum Setzen eines Alias für EINEN Spieler (on-demand, statt Dauerfeld je Zeile).
function AliasInlineInput({ player, onSave, onDone }: { player: Player; onSave: (id: number, whatsappName: string) => Promise<Player>; onDone: () => void }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToastContext()

  const commit = async () => {
    const trimmed = value.trim()
    if (!trimmed) { onDone(); return }
    setSaving(true)
    try {
      await onSave(player.id, trimmed)
      toast.show(`Alias für ${player.name} gespeichert`)
      onDone()
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
      setSaving(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-white border border-navy-600 text-sm">
      <span className="font-semibold text-navy-900">{player.name}</span>
      <span className="text-navy-600/40">·</span>
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') onDone()
        }}
        placeholder="WhatsApp-Name…"
        disabled={saving}
        className="w-32 bg-transparent text-navy-700 outline-none placeholder:text-navy-600/40 disabled:opacity-50"
      />
    </span>
  )
}
