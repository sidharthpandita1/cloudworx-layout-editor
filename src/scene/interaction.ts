import { Plane, Vector3, type Ray } from 'three'
import type { Position } from '../domain/types'

/**
 * A pointer that moves further than this between press and release was dragging the camera,
 * so it must not count as a click (which would place or deselect by accident).
 */
export const CLICK_TOLERANCE_PX = 4

// An infinite flat plane at floor height. Dragging follows this, not the floor mesh, so a drag keeps
// working when the pointer passes over other items or beyond the floor edge.
const floorPlane = new Plane(new Vector3(0, 1, 0), 0)
const hit = new Vector3()

/** Where a pointer ray meets floor height, or null if it points at the sky. */
export function floorPointFromRay(ray: Ray): Position | null {
  return ray.intersectPlane(floorPlane, hit) ? { x: hit.x, z: hit.z } : null
}
