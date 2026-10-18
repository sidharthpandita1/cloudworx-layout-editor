import { describe, expect, it } from 'vitest'
import { findViolations } from '../rules/clearance'
import { footprintRect, snapItemPosition } from './footprint'
import { FLOOR_DEPTH, FLOOR_WIDTH } from './grid'
import { billOfMaterials } from './bom'
import { seedLayout } from './seed'

describe('seedLayout', () => {
  const items = seedLayout(500)

  it('places all 500 items with the planned mix', () => {
    expect(items).toHaveLength(500)
    expect(billOfMaterials(items).lines).toEqual([
      { typeId: 'cabinet', quantity: 180 },
      { typeId: 'drive', quantity: 300 },
      { typeId: 'transformer', quantity: 20 },
    ])
  })

  it('keeps every item on the grid and inside the floor', () => {
    for (const item of items) {
      expect(snapItemPosition(item, item.typeId, item.rotation)).toEqual({ x: item.x, z: item.z })
      const rect = footprintRect(item)
      expect(rect.minX).toBeGreaterThanOrEqual(-FLOOR_WIDTH / 2)
      expect(rect.maxX).toBeLessThanOrEqual(FLOOR_WIDTH / 2)
      expect(rect.minZ).toBeGreaterThanOrEqual(-FLOOR_DEPTH / 2)
      expect(rect.maxZ).toBeLessThanOrEqual(FLOOR_DEPTH / 2)
    }
  })

  it('never overlaps, and has unique ids', () => {
    expect(findViolations(items).filter((violation) => violation.overlap)).toEqual([])
    expect(new Set(items.map((item) => item.id)).size).toBe(500)
  })

  it('is the same every time, and stops when the floor is full', () => {
    expect(seedLayout(500)).toEqual(items)
    const tooMany = seedLayout(5000)
    expect(tooMany.length).toBeLessThan(5000)
    expect(findViolations(tooMany).filter((violation) => violation.overlap)).toEqual([])
  })
})
