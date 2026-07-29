import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToastContext } from '@/components/layout/Layout'
import { useGameDayPollSync } from '@/hooks/useGameDayPollSync'
import { assignVoter, assignNewVoter } from '@/api/client'
import {
  ResponsiveSheet,
  Badge,
  Button,
  EmptyState,
  LoadingSkeleton,
  SectionHeader,
  CollapsibleSection,
  UnknownVoterRow,
} from '@/components/shared'
import { PlusMark, MinusMark, AlertCircle, CrossBones } from '@/icons'
import type { Player } from '@/types'

interface PollVoteSyncSheetProps {
  target: { type: 'GAME_DAY' | 'TRAINING'; id: number }
  players: Player[]
  onApplied: () => void | Promise<void>
  onClose: () => void
}

/**
 * Vorschau-Modal für WhatsApp-Stimmen eines Spieltags: zeigt Zugänge/Abgänge gegen die
 * aktuelle Anwesenheitsliste, Kaskaden-Warnungen pro Abgang und lässt unbekannte Wähler
 * inline zuordnen. Schreibt erst auf Knopfdruck (Übernehmen) — nie automatisch, weil
 * AvailabilityService.setAvailablePlayers beim Entfernen kaskadierend aufräumt.
 */
export function PollVoteSyncSheet({ target, players, onApplied, onClose }: PollVoteSyncSheetProps) {
  const { preview, loading, applying, error, reload, apply } = useGameDayPollSync(target.id)
  const toast = useToastContext()
  const navigate = useNavigate()
  const [busyVoter, setBusyVoter] = useState<string | null>(null)

  const addCount = preview?.toAdd.length ?? 0
  const removeCount = preview?.toRemove.length ?? 0
  const hasDelta = addCount + removeCount > 0

  const handleApply = async () => {
    try {
      await apply()
      toast.show(`Anwesenheit übernommen (+${addCount} / −${removeCount})`)
      await onApplied()
      onClose()
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleAssign = async (voterName: string, playerId: number) => {
    setBusyVoter(voterName)
    try {
      await assignVoter(voterName, playerId)
      await reload()
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      setBusyVoter(null)
    }
  }

  const handleCreate = async (voterName: string, playerName: string) => {
    setBusyVoter(voterName)
    try {
      await assignNewVoter(voterName, playerName)
      await reload()
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
      throw e
    } finally {
      setBusyVoter(null)
    }
  }

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="secondary"
        onClick={onClose}
        className="font-display px-4 py-2 text-xs font-bold tracking-widest uppercase"
      >
        Abbrechen
      </Button>
      <Button
        variant="navy"
        onClick={handleApply}
        disabled={!hasDelta || applying || loading || !!error}
        className="font-display px-4 py-2 text-xs font-extrabold tracking-widest uppercase"
      >
        {applying ? 'Übernehmen…' : hasDelta ? `Übernehmen (+${addCount} / −${removeCount})` : 'Übernehmen'}
      </Button>
    </div>
  )

  return (
    <ResponsiveSheet open onClose={onClose} title="WhatsApp-Stimmen übernehmen" maxWidth="xl" footer={footer}>
      {error ? (
        <div className="m-4 p-4 rounded-lg bg-softball-red-50 border border-softball-red-200">
          <div className="flex items-start gap-2 text-softball-red-700">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/orga/whatsapp')}
            className="mt-3 text-sm font-semibold text-navy-700 hover:text-navy-900 underline cursor-pointer"
          >
            Zur WhatsApp-Einrichtung
          </button>
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* 1. Bilanz */}
          <section>
            {loading ? (
              <LoadingSkeleton variant="list" rows={2} />
            ) : preview && (
              <div className="flex flex-wrap gap-2">
                <Badge color="emerald" ariaLabel={`${preview.yesCount} Spieler spielen`}>
                  {preview.yesCount} Spieler spielen
                </Badge>
                {preview.optionVoters.slice(1).map(o => (
                  <Badge key={o.option} color="gray">{o.option}: {o.voters.length}</Badge>
                ))}
              </div>
            )}
          </section>

          {!loading && preview && (
            <>
              {/* 2. Diff */}
              <section className="space-y-3">
                {preview.voteCount === 0 ? (
                  <EmptyState
                    title="Noch keine Stimmen"
                    description="Die Umfrage wurde gesendet, aber niemand hat abgestimmt."
                    icon={<CrossBones size={40} />}
                  />
                ) : !hasDelta ? (
                  <EmptyState
                    title="Anwesenheit ist aktuell"
                    description="Alle Ja-Stimmen sind schon übernommen."
                    icon={<CrossBones size={40} />}
                  />
                ) : (
                  <>
                    {preview.toAdd.length > 0 && (
                      <div className="space-y-1">
                        {preview.toAdd.map(p => (
                          <div
                            key={p.id}
                            className="flex flex-wrap items-baseline gap-x-2 border-l-4 border-emerald-500 bg-emerald-50/50 rounded-r-lg px-3 py-2"
                          >
                            <PlusMark size={14} className="text-emerald-600 shrink-0" />
                            <span className="text-sm font-semibold text-navy-900">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {preview.toRemove.length > 0 && (
                      <div className="space-y-1">
                        {preview.toRemove.map(p => (
                          <div
                            key={p.playerId}
                            className="border-l-4 border-softball-red-500 bg-softball-red-50/50 rounded-r-lg px-3 py-2"
                          >
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <MinusMark size={14} className="text-softball-red-600 shrink-0" />
                              <span className="text-sm font-semibold text-navy-900">{p.playerName}</span>
                            </div>
                            {p.warnings.map((w, i) => (
                              <p key={i} className="text-xs text-softball-red-700 flex items-start gap-1 mt-1">
                                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                                {w}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* 3. Unbekannte */}
              {preview.unknownVoters.length > 0 && (
                <section>
                  <SectionHeader title={`Unbekannte Wähler (${preview.unknownVoters.length})`} />
                  <div className="space-y-2">
                    {preview.unknownVoters.map(name => (
                      <UnknownVoterRow
                        key={name}
                        voterName={name}
                        players={players}
                        busy={busyVoter === name}
                        nestedDialog
                        onAssign={playerId => handleAssign(name, playerId)}
                        onCreate={playerName => handleCreate(name, playerName)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* 4. Optionen */}
              <CollapsibleSection title="Wer hat was gewählt">
                <div className="space-y-4">
                  {preview.optionVoters.map((o, i) => (
                    <div key={o.option}>
                      <p className="text-sm font-semibold text-navy-900 mb-1.5">
                        {o.option} ({o.voters.length})
                        {i === 0 && <span className="ml-2 text-xs font-normal text-gray-400">zählt als anwesend</span>}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {o.voters.map(v => (
                          <span
                            key={v}
                            className="inline-flex items-center px-3 py-1 rounded-full bg-navy-50 border border-navy-100 text-sm"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            </>
          )}
        </div>
      )}
    </ResponsiveSheet>
  )
}
