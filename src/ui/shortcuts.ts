import { CELL_SIZE } from '../domain/grid'
import type { Position } from '../domain/types'

export type ShortcutAction = 'undo' | 'redo' | 'rotate' | 'delete' | 'escape' | 'help'

/** Shift + arrow moves this far (4 cells); a plain arrow moves one cell. */
export const BIG_MOVE = 2

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
  if (key === '?') return 'help' // Shift + / on most keyboards: the usual "show shortcuts" key
  return null
}

/**
 * How far an arrow key moves the selected item, along the fixed floor axes:
 * ←/→ along x, ↑ towards the back wall (−z), ↓ towards the front (+z). Shift moves 2 m.
 * Returns null for other keys, and for Ctrl/Cmd/Alt + arrow (left to the browser and screen readers).
 */
export function moveFor(event: KeyInput): Position | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null
  const step = event.shiftKey ? BIG_MOVE : CELL_SIZE
  switch (event.key) {
    case 'ArrowLeft':
      return { x: -step, z: 0 }
    case 'ArrowRight':
      return { x: step, z: 0 }
    case 'ArrowUp':
      return { x: 0, z: -step }
    case 'ArrowDown':
      return { x: 0, z: step }
    default:
      return null
  }
}

/** True when keyboard focus is inside the placed-items list, where ↑/↓ change the selection instead. */
export function isInListbox(target: EventTarget | null): boolean {
  const element = target as Partial<Element> | null
  return typeof element?.closest === 'function' && element.closest('[role="listbox"]') !== null
}

/** True while the user is typing in a field, where shortcuts like Backspace must not fire. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as Partial<HTMLElement> | null
  if (!element) return false
  return element.isContentEditable === true || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName ?? '')
}
