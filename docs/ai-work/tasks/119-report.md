# Task 119 report — Level 3a plan, Task 4: app wiring — every connected adapter, one gate

## Number claim

Checked `main` history, `docs/ai-work/tasks/`, lane B, and every ref: **118
was claimed by the parallel lane's brief commit `03a4e13` on main while this
task was being set up** — the two-lane race the protocol exists for, resolved
by claiming 119 (brief commit `b0038fd`). While this task's checks ran, the
parallel lane landed `f7eb932` (Task 118) and claimed 120 (`5b212bc`); this
task's landing base is `5b212bc`, with no file overlap.

## What actually changed

- `app/src/main/adapters.ts` (NEW) — the handoff-recommended pure extraction:
  imports only `@cairn/core`, never electron, so the unit lane can cover it.
  `detectedAdapters(mock, dir, authorized?, probes?)` runs both detections
  (probes injectable), constructs each adapter only when its own status says
  connected, each with its own authorization when the owner confirmed a real
  call (codex: outcome+details; kimi: outcome+details+billing). The `status`
  return is `{ codex?, kimi? }`. `connectionRequiredReason` picks the prose:
  codex present and kimi never installed → today's codex wording
  byte-identical; codex absent and kimi present → the kimi wording; both
  installed but neither connected → both named; neither installed → both
  named.
- `app/src/main/tasks.ts` — the local `detectedAdapters`/`adapters` helpers
  deleted; detection and the reason picker imported from `adapters.ts` at all
  three call sites. The run-time disclosure gate is untouched (it already
  re-derives from the routed adapter).
- `core/src/serial.ts` (disclosed plan addition) — `reportText` branded from
  `contract.route.adapterLabel` / `.provider` (the idiom `rowFor` already
  used) with the CLI invocation keyed on the routed adapter id
  (`invocationName`): the real-call boundary report and the safety-close
  title/subject a kimi run produces now say "Kimi Code CLI" / "Moonshot AI" /
  "`kimi -p`" instead of falsely claiming Codex and OpenAI. Codex output is
  byte-identical — same strings, derived instead of hardcoded.
- `core/test/serial.test.ts` — two additive pins (a kimi boundary STOPPED
  with kimi-branded records and no "Codex"/"OpenAI"; a kimi timeout with
  kimi-branded safety records). No existing pin touched; line 133's codex
  bytes stand.
- `app/tests/fixtures/fake-kimi-env.ts` (NEW) — the fake-codex idiom with the
  two differences that matter: the prompt is one `-p` argv element (the fake
  records `process.argv` and marks started at spawn, not stdin end), and the
  env sets BOTH `CAIRN_TEST_LANE=1` and `CAIRN_FAKE_KIMI=1`. Answers
  `--version`, `acp` (minimal JSON-RPC peer; authenticate result or -32000 by
  flag), `provider list` (the spike's `source=oauth` line), and `-p` (the
  spike-observed success transcript writing `visible.txt`, plus
  `invalid-jsonl`, `missing-claims`, `slow`). Fake bin prepended to a whole
  PATH; LOCALAPPDATA empty.
- `app/tests/fixtures/fake-codex-env.ts` — one disclosed line:
  `CAIRN_TEST_LANE=1` without the fake-kimi opt-in, so core's fail-closed
  guard resolves every kimi command to not-found and the REAL signed-in Kimi
  CLI on this machine can never turn a codex lane two-candidate now that kimi
  detection runs in every real lane.
- `app/tests-unit/kimi-wiring.test.ts` (NEW) — five tests: both connected →
  both descriptors (codex first at 100, kimi at 90, kimi's six-fact
  disclosure with the oauth quota); kimi-only; codex-only (byte-identical
  prose pin); the reason picker's kimi-only/both/neither cases; mock
  unchanged.
- `app/tsconfig.unit.json` — one include entry (`src/main/adapters.ts`).
- `app/tests/routing.spec.ts` — additive only: one import and one IPC-driven
  kimi lane (never click-driven; the renderer strings stay codex-branded
  until plan Task 5). Single-candidate kimi lane (kimi fake + not-connected
  codex fake): route preview names kimi with its six facts (oauth wording,
  sessions named); cross pins — the kimi confirmation cannot dispatch codex,
  a codex-shaped card cannot dispatch kimi (`REAL_MODEL_CALL_NOT_AUTHORIZED`);
  the confirmed run completes DONE with wire pins on the argv, `visible.txt`,
  a kimi-branded report carrying `Disposition: **DONE**`, and a clean tree.
- This report, `119-brief.md` (committed first), and one LOG.md row.

No renderer files, no `core/src/kimi.ts` / `codex.ts` / `routing.ts`, no cli,
no contract, no `design/`.

## The `.cmd` shim finding (measured, disclosed)

The kimi E2E was the first suite to push the real MULTI-LINE composed prompt
through a Windows `.cmd` shim (core's wire pin used a one-line prompt), and
the fake received only the first line. A direct probe settled which layer
loses the bytes: a NATIVE exe spawned the same way receives
`["-p","line one\nline two\nline three"]` intact; the `.cmd` shim receives
`["-p","line one"]`. The real CLI is a native `kimi.exe` (spike), so core's
argv design is sound — the ceiling is the fixture's, and it is documented in
the fixture's header. The full composed prompt (print-mode honesty line,
owner details verbatim) stays pinned at the request level in
`core/test/kimi.test.ts`; the E2E pins the spawn shape: the flags, `-p`, one
prompt element, and its first line.

## Checks run and their real results

1. Root `npm test`: **core 139/139** (137 + 2 new; the codex pin at
   serial.test.ts:133 unmodified), **cli 9/9**. Red-first held at both seams:
   the kimi branding tests failed before the generalization ("Codex Exec
   adapter report" for a kimi run — the defect itself), and the app unit
   suite failed to compile before `adapters.ts` existed.
2. `npm run test:unit` in app: **105/105** (100 + 5 new).
3. `npm run typecheck` clean; `npm run build:vite` green.
4. E2E, with the app token held
   (`C:\Users\KenJL\AppData\Local\Temp\cairn-app-token`, acquired by `mkdir`,
   removed after the runs): **routing.spec 12/12** (all 11 pre-existing
   codex cases unmodified beside the new kimi lane), **conductor.spec
   22/22**, **serial + smoke + connect-kimi + projects + away 9/9** —
   **43/43 total**.
5. `git status --porcelain` / `git diff --stat`: only the named files. The
   parallel lane's in-flight work (`app/src/renderer/app.css`,
   `app/src/renderer/components/TownSquare.tsx`) and `design/` are not staged
   and not touched.
6. No suite reached the real Kimi CLI: unit tests inject probes; every
   app-side kimi lane sets both guard variables; every codex lane sets the
   test marker so kimi resolves not-found.

**Mixed-tree caveat:** the parallel lane's uncommitted renderer edits sat in
the tree while checks ran, and the bundle the E2E exercised includes them
(the staleness guard forced one rebuild mid-run for exactly this reason).
This task's checks do not exercise the town square; all 43 E2E tests passed
with that state in the tree.

## How to try it

- `npm test` at the root; `npm run test:unit` in `app/`.
- The kimi lane end to end: `npm run build:vite` in `app/`, then
  `npx playwright test tests/routing.spec.ts -g "fake-kimi"` (needs the app
  token free).
- To read the whole wiring story in one sitting: `app/src/main/adapters.ts`
  is under a hundred lines, and `core/src/serial.ts`'s `invocationName` is
  the one place a report names a CLI.

## Limitations and remaining human judgment

- The E2E's prompt-content pin stops at the first line (the `.cmd` ceiling
  above); the full prompt is core-pinned at the request level. A native fake
  would close even that gap, but needs a compiler this fixture deliberately
  avoids.
- The Decision 6 chooser is plan Task 5: with two connected adapters the
  route still recommends by priority and the renderer strings stay
  codex-branded — the kimi lane is reachable by IPC only, by design, until
  then.
- The fake's signed-out mode (`-32000`) is built but exercised only in unit
  tests; the E2E covers the connected lane and the cross-adapter refusals.
- What an API-key configuration's `provider list` prints remains unobserved
  (spike): anything not `source=oauth` takes the generic floor.

Disposition: DONE
