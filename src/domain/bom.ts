import { ITEM_TYPES } from './catalog'
import type { ItemTypeId, PlacedItem } from './types'

export interface BomLine {
  typeId: ItemTypeId
  quantity: number
}

export interface BillOfMaterials {
  lines: BomLine[] // one per item type that is used, in catalog order
  total: number
}

/**
 * Counts the items in the layout by type. Derived from the items every time, never stored,
 * so it is always correct after any edit, undo or redo.
 */
export function billOfMaterials(items: PlacedItem[]): BillOfMaterials {
  const counts = new Map<ItemTypeId, number>()
  for (const item of items) counts.set(item.typeId, (counts.get(item.typeId) ?? 0) + 1)

  const lines = ITEM_TYPES.filter((type) => counts.has(type.id)).map((type) => ({
    typeId: type.id,
    quantity: counts.get(type.id) ?? 0,
  }))
  return { lines, total: items.length }
}
