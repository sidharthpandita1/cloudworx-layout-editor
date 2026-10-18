import { describe, expect, it } from 'vitest'
import { applyCommand } from '../commands/commands'
import { footprintRect } from '../domain/footprint'
import { FLOOR_DEPTH, FLOOR_WIDTH } from '../domain/grid'
import { seedLayout } from '../domain/seed'
import type { PlacedItem } from '../domain/types'
import { findViolations } from '../rules/clearance'
import { findBlockingItem } from '../rules/overlap'
import { fixAllViolations, fixViolation, MAX_MOVES, movesIn, nearestClearSpot } from './fix'

function drive(number: number, x: number, z: number): PlacedItem {
  return { id: `drive-${number}`, typeId: 'drive', number, x, z, rotation: 0 }
}

// Two 0.5 m drives 0.5 m apart (edges at 0.5 and 1.0): too close by 0.1 m.
const a = drive(1, 0.25, 0.25)
const b = drive(2, 1.25, 0.25)

describe('nearestClearSpot', () => {
  it('finds the closest grid spot that keeps the minimum clearance', () => {
    // One cell further right gives a 1.0 m gap; nothing closer is clear.
    expect(nearestClearSpot([a, b], b)).toEqual({ x: 1.75, z: 0.25 })
  })

  it('stays on the floor when the item is at a wall', () => {
    const atWall = drive(1, FLOOR_WIDTH / 2 - 0.25, 0.25)
    const neighbour = drive(2, FLOOR_WIDTH / 2 - 1.25, 0.25)
    const spot = nearestClearSpot([atWall, neighbour], atWall)
    expect(spot).not.toBeNull()
    const rect = footprintRect({ ...atWall, ...spot! })
    expect(rect.maxX).toBeLessThanOrEqual(FLOOR_WIDTH / 2)
    expect(Math.abs(rect.minZ)).toBeLessThanOrEqual(FLOOR_DEPTH / 2)
  })
})

describe('fixViolation', () => {
  const [violation] = findViolations([a, b])

  it('moves the item with the shorter way out, preferring the selected one on a tie', () => {
    // Both can step 0.5 m away (a left, b right): the tie goes to the selected item.
    expect(fixViolation([a, b], violation, 'drive-2')).toEqual({ type: 'move', id: 'drive-2', from: { x: 1.25, z: 0.25 }, to: { x: 1.75, z: 0.25 } })
    expect(fixViolation([a, b], violation, 'drive-1')?.to).toEqual({ x: -0.25, z: 0.25 })
  })

  it('leaves no clearance problem behind', () => {
    const move = fixViolation([a, b], violation)!
    expect(findViolations(applyCommand([a, b], move))).toEqual([])
  })
})

describe('fixAllViolations', () => {
  it('on the packed 500-item layout: quick, at most MAX_MOVES moves, each item once, fewer problems, no overlaps', () => {
    const items = seedLayout(500)
    const started = performance.now()
    const moves = fixAllViolations(items)
    expect(performance.now() - started).toBeLessThan(500) // ~0.1 s; generous for slow CI machines
    expect(moves.length).toBeGreaterThan(0)
    expect(moves.length).toBeLessThanOrEqual(MAX_MOVES)
    expect(new Set(moves.map((move) => move.id)).size).toBe(moves.length)

    const after = applyCommand(items, { type: 'batch', commands: moves })
    expect(findViolations(after).length).toBeLessThan(findViolations(items).length)
    for (const move of moves) {
      const moved = after.find((item) => item.id === move.id)!
      expect(findBlockingItem(after, moved)).toBeUndefined()
    }
  })

  it('fixes every problem in a small layout', () => {
    const c = drive(3, 2.25, 0.25) // too close to b as well
    const moves = fixAllViolations([a, b, c])
    expect(findViolations(applyCommand([a, b, c], { type: 'batch', commands: moves }))).toEqual([])
  })
})

describe('movesIn', () => {
  it('lists the moves inside a batch, and ignores other commands', () => {
    const move = { type: 'move', id: 'drive-1', from: { x: 0, z: 0 }, to: { x: 1, z: 0 } } as const
    expect(movesIn({ type: 'batch', commands: [move, { type: 'rotate', id: 'drive-1', from: 0, to: 1 }] })).toEqual([move])
    expect(movesIn({ type: 'delete', item: a, index: 0 })).toEqual([])
  })
})
