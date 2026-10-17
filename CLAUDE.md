# Project context for AI assistants

A 3D layout editor (React + TypeScript + React Three Fiber) for a frontend assessment. The author must
be able to explain and change every line, so favour simple, readable code over clever code.

## Commands

- `npm run dev`: dev server
- `npm test`: Vitest unit tests
- `npm run typecheck`, `npm run lint`, `npm run build`: run all three before saying work is done

## Architecture (see docs/ARCHITECTURE.md)

- `src/domain`, `src/rules`, `src/i18n`: pure TypeScript, no React or three.js imports.
- `src/commands`: every layout edit is a command with `apply` and `revert`. Never mutate items directly.
- `src/store`: Zustand store is the single source of truth for items, selection, history and locale.
- `src/scene` (R3F) and `src/ui` (panels) read from the store and dispatch commands.
- Violations and the bill of materials are derived from items, never stored.
- Items render with one `InstancedMesh` per item type.

## Conventions

- Units are metres. The floor is centred on the origin (x −10…10, z −6…6). Rotation is quarter turns.
- Every user-visible string goes through `translate()` with a key in both `en.ts` and `vi.ts`.
- Pure logic gets a Vitest test next to it (`*.test.ts`).
- Ask before adding a new dependency. Record real choices in docs/DECISIONS.md and open questions in
  docs/ASSUMPTIONS.md.

## Working style

- Propose the approach before writing code for any non-trivial feature.
- Explain non-obvious code briefly after writing it.
- Remind the author to log the key prompt in PROMPTS.md after each feature.
