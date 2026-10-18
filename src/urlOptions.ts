import { seedLayout } from './domain/seed'
import { useEditorStore } from './store/editorStore'

/**
 * Options read from the page address, for testing and measuring:
 * - `?seed=500` starts with a 500-item layout (any count; stops when the floor is full)
 * - `?stats` shows the FPS meter and the draw-call counter (see EditorCanvas)
 */
export const urlOptions = new URLSearchParams(window.location.search)

/** Measuring or testing: things that would get in the way, like the first-visit help, stay closed. */
export const isMeasuring = urlOptions.has('seed') || urlOptions.has('stats')

export function applyUrlOptions() {
  const seed = Number.parseInt(urlOptions.get('seed') ?? '', 10)
  if (seed > 0) useEditorStore.getState().loadLayout(seedLayout(seed))
}
