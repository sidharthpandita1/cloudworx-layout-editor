import { Grid } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useState } from 'react'
import { snapItemPosition } from '../domain/footprint'
import { CELL_SIZE, FLOOR_DEPTH, FLOOR_WIDTH } from '../domain/grid'
import type { Position } from '../domain/types'
import { findBlockingItem } from '../rules/overlap'
import { useEditorStore } from '../store/editorStore'
import { CLICK_TOLERANCE_PX } from './interaction'
import { PlacementPreview } from './PlacementPreview'

/**
 * The 20 m × 12 m floor with 0.5 m cells and a darker line every metre.
 * With a palette item armed, it shows a placement preview and places on click;
 * otherwise a click on empty floor clears the selection.
 */
export function Floor() {
  const activeTool = useEditorStore((state) => state.activeTool)
  const items = useEditorStore((state) => state.items)
  const placeItem = useEditorStore((state) => state.placeItem)
  const select = useEditorStore((state) => state.select)

  // Where the preview is drawn. Local, short-lived state: it never goes into the store or history.
  const [hover, setHover] = useState<Position | null>(null)

  // Re-snap for the current tool, in case the tool changed since the pointer last moved.
  const preview = activeTool && hover ? snapItemPosition(hover, activeTool, 0) : null
  const previewBlocked =
    activeTool !== null &&
    preview !== null &&
    findBlockingItem(items, { id: 'preview', typeId: activeTool, number: 0, ...preview, rotation: 0 }) !== undefined

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    if (!activeTool) return
    const snapped = snapItemPosition({ x: event.point.x, z: event.point.z }, activeTool, 0)
    // Only re-render when the preview actually moves to another cell.
    setHover((current) => (current && current.x === snapped.x && current.z === snapped.z ? current : snapped))
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    if (event.delta > CLICK_TOLERANCE_PX) return // it was a camera drag, not a click
    if (activeTool) {
      placeItem(activeTool, { x: event.point.x, z: event.point.z }) // the tool stays armed
    } else {
      select(null)
    }
  }

  return (
    <group>
      <mesh
        name="floor"
        rotation-x={-Math.PI / 2}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHover(null)}
        onClick={handleClick}
      >
        <planeGeometry args={[FLOOR_WIDTH, FLOOR_DEPTH]} />
        <meshStandardMaterial color="#eef1f5" />
      </mesh>
      <Grid
        args={[FLOOR_WIDTH, FLOOR_DEPTH]}
        position-y={0.001}
        cellSize={CELL_SIZE}
        cellColor="#c3cad5"
        sectionSize={1}
        sectionColor="#8893a5"
        fadeDistance={200}
      />
      {activeTool && preview && <PlacementPreview typeId={activeTool} position={preview} blocked={previewBlocked} />}
    </group>
  )
}
