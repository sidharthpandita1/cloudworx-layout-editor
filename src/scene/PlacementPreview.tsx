import { CATALOG } from '../domain/catalog'
import { CELL_SIZE } from '../domain/grid'
import type { ItemTypeId, Position } from '../domain/types'

/** Translucent "ghost" of the armed palette item, at the exact snapped spot a click would place it. */
export function PlacementPreview({ typeId, position }: { typeId: ItemTypeId; position: Position }) {
  const type = CATALOG[typeId]
  return (
    <mesh position={[position.x, type.height / 2, position.z]}>
      <boxGeometry args={[type.widthCells * CELL_SIZE, type.height, type.depthCells * CELL_SIZE]} />
      <meshStandardMaterial color={type.color} transparent opacity={0.4} depthWrite={false} />
    </mesh>
  )
}
