# Layout Editor

A small 3D layout editor for placing electrical equipment on a floor grid, built with React,
TypeScript and React Three Fiber.

- **Live demo:** https://cloudworx-layout-editor.vercel.app
  (add `?seed=500&stats` to the address for the 500-item test with the FPS and draw-call counters)
- **Model optimisation benchmark:** https://cloudworx-layout-editor.vercel.app/model-bench.html

## Run it

Requires Node.js 20.19+ or 22.12+ (Vite 8 needs one of these).

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
npm run model:fetch / model:optimise / model:variants   # 3D model optimisation (see below)
```

Options in the address bar (they can be combined):

- `?seed=500` starts with 500 items (any number; it stops when the floor is full)
- `?stats` shows the FPS meter and a draw-call counter in the bottom-left corner of the 3D view

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
- [x] Both side panels can be hidden (chevron button in their top corner) to give the 3D view more room;
  the choice is remembered in the browser
- [x] Assistant preview (mock): a chat bubble that streams a reply and proposes moves that fix clearance
  problems, shown as blue ghosts with arrows in the 3D view; Accept applies them as one undo step,
  Reject discards them

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
  numbers above are the range. I also checked by eye with `?stats`. The Playwright script was a one-off and is not in
  the repo; the on-screen counter with `?seed=500&stats` reproduces the by-eye check.
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

## 3D model optimisation

A 48 MB glTF model (Khronos "Flight Helmet") optimised to **3.42 MB** (−93%): loads in **3.55 s
instead of 39.1 s** at 10 Mbps, uses **8.7 MB instead of 285 MB** of GPU texture memory, and looks
almost the same. With 500 copies, instancing cuts draw calls from **5,264 to 11**. Meshopt was chosen
over Draco after measuring both. Full report, commands and the comparison table:
[docs/OPTIMISATION.md](docs/OPTIMISATION.md).

```bash
npm run model:fetch      # download the raw 48 MB model (not in the repo)
npm run model:optimise   # rebuild public/models/flight-helmet.glb (needs KTX-Software for KTX2 textures)
```

Compare the versions yourself on the benchmark page (a separate page, not inside the editor):
http://localhost:5173/model-bench.html with `npm run dev`, or http://localhost:4173/model-bench.html
after `npm run build && npm run preview` (use this one for measuring). Pick raw or optimised, 1 or 500
copies, instancing on or off.
Without `model:fetch`, the raw version is loaded from the Khronos repository.

## Using the editor

- **Place:** click an item in the palette, then click the floor (the tool stays armed; Esc stops).
- **Select and move:** press on an item and drag; it snaps to the 0.5 m grid. Click empty space to deselect.
- **List and properties:** click a row in "Placed items" to select it; selecting in 3D highlights the
  row. In "Properties", type x or z (`3.5` or `3,5`) and press Enter, or pick a rotation. Each change
  is one undo step and snaps to the grid.
- **Overlaps:** items can't be put on top of each other. While placing, the ghost turns red over an
  occupied spot; dragging stops at the last free cell; a red message says which item is in the way.
- **Camera:** drag empty space to orbit, scroll to zoom, right-drag to pan.
- **More room:** the chevron in the top corner of each side panel hides it (a thin strip with the same
  button stays to bring it back). The 3D view grows to fill the space.
- **Assistant:** click the round **✨** bubble in the bottom-right corner of the 3D view (✕ or Esc
  closes it; an orange dot means a suggestion is waiting). Use a suggestion (fix one clearance problem, fix
  all, summarise) or type a question. The reply streams in (Stop cancels it); a proposed change shows as
  blue ghosts with dashed arrows in the 3D view and a "Clearance problems: before → after" line. Accept
  applies it as one step (one Undo reverts it all); Reject changes nothing. If you edit the layout
  first, the proposal is marked out of date instead of being applied to a layout it wasn't planned for.
  The assistant is a mock that runs in the browser: it understands only these few requests.

## Keyboard shortcuts

| Action | Windows | Mac |
|---|---|---|
| Undo | Ctrl+Z | ⌘Z |
| Redo | Ctrl+Shift+Z or Ctrl+Y | ⌘⇧Z |
| Rotate selected 90° | R | R |
| Delete selected | Delete or Backspace | Delete |
| Cancel drag / stop placing / deselect | Esc | Esc |

These cover the core edits. Arrow-key moves, keyboard navigation of the item list and screen-reader
announcements (the brief's optional "Keyboard editing" item) were built and then removed to keep the
submission focused; see docs/DECISIONS.md.

## Assumptions

See [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md).

## Project structure

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for layers and data flow, and
[docs/DECISIONS.md](docs/DECISIONS.md) for library choices and rejected alternatives.

## Use of AI tools

I used Claude Code (Claude Opus 5.5, in the terminal) for planning and implementation. After
implementing, I had a Claude agent review the code, and then I reviewed it myself: I read the code,
ran the tests, typecheck and lint, and tried the feature in the browser.

- **How I worked:** I described each feature in my own words and asked for a plan before any code.
  The rules I gave the AI are in [CLAUDE.md](CLAUDE.md), for example: keep the code simple enough that
  I can explain every line, test the pure logic, and send every string through `translate()`.
- **My decisions:** building Part B first, so the design document could use real numbers. Meshopt
  over Draco: I first asked for Draco because I had used it before, then asked for both to be built
  and measured. Draco files were about 2% smaller, but its 204 KB decoder made loading 0.08 s slower
  at 10 Mbps, so I chose Meshopt. Removing the optional keyboard editing: Claude advised keeping it,
  but I wanted a smaller, focused submission.
- **When it was wrong:** while planning the design document, Claude marked "the host can re-theme the
  3D view" as partly built. It is not built, so I corrected it and asked it to re-read the whole
  codebase and redo the plan (prompts 38 and 39).
- **Design document:** also written with Claude, from an outline and a list of what is built and
  what is design only. I went through it section by section, and its numbers come from this repo.
  The few estimates are labelled as estimates.

The key prompts, with what I accepted or changed, are in [PROMPTS.md](PROMPTS.md).

## Credits

- **Flight Helmet** (benchmark page only): Gary Hsu, from the
  [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/FlightHelmet),
  CC0 1.0. The optimised `public/models/flight-helmet*.glb` files are made from it.
- The editor's items are simple boxes drawn in code; no third-party models.
