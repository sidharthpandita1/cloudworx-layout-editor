import { describe, expect, it } from 'vitest'
import { groupItemsByType, nextNumbers, withDragPosition } from './items'
import type { ItemTypeId, PlacedItem } from './types'

function makeItem(typeId: ItemTypeId, number: number): PlacedItem {
  return { id: `${typeId}-${number}`, typeId, number, x: 0, z: 0, rotation: 0 }
}

describe('groupItemsByType', () => {
  it('groups by type and keeps the original order inside each group', () => {
    const items = [makeItem('cabinet', 1), makeItem('drive', 1), makeItem('cabinet', 2), makeItem('drive', 2)]
    const groups = groupItemsByType(items)
    expect(groups.cabinet.map((item) => item.id)).toEqual(['cabinet-1', 'cabinet-2'])
    expect(groups.drive.map((item) => item.id)).toEqual(['drive-1', 'drive-2'])
  })

  it('returns an empty list for types with no items', () => {
    expect(groupItemsByType([makeItem('drive', 1)]).transformer).toEqual([])
  })

  it('maps an instanceId back to the right item after a delete in the middle', () => {
    // cabinet-2 was deleted: instance 1 must now be cabinet-3, not a stale cabinet-2.
    const items = [makeItem('cabinet', 1), makeItem('cabinet', 3)]
    expect(groupItemsByType(items).cabinet[1].id).toBe('cabinet-3')
  })
})

describe('withDragPosition', () => {
  it('returns the same list when nothing is dragged', () => {
    const items = [makeItem('drive', 1)]
    expect(withDragPosition(items, null)).toBe(items)
  })

  it('moves only the dragged item, without changing the original list', () => {
    const items = [makeItem('drive', 1), makeItem('drive', 2)]
    const live = withDragPosition(items, { id: 'drive-2', position: { x: 3, z: 1 } })
    expect(live[1]).toMatchObject({ id: 'drive-2', x: 3, z: 1 })
    expect(live[0]).toBe(items[0])
    expect(items[1]).toMatchObject({ x: 0, z: 0 })
  })
})

describe('nextNumbers', () => {
  it('continues after the highest number of each type, even with gaps', () => {
    expect(nextNumbers([makeItem('drive', 1), makeItem('drive', 7), makeItem('cabinet', 2)])).toEqual({
      cabinet: 3,
      drive: 8,
      transformer: 1,
    })
  })
})
