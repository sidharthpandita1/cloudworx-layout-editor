import { describe, expect, it } from 'vitest'
import { billOfMaterials } from './bom'
import type { ItemTypeId, PlacedItem } from './types'

function makeItem(typeId: ItemTypeId, number: number): PlacedItem {
  return { id: `${typeId}-${number}`, typeId, number, x: 0, z: 0, rotation: 0 }
}

describe('billOfMaterials', () => {
  it('counts items by type, in catalog order, whatever order they were placed in', () => {
    const items = [makeItem('transformer', 1), makeItem('cabinet', 1), makeItem('cabinet', 2), makeItem('drive', 1)]
    expect(billOfMaterials(items)).toEqual({
      lines: [
        { typeId: 'cabinet', quantity: 2 },
        { typeId: 'drive', quantity: 1 },
        { typeId: 'transformer', quantity: 1 },
      ],
      total: 4,
    })
  })

  it('leaves out types that are not used', () => {
    expect(billOfMaterials([makeItem('drive', 1), makeItem('drive', 2)]).lines).toEqual([
      { typeId: 'drive', quantity: 2 },
    ])
  })

  it('is empty for an empty layout', () => {
    expect(billOfMaterials([])).toEqual({ lines: [], total: 0 })
  })
})
