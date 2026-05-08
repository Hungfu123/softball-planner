import React, { useState } from 'react'
import { Drawer } from 'vaul'
import type {
  BogenSheetResponse,
  BogenSide,
  SpielbogenSlotResponse,
  SpielbogenAtBatResponse,
  SpielbogenStealingResponse,
  UpdateSlotRequest,
} from '@/types'
import { renderCells, cellKey } from '@/utils/bogenSheetRenderer'
import { generateSpielbogenPdf } from '@/utils/spielbogenPdfExport'
import { DiamondCell } from './DiamondCell'
import { BogenSlotEditModal } from './BogenSlotEditModal'
import { Pencil } from '@/icons'
import * as api from '@/api/client'
import { useToastContext } from '@/components/layout/Layout'

interface Props {
  open: boolean
  onClose: () => void
  sheet: BogenSheetResponse
  onEndGame?: () => void
  onReopenGame?: () => void
  onReload?: () => void
  onSlotUpdate?: (slotId: number, req: UpdateSlotRequest) => Promise<void>
}

const MAX_INNINGS = 7

const BORDER = '2px solid #000000'
const HEADER_BORDER = '2px solid #ffffff'

const cellStyle: React.CSSProperties = { border: BORDER }
const headerCellStyle: React.CSSProperties = { border: HEADER_BORDER }
const firstCellStyle: React.CSSProperties = { border: BORDER }
const firstHeaderCellStyle: React.CSSProperties = { border: HEADER_BORDER }

function SideSheet({
  side,
  slots,
  atBats,
  stealings,
  inningRuns,
  onSlotUpdate,
}: {
  side: BogenSide
  slots: SpielbogenSlotResponse[]
  atBats: SpielbogenAtBatResponse[]
  stealings: SpielbogenStealingResponse[]
  inningRuns: Record<number, { home: number; away: number }>
  onSlotUpdate?: (slotId: number, req: UpdateSlotRequest) => Promise<void>
}) {
  const sideKey = side === 'HOME' ? 'home' : 'away'
  const sorted = [...slots].sort((a, b) => a.battingOrder - b.battingOrder)
  const cellMap = renderCells(atBats, stealings, [])
  const [editingSlot, setEditingSlot] = useState<SpielbogenSlotResponse | null>(null)

  const innings = Array.from({ length: MAX_INNINGS }, (_, i) => i + 1)

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-[11px] lg:text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-navy-800 text-white" style={{ borderTop: '1px solid #1e3a8a' }}>
              <th className="px-1 py-1.5 text-left font-display font-bold tracking-wide w-5 lg:w-10" style={firstHeaderCellStyle}>#</th>
              <th className="px-1 py-1.5 text-left font-display font-bold tracking-wide w-16 lg:w-40" style={headerCellStyle}>Name</th>
              <th className="px-1 py-1.5 text-left font-display font-bold tracking-wide w-7 lg:w-14" style={headerCellStyle}>Pos</th>
              {innings.map(i => (
                <th key={i} className="px-0.5 py-1.5 font-display font-bold text-center" style={headerCellStyle}>{i}</th>
              ))}
              {onSlotUpdate && (
                <th className="px-1 py-1.5 w-6" style={headerCellStyle}></th>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((slot) => (
              <tr key={slot.id} className="bg-white">
                <td className="px-1 py-0.5 font-display font-bold text-navy-700" style={firstCellStyle}>{slot.battingOrder}</td>
                <td className="px-1 py-0.5 font-body text-navy-900 truncate" style={cellStyle}>{slot.name}</td>
                <td className="px-1 py-0.5 font-display font-bold text-navy-500 uppercase" style={cellStyle}>{slot.position ?? '—'}</td>
                {innings.map(inning => {
                  const key = cellKey(side, slot.id, inning)
                  const cell = cellMap.get(key)
                  return (
                    <td key={inning} className="p-0 h-14 lg:h-20" style={cellStyle}>
                      <div className="w-full h-full">
                        <DiamondCell notation={cell} />
                      </div>
                    </td>
                  )
                })}
                {onSlotUpdate && (
                  <td className="p-0 text-center align-middle" style={cellStyle}>
                    <button
                      onClick={() => setEditingSlot(slot)}
                      className="p-1 text-gray-400 hover:text-navy-700 cursor-pointer"
                      aria-label="Slot bearbeiten"
                    >
                      <Pencil size={12} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-cream-100">
              <td colSpan={3} className="px-1 py-1.5 font-display font-bold text-navy-700 text-[11px] uppercase tracking-wide" style={cellStyle}>
                Runs
              </td>
              {innings.map(i => (
                <td key={i} className="text-center font-display font-bold text-navy-800 text-[11px] py-1.5" style={cellStyle}>
                  {inningRuns[i]?.[sideKey] ?? 0}
                </td>
              ))}
              {onSlotUpdate && <td style={cellStyle}></td>}
            </tr>
          </tfoot>
        </table>
      </div>
      {onSlotUpdate && (
        <BogenSlotEditModal
          open={editingSlot != null}
          onClose={() => setEditingSlot(null)}
          slot={editingSlot}
          onSubmit={async (slotId, req) => {
            await onSlotUpdate(slotId, req)
          }}
        />
      )}
    </>
  )
}

export function RflSheetDrawer({ open, onClose, sheet, onEndGame, onReopenGame, onReload, onSlotUpdate }: Props) {
  const [activeSide, setActiveSide] = useState<BogenSide>(sheet.meta.currentSide)
  const [ligaLoading, setLigaLoading] = useState(false)
  const toast = useToastContext()

  const { meta, homeLineup, awayLineup, homeAtBats, awayAtBats, stealingEvents, inningRuns } = sheet

  const slots = activeSide === 'HOME' ? homeLineup : awayLineup
  const atBats = activeSide === 'HOME' ? homeAtBats : awayAtBats

  const isLive = meta.status === 'LIVE'
  const isDone = meta.status === 'DONE'

  const canSendToLiga = isDone && meta.season != null && meta.leagueResultId == null

  const handleLigaSenden = async () => {
    setLigaLoading(true)
    try {
      await api.registerSpielbogenLeagueResult(meta.id)
      toast.show('Liga-Tabelle aktualisiert', 'success')
      onReload?.()
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setLigaLoading(false)
    }
  }

  const handlePdfExport = () => {
    generateSpielbogenPdf(sheet)
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl flex flex-col focus:outline-none"
          style={{ maxHeight: '95vh' }}
        >
          <Drawer.Title className="sr-only">Spielbogen</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 shrink-0" />

          {/* Header */}
          <div className="px-4 py-2 border-b border-cream-200 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display text-base font-extrabold text-navy-900 uppercase tracking-wide">
                Spielbogen
              </h2>
              <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Schließen">
                ✕
              </button>
            </div>
            <p className="font-body text-xs text-gray-600">
              {meta.homeTeamName} <span className="font-bold">{meta.homeRuns}</span>
              {' : '}
              <span className="font-bold">{meta.awayRuns}</span> {meta.awayTeamName}
            </p>

            {/* Side toggle */}
            <div className="mt-2 flex gap-1">
              {(['HOME', 'AWAY'] as BogenSide[]).map(s => (
                <button
                  key={s}
                  onClick={() => setActiveSide(s)}
                  className={`font-display px-4 py-1 text-xs font-bold tracking-widest rounded-full uppercase transition-colors cursor-pointer
                    ${activeSide === s
                      ? 'bg-navy-800 text-white'
                      : 'bg-white border border-cream-300 text-navy-600 hover:bg-cream-100'
                    }`}
                >
                  {s === 'HOME' ? 'Heim' : 'Gast'}
                </button>
              ))}
            </div>
          </div>

          {/* Sheet content */}
          <div className="flex-1 overflow-y-auto">
            {slots.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm font-body">
                Kein Lineup für diese Seite vorhanden.
              </div>
            ) : (
              <SideSheet
                side={activeSide}
                slots={slots}
                atBats={atBats}
                stealings={stealingEvents}
                inningRuns={inningRuns}
                onSlotUpdate={onSlotUpdate}
              />
            )}
          </div>

          {/* Footer actions */}
          {(isLive || isDone) && (
            <div className="px-4 py-3 border-t border-cream-200 shrink-0 flex flex-wrap gap-2"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
            >
              {isLive && onEndGame && (
                <button
                  onClick={() => { onClose(); onEndGame() }}
                  className="flex-1 py-2.5 font-display text-xs font-bold tracking-widest uppercase rounded-xl bg-softball-red-600 text-white hover:bg-softball-red-700 cursor-pointer transition-colors"
                >
                  Spiel beenden
                </button>
              )}
              {isDone && onReopenGame && (
                <button
                  onClick={() => { onClose(); onReopenGame() }}
                  className="flex-1 py-2.5 font-display text-xs font-bold tracking-widest uppercase rounded-xl border border-navy-700 text-navy-700 hover:bg-navy-50 cursor-pointer transition-colors"
                >
                  Spiel wieder öffnen
                </button>
              )}
              {isDone && (
                <button
                  onClick={handlePdfExport}
                  className="flex-1 py-2.5 font-display text-xs font-bold tracking-widest uppercase rounded-xl border border-navy-700 text-navy-700 hover:bg-navy-50 cursor-pointer transition-colors"
                >
                  Als PDF exportieren
                </button>
              )}
              {canSendToLiga && (
                <button
                  onClick={handleLigaSenden}
                  disabled={ligaLoading}
                  className="flex-1 py-2.5 font-display text-xs font-bold tracking-widest uppercase rounded-xl bg-navy-800 text-white hover:bg-navy-900 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ligaLoading ? 'Sende…' : 'An Liga senden'}
                </button>
              )}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
