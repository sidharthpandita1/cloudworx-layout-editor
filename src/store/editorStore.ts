import { create } from 'zustand'
import { applyCommand, invertCommand, type Command } from '../commands/commands'
import { rotatedPosition, snapItemPosition } from '../domain/footprint'
import type { ItemTypeId, PlacedItem, Position, QuarterTurns } from '../domain/types'
import type { Locale } from '../i18n'

/** Oldest edits are dropped beyond this. A batch counts as one edit. See docs/ASSUMPTIONS.md. */
export const HISTORY_LIMIT = 200

interface EditorState {
  items: PlacedItem[]
  selectedId: string | null
  activeTool: ItemTypeId | null // palette item armed for placing, if any
  locale: Locale
  past: Command[] // undo stack, most recent last
  future: Command[] // redo stack, most recent last
  nextNumber: Record<ItemTypeId, number> // per-type label numbers; never reused
  // The item being dragged and where it is right now. Not an edit: only the drop is recorded.
  drag: { id: string; position: Position } | null
}

interface EditorActions {
  /** Applies an edit and records it for undo. The only way `items` changes, apart from undo/redo. */
  execute: (command: Command) => void
  undo: () => void
  redo: () => void

  // Helpers that build the right command from the current state. They snap and clamp positions,
  // so every item in the store is always on the grid and fully inside the floor.
  placeItem: (typeId: ItemTypeId, position: Position) => void
  moveItem: (id: string, to: Position) => void
  rotateItem: (id: string, to?: QuarterTurns) => void // to the given angle, or one quarter turn on
  deleteItem: (id: string) => void

  // Dragging. The item is shown at `drag.position` while the pointer moves; releasing records one
  // move (one undo step), cancelling puts it back.
  startDrag: (id: string) => void
  updateDrag: (rawPosition: Position) => void
  endDrag: () => void
  cancelDrag: () => void

  // Not edits: these are not recorded in history.
  select: (id: string | null) => void
  setActiveTool: (typeId: ItemTypeId | null) => void
  setLocale: (locale: Locale) => void
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

  execute: (command) =>
    set((state) => {
      const items = applyCommand(state.items, command)
      return {
        items,
        past: [...state.past, command].slice(-HISTORY_LIMIT),
        future: [],
        selectedId: keepSelection(state.selectedId, items),
      }
    }),

  undo: () =>
    set((state) => {
      const command = state.past.at(-1)
      if (!command) return state
      const items = applyCommand(state.items, invertCommand(command))
      return {
        items,
        past: state.past.slice(0, -1),
        future: [...state.future, command],
        selectedId: keepSelection(state.selectedId, items),
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
    set({ nextNumber: { ...nextNumber, [typeId]: number + 1 } })
    execute({ type: 'add', item, index: items.length })
    set({ selectedId: item.id })
  },

  moveItem: (id, rawTo) => {
    const item = findItem(get().items, id)
    if (!item) return
    const to = snapItemPosition(rawTo, item.typeId, item.rotation)
    if (samePosition(item, to)) return // no empty history entries
    get().execute({ type: 'move', id, from: { x: item.x, z: item.z }, to })
  },

  rotateItem: (id, to) => {
    const item = findItem(get().items, id)
    if (!item) return
    const rotation = to ?? (((item.rotation + 1) % 4) as QuarterTurns)
    if (rotation === item.rotation) return // no empty history entries
    const rotate: Command = { type: 'rotate', id, from: item.rotation, to: rotation }
    const position = rotatedPosition(item, rotation)
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

  startDrag: (id) => {
    const item = findItem(get().items, id)
    if (item) set({ drag: { id, position: { x: item.x, z: item.z } } })
  },

  updateDrag: (rawPosition) => {
    const { drag, items } = get()
    const item = drag && findItem(items, drag.id)
    if (!drag || !item) return
    const position = snapItemPosition(rawPosition, item.typeId, item.rotation)
    // Only update when the item moves to another cell, so the scene re-renders once per cell.
    if (!samePosition(position, drag.position)) set({ drag: { id: drag.id, position } })
  },

  endDrag: () => {
    const { drag, moveItem } = get()
    if (!drag) return
    set({ drag: null })
    moveItem(drag.id, drag.position) // records nothing if it ended where it started
  },

  cancelDrag: () => set({ drag: null }),

  select: (id) => set({ selectedId: id }),
  setActiveTool: (typeId) => set({ activeTool: typeId }),
  setLocale: (locale) => set({ locale }),
}))

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
