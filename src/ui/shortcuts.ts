export type ShortcutAction = 'undo' | 'redo' | 'rotate' | 'delete' | 'escape'

type KeyInput = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>

/**
 * Maps a key press to an editor action. Ctrl (Windows) and Cmd (Mac) are treated the same.
 * Redo accepts both Ctrl/Cmd+Shift+Z and Ctrl+Y (the Windows habit).
 */
export function shortcutFor(event: KeyInput): ShortcutAction | null {
  const key = event.key.toLowerCase()
  const modifier = event.ctrlKey || event.metaKey

  if (modifier && key === 'z') return event.shiftKey ? 'redo' : 'undo'
  if (modifier && key === 'y') return 'redo'
  // Leave every other modified key (Ctrl+R reload, Cmd+Backspace, ...) to the browser.
  if (modifier || event.altKey) return null

  if (key === 'r') return 'rotate'
  // The Mac key labelled "delete" sends Backspace.
  if (key === 'delete' || key === 'backspace') return 'delete'
  if (key === 'escape') return 'escape'
  return null
}

/** True while the user is typing in a field, where shortcuts like Backspace must not fire. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as Partial<HTMLElement> | null
  if (!element) return false
  return element.isContentEditable === true || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName ?? '')
}
