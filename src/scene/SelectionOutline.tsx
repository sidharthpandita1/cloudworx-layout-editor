import { Edges } from '@react-three/drei'
import { CATALOG } from '../domain/catalog'
import { CELL_SIZE } from '../domain/grid'
import { useEditorStore } from '../store/editorStore'

// Slightly larger than the item so the outline is not hidden inside its faces.
const PADDING = 0.06

/**
 * A thick outline around the selected item. Selection uses an outline rather than a colour so it
 * stays readable when the clearance rule later colours violating items red.
 */
export function SelectionOutline() {
  const item = useEditorStore((state) => state.items.find((candidate) => candidate.id === state.selectedId))
  const drag = useEditorStore((state) => state.drag)
  if (!item) return null

  const type = CATALOG[item.typeId]
  // Follow the item while it is being dragged.
  const { x, z } = drag?.id === item.id ? drag.position : item
  return (
    <mesh position={[x, type.height / 2, z]} rotation-y={(item.rotation * Math.PI) / 2}>
      <boxGeometry
        args={[type.widthCells * CELL_SIZE + PADDING, type.height + PADDING, type.depthCells * CELL_SIZE + PADDING]}
      />
      {/* The box itself is invisible; only its edges are drawn. */}
      <meshBasicMaterial visible={false} />
      <Edges lineWidth={3} color="#ffb800" />
    </mesh>
  )
}
