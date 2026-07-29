# Handoff — Level 3a worker adapter, mid-build (2026-07-29, refreshed after Task 116)

**Read first (in this order):** `AGENTS.md` (v0.4.0, two-lane rules),
`docs/superpowers/plans/2026-07-29-cairn-level3a-worker-adapter.md` (the plan
being executed), the spec
`docs/superpowers/specs/2026-07-28-cairn-kimi-cli-body-worker-design.md`
**including both amendments** (Decision 6 replacement; Task 106 spike
findings — the only source of Kimi CLI facts), and the latest LOG rows.

## Where things stand

- Level 3 design approved by owner; Decision 6 (owner direction): every
  multi-worker dispatch asks the owner which worker to use, with Cairn's
  suggestion + reason shown.
- Spike done (Task 106): Kimi Code CLI 0.29.2 installed at
  `C:\Users\KenJL\.kimi-code\bin\kimi.exe`, owner signed in via OAuth.
  All six questions answered by observation — see spec amendment.
- Plan written (Task 112): six tasks. **Plan Tasks 1–3 DONE:**
  - Task 113 (commit 2bb8ef0): `core/src/kimi.ts` detection half + 9 tests.
  - Task 115 (commit 84c84fd): the exec process — argv prompt with the
    24,000-char pre-spawn guard, the stream-json parser (spike-observed
    lines only), codex-shape watchdogs, tree kill, cancel, force-settle,
    redacted `kimi-*` debug copies. +15 tests.
  - Task 116 (commit da7a1b2): disclosure (billing-honest, sessions and
    static deny rules named), authorization (outcome+details+billing,
    shared `REAL_MODEL_CALL_NOT_AUTHORIZED`), the priority-90
    `createKimiExecAdapter`, the worker prompt. +7 tests.
  - Suites at Task 116 close: **core 137/137, cli 9/9.**
- This lane is A (main checkout). A parallel lane works the renderer
  visual layer (landed 111, 114, claimed 117 — `app/lab/concepts.*` are
  its untracked files). Check `git log`, `git status`, and
  `docs/ai-work/tasks/` for the highest claimed number before claiming
  the next one (claim by committing the brief). Highest at this refresh:
  **117** (parallel lane) — the next core task claims 118+.

## Next: plan Task 4 — app wiring (every connected adapter, one gate)

The plan's Task 4 checklist stands. Execution notes from a fresh read of
the integration points (2026-07-29):

- **`detectedAdapters` lives in `app/src/main/tasks.ts:61`** and returns
  `{ adapters, status: CodexExecStatus }`. Generalize: run both detections,
  construct each adapter only when its status says connected, each with its
  own authorization when `realCallConfirmed === true`
  (`authorizeKimiExec(dir, billing, outcome, details)` — billing from the
  kimi status). The `status` return becomes `{ codex?, kimi? }`; the
  connection-required reason picks prose per the plan (kimi never
  installed → today's codex strings byte-identical; both absent → both
  named). The run-time disclosure gate (`tasks.ts:137-154`) already
  re-derives from the routed adapter — shape unchanged.
- **Recommended extraction:** `detectedAdapters` + the reason picker into
  NEW `app/src/main/adapters.ts` (pure, imports only `@cairn/core`, accepts
  injectable probes), because `tasks.ts` imports electron and the unit lane
  (`tsconfig.unit.json`, explicit per-file `include`) must not pull it in.
  tasks.ts then imports from adapters.ts. Unit home: NEW
  `app/tests-unit/kimi-wiring.test.ts` (both connected → both descriptors;
  kimi-only; codex-only byte-identical; neither → both named). Add
  `src/main/adapters.ts` to the tsconfig include.
- **NEW finding — `core/src/serial.ts` `reportText` is codex-branded** for
  every non-demo run (`const codex = !demo`, line ~343): the boundary
  report says "Codex Exec real-call boundary report… No task data was sent
  to OpenAI", and safety closes (timeout/cancel/process-failure) say
  "Codex Exec adapter report". A kimi run hitting those closes would get a
  false report. The DONE path and the common STOPPED closes go through
  `cairnWorkerRecords` (`core/src/records.ts`) and are already
  adapter-general. Fix inside Task 4 (disclose the plan-file-list addition
  in the brief): derive the branding from `contract.route.adapterLabel` /
  `.provider` so codex output stays byte-identical (label "Codex Exec",
  provider "OpenAI"); the only test pin is `core/test/serial.test.ts:133`
  (`/real `codex exec` process was not started/i`) — keep that line's
  codex bytes or update the pin with disclosure.
- **NEW `app/tests/fixtures/fake-kimi-env.ts`** in the fake-codex idiom
  (`app/tests/fixtures/fake-codex-env.ts`), with two differences that
  matter: the prompt arrives as **one `-p` argv element, not stdin** (the
  fake records `process.argv`, and writes its started-marker at spawn, not
  on stdin end), and the fixture env must set **both `CAIRN_TEST_LANE=1`
  and `CAIRN_FAKE_KIMI=1`** or core's fail-closed guard resolves every kimi
  command to not-found. Shim answers: `--version` exit 0, `acp` (minimal
  JSON-RPC peer: initialize result; authenticate result, or -32000 by
  fixture flag), `provider list` (the observed `source=oauth` line), `-p`
  (spike-observed success transcript: assistant message with a
  cairn-claims fence that writes `visible.txt` into cwd, plus a
  `role:"meta"` line; `invalid-jsonl`, `missing-claims`, `slow`
  behaviors). Prepend the fake bin to PATH (keep the full PATH — Windows
  shim launches need System32); LOCALAPPDATA to an empty dir.
- **E2E (`app/tests/routing.spec.ts`, additive only) is IPC-driven, not
  click-driven:** `TaskRun.tsx` still hardcodes "Start one real Codex Exec
  call" / "Verified real Codex Exec result" (renderer generalization is
  plan Task 5, with the Decision 6 chooser). So the kimi lane drives
  `window.cairn.taskRoute(proj, outcome, details, "kimi-exec")` → assert
  the kimi disclosure six facts → `taskRun` with `adapterId: "kimi-exec"`,
  `realCallConfirmed: true`, that disclosure → DONE: marker exists,
  `visible.txt` written, `001-report.md` has `Disposition: **DONE**`, git
  clean. Plus the cross pin: a kimi confirmation cannot dispatch codex and
  vice versa. `DisclosureConfirm` already takes a `label` prop — no
  renderer change needed in Task 4. To get a single-candidate kimi lane,
  combine the kimi fake with `fakeCodexEnvironment(proj, false)` (a real
  codex may exist on this machine's PATH).
- **The app token is required for the E2E runs** (two-lane rule):
  `mkdir %TEMP%\cairn-app-token` (fails if held), held for the whole run,
  removed after and named in the report. If the parallel lane holds it,
  wait. Settle idiom: throwaway profile (the isolated-profile fixture does
  this), serial workers.
- Then plan Task 5 (Decision 6 chooser + suggestion — touches dispatch
  renderer code, coordinate with the parallel lane), Task 6 (close, 0.5.0).

## Rules that bite

- **No suite may invoke the real Kimi CLI** — a signed-in one exists on
  this machine. The test-lane guard (`CAIRN_TEST_LANE=1` requires
  `CAIRN_FAKE_KIMI=1`) lives in `core/src/kimi.ts` resolution; keep it,
  keep its test. Every app-side kimi lane sets both variables.
- Wire pins only: assert argv/JSON-RPC actually sent, never helper returns.
- Owner approvals are per-action: any real CLI invocation, install, or
  quota spend pauses first. Owner is a beginner — plain language.
- Windows: spawn cwd must exist (ENOENT otherwise); `.cmd` shims via
  ComSpec; this shell lacks ComSpec — a bare `cmd.exe` resolves only if
  System32 is on PATH (Task 115 repair: never strip PATH in fakes).
- Node/npm are not on this shell's PATH by default:
  `export PATH="/c/Program Files/nodejs:$PATH"` first (or use `npm.cmd`
  from PowerShell).
