import { Ray, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { floorPointFromRay } from './interaction'

describe('floorPointFromRay', () => {
  it('returns where a downward ray meets the floor', () => {
    const ray = new Ray(new Vector3(2, 10, -3), new Vector3(0, -1, 0))
    expect(floorPointFromRay(ray)).toEqual({ x: 2, z: -3 })
  })

  it('works beyond the floor edge (the plane is infinite)', () => {
    const ray = new Ray(new Vector3(0, 10, 10), new Vector3(0, -1, 1).normalize())
    const point = floorPointFromRay(ray)
    expect(point?.x).toBeCloseTo(0)
    expect(point?.z).toBeCloseTo(20)
  })

  it('returns null for a ray pointing at the sky', () => {
    expect(floorPointFromRay(new Ray(new Vector3(0, 10, 0), new Vector3(0, 1, 0)))).toBeNull()
  })
})
