import { create } from 'zustand'
import { applyCommand, invertCommand, type Command } from '../commands/commands'
import { rotatedPosition, snapItemPosition } from '../domain/footprint'
import { nextNumbers } from '../domain/items'
import type { ItemTypeId, PlacedItem, Position, QuarterTurns } from '../domain/types'
import type { Locale } from '../i18n'
import { findBlockingItem } from '../rules/overlap'

/** Oldest edits are dropped beyond this. A batch counts as one edit. See docs/ASSUMPTIONS.md. */
export const HISTORY_LIMIT = 200

/** A short on-screen warning after an edit was refused. Not an edit, so not in history. */
export interface Notice {
  message: 'blocked.position' | 'blocked.rotation'
  blocker: Pick<PlacedItem, 'typeId' | 'number'> // the item in the way, named in the message
  id: number // new for every notice, so the same warning shown again pops up again
}

/**
 * What the screen-reader live region says next (see ui/Announcer). Data, not text, so it is translated
 * when shown. `id` is new every time, so the same sentence twice is still read out twice.
 */
export type Announcement =
  | { kind: 'edit'; command: Command; via: 'edit' | 'undo' | 'redo'; id: number } // the command applied
  | { kind: 'selected'; itemId: string; id: number }
  | { kind: 'deselected'; id: number }
  | { kind: 'wall'; itemId: string; id: number } // an arrow-key move that the wall stopped

interface EditorState {
  items: PlacedItem[]
  selectedId: string | null
  activeTool: ItemTypeId | null // palette item armed for placing, if any
  locale: Locale
  past: Command[] // undo stack, most recent last
  future: Command[] // redo stack, most recent last
  nextNumber: Record<ItemTypeId, number> // per-type label numbers; never reused
  // The item being dragged. Not an edit: only the drop is recorded.
  // `position` is where the item is shown: the last free cell. `target` is the cell under the pointer,
  // which may be occupied by another item; the item does not follow the pointer onto it.
  drag: { id: string; position: Position; target: Position } | null
  notice: Notice | null
  announcement: Announcement | null
  shortcutsOpen: boolean // the keyboard shortcuts dialog; editor shortcuts pause while it is open
}

interface EditorActions {
  /** Applies an edit and records it for undo. The only way `items` changes, apart from undo/redo. */
  execute: (command: Command) => void
  undo: () => void
  redo: () => void

  // Helpers that build the right command from the current state. They snap and clamp positions,
  // so every item in the store is always on the grid and fully inside the floor. They also refuse
  // any edit that would make two items overlap (and show a notice instead), so items never overlap.
  placeItem: (typeId: ItemTypeId, position: Position) => void
  moveItem: (id: string, to: Position) => void
  rotateItem: (id: string, to?: QuarterTurns) => void // to the given angle, or one quarter turn on
  deleteItem: (id: string) => void
  /** Moves an item by a distance (arrow keys). Says so if the wall stops it. */
  nudgeItem: (id: string, delta: Position) => void

  // Dragging. The item is shown at `drag.position` while the pointer moves; releasing records one
  // move (one undo step), cancelling puts it back. Occupied cells are skipped.
  startDrag: (id: string) => void
  updateDrag: (rawPosition: Position) => void
  endDrag: () => void
  cancelDrag: () => void

  /**
   * Replaces the whole layout, like opening a saved file: history starts empty, so it can't be undone.
   * Used by `?seed=N` for the performance test. The items are trusted; data from outside (a host app)
   * would need checking for overlaps and off-grid positions first.
   */
  loadLayout: (items: PlacedItem[]) => void

  // Not edits: these are not recorded in history.
  select: (id: string | null) => void
  setActiveTool: (typeId: ItemTypeId | null) => void
  setLocale: (locale: Locale) => void
  setShortcutsOpen: (open: boolean) => void
  dismissNotice: () => void
}

export type EditorStore = EditorState & EditorActions

export const useEditorStore = create<EditorStore>()((set, get) => ({
  items: [],
  selectedId: null,
  activeTool: null,
  locale: 'en',
  past: [],
  future: [],
  nextNumber: { cabinet: 1, drive: 1, transformer: 1 },
  drag: null,
  notice: null,
  announcement: null,
  shortcutsOpen: false,

  execute: (command) =>
    set((state) => {
      const items = applyCommand(state.items, command)
      return {
        items,
        past: [...state.past, command].slice(-HISTORY_LIMIT),
        future: [],
        selectedId: keepSelection(state.selectedId, items),
        announcement: announce({ kind: 'edit', command, via: 'edit' }),
      }
    }),

  undo: () =>
    set((state) => {
      const command = state.past.at(-1)
      if (!command) return state
      const inverse = invertCommand(command)
      const items = applyCommand(state.items, inverse)
      return {
        items,
        past: state.past.slice(0, -1),
        future: [...state.future, command],
        selectedId: keepSelection(state.selectedId, items),
        announcement: announce({ kind: 'edit', command: inverse, via: 'undo' }),
      }
    }),

  redo: () =>
    set((state) => {
      const command = state.future.at(-1)
      if (!command) return state
      const items = applyCommand(state.items, command)
      return {
        items,
        past: [...state.past, command].slice(-HISTORY_LIMIT),
        future: state.future.slice(0, -1),
        selectedId: keepSelection(state.selectedId, items),
        announcement: announce({ kind: 'edit', command, via: 'redo' }),
      }
    }),

  placeItem: (typeId, position) => {
    const { items, nextNumber, execute } = get()
    const number = nextNumber[typeId]
    // The item is fully built here, not inside applyCommand, so redo restores exactly this item.
    const item: PlacedItem = {
      id: `${typeId}-${number}`,
      typeId,
      number,
      ...snapItemPosition(position, typeId, 0),
      rotation: 0,
    }
    const blocker = findBlockingItem(items, item)
    if (blocker) {
      showNotice('blocked.position', blocker)
      return // the number is not used up
    }
    set({ nextNumber: { ...nextNumber, [typeId]: number + 1 } })
    execute({ type: 'add', item, index: items.length })
    set({ selectedId: item.id })
  },

  moveItem: (id, rawTo) => {
    const item = findItem(get().items, id)
    if (!item) return
    const to = snapItemPosition(rawTo, item.typeId, item.rotation)
    if (samePosition(item, to)) return // no empty history entries
    const blocker = findBlockingItem(get().items, { ...item, ...to })
    if (blocker) {
      showNotice('blocked.position', blocker)
      return
    }
    get().execute({ type: 'move', id, from: { x: item.x, z: item.z }, to })
  },

  rotateItem: (id, to) => {
    const item = findItem(get().items, id)
    if (!item) return
    const rotation = to ?? (((item.rotation + 1) % 4) as QuarterTurns)
    if (rotation === item.rotation) return // no empty history entries
    const rotate: Command = { type: 'rotate', id, from: item.rotation, to: rotation }
    const position = rotatedPosition(item, rotation)
    const blocker = findBlockingItem(get().items, { ...item, ...position, rotation })
    if (blocker) {
      showNotice('blocked.rotation', blocker)
      return
    }
    if (samePosition(item, position)) {
      get().execute(rotate)
      return
    }
    // Rotation also shifted the item to stay aligned: record both as one undo step.
    const move: Command = { type: 'move', id, from: { x: item.x, z: item.z }, to: position }
    get().execute({ type: 'batch', commands: [rotate, move] })
  },

  deleteItem: (id) => {
    const { items, execute } = get()
    const index = items.findIndex((item) => item.id === id)
    if (index === -1) return
    execute({ type: 'delete', item: items[index], index })
  },

  nudgeItem: (id, delta) => {
    const item = findItem(get().items, id)
    if (!item) return
    const to = snapItemPosition({ x: item.x + delta.x, z: item.z + delta.z }, item.typeId, item.rotation)
    if (samePosition(item, to)) {
      set({ announcement: announce({ kind: 'wall', itemId: id }) })
      return
    }
    get().moveItem(id, to) // refuses overlaps with a notice, like every other move
  },

  startDrag: (id) => {
    const item = findItem(get().items, id)
    if (!item) return
    const position = { x: item.x, z: item.z }
    set({ drag: { id, position, target: position } })
  },

  updateDrag: (rawPosition) => {
    const { drag, items } = get()
    const item = drag && findItem(items, drag.id)
    if (!drag || !item) return
    const target = snapItemPosition(rawPosition, item.typeId, item.rotation)
    // Only act when the pointer reaches another cell, so the scene re-renders once per cell.
    if (samePosition(target, drag.target)) return
    const blocker = findBlockingItem(items, { ...item, ...target })
    if (blocker) {
      // Occupied: the item stays at its last free cell, and the warning pops up (again).
      set({ drag: { ...drag, target } })
      showNotice('blocked.position', blocker)
      return
    }
    set({ drag: { id: drag.id, position: target, target } })
  },

  endDrag: () => {
    const { drag, items, moveItem } = get()
    if (!drag) return
    set({ drag: null })
    // Released over an occupied cell: the item lands at its last free cell. Say why once more.
    const item = findItem(items, drag.id)
    const blocker = item && !samePosition(drag.target, drag.position) && findBlockingItem(items, { ...item, ...drag.target })
    if (blocker) showNotice('blocked.position', blocker)
    moveItem(drag.id, drag.position) // records nothing if it ended where it started
  },

  cancelDrag: () => set({ drag: null }),

  loadLayout: (items) =>
    set({
      items,
      nextNumber: nextNumbers(items),
      past: [],
      future: [],
      selectedId: null,
      activeTool: null,
      drag: null,
      notice: null,
      announcement: null,
    }),

  select: (id) =>
    set((state) => {
      if (id === state.selectedId) return state // e.g. pressing the already-selected item to drag it
      return {
        selectedId: id,
        announcement: announce(id ? { kind: 'selected', itemId: id } : { kind: 'deselected' }),
      }
    }),
  setActiveTool: (typeId) => set({ activeTool: typeId }),
  setLocale: (locale) => set({ locale }),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  dismissNotice: () => set({ notice: null }),
}))

let noticeCount = 0
let announcementCount = 0

// Distributes Omit over the union, so each kind keeps its own fields.
type AnnouncementData = Announcement extends infer A ? (A extends Announcement ? Omit<A, 'id'> : never) : never

function announce(data: AnnouncementData): Announcement {
  announcementCount += 1
  return { ...data, id: announcementCount } as Announcement
}

function showNotice(message: Notice['message'], blocker: PlacedItem) {
  noticeCount += 1
  const { typeId, number } = blocker
  useEditorStore.setState({ notice: { message, blocker: { typeId, number }, id: noticeCount } })
}

function samePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.z === b.z
}

function findItem(items: PlacedItem[], id: string): PlacedItem | undefined {
  return items.find((item) => item.id === id)
}

/** Clears the selection if an edit, undo or redo removed the selected item. */
function keepSelection(selectedId: string | null, items: PlacedItem[]): string | null {
  return selectedId !== null && items.some((item) => item.id === selectedId) ? selectedId : null
}
