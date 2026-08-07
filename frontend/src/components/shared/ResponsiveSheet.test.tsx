import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResponsiveSheet } from './ResponsiveSheet'

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
})
