# Layout Editor

A small 3D layout editor for placing electrical equipment on a floor grid, built with React,
TypeScript and React Three Fiber.

> Status: in progress. Sections marked _TODO_ are filled in as features land.

## Run it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm test           # unit tests (Vitest)
npm run typecheck  # TypeScript
npm run lint       # oxlint
npm run build      # production build into dist/
npm run preview    # serve the production build
```

Add `?stats` to the URL to show the FPS counter.

## Features

- [x] 20 m × 12 m floor with 0.5 m cells
- [x] Palette of three item types (cabinet, drive, transformer)
- [x] Place with grid snapping; select, move (drag), rotate, delete
- [x] Undo and redo for every edit (toolbar and keyboard)
- [x] Placed-items list and properties panel, selection synced with the 3D view
- [x] Clearance rule: items closer than 0.6 m turn red (live while dragging), with a message naming both
- [x] Items can never overlap: placing, dragging, rotating or typing a position onto another item is refused with a warning
- [x] Bill of materials (item, size, quantity, total) with English / Vietnamese toggle

## Performance

_TODO_: frame rate with 500 items placed.

Clearance rule at 500 items (every pair, 124,750 checks): **~1.1 ms** per full check on an Apple M4
(16 GB), Node 25. Run it with `npm run bench`.

| Items | FPS | Draw calls | Hardware | Browser |
|---|---|---|---|---|
| 500 | | | | |

## Using the editor

- **Place:** click an item in the palette, then click the floor (the tool stays armed; Esc stops).
- **Select and move:** press on an item and drag; it snaps to the 0.5 m grid. Click empty space to deselect.
- **List and properties:** click a row in "Placed items" to select it; selecting in 3D highlights the
  row. In "Properties", type x or z (`3.5` or `3,5`) and press Enter, or pick a rotation. Each change
  is one undo step and snaps to the grid.
- **Overlaps:** items can't be put on top of each other. While placing, the ghost turns red over an
  occupied spot; dragging stops at the last free cell; a red message says which item is in the way.
- **Camera:** drag empty space to orbit, scroll to zoom, right-drag to pan.

## Keyboard shortcuts

| Action | Windows | Mac |
|---|---|---|
| Undo | Ctrl+Z | ⌘Z |
| Redo | Ctrl+Shift+Z or Ctrl+Y | ⌘⇧Z |
| Rotate selected 90° | R | R |
| Delete selected | Delete or Backspace | Delete |
| Cancel drag / stop placing / deselect | Esc | Esc |

## Assumptions

See [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md). _TODO_: copy the final list here.

## Project structure

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for layers and data flow, and
[docs/DECISIONS.md](docs/DECISIONS.md) for library choices and rejected alternatives.

## Use of AI tools

_TODO_: which tools, for what, and how the output was checked. The key prompts are in
[PROMPTS.md](PROMPTS.md).

## Credits

_TODO_: any third-party models, with source and licence.
