import { withDragPosition } from '../domain/items'
import { findViolations, violatingIds, type Violation } from '../rules/clearance'
import { useEditorStore, type EditorStore } from './editorStore'

export interface ViolationState {
  violations: Violation[]
  violatingIds: Set<string>
}

// The last result, kept with the inputs it came from.
let cache: { items: EditorStore['items']; drag: EditorStore['drag']; result: ViolationState } | null = null

/**
 * Clearance violations for the layout as it looks right now (a dragged item counts at its live
 * position). Derived from the store, never stored in it.
 *
 * The 3D view, the item list and the clearance panel all read this. The result is cached on the
 * `items` and `drag` objects, so the rule runs once per change, not once per reader, and readers
 * get the same object back (no extra re-renders) until something actually moves.
 */
export function selectViolations(state: EditorStore): ViolationState {
  if (cache && cache.items === state.items && cache.drag === state.drag) return cache.result
  const violations = findViolations(withDragPosition(state.items, state.drag))
  const result = { violations, violatingIds: violatingIds(violations) }
  cache = { items: state.items, drag: state.drag, result }
  return result
}

export function useViolations(): ViolationState {
  return useEditorStore(selectViolations)
}
