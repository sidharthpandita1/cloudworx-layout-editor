# AI Prompt Log

Tool: Claude Code (Claude Opus 5.5), used in the terminal.

How I worked: I planned each feature in my own words first, asked for a design before code, checked
the output (read it, ran the tests, tried it in the browser), and corrected it when it was wrong.
This log keeps the key prompts per feature with a short note on what I accepted or changed. Prompts are
lightly cleaned for typos only.

---

## 0. Understanding the brief and planning

**Prompt 1**
> Here is the assignment PDF I received. I have 5 days, and I'm asked to share the prompts I use.
> Go through the assignment, help me understand it and plan how to approach it.

*Result:* Plain-language summary of Parts A/B/C, a proposed stack and a 5-day plan.
*My decision:* Build Part B first so Part A can use real numbers from it.



**Prompt 2**
> Make a deep plan and a complete project setup with proper Markdown files, and explain the project
> again in more depth.

*Result:* Vite + React + TS project with R3F, drei, Zustand, Vitest; a layered folder structure; the
floor grid; typed EN/VI dictionaries; docs (`PLAN`, `ARCHITECTURE`, `DECISIONS`, `ASSUMPTIONS`,
`OPTIMISATION`), this log and `CLAUDE.md`.
*My review:* _TODO: note what you checked or changed._

---

## 1. Edit model (store, commands, undo/redo)

**Prompt 3**
> Let's start Day 1 with the store and undo/redo.

*Result:* A design proposal before any code: commands as plain data (`add`, `delete`, `move`,
`rotate`, `batch`) with `applyCommand` and `invertCommand`; a Zustand store with `past`/`future` stacks;
selection not undoable; labels built when the command is created so redo is exact.
*Why I accepted data commands over `do()/undo()` methods:* they can be serialised, so the same commands
can go to a server or come from the AI assistant as JSON (matches the Part A design).

**Prompt 4**
> Will the history have any size limit?

*Result:* Analysis: memory isn't the real issue (a move is ~100 bytes), but unbounded growth in an
all-day session is still a smell, and batch commands can be large. Recommended a cap of 200 edits, a
batch counting as one.
*My decision:* Cap at 200 (`HISTORY_LIMIT`), recorded as an assumption.

**Prompt 5**
> Let's go with this approach for now; I will review later.

*Result:* `src/commands/commands.ts`, `src/store/editorStore.ts` and 28 passing unit tests (round trip
for every command, batch undo order, redo cleared by new edits, history cap, selection cleared on undo,
delete-undo restores list position). The AI changed one detail from the design: items store a
per-type `number` instead of an English label, so names translate ("Tủ điện 3").
*My review:* Reviewed the code and tests; approved without changes.

---

## 2. Snapping

**Prompt 6**
> Propose a design for the snapping.

*Result:* Design before code: snap the footprint's edge (not its centre) so odd and even sizes work
with one formula; clamp inside the floor; swap width/depth on rotation. Flagged a drift bug in the
naive approach (re-snapping after each rotation pushes a 2×1 cabinet 0.25 m further every turn) and
proposed rotating about a fixed pivot with an alternating half-cell shift. Listed rejected options.

**Prompt 7**
> For rotation let's keep the fixed pivot, we will clamp at the walls, and let's keep snapping inside
> the store.

*Result:* `src/domain/footprint.ts` (`footprintSize`, `footprintRect`, `snapItemPosition`,
`rotatedPosition`) with tests; store helpers now snap and clamp; a rotation that shifts is one `batch`
undo step. 43 tests pass.
*What the tests caught:* the existing history-limit test moved an item to x = 1…204; with clamping, every
move past x = 9 landed in the same spot and was skipped. The test was changed to alternate between two
positions inside the floor. Good sign that the clamp works and that no-op moves create no history.
*My review:* _TODO_

---

## 3. Placing, rendering and selecting

**Prompt 8**
> Give me a detailed summary of what you have done so far, so I can match it with the actual
> implementation.

*Result:* File-by-file summary (functions, values, tests, docs, uncommitted state) used to cross-check
the code.

**Prompt 9**
> Don't commit until I tell you to. Let's move on to the next phase.

*Result:* Design before code for placing, rendering and selecting: armed palette tool with a snapped
ghost preview; one `InstancedMesh` per type; click → `instanceId` → item; ignore clicks that were
camera drags; selection as an outline so colour stays free for rule violations.

**Prompt 10**
> After placing, the tool should stay armed; keep instancing now; keep outlines for selection.

*Result:* `Palette`, `Floor` (preview + place), `ItemInstances`, `SelectionOutline`,
`PlacementPreview`, `useTranslate`, `useKeyboardShortcuts` (Esc), `groupItemsByType` + tests (46 pass).
*Verified in a real browser* (Playwright driving Chromium against the dev server): arming, placing
two snapped cabinets, Esc, selecting by click, camera drag not deselecting, empty-floor click
deselecting, no console errors.
*Found while verifying:* clicking the background outside the floor does not deselect (matches the
design, raised as an open question).
*My review:* _TODO_

**Promp 11**
> Right now even when I click empty floor the selection is not clearing.

*Result:* The AI did not guess at a fix. It re-tested in Chromium with a Retina-size screen, shaky clicks
and three floor spots, and could not reproduce it, then listed three likely causes to check (stale
page after hot reloads, a palette tool still armed, clicking the background instead of the floor).
*Outcome:* After a full refresh it worked; I had been clicking the light background around the floor.

**Prompt 12**
> Now I think clicking on the background should deselect too.

*Result:* Used R3F's built-in `onPointerMissed` on the `Canvas` (it already ignores clicks that moved
more than 2 px, so camera drags are safe): about 5 lines in `EditorCanvas.tsx`. Verified in Chromium.
*My review:* _TODO_

---

## 4. Moving, rotating, deleting, undo/redo controls

**Prompt 14**
> I tested everything and it looks great. Let's implement the second phase. About the drag, 4 px is
> fine, don't change it.

*Result:* Design before code: drag with a live position (not in history) and one move on release,
camera controls off while dragging, grab offset, an infinite floor-height plane; shortcuts as a pure
tested function (Ctrl/Cmd, Ctrl+Y for Windows, ignored while typing); header toolbar with disabled
states. Three questions for me.

**Prompt 15**
> When dragging, the item itself should move instead of a ghost, as we already use that when adding;
> keep the toolbar in the header; pressing an unselected item should select it and start dragging in
> one motion.

*Result:* Store `drag` + `startDrag/updateDrag/endDrag/cancelDrag`; drag handling in `ItemInstances`;
`shortcuts.ts` (+ tests), `useKeyboardShortcuts`, `Toolbar`. 64 tests pass.
*Lint caught:* the first version changed the camera controls object returned by a React hook; fixed by
looking the controls up at the moment the drag starts or ends.
*Verified in Chromium:* dragging an unselected cabinet selects and moves it in one motion, one undo
step, camera unchanged; Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y, R, Delete, Backspace and all four buttons; Esc
mid-drag puts the item back and releasing afterwards records nothing; disabled buttons when nothing
is selected. (A first test run failed because the test pressed beside a rotated cabinet and orbited
the camera; the test was reordered, not the code.)
*My review:* _TODO_

---

## 5. Placed-items list and properties panel

**Prompt 16**
> Now let's move on to the implementation of the next phase.

*Result:* Design before code (list in placement order, scroll-into-view, properties applied on Enter
or blur so one edit is one undo step), then three questions. My answers: names read-only and derived;
rotation as a 0/90/180/270° dropdown; x/z as text fields that accept `3.5` and `3,5`.
Built `ItemList`, `PropertiesPanel`, `i18n/format.ts` (`formatNumber`, `parseNumber`, `itemLabel`,
with tests) and `rotateItem(id, to?)`. While adding "jump to an angle", the rotation shift rule was
tightened: a 180° turn keeps the same footprint, so it no longer shifts at all (new test). 72 tests pass.
*Verified in Chromium:* row click selects in 3D and 3D click highlights the row; typing `3,5` + Enter
moves the item (one undo step); z = 1 snaps to 1.25; "abc" and Esc revert; Delete inside the field
edits text, not the layout; x = 99 clamps to the wall; 270° from the dropdown is one undo; Vietnamese
shows `0,25` and "Tủ điện 1"; selecting item 61 of 62 scrolls its row into view; no console errors.
*My review:* _TODO_

---

## 6. Clearance rule

**Prompt 17**
> OK, let's move on to the next plan.

*Result:* Design before code: pure `findViolations(items)`, edge-to-edge gap, derived (never stored),
red per-instance colour, ⚠ in the list, a "Clearance" panel with translated messages. Four questions.
My answers: true shortest distance (diagonal neighbours 0.71 m apart are allowed); live while
dragging; whole item turns red (no extra draw calls); naive pair check first, measure, then decide.
Built `rules/clearance.ts` (+ 7 tests for touching, 0.59, 0.6, rotated, overlap, diagonal),
`clearance.bench.ts`, cached `store/violations.ts` (+ tests), `{placeholder}` support in
`translate()`, `formatViolation` / `formatViolationCount` (`Intl.PluralRules`), `ClearancePanel`,
red instances in `ItemInstances`, ⚠ in `ItemList` (rows memoised). 88 tests pass.
*Measured:* ~1.1 ms per full check at 500 items on an Apple M4, so no spatial grid needed.
*Verified in Chromium:* dragging a cabinet onto a drive turns both red mid-drag with "Cabinet 1 and
Drive 1 overlap."; Esc clears it; x = 1,25 in the panel gives "… are 0.5 m apart; minimum is 0.6 m.";
clicking a message selects the item; three items give three messages; Vietnamese messages; undo
clears everything; no console errors. One fix after a screenshot: long Vietnamese names with the ⚠
badge pushed the position text onto two lines, so the position no longer wraps.
*My review:* _TODO_

---

**Prompt 18**
> There is one problem with the violation: the user should not even be able to place one block on any
> other. A warning should pop up on the screen that the block is overlapping, and the user should not
> be able to place the item.

*Result:* Design before code: refuse overlapping edits in the store helpers (like snapping), red ghost
while placing, a toast. Three questions. My answers: block all edits (place, drag, rotate, properties);
for drags, don't snap back to the start, just don't let the item go onto another one and keep showing
the warning; toast over the 3D view.
Built `rules/overlap.ts` (`findBlockingItem`, + 4 tests), overlap checks and a `notice` in the store
(+ 6 tests), `drag.target` so the item stays at the last free cell, `NoticeToast`, red ghost in
`PlacementPreview`. 98 tests pass.
*Verified in Chromium:* clicking on top of a cabinet shows "Can't put it here: Cabinet 1 is in the
way." and places nothing; dragging a cabinet across a drive stops before it, the warning pops up at
each blocked cell, the cabinet jumps to the far side once a free cell is reached, and release records
one move; R with a drive in front shows "Can't rotate: Drive 1 is in the way."; typing an overlapping z
in properties reverts the field and shows the warning; Vietnamese toast; no console errors.
(One test step was wrong at first: x = 0 snaps a drive to 0.25, where it already was, so nothing was
tried. The test was changed to an overlapping z.)
*My review:* _TODO_

---

## 7. Bill of materials

**Prompt 19**
> We have not implemented the bill of materials that we were told to do specifically. Implement that,
> and then I will review.

*Result:* Built directly (I asked to review after): pure `domain/bom.ts` (`billOfMaterials`, + 3
tests), `BomTable` (item with colour swatch, size W × D × H, quantity, total row), EN/VI headers.
Choices made without asking, listed for my review: only types in use, catalog order, catalog size
before rotation, no part numbers or prices (the brief gives none). 101 tests pass.
*Verified in Chromium:* empty message; placing a drive adds a row; 3 cabinets + 2 drives + 1
transformer gives 3 / 2 / 1, total 6; Delete gives 5 and Undo gives 6 again; Vietnamese headers and
decimal commas (0,5 × 0,5 × 1,2); no console errors.
*My review:* _TODO_

---

## 8. 500-item stress test and FPS

**Prompt 20**
> OK, let's move on to the next plan phase.

*Result:* Design before code: EN/VI audit (only the tab title was left), a pure `seedLayout(count)`
loaded by `?seed=500`, a draw-call overlay for `?stats`, and measuring idle / orbit / drag on a
production build. Pointed out that 500 items can't all keep 0.6 m apart on this floor. Three
questions. My answers: URL only; the seeded layout is the starting layout (not undoable); Claude
scripts the measurement in real Chrome and I confirm by eye.
Built `domain/seed.ts` (+ 4 tests), `nextNumbers`, store `loadLayout` (+ test), `urlOptions.ts`,
`RenderInfo`, translated tab title; the benchmark now uses the same 500-item layout. 107 tests pass.
*Measured* (MacBook Air M4, Chrome 155, three runs): 60 FPS idle, orbiting and dragging; 5 draw calls;
main thread 1.1–2.6 ms per frame; 470–900 FPS with vsync off. Rule ~1.4 ms.
*Investigated:* a single long frame in one drag run. Timed each step: selecting is fine; once the
first warning toast took 250 ms, but five repeats and three variants (no animation, no `role=alert`)
showed nothing. Recorded as a rare one-off, plus a 2.4 s pause seen only in the vsync-off scripted run.
Also moved the `?stats` meters, which covered the header title.
*My review:* _TODO_

---

## 9. 3D model optimisation

**Prompt 21**
> The test looks good and optimised. Let's move on to the next phase.

*Result:* Design before code for the model optimisation plus item: a raw model kept out of git, a
step-by-step gltf-transform pipeline, a benchmark page (raw/optimised, 1/500 copies, instancing
on/off), and the same real-Chrome measuring. Four questions. My answers: commit first, then a Khronos
sample; benchmark page only (not in the editor); KTX2 with WebP fallback; add `@gltf-transform/cli`
as a dev dependency.
Built `scripts/model-fetch.mjs`, `scripts/model-optimise.mjs`, `model-bench.html` + `src/bench/`.
KTX-Software has no Homebrew package, so it was unpacked from the official `.pkg` into `.tools/`.
Along the way: the final CLI `copy` made the file bigger (replaced by a file copy); UASTC everywhere
gave 6.29 MB, so ETC1S for colour/ORM; RDO options turned out not to reach the KTX tool (checked with
`--verbose`), so normal maps went to 512 px instead; three.js already bundles the Basis transcoder, so
the copy in `public/` was removed.
*Measured:* 48.39 → 3.42 MB, 94,722 → 53,013 triangles, 285 → 8.7 MB GPU texture memory,
39.1 → 3.55 s at 10 Mbps; 500 copies 5,264 → 11 draw calls and 78–113 → under 2 ms CPU per frame,
but still 9–13 FPS because the GPU draws 50–90 million triangles.
*My review:* _TODO_

**Prompt 22**
> Which compression library did you use?

*Result:* Meshopt for geometry, Basis Universal in KTX2 (KTX-Software) for textures, meshoptimizer's
simplifier, sharp for resizing; why Meshopt over Draco and KTX2 over WebP.

**Prompt 23**
> I have used Draco before; use that and it will definitely go under 1 MB.

*Result:* Tested before switching: Draco 3.34 MB vs Meshopt 3.42 MB, because textures are 2.97 MB
of the file. Explained that under 1 MB needs smaller textures, not Draco.

**Prompt 24**
> First report both to me, then we will decide which one is more optimised.

*Result:* Built four versions (Meshopt/Draco × 1024/512 px textures), self-hosted the Draco decoder,
measured each in Chrome: Draco 2% smaller files but its 204 KB decoder makes it 0.08 s slower at
10 Mbps; 512 px textures give 2.24 MB / 2.59 s with slightly softer logos.

**Prompt 25**
> Add this comparison table in the docs for future reference, and let's use Meshopt only.

*Result:* Removed the Draco versions, decoder and option; kept the Meshopt 1024 px (main) and 512 px
files; wrote `docs/OPTIMISATION.md` with the full results, the Meshopt-vs-Draco table and next steps;
README section and credits; decisions, assumptions, architecture, plan.
*My review:* _TODO_

---

## 10. Keyboard editing

**Prompt 26**
> Commit this and let's move to keyboard editing.

*Result:* Design before code: the list as one Tab stop (listbox, ↑/↓/Home/End), a focusable 3D view,
arrows move the selected item through the existing store helpers, and one live region whose sentences
are built from the edit command. Three questions. My answers: arrows work anywhere except text fields
and the list; fixed floor axes; one undo step per press.
Built `moveFor` / `isInListbox` (+ tests), store `nudgeItem` and `announcement` (+ tests),
`i18n/announce.ts` (`describeCommand`, `describeSelection`, + tests in EN and VI), `Announcer`, the
listbox `ItemList`, the focusable 3D view (`role="application"` + help text). 123 tests pass.
*Verified in Chromium:* Tab reaches the list, ↓/↓/End/Home select and are announced ("Drive 1
selected, x -4.75, z 2.75, 0°."), ← in the list does nothing; in the 3D view → moves 0.5 m, ↑ moves
towards the back wall, Shift+→ moves 2 m, each announced; undo/redo announced ("Undo: Cabinet 1 moved
to x 0.5, z -0.75."); at the wall "Cabinet 1 is at the wall." and nothing recorded; R and Delete
announced; Vietnamese announcement after switching; arrows inside the X field only move the cursor;
clicking the 3D view focuses it; no console errors. (One test used `window`, which doesn't exist in
the Node test runner; the test was fixed, not the code.)
*My review:* _TODO_

---

**Prompt 27**
> I was thinking about the keyboard shortcuts that we have added: we need to inform users that there
> are keyboard shortcuts too, so we need an info popup while the app loads, and then that popup stays
> in the navbar.

*Result:* Design before code: a native `<dialog>` listing every shortcut in groups (EN/VI), a header
button and the `?` key to reopen it, editor shortcuts paused while it is open, and no auto-open while
measuring. Two questions. My answers: open by itself on the first visit only; modal dialog.
Built `ShortcutsDialog` + `ShortcutsButton`, store `shortcutsOpen`, `?` in `shortcutFor` (+ test),
`isMeasuring`. 124 tests pass.
*Verified in Chromium:* opens on the first visit, not after a reload; `?`, the header button, Esc,
the backdrop and "Got it" all open/close it and focus returns to the button; → and Delete do nothing
while it is open and Esc closes only the dialog (selection kept); Vietnamese title; stays closed in a
fresh browser with `?seed=20&stats`; no console errors.
*My review:* _TODO_

**Prompt 28**
> One more thing: there is no easing animation when the popup opens and closes. Apply some kind of
> animation, something like ease in and ease out, then I will review it.

*Result:* CSS only, no JavaScript: the dialog fades in and rises slightly (opacity + small scale/move),
and the dimmed background fades with it. Opening eases out in 0.22 s (starts fast, settles); closing
eases in in 0.15 s (gathers speed as it leaves). Uses `@starting-style` and `transition-behavior:
allow-discrete` on `display`/`overlay`, so the native `<dialog>` keeps all its keyboard and focus
behaviour. Turned off for "reduce motion"; older browsers just open/close instantly.
*Verified in Chrome:* opacity sampled every frame: opening 0 → 0.24 → 0.63 → 0.91 → 1 over ~250 ms;
closing 1 → 0.98 → 0.74 → 0.34 → hidden at ~190 ms, the backdrop fading in step; same for Esc, `?`
and "Got it"; focus still returns afterwards; no console errors.
*My review:* _TODO_

**Prompt 29**
> (With a screenshot of the dialog.) It looks too jarring. As a UX engineer I prefer proper spacing
> and proper font sizes; right now it's hard to tell headings and subheadings apart.

*Result:* A clear type scale: title 20px semibold, group headings 15px semibold in normal case (were
small grey capitals), rows 14px regular, keys 12px. Spacing on a 4px grid: 24px edges and between
groups, 8px under a heading. Each group is one rounded card with lines only between its rows (were
lines across everything). Title and "Got it" stay fixed; only the list scrolls. Rows changed from a
table to a description list (`<dl>`) with flex rows, because the shared table columns squeezed short
labels to make room for the widest key cell. Only this platform's keys are shown (⌘ on a Mac, Ctrl
elsewhere), which shortened the Redo row from three alternatives to one. Keys use the UI font
instead of monospace; "+" and "/" are smaller and grey. On open, focus goes to the title (no focus
ring flashing on ✕); "0.5 m" no longer breaks across lines.
*Verified in Chrome:* screenshots at 1280×900, 1280×700 and 390 px wide, in EN and VI; footer always
visible; Tab order title → ✕ → list → "Got it", and focus stays in the dialog; no console errors.
124 tests pass, typecheck, lint and build clean.
*My review:* _TODO_

**Prompt 30**
> Push it and let's move to the assistant preview.

*Result:* Design before code: a mock behind a real-looking streaming contract
(`Assistant = (request, signal) => AsyncIterable<ReplyEvent>`), a pure fix search, the proposal as a
normal command (so Accept is one undo step), the preview derived with `applyCommand`, and stale
proposals refused. Four questions. My answers: drawer beside the 3D view; fix one or all; suggestion
chips plus free text; ghost plus arrow.
Built `src/assistant/` (`fix.ts`, `mockAssistant.ts`, `assistantStore.ts`, with tests),
`ui/AssistantPanel.tsx`, `scene/ProposalPreview.tsx`, EN/VI strings and styles. The first "fix all"
took 23 s on the packed 500-item layout (most items there have nowhere to go, and each search is
~1.5 ms); remembering items with no spot and capping at 30 tries brought it to ~0.1 s. 152 tests pass.
*Verified in Chrome (`?seed=24`):* the reply streams (`aria-busy` while streaming), "Fix one" 37 → 36
problems, Accept applies it and one Cmd+Z puts it back; "Fix all" proposes 10 moves (37 → 14) with
blue ghosts and dashed arrows; deleting an item marks the proposal out of date and removes Accept;
typed "tóm tắt" gives the Vietnamese summary; no console errors.
*My review:* _TODO_

**Prompt 31**
> Now we have to change some parts of the UI, as it looks very cluttered right now. (Screenshot of the
> drawer.) Right now the assistant takes the whole space on the right. I want it to just sit as a
> bubble at the bottom, and when the user clicks it, the whole chat should appear.

*Result:* The drawer column and the header button are gone. A round ✨ bubble sits in the bottom-right
corner of the 3D view; clicking it opens a 380 × 560 px chat window above it (non-modal, so the 3D
view still works). ✕, Esc or the bubble (now ✕) close it, and focus goes back to the bubble. Same
ease-out / ease-in animation as the shortcuts dialog. The chat stays mounted but hidden and inert
while closed, so the conversation and a waiting proposal survive; an orange dot on the bubble (with
screen-reader text) says a suggestion is waiting. The "demo" note moved into the greeting. The
`?stats` overlays moved to the bottom-left so they don't sit under the bubble.
*Verified in Chrome:* the 3D view is 880 px wide with the chat open or closed (it narrowed before);
the input gets focus on open; Esc closes it and focuses the bubble; the dot shows while a proposal
waits and goes after Accept (37 → 14 problems); no console errors.
*My review:* _TODO_

**Prompt 32**
> One more thing: the panel should have a button so that the user can close and open it as needed.

*Result:* One question (which panel). My answer: both side panels. Each side panel got a chevron
button in its top corner (`SidePanel`, `usePanelOpen`). Closed, the column shrinks to a 40 px strip
that keeps only the button; the grid columns animate (ease-out 0.22 s, off for reduce motion) and the
3D view takes the space. The contents are `hidden` while closed. The choice is remembered in
`localStorage`. EN/VI labels such as "Hide palette and placed items".
*Verified in Chrome (1440 px wide):* 3D view 880 px → 1,100 px (left closed) → 1,360 px (both closed),
and the canvas re-renders at the new size; Enter on the focused button works and focus stays on it;
the closed state survives a reload; Vietnamese labels; no console errors.
*My review:* _TODO_

---

_Template for each entry:_

**Prompt N**
> (the prompt)

*Result:* (what came back)
*My review:* (what I accepted, what I changed and why)
