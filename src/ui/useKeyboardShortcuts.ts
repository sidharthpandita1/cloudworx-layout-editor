import { useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'
import { isTypingTarget, shortcutFor } from './shortcuts'

/** Global editor shortcuts. The key → action mapping lives in `shortcutFor` (unit-tested). */
export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return
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
