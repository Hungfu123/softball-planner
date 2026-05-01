import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DiamondCell } from './DiamondCell'
import type { CellNotation } from '@/utils/bogenSheetRenderer'

const empty: CellNotation = {
  primaryLabel: '',
  labels: [],
  runScored: false,
  outIndex: null,
  rbi: 0,
  reachedBase: 0,
  stealingArrow: null,
  abCount: 0,
}

describe('DiamondCell', () => {
  it('empty cell renders just diamond outline (no text)', () => {
    const { container } = render(<DiamondCell notation={empty} />)
    expect(container.querySelector('svg')).toBeTruthy()
    expect(container.querySelector('text')).toBeNull()
  })

  it('FC label shows under diamond with out index "I"', () => {
    const cell: CellNotation = {
      ...empty,
      primaryLabel: 'FC 6-4',
      labels: ['FC 6-4'],
      reachedBase: 1,
      outIndex: 'I',
      abCount: 1,
    }
    const { getByText } = render(<DiamondCell notation={cell} />)
    expect(getByText('FC 6-4')).toBeTruthy()
    expect(getByText('I')).toBeTruthy()
  })

  it('Sac Fly label shows "F8 SF"', () => {
    const cell: CellNotation = {
      ...empty,
      primaryLabel: 'F8 SF',
      labels: ['F8 SF'],
      reachedBase: 0,
      outIndex: 'I',
      rbi: 1,
      abCount: 1,
    }
    const { getByText } = render(<DiamondCell notation={cell} />)
    expect(getByText('F8 SF')).toBeTruthy()
  })

  it('runScored fills diamond solid navy + cream label', () => {
    const cell: CellNotation = {
      ...empty,
      primaryLabel: 'HR',
      labels: ['HR'],
      runScored: true,
      reachedBase: 4,
      abCount: 1,
    }
    const { container, getByText } = render(<DiamondCell notation={cell} />)
    expect(getByText('HR')).toBeTruthy()
    const path = container.querySelector('path')
    expect(path?.getAttribute('fill')).toBe('#1e3a8a')
  })

  it('shows up to 3 RBI dots even with rbi=5', () => {
    const cell: CellNotation = {
      ...empty,
      primaryLabel: '1B',
      labels: ['1B'],
      reachedBase: 1,
      rbi: 5,
      abCount: 1,
    }
    const { container } = render(<DiamondCell notation={cell} />)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(3)
  })

  it('WP arrow renders orange', () => {
    const cell: CellNotation = {
      ...empty,
      primaryLabel: 'BB',
      labels: ['BB'],
      reachedBase: 2,
      abCount: 1,
      stealingArrow: { fromBase: 1, toBase: 2, type: 'WILD_PITCH' },
    }
    const { container, getByText } = render(<DiamondCell notation={cell} />)
    const lines = container.querySelectorAll('line')
    const arrowLine = Array.from(lines).find(l => l.getAttribute('stroke-dasharray'))
    expect(arrowLine?.getAttribute('stroke')).toBe('#f97316')
    expect(getByText('WP')).toBeTruthy()
  })

  it('PB arrow renders orange with PB label', () => {
    const cell: CellNotation = {
      ...empty,
      primaryLabel: 'BB',
      labels: ['BB'],
      reachedBase: 4,
      runScored: true,
      abCount: 1,
      stealingArrow: { fromBase: 3, toBase: 4, type: 'PASSED_BALL' },
    }
    const { getByText } = render(<DiamondCell notation={cell} />)
    expect(getByText('PB')).toBeTruthy()
  })

  it('CAUGHT_STEALING arrow renders dark red', () => {
    const cell: CellNotation = {
      ...empty,
      primaryLabel: '',
      labels: [],
      reachedBase: 1,
      abCount: 0,
      stealingArrow: { fromBase: 1, toBase: 2, type: 'CAUGHT_STEALING' },
    }
    const { container } = render(<DiamondCell notation={cell} />)
    const lines = container.querySelectorAll('line')
    const arrowLine = Array.from(lines).find(l => l.getAttribute('stroke-dasharray'))
    expect(arrowLine?.getAttribute('stroke')).toBe('#7c2d12')
  })

  it('STOLEN_BASE arrow renders red', () => {
    const cell: CellNotation = {
      ...empty,
      primaryLabel: '',
      labels: [],
      reachedBase: 2,
      abCount: 0,
      stealingArrow: { fromBase: 1, toBase: 2, type: 'STOLEN_BASE' },
    }
    const { container } = render(<DiamondCell notation={cell} />)
    const lines = container.querySelectorAll('line')
    const arrowLine = Array.from(lines).find(l => l.getAttribute('stroke-dasharray'))
    expect(arrowLine?.getAttribute('stroke')).toBe('#dc2626')
  })

  it('Multi-AB cell stacks both labels', () => {
    const cell: CellNotation = {
      ...empty,
      primaryLabel: 'E6',
      labels: ['1B', 'E6'],
      reachedBase: 1,
      abCount: 2,
    }
    const { container } = render(<DiamondCell notation={cell} />)
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(texts).toContain('1B')
    expect(texts).toContain('E6')
  })

  it('Range out index "I-II" for double play', () => {
    const cell: CellNotation = {
      ...empty,
      primaryLabel: '6-4-3 DP',
      labels: ['6-4-3 DP'],
      reachedBase: 0,
      outIndex: 'I-II',
      abCount: 1,
    }
    const { getByText } = render(<DiamondCell notation={cell} />)
    expect(getByText('I-II')).toBeTruthy()
  })
})
