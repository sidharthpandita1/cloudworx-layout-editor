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
- [ ] Palette of three item types (cabinet, drive, transformer)
- [ ] Place with grid snapping; select, move, rotate, delete
- [ ] Undo and redo for every edit
- [ ] Placed-items list and properties panel, selection synced with the 3D view
- [ ] Clearance rule: items closer than 0.6 m are highlighted with a message naming both
- [ ] Bill of materials with English / Vietnamese toggle

## Performance

_TODO_: frame rate with 500 items placed.

| Items | FPS | Draw calls | Hardware | Browser |
|---|---|---|---|---|
| 500 | | | | |

## Keyboard shortcuts

_TODO_

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
