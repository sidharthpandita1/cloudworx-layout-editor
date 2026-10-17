/** Floor and grid dimensions in metres. The floor is centred on the world origin. */
export const FLOOR_WIDTH = 20 // along x: -10 … 10
export const FLOOR_DEPTH = 12 // along z: -6 … 6
export const CELL_SIZE = 0.5

/** Snaps a coordinate to the nearest grid line (a multiple of CELL_SIZE). */
export function snapToGrid(value: number): number {
  return Math.round(value / CELL_SIZE) * CELL_SIZE
}
