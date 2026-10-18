import { CATALOG } from '../domain/catalog'
import { CELL_SIZE } from '../domain/grid'
import type { ItemTypeId, Position } from '../domain/types'

/** Colour of the ghost over an occupied spot, where a click would be refused. */
const BLOCKED_COLOR = '#d93636'

/**
 * Translucent "ghost" of the armed palette item, at the exact snapped spot a click would place it.
 * Red when another item is in the way.
 */
export function PlacementPreview({ typeId, position, blocked }: { typeId: ItemTypeId; position: Position; blocked: boolean }) {
  const type = CATALOG[typeId]
  return (
    <mesh position={[position.x, type.height / 2, position.z]}>
      <boxGeometry args={[type.widthCells * CELL_SIZE, type.height, type.depthCells * CELL_SIZE]} />
      {/* More solid when blocked, so the red still reads as red over the item underneath. */}
      <meshStandardMaterial
        color={blocked ? BLOCKED_COLOR : type.color}
        transparent
        opacity={blocked ? 0.7 : 0.4}
        depthWrite={false}
      />
    </mesh>
  )
}
