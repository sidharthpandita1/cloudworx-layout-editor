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
> The prompts I send should be meaningful. What should I do about that?

*Result:* A structure for prompts (context, task, constraints, done-when) and the habit of asking for
a design before code.

**Prompt 3**
> Make a deep plan and a complete project setup with proper Markdown files, and explain the project
> again in more depth.

*Result:* Vite + React + TS project with R3F, drei, Zustand, Vitest; a layered folder structure; the
floor grid; typed EN/VI dictionaries; docs (`PLAN`, `ARCHITECTURE`, `DECISIONS`, `ASSUMPTIONS`,
`OPTIMISATION`), this log and `CLAUDE.md`.
*My review:* _TODO: note what you checked or changed._

---

## 1. Edit model (store, commands, undo/redo)

**Prompt 4**
> Let's start Day 1 with the store and undo/redo.

*Result:* A design proposal before any code: commands as plain data (`add`, `delete`, `move`,
`rotate`, `batch`) with `applyCommand` and `invertCommand`; a Zustand store with `past`/`future` stacks;
selection not undoable; labels built when the command is created so redo is exact.
*Why I accepted data commands over `do()/undo()` methods:* they can be serialised, so the same commands
can go to a server or come from the AI assistant as JSON (matches the Part A design).

**Prompt 5**
> Will the history have any size limit?

*Result:* Analysis: memory isn't the real issue (a move is ~100 bytes), but unbounded growth in an
all-day session is still a smell, and batch commands can be large. Recommended a cap of 200 edits, a
batch counting as one.
*My decision:* Cap at 200 (`HISTORY_LIMIT`), recorded as an assumption.

**Prompt 6**
> Let's go with this approach for now; I will review later.

*Result:* `src/commands/commands.ts`, `src/store/editorStore.ts` and 28 passing unit tests (round trip
for every command, batch undo order, redo cleared by new edits, history cap, selection cleared on undo,
delete-undo restores list position). The AI changed one detail from the design: items store a
per-type `number` instead of an English label, so names translate ("Tủ điện 3").
*My review:* Reviewed the code and tests; approved without changes.

---

_Template for each entry:_

**Prompt N**
> (the prompt)

*Result:* (what came back)
*My review:* (what I accepted, what I changed and why)
