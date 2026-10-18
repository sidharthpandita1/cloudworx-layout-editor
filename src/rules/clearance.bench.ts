import { bench, describe } from 'vitest'
import type { PlacedItem } from '../domain/types'
import { findViolations } from './clearance'

// 500 drives in a 25 × 20 block filling the floor, with gaps of 0.3 m and 0.1 m, so most items
// are in two or more violations. A realistic worst case for the naive pair check.
const items: PlacedItem[] = Array.from({ length: 500 }, (_, i) => ({
  id: `drive-${i + 1}`,
  typeId: 'drive',
  number: i + 1,
  x: -9.75 + (i % 25) * 0.8,
  z: -5.75 + Math.floor(i / 25) * 0.6,
  rotation: 0,
}))

describe('clearance rule', () => {
  bench('findViolations, 500 items (124,750 pairs)', () => {
    findViolations(items)
  })
})
