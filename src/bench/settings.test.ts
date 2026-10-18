import { describe, expect, it } from 'vitest'
import { gridPositions, readSettings, settingsQuery } from './settings'

describe('benchmark settings', () => {
  it('defaults to one Meshopt model with instancing on, and ignores unknown models', () => {
    expect(readSettings('')).toEqual({ model: 'meshopt', copies: 1, instancing: true })
    expect(readSettings('?model=nope').model).toBe('meshopt')
    expect(readSettings('?model=meshopt-512').model).toBe('meshopt-512')
  })

  it('round-trips through the address', () => {
    const settings = { model: 'raw', copies: 500, instancing: false } as const
    expect(readSettings(settingsQuery(settings))).toEqual(settings)
  })
})

describe('gridPositions', () => {
  it('places every copy once, centred on the origin', () => {
    const positions = gridPositions(500, 0.8)
    expect(positions).toHaveLength(500)
    expect(new Set(positions.map((p) => p.join())).size).toBe(500)
    const meanX = positions.reduce((sum, p) => sum + p[0], 0) / positions.length
    expect(Math.abs(meanX)).toBeLessThan(0.5)
  })
})
