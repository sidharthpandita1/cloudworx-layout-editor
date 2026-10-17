# Assumptions

The brief asks us to state assumptions and proceed rather than ask. Each one here is a decision the
brief left open. Copy the final list into the README.

## Floor and placement

1. The floor is 20 m (x) × 12 m (z), centred on the world origin, so x runs −10…10 and z runs −6…6.
2. Item footprints are whole numbers of 0.5 m cells (cabinet 2×1, drive 1×1, transformer 3×2).
   This keeps snapping exact: footprint edges always sit on grid lines.
3. Rotation is in 90° steps only. Electrical rooms are laid out square to the walls, and it keeps both
   snapping and the clearance check simple (footprints stay axis-aligned rectangles).
4. Items must stay fully inside the floor. Placement or moves that would cross the edge are clamped.
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

## Measurement

15. FPS is measured on a production build (`npm run build && npm run preview`), at 1080p browser window,
    with the `?stats` counter, after the scene settles.
