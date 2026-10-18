import type { ItemTypeId, PlacedItem } from './types'

/**
 * Splits items by type, keeping their order. Each list feeds one InstancedMesh, so an instance's
 * index in the mesh (its `instanceId`) is its index in this list.
 */
export function groupItemsByType(items: PlacedItem[]): Record<ItemTypeId, PlacedItem[]> {
  const groups: Record<ItemTypeId, PlacedItem[]> = { cabinet: [], drive: [], transformer: [] }
  for (const item of items) groups[item.typeId].push(item)
  return groups
}
