import { useEditorStore } from '../store/editorStore'
import { useTranslate } from './useTranslate'

/** Undo, redo, rotate and delete. Each matches a keyboard shortcut and is disabled when it can't act. */
export function Toolbar() {
  const t = useTranslate()
  const canUndo = useEditorStore((state) => state.past.length > 0)
  const canRedo = useEditorStore((state) => state.future.length > 0)
  const selectedId = useEditorStore((state) => state.selectedId)
  const isDragging = useEditorStore((state) => state.drag !== null)
  const { undo, redo, rotateItem, deleteItem } = useEditorStore.getState()

  return (
    <div className="toolbar" role="group" aria-label={t('toolbar.label')}>
      <button
        type="button"
        onClick={undo}
        disabled={!canUndo || isDragging}
        title={`${t('toolbar.undo')} (Ctrl/⌘+Z)`}
        aria-keyshortcuts="Control+Z Meta+Z"
      >
        {t('toolbar.undo')}
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={!canRedo || isDragging}
        title={`${t('toolbar.redo')} (Ctrl/⌘+Shift+Z, Ctrl+Y)`}
        aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
      >
        {t('toolbar.redo')}
      </button>
      <button
        type="button"
        onClick={() => selectedId && rotateItem(selectedId)}
        disabled={!selectedId || isDragging}
        title={`${t('toolbar.rotate')} (R)`}
        aria-keyshortcuts="R"
      >
        {t('toolbar.rotate')}
      </button>
      <button
        type="button"
        onClick={() => selectedId && deleteItem(selectedId)}
        disabled={!selectedId || isDragging}
        title={`${t('toolbar.delete')} (Delete)`}
        aria-keyshortcuts="Delete Backspace"
      >
        {t('toolbar.delete')}
      </button>
    </div>
  )
}
