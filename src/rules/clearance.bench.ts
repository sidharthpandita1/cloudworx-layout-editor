import { bench, describe } from 'vitest'
import { seedLayout } from '../domain/seed'
import { findViolations } from './clearance'

// The same 500-item layout as `?seed=500`: items touch their neighbours, so it has many violations.
const items = seedLayout(500)

describe('clearance rule', () => {
  bench('findViolations, 500 items (124,750 pairs)', () => {
    findViolations(items)
  })
})
