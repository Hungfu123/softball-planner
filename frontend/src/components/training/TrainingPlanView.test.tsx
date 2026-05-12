import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TrainingPlanView } from './TrainingPlanView'
import type { TrainingPlanContentResponse } from '@/types'

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

const noops = { onEdit: vi.fn(), onRegenerate: vi.fn(), onDelete: vi.fn(), drills: [] }

describe('TrainingPlanView', () => {
  it('zeigt Empty-State wenn kein Plan', () => {
    render(<TrainingPlanView planContent={null} {...noops} />)
    expect(screen.getByText(/Noch kein Plan/i)).toBeInTheDocument()
  })

  it('zeigt Empty-State bei leeren Sections', () => {
    render(<TrainingPlanView planContent={{ sections: [], groupDistributionHint: null, overallNotes: null }} {...noops} />)
    expect(screen.getByText(/Noch kein Plan/i)).toBeInTheDocument()
  })

  it('zeigt Generieren-Button wenn kein Plan', () => {
    const onRegenerate = vi.fn()
    render(<TrainingPlanView planContent={null} drills={[]} onEdit={vi.fn()} onRegenerate={onRegenerate} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Plan generieren/i }))
    expect(onRegenerate).toHaveBeenCalled()
  })

  it('rendert Section-Titel + Dauer', () => {
    const plan = {
      sections: [
        mkSection({ sectionType: 'WARMUP', title: 'Aufwärmroutine Dead Sox', durationMinutes: 30 }),
        mkSection({ sectionType: 'DRILL', title: 'Wurf-Drill', durationMinutes: 25 }),
      ],
      groupDistributionHint: null,
      overallNotes: null,
    }
    render(<TrainingPlanView planContent={plan} {...noops} />)
    expect(screen.getByText('Aufwärmroutine Dead Sox')).toBeInTheDocument()
    expect(screen.getByText('Wurf-Drill')).toBeInTheDocument()
    expect(screen.getByText('30 min')).toBeInTheDocument()
    expect(screen.getByText('25 min')).toBeInTheDocument()
  })

  it('zeigt Header mit Gesamtdauer formatiert (h + min)', () => {
    const plan = {
      sections: [
        mkSection({ durationMinutes: 30 }),
        mkSection({ durationMinutes: 45 }),
        mkSection({ durationMinutes: 30 }),
      ],
      groupDistributionHint: null,
      overallNotes: null,
    }
    render(<TrainingPlanView planContent={plan} {...noops} />)
    expect(screen.getByText(/1 h 45 min · 3 Blöcke/)).toBeInTheDocument()
  })

  it('expandiert Section bei Klick → zeigt Details', () => {
    const plan = {
      sections: Array.from({ length: 6 }, (_, i) =>
        mkSection({ title: `Section ${i}`, durationMinutes: 10, tips: i === 0 ? 'Auf Footwork achten' : null }),
      ),
      groupDistributionHint: null,
      overallNotes: null,
    }
    render(<TrainingPlanView planContent={plan} {...noops} />)
    expect(screen.queryByText('Auf Footwork achten')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Section 0/i }))
    expect(screen.getByText('Auf Footwork achten')).toBeInTheDocument()
  })

  it('3-Dot-Menu öffnet + zeigt Bearbeiten/Neu generieren/Löschen', () => {
    const onEdit = vi.fn()
    const onRegenerate = vi.fn()
    const onDelete = vi.fn()
    const plan = {
      sections: [mkSection({ title: 'Drill A', durationMinutes: 20 })],
      groupDistributionHint: null,
      overallNotes: null,
    }
    render(<TrainingPlanView planContent={plan} drills={[]} onEdit={onEdit} onRegenerate={onRegenerate} onDelete={onDelete} />)
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
    const plan = {
      sections: [mkSection({ title: 'Drill A', durationMinutes: 20 })],
      groupDistributionHint: null,
      overallNotes: 'Heute Fokus auf Defense',
    }
    render(<TrainingPlanView planContent={plan} {...noops} />)
    expect(screen.getByText('Heute Fokus auf Defense')).toBeInTheDocument()
  })

  it('rendert kein JSON-Raw mehr', () => {
    const plan = {
      sections: [mkSection({ title: 'Drill A', durationMinutes: 20 })],
      groupDistributionHint: null,
      overallNotes: null,
    }
    const { container } = render(<TrainingPlanView planContent={plan} {...noops} />)
    expect(container.querySelector('pre')).not.toBeInTheDocument()
  })
})
