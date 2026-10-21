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
*My review:* Kept the setup as it was, and used the docs from here on to record decisions and assumptions as they came up.

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
*My review:* The three choices were mine: rotate about a fixed pivot, clamp at the walls, and snap inside the store. The changed test is right: with clamping, a move past the wall lands in the same spot, and a move that changes nothing shouldn't add history. Before moving on, I asked for a full summary to match against the code (prompt 8).

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
*My review:* Tried it myself and thought deselecting was broken (prompt 11). It was working; I had been clicking the light background around the floor, which gave me the idea for prompt 12.

**Prompt 11**
> Right now even when I click empty floor the selection is not clearing.

*Result:* The AI did not guess at a fix. It re-tested in Chromium with a Retina-size screen, shaky clicks
and three floor spots, and could not reproduce it, then listed three likely causes to check (stale
page after hot reloads, a palette tool still armed, clicking the background instead of the floor).
*Outcome:* After a full refresh it worked; I had been clicking the light background around the floor.

**Prompt 12**
> Now I think clicking on the background should deselect too.

*Result:* Used R3F's built-in `onPointerMissed` on the `Canvas` (it already ignores clicks that moved
more than 2 px, so camera drags are safe): about 5 lines in `EditorCanvas.tsx`. Verified in Chromium.
*My review:* Small change, kept as is. Tested it together with the rest of this phase before moving on (prompt 14).

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
*My review:* The behaviour was my call: the item itself moves (no ghost), the toolbar stays in the header, and pressing an unselected item selects and drags it in one motion. Accepted the lint fix for the camera controls.

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
*My review:* My answers set the main choices: read-only names, a rotation dropdown, and x/z fields that accept both `3.5` and `3,5`, since Vietnamese uses a decimal comma. Accepted the 180° change: a half turn keeps the same footprint, so the item shouldn't shift.

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
*My review:* The four answers were mine: true diagonal distance, live while dragging, the whole item turns red, and measure before optimising (it was fast enough, so no spatial grid). Trying it, I noticed items could still be placed on top of each other, which became prompt 18.

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
*My review:* My answers decided the behaviour: block every kind of edit, and while dragging, stop at the last free cell instead of jumping back to the start. The corrected test is fine: x = 0 snapped to where the drive already was, so the old step tested nothing.

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
*My review:* Went through the four choices it made without asking and kept them: only types in use, catalog order, size before rotation, and no part numbers or prices, because the brief gives none.

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
*My review:* The answers were mine: URL options only, the seeded layout is not undoable, and Claude scripts the measurement while I check it by eye. My check with `?seed=500&stats` matched: 60 FPS and 5 draw calls.

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
*My review:* My answers: a Khronos sample model, the benchmark on its own page (not in the editor), and KTX2 with a WebP fallback. The numbers looked good, but I questioned the compression choice next: I asked which library it used, then pushed for Draco because I had used it before (prompts 22 and 23).

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
*My review:* My decision after seeing both measured: Meshopt only. Draco files were 2% smaller, but its decoder made loading slower, so it didn't actually win. Kept the comparison table in `docs/OPTIMISATION.md` for reference.

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
*My review:* My answers set the rules: arrows work everywhere except text fields and the list, fixed floor axes, and one undo per press. Using it, I felt people wouldn't know the shortcuts exist, so I asked for a shortcuts popup (prompt 27). The plus item was removed later (prompt 35), but Part A section 4 points to this commit as the prototype for the 3D keyboard path.

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
*My review:* Opening on the first visit only, and a modal dialog, were my answers. It worked, but opening and closing felt abrupt, so I asked for an animation (prompt 28).

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
*My review:* The animation was fine. Looking at the dialog again, the real problem was the type and spacing (prompt 29).

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
*My review:* Approved and pushed (prompt 30). Headings and rows are now easy to tell apart, and showing only this platform's keys made the list shorter.

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
*My review:* My answers shaped it: fix one or fix all, chips plus free text, and a ghost with an arrow. The first "fix all" took 23 s on the packed layout; remembering items with no spot and capping the tries brought it to about 0.1 s. The drawer was my choice too, but in the browser it took too much room, so I changed it to a bubble (prompt 31).

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
*My review:* Much cleaner: the 3D view keeps its full width whether the chat is open or closed. With that done, I wanted the side panels to close too (prompt 32).

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
*My review:* Both panels was my answer, and I kept the result. After this I decided to stop adding extras (prompt 33).

**Prompt 33**
> We are stopping on extras right now, so two things I am thinking of removing: keyboard shortcuts and
> screen-reader announcements. → (after Claude's advice to keep both) Remove the screen-reader
> announcements first only.

*Result:* Claude advised keeping both (keyboard editing with announcements is a plus item in the brief
and supports Part A section 4) and asked what to remove; my choice: the announcements only. Removed
`ui/Announcer.tsx`, `i18n/announce.ts` (+ tests), the store's `announcement` state and `announce()`,
and the `announce.*` strings. `nudgeItem` now just calls `moveItem` (which already stops at the wall).
Kept: labels, the listbox pattern, the warning toast, the clearance count, the assistant log.
Docs updated (README, DECISIONS, ASSUMPTIONS 24, ARCHITECTURE, PLAN). 146 tests pass.
*My review:* Claude advised keeping both, and I chose to remove only the announcements. Then I looked at the brief again and thought keyboard editing was needed (prompt 34), so this removal was undone.

**Prompt 34**
> (Screenshot of the brief's Part B list.) As you can see in the image, the keyboard shortcuts are in
> Part B.

*Result:* The brief's "Keyboard editing" plus item reads "Select, move by one cell and delete from the
keyboard, with screen-reader announcements", so both stay. The removal from prompt 33 was not
committed, so it was undone by restoring the files from the last commit (`git restore`): the
announcer, its strings and tests, and the docs are back as they were. 152 tests pass.
*My review:* Reading the brief more carefully, keyboard editing is in the "pick any" list, so it is optional. I changed course in the next prompt.

**Prompt 35**
> No, no, read the document properly: it says "pick any". We already have the assistant, so we can
> safely remove keyboard shortcuts, right?

*Result:* Yes: plus items are optional, and model optimisation and the assistant preview stay. Claude
noted the trade-offs (a finished third plus item; Part A section 4 asks about keyboard and screen
readers; Ctrl+Z, R, Delete and Esc belong to the core editing) and asked how much to remove. My
choice: the plus item only. Removed arrow-key moves, the list's keyboard navigation (rows are plain
buttons again), the screen-reader announcer, the shortcuts dialog and its header button, and their
strings, styles and tests, mostly by restoring the files from before the keyboard commit
(`de43274`). Kept Ctrl/⌘+Z, Ctrl/⌘+Shift+Z / Ctrl+Y, R, Delete/Backspace and Esc. Docs updated
(README, DECISIONS, ASSUMPTIONS 21, ARCHITECTURE, PLAN). 138 tests pass.
*Verified in Chrome:* no dialog on the first visit and no Shortcuts button; → does nothing; R rotates
and ⌘Z undoes it; Esc deselects; Delete removes; `?` does nothing; no console errors.
*My review:* My call. The plus items are optional, and model optimisation and the assistant preview were already done, so I preferred a smaller, finished submission. The core shortcuts stay: undo, redo, rotate, delete and Esc.

**Prompt 36**
> In ASSUMPTIONS.md we have to add that I am assuming the sign-in is in the editor because the host
> owns it, and "Backends expose REST plus a WebSocket channel for live updates" is also owned by the
> host, right?

*Result:* Half right. Sign-in: the host owns it, so the editor has *no* sign-in. Backends: they are
separate services, not part of the host; the host only passes the token, and the editor calls REST and
the WebSocket itself. This prototype has no backend at all (layout in memory, mock assistant). Added
ASSUMPTIONS 29 (no sign-in in the editor) and 30 (no backend; how the real product would use REST and
WebSocket), in a new "Host app and backends" section.
*My review:* I had mixed up the host and the backends. The host owns sign-in and only passes the token; the backends are separate services that the editor calls itself. Accepted assumptions 29 and 30 as corrected.

**Prompt 37**
> I need to write Part A of my assessment: the architecture design document. Read the brief, my
> notes, the repo docs and the code first. Do NOT write the document yet. First give me: a) a proposed
> outline (title page, sections 1–9, the A2 parts and the A1 diagram, 3–5 bullets each); b) for each
> section, what is backed by real code or measurements and what is design-only; c) the places where
> the brief contradicts itself, each with a proposed assumption; d) a diagram tool and file format that
> stays editable for the call; e) a target length (about 10–14 pages). Never invent measurements.

*Result:* Claude read the brief, `notes/`, the docs and the code, and replied with the outline, a
backed/design-only map per section, 14 tensions in the brief with a proposed assumption each, draw.io
for the diagrams, and a 13-page budget. One new measurement was taken for it: the production build's
first-load files are about 336 KB gzipped (`npm run build`, then gzip -9 of the files `index.html`
loads). Nothing written into the document yet.
*My review:* Going through the evidence map, I found a claim that was wrong: host re-theming was marked as partly built, and it is not (prompt 38).

**Prompt 38**
> "Design tokens are CSS variables, so the host can re-theme the 3D app at runtime": we have not
> implemented this feature.

*Result:* Correct. Claude checked `src/index.css` and `src/scene/`: Part B has 6 colour variables for the
panels (`--bg`, `--panel`, `--border`, `--text`, `--muted`, `--accent`; the other 4 variables are panel
widths), the 3D colours are hard-coded in the scene files, and nothing reads a theme from a host. The
earlier answer had wrongly marked this as partly backed. In Part A it will be labelled design only, with
the honest Part B state, and no claim that re-theming works.
*My review:* After this I asked Claude to re-read the whole codebase and redo the plan, so nothing else was made up (prompt 39).

**Prompt 39**
> Keep in mind that we are not working on extras, just the core part of the application, so go
> through the codebase thoroughly again and then go through the same prompt again so you don't
> hallucinate again.

*Result:* Claude re-read every source file in `src/` and `scripts/`, the config and the measurement
folder, then redid the Part A plan (outline, evidence map, tensions in the brief, diagram tool, length)
with each claim checked against the code. Corrections to the first answer: the 3D view does not
recolour items for a proposed fix (only the chat card shows the before → after count); accepting a
proposal does not re-check it (it relies on `fix.ts` and the stale check); the render loop runs every
frame (not on demand); culling is per item type, not per item; the 3D canvas has no accessible name;
all 138 tests are logic and store tests (no component or browser tests, no CI); the Playwright
measurement scripts live in the gitignored `.cache/measure/`, and the script behind the README's
500-item FPS numbers is no longer kept. Also found two stale doc lines (DECISIONS "Assistant
proposals" still mentions the removed screen-reader announcement; ARCHITECTURE says `domain` imports
nothing app-specific, but `types.ts` imports the `MessageKey` type).
*My review:* The re-read fixed real mistakes in the first plan, for example that accepting a proposal doesn't re-check it, and that there are no component tests. I approved the outline with my changes in prompt 40.

**Prompt 40**
> Outline approved, with changes: add a half-page appendix "If the constraints change" (a much
> larger scene; a host that forbids iframes), all marked as design; make CJK line breaking explicit
> in section 4 (`lang` drives the browser's rules, `line-break: strict`, never `word-break:
> break-all`); aim for 12 pages. Fix doc mistakes 1 and 2; for the second, fix the code: make
> `nameKey` the template literal type `` `item.${ItemTypeId}` `` and remove the i18n import, then run
> typecheck and tests. Don't re-measure FPS; add one README sentence that the Playwright script was a
> one-off. Keep the "Part B proves / design only" box and the M4 sentence. (I'll give Prompt 2, the
> writing of sections 1–3, separately.)

*Result:* `src/domain/types.ts` no longer imports from `i18n`, so `domain` now imports nothing
app-specific, as ARCHITECTURE says. A missing translation is still caught: `t(type.nameKey)` fails the
typecheck if `en.ts` lacks the key. DECISIONS "Assistant proposals" row no longer mentions the removed
announcement. README method paragraph says the script was a one-off and how to repeat the by-eye
check. Typecheck, 138 tests and lint pass. The approved outline, with the appendix, the CJK bullet, a
12-page budget, the evidence map and the 14 assumptions, is saved in `notes/part-a/OUTLINE.md`
(private). Nothing written in the document yet.
*My review:* The domain fix keeps the layer rule true, and a missing translation still fails the typecheck. Approved. Next I asked for sections 1 to 3 (prompt 41).

**Prompt 41**
> Prompt 2: write the sections. Write the document one section at a time and stop after sections 1–3
> so I can review; continue when I say "next". For every section: what I'd do, why, and what I
> rejected. Where Part B already does it, point to the file and function; where it doesn't, say
> "design only". Target numbers go in tables, labelled as targets. Each section short enough to
> present in about 2 minutes. (Also specific asks for sections 4, 5, 7 and 9, for later.)

*Result:* The title page (with the "Part B proves / design only" box and the M4 note), a placeholder
for the diagram, and sections 1–3, written in the private notes folder (not in the repo). Every
Part B pointer was checked against the code; targets sit in tables marked "Target". Section 3 was
tightened from about 530 to 450 words, as agreed. Stopped there for review.
*My review:* Approved with three changes to section 2 (prompt 42): drop the unsent queue and reload when a save is refused, the URL row for the first app only, and a WebSocket heartbeat.

**Prompt 42**
> Sections 1–3 approved with three changes to section 2: on any refused save, drop the unsent queue,
> reload the layout and tell the user which edits were lost (and reject "re-apply the queue one by
> one"); the URL row is for the first app only, since the 3D app has no router and gets its context
> from the host; add a WebSocket heartbeat (ping every 30 s, reconnect after two missed pings). Keep
> the notes folder. Commit the four repo files, then write section 4 and stop.

*Result:* Section 2 changed as asked. Committed `README.md`, `docs/DECISIONS.md`, `PROMPTS.md` and
`src/domain/types.ts` as "Fix domain layer import; correct docs and README measurement note" (not
pushed). Section 4 written: three languages from one build, locale formats with real `Intl` output
checked in Node, CJK line breaking, WCAG 2.2 AA, and the 3D view's keyboard and screen-reader path,
with the removed keyboard editing (`a751f17`) named as its prototype. Cut from about 960 to 730 words.
*My review:* Approved with two changes (prompt 43): keyboard paths for the first app, and say exactly what commit `a751f17` built.

**Prompt 43**
> Section 4 approved with two changes and a trim to section 2: add three lines on keyboard paths in
> the first app (list, grid, multi-step form); state exactly what commit `a751f17` built; cut one
> sentence and merge the heartbeat sentences in section 2 (about 750 words). Word caps from here
> (sections 5 and 7 at most 600 words, 6, 8 and 9 at most 450). Write section 5 (postMessage table,
> token refresh, origin checks, CSP, cookies, host theme) and stop. Then: "open the pdf after
> finishing".

*Result:* Changes made; section 2 is about 760 words. Correction to the prompt: `a751f17` did build
the Shift move (`moveFor` and `BIG_MOVE = 2` in `src/ui/shortcuts.ts` at that commit), so the text says
it built the listbox, arrow-key moves (one cell, Shift 2 m, one undo step per press) and the live
region. Section 5 written, about 550 words. Built a PDF from the notes with Chrome (a small script in
the job's temp folder; `marked` for Markdown) and opened it: 10 A4 pages for the title, diagram
placeholder and sections 1–5. First render had the title lines run together and big gaps before
long tables; both fixed.
*My review:* Claude corrected me on `a751f17`: it did build the Shift move, and I kept the corrected text. Section 5 approved. I set the PDF layout rules next (prompt 44).

**Prompt 44**
> You were right about `a751f17` and the Shift move; keep the corrected text. Section 5 approved. Keep
> the build script in the notes folder. PDF layout: don't shrink the font or margins; no forced page
> break per section, headings never alone at the bottom of a page; tables of 12 rows or fewer never
> split, longer ones repeat their header; title page as is, diagram from page 2. Rebuild and give the
> page count. Then write section 6 (at most 450 words), marking built vs design, and stop.

*Result:* The build script now lives next to the document with its own `package.json` (`marked`),
uses paths relative to itself, and prints the page count. Layout rules applied; the section 2 target
table no longer splits. Title, diagram placeholder and sections 1–5: still 10 pages, because the
9-row message table in section 5 must move whole to the next page. Section 6 written at 449 words,
with a measured-vs-target table (5 draw calls, ~1.4 ms rule check, 1.8–2.6 ms main thread while
dragging, all at 500 items on the M4) and the 2,000-item all-pairs cost labelled as an estimate. With
section 6: 11 pages.
*My review:* Section 6 approved. The page count kept growing, so I asked to trim sections 2 and 4 by cutting "Why" bullets that repeat a reason (prompt 45).

**Prompt 45**
> Section 6 approved. 14–15 pages is acceptable. Trim sections 2 and 4 to about 650 words each by
> removing "Why" bullets that repeat a reason already given, keeping every table and "In Part B"
> line; keep only tables of 8 rows or fewer unsplit. Then write section 7 (at most 600 words): the
> pipeline steps (what Part B runs, what the product adds), Meshopt over Draco with the measured
> reason, a per-model and a per-scene target table with measured values beside each target,
> runtime loading and culling, and the honest line about the 500-copy benchmark. Then stop.

*Result:* Removing the repeated "Why" bullets alone left sections 2 and 4 near 700 words, so a few
sentences were also tightened (the WebSocket paragraph, the retry bullets, the opening of section 4,
the `a751f17` sentence); both are now about 675 words, with every table and "In Part B" line kept.
Table rule changed to 8 rows. Section 7 written at about 550 words, every number taken from
`docs/OPTIMISATION.md` or the README, targets in a "Target" column, total memory marked "not
measured". PDF: 12 pages through section 7.
*My review:* Approved. I added a short "Do the budgets add up?" check after the per-scene table (prompt 46), so the targets are shown to fit together.

**Prompt 46**
> Section 7 approved with one addition after the per-scene table, "Do the budgets add up?" (three
> sentences, labelled estimate: textures allow about 32 models at full texture detail; two materials
> × three levels allows about 50 visible models under the draw-call cap; the triangle budget means
> most items at the low level). 15–16 pages accepted, no more trimming. Then write section 8 (at most
> 450 words): the built contract and proposal flow, what production adds (streamed HTTPS with the
> host's token, schema plus store-rule checks before preview, layout version, server re-check, no
> free text), and the honest line that `accept()` doesn't re-check today. Then stop.

*Result:* Addition placed after the per-scene table; its arithmetic checks out (8 MB × 32 = 256 MB;
300 / 6 = 50; 2 million / 2,000 = 1,000, and 400 triangles is the 2% low level of a 20,000-triangle
model). Section 7 is now about 655 words because of it. Section 8 written at about 405 words; every
built claim checked against `src/assistant/*` and `ProposalPreview.tsx`. One detail added: the
stream is read with `fetch`, because `EventSource` can't send an `Authorization` header.
*My review:* Section 8 approved as written. Good catch on reading the stream with `fetch`, since `EventSource` can't send the token.

**Prompt 47**
> Section 8 approved. Write section 9 (at most 450 words): a budget table (one row per budget in the
> brief, how it is met, the Part B number and whether it is measured, a target or not measured); how
> it is measured in CI, honestly (no CI today; the plan; frame rate on a reference laptop, not in CI);
> error reporting (Sentry, an error boundary around the 3D view, WebGL context loss rebuilt from the
> store, metrics), noting Part B has none; the testing layers, built or design. Then stop.

*Result:* Section 9 written at 450 words. Every Part B number is marked measured, estimate or not
measured (memory and integrated graphics are "not measured"). Added a small CI target table (first
load ≤ 400 KB gzipped; no rise in draw calls or triangles over the recorded baseline) and a
testing-layers table. "In Part B" says plainly: no CI, no component or browser tests, no error
reporting, and the FPS script was a one-off.
*My review:* Approved with one addition: the vsync-off headroom from the README in the 50 fps row (prompt 48).

**Prompt 48**
> Section 9 approved; add the README's vsync-off figure to the 50 fps row. Fix the orphan line with
> CSS (orphans and widows 2), not by editing text. Then write A2-1 (a choices table, at most 14 rows:
> Choice / Why / Rejected, design-only rows marked), A2-3 (at most 10 rejected trade-offs that change
> the shape of the design) and the appendix "If the constraints change" (a much larger scene; no
> iframes; at most 450 words, all design). Leave the sequence and the assumptions for the next prompt.

*Result:* Done, with A2-2 and A2-4 left as one-line placeholders so the order shows. The orphan line
is gone. A2-1 has 14 rows condensed from `docs/DECISIONS.md` plus the design-only rows; A2-3 has 9
items; the appendix is about 270 words. Correction to the prompt: 10,000 items are about 400× the
pairs of 500, so the all-pairs check goes from 1.4 ms to about 0.56 s on the M4 (estimate), not
"seconds"; the text says 0.56 s, and more on a slower laptop. The appendix also notes that Part B's
instance capacity (2,000 per type) would have to grow. PDF: 16 pages.
*My review:* Approved. Claude corrected my "seconds" for 10,000 items: about 0.56 s on the M4 (estimate), and more on a slower laptop.

**Prompt 49**
> A2-1, A2-3 and the appendix approved. Now write A2-2 (nine numbered steps, each built or design,
> with real names and real message texts, then a Mermaid sequence diagram with eight lanes) and A2-4
> (at most 20 one-line assumptions, grouped: scenario, editor, host and backend). Then stop.

*Result:* Both written. Two corrections to the prompt: (1) Part B's grid is 0.5 m and footprints are
whole cells, so a gap under 0.6 m is always 0 m or 0.5 m; the quoted message says "0.5 m apart", not
0.4 m, and the text explains why. (2) The undo in step 9 reverts the assistant's move, which may move
either item, so it says "the moved item goes back". The listed assumptions came to 25, so to stay
within 20 lines two pairs of scenario assumptions share a line and "one engineer per layout" appears
once: 19 lines. The PDF build now renders Mermaid (from a CDN at build time) and puts the diagram on a
landscape page of its own so its text is readable; labels in the diagram were shortened for the same
reason. PDF: 18 pages.
*My review:* Approved; I only asked to reword assumption 4 so it matches the texture numbers in section 7 (prompt 50). Both corrections were right: on this grid a gap under 0.6 m is 0 or 0.5 m, and undo moves back whichever item the assistant moved.

**Prompt 50**
> A2-2 and A2-4 approved; reword assumption 4 to agree with the texture arithmetic in section 7. Then
> the A1 architecture diagram, in two files: a Mermaid flowchart rendered into the PDF on its own
> landscape page, and the same diagram as draw.io XML with explicit coordinates for live editing.
> Boxes grouped, the iframe as a container, a protocol on every arrow, solid for what Part B builds and
> dashed for design, a legend, at most 20 boxes. Rebuild, report the page count and whether the
> diagram text is readable at print size, and say which draw.io boxes I'll likely move.

*Result:* Assumption 4 reworded. `architecture.mmd` (19 boxes including the legend, 19 arrows, each
labelled) replaces the placeholder on a landscape page. Readability took several tries, measured in
the browser rather than judged by eye: the first render printed labels at about 4.6 pt because a
caption style in the build also shrank the diagram's labels; after removing it and comparing 16
layout settings, the default layout left to right with 24 px text and tight spacing prints at about
8.2 pt. The sequence diagram prints at about 7.1 pt. `architecture.drawio` has the same boxes and
labels with explicit coordinates, nested containers for the host page and the iframe, and was
checked as valid XML with no dangling arrows; draw.io isn't installed here, so it was not opened. PDF:
18 pages.
*My review:* The arrows to the backends were hard to follow, so I described the layout I wanted (prompt 51).

**Prompt 51**
> The A1 arrows to the backends aren't followable. Fix the diagram: backends as three separate boxes in
> a column at the far right; CDN in the bottom row next to the asset pipeline; the modules in the
> iframe in three fixed rows; one-line arrow labels; the procurement app directly below the iframe
> with its arrows going right. Check the label size at print size. Then do the final check of the
> document against the brief (sections 1–9, A1, A2, the evaluation table), list every number not from
> the repo docs or the brief and not labelled, and every "built" claim with the file that proves it.
> Report only.

*Result:* Mermaid's automatic layouts (dagre and ELK) build layers, so they can't pin a row of boxes
side by side while also stacking rows; the fixed grid asked for is not possible there. The diagram
is now drawn from explicit coordinates by a small script in the notes folder, which writes both the
SVG for the PDF and the draw.io file, so the two can't drift; the Mermaid file is marked superseded.
All five layout points are met with no crossing lines; the "load model" arrow from scene to asset
loader was dropped because it can't be drawn in that grid without crossing (it wasn't in the
requested list). Printed size: about 8.3 pt for box names, 7.4 pt for arrow labels. PDF: 18 pages.
Final check reported in the conversation; the document was not edited.
*My review:* Diagram approved. From the final-check report, I asked for its text fixes plus three more arrows (prompt 52).

**Prompt 52**
> Diagram approved; delete the Mermaid file. Add three arrows to the diagram (the procurement app's
> sign-in to the identity provider up the left edge; its assistant stream along the bottom; "called by
> Scene" under the asset loader, since that arrow can't be drawn without crossing). Apply the text
> fixes from the final check: Surface 1 screen-reader paths, Surface 1's assistant, plain-words glosses
> at first use, and exact wording for the assistant contract, the layer rule, `execute`, and how the
> 336 KB figure was measured. Rebuild and report the page count.

*Result:* Done. The procurement app's three backend arrows run in nested lanes so none cross; the
new sign-in arrow runs up the left edge outside the shared packages; still no crossing lines. Glosses
were placed at the first use of each term in the text (KTX2 in the CSP table, UASTC and ETC1S in
section 7, idempotency key and CRDT in section 2, SSE in section 8). Before relabelling the 336 KB
figure it was measured again on the current build: 336,105 bytes gzipped. PDF: 19 pages.
*My review:* Approved. Then I asked to make the three origins (host, 3D app, backends) explicit everywhere (prompt 53).

**Prompt 53**
> Make one design fact explicit everywhere: the 3D app is deployed at its own URL on its own domain,
> the host embeds that URL in the iframe, and the procurement app has its own domain, so host, 3D app
> and backends are three origins. Edits to the title page, section 1, section 5 (origins, CORS,
> "opened directly"), the appendix, the assumptions and the diagram labels. Rebuild and report.

*Result:* All edits applied; PDF 19 pages. One correction to the appendix wording: without the
iframe, the app's script runs in the host's page, so API requests carry the host's origin, not the
app's; the text now says the CORS allowlist must add the host's origin, and that cookies stay out
because the API is still on another site. The new domain assumption is the first line of the "Host and
backend" group (now 20 assumptions).
*My review:* Accepted, including the appendix correction: without the iframe, the app's requests come from the host's page, so CORS has to allow the host's origin.

---

_Template for each entry:_

**Prompt N**
> (the prompt)

*Result:* (what came back)
*My review:* (what I accepted, what I changed and why)
