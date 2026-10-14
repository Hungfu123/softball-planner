import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePlayers } from '@/hooks/usePlayers'
import * as api from '@/api/client'
import { useToastContext } from '@/components/layout/Layout'
import { PlusCircle, Pencil, TrashBin, CrossBones, GripHandle, ArchiveIcon, ArchiveRestoreIcon, ChevronRight } from '@/icons'
import { EmptyState, ConfirmModal, Button, ResponsiveSheet } from '@/components/shared'
import { PlayerManagerSkeleton } from './PlayerManagerSkeleton'
import { WhatsappVotersTab } from './WhatsappVotersTab'
import { PositionBadges } from './PositionBadges'
import type { Player } from '@/types'

function SortablePlayerRow({ player, index }: { player: Player; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 last:border-b-0 bg-white">
      <button
        {...attributes}
        {...listeners}
        aria-label="Reihenfolge ziehen"
        className="p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-navy-700 touch-none shrink-0"
      >
        <GripHandle size={16} />
      </button>
      <span className="text-sm font-semibold text-navy-500 tabular-nums w-6 text-center shrink-0">
        {index + 1}
      </span>
      <span className="flex-1 min-w-0 sm:flex-none sm:w-56 truncate text-navy-900 font-medium">{player.name}</span>
      {/* Gleiche Spaltenbreite wie im Kader — die Chips sollen auch hier untereinander stehen. */}
      <span className="hidden sm:flex w-44 shrink-0 items-center">
        <PositionBadges player={player} size="sm" />
      </span>
      <span className="sm:hidden shrink-0">
        <PositionBadges player={player} size="sm" />
      </span>
      <span className="hidden sm:block flex-1" aria-hidden="true" />
    </div>
  )
}

/**
 * Kader — eine Liste statt dreier Reiter.
 *
 * Die Schlagreihenfolge war früher ein eigener Tab, obwohl sie dieselben Spieler
 * in anderer Sortierung zeigt: jetzt ein Modus über derselben Liste. Die
 * WhatsApp-Zuordnung war der dritte Tab, betrifft aber nur Namen aus der Umfrage
 * — sie liegt jetzt in einem Sheet hinter einem Knopf. Was bleibt, ist der Kader:
 * eine Zeile je Spieler, Positionen sichtbar, Antippen öffnet das Profil.
 */
export function PlayerManager() {
  const { players, loading, create, update, remove, archive, unarchive, reorderBattingOrder } = usePlayers(true)
  const toast = useToastContext()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [deletePlayerId, setDeletePlayerId] = useState<number | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [orderMode, setOrderMode] = useState(() => searchParams.get('tab') === 'batting')
  const [whatsappOpen, setWhatsappOpen] = useState(() => searchParams.get('tab') === 'whatsapp')
  const [search, setSearch] = useState('')
  // Spielzahl je Spieler: gibt jeder Zeile einen Grund außer dem Namen und beantwortet
  // die Frage, die man im Kader am häufigsten hat — wer ist überhaupt regelmäßig dabei.
  const [gamesByPlayer, setGamesByPlayer] = useState<Map<number, number>>(new Map())

  useEffect(() => {
    let cancelled = false
    api.getAllTimeStats()
      .then(stats => {
        if (cancelled) return
        setGamesByPlayer(new Map(stats.map(s => [s.playerId, s.totalGames])))
      })
      .catch(() => { /* Spielzahl ist Beiwerk — ohne sie bleibt die Liste benutzbar */ })
    return () => { cancelled = true }
  }, [])

  // Deep-Link bleibt bestehen (Training-Badge "unbekannte Wähler" → ?tab=whatsapp),
  // führt aber jetzt ins Sheet statt in einen Reiter.
  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'whatsapp') setWhatsappOpen(true)
    if (t === 'batting') setOrderMode(true)
  }, [searchParams])

  const closeWhatsapp = () => {
    setWhatsappOpen(false)
    if (searchParams.get('tab') === 'whatsapp') {
      const next = new URLSearchParams(searchParams)
      next.delete('tab')
      setSearchParams(next, { replace: true })
    }
  }

  // Local batting-order state (für Save/Cancel-Pattern)
  const [localBattingOrder, setLocalBattingOrder] = useState<number[]>([])
  const [battingSaving, setBattingSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  )

  // Archivierte Spieler: nicht in Batting-Reihenfolge, eigener Abschnitt unten
  const activePlayers = useMemo(() => players.filter(p => !p.archived), [players])
  const archivedPlayers = useMemo(() => players.filter(p => p.archived), [players])

  // Server-Order ableiten (defaultBattingOrder asc, dann alpha) — nur aktive Spieler
  const serverBattingOrder = useMemo(() => {
    return [...activePlayers]
      .sort((a, b) => {
        if (a.defaultBattingOrder != null && b.defaultBattingOrder != null)
          return a.defaultBattingOrder - b.defaultBattingOrder
        if (a.defaultBattingOrder != null) return -1
        if (b.defaultBattingOrder != null) return 1
        return a.name.localeCompare(b.name)
      })
      .map(p => p.id)
  }, [activePlayers])

  // Lokale Order initialisieren wenn Modus gewechselt oder Server-Daten neu
  useEffect(() => {
    setLocalBattingOrder(serverBattingOrder)
  }, [serverBattingOrder, orderMode])

  const orderedBattingPlayers = useMemo(() => {
    const map = new Map(players.map(p => [p.id, p]))
    return localBattingOrder.map(id => map.get(id)).filter((p): p is Player => !!p)
  }, [players, localBattingOrder])

  const battingDirty = useMemo(() => {
    if (localBattingOrder.length !== serverBattingOrder.length) return true
    return localBattingOrder.some((id, i) => id !== serverBattingOrder[i])
  }, [localBattingOrder, serverBattingOrder])

  const filteredPlayers = useMemo(() => {
    const sorted = [...activePlayers].sort((a, b) => a.name.localeCompare(b.name))
    if (!search.trim()) return sorted
    const q = search.toLowerCase()
    return sorted.filter(p => p.name.toLowerCase().includes(q))
  }, [activePlayers, search])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      await create(name)
      setNewName('')
      toast.show('Spieler erstellt')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleUpdate = async (id: number) => {
    const name = editName.trim()
    if (!name) return
    try {
      await update(id, { name })
      setEditingId(null)
      toast.show('Spieler aktualisiert')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleDelete = (id: number) => {
    setDeletePlayerId(id)
  }

  const confirmDeletePlayer = async () => {
    if (!deletePlayerId) return
    setDeletePlayerId(null)
    try {
      await remove(deletePlayerId)
      toast.show('Spieler gelöscht')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleArchive = async (id: number) => {
    try {
      await archive(id)
      toast.show('Spieler archiviert — verschwindet aus Lineups und Statistik, Historie bleibt erhalten')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleUnarchive = async (id: number) => {
    try {
      await unarchive(id)
      toast.show('Spieler reaktiviert')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = localBattingOrder.indexOf(active.id as number)
    const newIndex = localBattingOrder.indexOf(over.id as number)
    if (oldIndex === -1 || newIndex === -1) return
    setLocalBattingOrder(prev => {
      const next = [...prev]
      const [moved] = next.splice(oldIndex, 1)
      next.splice(newIndex, 0, moved)
      return next
    })
  }

  const handleBattingSave = async () => {
    setBattingSaving(true)
    try {
      await reorderBattingOrder(localBattingOrder)
      toast.show('Schlagreihenfolge gespeichert')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      setBattingSaving(false)
    }
  }

  const handleBattingCancel = () => {
    setLocalBattingOrder(serverBattingOrder)
  }

  if (loading) {
    return <PlayerManagerSkeleton />
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto p-4 space-y-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <h1 className="font-headline text-3xl font-extrabold text-navy-900 uppercase tracking-wide">
            Kader {players.length > 0 && <span className="text-navy-500 font-bold">({activePlayers.length})</span>}
          </h1>
          <div className="flex gap-1.5">
            <ModeButton active={orderMode} onClick={() => setOrderMode(v => !v)}>
              Schlagreihenfolge
            </ModeButton>
            <ModeButton active={whatsappOpen} onClick={() => setWhatsappOpen(true)}>
              WhatsApp-Namen
            </ModeButton>
          </div>
        </div>

        {orderMode ? (
          <p className="text-xs text-gray-500">
            Ziehen ändert die Reihenfolge, in der neue Lineups vorbelegt werden.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Neuer Spieler…"
                className="flex-1 border border-cream-300 rounded-lg px-4 py-2.5 text-sm text-navy-900 bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
              />
              <Button
                type="button"
                onClick={handleCreate}
                disabled={!newName.trim()}
                icon={<PlusCircle size={16} />}
                className="py-2.5"
              >
                Hinzufügen
              </Button>
            </div>
            {players.length > 6 && (
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Suchen…"
                className="w-full border border-cream-300 rounded-lg px-4 py-2 text-sm text-navy-900 bg-cream-100 focus:bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
              />
            )}
          </div>
        )}

        {activePlayers.length === 0 && archivedPlayers.length === 0 ? (
          <EmptyState
            title="Noch keine Spieler angelegt"
            description="Leg los!"
            icon={<CrossBones size={48} />}
          />
        ) : orderMode ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={localBattingOrder} strategy={verticalListSortingStrategy}>
              <div className="bg-white border border-cream-300 rounded-2xl overflow-hidden">
                {orderedBattingPlayers.map((p, i) => (
                  <SortablePlayerRow key={p.id} player={p} index={i} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="bg-white border border-cream-300 rounded-2xl overflow-hidden">
            {/* Spaltenköpfe statt einer erklärenden Zeile: sie beschriften die Spalte,
                in der die Chips tatsächlich stehen — sonst sind drei Kürzel nur drei
                Kürzel und die Rangfolge steht nirgends. */}
            <div className="flex items-stretch bg-cream-100 border-b border-cream-300 text-[11px] text-gray-500">
              <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-2">
                <span className="flex-1 min-w-0 sm:flex-none sm:w-56">Spieler</span>
                <span className="hidden sm:block w-44 shrink-0">
                  Positionen <span className="text-gray-400">1. · 2. · 3. Wahl</span>
                </span>
                <span className="hidden sm:block flex-1" aria-hidden="true" />
                <span className="w-14 text-right shrink-0">Spiele</span>
                <span className="w-4 shrink-0" aria-hidden="true" />
              </div>
              <div className="w-24 sm:w-28 shrink-0" aria-hidden="true" />
            </div>
            {filteredPlayers.length === 0 ? (
              <p className="text-center text-sm text-navy-400 italic py-6">Keine Treffer.</p>
            ) : (
              filteredPlayers.map(p => (
                <div key={p.id} className="flex items-stretch border-b border-cream-200 last:border-b-0 group transition-colors hover:bg-cream-100">
                  {editingId === p.id ? (
                    <div className="flex-1 px-4 py-3">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleUpdate(p.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        onBlur={() => handleUpdate(p.id)}
                        className="w-full border border-navy-600 rounded-lg px-3 py-1.5 text-sm ring-2 ring-navy-100 outline-none text-navy-900"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <Link
                      to={`/players/${p.id}`}
                      className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 outline-none focus-visible:bg-cream-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-600"
                    >
                      <span className="flex-1 min-w-0 sm:flex-none sm:w-56">
                        <span className="block truncate text-navy-900 font-medium">{p.name}</span>
                        {/* Am Handy ist für eine eigene Spalte kein Platz — dort rücken die
                            Chips unter den Namen statt ihn zu verdrängen. */}
                        <span className="sm:hidden mt-1 block">
                          <PositionBadges player={p} size="sm" />
                        </span>
                      </span>
                      <span className="hidden sm:flex w-44 shrink-0 items-center">
                        {p.primaryPosition
                          ? <PositionBadges player={p} size="sm" />
                          : <span className="text-gray-300">—</span>}
                      </span>
                      <span className="hidden sm:block flex-1" aria-hidden="true" />
                      {/* Striche statt Lücken: eine Zahlenspalte liest sich nur, wenn in
                          jeder Zeile etwas steht. */}
                      <span
                        className="w-14 shrink-0 text-right text-xs text-gray-400 tabular-nums"
                        title={gamesByPlayer.has(p.id) ? `${formatGames(gamesByPlayer.get(p.id) ?? 0)} Spiele` : 'Noch kein Spiel'}
                      >
                        {gamesByPlayer.has(p.id) ? formatGames(gamesByPlayer.get(p.id) ?? 0) : '–'}
                      </span>
                      <ChevronRight
                        size={16}
                        className="w-4 shrink-0 text-gray-300 transition-transform duration-150 group-hover:translate-x-0.5"
                      />
                    </Link>
                  )}
                  {/* Feste Breite, auch wenn die Knöpfe unsichtbar sind: sonst springt die
                      ganze Zeile beim Überfahren. */}
                  <div className="actions-reveal flex w-24 sm:w-28 shrink-0 items-center justify-end gap-0.5 sm:gap-1 pr-2">
                    <button
                      onClick={() => { setEditingId(p.id); setEditName(p.name) }}
                      aria-label={`${p.name} umbenennen`}
                      className="p-2 rounded-lg text-gray-400 hover:text-navy-800 hover:bg-navy-50 cursor-pointer"
                      title="Umbenennen"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleArchive(p.id)}
                      aria-label={`${p.name} archivieren`}
                      className="p-2 rounded-lg text-gray-400 hover:text-navy-800 hover:bg-navy-50 cursor-pointer"
                      title="Archivieren — ausblenden, Historie bleibt erhalten"
                    >
                      <ArchiveIcon size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      aria-label={`${p.name} löschen`}
                      className="p-2 rounded-lg text-gray-400 hover:text-softball-red-600 hover:bg-softball-red-50 cursor-pointer"
                      title="Löschen"
                    >
                      <TrashBin size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Archiv — ausgeschiedene Spieler, reaktivierbar */}
        {!orderMode && archivedPlayers.length > 0 && (
          <div className="bg-cream-100/60 border border-cream-300 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-cream-200/70 flex items-center gap-2">
              <ArchiveIcon size={14} className="text-navy-500" />
              <span className="font-display text-[11px] font-bold uppercase tracking-widest text-navy-600">
                Archiv ({archivedPlayers.length})
              </span>
              <span className="text-[11px] text-gray-500 ml-auto hidden sm:inline">
                Nicht in Lineups, Training oder Statistik — Historie bleibt erhalten
              </span>
            </div>
            {archivedPlayers.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 last:border-b-0 group bg-white/50">
                <Link to={`/players/${p.id}`} className="flex-1 min-w-0 text-navy-900/70 font-medium italic truncate hover:text-navy-900">
                  {p.name}
                </Link>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleUnarchive(p.id)}
                    aria-label={`${p.name} reaktivieren`}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide text-navy-700 bg-navy-50 hover:bg-navy-100 cursor-pointer inline-flex items-center gap-1.5"
                    title="Zurück ins Team"
                  >
                    <ArchiveRestoreIcon size={14} />
                    Reaktivieren
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    aria-label={`${p.name} endgültig löschen`}
                    className="p-2 rounded-lg text-gray-400 hover:text-softball-red-600 hover:bg-softball-red-50 cursor-pointer"
                    title="Endgültig löschen (nur möglich ohne Scoring-Daten)"
                  >
                    <TrashBin size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Batting Save/Cancel — sticky bottom */}
        {orderMode && battingDirty && (
          <div className="sticky bottom-4 grid grid-cols-[auto_1fr] gap-2 z-20">
            <button
              onClick={handleBattingCancel}
              disabled={battingSaving}
              className="px-4 py-3 text-sm font-semibold text-navy-700 bg-white border border-cream-300 rounded-xl hover:bg-cream-100 disabled:opacity-50 cursor-pointer shadow-lg"
            >
              Abbrechen
            </button>
            <Button
              variant="primary"
              onClick={handleBattingSave}
              disabled={battingSaving}
              className="py-3 rounded-xl font-semibold shadow-lg shadow-softball-red-600/20"
            >
              {battingSaving ? 'Speichern…' : 'Reihenfolge speichern'}
            </Button>
          </div>
        )}

        <ResponsiveSheet
          open={whatsappOpen}
          onClose={closeWhatsapp}
          title="WhatsApp-Namen zuordnen"
          maxWidth="xl"
        >
          <WhatsappVotersTab />
        </ResponsiveSheet>

        {deletePlayerId && (
          <ConfirmModal
            title="Spieler löschen"
            message={`${players.find(p => p.id === deletePlayerId)?.name ?? 'Spieler'} wirklich löschen? Spieler mit Scoring-Daten können nicht gelöscht werden — archiviere sie stattdessen.`}
            onConfirm={confirmDeletePlayer}
            onCancel={() => setDeletePlayerId(null)}
          />
        )}
      </div>
    </div>
  )
}

/** Spielzahlen sind gewichtet (EH und DH zählen halb) — halbe Spiele nicht als .0 zeigen. */
function formatGames(total: number): string {
  const rounded = Math.round(total * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/** Kopfzeilen-Knopf für die beiden Nebenaufgaben des Kaders. */
function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`font-display text-[11px] font-bold uppercase tracking-widest rounded-full px-3.5 py-2 cursor-pointer transition-colors active:scale-95 motion-reduce:active:scale-100 ${
        active ? 'bg-navy-800 text-white' : 'border border-cream-300 text-gray-600 hover:bg-navy-800 hover:text-white hover:border-navy-800'
      }`}
    >
      {children}
    </button>
  )
}
