import { create } from 'zustand'
import { applyCommand, invertCommand, type Command } from '../commands/commands'
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
}

interface EditorActions {
  /** Applies an edit and records it for undo. The only way `items` changes, apart from undo/redo. */
  execute: (command: Command) => void
  undo: () => void
  redo: () => void

  // Helpers that build the right command from the current state.
  placeItem: (typeId: ItemTypeId, position: Position) => void
  moveItem: (id: string, to: Position) => void
  rotateItem: (id: string) => void
  deleteItem: (id: string) => void

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
    const item: PlacedItem = { id: `${typeId}-${number}`, typeId, number, ...position, rotation: 0 }
    set({ nextNumber: { ...nextNumber, [typeId]: number + 1 } })
    execute({ type: 'add', item, index: items.length })
    set({ selectedId: item.id })
  },

  moveItem: (id, to) => {
    const item = findItem(get().items, id)
    if (!item || (item.x === to.x && item.z === to.z)) return // no empty history entries
    get().execute({ type: 'move', id, from: { x: item.x, z: item.z }, to })
  },

  rotateItem: (id) => {
    const item = findItem(get().items, id)
    if (!item) return
    const to = ((item.rotation + 1) % 4) as QuarterTurns
    get().execute({ type: 'rotate', id, from: item.rotation, to })
  },

  deleteItem: (id) => {
    const { items, execute } = get()
    const index = items.findIndex((item) => item.id === id)
    if (index === -1) return
    execute({ type: 'delete', item: items[index], index })
  },

  select: (id) => set({ selectedId: id }),
  setActiveTool: (typeId) => set({ activeTool: typeId }),
  setLocale: (locale) => set({ locale }),
}))

function findItem(items: PlacedItem[], id: string): PlacedItem | undefined {
  return items.find((item) => item.id === id)
}

/** Clears the selection if an edit, undo or redo removed the selected item. */
function keepSelection(selectedId: string | null, items: PlacedItem[]): string | null {
  return selectedId !== null && items.some((item) => item.id === selectedId) ? selectedId : null
}
