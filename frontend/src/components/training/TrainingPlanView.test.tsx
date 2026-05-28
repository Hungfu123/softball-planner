import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TrainingPlanView } from './TrainingPlanView'
import type { TrainingPlanContentResponse, TrainingPlanResponse, PlanKind } from '@/types'

const mkSection = (overrides: Partial<TrainingPlanContentResponse['sections'][0]> = {}) => ({
  drillId: null,
  sectionType: 'DRILL',
  title: 'Drill A',
  durationMinutes: 20,
  rounds: null,
  adaptationNotes: null,
  rotationPlan: null,
  setupNotes: null,
  tips: null,
  groupSetup: null,
  userNotes: null,
  parallelGroup: null,
  playersPerGroup: null,
  ...overrides,
})

const mkPlan = (
  content: TrainingPlanContentResponse | null,
  kind: PlanKind = 'MAIN',
  id = 1,
): TrainingPlanResponse => ({
  id,
  trainingId: 1,
  kind,
  playerCount: 12,
  focus: 'WERFEN',
  durationMinutes: 90,
  content,
  createdAt: '2025-01-01T00:00:00',
  updatedAt: '2025-01-01T00:00:00',
})

const noops = {
  onEdit: vi.fn(),
  onRegenerate: vi.fn(),
  onDelete: vi.fn(),
  onShare: vi.fn(),
  onSwitchKind: vi.fn(),
  drills: [],
  activePlanKind: 'MAIN' as PlanKind,
}

describe('TrainingPlanView', () => {
  it('zeigt Empty-State wenn kein Plan', () => {
    render(<TrainingPlanView plans={[]} {...noops} />)
    expect(screen.getByText(/Noch kein Plan/i)).toBeInTheDocument()
  })

  it('zeigt Empty-State bei leeren Sections', () => {
    render(<TrainingPlanView plans={[mkPlan({ sections: [], groupDistributionHint: null, overallNotes: null })]} {...noops} />)
    expect(screen.getByText(/Noch kein Plan/i)).toBeInTheDocument()
  })

  it('zeigt Generieren-Button wenn kein Plan', () => {
    const onRegenerate = vi.fn()
    render(<TrainingPlanView plans={[]} drills={[]} onEdit={vi.fn()} onRegenerate={onRegenerate} onDelete={vi.fn()} onShare={vi.fn()} onSwitchKind={vi.fn()} activePlanKind="MAIN" />)
    fireEvent.click(screen.getByRole('button', { name: /Plan generieren/i }))
    expect(onRegenerate).toHaveBeenCalled()
  })

  it('rendert Section-Titel + Dauer', () => {
    const plan = mkPlan({
      sections: [
        mkSection({ sectionType: 'WARMUP', title: 'Aufwärmroutine Dead Sox', durationMinutes: 30 }),
        mkSection({ sectionType: 'DRILL', title: 'Wurf-Drill', durationMinutes: 25 }),
      ],
      groupDistributionHint: null,
      overallNotes: null,
    })
    render(<TrainingPlanView plans={[plan]} {...noops} />)
    expect(screen.getByText('Aufwärmroutine Dead Sox')).toBeInTheDocument()
    expect(screen.getByText('Wurf-Drill')).toBeInTheDocument()
    expect(screen.getByText('30 min')).toBeInTheDocument()
    expect(screen.getByText('25 min')).toBeInTheDocument()
  })

  it('zeigt Header mit Gesamtdauer formatiert (h + min)', () => {
    const plan = mkPlan({
      sections: [
        mkSection({ durationMinutes: 30 }),
        mkSection({ durationMinutes: 45 }),
        mkSection({ durationMinutes: 30 }),
      ],
      groupDistributionHint: null,
      overallNotes: null,
    })
    render(<TrainingPlanView plans={[plan]} {...noops} />)
    expect(screen.getByText(/1 h 45 min · 3 Blöcke/)).toBeInTheDocument()
  })

  it('expandiert Section bei Klick → zeigt Details', () => {
    const plan = mkPlan({
      sections: Array.from({ length: 6 }, (_, i) =>
        mkSection({ title: `Section ${i}`, durationMinutes: 10, tips: i === 0 ? 'Auf Footwork achten' : null }),
      ),
      groupDistributionHint: null,
      overallNotes: null,
    })
    render(<TrainingPlanView plans={[plan]} {...noops} />)
    expect(screen.queryByText('Auf Footwork achten')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Section 0/i }))
    expect(screen.getByText('Auf Footwork achten')).toBeInTheDocument()
  })

  it('3-Dot-Menu öffnet + zeigt Bearbeiten/Neu generieren/Löschen', () => {
    const onEdit = vi.fn()
    const onRegenerate = vi.fn()
    const onDelete = vi.fn()
    const plan = mkPlan({
      sections: [mkSection({ title: 'Drill A', durationMinutes: 20 })],
      groupDistributionHint: null,
      overallNotes: null,
    })
    render(<TrainingPlanView plans={[plan]} drills={[]} onEdit={onEdit} onRegenerate={onRegenerate} onDelete={onDelete} onShare={vi.fn()} onSwitchKind={vi.fn()} activePlanKind="MAIN" />)
    fireEvent.click(screen.getByRole('button', { name: /Plan-Aktionen/i }))
    fireEvent.click(screen.getByText('Bearbeiten'))
    expect(onEdit).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Plan-Aktionen/i }))
    fireEvent.click(screen.getByText('Neu generieren'))
    expect(onRegenerate).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Plan-Aktionen/i }))
    fireEvent.click(screen.getByText('Löschen'))
    expect(onDelete).toHaveBeenCalled()
  })

  it('zeigt overallNotes wenn vorhanden', () => {
    const plan = mkPlan({
      sections: [mkSection({ title: 'Drill A', durationMinutes: 20 })],
      groupDistributionHint: null,
      overallNotes: 'Heute Fokus auf Defense',
    })
    render(<TrainingPlanView plans={[plan]} {...noops} />)
    expect(screen.getByText('Heute Fokus auf Defense')).toBeInTheDocument()
  })

  it('rendert kein JSON-Raw mehr', () => {
    const plan = mkPlan({
      sections: [mkSection({ title: 'Drill A', durationMinutes: 20 })],
      groupDistributionHint: null,
      overallNotes: null,
    })
    const { container } = render(<TrainingPlanView plans={[plan]} {...noops} />)
    expect(container.querySelector('pre')).not.toBeInTheDocument()
  })

  it('zeigt Tab-Switcher Hauptgruppe/Anfänger wenn 2 Pläne existieren', () => {
    const mainPlan = mkPlan({
      sections: [mkSection({ title: 'Main Drill', durationMinutes: 20 })],
      groupDistributionHint: null,
      overallNotes: null,
    }, 'MAIN', 1)
    const beginnerPlan = mkPlan({
      sections: [mkSection({ title: 'Beginner Drill', durationMinutes: 20 })],
      groupDistributionHint: null,
      overallNotes: null,
    }, 'BEGINNER', 2)
    render(<TrainingPlanView plans={[mainPlan, beginnerPlan]} {...noops} />)
    expect(screen.getByRole('tab', { name: /Hauptgruppe/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Anfänger/i })).toBeInTheDocument()
    expect(screen.getByText('Main Drill')).toBeInTheDocument()
  })

  it('zeigt KEINEN Tab-Switcher wenn nur 1 Plan', () => {
    const plan = mkPlan({
      sections: [mkSection({ title: 'Drill A', durationMinutes: 20 })],
      groupDistributionHint: null,
      overallNotes: null,
    })
    render(<TrainingPlanView plans={[plan]} {...noops} />)
    expect(screen.queryByRole('tab', { name: /Hauptgruppe/i })).not.toBeInTheDocument()
  })

  it('switch-kind callback wird beim Klick auf Anfänger-Tab gefeuert', () => {
    const onSwitchKind = vi.fn()
    const mainPlan = mkPlan({ sections: [mkSection()], groupDistributionHint: null, overallNotes: null }, 'MAIN', 1)
    const beginnerPlan = mkPlan({ sections: [mkSection()], groupDistributionHint: null, overallNotes: null }, 'BEGINNER', 2)
    render(<TrainingPlanView plans={[mainPlan, beginnerPlan]} {...noops} onSwitchKind={onSwitchKind} />)
    fireEvent.click(screen.getByRole('tab', { name: /Anfänger/i }))
    expect(onSwitchKind).toHaveBeenCalledWith('BEGINNER')
  })

  it('zeigt "Separater Anfänger-Plan" im Menu wenn nur MAIN existiert', () => {
    const onGenerateBeginnerPlan = vi.fn()
    const plan = mkPlan({ sections: [mkSection()], groupDistributionHint: null, overallNotes: null }, 'MAIN', 1)
    render(<TrainingPlanView plans={[plan]} {...noops} onGenerateBeginnerPlan={onGenerateBeginnerPlan} />)
    fireEvent.click(screen.getByRole('button', { name: /Plan-Aktionen/i }))
    const item = screen.getByText(/Separater Anfänger-Plan/i)
    fireEvent.click(item)
    expect(onGenerateBeginnerPlan).toHaveBeenCalled()
  })
})
