import { footprintSize } from './footprint'
import { FLOOR_DEPTH, FLOOR_WIDTH } from './grid'
import type { ItemTypeId, PlacedItem } from './types'

// Cabinets and drives alternate in this pattern: 3 cabinets to every 5 drives.
const ROW_PATTERN: ItemTypeId[] = ['cabinet', 'drive', 'drive', 'cabinet', 'drive', 'drive', 'cabinet', 'drive']

/**
 * A layout of `count` items for the performance test (`?seed=500`). Always the same layout for the
 * same count. One item in 25 is a transformer; the rest are cabinets and drives (3 : 5).
 * For 500: 20 transformers, 180 cabinets, 300 drives.
 *
 * Items are packed in rows from the back-left corner, touching but never overlapping, all on the
 * grid and inside the floor. Transformers go first because they are deeper (1 m): a row is as deep
 * as its deepest item, so mixing them in would waste space. 500 items cannot all keep 0.6 m apart on
 * a 20 × 12 m floor, so this layout has many clearance warnings: a realistic worst case for the rule.
 * Stops early if the floor is full.
 */
export function seedLayout(count: number): PlacedItem[] {
  const transformers = Math.round(count / 25)
  const types: ItemTypeId[] = Array.from({ length: count }, (_, i) =>
    i < transformers ? 'transformer' : ROW_PATTERN[(i - transformers) % ROW_PATTERN.length],
  )

  const items: PlacedItem[] = []
  const numbers: Record<ItemTypeId, number> = { cabinet: 0, drive: 0, transformer: 0 }
  let x = -FLOOR_WIDTH / 2 // left edge of the next item
  let z = -FLOOR_DEPTH / 2 // back edge of the current row
  let rowDepth = 0

  for (const typeId of types) {
    const { width, depth } = footprintSize(typeId, 0)
    if (x + width > FLOOR_WIDTH / 2) {
      // Row full: start the next one behind it.
      x = -FLOOR_WIDTH / 2
      z += rowDepth
      rowDepth = 0
    }
    if (z + depth > FLOOR_DEPTH / 2) break // floor full

    numbers[typeId] += 1
    const number = numbers[typeId]
    items.push({ id: `${typeId}-${number}`, typeId, number, x: x + width / 2, z: z + depth / 2, rotation: 0 })
    x += width
    rowDepth = Math.max(rowDepth, depth)
  }
  return items
}
