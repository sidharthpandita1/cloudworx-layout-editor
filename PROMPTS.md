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

_Template for each entry:_

**Prompt N**
> (the prompt)

*Result:* (what came back)
*My review:* (what I accepted, what I changed and why)
