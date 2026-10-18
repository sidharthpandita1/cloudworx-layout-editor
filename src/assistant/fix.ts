import type { Command } from '../commands/commands'
import { footprintRect, footprintSize } from '../domain/footprint'
import { CELL_SIZE, FLOOR_DEPTH, FLOOR_WIDTH } from '../domain/grid'
import type { PlacedItem, Position } from '../domain/types'
import { findViolations, rectsTooClose, type Violation } from '../rules/clearance'

export type MoveCommand = Extract<Command, { type: 'move' }>

/** "Fix all" stops after this many moves, so one suggestion stays small enough to check by eye. */
export const MAX_MOVES = 10
/**
 * "Fix all" looks at no more than this many problems. In a packed layout most items have no clear spot
 * at all, and each search costs about 1.5 ms at 500 items, so this keeps a reply under ~0.1 s.
 */
export const MAX_TRIES = 30

/**
 * The nearest spot for `item` that is on the floor, overlaps nothing and keeps MIN_CLEARANCE from
 * every other item. Rotation is kept. Null if there is no such spot.
 *
 * Brute force: every grid position on the floor (at most 41 × 25 ≈ 1,000), nearest first, each checked
 * against every other item. About 0.5 million rectangle checks at 500 items, a few milliseconds.
 */
export function nearestClearSpot(items: PlacedItem[], item: PlacedItem): Position | null {
  const others = items.filter((other) => other.id !== item.id).map(footprintRect)
  const isClear = (position: Position) => {
    const rect = footprintRect({ ...item, ...position })
    return others.every((other) => !rectsTooClose(rect, other))
  }
  return floorPositions(item)
    .filter((position) => position.x !== item.x || position.z !== item.z) // must actually move
    .sort((p, q) => distance(item, p) - distance(item, q))
    .find(isClear) ?? null
}

/**
 * One move that fixes this violation: whichever of the two items has the shorter way to a clear spot.
 * On a tie, `preferId` (the selected item) moves. Null if neither item can move anywhere clear.
 * `noSpot` (optional) remembers items that had nowhere to go, so they are not searched again.
 */
export function fixViolation(
  items: PlacedItem[],
  violation: Violation,
  preferId?: string | null,
  noSpot = new Set<string>(),
): MoveCommand | null {
  const moves: MoveCommand[] = []
  for (const id of [violation.a, violation.b]) {
    const item = items.find((candidate) => candidate.id === id)
    if (!item || noSpot.has(id)) continue
    const to = nearestClearSpot(items, item)
    if (to) moves.push(moveCommand(item, to))
    else noSpot.add(id)
  }
  moves.sort((m, n) => moveLength(m) - moveLength(n) || Number(n.id === preferId) - Number(m.id === preferId))
  return moves[0] ?? null
}

/**
 * Moves that fix as many violations as possible, in list order, up to `maxMoves`. Each move is planned
 * on the layout as the earlier moves left it, and the moved item ends up clear of everything, so later
 * moves never undo earlier ones. `from` is always the item's position in the original layout.
 */
export function fixAllViolations(items: PlacedItem[], maxMoves = MAX_MOVES): MoveCommand[] {
  let layout = items
  const moves: MoveCommand[] = []
  // Moves only fill free space, so an item with nowhere to go stays that way: don't search it twice.
  const noSpot = new Set<string>()
  let tries = 0
  for (const violation of findViolations(items)) {
    if (moves.length >= maxMoves || tries >= MAX_TRIES) break
    // An earlier move may have fixed this pair already.
    const pair = layout.filter((item) => item.id === violation.a || item.id === violation.b)
    if (findViolations(pair).length === 0) continue
    tries += 1
    const move = fixViolation(layout, violation, null, noSpot)
    if (!move) continue
    moves.push(move)
    layout = layout.map((item) => (item.id === move.id ? { ...item, ...move.to } : item))
  }
  return moves
}

/** The moves inside a command (a single move, or the moves in a batch). */
export function movesIn(command: Command): MoveCommand[] {
  if (command.type === 'move') return [command]
  if (command.type === 'batch') return command.commands.flatMap(movesIn)
  return []
}

export function moveLength(move: MoveCommand): number {
  return distance(move.from, move.to)
}

/** Every position where the item's footprint fits on the floor, on the same grid as the item now. */
function floorPositions(item: PlacedItem): Position[] {
  const { width, depth } = footprintSize(item.typeId, item.rotation)
  const positions: Position[] = []
  // Stepping whole cells from the current centre keeps the footprint's edges on grid lines.
  const steps = (centre: number, size: number, floorSize: number) => {
    const min = -floorSize / 2 + size / 2
    const max = floorSize / 2 - size / 2
    const values: number[] = []
    for (let value = centre - Math.floor((centre - min) / CELL_SIZE) * CELL_SIZE; value <= max + 1e-9; value += CELL_SIZE) {
      values.push(value)
    }
    return values
  }
  for (const x of steps(item.x, width, FLOOR_WIDTH)) {
    for (const z of steps(item.z, depth, FLOOR_DEPTH)) positions.push({ x, z })
  }
  return positions
}

function moveCommand(item: PlacedItem, to: Position): MoveCommand {
  return { type: 'move', id: item.id, from: { x: item.x, z: item.z }, to }
}

function distance(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.z - b.z)
}
