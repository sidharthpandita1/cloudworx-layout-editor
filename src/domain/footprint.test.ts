import { describe, expect, it } from 'vitest'
import { footprintRect, footprintSize, rotatedPosition, snapItemPosition } from './footprint'
import { FLOOR_DEPTH, FLOOR_WIDTH } from './grid'
import type { ItemTypeId, PlacedItem, QuarterTurns } from './types'

function makeItem(typeId: ItemTypeId, x: number, z: number, rotation: QuarterTurns = 0): PlacedItem {
  return { id: `${typeId}-1`, typeId, number: 1, x, z, rotation }
}

function expectInsideFloor(item: PlacedItem) {
  const rect = footprintRect(item)
  expect(rect.minX).toBeGreaterThanOrEqual(-FLOOR_WIDTH / 2)
  expect(rect.maxX).toBeLessThanOrEqual(FLOOR_WIDTH / 2)
  expect(rect.minZ).toBeGreaterThanOrEqual(-FLOOR_DEPTH / 2)
  expect(rect.maxZ).toBeLessThanOrEqual(FLOOR_DEPTH / 2)
}

describe('footprintSize', () => {
  it('swaps width and depth at 90° and 270°', () => {
    expect(footprintSize('cabinet', 0)).toEqual({ width: 1, depth: 0.5 })
    expect(footprintSize('cabinet', 1)).toEqual({ width: 0.5, depth: 1 })
    expect(footprintSize('cabinet', 2)).toEqual({ width: 1, depth: 0.5 })
    expect(footprintSize('cabinet', 3)).toEqual({ width: 0.5, depth: 1 })
  })
})

describe('snapItemPosition', () => {
  it('puts a 1×1 drive in the middle of a cell', () => {
    expect(snapItemPosition({ x: 1.1, z: -0.4 }, 'drive', 0)).toEqual({ x: 1.25, z: -0.25 })
  })

  it('puts a 2×1 cabinet on a grid line in x and mid-cell in z', () => {
    expect(snapItemPosition({ x: 1.1, z: -0.4 }, 'cabinet', 0)).toEqual({ x: 1, z: -0.25 })
  })

  it('swaps that for a rotated cabinet', () => {
    expect(snapItemPosition({ x: 1.1, z: -0.4 }, 'cabinet', 1)).toEqual({ x: 1.25, z: -0.5 })
  })

  it('clamps inside each wall', () => {
    expect(snapItemPosition({ x: 50, z: 0.25 }, 'cabinet', 0).x).toBe(9.5)
    expect(snapItemPosition({ x: -50, z: 0.25 }, 'cabinet', 0).x).toBe(-9.5)
    expect(snapItemPosition({ x: 0, z: 50 }, 'cabinet', 0).z).toBe(5.75)
    expect(snapItemPosition({ x: 0, z: -50 }, 'cabinet', 0).z).toBe(-5.75)
  })

  it('clamps a 3×2 transformer into a corner', () => {
    expect(snapItemPosition({ x: 100, z: 100 }, 'transformer', 0)).toEqual({ x: 9.25, z: 5.5 })
  })
})

describe('rotatedPosition', () => {
  it('does not move items whose sides are both odd or both even', () => {
    expect(rotatedPosition(makeItem('drive', 1.25, -0.25), 1)).toEqual({ x: 1.25, z: -0.25 })
  })

  it('shifts a mixed footprint by half a cell so it stays aligned', () => {
    // Cabinet at 0°: x on a line, z mid-cell. At 90°: x mid-cell, z on a line.
    expect(rotatedPosition(makeItem('cabinet', 1, -0.25, 0), 1)).toEqual({ x: 1.25, z: 0 })
    expect(rotatedPosition(makeItem('transformer', 0.25, 0, 0), 1)).toEqual({ x: 0.5, z: 0.25 })
  })

  it('does not shift a mixed footprint on a 180° turn', () => {
    expect(rotatedPosition(makeItem('cabinet', 1, -0.25, 0), 2)).toEqual({ x: 1, z: -0.25 })
    expect(rotatedPosition(makeItem('cabinet', 1.25, 0, 1), 3)).toEqual({ x: 1.25, z: 0 })
  })

  it.each(['cabinet', 'transformer'] as const)('%s returns exactly to the start after 2 and 4 turns', (typeId) => {
    const start = makeItem(typeId, typeId === 'cabinet' ? 1 : 0.25, typeId === 'cabinet' ? -0.25 : 0)
    let item = start
    for (let turn = 1; turn <= 4; turn++) {
      const rotation = (turn % 4) as QuarterTurns
      item = { ...item, ...rotatedPosition(item, rotation), rotation }
      if (turn === 2 || turn === 4) expect({ x: item.x, z: item.z }).toEqual({ x: start.x, z: start.z })
    }
  })

  it('stays inside the floor when rotating against a wall', () => {
    const corner = makeItem('transformer', 9.25, 5.5, 0)
    const rotated = { ...corner, ...rotatedPosition(corner, 1), rotation: 1 as const }
    expectInsideFloor(rotated)
  })
})
