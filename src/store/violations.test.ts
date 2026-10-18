import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore'
import { selectViolations } from './violations'

const store = useEditorStore
const violations = () => selectViolations(store.getState())

beforeEach(() => {
  store.setState(store.getInitialState(), true)
  // Two drives 2 m apart: no violation.
  store.getState().placeItem('drive', { x: 0.25, z: 0.25 })
  store.getState().placeItem('drive', { x: 2.25, z: 0.25 })
})

describe('selectViolations', () => {
  it('follows edits, undo and redo', () => {
    expect(violations().violations).toEqual([])
    store.getState().moveItem('drive-2', { x: 0.75, z: 0.25 }) // touching
    expect([...violations().violatingIds]).toEqual(['drive-1', 'drive-2'])
    store.getState().undo()
    expect(violations().violations).toEqual([])
    store.getState().redo()
    expect(violations().violations).toHaveLength(1)
  })

  it('updates live during a drag and clears when the drag is cancelled', () => {
    store.getState().startDrag('drive-2')
    store.getState().updateDrag({ x: 0.75, z: 0.25 })
    expect(violations().violations).toHaveLength(1)
    expect(store.getState().past).toHaveLength(2) // still only the two adds
    store.getState().cancelDrag()
    expect(violations().violations).toEqual([])
  })

  it('returns the same object until items or the drag change', () => {
    const first = violations()
    store.getState().select('drive-1') // not an edit
    expect(violations()).toBe(first)
    store.getState().moveItem('drive-2', { x: 4.25, z: 0.25 })
    expect(violations()).not.toBe(first)
  })
})
