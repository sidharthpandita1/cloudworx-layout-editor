import { describe, expect, it } from 'vitest'
import type { ItemTypeId, PlacedItem, QuarterTurns } from '../domain/types'
import { findBlockingItem } from './overlap'

function makeItem(id: string, typeId: ItemTypeId, x: number, z: number, rotation: QuarterTurns = 0): PlacedItem {
  return { id, typeId, number: 1, x, z, rotation }
}

const cabinet = makeItem('cabinet-1', 'cabinet', 0, 0.25) // spans x −0.5…0.5, z 0…0.5

describe('findBlockingItem', () => {
  it('finds an item that shares floor area', () => {
    expect(findBlockingItem([cabinet], makeItem('drive-1', 'drive', 0.25, 0.25))).toBe(cabinet)
  })

  it('allows touching edges and corners', () => {
    expect(findBlockingItem([cabinet], makeItem('drive-1', 'drive', 0.75, 0.25))).toBeUndefined() // edge
    expect(findBlockingItem([cabinet], makeItem('drive-1', 'drive', 0.75, 0.75))).toBeUndefined() // corner
  })

  it('uses the rotated footprint', () => {
    // A drive just in front of the cabinet is free at 0°, but the cabinet turned 90° reaches it.
    const drive = makeItem('drive-1', 'drive', 0.25, 0.75)
    expect(findBlockingItem([cabinet], drive)).toBeUndefined()
    expect(findBlockingItem([makeItem('cabinet-1', 'cabinet', 0.25, 0.5, 1)], drive)).toBeDefined()
  })

  it('never lets an item block itself', () => {
    expect(findBlockingItem([cabinet], { ...cabinet, x: 0.5 })).toBeUndefined()
  })
})
