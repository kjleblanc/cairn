# Task 119 brief — Level 3a plan, Task 4: app wiring — every connected adapter, one gate

Claims task number 119 (checked `main` history, `docs/ai-work/tasks/`, the
lane B branch, and every ref for the lowest free number: **118 was claimed by
the parallel lane's brief commit `03a4e13` on main while this task was being
set up** — the protocol's race, resolved by taking the next number).

## Requested visible outcome

The app's dispatch wiring generalizes from "codex" to "every connected real
adapter", so the owner's signed-in Kimi Code CLI can route, disclose, and run
a real task through the same one-gate flow — with every codex byte identical.

1. **NEW `app/src/main/adapters.ts`** (handoff-recommended extraction): a
   pure module importing only `@cairn/core` — never electron, so the unit
   lane (`tsconfig.unit.json`) can include it. It holds the generalized
   `detectedAdapters(mock, dir, authorized?, probes?)`: run both detections,
   construct each adapter only when its status says connected, each with its
   own authorization when `realCallConfirmed === true` (codex:
   `authorizeCodexExec(dir, outcome, details)`; kimi:
   `authorizeKimiExec(dir, status.billing, outcome, details)`). The `status`
   return becomes `{ codex?, kimi? }`. Detection probes are injectable so no
   unit test ever spawns a process. It also holds the connection-required
   reason picker: kimi never installed and codex present → today's codex
   prose byte-identical; codex never installed and kimi present → the kimi
   prose; both installed but neither connected → both named; neither
   installed → both named.
2. **`app/src/main/tasks.ts`** imports both from `adapters.ts`. The run-time
   disclosure gate is unchanged in shape — it already re-derives from the
   routed adapter.
3. **NEW `app/tests/fixtures/fake-kimi-env.ts`** in the fake-codex idiom,
   with the two differences that matter: the prompt arrives as **one `-p`
   argv element, not stdin** (the fake records `process.argv` and writes its
   started-marker at spawn, not on stdin end), and the returned env sets
   **both `CAIRN_TEST_LANE=1` and `CAIRN_FAKE_KIMI=1`** (without both, core's
   fail-closed guard resolves every kimi command to not-found). Shim answers:
   `--version` exit 0; `acp` (a minimal JSON-RPC peer: initialize result,
   then authenticate result — or -32000 by fixture flag); `provider list`
   (the spike-observed `source=oauth` line); `-p` (the spike-observed success
   transcript: an assistant message carrying a cairn-claims fence, writing
   `visible.txt` into cwd, plus a `role:"meta"` line; `invalid-jsonl`,
   `missing-claims`, and `slow` behaviors). The fake bin is prepended to PATH
   (the full PATH stays — Windows `.cmd` shim launches need System32);
   LOCALAPPDATA points at an empty dir.
4. **`app/tests/fixtures/fake-codex-env.ts`** gains `CAIRN_TEST_LANE=1` in
   its returned env (disclosed plan-file-list addition, one line): once kimi
   detection joins `detectedAdapters`, every codex lane on this machine would
   otherwise find the REAL signed-in Kimi CLI and turn two-candidate. With
   the marker set and `CAIRN_FAKE_KIMI` absent, core's guard resolves every
   kimi command to not-found and the codex lanes stay single-candidate.
5. **NEW `app/tests-unit/kimi-wiring.test.ts`**: both connected → both
   descriptors (codex first at priority 100, kimi at 90, each authorized);
   kimi-only; codex-only (byte-identical reason strings); neither → both
   named. **`app/tsconfig.unit.json`** gains `src/main/adapters.ts`.
6. **`app/tests/routing.spec.ts`, additive only, IPC-driven** (the renderer
   strings stay codex-branded until plan Task 5 — no click-driving the kimi
   lane, `DisclosureConfirm` needs no change): a single-candidate kimi lane
   (`fakeKimiEnvironment` + `fakeCodexEnvironment(proj, false)` — a real
   codex may exist on this machine's PATH):
   `taskRoute(proj, outcome, details, "kimi-exec")` → assert the kimi
   disclosure's six facts (oauth quota wording) →
   `taskRun({ adapterId: "kimi-exec", realCallConfirmed: true, disclosure })`
   → DONE: marker exists, the captured argv carries `-p` and the composed
   prompt (wire pin), `visible.txt` is written, `001-report.md` carries
   `Disposition: **DONE**`, git clean. Cross pins: the kimi confirmation
   cannot dispatch codex (`adapterId: "codex-exec"` refused), and a
   codex-shaped confirmation cannot dispatch kimi
   (`REAL_MODEL_CALL_NOT_AUTHORIZED`).
7. **Disclosed plan addition — `core/src/serial.ts`** (found in the
   handoff's fresh read): `reportText` is codex-branded for every non-demo
   run — the real-call boundary report says "Codex Exec… No task data was
   sent to OpenAI… The real `codex exec` process was not started", and the
   safety closes say "Codex Exec adapter report" / "Codex Exec route". A kimi
   timeout or boundary run would get a false report. Generalize from
   `contract.route.adapterLabel` / `.provider` (the idiom `rowFor` already
   uses): codex output stays byte-identical (label "Codex Exec", provider
   "OpenAI", invocation "`codex exec`"); a kimi run reads "Kimi Code CLI",
   "Moonshot AI", "`kimi -p`". The existing pin
   `core/test/serial.test.ts:133` keeps its codex bytes; additive kimi pins
   join `core/test/serial.test.ts`.

## Boundary of intent — what must not change

- Files that may change: `app/src/main/adapters.ts` (new),
  `app/src/main/tasks.ts`, `app/tests/fixtures/fake-kimi-env.ts` (new),
  `app/tests/fixtures/fake-codex-env.ts` (one env var),
  `app/tests/routing.spec.ts` (additive cases only),
  `app/tests-unit/kimi-wiring.test.ts` (new), `app/tsconfig.unit.json` (one
  include entry), `core/src/serial.ts` (reportText branding only),
  `core/test/serial.test.ts` (additive pins only), this task's records, one
  LOG.md row.
- **No renderer files** — the parallel lane owns them and the Decision 6
  chooser is plan Task 5. No changes to `core/src/kimi.ts`,
  `core/src/codex.ts`, `core/src/routing.ts`, cli, the contract, or
  `design/`. The parallel lane's files (`app/lab/concepts.*`, its 118 brief,
  its uncommitted work) untouched.
- Codex behavior byte-identical: the single-candidate flow, every existing
  string, every existing test pin — `core/test/serial.test.ts:133` keeps its
  codex line, and the codex E2E specs pass unmodified beside the new lane.
- **No suite reaches the real signed-in Kimi CLI**: the fail-closed guard in
  `core/src/kimi.ts` stays (with its test), every app-side kimi lane sets
  both `CAIRN_TEST_LANE=1` and `CAIRN_FAKE_KIMI=1`, and unit tests inject
  probes. No real CLI invocation, install, or quota spend.
- Red-first. E2E runs hold the app token (`mkdir %TEMP%\cairn-app-token`),
  wait if the parallel lane holds it, remove it after and name that in the
  report.

## Checks that will show the outcome holds

1. Root `npm test` (core + cli) green, with the new serial.ts kimi-branding
   pins and every existing codex pin unchanged.
2. `npm run test:unit` in app green, including the four kimi-wiring cases.
3. `npm run typecheck` and `npm run build:vite` in app green.
4. `npx playwright test tests/routing.spec.ts` (serial, isolated profile,
   app token held): the new additive kimi cases pass and every pre-existing
   codex case passes unmodified.
5. `git diff --stat` and status contain only the named files (the parallel
   lane's work excluded by exact-path staging).

## What DONE and STOPPED mean here

- DONE: every check above green in this lane's tree, codex bytes proven
  identical, the app token released and named, the diff scoped, and the kimi
  lane's DONE run verified through the real-call path against the fake.
- STOPPED: a check fails without an in-scope correction, the app token cannot
  be obtained within a reasonable wait, or isolation from the parallel lane
  cannot be maintained.
