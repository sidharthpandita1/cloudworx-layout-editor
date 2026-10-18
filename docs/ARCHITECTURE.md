# Editor Architecture (Part B)

This describes the code of the working editor. The wider two-product architecture lives in the
Part A design document.

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│ ui/      React panels: palette, item list, properties, BOM  │
│ scene/   React Three Fiber: floor, items, selection, drag   │
├─────────────────────────────────────────────────────────────┤
│ store/   Zustand store: items, selection, history, locale   │
│ commands/ add · delete · move · rotate · batch (plain data) │
├─────────────────────────────────────────────────────────────┤
│ domain/  pure TypeScript: types, catalog, grid & snapping   │
│ rules/   pure TypeScript: clearance check                   │
│ i18n/    typed message dictionaries (en, vi)                │
└─────────────────────────────────────────────────────────────┘
```

Arrows only point down: `ui` and `scene` read the store and dispatch commands; `domain` and `rules`
import nothing from React or three.js. This keeps the important logic unit-testable without a browser
and makes it easy to explain in the review.

## Data flow

```
 user action (click, drag, key, list row, properties field)
        │
        ▼
 execute(command) ──► applyCommand(items, command) ──► new items[] ──► push onto past (max 200)
        │                                                              clear future
        ▼
 store updates ──► derived values recomputed from items[]:
                     • violations = findViolations(items, with the live drag position)
                     • bom        = billOfMaterials(items)
        │
        ▼
 scene and panels re-render from the same state
 (so the 3D view, the list and the properties panel can never disagree)
```

## Key rules

1. **One source of truth.** `items` and `selectedId` live in the store. The 3D view and the panels are
   both views of it; neither owns selection.
2. **Every edit is a command, and commands are plain data.** Nothing changes `items` directly.
   `applyCommand(items, command)` returns new items; `invertCommand(command)` returns its opposite.
   Undo = apply the inverse of the last command; redo = apply the command again. Because commands are
   data, the same objects could be sent to a server or proposed by an assistant as JSON. A drag is one
   command, created on pointer-up with the start and end positions. Several edits that belong together
   (an assistant fix, a multi-select move) are one `batch` command, so one undo reverts them all.
3. **Derived, not stored.** Violations and the bill of materials are computed from `items`, so they can
   never go stale and undo/redo needs no special handling for them.
4. **Selection is not in history.** Undo reverts edits to the layout, not clicks. If an undo removes the
   selected item, the selection is cleared. (See ASSUMPTIONS.md.)
5. **History is capped** at 200 edits (`HISTORY_LIMIT`); the oldest are dropped.
6. **Every item in the store is on the grid and inside the floor.** The store's edit helpers snap and
   clamp with `snapItemPosition` / `rotatedPosition` (`src/domain/footprint.ts`), so no caller (drag,
   properties panel, keyboard, assistant) can put an item off-grid. The drag preview uses the same
   function, so what you see is where it lands. A rotation that also shifts the item is one `batch`.
   **Items never overlap** for the same reason: the helpers ask `findBlockingItem` (`src/rules/overlap.ts`)
   first and, if something is in the way, record nothing and set a `notice` (shown as a toast) instead.
7. **Rendering is instanced.** One `InstancedMesh` per item type, so draw calls stay flat as items grow.

## Folder guide

| Folder | Contains | Imports allowed |
|---|---|---|
| `src/domain` | types, catalog, grid maths, footprints and snapping, `groupItemsByType`, `withDragPosition`, `billOfMaterials` | nothing app-specific |
| `src/rules` | clearance rule `findViolations` (+ benchmark) | `domain` |
| `src/i18n` | `en.ts`, `vi.ts`, `translate()` with `{placeholders}`, number/label/message formatting | `domain`, `rules` (types and constants only) |
| `src/commands` | command definitions | `domain` |
| `src/store` | Zustand store, history, cached `selectViolations` | `domain`, `commands`, `rules`, `i18n` |
| `src/scene` | R3F: `Floor` (placing + preview), `ItemInstances`, `SelectionOutline`, `PlacementPreview` | `store`, `domain` |
| `src/ui` | panels (`Palette`, `Toolbar`, `ItemList`, `PropertiesPanel`, `ClearancePanel`, `BomTable`, `NoticeToast`), `shortcuts` (pure key mapping), `useTranslate`, `useKeyboardShortcuts` | `store`, `domain`, `i18n` |
