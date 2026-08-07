import { useMemo, useState } from 'react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import type { BogenSheetResponse, SpielbogenSlotResponse, UpdateSlotRequest } from '@/types'
import { generateSpielbogenPdf } from '@/utils/spielbogenPdfExport'
import { buildFeed } from '@/utils/bogenFeed'
import { BogenLiveFeed } from './BogenLiveFeed'
import { BogenLineupAccordion } from './BogenLineupAccordion'
import { BogenSlotEditModal } from './BogenSlotEditModal'
import { ShareLinkModal } from './ShareLinkModal'
import { Button } from '@/components/shared'
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
  /** Slot-Name des aktuellen Batters — optional, nur während LIVE sinnvoll. */
  currentBatterName?: string | null
}

export function BogenSheetDrawer({ open, onClose, sheet, onEndGame, onReopenGame, onReload, onSlotUpdate, currentBatterName }: Props) {
  const [ligaLoading, setLigaLoading] = useState(false)
  const [editingSlot, setEditingSlot] = useState<SpielbogenSlotResponse | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const toast = useToastContext()

  const {
    meta, homeLineup, awayLineup, homeAtBats, awayAtBats,
    stealingEvents, substitutions, inningRuns, homeTotals, awayTotals,
  } = sheet

  const feed = useMemo(() => buildFeed({
    homeLineup,
    awayLineup,
    homeAtBats,
    awayAtBats,
    stealingEvents,
    substitutions,
    inningRuns,
  }), [homeLineup, awayLineup, homeAtBats, awayAtBats, stealingEvents, substitutions, inningRuns])

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
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {isDone && onReopenGame && (
          <Button
            variant="secondary"
            onClick={() => { onClose(); onReopenGame() }}
            className="flex-1 h-11"
          >
            Spiel wieder öffnen
          </Button>
        )}
        {isDone && (
          <Button
            variant="secondary"
            onClick={handlePdfExport}
            className="flex-1 h-11"
          >
            Als PDF exportieren
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => setShowShareModal(true)}
          className="flex-1 h-11"
        >
          Link teilen
        </Button>
        {canSendToLiga && (
          <Button
            variant="navy"
            onClick={handleLigaSenden}
            disabled={ligaLoading}
            className="flex-1 h-11 font-bold"
          >
            {ligaLoading ? 'Sende…' : 'An Liga senden'}
          </Button>
        )}
      </div>
      {isLive && onEndGame && (
        <Button
          variant="primary"
          onClick={() => { onClose(); onEndGame() }}
          className="w-full h-11 font-bold"
        >
          Spiel beenden
        </Button>
      )}
    </div>
  ) : undefined

  return (
    <>
      <ResponsiveSheet open={open} onClose={onClose} title="Spielbogen" maxWidth="xl" footer={footer}>
        <BogenLiveFeed
          homeTeamName={meta.homeTeamName}
          awayTeamName={meta.awayTeamName}
          status={meta.status}
          currentInning={meta.currentInning}
          currentSide={meta.currentSide}
          homeRuns={meta.homeRuns}
          awayRuns={meta.awayRuns}
          inningRuns={inningRuns}
          homeTotals={homeTotals}
          awayTotals={awayTotals}
          feed={feed}
          currentBatterName={currentBatterName}
        />

        <BogenLineupAccordion
          homeLineup={homeLineup}
          awayLineup={awayLineup}
          homeTeamName={meta.homeTeamName}
          awayTeamName={meta.awayTeamName}
          onEditSlot={onSlotUpdate ? setEditingSlot : undefined}
        />
      </ResponsiveSheet>

      {/* Modals als Geschwister außerhalb der ResponsiveSheet-Children gerendert:
          deren CenterModal animiert mit transform und spannt so einen eigenen
          Stacking-Context auf, in dem nicht-portalte fixed-Kinder (Slot-Edit,
          Share-Link inkl. dessen ConfirmModal) unter einem später gemounteten
          Geschwister-Portal verschwinden können. */}
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

      <ShareLinkModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        bogenId={meta.id}
      />
    </>
  )
}
