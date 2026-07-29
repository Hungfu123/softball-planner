import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Toast } from './Toast'
import type { Toast as ToastType } from '@/hooks/useToast'

// Punkt 4 des UX-Reviews: ResponsiveSheet portalt (vaul Drawer / CenterModal) nach
// document.body mit z-50 — ein Toast, der nur im Layout-Baum rendert, landet dahinter und ist
// während eines offenen Sheets unsichtbar. Fix: Toast selbst nach document.body portalen,
// mit höherem z-Index.
describe('Toast', () => {
  const toasts: ToastType[] = [{ id: 1, message: 'Testmeldung', type: 'error', duration: 5000 }]

  it('rendert außerhalb des lokalen Containers direkt in document.body', () => {
    const { container } = render(
      <div data-testid="app-root">
        <Toast toasts={toasts} onDismiss={vi.fn()} />
      </div>,
    )

    // Portal — nicht als Kind des lokalen Containers im DOM.
    expect(container.querySelector('[data-testid="app-root"]')?.textContent).not.toContain('Testmeldung')
    expect(document.body.textContent).toContain('Testmeldung')
  })

  it('liegt mit z-[60] über den z-50-Sheets (vaul Drawer / CenterModal)', () => {
    render(<Toast toasts={toasts} onDismiss={vi.fn()} />)

    const toastContainer = document.body.querySelector('.z-\\[60\\]')
    expect(toastContainer).toBeInTheDocument()
    expect(toastContainer?.textContent).toContain('Testmeldung')
  })
})
