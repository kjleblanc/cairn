# Task 061 — Report

## What changed

### `core/src/routing.ts`

`AdapterTaskContract.version` is now `"cairn-serial-task/v2"`, and the contract
carries a new `details: string` field ("" when the owner supplied none),
documented as bound into `requestedOutcomeSha256` together with the outcome.
`requestedOutcomeSha256` gained a one-line doc comment naming the two-part
formula. The execution seam is now
`disclosure?(outcome: string, details: string): WorkerDisclosure` — both parts,
because a card confirmed for the outcome alone must never dispatch a request
that carries details. The offline demo adapter is unchanged: it still echoes
the digest it was handed.

### `core/src/serial.ts`

`SerialRunOptions` gained `details?: string` (default ""). `runSerialTask`
trims it once (`const details = (options.details ?? "").trim();`) and puts it in
the contract, and the digest is now
`sha256(JSON.stringify([outcome.trim(), details]))` — always the two-part JSON
array, an empty details string included. A new private `blockquote()` helper
quotes owner text line by line (blank lines become a bare `>`), and `briefText`
renders

```
## Details (verbatim)

> <the owner's text>
```

between the Lane line and `## Route` when details is non-empty. When it is
empty the section is the empty string and the brief's bytes are exactly what
they were before.

### `core/src/codex.ts`

- `codexExecDisclosure(workspaceRoot, requestedOutcome, details = "")` sets
  `task` to `` `${outcome}\n\nDetails (verbatim):\n${supplied}` `` when details
  are present, and to the bare trimmed outcome when they are not.
- `authorizeCodexExec(workspaceRoot, requestedOutcome, details = "")` passes
  details through, so the authorization is bound to both parts.
- `authorizationMatches` recomputes its expected card with
  `codexExecDisclosure(workspaceRoot, contract.requestedOutcome, contract.details)`.
  This is the seam the plan's adversarial review flagged: without it, every
  details-bearing dispatch would be refused (proved below).
- The adapter's own `disclosure(outcome, details)` closure forwards both parts.
- `taskPrompt` inserts, immediately after the requested-outcome line and only
  when details are non-empty, the line
  `Details from the owner (use verbatim, do not restate):` followed by the
  details text unedited.

Both codex entry points default `details` to `""`, so every existing
outcome-only caller (the cli's `codexExecDisclosure`/`authorizeCodexExec` calls)
keeps working with no change.

### `core/test/codex.test.ts`

The `contract()` fixture is now `contract(details = "")` and returns a v2
contract carrying that value. One new test — "owner details reach the worker
prompt, the disclosure, and the authorization gate (Phase 3 Task 3)" — asserts
`codexExecDisclosure(workspace, "o", "d").task === "o\n\nDetails (verbatim):\nd"`
and that the outcome-only form is still `"o"`; that the adapter's own seam
forwards both parts; that a bound authorization lets the run reach the fake
process, whose captured stdin contains the details heading and the text; and
that an authorization bound to the outcome ALONE is refused
`REAL_MODEL_CALL_NOT_AUTHORIZED` against the same details-bearing contract,
with no second process started.

### `core/test/serial.test.ts`

Two new tests. The first is the plan's test — owner details ride verbatim into
the brief, digest-bound — with every value used exactly as the plan states.
One mechanical deviation: the capture is an array
(`const seen: AdapterTaskContract[] = []`, this suite's own idiom from
`codex.test.ts`'s `requests`) rather than the plan's `let seen`, because under
strict TypeScript a `let` assigned only inside a callback narrows to `never` at
every later read — the plan's literal form fails to compile with
`TS2339: Property 'version' does not exist on type 'never'` regardless of the
implementation. Verified with an isolated probe before changing anything. The
second test is the hostile-result assertion: an adapter that returns a result
echoing `sha256("Books sort by word count")` — the outcome-only digest —
against a details-bearing contract is refused `INVALID_ADAPTER_RESULT`, and the
stop report says so.

Files touched: `core/src/routing.ts`, `core/src/serial.ts`, `core/src/codex.ts`,
`core/test/serial.test.ts`, `core/test/codex.test.ts`,
`docs/ai-work/tasks/061-brief.md`, `docs/ai-work/tasks/061-report.md`,
`docs/ai-work/LOG.md`.

## TDD evidence (this session)

**RED, stage 1 — the surface does not exist.** With only the two new tests
written and no source change, `cd core && npm test` (which builds first) failed
in `tsc`, each error naming a missing seam:

```
test/codex.test.ts(88,5): error TS2353: Object literal may only specify known properties, and 'details' does not exist in type 'AdapterTaskContract'.
test/codex.test.ts(656,52): error TS2554: Expected 2 arguments, but got 3.
test/codex.test.ts(662,61): error TS2554: Expected 2 arguments, but got 3.
test/codex.test.ts(666,40): error TS2554: Expected 1 arguments, but got 2.
test/serial.test.ts(1409,28): error TS2353: Object literal may only specify known properties, and 'details' does not exist in type 'SerialRunOptions'.
test/serial.test.ts(1415,25): error TS2339: Property 'details' does not exist on type 'AdapterTaskContract'.
```

**RED, stage 2 — content, not compilation.** Core's `npm test` runs `tsc`
first, so a compile error is not a meaningful RED. The signatures were added
with their VALUES deliberately unwired (contract `details: ""`, digest still
one-part, `version` still v1, `codexExecDisclosure` still ignoring its new
parameter). The suite then built cleanly and failed on content:

```
ℹ tests 98
ℹ pass 96
ℹ fail 2

✖ owner details reach the worker prompt, the disclosure, and the authorization gate (Phase 3 Task 3)
  + actual - expected
  + 'o'
  - 'o\n\nDetails (verbatim):\nd'

✖ owner details ride verbatim into the brief, digest-bound (Phase 3 Task 3)
  + actual - expected
  + 'cairn-serial-task/v1'
  - 'cairn-serial-task/v2'
```

**GREEN.** After threading the value through every seam:

```
cd core && npm test
ℹ tests 99
ℹ pass 99
ℹ fail 0
```

(96 pre-existing tests plus the three added here — two written first, plus the
hostile-result test added at the GREEN step as the brief's Step 4 requires.)

**Both new assertions were checked for discrimination, not just for passing.**

- Digest: with the digest temporarily reverted to `sha256(outcome.trim())` and
  everything else in place, both new serial tests fail (`pass 42 / fail 2`) —
  the forged outcome-only result is accepted when the digest is one-part, so
  the hostile assertion is doing real work.
- Authorization gate: with `authorizationMatches` temporarily reverted to
  `codexExecDisclosure(workspaceRoot, contract.requestedOutcome)`, the new codex
  test fails with `REAL_MODEL_CALL_NOT_AUTHORIZED` on the BOUND authorization —
  exactly the "every detailed dispatch is refused" failure the plan's review
  predicted. Both reverts were restored from a saved copy and the suite
  re-verified green afterwards.

## Checks run (all real, this session)

- `cd core && npm test` — RED stage 1 (tsc, six errors), RED stage 2
  (`tests 98 / pass 96 / fail 2`), GREEN (`tests 99 / pass 99 / fail 0`).
- `npm test` at the repo root (`npm test --workspaces`) — core
  `tests 99 / pass 99 / fail 0`, cli `tests 9 / pass 9 / fail 0`. The cli calls
  `codexExecDisclosure(root, outcome)` and `authorizeCodexExec(root, outcome)`
  with no details and is unaffected, which is what the defaults are for.
- `grep -rn "cairn-serial-task/v1" core/src core/test cli/src cli/test app/src app/tests-unit`
  — no matches. `cairn-serial-task/v2` appears at exactly the three source
  sites (`core/src/routing.ts:12`, `core/src/serial.ts:873`,
  `core/test/codex.test.ts:85`) plus the new test's assertion.
- A brief rendered from a real `runSerialTask` run in a temporary fixture
  project, with multi-line details, read back byte by byte:

  ```
  Lane: **Standard** — local, deterministic, record-only demonstration.

  ## Details (verbatim)

  > Word counts: 74, 477, 256
  >
  > The Sun Also Rises is 74.

  ## Route
  ```

  and the same run without details keeps `Lane: ...` followed by one blank line
  and `## Route`, byte-identical to before this task.
- `cd app && npm run typecheck` — two errors, both expected and both out of
  scope (see below).
- `git status --porcelain` before staging listed exactly the eight files named
  above and nothing else.

## How to try it

```
git clone https://github.com/kjleblanc/cairn.git
cd cairn
npm ci
npm test
```

To see the channel itself, call the envelope with details:

```js
await runSerialTask(root, "Books sort by word count", {
  adapters: [createOfflineDemoAdapter()],
  details: "Word counts: 74, 477, 256",
});
```

The generated `docs/ai-work/tasks/001-brief.md` carries a
`## Details (verbatim)` section with the numbers quoted exactly as given.

## Limitations and remaining human judgment

- **`app` does not typecheck until Phase 3 Task 5.** Widening the seam to
  `disclosure?(outcome, details)` makes the app's two existing outcome-only
  calls (`app/src/main/tasks.ts:77` and `:111`) fail with
  `TS2554: Expected 2 arguments, but got 1`. This is planned: Task 5 threads
  details through both gates, `authorizeCodexExec`, and `runSerialTask`. It was
  deliberately NOT fixed here — core and cli are green, and touching app code
  would take this task outside its boundary. The app's Playwright and unit
  suites were not run for the same reason; they belong to Tasks 4-6.
- Until Task 5 lands, an app dispatch still passes outcome-only to
  `disclosure()`. At runtime that yields an outcome-only card, which now fails
  to match a details-bearing contract and refuses the run. That is the
  fail-closed direction: a run the owner did not fully see does not start.
- Core puts no length cap on `details`. The cap (2000 characters) lives in the
  app-side parser, which is Phase 3 Task 4's scope. Core trims and carries
  whatever it is given.
- Line endings inside details are normalized to LF by the brief's blockquote
  (`split(/\r?\n/)`); the words are unchanged, and the worker prompt carries the
  details string exactly as given. Nothing else in the pipeline depends on the
  original line-ending bytes.
- Milestone movement: NO. This is the core half of a channel the owner cannot
  use until the app half (Tasks 4-5) lands.

Disposition: DONE
