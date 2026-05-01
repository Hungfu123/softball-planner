import { describe, it, expect } from 'vitest'
import { cellKey } from './bogenSheetRenderer'

describe('cellKey', () => {
  it('joins side, slot, inning with pipes', () => {
    expect(cellKey('HOME', 7, 3)).toBe('HOME|7|3')
  })
})
