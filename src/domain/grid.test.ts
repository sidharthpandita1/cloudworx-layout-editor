import { describe, expect, it } from 'vitest'
import { snapToGrid } from './grid'

describe('snapToGrid', () => {
  it('rounds to the nearest 0.5 m grid line', () => {
    expect(snapToGrid(0.24)).toBe(0)
    expect(snapToGrid(0.26)).toBe(0.5)
    expect(snapToGrid(3.74)).toBe(3.5)
  })

  it('handles negative coordinates', () => {
    expect(snapToGrid(-1.3)).toBe(-1.5)
  })
})
