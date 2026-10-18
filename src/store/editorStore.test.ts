import { beforeEach, describe, expect, it } from 'vitest'
import { HISTORY_LIMIT, useEditorStore } from './editorStore'

const store = useEditorStore

beforeEach(() => {
  store.setState(store.getInitialState(), true)
})

describe('placeItem', () => {
  it('adds items with per-type numbers and selects the new item', () => {
    store.getState().placeItem('cabinet', { x: 1, z: 2 })
    store.getState().placeItem('cabinet', { x: 3, z: 2 })
    store.getState().placeItem('drive', { x: 0, z: 0 })

    const { items, selectedId } = store.getState()
    expect(items.map((item) => item.id)).toEqual(['cabinet-1', 'cabinet-2', 'drive-1'])
    expect(selectedId).toBe('drive-1')
  })

  it('never reuses a number after undo', () => {
    store.getState().placeItem('cabinet', { x: 0, z: 0 })
    store.getState().undo()
    store.getState().placeItem('cabinet', { x: 0, z: 0 })
    expect(store.getState().items[0].id).toBe('cabinet-2')
  })
})

describe('undo and redo', () => {
  it('undo reverts each edit in order, redo re-applies it', () => {
    // A 1×1 drive sits mid-cell and does not shift when rotated, which keeps the numbers simple.
    store.getState().placeItem('drive', { x: 0.25, z: 0.25 })
    store.getState().moveItem('drive-1', { x: 2.25, z: 1.25 })
    store.getState().rotateItem('drive-1')

    store.getState().undo()
    expect(store.getState().items[0]).toMatchObject({ x: 2.25, z: 1.25, rotation: 0 })
    store.getState().undo()
    expect(store.getState().items[0]).toMatchObject({ x: 0.25, z: 0.25 })
    store.getState().undo()
    expect(store.getState().items).toEqual([])

    store.getState().redo()
    store.getState().redo()
    store.getState().redo()
    expect(store.getState().items[0]).toMatchObject({ x: 2.25, z: 1.25, rotation: 1 })
  })

  it('a new edit clears the redo stack', () => {
    store.getState().placeItem('drive', { x: 0, z: 0 })
    store.getState().undo()
    expect(store.getState().future).toHaveLength(1)

    store.getState().placeItem('cabinet', { x: 1, z: 1 })
    expect(store.getState().future).toEqual([])
  })

  it('does nothing when there is nothing to undo or redo', () => {
    const before = store.getState()
    store.getState().undo()
    store.getState().redo()
    expect(store.getState()).toBe(before)
  })

  it('clears the selection when undo removes the selected item', () => {
    store.getState().placeItem('cabinet', { x: 0, z: 0 })
    expect(store.getState().selectedId).toBe('cabinet-1')
    store.getState().undo()
    expect(store.getState().selectedId).toBeNull()
  })

  it('selection changes are not recorded in history', () => {
    store.getState().placeItem('cabinet', { x: 0, z: 0 })
    store.getState().select(null)
    store.getState().select('cabinet-1')
    expect(store.getState().past).toHaveLength(1)
  })

  it(`keeps at most ${HISTORY_LIMIT} edits, dropping the oldest`, () => {
    store.getState().placeItem('cabinet', { x: 0, z: 0 })
    // Alternate between x = 1 and x = 2 so every move is real and stays inside the floor.
    for (let step = 1; step <= HISTORY_LIMIT + 4; step++) {
      store.getState().moveItem('cabinet-1', { x: step % 2 === 0 ? 2 : 1, z: 0 })
    }
    expect(store.getState().past).toHaveLength(HISTORY_LIMIT)

    // 205 edits were made (1 add + 204 moves); only the last 200 moves can be undone,
    // so undoing everything stops at the position after move 4 (x = 2), not at the start (x = 0).
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) store.getState().undo()
    expect(store.getState().items[0].x).toBe(2)
  })
})

describe('snapping in the store', () => {
  it('placeItem snaps to the grid and clamps inside the floor', () => {
    store.getState().placeItem('cabinet', { x: 50, z: -50 })
    expect(store.getState().items[0]).toMatchObject({ x: 9.5, z: -5.75 })
  })

  it('moveItem snaps an off-grid position', () => {
    store.getState().placeItem('drive', { x: 0, z: 0 })
    store.getState().moveItem('drive-1', { x: 1.1, z: -0.4 })
    expect(store.getState().items[0]).toMatchObject({ x: 1.25, z: -0.25 })
  })

  it('rotating a 2×1 cabinet shifts it half a cell, and one undo restores both', () => {
    store.getState().placeItem('cabinet', { x: 1, z: -0.25 })
    store.getState().rotateItem('cabinet-1')
    expect(store.getState().items[0]).toMatchObject({ x: 1.25, z: 0, rotation: 1 })
    expect(store.getState().past).toHaveLength(2) // add + one batch

    store.getState().undo()
    expect(store.getState().items[0]).toMatchObject({ x: 1, z: -0.25, rotation: 0 })
  })

  it('rotateItem can jump straight to a chosen angle, as one undo step', () => {
    store.getState().placeItem('cabinet', { x: 1, z: -0.25 })
    store.getState().rotateItem('cabinet-1', 3)
    expect(store.getState().items[0]).toMatchObject({ x: 1.25, z: 0, rotation: 3 })
    store.getState().rotateItem('cabinet-1', 1) // 180° turn: same footprint, no shift
    expect(store.getState().items[0]).toMatchObject({ x: 1.25, z: 0, rotation: 1 })
    expect(store.getState().past).toHaveLength(3)

    store.getState().undo()
    store.getState().undo()
    expect(store.getState().items[0]).toMatchObject({ x: 1, z: -0.25, rotation: 0 })
  })

  it('rotating to the current angle records nothing', () => {
    store.getState().placeItem('cabinet', { x: 1, z: -0.25 })
    store.getState().rotateItem('cabinet-1', 0)
    expect(store.getState().past).toHaveLength(1)
  })

  it('rotating a cabinet four times returns it exactly to the start', () => {
    store.getState().placeItem('cabinet', { x: 1, z: -0.25 })
    for (let i = 0; i < 4; i++) store.getState().rotateItem('cabinet-1')
    expect(store.getState().items[0]).toMatchObject({ x: 1, z: -0.25, rotation: 0 })
  })
})

describe('edit helpers', () => {
  it('moving to the same snapped position records nothing', () => {
    store.getState().placeItem('cabinet', { x: 1, z: 1 })
    store.getState().moveItem('cabinet-1', { x: 1, z: 1 }) // snaps to the cell it is already in
    expect(store.getState().past).toHaveLength(1)
  })

  it('rotation wraps from 270° back to 0°', () => {
    store.getState().placeItem('drive', { x: 0, z: 0 })
    for (let i = 0; i < 4; i++) store.getState().rotateItem('drive-1')
    expect(store.getState().items[0].rotation).toBe(0)
  })

  it('delete then undo restores the item at its original list position', () => {
    const { placeItem } = store.getState()
    placeItem('cabinet', { x: 0, z: 0 })
    placeItem('drive', { x: 1, z: 0 })
    placeItem('transformer', { x: 2, z: 0 })

    store.getState().deleteItem('drive-1')
    expect(store.getState().items.map((item) => item.id)).toEqual(['cabinet-1', 'transformer-1'])

    store.getState().undo()
    expect(store.getState().items.map((item) => item.id)).toEqual(['cabinet-1', 'drive-1', 'transformer-1'])
  })

  it('edits to an unknown id are ignored', () => {
    store.getState().moveItem('missing', { x: 1, z: 1 })
    store.getState().rotateItem('missing')
    store.getState().deleteItem('missing')
    expect(store.getState().past).toEqual([])
  })
})

describe('dragging', () => {
  beforeEach(() => {
    store.getState().placeItem('drive', { x: 0.25, z: 0.25 })
  })

  it('startDrag begins at the item position', () => {
    store.getState().startDrag('drive-1')
    expect(store.getState().drag).toEqual({
      id: 'drive-1',
      position: { x: 0.25, z: 0.25 },
      target: { x: 0.25, z: 0.25 },
    })
  })

  it('updateDrag snaps and clamps the live position, and records no history', () => {
    store.getState().startDrag('drive-1')
    store.getState().updateDrag({ x: 3.1, z: -0.4 })
    expect(store.getState().drag?.position).toEqual({ x: 3.25, z: -0.25 })
    store.getState().updateDrag({ x: 99, z: 0 })
    expect(store.getState().drag?.position).toEqual({ x: 9.75, z: 0.25 })
    expect(store.getState().past).toHaveLength(1) // only the add
    expect(store.getState().items[0]).toMatchObject({ x: 0.25, z: 0.25 }) // the layout is unchanged
  })

  it('endDrag records the whole drag as one move, and one undo puts it back', () => {
    store.getState().startDrag('drive-1')
    store.getState().updateDrag({ x: 1.1, z: 0.1 })
    store.getState().updateDrag({ x: 2.1, z: 1.1 })
    store.getState().updateDrag({ x: 4.1, z: 2.1 })
    store.getState().endDrag()

    expect(store.getState().drag).toBeNull()
    expect(store.getState().items[0]).toMatchObject({ x: 4.25, z: 2.25 })
    expect(store.getState().past).toHaveLength(2) // add + one move

    store.getState().undo()
    expect(store.getState().items[0]).toMatchObject({ x: 0.25, z: 0.25 })
  })

  it('a drag that ends where it started records nothing', () => {
    store.getState().startDrag('drive-1')
    store.getState().updateDrag({ x: 3, z: 3 })
    store.getState().updateDrag({ x: 0.3, z: 0.3 })
    store.getState().endDrag()
    expect(store.getState().past).toHaveLength(1)
  })

  it('cancelDrag puts the item back and records nothing', () => {
    store.getState().startDrag('drive-1')
    store.getState().updateDrag({ x: 5, z: 5 })
    store.getState().cancelDrag()
    store.getState().endDrag() // the pointer is released after Esc: must do nothing
    expect(store.getState().drag).toBeNull()
    expect(store.getState().items[0]).toMatchObject({ x: 0.25, z: 0.25 })
    expect(store.getState().past).toHaveLength(1)
  })

  it('updateDrag without a drag, and startDrag with an unknown id, do nothing', () => {
    store.getState().updateDrag({ x: 5, z: 5 })
    store.getState().startDrag('missing')
    expect(store.getState().drag).toBeNull()
  })
})

describe('items never overlap', () => {
  // Cabinet spans x −0.5…0.5, z 0…0.5. Drive-1 starts well away from it.
  beforeEach(() => {
    store.getState().placeItem('cabinet', { x: 0, z: 0.25 })
    store.getState().placeItem('drive', { x: 3.25, z: 0.25 })
  })

  it('refuses to place on top of another item, shows a notice and keeps the number free', () => {
    store.getState().placeItem('drive', { x: 0.25, z: 0.25 })
    const { items, past, notice, nextNumber } = store.getState()
    expect(items).toHaveLength(2)
    expect(past).toHaveLength(2)
    expect(notice).toMatchObject({ message: 'blocked.position', blocker: { typeId: 'cabinet', number: 1 } })
    expect(nextNumber.drive).toBe(2)
  })

  it('allows touching', () => {
    store.getState().placeItem('drive', { x: 0.75, z: 0.25 })
    expect(store.getState().items).toHaveLength(3)
    expect(store.getState().notice).toBeNull()
  })

  it('refuses a move onto another item', () => {
    store.getState().moveItem('drive-1', { x: 0.25, z: 0.25 })
    expect(store.getState().items[1]).toMatchObject({ x: 3.25, z: 0.25 })
    expect(store.getState().past).toHaveLength(2)
    expect(store.getState().notice?.message).toBe('blocked.position')
  })

  it('refuses a rotation that would reach another item', () => {
    // A drive just in front of the cabinet: touching at 0°, but the turned cabinet is 1 m deep.
    store.getState().moveItem('drive-1', { x: 0.25, z: 0.75 })
    store.getState().rotateItem('cabinet-1')
    expect(store.getState().items[0].rotation).toBe(0)
    expect(store.getState().notice?.message).toBe('blocked.rotation')
  })

  it('a drag skips occupied cells and drops at the last free one', () => {
    store.getState().startDrag('drive-1')
    store.getState().updateDrag({ x: 1.25, z: 0.25 }) // free
    store.getState().updateDrag({ x: 0.25, z: 0.25 }) // on the cabinet
    expect(store.getState().drag?.position).toEqual({ x: 1.25, z: 0.25 })
    expect(store.getState().notice?.message).toBe('blocked.position')

    const firstNotice = store.getState().notice
    store.getState().endDrag() // released over the cabinet
    expect(store.getState().items[1]).toMatchObject({ x: 1.25, z: 0.25 })
    expect(store.getState().notice).not.toBe(firstNotice) // the warning pops up again
    expect(store.getState().past).toHaveLength(3) // one move
  })

  it('undo never brings back an overlap, because every recorded state was free', () => {
    store.getState().moveItem('drive-1', { x: 1.25, z: 0.25 })
    store.getState().moveItem('drive-1', { x: 0.25, z: 0.25 }) // refused
    store.getState().undo()
    expect(store.getState().items[1]).toMatchObject({ x: 3.25, z: 0.25 })
  })
})

describe('loadLayout', () => {
  it('replaces the layout and starts with empty history', () => {
    store.getState().placeItem('cabinet', { x: 0, z: 0.25 })
    store.getState().loadLayout([{ id: 'drive-4', typeId: 'drive', number: 4, x: 0.25, z: 0.25, rotation: 0 }])
    const { items, past, future, selectedId } = store.getState()
    expect(items.map((item) => item.id)).toEqual(['drive-4'])
    expect([past, future, selectedId]).toEqual([[], [], null])

    store.getState().undo() // nothing to undo
    expect(store.getState().items).toHaveLength(1)
    store.getState().placeItem('drive', { x: 3.25, z: 0.25 })
    expect(store.getState().items[1].id).toBe('drive-5') // numbering continues after the loaded items
  })
})

describe('keyboard moves and announcements', () => {
  beforeEach(() => {
    store.getState().placeItem('drive', { x: 0.25, z: 0.25 })
  })

  it('nudgeItem moves one step and is one undo step', () => {
    store.getState().nudgeItem('drive-1', { x: 0.5, z: 0 })
    store.getState().nudgeItem('drive-1', { x: 0, z: -0.5 })
    expect(store.getState().items[0]).toMatchObject({ x: 0.75, z: -0.25 })
    store.getState().undo()
    expect(store.getState().items[0]).toMatchObject({ x: 0.75, z: 0.25 })
  })

  it('announces when the wall stops a move, and records nothing', () => {
    store.getState().moveItem('drive-1', { x: 9.75, z: 0.25 }) // against the right wall
    store.getState().nudgeItem('drive-1', { x: 0.5, z: 0 })
    expect(store.getState().announcement).toMatchObject({ kind: 'wall', itemId: 'drive-1' })
    expect(store.getState().past).toHaveLength(2)
  })

  it('a move onto another item is refused with the usual notice', () => {
    store.getState().placeItem('drive', { x: 0.75, z: 0.25 })
    store.getState().nudgeItem('drive-2', { x: -0.5, z: 0 })
    expect(store.getState().items[1]).toMatchObject({ x: 0.75 })
    expect(store.getState().notice?.message).toBe('blocked.position')
  })

  it('announces edits with the command that was applied, including undo and redo', () => {
    store.getState().nudgeItem('drive-1', { x: 0.5, z: 0 })
    expect(store.getState().announcement).toMatchObject({ kind: 'edit', via: 'edit', command: { type: 'move', to: { x: 0.75 } } })
    store.getState().undo()
    expect(store.getState().announcement).toMatchObject({ kind: 'edit', via: 'undo', command: { type: 'move', to: { x: 0.25 } } })
    store.getState().redo()
    expect(store.getState().announcement).toMatchObject({ kind: 'edit', via: 'redo', command: { type: 'move', to: { x: 0.75 } } })
  })

  it('announces selection changes, but not re-selecting the same item', () => {
    store.getState().select(null)
    expect(store.getState().announcement?.kind).toBe('deselected')
    store.getState().select('drive-1')
    const selected = store.getState().announcement
    expect(selected).toMatchObject({ kind: 'selected', itemId: 'drive-1' })
    store.getState().select('drive-1')
    expect(store.getState().announcement).toBe(selected)
  })
})
