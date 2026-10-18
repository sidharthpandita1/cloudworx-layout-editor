import { CATALOG } from './catalog'
import { CELL_SIZE, FLOOR_DEPTH, FLOOR_WIDTH, snapToGrid } from './grid'
import type { ItemTypeId, PlacedItem, Position, QuarterTurns } from './types'

/** Footprint size in metres along x (width) and z (depth). */
export interface Size {
  width: number
  depth: number
}

/** Axis-aligned footprint rectangle on the floor, in metres. */
export interface Rect {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/** Footprint size for a type at a rotation. Width and depth swap at 90° and 270°. */
export function footprintSize(typeId: ItemTypeId, rotation: QuarterTurns): Size {
  const { widthCells, depthCells } = CATALOG[typeId]
  const turned = rotation % 2 === 1
  return {
    width: (turned ? depthCells : widthCells) * CELL_SIZE,
    depth: (turned ? widthCells : depthCells) * CELL_SIZE,
  }
}

export function footprintRect(item: PlacedItem): Rect {
  const { width, depth } = footprintSize(item.typeId, item.rotation)
  return {
    minX: item.x - width / 2,
    maxX: item.x + width / 2,
    minZ: item.z - depth / 2,
    maxZ: item.z + depth / 2,
  }
}

/**
 * Snaps a footprint so its edges sit on grid lines, and clamps it fully inside the floor.
 * Snapping the edge rather than the centre handles odd and even footprints with one formula.
 */
export function snapItemPosition(raw: Position, typeId: ItemTypeId, rotation: QuarterTurns): Position {
  const { width, depth } = footprintSize(typeId, rotation)
  return {
    x: snapAxis(raw.x, width, FLOOR_WIDTH),
    z: snapAxis(raw.z, depth, FLOOR_DEPTH),
  }
}

/**
 * Where an item's centre goes when it is rotated to `rotation`, turning about a fixed pivot.
 *
 * If one side of the footprint is an odd number of cells and the other even (a 2×1 cabinet),
 * swapping them moves each centre between "on a grid line" and "mid-cell", so it must shift by
 * half a cell (0.25 m). It shifts forward going to 90°/270° and back going to 0°/180°, so
 * rotating twice or four times returns exactly to the start instead of drifting.
 * A 180° turn keeps the same footprint, so it never shifts.
 * Near a wall the result is clamped inside the floor.
 */
export function rotatedPosition(item: PlacedItem, rotation: QuarterTurns): Position {
  const { widthCells, depthCells } = CATALOG[item.typeId]
  const mixedParity = (widthCells + depthCells) % 2 === 1
  const sidesSwap = (item.rotation + rotation) % 2 === 1 // 0°/180° ↔ 90°/270°
  const direction = rotation % 2 === 1 ? 1 : -1
  const shift = mixedParity && sidesSwap ? (direction * CELL_SIZE) / 2 : 0
  return snapItemPosition({ x: item.x + shift, z: item.z + shift }, item.typeId, rotation)
}

function snapAxis(centre: number, size: number, floorSize: number): number {
  const halfFloor = floorSize / 2
  const minEdge = clamp(snapToGrid(centre - size / 2), -halfFloor, halfFloor - size)
  return minEdge + size / 2
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
