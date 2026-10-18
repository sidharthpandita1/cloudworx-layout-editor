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
npm run bench      # speed of the clearance rule at 500 items
```

Options in the address bar (they can be combined):

- `?seed=500` starts with 500 items (any number; it stops when the floor is full)
- `?stats` shows the FPS meter and a draw-call counter in the bottom-right corner of the 3D view

For example: `npm run build && npm run preview`, then open http://localhost:4173/?seed=500&stats

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

**500 items: a steady 60 FPS** (the screen's refresh rate) while idle, orbiting the camera and
dragging an item. **5 draw calls** in total (one per item type, plus the floor and the grid), 6,004
triangles.

| 500 items (`?seed=500`) | FPS | 95th-percentile frame | Main-thread time per frame | FPS with vsync off |
|---|---|---|---|---|
| Idle | 60 | 17.7 ms | 1.1 ms | ~860–900 |
| Orbiting the camera | 60 | 17.7 ms | 1.8–1.9 ms | ~470–790 |
| Dragging an item | 60 | 17.7 ms | 1.8–2.6 ms | ~570–600 |

- **Hardware:** MacBook Air 13" (M4, 2025, 16 GB), built-in 60 Hz Retina screen, macOS 26.5.
- **Browser:** Google Chrome 155, WebGL through ANGLE / Metal (Apple M4 GPU).
- **Setup:** production build (`npm run preview`), window 1280 × 700, pixel ratio 2, so the 3D canvas
  is 1080 × 975 pixels (the app caps the pixel ratio at 1.5).
- **How:** a Playwright script drove a real Chrome window: 5 s idle, 5 s orbiting, 6 s dragging an item
  back and forth (every new cell re-runs the clearance rule and updates the list). Frame times come from
  `requestAnimationFrame`; main-thread time from Chrome's performance counters. Three runs each; the
  numbers above are the range. I also checked by eye with `?stats`.
- 60 FPS is the screen's limit, so the vsync-off column (Chrome started with `--disable-gpu-vsync
  --disable-frame-rate-limit`) shows how much headroom is left.
- **Honest notes:** in about ten runs, two single long frames (100 ms and 250 ms) appeared once each
  and could not be reproduced. With vsync off, the scripted drag also showed one 2.4 s pause every
  time; it did not appear with vsync on, or when the same drag was run step by step, so I treat it as
  a side effect of the uncapped test mode.
- **Clearance rule:** ~1.4 ms per full check of the same 500 items (124,750 pairs, 3,783 violations),
  Node 25 on the same Mac (`npm run bench`). Well inside a 16.7 ms frame, so it needs no spatial index.

Why the 500-item floor is all red: 500 items cannot all keep 0.6 m apart on a 20 × 12 m floor (a drive
plus its clearance needs about 1.2 m², so at most about 200 fit). The test layout packs items so they
touch, which makes it a worst case for the rule as well as for drawing.

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
