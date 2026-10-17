import type { ItemType, ItemTypeId } from './types'

/** The palette. Simple primitives for now; glTF models can replace them later. */
export const CATALOG: Record<ItemTypeId, ItemType> = {
  cabinet: { id: 'cabinet', nameKey: 'item.cabinet', widthCells: 2, depthCells: 1, height: 2.0, color: '#4a6fa5' },
  drive: { id: 'drive', nameKey: 'item.drive', widthCells: 1, depthCells: 1, height: 1.2, color: '#e07a1f' },
  transformer: { id: 'transformer', nameKey: 'item.transformer', widthCells: 3, depthCells: 2, height: 1.6, color: '#5b8c5a' },
}

export const ITEM_TYPES: ItemType[] = Object.values(CATALOG)
