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

The assistant joins the same flow at the end, as one more source of commands:

```
 question ──► assistant(request, signal) ──► text pieces … ──► proposal = { command, before, after }
                                                                   │
              ghost in 3D = movesIn(command)  ◄────────────────────┤  (hidden once items[] changes)
                                                                   ▼
                                                  Accept ──► execute(command)   (one undo step)
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
| `src/domain` | types, catalog, grid maths, footprints and snapping, `groupItemsByType`, `withDragPosition`, `nextNumbers`, `billOfMaterials`, `seedLayout` | nothing app-specific |
| `src/rules` | clearance rule `findViolations` (+ benchmark) | `domain` |
| `src/i18n` | `en.ts`, `vi.ts`, `translate()` with `{placeholders}`, number/label/message formatting, screen-reader sentences (`announce.ts`) | `domain`, `rules` (types and constants only) |
| `src/commands` | command definitions | `domain` |
| `src/assistant` | `fix.ts` (pure: nearest clear spot, fix one / fix all as move commands), `mockAssistant.ts` (the `Assistant` contract, intent matching, reply planning, word-by-word stream), `assistantStore.ts` (conversation, proposals, accept/reject) | `domain`, `rules`, `commands`, `i18n`; the store also reads and calls `store` (`execute`) |
| `src/store` | Zustand store, history, `loadLayout`, cached `selectViolations` | `domain`, `commands`, `rules`, `i18n` |
| `src/scene` | R3F: `Floor` (placing + preview), `ItemInstances`, `SelectionOutline`, `PlacementPreview`, `ProposalPreview` (assistant ghosts and arrows), `RenderInfo` (draw calls, `?stats`) | `store`, `domain` |
| `src/bench` | model optimisation benchmark page (`model-bench.html`): raw vs optimised, 1 or 500 copies, instancing on/off | three.js, drei; nothing from the editor |
| `scripts` | `model-fetch.mjs`, `model-optimise.mjs` (the glTF pipeline, see docs/OPTIMISATION.md) | Node only |
| `src/ui` | panels (`Palette`, `Toolbar`, `ItemList`, `PropertiesPanel`, `ClearancePanel`, `BomTable`, `NoticeToast`, `Announcer`, `ShortcutsDialog`, `AssistantPanel` (bubble + chat), `SidePanel` + `usePanelOpen` (collapsible columns)), `shortcuts` (pure key and arrow mapping), `useTranslate`, `useKeyboardShortcuts` | `store`, `domain`, `i18n` |
