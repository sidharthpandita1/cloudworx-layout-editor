# Work Plan

Five days, roughly 2–3 focused hours each. Part B (the editor) comes first because building it gives
real numbers and real experience to write about in Part A (the design document).

Tick the boxes as you go. Each task has a **Done when** line: use it as the acceptance criteria in
your prompt, and as the thing you check before you commit.

---

## Day 1 — Edit model and placing items

The most important design decision in Part B is the **edit model**: how state is stored and how every
change goes through undo/redo. Get this right first; everything else sits on top of it.

- [x] **Editor store** (`src/store/`): Zustand store holding `items: PlacedItem[]`, `selectedId`, `locale`,
      `activeTool` (which palette item is armed, if any).
      *Done when:* the store has no React or three.js imports in its logic and the types compile.
- [x] **Commands and history** (`src/commands/`): every edit is a command (`add`, `move`, `rotate`,
      `delete`) with `apply` and `revert`. Two stacks: `past` and `future`. A new edit clears `future`.
      *Done when:* unit tests prove add → undo → redo returns the exact same state, for each command.
- [x] **Footprint-aware snapping** (`src/domain/grid.ts`): snap an item so its footprint edges sit on grid
      lines, taking rotation into account (a 2×1 cabinet rotated 90° becomes 1×2), and clamp it inside the
      floor. *Done when:* unit tests cover odd/even footprints, rotation and the floor edges.
- [x] **Place from palette**: click a palette item, then click the floor to place it.
      *Done when:* items land snapped, never outside the floor, and Ctrl+Z removes them.
- [x] **Render items**: one coloured box per item, sized from the catalog.
      *Done when:* 20 placed items all show with the right size and colour.
- [x] **Select**: click an item in 3D to select it; show a clear highlight (outline or colour).
- [x] Log today's key prompts in `PROMPTS.md`. (Logged for every phase since; see PROMPTS.md sections 0–9.)

## Day 2 — Full editing, panels, rule, BOM, performance

- [x] **Move by dragging** on the floor plane, snapped. One drag = one undo step (commit on pointer-up,
      not every frame). *Done when:* drag then one Ctrl+Z puts the item back where it started.
- [x] **Rotate** (R key / button, 90° steps) and **delete** (Delete key / button). Both undoable.
- [x] **Undo/redo shortcuts**: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, plus toolbar buttons that disable when empty.
- [x] **Placed-items list** (left panel): click a row to select; selecting in 3D highlights and scrolls to
      the row. *Done when:* selection stays in sync both ways.
- [x] **Properties panel** (right): type, label, x, z, rotation for the selected item. Editing x/z here is
      a command too (and snaps).
- [x] **Clearance rule** (`src/rules/clearance.ts`): pure function `(items) → violations`. Any two items
      with an edge-to-edge gap under 0.6 m are a violation. Highlight both in 3D and in the list; show a
      message naming both ("Cabinet 2 and Drive 5 are 0.4 m apart; minimum is 0.6 m").
      *Done when:* unit tests cover touching, 0.59 m, 0.6 m and rotated items.
- [x] **Bill of materials**: table counted from the scene (derived, never stored), labels translated.
- [x] **EN/VI toggle** covers every visible string, including violation messages and number formats
      (`Intl.NumberFormat`).
- [x] **Instanced rendering** (done early, in the placing phase): switch to one `InstancedMesh` per item type, so 500 items cost ~3 draw calls
      instead of 500. Keep per-instance colour for selection and violation highlights.
- [x] **500-item stress test**: a dev-only button or `?seed=500` to fill the floor. Measure FPS on a
      production build (`npm run build && npm run preview`, open with `?stats`). Write the numbers down.
- [x] **Rule performance at 500 items**: naive pair check is 124,750 pairs per edit. Measure it; if it is
      slow, use a uniform spatial grid so each item only checks its neighbours.
      *Measured:* ~1.4 ms per full check of the `?seed=500` layout (`npm run bench`, Apple M4), so the naive check stays.

## Day 3 — Plus items and README

Priority order. Stop when time runs out; a solid editor beats half-finished extras.

1. [x] **3D model optimisation** (counts strongly): pick a free model of 10 MB+ (Khronos glTF sample models
       or a CC-licensed model from Sketchfab, credit the source). Run `@gltf-transform/cli`:
       `inspect` → `simplify` → `meshopt` (or `draco`) → `ktx2` / `webp` textures → `inspect` again.
       Record size, triangles, draw calls, load time and frame time before and after in
       `docs/OPTIMISATION.md`. Also show draw calls for 500 items with and without instancing.
       *Done:* 48.39 → 3.42 MB, 39.1 → 3.55 s at 10 Mbps, 500 copies 5,264 → 11 draw calls; Meshopt
       chosen over Draco after measuring both. LOD and simpler glass are listed as next steps.
2. [x] **Keyboard editing**: Tab into the canvas or list, arrow keys move by one cell, Delete removes,
       and an `aria-live` region announces "Cabinet 2 moved to x 3.5, z −1.0".
3. [x] **Assistant preview (mock)**: a panel that streams a canned reply token by token, proposes a move
       that fixes a violation, shows it as a translucent ghost, Accept applies it as **one command**
       (so one undo reverts it), Reject discards it.
4. [ ] **Embedded mode**: `host.html` loads the editor in an iframe and sends `{ projectId, user, token }`
       via `postMessage`; the editor checks `event.origin` against an allowlist and replies `ready`.

- [ ] Finish `README.md`: run steps, features, FPS with hardware, assumptions, AI usage.
      *So far:* run steps, features, FPS with hardware, model optimisation and credits are done.
      *Left:* copy the final assumptions list in, and write the AI usage section.

## Day 4 — Part A design document

Use `notes/PART_A_OUTLINE.md` (private) as the skeleton.

- [ ] **Architecture diagram** in Excalidraw or draw.io (keep the editable file; they want it open in the
      interview). Show modules, data flow, the host boundary and the protocol on each arrow
      (HTTPS/REST, WSS, postMessage, CDN fetch).
- [ ] Sections 1–9 from the brief, each answering "what, why, and what I rejected".
- [ ] The end-to-end sequence (drag → violation → ask assistant → preview → accept), ideally as a
      sequence diagram.
- [ ] Assumptions and rejected trade-offs, stated plainly.

## Day 5 — Polish and submit

- [ ] Fresh clone → `npm install` → `npm run dev` works first time (they will run it from the README).
- [ ] `npm run typecheck`, `npm test`, `npm run lint`, `npm run build` all clean.
- [ ] Deploy (Vercel or Netlify, free) and check the deployed link on another device.
- [ ] Export the design document as one PDF; re-read it as a stranger would.
- [ ] Make sure the assessment PDF and `notes/` are **not** in the repo.
- [ ] Email the PDF + repo link + deployed link. Subject: `Frontend Assessment: <Your Name>`.

---

## Part C interview preparation

They will change constraints live. Prepare short answers for:

| Change | Direction of your answer |
|---|---|
| Scene grows to 10,000 items | Instancing already helps; add spatial index for the rule, frustum culling per chunk, LOD switching, move the rule check to a Web Worker, virtualise the item list. |
| Host forbids iframes | Switch to a micro-frontend (Module Federation or a web component with Shadow DOM for style isolation); the postMessage contract becomes a typed JS API / custom events; CSP and global-CSS leakage become the risks. |
| Two engineers edit the same layout | Server-authoritative commands over WebSocket, version numbers per layout, conflict on stale version; later CRDT if needed. |
| Must work offline on VPN drops | Queue commands locally (IndexedDB), replay on reconnect, show sync status. |

Be ready to explain any file in `src/` line by line, and to make a small change on screen
(for example: change the clearance to 1 m, add a fourth item type, add a "duplicate" command).
