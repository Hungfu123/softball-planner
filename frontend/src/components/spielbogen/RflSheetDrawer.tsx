import { useState } from 'react'
import { Drawer } from 'vaul'
import type {
  BogenSheetResponse,
  BogenSide,
  SpielbogenSlotResponse,
  SpielbogenAtBatResponse,
  SpielbogenStealingResponse,
} from '@/types'
import { renderCells, cellKey } from '@/utils/bogenSheetRenderer'
import { generateSpielbogenPdf } from '@/utils/spielbogenPdfExport'
import { DiamondCell } from './DiamondCell'
import * as api from '@/api/client'
import { useToastContext } from '@/components/layout/Layout'

/**
 * Computes the out-index (1, 2, 3) for each at-bat that results in an out,
 * grouped by side+inning and sorted by sequence.
 */
function computeOutIndices(atBats: SpielbogenAtBatResponse[]): Map<number, number> {
  const result = new Map<number, number>()
  const groups = new Map<string, SpielbogenAtBatResponse[]>()

  for (const ab of atBats) {
    const key = `${ab.side}|${ab.inning}`
    const arr = groups.get(key) ?? []
    arr.push(ab)
    groups.set(key, arr)
  }

  for (const arr of groups.values()) {
    const sorted = [...arr].sort((a, b) => a.sequence - b.sequence)
    let outs = 0
    for (const ab of sorted) {
      if (ab.isError) continue
      if (ab.result === 'STRIKEOUT') {
        outs += 1
        if (outs <= 3) result.set(ab.id, outs)
      } else if (ab.result === 'OUT') {
        if (ab.outType === 'DOUBLE_PLAY') {
          outs += 2
        } else if (ab.outType === 'TRIPLE_PLAY') {
          outs += 3
        } else {
          outs += 1
        }
        if (outs <= 3) result.set(ab.id, outs)
      }
    }
  }

  return result
}

interface Props {
  open: boolean
  onClose: () => void
  sheet: BogenSheetResponse
  onEndGame?: () => void
  onReopenGame?: () => void
  onReload?: () => void
}

const MAX_INNINGS = 7

function SideSheet({
  side,
  slots,
  atBats,
  stealings,
  inningRuns,
}: {
  side: BogenSide
  slots: SpielbogenSlotResponse[]
  atBats: SpielbogenAtBatResponse[]
  stealings: SpielbogenStealingResponse[]
  inningRuns: Record<number, { home: number; away: number }>
}) {
  const sideKey = side === 'HOME' ? 'home' : 'away'
  const sorted = [...slots].sort((a, b) => a.battingOrder - b.battingOrder)
  const cellMap = renderCells(atBats, stealings)
  const outIndexMap = computeOutIndices(atBats)

  const innings = Array.from({ length: MAX_INNINGS }, (_, i) => i + 1)

  const totalRuns = Object.values(inningRuns).reduce((sum, r) => sum + (r[sideKey] ?? 0), 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[460px] text-xs" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className="bg-navy-800 text-white">
            <th className="px-1.5 py-1.5 text-left font-display font-bold tracking-wide w-6 border border-navy-700">#</th>
            <th className="px-1.5 py-1.5 text-left font-display font-bold tracking-wide min-w-[90px] border border-navy-700">Name</th>
            <th className="px-1.5 py-1.5 text-left font-display font-bold tracking-wide w-10 border border-navy-700">Pos</th>
            {innings.map(i => (
              <th key={i} className="px-0.5 py-1.5 font-display font-bold text-center w-9 border border-navy-700">{i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((slot, rowIdx) => (
            <tr
              key={slot.id}
              className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-cream-50'}
            >
              <td className="px-1.5 py-0.5 font-display font-bold text-navy-700 border border-gray-400">{slot.battingOrder}</td>
              <td className="px-1.5 py-0.5 font-body text-navy-900 truncate max-w-[90px] border border-gray-400">{slot.name}</td>
              <td className="px-1.5 py-0.5 font-display font-bold text-navy-500 uppercase border border-gray-400">{slot.position ?? '—'}</td>
              {innings.map(inning => {
                const key = cellKey(side, slot.id, inning)
                const cell = cellMap.get(key)
                // Find the matching at-bat to get out-index
                const cellAtBat = atBats.find(ab => ab.slotId === slot.id && ab.inning === inning)
                const outIdx = cellAtBat ? (outIndexMap.get(cellAtBat.id) ?? null) : null
                return (
                  <td key={inning} style={{ border: '1px solid #6b7280' }} className="p-0 w-10 h-14">
                    <div className="w-10 h-14">
                      <DiamondCell notation={cell} outIndex={outIdx} />
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-cream-100">
            <td colSpan={3} className="px-1.5 py-1.5 font-display font-bold text-navy-700 text-xs uppercase tracking-wide border border-gray-400">
              Runs
            </td>
            {innings.map(i => (
              <td key={i} className="text-center font-display font-bold text-navy-800 text-xs py-1.5 border border-gray-400">
                {inningRuns[i]?.[sideKey] ?? 0}
              </td>
            ))}
            <td className="px-1.5 py-1.5 font-display font-extrabold text-navy-900 text-sm border border-gray-400">{totalRuns}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export function RflSheetDrawer({ open, onClose, sheet, onEndGame, onReopenGame, onReload }: Props) {
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
          style={{ maxHeight: '90vh' }}
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
