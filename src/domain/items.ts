import type { ItemTypeId, PlacedItem, Position } from './types'

/**
 * Splits items by type, keeping their order. Each list feeds one InstancedMesh, so an instance's
 * index in the mesh (its `instanceId`) is its index in this list.
 */
export function groupItemsByType(items: PlacedItem[]): Record<ItemTypeId, PlacedItem[]> {
  const groups: Record<ItemTypeId, PlacedItem[]> = { cabinet: [], drive: [], transformer: [] }
  for (const item of items) groups[item.typeId].push(item)
  return groups
}

/**
 * The layout as it looks right now: the item being dragged is at its live drag position.
 * Used by the clearance rule so warnings update during a drag, before anything is recorded.
 */
export function withDragPosition(items: PlacedItem[], drag: { id: string; position: Position } | null): PlacedItem[] {
  if (!drag) return items
  return items.map((item) => (item.id === drag.id ? { ...item, ...drag.position } : item))
}

/** The next free label number per type after loading a layout: one more than the highest in use. */
export function nextNumbers(items: PlacedItem[]): Record<ItemTypeId, number> {
  const next: Record<ItemTypeId, number> = { cabinet: 1, drive: 1, transformer: 1 }
  for (const item of items) next[item.typeId] = Math.max(next[item.typeId], item.number + 1)
  return next
}
