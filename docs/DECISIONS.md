# Technology Decisions

Each choice lists why it was made and what was rejected. Add a row whenever you make a real choice;
this file feeds the "choices and trade-offs" sections of the Part A document.

| Area | Choice | Why | Rejected and why |
|---|---|---|---|
| Build tool | **Vite** | Fast dev server, simple config, standard for React + TS. | Next.js: server rendering adds nothing to a client-only 3D micro-app. CRA: unmaintained. |
| 3D | **React Three Fiber + drei** | three.js underneath (largest ecosystem, glTF/Meshopt/KTX2 loaders), but the scene is React components that read the same store as the panels. drei gives `Grid`, `OrbitControls`, `Stats`, `useGLTF`. | Plain three.js: works, but syncing an imperative scene with React panels means hand-written glue. Babylon.js: strong engine, but a heavier bundle and a separate mental model from React. |
| State | **Zustand** | Small, no boilerplate, works outside React (R3F render loop, tests). Selectors avoid re-rendering the canvas on unrelated changes. | Redux Toolkit: more ceremony than a single-screen editor needs. React Context: re-renders every consumer on each change; too slow during drags. |
| Undo/redo | **Command pattern, commands as plain data** (`applyCommand` + `invertCommand`), history capped at 200 | Each edit is small and explicit; history memory grows with edits, not with scene size. Data (not closures) can be serialised: the same commands can go to the server, and an assistant can propose them as JSON that is validated, previewed and applied as one `batch`. | Snapshot stack (store whole state per edit): simplest, but memory grows with items × history length. Command objects with `do()`/`undo()` methods: can't be serialised. Immer patches: good, but less readable to explain. Unlimited history: grows without bound in an all-day session. |
| i18n | **Typed dictionary + `Intl`** | Two languages and a few dozen strings; `Record<MessageKey, string>` makes a missing translation a compile error; `Intl.NumberFormat` handles locale numbers. Zero dependencies. | i18next / FormatJS: the right call for the full enterprise app (plurals, ICU messages, lazy-loaded namespaces) and named as such in Part A, but extra moving parts here. |
| Testing | **Vitest** | Same config as Vite, fast, Jest-compatible API. Logic in `domain`/`rules`/`commands` is tested without a browser. | Jest: needs separate transform config. |
| Lint | **oxlint** (Vite default) | Fast, zero config. | ESLint: more rules but more setup; not needed for this size. |
