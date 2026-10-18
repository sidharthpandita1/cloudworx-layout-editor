import { useThree, type ThreeEvent } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Object3D, type InstancedMesh } from 'three'
import { ITEM_TYPES } from '../domain/catalog'
import { CELL_SIZE } from '../domain/grid'
import { groupItemsByType } from '../domain/items'
import type { ItemType, PlacedItem, Position } from '../domain/types'
import { useEditorStore } from '../store/editorStore'
import { CLICK_TOLERANCE_PX, floorPointFromRay } from './interaction'

/** Instances allocated per type: the brief's maximum scene size. See docs/ASSUMPTIONS.md. */
const CAPACITY_PER_TYPE = 2000

/** Draws every placed item: one InstancedMesh (one draw call) per item type. */
export function Items() {
  const items = useEditorStore((state) => state.items)
  const groups = useMemo(() => groupItemsByType(items), [items])
  return ITEM_TYPES.map((type) => <ItemInstances key={type.id} type={type} items={groups[type.id]} />)
}

// Reused scratch object for building instance matrices.
const scratch = new Object3D()

function ItemInstances({ type, items }: { type: ItemType; items: PlacedItem[] }) {
  const meshRef = useRef<InstancedMesh>(null)
  const drag = useEditorStore((state) => state.drag)
  const { select, startDrag, updateDrag, endDrag } = useEditorStore.getState()
  const getThree = useThree((state) => state.get)
  // Pointer-to-item-centre offset at the moment of grabbing, so the item doesn't jump to the cursor.
  const grabOffset = useRef<Position | null>(null)

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const count = Math.min(items.length, CAPACITY_PER_TYPE)
    for (let i = 0; i < count; i++) {
      const item = items[i]
      // The item being dragged is drawn at its live drag position.
      const { x, z } = drag?.id === item.id ? drag.position : item
      scratch.position.set(x, type.height / 2, z)
      scratch.rotation.set(0, (item.rotation * Math.PI) / 2, 0)
      scratch.updateMatrix()
      mesh.setMatrixAt(i, scratch.matrix)
    }
    mesh.count = count
    mesh.instanceMatrix.needsUpdate = true
    // three.js computes this once and caches it; without a refresh, clicks and camera culling
    // would ignore newly placed or moved items.
    mesh.computeBoundingSphere()
  }, [items, type, drag])

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    // While placing, let the press fall through to the floor so items can be placed anywhere.
    if (useEditorStore.getState().activeTool) return
    const item = event.instanceId === undefined ? undefined : items[event.instanceId]
    const point = floorPointFromRay(event.ray)
    if (!item || !point) return
    event.stopPropagation()

    // Select and start dragging in one motion.
    select(item.id)
    startDrag(item.id)
    grabOffset.current = { x: item.x - point.x, z: item.z - point.z }
    // Keep receiving pointer events even when the pointer leaves this mesh.
    const target = event.target as Element
    target.setPointerCapture(event.pointerId)
    setCameraControlsEnabled(false)
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    const offset = grabOffset.current
    // No drag, or it was cancelled with Esc.
    if (!offset || !useEditorStore.getState().drag) return
    const point = floorPointFromRay(event.ray)
    if (point) updateDrag({ x: point.x + offset.x, z: point.z + offset.z })
  }

  function finishDrag(event: ThreeEvent<PointerEvent>, commit: boolean) {
    if (!grabOffset.current) return
    grabOffset.current = null
    const target = event.target as Element
    target.releasePointerCapture(event.pointerId)
    setCameraControlsEnabled(true)
    if (commit) endDrag()
    else useEditorStore.getState().cancelDrag()
  }

  /** The camera controls (OrbitControls with makeDefault) are switched off while an item is dragged. */
  function setCameraControlsEnabled(enabled: boolean) {
    const controls = getThree().controls as { enabled: boolean } | null
    if (controls) controls.enabled = enabled
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    // Selection happens on press; this only stops the floor underneath from clearing it.
    if (event.delta > CLICK_TOLERANCE_PX || useEditorStore.getState().activeTool) return
    event.stopPropagation()
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, CAPACITY_PER_TYPE]}
      name={`items-${type.id}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishDrag(event, true)}
      onPointerCancel={(event) => finishDrag(event, false)}
      onClick={handleClick}
    >
      <boxGeometry args={[type.widthCells * CELL_SIZE, type.height, type.depthCells * CELL_SIZE]} />
      <meshStandardMaterial color={type.color} />
    </instancedMesh>
  )
}
