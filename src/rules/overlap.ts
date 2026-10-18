import { footprintRect, type Rect } from '../domain/footprint'
import type { PlacedItem } from '../domain/types'

// Same idea as in clearance.ts: ignore floating-point noise, so touching never counts as overlapping.
const EPSILON = 1e-9

/** True when two footprints share some floor area. Touching edges or corners do not count. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.minX < b.maxX - EPSILON &&
    b.minX < a.maxX - EPSILON &&
    a.minZ < b.maxZ - EPSILON &&
    b.minZ < a.maxZ - EPSILON
  )
}

/**
 * The first item that `candidate` would overlap, or undefined if the spot is free.
 * The candidate's own id is skipped, so an item never blocks itself when it moves or rotates.
 */
export function findBlockingItem(items: PlacedItem[], candidate: PlacedItem): PlacedItem | undefined {
  const rect = footprintRect(candidate)
  return items.find((item) => item.id !== candidate.id && rectsOverlap(rect, footprintRect(item)))
}
