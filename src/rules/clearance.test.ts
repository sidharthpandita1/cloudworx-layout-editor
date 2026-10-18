import { describe, expect, it } from 'vitest'
import type { ItemTypeId, PlacedItem, QuarterTurns } from '../domain/types'
import { findViolations, violatingIds } from './clearance'

// Positions here are deliberately off the grid where a test needs an exact gap like 0.59 m.
function makeItem(id: string, typeId: ItemTypeId, x: number, z: number, rotation: QuarterTurns = 0): PlacedItem {
  return { id, typeId, number: 1, x, z, rotation }
}

// A drive is 0.5 × 0.5 m, so two drives with centres d apart along x have a gap of d − 0.5.
function drivesWithGap(gap: number): PlacedItem[] {
  return [makeItem('a', 'drive', 0, 0), makeItem('b', 'drive', 0.5 + gap, 0)]
}

describe('findViolations', () => {
  it('flags items that touch (gap 0) but do not overlap', () => {
    expect(findViolations(drivesWithGap(0))).toEqual([{ a: 'a', b: 'b', gap: 0, overlap: false }])
  })

  it('flags 0.59 m and allows exactly 0.6 m', () => {
    expect(findViolations(drivesWithGap(0.59))).toHaveLength(1)
    expect(findViolations(drivesWithGap(0.59))[0].gap).toBeCloseTo(0.59)
    expect(findViolations(drivesWithGap(0.6))).toEqual([])
    expect(findViolations(drivesWithGap(0.61))).toEqual([])
  })

  it('reports overlapping items as an overlap', () => {
    const items = [makeItem('a', 'cabinet', 0, 0), makeItem('b', 'drive', 0.25, 0)]
    expect(findViolations(items)).toEqual([{ a: 'a', b: 'b', gap: 0, overlap: true }])
  })

  it('uses the rotated footprint', () => {
    // A 2×1 cabinet is 1 m along x at 0°, but only 0.5 m at 90°.
    // Drive edge at x = 1.25. Cabinet at 0° spans x −0.5…0.5 → gap 0.75. At 90° it spans −0.25…0.25 → gap 1.0.
    // Along z it is the other way round: put the drive in front instead.
    const drive = makeItem('d', 'drive', 0, 1.25) // spans z 1.0…1.5
    expect(findViolations([makeItem('c', 'cabinet', 0, 0, 0), drive])).toEqual([]) // cabinet z −0.25…0.25 → gap 0.75
    const turned = findViolations([makeItem('c', 'cabinet', 0, 0, 1), drive]) // cabinet z −0.5…0.5 → gap 0.5
    expect(turned).toHaveLength(1)
    expect(turned[0].gap).toBeCloseTo(0.5)
  })

  it('measures diagonal neighbours corner to corner', () => {
    // One cell apart on both axes: the corners are √(0.5² + 0.5²) ≈ 0.71 m apart, which is enough.
    expect(findViolations([makeItem('a', 'drive', 0, 0), makeItem('b', 'drive', 1, 1)])).toEqual([])
    // 0.4 m on both axes: ≈ 0.57 m, too close, even though each axis gap alone is under 0.6.
    const close = findViolations([makeItem('a', 'drive', 0, 0), makeItem('b', 'drive', 0.9, 0.9)])
    expect(close[0].gap).toBeCloseTo(Math.hypot(0.4, 0.4))
  })

  it('checks every pair and names each item once per pair', () => {
    const items = [makeItem('a', 'drive', 0, 0), makeItem('b', 'drive', 0.75, 0), makeItem('c', 'drive', 1.5, 0)]
    const violations = findViolations(items)
    expect(violations.map(({ a, b }) => `${a}-${b}`)).toEqual(['a-b', 'b-c'])
    expect(violatingIds(violations)).toEqual(new Set(['a', 'b', 'c']))
  })

  it('returns nothing for zero or one item', () => {
    expect(findViolations([])).toEqual([])
    expect(findViolations([makeItem('a', 'drive', 0, 0)])).toEqual([])
  })
})
