import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResponsiveSheet } from './ResponsiveSheet'
import { ConfirmModal } from './ConfirmModal'

// Erzwingt den Desktop-Zweig (CenterModal) — der mobile Zweig nutzt vaul's Drawer.Portal
// und portalt bereits von sich aus, ist also nicht das, was dieser Test absichert.
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

describe('ResponsiveSheet', () => {
  it('portalt den Desktop-Dialog nach document.body — verschachteltes Sheet wird nicht vom overflow-hidden des äußeren Sheets abgeschnitten', () => {
    // Regression: rounded-2xl bekam overflow-hidden gegen randlosen Inhalt in der Ecke.
    // CenterModal rendert aber inline im React-Baum — ohne Portal wäre ein aus einem Sheet
    // heraus geöffnetes zweites Sheet (z.B. NewPlayerModal aus PollVoteSyncSheet/UnknownVoterRow)
    // ein DOM-Kind des äußeren Containers und würde auf dessen Box abgeschnitten.
    render(
      <div data-testid="app-root">
        <ResponsiveSheet open onClose={() => {}} title="Outer">
          <ResponsiveSheet open onClose={() => {}} title="Inner" nested>
            <p>inner content</p>
          </ResponsiveSheet>
        </ResponsiveSheet>
      </div>,
    )

    const dialogs = screen.getAllByRole('dialog')
    expect(dialogs).toHaveLength(2)

    for (const dialog of dialogs) {
      // dialog -> Box (dialogRef) -> Backdrop (fixed inset-0, CenterModals äußeres motion.div).
      // Der Backdrop muss direktes Kind von document.body sein, sonst steckt er noch im
      // overflow-hidden-Container des jeweils anderen Sheets.
      const backdrop = dialog.parentElement
      expect(backdrop?.parentElement).toBe(document.body)
    }

    // Und explizit: keiner der beiden Dialoge ist Nachfahre des Render-Roots.
    const appRoot = screen.getByTestId('app-root')
    for (const dialog of dialogs) {
      expect(appRoot.contains(dialog)).toBe(false)
    }
  })

  it('ein bei offenem Sheet geöffnetes Modal liegt im Body NACH dem Sheet — wird also nicht davon überdeckt', () => {
    // Regression: seit das Sheet nach document.body portalt, liegt es hinter #root.
    // Ein Modal, das im React-Baum noch unter #root steckt, hat dieselbe z-50 —
    // bei gleichem z-index im selben Stacking-Context gewinnt das spätere Body-Kind,
    // also das Sheet. Das Modal wäre unsichtbar dahinter (BogenSlotEditModal aus dem
    // Spielbogen-Drawer, ConfirmModal aus dem PeriodManagerDrawer).
    const view = render(
      <div data-testid="app-root">
        <ResponsiveSheet open onClose={() => {}} title="Sheet">
          <p>Sheet-Inhalt</p>
        </ResponsiveSheet>
      </div>,
    )

    // Modal öffnet erst, während das Sheet schon offen ist — wie beim Klick auf den Stift.
    view.rerender(
      <div data-testid="app-root">
        <ResponsiveSheet open onClose={() => {}} title="Sheet">
          <ConfirmModal
            title="Wirklich löschen?"
            message="Test"
            onConfirm={() => {}}
            onCancel={() => {}}
          />
        </ResponsiveSheet>
      </div>,
    )

    const confirmDialog = screen.getByRole('dialog', { name: 'Wirklich löschen?' })
    const sheetDialog = screen.getAllByRole('dialog').find(d => d !== confirmDialog)
    expect(sheetDialog).toBeDefined()

    // dialog -> Backdrop (fixed inset-0 z-50) -> muss direktes Body-Kind sein
    const confirmBackdrop = confirmDialog.parentElement
    const sheetBackdrop = sheetDialog!.parentElement
    expect(sheetBackdrop?.parentElement).toBe(document.body)
    expect(confirmBackdrop?.parentElement).toBe(document.body)

    const bodyChildren = Array.from(document.body.children)
    expect(bodyChildren.indexOf(confirmBackdrop!)).toBeGreaterThan(bodyChildren.indexOf(sheetBackdrop!))
  })
})
