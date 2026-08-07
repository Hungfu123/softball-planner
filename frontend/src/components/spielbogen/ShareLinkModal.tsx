import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { Button } from '@/components/shared'
import { useToastContext } from '@/components/layout/Layout'
import * as api from '@/api/client'

interface Props {
  open: boolean
  onClose: () => void
  bogenId: number
}

/** Öffnet sich aus dem Spielbogen-Drawer heraus — braucht `nested`, sonst bricht das mobile Bottom-Sheet. */
export function ShareLinkModal({ open, onClose, bogenId }: Props) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)
  const toast = useToastContext()

  useEffect(() => {
    if (!open) return
    setToken(null)
    setLoading(true)
    api.createShareLink(bogenId)
      .then(res => setToken(res.token))
      .catch(e => toast.show((e as Error).message, 'error'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bogenId])

  const url = token != null ? `${window.location.origin}/live/${token}` : null

  const handleCopy = async () => {
    if (!url) return
    await navigator.clipboard.writeText(url)
    toast.show('Link kopiert', 'success')
  }

  const handleRevoke = async () => {
    setShowRevokeConfirm(false)
    try {
      await api.revokeShareLink(bogenId)
      toast.show('Link zurückgezogen', 'success')
      onClose()
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  return (
    <>
      <ResponsiveSheet open={open} onClose={onClose} title="Link teilen" maxWidth="sm" nested>
        <div className="p-5 space-y-4">
          <p className="font-body text-xs text-gray-600">
            Jeder mit diesem Link sieht den Spielstand und beide Aufstellungen — auch ohne Login.
          </p>

          {loading && (
            <p className="font-body text-sm text-gray-500">Link wird erstellt…</p>
          )}

          {url && (
            <>
              <div className="rounded-lg border border-cream-300 bg-cream-50 px-3 py-2">
                <span className="block truncate font-mono text-xs text-navy-900">{url}</span>
              </div>

              <Button variant="navy" onClick={handleCopy} className="w-full h-11 font-bold">
                Kopieren
              </Button>

              <Button
                variant="danger"
                onClick={() => setShowRevokeConfirm(true)}
                className="w-full h-11"
              >
                Link zurückziehen
              </Button>
            </>
          )}
        </div>
      </ResponsiveSheet>

      {/* Portal statt direktem Render: ConfirmModal ist selbst nicht portalt, würde also
          im DOM unter dem hier bereits offenen ResponsiveSheet-Portal landen und dessen
          Backdrop könnte Klicks abfangen. Als eigener, später gemounteter body-Portal
          liegt es zuverlässig darüber. */}
      {showRevokeConfirm && createPortal(
        <ConfirmModal
          title="Link zurückziehen?"
          message="Der bisherige Link funktioniert danach nicht mehr — wer ihn geöffnet hatte, kann das Spiel nicht mehr live verfolgen."
          confirmLabel="Zurückziehen"
          onConfirm={handleRevoke}
          onCancel={() => setShowRevokeConfirm(false)}
        />,
        document.body,
      )}
    </>
  )
}
