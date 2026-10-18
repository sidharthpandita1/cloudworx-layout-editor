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

_Template for each entry:_

**Prompt N**
> (the prompt)

*Result:* (what came back)
*My review:* (what I accepted, what I changed and why)
