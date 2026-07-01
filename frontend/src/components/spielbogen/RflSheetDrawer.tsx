import React, { useState } from 'react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import type {
  BogenSheetResponse,
  BogenSide,
  SpielbogenSlotResponse,
  SpielbogenAtBatResponse,
  SpielbogenStealingResponse,
  SpielbogenRunnerAdvanceResponse,
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
  runnerAdvances,
  inningRuns,
  onSlotUpdate,
}: {
  side: BogenSide
  slots: SpielbogenSlotResponse[]
  atBats: SpielbogenAtBatResponse[]
  stealings: SpielbogenStealingResponse[]
  runnerAdvances: SpielbogenRunnerAdvanceResponse[]
  inningRuns: Record<number, { home: number; away: number }>
  onSlotUpdate?: (slotId: number, req: UpdateSlotRequest) => Promise<void>
}) {
  const sideKey = side === 'HOME' ? 'home' : 'away'
  const sorted = [...slots].sort((a, b) => a.battingOrder - b.battingOrder)
  const cellMap = renderCells(atBats, stealings, runnerAdvances ?? [], slots)
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

  const { meta, homeLineup, awayLineup, homeAtBats, awayAtBats, stealingEvents, runnerAdvances, inningRuns } = sheet

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

  const footer = (isLive || isDone) ? (
    <div className="flex flex-wrap gap-2">
      {isLive && onEndGame && (
        <button
          onClick={() => { onClose(); onEndGame() }}
          className="flex-1 h-11 rounded-lg bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold cursor-pointer"
        >
          Spiel beenden
        </button>
      )}
      {isDone && onReopenGame && (
        <button
          onClick={() => { onClose(); onReopenGame() }}
          className="flex-1 h-11 rounded-lg border border-cream-300 text-navy-700 font-medium hover:bg-cream-100 cursor-pointer"
        >
          Spiel wieder öffnen
        </button>
      )}
      {isDone && (
        <button
          onClick={handlePdfExport}
          className="flex-1 h-11 rounded-lg border border-cream-300 text-navy-700 font-medium hover:bg-cream-100 cursor-pointer"
        >
          Als PDF exportieren
        </button>
      )}
      {canSendToLiga && (
        <button
          onClick={handleLigaSenden}
          disabled={ligaLoading}
          className="flex-1 h-11 rounded-lg bg-navy-800 hover:bg-navy-900 text-white font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {ligaLoading ? 'Sende…' : 'An Liga senden'}
        </button>
      )}
    </div>
  ) : undefined

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Spielbogen" maxWidth="xl" footer={footer}>
      <div className="px-4 py-2 border-b border-cream-200 shrink-0">
        <p className="font-body text-xs text-gray-600">
          {meta.homeTeamName} <span className="font-bold">{meta.homeRuns}</span>
          {' : '}
          <span className="font-bold">{meta.awayRuns}</span> {meta.awayTeamName}
        </p>

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

      <div>
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
            runnerAdvances={runnerAdvances ?? []}
            inningRuns={inningRuns}
            onSlotUpdate={onSlotUpdate}
          />
        )}
      </div>
    </ResponsiveSheet>
  )
}
