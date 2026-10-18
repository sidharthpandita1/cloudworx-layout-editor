import { Edges, Line } from '@react-three/drei'
import { useActiveProposal } from '../assistant/assistantStore'
import { movesIn, type MoveCommand } from '../assistant/fix'
import { CATALOG } from '../domain/catalog'
import { footprintSize } from '../domain/footprint'
import { CELL_SIZE } from '../domain/grid'
import type { PlacedItem } from '../domain/types'
import { useEditorStore } from '../store/editorStore'

/** Blue, like the app's accent colour: "suggested", not "wrong" (red) or "selected" (yellow). */
const GHOST_COLOR = '#2f6fde'
const FLOOR_Y = 0.03 // just above the floor grid
const ARROW_LENGTH = 0.32

/**
 * The assistant's proposed change, before it is accepted: a see-through blue copy of each item at its
 * new spot, and a dashed arrow on the floor from where it is now. The real items don't move.
 */
export function ProposalPreview() {
  const proposal = useActiveProposal()
  const items = useEditorStore((state) => state.items)
  if (!proposal) return null
  return movesIn(proposal.command).map((move) => {
    const item = items.find((candidate) => candidate.id === move.id)
    return item ? <Ghost key={move.id} item={item} move={move} /> : null
  })
}

function Ghost({ item, move }: { item: PlacedItem; move: MoveCommand }) {
  const type = CATALOG[item.typeId]
  const { from, to } = move
  const angle = Math.atan2(to.x - from.x, to.z - from.z)
  const tip = arrowTip(item, move)
  return (
    <group>
      <mesh position={[to.x, type.height / 2, to.z]} rotation-y={(item.rotation * Math.PI) / 2}>
        <boxGeometry args={[type.widthCells * CELL_SIZE, type.height, type.depthCells * CELL_SIZE]} />
        <meshStandardMaterial color={GHOST_COLOR} transparent opacity={0.35} depthWrite={false} />
        <Edges color={GHOST_COLOR} lineWidth={2} />
      </mesh>
      <Line
        points={[
          [from.x, FLOOR_Y, from.z],
          [tip.x, FLOOR_Y, tip.z],
        ]}
        color={GHOST_COLOR}
        lineWidth={2.5}
        dashed
        dashSize={0.2}
        gapSize={0.12}
      />
      {/* Arrowhead: a flat cone pointing along the move, its tip on the ghost's edge. */}
      {/* The cone points up (+y): tip it forward (+z), then turn it towards the move. */}
      <group position={[tip.x, FLOOR_Y, tip.z]} rotation={[Math.PI / 2, angle, 0, 'YXZ']}>
        <mesh position-y={-ARROW_LENGTH / 2}>
          <coneGeometry args={[0.14, ARROW_LENGTH, 16]} />
          <meshBasicMaterial color={GHOST_COLOR} />
        </mesh>
      </group>
    </group>
  )
}

/** Where the arrow meets the ghost's footprint, coming from the item's current centre. */
function arrowTip(item: PlacedItem, { from, to }: MoveCommand) {
  const { width, depth } = footprintSize(item.typeId, item.rotation)
  const dx = to.x - from.x
  const dz = to.z - from.z
  const length = Math.hypot(dx, dz)
  // Distance from the ghost's centre back to its edge along the arrow.
  const inside = Math.min(dx === 0 ? Infinity : width / 2 / Math.abs(dx / length), dz === 0 ? Infinity : depth / 2 / Math.abs(dz / length))
  const back = Math.min(inside, length) / length
  return { x: to.x - dx * back, z: to.z - dz * back }
}
