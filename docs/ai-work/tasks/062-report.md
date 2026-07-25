# Task 062 — Report

## What changed

### `app/src/main/conductor/taskblock.ts`

`"details"` joins the parser's allowed-key set. After the outcome is trimmed
and length-checked, a new check rejects any outcome containing `\r` or `\n`
(`if (/[\r\n]/.test(outcome)) return null;`) — the review-carried hardening
from Task 3: the confirmed disclosure card concatenates outcome and details
into one string, so a multi-line outcome could otherwise impersonate a details
section. After notes are parsed, `details` follows the same shape as notes but
with its own cap: `const detailsRaw = record.details ?? ""; if (typeof
detailsRaw !== "string" || detailsRaw.length > 2000) return null;`, and the
returned block carries `details: detailsRaw.trim()`. Wrong shape (non-string,
over 2000 chars) still drops the whole block, same as every other field.

### `app/src/shared/ipc.ts`

`TaskBlock` gained `details: string`.

### `app/src/renderer/components/TaskCard.tsx`

`onSend` widened to `(outcome: string, details: string) => void`. A new
`block.details ? <div className="task-card-details">...</div> : null` section
renders "Details (sent verbatim)" as a label plus the details text, placed
right after the outcome paragraph and before the concern chips. The dispatch
pill now calls `onSend(block.outcome, block.details)`.

### `app/src/renderer/screens/Chat.tsx`

A new `onCardSend(outcome, _details)` function is passed to `TaskCard` as
`onSend`; it calls the existing `onOpenTask(outcome)` unchanged. Per the brief,
until Task 5 threads details into the TaskRun prefill/dispatch path, Chat
accepts the widened signature but still only routes the outcome sentence into
navigation — compilation green is the bar, not full wiring.

### `app/src/renderer/app.css`

Three small rules for `.task-card-details`, `.task-card-details-label`, and
`.task-card-details-text`, matching the existing card/chip visual language
(not required by any test, added so the new section isn't unstyled).

### `app/tests-unit/taskblock.test.ts`

Added the brief's verbatim details test ("details parses verbatim within its
cap and fails closed beyond it") and one new row in the existing
table-driven rejection loop: `["outcome contains a newline", '{"outcome": "line
one\\nline two", ...}']`, which exercises the newline-rejection hardening
through the same `text.length > 0` (text survives) assertion every other
rejection case uses.

### `app/tests/fixtures/fake-conductor.mjs`

Added `DETAILS_TASK_BLOCK` (`outcome`, empty `concerns`, `details: "74, 477,
256"`) and a `content.includes("detailtask")` branch in `scriptFor` that
returns it fenced as `cairn-task`.

### `app/tests/conductor.spec.ts`

Added "a task block with details shows a details section on the card": sends
`"Please detailtask this page title change."`, waits for the stream to finish,
and asserts the `.task-card` contains both "Details (sent verbatim)" and the
literal text "74, 477, 256".

Files touched: `app/src/main/conductor/taskblock.ts`, `app/src/shared/ipc.ts`,
`app/src/renderer/components/TaskCard.tsx`, `app/src/renderer/screens/Chat.tsx`,
`app/src/renderer/app.css`, `app/tests-unit/taskblock.test.ts`,
`app/tests/conductor.spec.ts`, `app/tests/fixtures/fake-conductor.mjs`,
`docs/ai-work/tasks/062-brief.md`, `docs/ai-work/tasks/062-report.md`,
`docs/ai-work/LOG.md`.

## The authorized bridge: checked, not applied

Task 3 left `app/src/main/tasks.ts:77` and `:111` calling `disclosure?.(outcome)`
against the core seam's new `disclosure?(outcome: string, details: string)`,
so `cd app && npm run typecheck` (full `tsc --noEmit`) is red before and after
this task — confirmed unchanged:

```
src/main/tasks.ts(77,31): error TS2554: Expected 2 arguments, but got 1.
src/main/tasks.ts(111,26): error TS2554: Expected 2 arguments, but got 1.
```

The brief authorized a minimal bridge (`disclosure?.(outcome, "")` at both
sites) ONLY if my own build steps swept those call sites in and failed on
them. I checked both directly:

- `tsc -p tsconfig.unit.json` does not include `src/main/tasks.ts` in its
  `include` list at all — confirmed by reading the file; it builds and runs
  clean without ever touching it.
- `npm run build:vite` (what `test:smoke` builds before Playwright runs) does
  bundle `tasks.ts` into `main.js` — but Vite's TS handling is esbuild-based
  and does not type-check; the build exits 0 with `tasks.ts` inside the
  bundle. Confirmed by running it directly (exit code 0, 35 modules
  transformed).
- At runtime it also never bites: every Playwright spec file sets
  `CAIRN_MOCK=1`, which routes through `createOfflineDemoAdapter()` — an
  adapter with no `disclosure` property at all, so `routed?.disclosure?.(outcome)`
  short-circuits on the optional chain before the arity mismatch could ever
  matter. `core/src/codex.ts`'s `codexExecDisclosure(root, outcome, details =
  "")` also defaults `details` to `""` on `undefined`, so even a real-adapter
  call site would behave correctly today, JS-arity-wise.

Neither condition in the brief's "IF" was met, so I left `tasks.ts` untouched,
per "Do NOT thread details further into tasks.ts; that is Task 5." Task 5 still
needs to fix the two typecheck errors when it threads details through the
dispatch path.

## TDD evidence (this session)

**Baseline.** Before any change, `npm run test:unit`: `tests 44 / pass 44 / fail 0`.

**RED.** Added the brief's details test plus the newline-rejection row to
`tests-unit/taskblock.test.ts` with no source change. `npm run test:unit`
failed at the `tsc -p tsconfig.unit.json` step (a compile error, since
`TaskBlock` had no `details` field yet):

```
tests-unit/taskblock.test.ts(53,26): error TS2339: Property 'details' does not exist on type 'TaskBlock'.
tests-unit/taskblock.test.ts(55,28): error TS2339: Property 'details' does not exist on type 'TaskBlock'.
```

**GREEN.** After adding `details` to `TaskBlock` (ipc.ts) and the parser
(`taskblock.ts`): `npm run test:unit` → `tests 46 / pass 46 / fail 0` — the 44
pre-existing tests plus the two added here (the details test and the newline
rejection row).

**Smoke.** `npm run build:vite` then `npx playwright test tests/conductor.spec.ts`:
8/8 passed, including the new "a task block with details shows a details
section on the card" test. Then the full suite, `npx playwright test`: 25/25
passed (24 pre-existing plus the one new test) — one clean run, no rerun
needed; the environmental flake mentioned in the brief did not appear this
time.

## Checks run (all real, this session)

- `cd app && npm run test:unit` — RED (`tsc` compile error, two `TS2339`s),
  then GREEN (`tests 46 / pass 46 / fail 0`).
- `cd app && npm run typecheck` — unchanged: the same two pre-existing
  `tasks.ts` errors from Task 3, nothing new from any file this task touched.
- `cd app && npm run build:vite` — exits 0.
- `cd app && npx playwright test tests/conductor.spec.ts` — 8/8 passed.
- `cd app && npx playwright test` (full suite) — 25/25 passed.
- `git status --porcelain` before staging listed exactly the eight source/test
  files above plus the new `062-brief.md` — nothing else.

## How to try it

```
cd app
npm run test:unit
npm run test:smoke
```

Or by hand: connect the chat to the fixture (`npm start` with `CAIRN_MOCK=1`
is not needed for this — the fixture only runs under Playwright), send
"Please detailtask this page title change." in a conductor conversation
wired to `fake-conductor.mjs`, and the proposed-task card shows "Details (sent
verbatim)" followed by "74, 477, 256".

## Limitations and remaining human judgment

- Chat still routes only the outcome sentence into TaskRun's prefill — Task 5
  is what threads `details` on into the dispatch call and the two `tasks.ts`
  typecheck errors it leaves behind.
- The card's details section has no length-based truncation or "show more" —
  at the 2000-character cap it renders in full. That's a UI polish call, not a
  correctness one; nothing in the brief asked for it.
- Milestone movement: NO. This is the app-side rendering half of a channel the
  owner still cannot fully dispatch until Task 5 lands.

Disposition: DONE
