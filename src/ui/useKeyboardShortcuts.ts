import { useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'
import { isInListbox, isTypingTarget, moveFor, shortcutFor } from './shortcuts'

/** Global editor shortcuts. The key → action mapping lives in `shortcutFor` and `moveFor` (unit-tested). */
export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // The shortcuts dialog handles its own keys (Esc closes it, Tab stays inside).
      if (isTypingTarget(event.target) || useEditorStore.getState().shortcutsOpen) return

      // Arrow keys move the selected item one cell, except in the list, where they change the selection.
      const move = isInListbox(event.target) ? null : moveFor(event)
      if (move) {
        const { drag, selectedId, nudgeItem } = useEditorStore.getState()
        if (drag || !selectedId) return // nothing to move: let the arrow scroll the page as usual
        event.preventDefault()
        nudgeItem(selectedId, move)
        return
      }

      const action = shortcutFor(event)
      if (!action) return
      const state = useEditorStore.getState()
      // During a drag only Esc works: finish or cancel the drag before editing anything else.
      if (state.drag && action !== 'escape') return
      event.preventDefault()

      switch (action) {
        case 'undo':
          state.undo()
          break
        case 'redo':
          state.redo()
          break
        case 'rotate':
          if (state.selectedId) state.rotateItem(state.selectedId)
          break
        case 'delete':
          if (state.selectedId) state.deleteItem(state.selectedId)
          break
        case 'help':
          state.setShortcutsOpen(true)
          break
        case 'escape':
          // Esc backs out one level at a time: drag, then placing, then selection.
          if (state.drag) state.cancelDrag()
          else if (state.activeTool) state.setActiveTool(null)
          else state.select(null)
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
