import { footprintRect, type Rect } from '../domain/footprint'
import type { PlacedItem } from '../domain/types'

/** Minimum edge-to-edge gap between two items, in metres. */
export const MIN_CLEARANCE = 0.6

// Footprints sit on a 0.5 m grid, but sums like 1.0 + 0.6 are not exact in floating point.
// Without a small margin, a gap of exactly 0.6 m could be read as 0.5999999 and flagged.
const EPSILON = 1e-9

/** Two items closer than MIN_CLEARANCE. `a` comes before `b` in the items list. */
export interface Violation {
  a: string
  b: string
  gap: number // shortest edge-to-edge distance in metres; 0 when touching or overlapping
  overlap: boolean // the footprints share some floor area
}

/**
 * Every pair of items closer than MIN_CLEARANCE, measured edge to edge on the floor (height is
 * ignored). Diagonal neighbours use the true shortest distance between their corners.
 *
 * Compares every pair: 124,750 pairs at 500 items. See docs/DECISIONS.md for the measured cost.
 */
export function findViolations(items: PlacedItem[]): Violation[] {
  const rects = items.map(footprintRect)
  const violations: Violation[] = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const violation = checkPair(rects[i], rects[j])
      if (violation) violations.push({ a: items[i].id, b: items[j].id, ...violation })
    }
  }
  return violations
}

/** Ids of every item that is part of at least one violation. */
export function violatingIds(violations: Violation[]): Set<string> {
  const ids = new Set<string>()
  for (const { a, b } of violations) {
    ids.add(a)
    ids.add(b)
  }
  return ids
}

/** True when two footprints are closer than MIN_CLEARANCE (or overlap). */
export function rectsTooClose(a: Rect, b: Rect): boolean {
  return checkPair(a, b) !== null
}

function checkPair(a: Rect, b: Rect): { gap: number; overlap: boolean } | null {
  // Gap along each axis. Negative means the two rectangles overlap along that axis.
  const dx = Math.max(b.minX - a.maxX, a.minX - b.maxX)
  const dz = Math.max(b.minZ - a.maxZ, a.minZ - b.maxZ)
  // Quick exit: far apart along one axis means far apart overall.
  if (dx >= MIN_CLEARANCE - EPSILON || dz >= MIN_CLEARANCE - EPSILON) return null

  const gap = Math.hypot(Math.max(dx, 0), Math.max(dz, 0))
  if (gap >= MIN_CLEARANCE - EPSILON) return null // diagonal neighbours can still be far enough
  return { gap, overlap: dx < -EPSILON && dz < -EPSILON }
}
