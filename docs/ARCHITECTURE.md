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
│ commands/ add · move · rotate · delete  (apply / revert)    │
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
 dispatch(command) ──► command.apply(state) ──► new items[]  ──► push onto history.past
        │                                                         clear history.future
        ▼
 store updates ──► derived values recomputed from items[]:
                     • violations = checkClearance(items)
                     • bom        = countByType(items)
        │
        ▼
 scene and panels re-render from the same state
 (so the 3D view, the list and the properties panel can never disagree)
```

## Key rules

1. **One source of truth.** `items` and `selectedId` live in the store. The 3D view and the panels are
   both views of it; neither owns selection.
2. **Every edit is a command.** Nothing changes `items` directly. Undo = `revert` the last command;
   redo = `apply` it again. A drag is one command, created on pointer-up with the start and end positions.
3. **Derived, not stored.** Violations and the bill of materials are computed from `items`, so they can
   never go stale and undo/redo needs no special handling for them.
4. **Selection is not in history.** Undo reverts edits to the layout, not clicks. (See ASSUMPTIONS.md.)
5. **Rendering is instanced.** One `InstancedMesh` per item type, so draw calls stay flat as items grow.

## Folder guide

| Folder | Contains | Imports allowed |
|---|---|---|
| `src/domain` | types, catalog, grid maths | nothing app-specific |
| `src/rules` | clearance rule | `domain` |
| `src/i18n` | `en.ts`, `vi.ts`, `translate()` | nothing |
| `src/commands` | command definitions | `domain` |
| `src/store` | Zustand store, history | `domain`, `commands`, `rules`, `i18n` |
| `src/scene` | R3F components | `store`, `domain` |
| `src/ui` | panels | `store`, `domain`, `i18n` |
