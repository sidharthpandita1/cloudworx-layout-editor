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
    const { placeItem } = store.getState()
    placeItem('cabinet', { x: 0, z: 0 })
    store.getState().moveItem('cabinet-1', { x: 2, z: 1 })
    store.getState().rotateItem('cabinet-1')

    store.getState().undo()
    expect(store.getState().items[0]).toMatchObject({ x: 2, z: 1, rotation: 0 })
    store.getState().undo()
    expect(store.getState().items[0]).toMatchObject({ x: 0, z: 0 })
    store.getState().undo()
    expect(store.getState().items).toEqual([])

    store.getState().redo()
    store.getState().redo()
    store.getState().redo()
    expect(store.getState().items[0]).toMatchObject({ x: 2, z: 1, rotation: 1 })
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
    for (let step = 1; step <= HISTORY_LIMIT + 4; step++) {
      store.getState().moveItem('cabinet-1', { x: step, z: 0 })
    }
    expect(store.getState().past).toHaveLength(HISTORY_LIMIT)

    // 205 edits were made (1 add + 204 moves); only the last 200 moves can be undone.
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) store.getState().undo()
    expect(store.getState().items[0].x).toBe(4)
  })
})

describe('edit helpers', () => {
  it('moving to the same position records nothing', () => {
    store.getState().placeItem('cabinet', { x: 1, z: 1 })
    store.getState().moveItem('cabinet-1', { x: 1, z: 1 })
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
