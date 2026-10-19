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
5. Items can never overlap (share floor area). Placing, dragging, rotating or typing a position that
   would overlap is refused, and a warning names the item in the way. Touching is allowed (and still a
   clearance warning). Undo and redo can't create an overlap, because they only return to earlier states,
   which were all free.
5a. While dragging, the item does not follow the pointer onto an occupied cell: it stays at its last free
    cell and the warning pops up again each time the pointer reaches another occupied cell. Releasing
    there drops the item at that last free cell (it does not jump back to where the drag started).
5b. The warning disappears after 3 seconds. While placing, the ghost turns red over an occupied spot.

## Clearance rule

6. "Closer than 0.6 m" means the **edge-to-edge gap between footprints**, not centre-to-centre distance.
   Centre distance would let two large cabinets overlap without a warning, which defeats the point
   of a clearance rule.
7. Gap is measured as the shortest distance between the two rectangles (so corner-to-corner counts).
8. Exactly 0.6 m is allowed; 0.59 m is a violation.
9. Height is ignored; the rule is a floor-plan rule.
9a. The rule is between items only; the distance to the walls is not checked.
9b. Touching items are "0 m apart". The rule still has an "overlap" message, but since overlaps are
    refused (see 5) it only shows if a layout with overlaps is ever loaded from outside.
9c. Warnings update live while dragging, using the dragged item's current cell.
9d. The clearance panel shows at most 50 messages, then "and N more". Clicking a message selects the
    first item it names.

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
15b. While placing, clicks on items go to the floor point underneath; if that spot is occupied the
     placement is refused (see 5). Selecting needs the tool disarmed.
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
15m. The bill of materials counts the saved layout (an item being dragged counts once, as always). It
     lists only the types in use, in catalog order, with the catalog size (width × depth × height,
     before rotation) and a total. No part numbers or prices: the brief gives none.
18. The model benchmark page is a developer tool: English only, not part of the editor.
19. The raw model is never committed (48 MB). `npm run model:fetch` downloads it; without it the
    benchmark page loads the raw version from the Khronos repository.
20. GPU texture memory figures are `gltf-transform inspect` estimates, not browser measurements.
21. The keyboard covers the core edits only: undo, redo, rotate (R), delete and Esc. There are no
    arrow-key moves and no screen-reader announcements of edits (see DECISIONS, "Keyboard editing").
    Refused edits are still read out, through the warning toast (`role="alert"`).

## Assistant

22. The assistant is a mock that runs in the browser (the brief asks for a mock). It understands three
    requests: fix one clearance problem, fix all, and summarise. Typed text is matched by keywords in
    English or Vietnamese; anything else gets a short "what I can do" reply.
23. "Fix" means moving items only, never rotating or deleting them. A moved item keeps its rotation and
    ends up at least 0.6 m from everything. "Fix one" fixes the selected item's problem if it has one,
    otherwise the first problem in the list.
24. "Fix all" proposes at most 10 moves and looks at no more than 30 problems, so a proposal stays easy to
    check and a reply stays fast. It may leave some problems; the reply says so.
25. Only one proposal is open at a time; asking again replaces it. The conversation is kept for the
    session only, and replies stay in the language they were written in after a language switch.
26. The chat can cover part of the 3D view while it is open; closing it keeps the conversation and any
    waiting proposal (the ghosts stay visible).
27. A proposal is applied only to the exact layout it was planned on. Any edit (including undo) in
    between makes it out of date.
28. Hiding a side panel is a view preference per browser, not part of the layout or of undo history.

## Host app and backends

29. Sign-in is not in the editor. The brief says the host app owns sign-in (OpenID Connect) and passes
    the context (user, project, access token) into the micro-app. So the editor has no login screen and
    no user: it opens straight onto the layout. The hand-off from the host is not built here; Part A
    section 5 describes it.
30. There is no backend. The layout lives in the browser's memory and is lost on reload; the assistant
    is a mock that runs in the browser. In the real product the backend services (not the host) expose
    REST and a WebSocket channel: the editor loads and saves the layout over REST with the token the
    host passed in, and receives other people's changes over the WebSocket. Edits are already
    plain-data commands, so the same command can be sent to the server. Part A section 2 covers this.


## Measurement

15. FPS is measured on a production build (`npm run build && npm run preview`) with `?seed=500&stats`,
    in a 1280 × 700 Chrome window at pixel ratio 2 (the largest that fits the MacBook Air screen), after
    the scene settles. See the README for the method and numbers.
16. The 500-item test layout (`?seed=500`) is loaded as the starting layout, like opening a file: it is
    not an undo step. It has 20 transformers, 180 cabinets and 300 drives, touching but not overlapping.
17. Key names (Ctrl, ⌘, Shift), the axis letters x and z, and units (m, °) are the same in both
    languages. Everything else on screen, including the tab title, tooltips, screen-reader labels and
    messages, is translated.
