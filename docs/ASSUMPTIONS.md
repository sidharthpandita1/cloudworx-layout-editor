# Assumptions

The brief asks us to state assumptions and proceed rather than ask. Each one here is a decision the
brief left open. Copy the final list into the README.

## Floor and placement

1. The floor is 20 m (x) × 12 m (z), centred on the world origin, so x runs −10…10 and z runs −6…6.
2. Item footprints are whole numbers of 0.5 m cells (cabinet 2×1, drive 1×1, transformer 3×2).
   This keeps snapping exact: footprint edges always sit on grid lines.
3. Rotation is in 90° steps only. Electrical rooms are laid out square to the walls, and it keeps both
   snapping and the clearance check simple (footprints stay axis-aligned rectangles).
4. Items must stay fully inside the floor. Placement or moves that would cross the edge are clamped
   to the nearest valid position (not rejected), so a drag that ends slightly past a wall still lands.
4a. Rotation turns an item about a fixed pivot. Items whose footprint mixes an odd and an even number of
    cells (the 2×1 cabinet, the 3×2 transformer) shift half a cell (0.25 m) on rotation to stay aligned:
    forward going to 90°/270°, back going to 0°/180°, so two or four turns return exactly to the start.
    Exception: against a wall the clamp can move the item, so rotating back may not return it to the
    exact same spot. Undo always does.
5. Overlapping items are allowed but always flagged by the clearance rule (gap < 0.6 m includes
   negative gaps).

## Clearance rule

6. "Closer than 0.6 m" means the **edge-to-edge gap between footprints**, not centre-to-centre distance.
   Centre distance would let two large cabinets overlap without a warning, which defeats the point
   of a clearance rule.
7. Gap is measured as the shortest distance between the two rectangles (so corner-to-corner counts).
8. Exactly 0.6 m is allowed; 0.59 m is a violation.
9. Height is ignored; the rule is a floor-plan rule.

## Editing

10. Selection changes are not part of undo history; only edits to the layout are.
11. A drag is one undoable step, regardless of how many cells it passes through.
12. Undo history is kept in memory for the session only (no persistence), capped at the last 200 edits.
    Older edits can no longer be undone (normal behaviour in tools like Figma and VS Code). In the real
    product the server keeps the long-term record of every saved command.
13. A newly placed item becomes the selected item.
14. Items are named by type and a per-type number ("Cabinet 3"). Numbers are never reused after a delete,
    so a message naming two items is never ambiguous. The type name is translated; the number is not.
15a. After placing an item, the palette tool stays armed so several can be placed in a row. Esc (or
     clicking the armed button again) stops placing; Esc with nothing armed clears the selection.
15b. While placing, clicking on top of an existing item places a new one at that floor point (overlap is
     allowed and flagged by the rule, see 5). Selecting needs the tool disarmed.
15c. Rendering allocates 2,000 instances per item type (the brief's maximum scene size). Items beyond
     that per type are kept in the store but not drawn.
15d. Clicking empty floor or the background outside the floor clears the selection (unless a palette tool
     is armed). A camera drag never does.
15e. Pressing on an item (no palette tool armed) selects it and starts a drag in one motion. A press
     without movement is just a selection and records nothing.
15f. While dragging, only Esc works (it cancels the drag and puts the item back); undo, redo, rotate and
     delete wait until the drag ends, so history never changes under a drag in progress.
15g. Esc backs out one level at a time: cancel drag, then stop placing, then clear selection.
15h. Undoing a delete brings the item back but does not reselect it (selection is not in history, see 10).
15i. The placed-items list is in placement order. Selecting an item anywhere highlights its row and
     scrolls it into view only if it is hidden.
15j. Item names cannot be edited; they are always "translated type + number".
15k. x and z in the properties panel are the item's centre in metres (floor centred on 0). A typed value
     is applied on Enter or when leaving the field, then snapped like a drag, so the field may show a
     slightly different number (a cabinet's z of 1 becomes 1.25, because a one-cell-deep item sits
     mid-cell). Text that isn't a number reverts; Esc puts the old value back. Both `3.5` and `3,5` are
     accepted; there is no thousands separator (the floor is 20 m wide).
15l. Choosing a rotation in the dropdown is one undo step, even when it jumps more than 90°. A 180° turn
     never shifts the item.

## Measurement

15. FPS is measured on a production build (`npm run build && npm run preview`), at 1080p browser window,
    with the `?stats` counter, after the scene settles.
