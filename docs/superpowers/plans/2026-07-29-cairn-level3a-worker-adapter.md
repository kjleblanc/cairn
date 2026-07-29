# Cairn Level 3a — The Kimi Worker Adapter — Implementation Plan

> **For agentic workers:** implement this plan task-by-task, in order, one
> recorded Cairn task each (brief, report, one LOG row, exact-path commit).
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A second real worker adapter — the Kimi Code CLI the owner
installed and signed into — joins the serial dispatch seam, and every
multi-worker dispatch asks the owner which worker to use, with Cairn's
suggestion showing its reason.

**Architecture:** `core/src/kimi.ts` mirrors `core/src/codex.ts` against the
same `TaskAdapter` seam: output-free + billing-aware detection, one
ephemeral `kimi -p --output-format stream-json` process per confirmed task,
watchdogs with tree kill, redacted debug copies, disclosure re-derived at
the gate. App wiring generalizes `detectedAdapters` from "codex" to "every
connected real adapter". Decision 6 rides the existing
`cairn-task` block (an optional suggestion field) and the existing
`overrideAdapterId` route mechanism.

**Tech Stack:** TypeScript, Node 22, `node:test`, Playwright, the real Kimi
Code CLI 0.29.2 (installed at `C:\Users\KenJL\.kimi-code\bin\kimi.exe` —
present on the development machine but **never invoked by any suite**).

**Read first:** the spec
`docs/superpowers/specs/2026-07-28-cairn-kimi-cli-body-worker-design.md`,
**including both amendments** (Decision 6 replacement; Task 106 spike
findings). The spike amendment is the only source of Kimi CLI facts —
anything it marks unverified is out of scope or becomes a wire-level test
pin, never an assumption.

## Global Constraints

- **No suite may invoke the real Kimi CLI.** Fail-closed inside the module
  that resolves the binary: when the positive test marker
  `CAIRN_TEST_LANE=1` is present and `CAIRN_FAKE_KIMI` is not, command
  resolution returns null (not-found). A unit test asserts the refusal, so
  deleting the guard turns a suite red. This matters more here than for
  codex: a signed-in real CLI now exists on the development machine, and
  the `~/.kimi-code/bin` resolution fallback could silently escape to it.
- **Argv-only prompts, with a length guard.** The spike observed `-p`
  takes the prompt as an argv value and does not read stdin. The adapter
  passes the composed prompt as one argv element and throws
  `KIMI_PROMPT_TOO_LONG` (a `WorkerProcessError` with `failure "process"`,
  killed-by-construction) past 24,000 chars — comfortably under the
  ~32 KB Windows limit, measured at compose time, before spawn.
- **The disclosure names the session persistence.** The spike observed
  print mode writes sessions under `~/.kimi-code/sessions/`. The data-scope
  sentence names that second at-rest copy, beside the project files.
- **Billing truth from `source=oauth`.** Detection runs
  `kimi provider list` (one structured line, no secrets — observed) and
  parses `source=oauth`. Only then may the quota sentence say "membership";
  any other output (or probe failure) selects the generic "the account this
  CLI is signed into" wording. Parsing this one line is not credential
  inspection; the auth probe proper stays output-free (ACP
  `initialize` + `authenticate {methodId:"login"}`, `-32000` = signed out —
  camelCase, per the spike's recorded docs correction).
- **Pins assert at the wire.** Tests capture the argv handed to the
  spawned process and the JSON-RPC sent to the fake ACP peer — never a
  helper's return value.
- **Single-candidate behavior is byte-identical.** One connected real
  adapter asks nothing, shows nothing new, and every existing string,
  suite, and snapshot passes unmodified. This is the pin that proves
  Decision 6's fallback rule.
- **Level 2 and OpenRouter stay untouched.** The connect card, consent
  derivation, and `connect-kimi.spec.ts` are out of scope and pass
  unmodified.
- **Priority is fallback ordering only.** The Kimi adapter registers at
  priority 90 (below Codex Exec's 100) so single-sort behavior is stable;
  with two candidates the owner always chooses — priority never silently
  picks (Decision 6).
- **Records discipline.** One recorded task each; never `git add -A`;
  never rewrite history. The parallel lane owns the renderer visual layer
  (Task 111) — Task 5 below touches dispatch-flow renderer files only as
  named, and if the lanes collide on a file, this lane waits.
- **Version stays 0.4.0 until the close task**, which lands one changelog
  entry and the 0.5.0 bump across the three package files and locks, per
  the changelog's one-version rule.

---

### Task 1: Detection — installed, connected, and on what billing

**Files:** create `core/src/kimi.ts` (detection half), create
`core/test/kimi.test.mjs`; edit `core/src/index.ts` (exports only).

- [ ] `KimiExecStatus { installed, connected, billing: "oauth" | "other" | "unknown" }`.
- [ ] `KimiStatusProbe` interface (output-free `run(args)` in the
  `CodexStatusProbe` idiom) for `--version`; `KimiAcpProbe` interface for
  the auth handshake; `KimiProviderProbe` for the billing line. All three
  injectable; `detectKimiExecStatus(dir, probes?)` composes them:
  installed (exit status of `--version`) → connected (ACP
  `initialize` + `authenticate`, `-32000` → false, process failure →
  false) → billing (`provider list` line parse; only `source=oauth` →
  `"oauth"`, other `source=` values → `"other"`, anything else →
  `"unknown"`).
- [ ] Command resolution in the `resolvePathCodexCommand` idiom: absolute
  PATH entries, workspace-contained binaries refused (`insideWorkspace`
  via `canonicalPath`), `.exe`/`.cmd`/`.bat` on Windows, cmd-special-char
  refusal for shim forms, **plus** the `%USERPROFILE%\.kimi-code\bin`
  fallback directory when PATH resolution fails (the spike observed the
  installer lands there and PATH edits don't reach running processes).
- [ ] The system ACP probe: spawn resolved `kimi acp`, send the two
  JSON-RPC messages, read replies with a 5-second cap, kill the child,
  never log or return reply text beyond the error code. The system
  provider probe reads the one stdout line; it is secret-free by
  observation and is still passed through the existing `redactTokens`
  shape before any debug write.
- [ ] The fail-closed test-lane guard (Global Constraints) lives in the
  resolution function.
- [ ] `kimiExecStatusText` / `kimiExecConnectionReason` mirroring the codex
  prose functions.
- [ ] Tests (red first): FakeProbe both directions; signed-out (-32000);
  probe process failure; workspace-planted fake refused; fallback
  directory used only when PATH misses; billing parse for
  `source=oauth` / `source=api-key` / garbage; the test-lane guard
  refusal; ACP probe asserted on the exact JSON-RPC bytes the fake peer
  received (wire pin).

### Task 2: The exec process — argv, stream-json, watchdogs

**Files:** edit `core/src/kimi.ts` (process half); edit
`core/test/kimi.test.mjs`.

- [ ] `KimiExecRequest { command, args, cwd, prompt }` (prompt separate
  from args — it is appended at spawn with the length guard).
  `KimiExecProcessResult` mirrors the observed schema: exitCode, terminal
  message presence, agentMessageCount, toolCallCount, failedToolItemCount,
  finalMessage. **No token fields** (none observed).
- [ ] `createSystemKimiExecProcess(options?)`: spawn the resolved command
  (`kimi -p <prompt> --output-format stream-json -m kimi-code/kimi-for-coding`,
  cwd = project), `.cmd` shim chains launched via ComSpec exactly as
  `shimArgs` does; inactivity 600 s + absolute 3 600 s watchdogs reusing
  the codex timer shape; tree kill (`taskkill /T` on Windows, group kill
  on POSIX); owner cancel; force-settle fallback; redacted debug copies
  under the same outside-every-project debug directory (`kimi-*.jsonl`).
- [ ] The stream-json parser, from the spike's observed lines only:
  `role:"assistant"` with string `content` → finalMessage (last wins),
  count 1; `role:"assistant"` with `tool_calls` → toolCallCount +=
  tool_calls.length; `role:"tool"` → nothing numeric (its matching call
  was already counted) except failure detection via the tool_call_update
  `status:"failed"` convention observed on ACP — **print-mode failure
  marking was not observed**, so a failed tool is counted only when the
  tool result's content carries an error shape the implementation defines
  conservatively (document the choice); `role:"meta"` → ignored for
  results, retained in the debug copy. Malformed line → terminalEvent
  error; oversized line (>1 MB) → dropped, finalMessage nulled (the codex
  overwrite-to-null rule, same reason).
- [ ] Tests (red first): clean finish (PONG transcript from the spike);
  tool-call sequence (call 2 transcript); malformed line; oversized line;
  non-zero exit; missing final message; inactivity and absolute timeouts
  with a wedged fake; cancel pre-spawn and mid-run with kill-confirmed
  both ways; argv captured at the fake child asserts `-p`, the prompt
  element, `--output-format stream-json`, and `-m kimi-code/kimi-for-coding`
  (wire pin); prompt past 24,000 chars refused before spawn.

### Task 3: Disclosure, authorization, the adapter factory

**Files:** edit `core/src/kimi.ts`; edit `core/test/kimi.test.mjs`.

- [ ] Constants: `KIMI_EXEC_PROVIDER = "Moonshot AI"`,
  `KIMI_EXEC_MODEL = "kimi-code/kimi-for-coding"`,
  `KIMI_EXEC_ADAPTER_ID = "kimi-exec"`, data-scope sentence naming the
  task instructions, AGENTS.md, the brief, project files Kimi reads,
  **and** the session record written under `~/.kimi-code/sessions/`.
- [ ] Two quota sentences selected by `status.billing`: `"oauth"` → the
  membership truth (runs on the Kimi membership this CLI is signed into;
  plan rate limits apply; Cairn cannot see remaining quota; exactly one
  ephemeral process, no retry or resume); anything else → the generic
  floor (the account this CLI is signed into; Cairn cannot tell which
  billing applies; same one-process promise).
- [ ] `kimiExecDisclosure(dir, outcome, details)` /
  `authorizeKimiExec(...)` / `authorizationMatches` — byte-for-byte the
  codex pattern, including the two-part (outcome + details) binding.
  `KimiExecModelCallBoundaryError` extends `WorkerBoundaryError` with the
  **same** `REAL_MODEL_CALL_NOT_AUTHORIZED` code (imported from
  `codex.ts`) so the envelope's stop-reason mapping is unchanged.
- [ ] The worker prompt: codex `taskPrompt` minus the apply_patch line,
  plus the two sharpened lines from the spec (subagents and background
  tasks forbidden; one serial call means one), plus one new line naming
  the CLI honestly ("You are running as Kimi Code CLI in print mode.").
- [ ] `createKimiExecAdapter(dir, status, authorization?, processRunner?)`
  → `TaskAdapter`, priority 90, capabilities `["serial-task"]`,
  `connected` from status; `run()` re-derives and refuses without a
  matching authorization, then translates the process result into
  `worker-result/v1` (completed iff exit 0 and a final assistant message;
  evidence = the numeric fields from Task 2).
- [ ] Tests (red first): disclosure byte-pins for both billing wordings;
  authorization refuses mismatched outcome/details/billing; boundary
  error carries the shared code; adapter descriptor shape; run()
  translation for completed/failed; `routeTask` with codex-at-100 and
  kimi-at-90 fakes sorts codex first and honors an override to kimi.

### Task 4: App wiring — every connected adapter, one gate

**Files:** edit `app/src/main/tasks.ts`; create
`app/tests/fixtures/fake-kimi-env.ts`; edit `app/tests/routing.spec.ts`
(additive cases only); create `app/tests-unit/kimi-wiring.test.ts` (or the
nearest existing unit home for `detectedAdapters`); edit
`app/tsconfig.unit.json` if the unit set needs the new file.

- [ ] `fake-kimi-env.ts` in the fake-codex idiom: a PATH shim answering
  `--version` (exit 0), `acp` (a minimal JSON-RPC peer: initialize result,
  authenticate result or -32000 by fixture flag), `provider list` (the
  observed `source=oauth` line), and `-p` (emit the spike's observed
  success transcript — assistant message with a cairn-claims fence, meta
  line — with `invalid-jsonl`, `missing-claims`, and `slow` behaviors).
  The fixture sets `CAIRN_FAKE_KIMI` and `CAIRN_TEST_LANE=1`.
- [ ] `detectedAdapters` generalizes: run both detections, construct
  `createCodexExecAdapter` and `createKimiExecAdapter` each only when its
  status says connected, each with its own authorization when
  `realCallConfirmed === true`. The `status` return becomes a small
  record `{ codex?, kimi? }` and the `connection-required` reason picks
  the right prose (both probed, both named when both are absent).
- [ ] The run-time disclosure gate is unchanged in shape — it already
  re-derives from the routed adapter — but the test asserts it for the
  kimi route end to end: a confirmation carrying the kimi disclosure
  dispatches kimi; the same confirmation cannot dispatch codex and vice
  versa.
- [ ] Tests (red first): unit — both connected → both descriptors;
  kimi-only; codex-only (today's behavior, byte-identical reason
  strings); neither. E2E (additive): the fake-kimi lane completes a
  serial run DONE through the real-call path with `CAIRN_MOCK=0`, and the
  fake-codex specs pass unmodified beside it.

### Task 5: The ask and the suggestion (Decision 6)

**Files:** edit `app/src/shared/ipc.ts` (`TaskBlock` gains optional
`worker?: string; workerWhy?: string`); edit
`app/src/main/conductor/taskblock.ts` (parse the two optional fields:
`worker` ≤ 64 chars, `workerWhy` ≤ 300, both trimmed; unknown keys still
fail the block); edit `app/src/main/conductor/constitution.ts` (one
sentence: when more than one worker is connected, the conductor MAY name
`worker` from the connected list it is shown and MUST give its reason in
`workerWhy`); edit the conductor context assembly (the briefing gains the
connected-worker id list when there are two or more); edit the dispatch
confirmation renderer (the inline confirmation in
`app/src/renderer/screens/Chat.tsx` and/or `components/TaskCard.tsx` —
whichever owns the dispatch card today) to show a chooser when
`route.candidates.length > 1`; edit
`app/src/renderer/components/ModelRoute.tsx` only if the chooser reuses
it; edit `app/tests-unit/taskblock.test.ts` and the route/dispatch unit
tests; edit `app/tests/conductor.spec.ts` (additive) and
`app/tests/routing.spec.ts` (additive).

- [ ] The chooser lists every connected candidate (label, provider,
  model); selecting one re-runs `task:route` with `adapterId` so the
  disclosure card always re-derives from the picked adapter — the
  confirmation remains the single authorization moment.
- [ ] The suggestion renders only when `block.worker` exactly equals a
  connected candidate's id — otherwise it is dropped silently (never
  shown, never blocks the task). Shown as "Cairn suggests {label}" with
  `workerWhy` verbatim, visually marked as a suggestion, not a fact.
- [ ] With one candidate there is no chooser and no suggestion line —
  today's flow byte-identical (snapshot/string pins).
- [ ] With no conductor connected there is no suggestion (the block is
  absent) — the chooser lists candidates in priority order with a plain
  line saying so.
- [ ] Tests (red first): taskblock parse accepts/drops the new fields by
  shape; unknown-key strictness unchanged; suggestion dropped for an
  unconnected id; chooser appears with two fakes and the pick dispatches
  through `overrideAdapterId` (E2E); single-candidate specs pass
  unmodified; the constitution string diff is exactly the one new
  sentence (byte-pin the rest).

### Task 6: Close — suites, changelog, version

**Files:** edit `CHANGELOG.md` (one 0.5.0 entry); edit
`core/package.json`, `cli/package.json`, `app/package.json` and the three
lockfiles' own version fields; this task's records.

- [ ] Full root `npm test`, app unit, typecheck, `build:vite`, and the
  complete E2E suite serially (the settle-run idiom from Task 103/109:
  throwaway profile, `workers: 1`).
- [ ] Final diff and status scoped; the parallel lane's files untouched.
- [ ] The changelog entry tells the story plainly: a second worker (the
  owner's own Kimi Code CLI), detection that never reads credentials,
  billing-honest confirmation wording, sessions named in the data scope,
  and the per-dispatch choice with Cairn's suggestion.

## Sequencing and dependencies

Tasks 1→2→3 are core and strictly serial. Task 4 depends on 3. Task 5
depends on 4 (it exercises both fakes) and is the only task touching
renderer dispatch code — coordinate with the parallel lane if its Task
111 is still in flight. Task 6 closes. 3b (the ACP conductor body) is a
separate plan, after the Phase 4 seam lands; this plan does not block or
enable it beyond sharing `core/src/kimi.ts`'s detection half.
