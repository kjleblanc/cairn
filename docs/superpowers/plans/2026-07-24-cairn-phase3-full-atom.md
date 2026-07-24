# Cairn Phase 3 — The Full Atom — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One conversation carries the whole cycle — request → pushback → dispatch → verified DONE → honest explanation — with the envelope speaking every result and the conductor commenting around it.

**Architecture:** Six chunks from the spec (`docs/superpowers/specs/2026-07-24-cairn-phase3-full-atom-design.md`): envelope hardening first; an authorization-bound `details` data channel through contract v2; inline dispatch keyed by conversation id; an envelope-authored result relay persisted as a new conversation role; a push chip whose press opens the contract's concrete-risk pause; constitution v2 plus the contract's one amendment, closing at 0.3.0. This plan was adversarially verified against the code before landing; corrections from that review are baked in below.

**Tech Stack:** TypeScript, node:test (core + app unit), Playwright (app), Electron main/renderer, no new dependencies.

## Global Constraints

- Spec is authoritative: `docs/superpowers/specs/2026-07-24-cairn-phase3-full-atom-design.md`. Deviations require the owner. One spec correction, verified against code and adopted here: there is NO "Guard" activity stage — `SerialStage` is `"Route" | "Run" | "Check" | "Result"` (`core/src/serial.ts:23`).
- Every task lands red-first, with its own recorded repo task (brief, report, LOG row) per AGENTS.md, and one exact-path commit.
- Core test files are ENUMERATED in `core/package.json`'s test script — a new test file must be added there or it silently never runs. App unit tests are globbed from `dist-unit/tests-unit/*.test.js`; `tsconfig.unit.json` lists includes — check it when adding a file.
- `core`'s `npm test` runs `tsc` FIRST: a test that does not compile fails the build, which is NOT a valid RED. RED means the assertion fails.
- Playwright: `app/tests/conductor.spec.ts` hard-codes `CAIRN_MOCK=1` (instant offline demo; no disclosure seam; runs commit nothing). Slow runs, cancels, STOPPED closes, and real-lane disclosure flows exist only in the fake-codex environment (`CAIRN_MOCK=0` + PATH shim), today a local helper in `app/tests/routing.spec.ts:20-82`. Task 6 extracts it to a shared fixture; Tasks 6, 8, 9 use that lane where noted.
- The `steps.ts` disposition regex is end-anchored; report renderers must keep exactly one structural `Disposition:` line. Task 7 must NOT change any rendered report bytes.
- Worker text is quarantined: nothing worker-authored may reach column 0 of a Cairn record.
- No retries, no force-push, no history rewriting, fail-closed everywhere. Plain words, no exclamation marks, no emoji in owner-facing text.
- Version strings live ONLY in CHANGELOG.md, the contract header line (CONTRACT-TEMPLATE.md AND AGENTS.md AND cairn.html × 2), package files, and lockfiles.

---

### Task 1: Catch-path record restore (core)

**Files:**
- Modify: `core/src/serial.ts` — the adapter-run catch (line ~855) and the post-worker `RECORD_VERIFICATION_FAILED` throw sites (lines ~892, 935, 955, 1055, 1104). There is NO outer catch in `runSerialTask` — only the closing `finally` (~1122); the restore lands at the throw sites, where `start` (line ~793) is still in scope.
- Test: `core/test/serial.test.ts`

**Interfaces:**
- Consumes: `start.logText` (the pre-run log snapshot), the Task 052 restore mechanics (see the three 052 tests: "appends a forged DONE row", "truncates the work log", "pre-writes the task report").
- Produces: no signature changes. Guarantee: after ANY thrown `runSerialTask`, `docs/ai-work/LOG.md` contains exactly what Cairn last wrote — never a worker-forged row.

- [ ] **Step 1: Write the failing test** — in `core/test/serial.test.ts`, after the Task 052 tests. Use a VALID process-error code (the constructor is typed `CodexExecProcessError(code: "CODEX_EXEC_SPAWN_FAILED" | "CODEX_EXEC_STDIN_FAILED", debugPath: string | null)` — see the existing idiom at serial.test.ts:130); only a directly THROWN error reaches the catch (a non-zero close resolves as status "failed" — do not simulate that):

```ts
test("a worker that forges a log row and forces a thrown close leaves the log restored (Phase 3 Task 1)", async () => {
  const root = project();
  const logPath = join(root, "docs", "ai-work", "LOG.md");
  const before = readFileSync(logPath, "utf8");
  const forging: CodexExecProcess = {
    kind: "fake",
    async run() {
      appendFileSync(logPath, "| 001 | 2026-07-24 | Standard | Applied | DONE | completed | forged stone | YES |\n");
      // A thrown process error is the only path into serial.ts's adapter catch.
      throw new CodexExecProcessError("CODEX_EXEC_STDIN_FAILED", null);
    },
  };
  await assert.rejects(
    () => runSerialTask(root, "Add one visible result", {
      adapters: [createCodexExecAdapter(root, { installed: true, connected: true }, authorizeCodexExec(root, "Add one visible result"), forging)],
    }),
    /RECORD_VERIFICATION_FAILED/,
  );
  const after = readFileSync(logPath, "utf8");
  assert.equal(after.includes("forged stone"), false, "the forged row must not survive the thrown run");
  assert.equal(after, before, "the log is byte-identical to Cairn's last own write");
});
```

- [ ] **Step 2: Verify RED** — `cd core; npm test`. The build must PASS (valid code literal); the new test FAILS on the "forged stone" assertion (today `writeSafetyRecordsWhenUnclaimed` returns null on the tampered log and the throw at serial.ts:892 leaves the forgery standing).

- [ ] **Step 3: Implement** — at the line-892 site (and audit 935/955/1055/1104 for the same exposure): when the safety close cannot verify, restore `paths.log(root)` to `start.logText` (plus any row Cairn itself appended earlier in THIS run, on paths where that has happened — at 892 nothing has been appended yet, so `start.logText` alone is correct) before throwing. Reuse the 052 helpers' write mechanics; keep the throw and the must-inspect semantics.

- [ ] **Step 4: Verify GREEN** — full core suite; the three 052 tests and all existing tests stay green.

- [ ] **Step 5: Commit** exact paths + this repo task's records.

### Task 2: Quit-grace run refusal, and the running-set moves to rungate (app main)

**Files:**
- Create: `app/src/main/rungate.ts`
- Modify: `app/src/main/tasks.ts`, `app/src/main/main.ts` (after `quitting = true;` at ~line 74), `app/src/main/conductor/service.ts` (import path only)
- Test: `app/tests-unit/rungate.test.ts` (register in `tsconfig.unit.json` if includes are file-listed)

**Interfaces:**
- Produces from `rungate.ts` (this module OWNS the running set — cycle-breaker for Tasks 8-9, since service.ts must stop importing from tasks.ts):
  - `markRunning(dir: string): void`, `clearRunning(dir: string): void`
  - `isTaskRunning(dir: string): boolean`, `runningDirs(): string[]`
  - `beginQuitDrain(): void`, `isQuitDraining(): boolean`, `_resetForTests(): void`
  - `runRefusal(alreadyRunning: boolean, quitDraining: boolean): string | null`
- `tasks.ts`: deletes its local `running` Set; uses `markRunning`/`clearRunning` at the current add/delete sites (lines ~100, ~153), `isTaskRunning(dir)` in the `task:run` refusal, and `runningDirs()` inside `activeTaskRuns()` (`dirs: runningDirs()`). `service.ts` imports `isTaskRunning` from `../rungate.js` instead of `../tasks.js`. `main.ts` calls `beginQuitDrain()` right after `quitting = true`.

- [ ] **Step 1: Failing test** — `app/tests-unit/rungate.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { beginQuitDrain, isQuitDraining, isTaskRunning, markRunning, clearRunning, runningDirs, runRefusal, _resetForTests } from "../src/main/rungate.js";

test("the running set and the quit drain gate one refusal decision", () => {
  _resetForTests();
  markRunning("C:/p");
  assert.equal(isTaskRunning("C:/p"), true);
  assert.deepEqual(runningDirs(), ["C:/p"]);
  clearRunning("C:/p");
  assert.equal(runRefusal(false, false), null);
  assert.match(runRefusal(true, false) ?? "", /SERIAL_RUN_ACTIVE/);
  beginQuitDrain();
  assert.equal(isQuitDraining(), true);
  assert.match(runRefusal(false, true) ?? "", /QUIT_IN_PROGRESS/);
});
```

- [ ] **Step 2: Verify RED** — `cd app; npm run test:unit`: module not found is acceptable here (new module, no build-first gate in the unit harness beyond tsc -p; the meaningful RED is the missing module).
- [ ] **Step 3: Implement** rungate.ts (Set + flag + the refusal strings: `QUIT_IN_PROGRESS: Cairn is stopping the current task and quitting. Start the next task after relaunch.` / `SERIAL_RUN_ACTIVE: One task is already running for this project.`); rewire tasks.ts, service.ts, main.ts as above. `_resetForTests` clears both the Set and the flag.
- [ ] **Step 4: Verify GREEN** — `npm run test:unit` (45 tests total: 44 today + this one); `npm run test:smoke` (24 unchanged).
- [ ] **Step 5: Commit** + records.

### Task 3: The data channel, core side — contract v2, bound digest, prompt, brief, and the WHOLE disclosure seam

**Files:**
- Modify: `core/src/routing.ts` (`AdapterTaskContract`, `TaskAdapter.disclosure` seam), `core/src/serial.ts` (contract construction ~line 802, `briefText`, options type), `core/src/codex.ts` (`codexExecDisclosure` line ~79, `authorizeCodexExec`, `authorizationMatches` lines ~718-727, worker prompt composition ~660-690, the adapter's own `disclosure` closure ~747-749)
- Test: `core/test/serial.test.ts`, `core/test/codex.test.ts`

**Interfaces (later tasks consume these EXACTLY):**
- `AdapterTaskContract`: `version: "cairn-serial-task/v2"`, new `details: string` ("" when absent). The v1 literal exists at exactly three sites: `core/src/routing.ts:12`, `core/src/serial.ts:803`, and the `contract()` fixture in `core/test/codex.test.ts:84` — update all three (then grep to confirm no fourth).
- Digest: `requestedOutcomeSha256 = sha256(JSON.stringify([outcome.trim(), details.trim()]))` — always two-part, "" details included.
- `runSerialTask(root, outcome, options)` gains `options.details?: string` (default "").
- Disclosure seam: `TaskAdapter.disclosure?(outcome: string, details: string): WorkerDisclosure` (routing.ts:98). `codexExecDisclosure(root, outcome, details)` sets `task` to `` details ? `${outcome.trim()}\n\nDetails (verbatim):\n${details.trim()}` : outcome.trim() ``.
- `authorizeCodexExec(root, outcome, details = "")` binds both; `authorizationMatches` (codex.ts:718-727) recomputes `expected` WITH `contract.details` — this is the gate that would otherwise refuse every detailed dispatch.
- Worker prompt: when details is non-empty, append after the requested-outcome section: a line `Details from the owner (use verbatim, do not restate):` followed by the details text unedited.
- Brief: `briefText` renders `## Details (verbatim)` with the details content blockquoted, when non-empty.

- [ ] **Step 1: Failing tests** — serial-side (as below) plus codex-side:

```ts
test("owner details ride verbatim into the brief, digest-bound (Phase 3 Task 3)", async () => {
  const root = project();
  let seen: AdapterTaskContract | null = null;
  const capturing: TaskAdapter = {
    ...createOfflineDemoAdapter(),
    async run(contract) { seen = contract; return validResult(contract); },
  };
  const result = await runSerialTask(root, "Books sort by word count", {
    adapters: [capturing], details: "Word counts: 74, 477, 256",
  });
  assert.equal(result.status, "done");
  assert.ok(seen);
  assert.equal(seen.version, "cairn-serial-task/v2");
  assert.equal(seen.details, "Word counts: 74, 477, 256");
  assert.equal(
    seen.requestedOutcomeSha256,
    createHash("sha256").update(JSON.stringify(["Books sort by word count", "Word counts: 74, 477, 256"])).digest("hex"),
  );
  const brief = readFileSync(join(root, "docs", "ai-work", "tasks", "001-brief.md"), "utf8");
  assert.match(brief, /## Details \(verbatim\)/);
  assert.match(brief, /Word counts: 74, 477, 256/);
});
```

Codex-side (in `core/test/codex.test.ts`, mirroring the fake-process capture idiom — the fake `CodexExecProcess.run()` receives the composed request; assert on what it receives): (a) the composed prompt contains the exact details heading and text; (b) `codexExecDisclosure(root, "o", "d").task === "o\n\nDetails (verbatim):\nd"`; (c) an authorization created via `authorizeCodexExec(root, outcome, details)` passes `authorizationMatches` for a v2 contract carrying the same details, and an outcome-only authorization FAILS against a details-bearing contract (the refusal that protects the byte-confirmed card).

- [ ] **Step 2: Verify RED** (v1 literal, missing field, old digest, outcome-only seam).
- [ ] **Step 3: Implement** — thread details through every named site. The offline demo adapter echoes the sha it was given — no change.
- [ ] **Step 4: Verify GREEN** — full core suite; add one hostile-result assertion: a worker result echoing `sha256(outcome-only)` against a details-bearing contract fails closed.
- [ ] **Step 5: Commit** + records.

### Task 4: The data channel, app side — parser accepts `details`, card shows it

**Files:**
- Modify: `app/src/main/conductor/taskblock.ts`, `app/src/shared/ipc.ts` (TaskBlock), `app/src/renderer/components/TaskCard.tsx`, `app/src/renderer/screens/Chat.tsx` (thread the new `onSend(outcome, details)` signature), `app/tests/fixtures/fake-conductor.mjs` (a scripted reply whose cairn-task block carries details)
- Test: `app/tests-unit/taskblock.test.ts`, `app/tests/conductor.spec.ts`

**Interfaces:**
- `TaskBlock.details: string` ("" when absent). Parser: `details` joins the allowed keys; string; cap 2000; trimmed; wrong shape drops the block. `TaskCard` renders a "Details (sent verbatim)" section when non-empty; the dispatch pill calls `onSend(block.outcome, block.details)`.

- [ ] **Step 1: Failing unit tests**:

```ts
test("details parses verbatim within its cap and fails closed beyond it", () => {
  const ok = extractTaskBlock('```cairn-task\n{"outcome":"x","details":"74, 477, 256"}\n```');
  assert.equal(ok.block?.details, "74, 477, 256");
  const none = extractTaskBlock('```cairn-task\n{"outcome":"x"}\n```');
  assert.equal(none.block?.details, "");
  const big = extractTaskBlock('```cairn-task\n{"outcome":"x","details":"' + "a".repeat(2001) + '"}\n```');
  assert.equal(big.block, null);
  const wrongType = extractTaskBlock('```cairn-task\n{"outcome":"x","details":7}\n```');
  assert.equal(wrongType.block, null);
});
```

- [ ] **Step 2: RED.** — [ ] **Step 3: Implement** (parser: add `"details"` to `allowed`; `const detailsRaw = record.details ?? ""; if (typeof detailsRaw !== "string" || detailsRaw.length > 2000) return null;` and return `details: detailsRaw.trim()`; TaskCard section + signature; Chat threads the parameter — until Task 5 lands, Chat may still route outcome-only into the old navigation, keeping compilation and the existing Playwright suite green). — [ ] **Step 4: GREEN** (unit; smoke with the fixture's details-bearing reply asserting the card shows the details text). — [ ] **Step 5: Commit** + records.

### Task 5: Inline dispatch — the run request becomes an object, details thread the app gate, confirmation moves into chat

**Files:**
- Modify: `app/src/shared/ipc.ts` (`TaskRunRequest`, `CairnApi.taskRun`, `taskRoute` gains details, `RunSessionSnapshot.conversationId`), `app/src/preload.ts`, `app/src/main/tasks.ts`, `app/src/renderer/screens/Chat.tsx`, `app/src/renderer/screens/TaskRun.tsx`, `app/src/renderer/App.tsx`, `app/tests/conductor.spec.ts` (REWRITE the "full loop" test at lines ~170-216 — it asserts the retired prefill navigation and CANNOT survive; rewriting it is authorized and required), `app/tests/routing.spec.ts` (real-lane details coverage)
- Test: as above

**Interfaces:**
- `TaskRunRequest = { dir: string; outcome: string; details: string; adapterId?: string; realCallConfirmed?: boolean; disclosure?: WorkerDisclosure; conversationId?: string | null }`; `taskRun(request)` replaces the positional signature at every call site (TaskRun.tsx passes `details: "", conversationId: null`). `taskRoute(dir, outcome, details, adapterId?)`.
- `tasks.ts` threads details EVERYWHERE the outcome goes today: `authorizeCodexExec(dir, outcome, details)` (line ~57 via detectedAdapters — widen its signature), `routed?.disclosure?.(outcome, details)` at BOTH gates (lines ~84, ~117), and `runSerialTask(dir, outcome, { details, ... })` (line ~129). `sessions.set` gains `conversationId: request.conversationId ?? null`.
- Chat's inline confirmation panel: ALWAYS shows the outcome and details (verbatim) with the start control; the six-field disclosure block plus the confirm checkbox renders INSIDE it only when a disclosure exists — mirroring TaskRun's `{disclosure ? ... : null}` semantics. In CAIRN_MOCK (no disclosure) the panel is outcome+details+Start only. The old Chat→TaskRun prefill navigation is deleted.

- [ ] **Step 1: Failing Playwright test** (CAIRN_MOCK lane): scripted details-bearing card → dispatch press → inline panel shows outcome AND details → start → run begins; `taskCurrent` reports the conversation id; the app did NOT navigate to the task screen. REWRITE the legacy full-loop test to this flow in the same step (its LOG-row landing assertions carry over).
- [ ] **Step 2: RED** (new test fails; note the legacy test is being rewritten, so "existing green" applies to the other 23).
- [ ] **Step 3: Implement** (signature migration first, then the panel; extract TaskRun's disclosure card into a shared component only if under ~50 lines, else duplicate).
- [ ] **Step 4: GREEN, plus the real-lane guard** — extend `app/tests/routing.spec.ts`'s fake-codex dispatch test (CAIRN_MOCK=0) to carry details end-to-end: the confirmation shows the concatenated task field, the run is NOT refused `REAL_MODEL_CALL_NOT_AUTHORIZED`, and the fake codex receives a prompt containing the details line (the PATH-shim fixture writes what it receives — assert on its capture file, following that spec's existing idiom). This is the test that makes the CRITICAL authorization-chain gap impossible to ship silently.
- [ ] **Step 5: Commit** + records.

### Task 6: The run lives visibly in chat — status strip, stop, composer truth; the fake-codex lane becomes shared

**Files:**
- Create: `app/tests/fixtures/fake-codex-env.ts` (port `fakeCodexEnvironment` from `app/tests/routing.spec.ts:20-82` VERBATIM as a shared export; routing.spec.ts imports it — behavior unchanged)
- Modify: `app/src/renderer/screens/Chat.tsx`, `app/tests/conductor.spec.ts` (new tests launch with the fake-codex env: `CAIRN_MOCK=0`, PATH shim, slow behavior — NOT the file-wide mock baseEnv)
- Test: `app/tests/conductor.spec.ts`

**Interfaces:**
- Stage union is `"Route" | "Run" | "Check" | "Result"` (NO Guard). Strip renders the latest activity's stage + elapsed + "Stop this task" (existing `taskCancel`) + "Open the run screen" link. Composer disabled with: "A task is running. The composer reopens when it finishes." Interim (until Task 8): when the session closes, the strip renders its terminal state (DONE/STOPPED/error line) with the run-screen link — the conversation is not left silent between Tasks 6 and 8.

- [ ] **Step 1: Failing Playwright test** — in the shared fake-codex slow lane: dispatch inline (Task 5 flow with the real disclosure confirmation — the fixture's disclosure is byte-derivable via `taskRoute`), assert the strip shows a stage word and disabled composer with the exact copy; stop → run closes CANCELLED_BY_OWNER and the strip shows the terminal state; reload mid-run → strip reattaches.
- [ ] **Step 2: RED.** — [ ] **Step 3: Implement** (subscribe as TaskRun.tsx does; no new IPC). — [ ] **Step 4: GREEN, all suites.** — [ ] **Step 5: Commit** + records.

### Task 7: The envelope's result carries its structured truth (core)

**Files:**
- Modify: `core/src/serial.ts` ONLY (`ClosedSerialResult` gains `composed: ComposedRecordInput`; rendered report bytes MUST NOT change)
- Test: `core/test/serial.test.ts`

**Interfaces:**
- `SerialRunResult` done/stopped arms carry `composed: ComposedRecordInput`. FACTS (from review, against the plan's earlier wrong premise): only `cairnWorkerRecords` (serial.ts:500, input built at 512-525) constructs a ComposedRecordInput today. The other close sites render via legacy `reportText()` templates and have NO composed value. `composed` is ADDITIVE — the card's data source — and is synthesized at those sites without touching their rendering:
  - Adapter-throw stop (~895-900): `{ taskNumber, route: contract.route, disposition: "STOPPED", stopReason: reason, claims: null, filesChanged: [] /* or the retained changed paths where the site computes them */, protectedIntact: true, commit: null, evidenceSummary: null, processFailure: processFailure ?? null, paidCallStarted: !demo && reason !== "REAL_MODEL_CALL_NOT_AUTHORIZED", recordRecovery: null }`
  - Both record-rewrite closes (~958-963, ~1058-1063): same shape with `stopReason` = the rewrite's reason and `protectedIntact` = the site's real verification boolean where it has one.
  - Offline demo stop (~1084-1089) and DONE (~1117-1121): `claims: null`, `paidCallStarted: false`, `commit` = the demo lane's real commit value on DONE, `evidenceSummary: null`.
  - Add a small private helper `composedForClose(...)` so the sites stay uniform; give each field the site's REAL value, never a fixed phrase.
- Consumers must treat `composed.claims` as worker CLAIMS, never verified facts.

- [ ] **Step 1: Failing tests** — done-run: `result.composed.filesChanged` deep-equals the git-derived list, `composed.claims?.summary` matches the fence, `composed.protectedIntact === true`; claims-DONE-but-protected-changed: `composed.disposition === "STOPPED"` with the real reason; offline demo DONE: `composed.paidCallStarted === false` and `composed.commit?.status` matching the run's real commit result.
- [ ] **Step 2: RED** (property missing). — [ ] **Step 3: Implement** per the site table. — [ ] **Step 4: GREEN — and assert no report-byte change: the full suite's golden/byte-back tests pass untouched.** — [ ] **Step 5: Commit** + records.

### Task 8: Result cards — a new conversation role, posted for every terminal state

**Files:**
- Create: `app/src/main/conductor/relay.ts`
- Modify: `app/src/shared/ipc.ts` (ConductorTurn union, ConductorDelta kind "envelope", ResultCard), `app/src/main/conductor/store.ts` (readTurns filter AND `listConversations` preview — `turns[0]?.text.slice` breaks on the envelope arm; preview becomes the first owner/cairn turn's text, else "Result card"), `app/src/renderer/components/BodyPill.tsx` (its `replyLine(turn)` reads `.tokens`/`.costUsd` — guard on `turn.role === "cairn"`), `app/src/main/tasks.ts` (post-settle hook), `app/src/renderer/screens/Chat.tsx` (render envelope turns AND an explicit `"envelope"` delta branch — today's final else treats unknown kinds as errors), `app/tests/fixtures/fake-conductor.mjs` if the scripted flow needs a new reply
- Test: `app/tests-unit/resultcard.test.ts`, `app/tests/conductor.spec.ts`

**Interfaces:**
- `ConductorTurn` union: existing owner/cairn arm unchanged; new `{ role: "envelope"; card: ResultCard; ts: string }`.
- `ResultCard` (ipc.ts): `{ kind: "result"; disposition: "DONE" | "STOPPED" | "ERROR"; taskNumber: number | null; stopReason: string | null; errorCode: string | null; filesChanged: string[]; protectedIntact: boolean | null; commit: string | null; evidenceSummary: string | null; claims: { summary: string; milestone: string } | null; route: { adapterLabel: string; provider: string; model: string } | null }`.
- `relay.ts` exports: `composeResultCard(result: SerialRunResult): ResultCard` — done/stopped arms map from `result.composed`; the **connection-required arm maps to a STOPPED card** with `stopReason: "CONNECTION_REQUIRED"`, `taskNumber: null`, empty files, `protectedIntact: null`, `claims: null`, route from `result.route`'s fields with the reason folded into the render; `composeErrorCard(message: string): ResultCard` (ERROR, code = text before the first colon). Also `postResultCard(dir, conversationId, card): ConductorTurn` — appends the envelope turn via `appendTurn` and RETURNS it; the CALLER (tasks.ts) sends the delta, because service/relay have no window: `win()?.webContents.send("conductor:delta", { dir, conversationId, kind: "envelope", turn })`.
- Store: `readTurns` keeps envelope lines whose `card` is an object with `kind === "result"` (else dropped). Prompt assembly (service.ts history mapping): envelope turns map to `{ role: "system", content: "Envelope result card (verified by Cairn's runtime, not by the conversation model):\n" + JSON.stringify(turn.card) }`.
- Timing: the hook chains on the settled run promise — `void run.then(() => { ... })` AFTER `settlements.set(dir, run)` in tasks.ts — which executes after the closure's `finally`, so the running set is already clear (Task 9's gate depends on this). Posting happens only when the request carried a `conversationId`.
- ERROR-card render copy (spec requirement): the Chat card for ERROR states the code, the fixed sentence "Cairn could not verify the workspace. This run needs inspection before the next task.", and two links: "Open the run screen" and the retained records path line.

- [ ] **Step 1: Failing unit tests** (`resultcard.test.ts`): done→DONE card with filesChanged from composed; stopped→stopReason carried; connection-required→STOPPED/`CONNECTION_REQUIRED` mapping; `composeErrorCard("RECORD_VERIFICATION_FAILED: x")`→ERROR with the code; store round-trip keeps a valid envelope turn and drops `{"role":"envelope","card":{"kind":"nope"}}`; listConversations preview of an envelope-first conversation is "Result card".
- [ ] **Step 2: RED.** — [ ] **Step 3: Implement** (including the BodyPill guard and Chat's envelope delta branch). — [ ] **Step 4: GREEN** — unit; Playwright in BOTH lanes: mock lane for the DONE card render + reload persistence; fake-codex lane for a STOPPED run's honest card. — [ ] **Step 5: Commit** + records.

### Task 9: The commentary turn

**Files:**
- Modify: `app/src/main/conductor/service.ts` (extract the streaming body of `runStream` into a private `streamTurn` helper; add `commentary`), `app/src/main/tasks.ts` (call after postResultCard in the post-settle hook, passing an onDelta built from `win()` exactly like the activity sender), `app/tests/fixtures/fake-conductor.mjs` (commentary keying: the fixture picks replies off the last `role:"user"` message — a commentary request ends with a SYSTEM message, so extend the fixture to return a fixed commentary script when the last message is a system message containing "result card")
- Test: `app/tests/conductor.spec.ts`

**Interfaces:**
- `commentary(dir, conversationId, card: ResultCard, onDelta): void` — skips silently when: no stored connection, a stream is in flight for `dir`, or `isTaskRunning(dir)` (evaluated post-settle, so it guards only genuinely new overlapping runs). Messages: constitution + briefing + full history (the envelope card arrives via the Task 8 system-role mapping) + one system instruction: `"The envelope just posted the result card above. Add one short plain-language comment for the owner. State result facts only from the card or the records in your briefing, and name your source. Do not propose a task."` Persists as a normal cairn turn with tokens/cost.
- Disconnected choreography (Playwright, mock lane): dispatch → disconnect while the run finishes (the pane swaps to the connect card — expected) → run settles (the card posts main-side regardless) → reconnect with the same fixture body → reopen the conversation → assert the envelope card is present with NO commentary bubble after it, and no error surfaced.

- [ ] **Step 1: RED** (connected scenario: commentary bubble follows the card; disconnected scenario as above). — [ ] **Step 2-4: Implement, GREEN, all suites.** — [ ] **Step 5: Commit** + records.

### Task 10: Push machinery (app main, unit-tested)

**Files:**
- Create: `app/src/main/push.ts`
- Modify: `app/src/shared/ipc.ts` + `app/src/preload.ts` + `app/src/main/ipc.ts` (handlers `push:preview`, `push:execute`)
- Test: `app/tests-unit/push.test.ts`

**Interfaces:**
- `pushPreview(dir, exec?)`: `{ remote: string; url: string; branch: string; ahead: number; subjects: string[] } | null` (null when `git rev-parse --abbrev-ref --symbolic-full-name @{u}` fails). Ahead: `rev-list --count @{u}..HEAD`; subjects: `log @{u}..HEAD --format=%s`. `GIT_TERMINAL_PROMPT=0`, local-only.
- `pushExecute(dir, exec?)`: `{ ok: true; summary: string } | { ok: false; kind: "no-remote" | "auth" | "remote-ahead" | "other"; message: string }`. One plain `git push`. Classify stderr in this order: auth (`Authentication failed|could not read (Username|Password)|Permission denied`), remote-ahead (`fetch first|non-fast-forward|\[rejected\]`), else other. Never retry, never force. `exec` injectable `(args: string[]) => { status: number; stdout: string; stderr: string }`.
- **Fixture recipe (corrected by review — a non-bare origin refuses pushes):** create a BARE origin `O` (`git init --bare`), then TWO working clones A and B of `O`. Happy path: commit in B → `pushExecute(B)` ok, preview(B) ahead drops to 0. Remote-ahead: commit in A, push A; then commit in B → `pushExecute(B)` → `kind: "remote-ahead"`. No-remote: a plain `git init` dir → preview null, execute `kind: "no-remote"`. Auth: injected exec returning status 128 / stderr `fatal: Authentication failed for 'https://…'` → `kind: "auth"`, message includes sign-in guidance, exec called exactly once.

- [ ] **Steps 1-5:** RED (module missing) → implement → GREEN (unit) → commit + records.

### Task 11: The push chip and the contract's pause

**Files:**
- Modify: `app/src/renderer/screens/Chat.tsx`, `app/tests/conductor.spec.ts`

**Interfaces:**
- After a `disposition === "DONE"` result card renders, Chat calls `pushPreview`; `ahead > 0` renders the chip: `This project is {ahead} commits ahead of {remote}. Push?` Press → confirmation panel: target (`{remote} — {url}`, branch), effect (the exact commit subjects + "Pushing publishes these commits. On a public repository they become publicly visible."), recovery ("A pushed commit can be reverted by a new commit. Publication itself cannot be recalled."), Push / Not now. Approve → `pushExecute` → honest outcome inline. STOPPED/ERROR cards never evaluate the chip; null preview renders nothing. No conductor channel.
- **Fixture (corrected by review — a mock DONE run commits NOTHING):** setup pushes the scaffold to a bare `file://` upstream, then makes ONE extra local commit that is never pushed — so after the DONE run, ahead is exactly 1 and the chip must read "1 commits ahead" (render `1 commit ahead` — singularize; assert the singular form).

- [ ] **Steps 1-5:** RED (chip test + confirmation-lists-subjects + STOPPED-run-no-chip) → implement → GREEN → commit + records.

### Task 12: Constitution v2

**Files:**
- Modify: `app/src/main/conductor/constitution.ts`
- Test: `app/tests-unit/constitution.test.ts`

**Interfaces:**
- `CONSTITUTION_VERSION = "conductor-v2"`. Task-block schema line gains `"details": "<owner-supplied specifics carried verbatim, if any>"`. Three rules, pinned verbatim by tests:
  - Data fidelity (in the Proposing-a-task paragraph): "Anything the owner supplies that the task needs — numbers, names, exact wording — goes into details verbatim; if it does not fit, ask. Never invent values."
  - Citation honesty (Honesty paragraph): "Never attribute to a source a fact that source cannot contain: you see records, a git summary, and file names — never file contents — so any claim about what code contains is your inference and must be said as one."
  - Result commentary (new Results paragraph): "When a run finishes, the envelope posts the result card. State result facts only with their source in view — the card or the records in your briefing — and name which. A result fact found in neither is not yours to state."

- [ ] **Steps 1-5:** RED (version + three verbatim pins) → implement → GREEN (unit + full battery) → commit + records; report notes the eval table's v1 row is historical and a v2 run awaits the owner.

### Task 13: The contract amendment, consent wording, and the 0.3.0 close

**Files:**
- Modify: `CONTRACT-TEMPLATE.md`, `AGENTS.md` (hand-updated, diff-verified — no test guards it; INCLUDING its "Cairn Contract v0.x" header line), `cairn.html` (embedded contract block + BOTH version lines — encoding hazard: never rewrite this file with PS5.1 Get-Content/Set-Content; exact-string edits only), `app/src/main/conductor/service.ts` (consent `cost` gains: "After a task Cairn dispatches from chat finishes, Cairn takes one short comment turn on the result; it bills like any other turn."), `docs/ai-work/PROJECT.md` + AGENTS.md milestone line (reconcile to "explained honestly as the envelope's result card with the conductor's commentary"), `CHANGELOG.md` (0.3.0), `core/package.json` + `cli/package.json` + `app/package.json`, lockfiles: root + app via `npm install --package-lock-only` (run in repo root AND in `app/`), and `cli/package-lock.json` (vestigial but versioned — regenerate it the same way in `cli/`, noting its status in the report)
- Test: `core/test/contract-mirrors.test.mjs` (drives the mirror sync), full battery

**Contract amendment (dual-audience, from the spec):** step 6 stays; "Task records are memory" gains: "In an envelope-dispatched run, Cairn's runtime authors the report and log row itself, from its own verification plus the worker's claims." The connected-conductor section gains the relay (envelope-authored result card + one conductor comment turn, its cost on the same basis) and the push affordance: "Cairn may offer a push button when local commits are ahead of the remote; every push shows the exact target, effect, and recovery plan, and runs only on the owner's approval of that exact action."

- [ ] **Step 1:** Contract edits in CONTRACT-TEMPLATE.md → `cd core; npm test` → mirror test RED against cairn.html (expected).
- [ ] **Step 2:** Update cairn.html's embedded block and AGENTS.md by hand → mirror GREEN.
- [ ] **Step 3:** Consent-card wording; grep `app/tests-unit` for consent-card assertions and extend red-first if any pin the cost sentence.
- [ ] **Step 4:** Version close: CHANGELOG 0.3.0 entry (six chunks, honest paragraphs); contract header line in CONTRACT-TEMPLATE.md + AGENTS.md + cairn.html (eyebrow line ~43 AND embedded header line ~95); three package.json files; all three lockfiles; verify app/package.json's first byte is `{` (no BOM).
- [ ] **Step 5:** Full battery (core incl. mirror, cli, app unit, Playwright, one short-TEMP core run). Commit exact paths + records; the report names every hand-updated mirror.

---

## Self-review notes (verified against code by adversarial review before landing)

- Spec coverage: Chunk 1 → Tasks 1-2; Chunk 2 → Tasks 3-4 (+5 for the app gate); Chunk 3 → Tasks 5-6; Chunk 4 → Tasks 7-9; Chunk 5 → Tasks 10-11; Chunk 6 → Tasks 12-13. Milestone attempt + v2 evals follow execution (owner actions).
- Interface anchors later tasks consume: `TaskRunRequest`, `ResultCard`, `composed: ComposedRecordInput`, rungate's exports, `pushPreview/pushExecute`, `onSend(outcome, details)`, `postResultCard` returning the turn with the CALLER sending the delta.
- Owner-approved decisions no implementer may alter: the digest formula, the disclosure concatenation, the system-role card mapping, DONE-only chip trigger, the two-step push ceremony, commentary's skip conditions.
