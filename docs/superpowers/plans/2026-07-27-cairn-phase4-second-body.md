# Cairn Phase 4 — The Second Body — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a second conductor body behind a general seam — the Claude Code the owner already installed, found rather than connected — so the model in the conductor's seat can be swapped without a code change.

**Architecture:** A `ConductorBody` interface owns everything transport-specific: descriptor, readiness probe, stream, consent facts, owner-facing failure messages. Today's `streamChat` moves behind it unchanged as the API body; the Claude Code body wraps the Agent SDK's `query()`, pinned to the owner's own `claude` executable. `service.ts` keeps persistence, the task-block parse, and the abort path, and stops knowing what a transport is.

**Tech Stack:** TypeScript, Electron 33, React 18, `@anthropic-ai/claude-agent-sdk` 0.3.220 (new), `node:test`, Playwright.

**Read first:** the spec at `docs/superpowers/specs/2026-07-26-cairn-phase4-second-body-design.md`, **including all three 2026-07-27 amendments**. They correct the sections above them and govern where they disagree.

> **Status: Task 0 is ready. Tasks 1–10 are provisional.**
>
> This plan has been through three adversarial review rounds. The first found structural errors, the second found detail errors inside a sound structure, and the third found that the SDK's *type declarations do not describe its behaviour* — an option the spec called load-bearing (`skills: []`) emits no flag at all, and two flags the design never considered (`--strict-mcp-config`, `--no-session-persistence`) turn out to be required. The spec's third amendment records all of it.
>
> Tasks 1–10 below are structurally sound and their sequencing holds, but they were written against inferences that are now known to be unreliable in this specific way, and they still carry known defects from the third review: `createClaudeCodeBody` never receives the `dir` that `bodyFor` carries; `ClaudeCodeDeps.query` is typed synchronous while `sdkQuery` must `await import(...)`; `bodies/api.ts` is missing from Task 6's file list although the `card` → `system` mapping must live there; the renderer has no route to `claudeCodeStatusText`, which lives in a main-process module; `CLAUDE_CODE_MODEL` re-exported through `shared/ipc.ts` would pull the SDK into the renderer bundle at Task 6; and the fake-lane guard is inverted (see the third amendment).
>
> **Do not execute Tasks 1–10 as written.** Run Task 0, amend the spec with what it finds, then revise them.

## Global Constraints

- **No suite may construct a real Claude Code body.** `createClaudeCodeBody` throws when `CAIRN_FAKE_CLAUDE=1` — fail-closed inside the module that imports the SDK, not at a call site a second call site could bypass. A unit test asserts that throw, so removing the guard turns a suite red. Cairn is often run *from* Claude Code, so a real invocation risks recursion as well as the owner's plan usage.
- **The body runs the owner's `claude`, never the SDK's bundled 2.1.220.** `pathToClaudeCodeExecutable` is set from the path the detection probe resolved. Unresolvable means the body cannot run; there is no fallback to the bundled copy.
- **Three isolation options, all load-bearing:** `settingSources: []`, `tools: []`, `skills: []`. Each closes a different inheritance path, and the SDK documents that omitting `skills` is *not* "skills off". `allowedTools` is auto-approval, not availability — it is not the mechanism.
- **`env` is an allowlist.** Set, it replaces the child's environment entirely; omitted, the child inherits `process.env` including `ANTHROPIC_API_KEY`. Any test must assert `env` is **present** before asserting its contents.
- **Pins assert on what `query()` received** — the params object handed to the injected `query` — never on a helper's return value.
- **`query({ prompt, options })`.** Nothing is spread flat.
- **The SDK is ESM-only** and the main process bundles to CommonJS. It is reached by dynamic `import()` inside `claudecode.ts` and never from a module a unit test loads. (Verified: `tsc --module NodeNext` emits `await import(...)` verbatim into CJS.)
- **Detection reads exit status only, never output text.** `claude auth status` prints account details.
- **The consent gate stays exact-field and stays in main.** `sameCard` compares all five fields; `consentConfirmed !== true` refuses; for a local agent main re-runs detection itself rather than trusting a disabled renderer button.
- **`app/src/preload.ts` is the real IPC bridge.** `renderer/api.ts` is one line re-exporting `window.cairn`. TypeScript accepts a 2-parameter arrow against a 3-parameter signature, so a missed preload edit passes `typecheck` and shifts arguments silently. Every signature change touches `preload.ts` in the same task.
- **No suite may reach a real provider.** Specs that write a connection restore it on every exit path and start from a clean slate, following `conductor.spec.ts:113-115`.
- **Records discipline.** One recorded Cairn task each: brief, report, one LOG row, exact-path commit. Never `git add -A`. Never rewrite history. Pushes are the owner's.
- **Version stays 0.3.0 until Task 10**, which also hand-bumps `cli/package-lock.json` — root `npm install --package-lock-only` rewrites the root lock instead, per this repo's precedent (tasks 027, 028, 030, 050).
- **Naming.** `renderer/bodies.ts` means "curated model list"; `main/conductor/bodies/` means "conductor transport". Different layers, same word.

---

### Task 0: The spike — what the CLI actually does

**Files:** create `docs/ai-work/spikes/2026-07-XX-claude-code-body.md`. **No source file changes. No test changes. Nothing under `app/` or `core/` is touched.**

**Produces:** recorded fact, which then amends the spec. Nothing else.

Every isolation guarantee in this phase currently rests on an inference: that the `Options` object handed to `query()` produces the CLI behaviour the option names suggest. The third amendment records why that inference is no longer trusted. This task replaces it with observation, once, and is then thrown away.

**This task spends the owner's Claude plan.** It is the owner's to authorise, and the authorisation is given *outside* this task's execution. An agent that asks for approval and then proceeds within the same turn has not been approved — it has approved itself.

- [ ] **Step 1: Stop and hand back**

Do not run anything. Write the exact commands you intend to run, the number of real turns they will consume, and what each one is for, then **end the task and return to the owner**. Resume only on the owner's explicit instruction in a new turn.

- [ ] **Step 2: Establish the baseline**

In a scratch directory outside the repository, with the SDK installed there:

```
node --input-type=module -e "
import { query } from '@anthropic-ai/claude-agent-sdk';
for await (const m of query({ prompt: 'Reply with the single word: ready', options: { maxTurns: 1 } })) console.log(JSON.stringify(m));
"
```

Record what a default turn looks like: which message types arrive, and — from the `system`/init message if one is emitted — which tools the CLI reports as available. This is the control. Without it, "tools are gone" cannot be distinguished from "the CLI never said."

- [ ] **Step 3: Answer the four questions**

Run the same call with, in turn:

1. `tools: []` and `settingSources: []` — does the reported tool set change? Is `~/.claude`'s configuration still visible to the turn?
2. `pathToClaudeCodeExecutable` set to the path `claude.cmd` resolves to on this machine — **does the process start at all?** The owner has no `.exe`, so this is the case Decision 4 actually lands on. If it fails, try the `claude` file beside it and record which forms work.
3. `strictMcpConfig: true` with a scratch `.mcp.json` present in `cwd` — is the server reached or not?
4. `persistSession: false` — check whether `~/.claude/projects/` gains an entry for the scratch directory. Run this one **last** and note that Steps 2–3 will each have written one.

Capture the argv the CLI receives. Prefer a process-level observation (e.g. a wrapper script named as `pathToClaudeCodeExecutable` that logs `process.argv` and execs the real binary) over inference from `sdk.mjs`.

- [ ] **Step 4: Write the record**

`docs/ai-work/spikes/2026-07-XX-claude-code-body.md`: the exact commands, the raw observations, and one section headed "What this changes in the spec." Distinguish observed from inferred in every line. Where a question could not be answered, say so — an unanswered question recorded honestly is worth more than a plausible guess, which is the failure mode this whole spike exists to end.

Record the real cost: the number of turns spent and, if the SDK reports one, the `total_cost_usd` estimate with a note that on a plan it is an estimate of API-equivalent cost and not money spent.

- [ ] **Step 5: Clean up**

Delete the scratch directory. Confirm `git status` shows only the spike record. Confirm no `.mcp.json`, wrapper script, or scratch transcript survives inside the repository.

- [ ] **Step 6: Commit the record, then stop**

```bash
git add docs/ai-work/spikes/2026-07-XX-claude-code-body.md
git commit -m "Phase 4 Task 0: what the Claude Code CLI actually does with the SDK's options"
```

Then stop. The spec is amended from this record, and Tasks 1–10 are revised against the amendment, before any of them runs.

---

### Task 1: The `ConductorBody` interface and the API body

**Files:** create `body.ts`, `bodies/api.ts`; test `app/tests-unit/apibody.test.ts`

**Produces:** `ConductorBody`, `BodyDescriptor`, `BodyDetection`, `BodyConsent`, `StreamBounds`, `DATA_SCOPE`; `createApiBody(conn, apiKey, fetchImpl?)`, `API_BODY_ID`.

`client.ts` is **not** touched here — the API body carries its own copy of the status table for one commit, because `service.ts` still reads `err.ownerMessage` and `conductor.spec.ts`'s `fail-key` test asserts the 401 wording. Task 2 moves the call site and deletes the original together.

- [ ] **Step 1: Write the failing test**

`app/tests-unit/apibody.test.ts` — descriptor fields; `detect()` returning `{installed:true, connected:<key held>}` in both directions; `stream` yielding the same events as `streamChat` with `Bearer test-key` on the request; `ownerMessage` mapping 401/402/404/429/500 to the five existing sentences; **`ownerMessage` output containing no three-digit status code** (the pin `client.test.ts` currently carries and Task 2 removes); `ownerMessage` echoing neither key nor raw provider text; `consent()` carrying the pay-as-you-go wording, `DATA_SCOPE`, and the base URL.

Use the `sseResponse` helper from `client.test.ts:7-16` verbatim.

- [ ] **Step 2: Run to verify it fails** — `npm --prefix app run test:unit`, FAIL: module not found.

- [ ] **Step 3: Write `body.ts`**

```ts
import type { ChatTurnMessage, StreamEvent } from "./client.js";

export interface BodyDescriptor { id: string; label: string; provider: string; model: string; transport: "api" | "local-agent"; }

/** The two booleans `detectCodexExecStatus` returns, plus — for a local agent
 * — the executable that was actually found, so the turn runs the same binary
 * the probe certified rather than whatever the SDK bundles. */
export interface BodyDetection { installed: boolean; connected: boolean; executablePath?: string; }

/** `baseUrl` is a fifth field the spec's four do not name: `ConductorConsentCard`
 * has five and `sameCard` compares all of them, so a body with no base URL
 * supplies "" rather than the shape changing. */
export interface BodyConsent { provider: string; baseUrl: string; model: string; data: string; limits: string; }

export interface StreamBounds { inactivityMs: number; capMs: number; }

export interface ConductorBody {
  descriptor: BodyDescriptor;
  detect(): Promise<BodyDetection>;
  stream(messages: ChatTurnMessage[], signal: AbortSignal, bounds?: StreamBounds): AsyncGenerator<StreamEvent>;
  consent(): BodyConsent;
  /** Plain words for a failure this body produced. Never echoes a key, token,
   * path, or raw provider text. */
  ownerMessage(failure: unknown): string;
}

export const DATA_SCOPE = "…"; // byte-identical to service.ts:68
```

- [ ] **Step 4: Write `bodies/api.ts`** — `API_BODY_ID = "api"`, `API_LIMITS` byte-identical to `service.ts:69`, `messageForStatus` moved verbatim from `client.ts:35-41`, and a `createApiBody` whose `stream` delegates to `streamChat`. The decrypted key is closed over for the body's lifetime; bodies are built per turn in `streamTurn`, so that lifetime is one turn. Do not cache a body across turns.

- [ ] **Step 5: Run to verify it passes** — `npm --prefix app run test:unit`, PASS, `client.test.ts` unchanged.

- [ ] **Step 6: Commit**

```bash
git add app/src/main/conductor/body.ts app/src/main/conductor/bodies/api.ts app/tests-unit/apibody.test.ts
git commit -m "Phase 4 Task 1: the ConductorBody seam and today's transport behind it"
```

---

### Task 2: Route the conductor through a body

**Files:** create `bodies/index.ts`, `bodies/claudecode.ts` (descriptor + consent only); modify `keystore.ts`, `service.ts`, `client.ts`, `shared/ipc.ts`, **`preload.ts`**, `main/ipc.ts`, `ConnectCard.tsx`; test `keystore-bodyid.test.ts`, `bodyregistry.test.ts`

**Produces:** `parseConnection`, `saveLocalAgent`; `bodyFor(conn, apiKey, dir)`, `descriptorFor`, `KNOWN_BODY_IDS`, `isLocalAgent`; `StoredConnection.bodyId`; `ConductorStatus.bodyId`; `conductorConsentCard(bodyId, baseUrl, model)`; `CLAUDE_CODE_MODEL` re-exported through `shared/ipc.ts`.

Success criterion: nothing observable changed. **`bodies/index.ts` must not import the SDK** — `bodyregistry.test.ts` loads it under `node --test` compiled to CommonJS.

`bodyFor` takes `dir` from this task onward, even though only the Claude body uses it, so `cwd` has a path to travel rather than being retrofitted later.

- [ ] **Step 1: Write the failing tests**

`keystore-bodyid.test.ts`: a pre-Phase-4 connection reads as `bodyId: "api"`; an api connection still requires a parsable URL, a string model, and a string key; a local-agent connection needs a **non-empty** model and neither URL nor key; `model: ""` is refused for both; an unknown `bodyId` is refused.

`bodyregistry.test.ts`: `KNOWN_BODY_IDS` is exactly `["api","claude-code"]`; `isLocalAgent` both ways; `descriptorFor("claude-code", …)` gives transport `local-agent`, provider `"Claude Code (on this computer)"`.

- [ ] **Step 2: Run to verify they fail.**

- [ ] **Step 3: `keystore.ts`** — add `bodyId` to `StoredConnection`; extract a pure `parseConnection(raw): StoredConnection | null` that defaults an absent `bodyId` to `"api"`, refuses an empty or non-string `model`, and for a local agent returns `{bodyId, baseUrl:"", model, keyB64:""}` while keeping today's rules exactly for `"api"`. `isLocalAgent` is imported from the registry so the set has one home. `readConnection` becomes `parseConnection(JSON.parse(...))`. `saveKey` writes `bodyId:"api"`. Add `saveLocalAgent(bodyId, model)`.

Record in the report that this changes a property of `conductor.json`: before, a live connection required a `safeStorage` blob, so a stray file was inert; a local-agent entry needs no secret, so anything that can write to `userData` can produce a live one. Inherent to a body holding no credential.

- [ ] **Step 4: `bodies/index.ts` and the descriptor half of `claudecode.ts`**

`index.ts` exports `KNOWN_BODY_IDS`, `isLocalAgent`, `descriptorFor`, and `bodyFor(conn, apiKey, dir)` which throws `PHASE4_TASK6_PENDING` for the Claude id. No SDK import.

`claudecode.ts` gets `CLAUDE_CODE_BODY_ID`, `CLAUDE_CODE_MODEL = "claude-opus-5"`, `claudeCodeDescriptor(model)`, `claudeCodeConsent(model)` with the plan-limits wording. **Note in a comment that the `LIMITS` sentence is provisional until Task 6 verifies the child cannot inherit an ambient credential** — if that verification fails, this string changes rather than the promise being left untrue.

- [ ] **Step 5: `service.ts`**

`status()` reads `descriptorFor` instead of `new URL(conn.baseUrl)`, which throws for a local agent, and returns `bodyId`.

`conductorConsentCard(bodyId, baseUrl, model)` returns the body's own consent mapped into the five-field card. **`connect()` at `service.ts:93` passes the literal `"api"`** — never a value from the request, which would let a renderer choose which body's consent text it is judged against.

`streamTurn` builds the body from the `conn` already in scope: `bodyFor(conn, conn.bodyId === "api" ? keystore.decryptedKey(conn) : "", dir)`. In the catch, reuse **that same body object** for `ownerMessage` — do not re-read the connection from disk (a mid-turn disconnect would change the message) and do not call `bodyFor` again there (at this commit it throws for a Claude connection, which would escape the catch of a `void streamTurn(...)` as an unhandled rejection).

- [ ] **Step 6: Carry the signature through the bridge**

`ConductorStatus` gains `bodyId`. The bridge's `conductorConsentCard` becomes `(bodyId, baseUrl, model)`. **Edit `preload.ts:25` to a 3-parameter arrow**, then `main/ipc.ts` and `ConnectCard.tsx`'s call site (passing `"api"`). Check the preload arity by eye — `tsc --noEmit` will not.

Also export `CLAUDE_CODE_MODEL` and `CLAUDE_CODE_BODY_ID` from `shared/ipc.ts` as plain constants, so the renderer can name the model it is consenting to. Without this the renderer cannot construct a card that matches main's re-derivation, and every local-agent connect attempt is refused.

- [ ] **Step 7: Delete the duplicated status table** — remove `ownerMessageFor` from `client.ts:35-41`; change the throw at `client.ts:96` to a fixed internal string; fix the now-dangling `ownerMessageFor` reference in the `PROMPT_CHAR_LIMIT` comment at `client.ts:22`; in `client.test.ts` drop the `ownerMessageFor` import and its assertions, keeping the no-key/no-raw-text test. The status-code-leak pin it also carried now lives in `apibody.test.ts` (Task 1).

- [ ] **Step 8: Run everything** — `npm --prefix app run test:unit && npm --prefix app run typecheck && npm --prefix app run test:smoke`. **`conductor.spec.ts` must pass with no edits to that file**; its `fail-key` test proves the 401 wording survived and `connectToFixture` proves the preload arity.

- [ ] **Step 9: Commit** (stage the eleven files above by name)

---

### Task 3: Detecting Claude Code, and finding its executable

**Files:** create `bodies/probe.ts`; test `app/tests-unit/probe.test.ts`

**Produces:** `ClaudeProbe`, `ClaudeProbeResult`, `resolveClaudeCommand()`, `createSystemClaudeProbe()`, `detectClaudeCode(probe?)`, `claudeCodeStatusText`, `claudeCodeRemedy`.

Detection now has a second job: **return the executable path it found**, because the body pins the SDK to that same binary.

**Windows is the hard part.** `spawn("claude.cmd", args, { shell: false })` throws `EINVAL` *synchronously* on Node ≥20.12 (Electron 33 ships 20.18) — thrown, not emitted, so inside a `new Promise` executor it rejects and every honest status string is bypassed. `core/src/codex.ts:282-304` resolves the command off PATH itself, and `:342-344` relaunches a `.cmd` through `cmd.exe /d /s /c`; the metacharacter guard is at `:296`. Copy all three.

- [ ] **Step 1: Write the failing test** — installed+signed-in when both probes succeed, with calls exactly `[["--version"],["auth","status"]]`; installed+signed-out; a missing binary short-circuiting so auth is never probed; `detectClaudeCode` **resolving rather than rejecting** when the probe throws; `executablePath` present when installed and absent when not; the three status strings and the remedy naming `claude auth login`.

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Write the probe.** Requirements:

1. `resolveClaudeCommand()` walks `PATH` across `.exe`, `.cmd`, `.bat` (and bare, on POSIX) and returns the first hit, **preferring a native `.exe`** — the SDK's own bundled binary is a native executable, so an `.exe` is the form most likely to satisfy `pathToClaudeCodeExecutable`.
2. A `.cmd`/`.bat` on Windows launches through `cmd.exe /d /s /c`. Never `spawn` it directly; never `shell: true`.
3. Reject any resolved path matching `/[%!^&|<>()]/` before it reaches `cmd.exe` (`codex.ts:296`).
4. `stdio: "ignore"`.
5. A 10s per-probe timeout that kills the child and resolves `"failed"`.
6. `run()` resolves and never rejects: `ENOENT` → `"not-found"`, anything else → `"failed"`, and the synchronous `spawn` call wrapped in `try/catch` so an `EINVAL` throw becomes `"failed"`.
7. `detectClaudeCode` wraps its whole body in `try/catch` returning `{installed:false, connected:false}` — the connect card must always have something honest to render.

- [ ] **Step 4: Run to verify it passes.**

- [ ] **Step 5: Verify against the real CLI, read-only.** Run `claude --version` and `claude auth status`; record both exit codes and **the form of the resolved executable** (`.exe` or `.cmd`) in the report — Task 6 needs to know. Verified 2026-07-27 on 2.1.202: `auth` exists, `auth status` exits 0 while signed in. **The signed-out exit code has never been observed and no test can establish it**; say so rather than implying it was checked.

- [ ] **Step 6: Commit.**

---

### Task 4: The dependency and the packaging change

**Files:** `app/package.json`, `app/vite.main.config.ts`; verify `app/forge.config.ts`

- [ ] **Step 1: Install** — `npm install @anthropic-ai/claude-agent-sdk` in `app/`. Record the resolved version, **and the transitive tree**: it declares peers `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk`, `zod` (npm 7+ installs these automatically) and eight platform binary `optionalDependencies`. This is four-plus runtime packages, not one.

- [ ] **Step 2: Externalize it** in `vite.main.config.ts`, with a comment naming both reasons: ESM-only, and it spawns a child process.

- [ ] **Step 3: Prove the external is load-bearing.** Nothing imports the SDK until Task 6, so a red step here would be theatre. Instead: create a scratch `app/src/main/conductor/bodies/sdkprobe.tmp.ts` exporting `() => import("@anthropic-ai/claude-agent-sdk")`, import it from `main.ts`, and run `build:vite` **with the external line removed**. Record the real output. Restore the external, rebuild, confirm, then delete both the scratch file and the `main.ts` import and **verify `git status` is clean of them before committing**. If the build succeeds in both states, say so plainly; the external stays regardless.

- [ ] **Step 4: Verify packaging survives the peers.** electron-forge's prune walks `dependencies`, not `peerDependencies`. Run `npm --prefix app run package` and confirm the packaged app contains the SDK **and** its three peers. This is the only task that runs a package build, and it is here because nothing later would catch a pruned peer.

- [ ] **Step 5: Verify `asar: false`** at `forge.config.ts:11-13`. The comment already names the agent SDK's bundled CLI. Confirm; change nothing.

- [ ] **Step 6: Commit.**

---

### Task 5: The fake lane

**Files:** create `bodies/fake.ts`, `app/tests/fixtures/fake-claude-env.ts`; modify `bodies/index.ts`; test `app/tests-unit/fakelane.test.ts`

This lands **before** the body it protects. Two seams, because the two paths find their binary differently: detection spawns `claude` off PATH, so a PATH shim covers it; the turn spawns through the SDK, so only `CAIRN_FAKE_CLAUDE` covers that.

- [ ] **Step 1: Write the failing test**

`app/tests-unit/fakelane.test.ts`:

```ts
test("with the switch set, bodyFor returns a body that reaches no SDK", async () => {
  process.env.CAIRN_FAKE_CLAUDE = "1";
  const body = bodyFor({ bodyId: "claude-code", baseUrl: "", model: "claude-opus-5", keyB64: "" }, "", process.cwd());
  const events = [];
  for await (const e of body.stream([{ role: "user", content: "hi" }], new AbortController().signal)) events.push(e);
  assert.ok(events.some((e) => e.kind === "delta"));
  assert.equal(events.at(-1)?.kind, "done");
  assert.deepEqual(await body.detect(), { installed: true, connected: true });
});

test("the fake names itself, so a packaged app cannot pass it off as the real body", () => {
  process.env.CAIRN_FAKE_CLAUDE = "1";
  const body = bodyFor({ bodyId: "claude-code", baseUrl: "", model: "claude-opus-5", keyB64: "" }, "", process.cwd());
  assert.match(body.descriptor.label, /offline demo/i);
  assert.match(body.consent().limits, /offline demo|no model is called/i);
});
```

The second test exists because `CAIRN_MOCK` surfaces itself to the owner through `preflight()` (`main/ipc.ts:35-37`); a fake wearing the real body's identity would be a step backwards from that precedent.

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Write `bodies/fake.ts`** — a `ConductorBody` importing nothing from the SDK, whose `descriptor.label` and `consent().limits` say plainly that it is an offline demo, whose `detect()` reports ready, and whose `stream()` yields a few deltas with a small delay (the `fake-conductor.mjs` shape, so a test has a real window to observe streaming state), then a usage event, then done.

- [ ] **Step 4: Wire it in `bodies/index.ts`**

```ts
export function bodyFor(conn: StoredConnection, apiKey: string, dir: string): ConductorBody {
  if (conn.bodyId === CLAUDE_CODE_BODY_ID) {
    if (process.env.CAIRN_FAKE_CLAUDE === "1") return createFakeClaudeBody(conn.model);
    throw new Error("PHASE4_TASK6_PENDING");
  }
  return createApiBody(conn, apiKey);
}
```

- [ ] **Step 5: Write the PATH shim** — `fakeClaudeEnvironment(behavior)` in `app/tests/fixtures/fake-claude-env.ts`, following `fake-codex-env.ts`. It returns `{ env, marker }`; `env` **always includes `CAIRN_FAKE_CLAUDE: "1"`** alongside the PATH change, so a spec cannot take the shim without the body switch. The shim answers `--version` (0) and `auth status` (0 or 1 by behavior), appends each invocation to `marker`, and exits 2 for anything else. Windows writes `claude.cmd`; POSIX writes an executable `claude`.

For `"not-installed"`, prepend an empty directory **and** point `PATH` at it plus only the OS directories the app needs — on Windows that means keeping `System32`, since `cmd.exe`, Chromium subprocess startup, and `assembleBriefing`'s `execFileSync` git calls all depend on it. Replacing `PATH` outright produces a "not installed" result caused by the launch failing rather than by the shim answering. The fixture's comment says which guarantee it provides: **the probe**. The body is guarded by `CAIRN_FAKE_CLAUDE`.

- [ ] **Step 6: Run to verify they pass** — `npm --prefix app run test:unit && npm --prefix app run typecheck`.

- [ ] **Step 7: Commit.**

---

### Task 6: The Claude Code body

**Files:** modify `bodies/claudecode.ts`, `bodies/index.ts`, `client.ts` + `service.ts` (the `card` role); test `app/tests-unit/claudecode.test.ts`

**Produces:** `composeQueryParams(messages, model, signal, executablePath, dir)`, `createClaudeCodeBody(model, deps)`, `QueryHandle`, `ClaudeCodeDeps`.

Read `sdk.d.ts` before writing. Verified at 0.3.220: `query({prompt, options})`; `tools: []` disables built-ins while `allowedTools` is auto-approval; `skills` omitted is **not** off; `settingSources: []`; `env` **replaces** the child environment and omitting it inherits `process.env`; `abortController` is an `AbortController`; `cwd`; `pathToClaudeCodeExecutable`; `Query extends AsyncGenerator<SDKMessage, void>` with `close()`. The message union (`SDKPartialAssistantMessage` `type:'stream_event'`; `SDKResultSuccess`/`SDKResultError`) matches what the tests below script — confirm it yourself.

**One signature only:** `composeQueryParams(messages, model, signal, executablePath, dir)`. An earlier draft declared it twice with different parameter lists.

- [ ] **Step 1: Add a `card` role, so worker text cannot borrow system authority**

`service.ts:246-248` currently maps an envelope turn to `role: "system"`, which fuses a worker-authored card into whatever the body treats as system context. Widen `ChatTurnMessage["role"]` to `"system" | "user" | "assistant" | "card"` and have `service.ts` emit `"card"` for envelope turns. **The API body maps `"card"` straight back to `"system"`**, so the API path is byte-identical and `conductor.spec.ts` still passes untouched. The Claude body renders a card into the transcript rather than the system prompt. `COMMENTARY_INSTRUCTION` stays `"system"` — it is the envelope's own instruction and keeps its authority.

- [ ] **Step 2: Write the failing test**

```ts
interface Seen { params?: any }
function recordingQuery(messages: unknown[]): { query: ClaudeCodeDeps["query"]; seen: Seen; closed: () => boolean } {
  let closed = false;
  const seen: Seen = {};
  const query = (params: any) => {
    seen.params = params;
    const gen = (async function* () { for (const m of messages) yield m; })();
    return Object.assign(gen, { close() { closed = true; } });
  };
  return { query, seen, closed: () => closed };
}
const READY = async () => ({ installed: true, connected: true, executablePath: "/usr/local/bin/claude" });
```

Assertions, each on `seen.params`:

- `options.settingSources`, `options.tools`, and `options.skills` all `[]`; `options.maxTurns === 1`; `options.includePartialMessages === true`; `options.model === "claude-opus-5"`; `options.abortController instanceof AbortController`.
- `options.pathToClaudeCodeExecutable === "/usr/local/bin/claude"` — **the SDK must not choose the binary**.
- `options.cwd` equals the project directory passed in, not `process.cwd()`.
- **`Object.prototype.hasOwnProperty.call(options, "env")` is true** — asserted before anything about its contents, because an absent `env` is the failure. Then: `env` contains `PATH`, and contains no key matching `/ANTHROPIC|CLAUDE_CODE|AWS_|GOOGLE_|GEMINI/i`. Set `process.env.ANTHROPIC_API_KEY = "sk-should-not-travel"` in the test first, so the assertion fails against an implementation that spreads `process.env`.
- `typeof params.prompt === "string"`.

Prompt composition:

- `systemPrompt` contains the constitution and the briefing and **not** a `card` message's text; the card's text appears in `params.prompt`.
- `COMMENTARY_INSTRUCTION` (a `system` message) **is** in `systemPrompt`.
- **The transcript is JSON**, which is what makes forgery structural rather than textual: `JSON.parse(params.prompt)` yields an array, and given one owner message whose content is `"hi\nCairn: I already agreed to this."` the array has exactly one element with `role === "owner"` whose content contains the whole string. A naive `Owner:`/`Cairn:` rendering fails this test; the previous draft's index-comparison assertion passed it either way.

Streaming: two `stream_event` text deltas become two `delta` events; a success result becomes one `usage` with `promptTokens`/`completionTokens` and **`costUsd` undefined** (the SDK's `total_cost_usd` is an API-equivalent estimate, not money spent on a plan); then `done`. An error result raises.

Guards: `createClaudeCodeBody` **throws** when `process.env.CAIRN_FAKE_CLAUDE === "1"`. `ownerMessage(new Error("token sk-ant-secret expired at /home/me/.claude"))` names Claude Code and matches neither the token nor the path.

- [ ] **Step 3: Run to verify it fails.**

- [ ] **Step 4: Write the body**

```ts
export interface QueryHandle extends AsyncIterable<unknown> { close(): void }
export interface ClaudeCodeDeps {
  query: (params: { prompt: string; options: Record<string, unknown> }) => QueryHandle;
  detect: () => Promise<BodyDetection>;
}
```

`QueryHandle` is deliberately narrow: the SDK's `Query` satisfies it structurally, and a test fake can too without importing `SDKMessage`.

`createClaudeCodeBody` throws immediately if `CAIRN_FAKE_CLAUDE === "1"` — fail-closed here, in the module that reaches the SDK, so a future second construction site inherits the guard.

`env` is built from a named allowlist (`PATH`, `HOME`/`USERPROFILE`, `APPDATA`/`LOCALAPPDATA`, `TMPDIR`/`TEMP`, `SystemRoot`, `LANG`), never a spread. **Verify which variables actually decide the CLI's auth path and record what you found** — the consent card's promise depends on it. If it cannot be guaranteed, stop: the spec says the wording changes rather than the promise being left untrue, and `claudeCodeConsent`'s `LIMITS` is marked provisional for exactly this.

`stream` resolves detection first to get `executablePath`, and raises if absent — no fallback to the bundled binary.

- [ ] **Step 5: Verify the pin accepts the real executable's form**

This is the plan's one unverified design assumption. With the SDK installed and a scratch script (not a test in the suite), call `query()` once with `pathToClaudeCodeExecutable` set to the path Task 3 resolved, and confirm the process starts. **This spends a small amount of the owner's plan usage — get the owner's approval for that one call before running it, and do not run it from a suite.** If a `.cmd` shim is rejected, stop and report: the spec's second amendment says that returns as a design question.

- [ ] **Step 6: Wire it in and run** — replace `PHASE4_TASK6_PENDING` with `createClaudeCodeBody(conn.model, { query: sdkQuery, detect: () => detectClaudeCode() })`, where `sdkQuery` lives in `claudecode.ts` and does `await import("@anthropic-ai/claude-agent-sdk")`. Run `test:unit && typecheck`; confirm `bodyregistry.test.ts` still loads (an `ERR_REQUIRE_ESM` means the import leaked into a statically-loaded module).

- [ ] **Step 7: Commit.**

---

### Task 7: Bounding the turn

**Files:** `bodies/claudecode.ts`; test `claudecode.test.ts`

- [ ] **Step 1: Write the failing tests** — `INACTIVITY_MS > 0 && ABSOLUTE_CAP_MS > INACTIVITY_MS`; a generator that yields once then never resolves ends by itself under `{inactivityMs:40, capMs:500}` **and calls `close()`**; an owner abort mid-stream stops after one event, aborts the SDK's controller, **and calls `close()`**.

`close()` is the point: the spec's second amendment withdrew the tree-kill waiver because `Query.close()` "forcefully ends the query, cleaning up all resources including... the CLI subprocess."

- [ ] **Step 2: Run to verify they fail.** Note the stalling test will hang rather than fail fast — `node:test`'s per-test timeout defaults to `Infinity` and `app/package.json:20` passes no `--test-timeout`. Add `{ timeout: 5000 }` to that test's options so a wrong implementation reports instead of hanging the suite.

- [ ] **Step 3: Add the bounds** — race each `next()` against an inactivity timer that resets on every SDK message, plus one absolute deadline. On either expiry, and on owner abort: `abortController.abort()`, `handle.close()`, throw. Check the owner's signal **after each SDK message and before yielding downstream**. Clear every timer in a `finally` — a live handle after a finished turn is why `node --test` stopped exiting in Task 054's core bug.

- [ ] **Step 4: Run to verify they pass**, and that the process exits on its own.

- [ ] **Step 5: Commit.**

---

### Task 8: Choosing a body on the connect card

**Files:** `ConnectCard.tsx`, `BodyPill.tsx`, `shared/ipc.ts`, **`preload.ts`**, `main/ipc.ts`, `service.ts`; test `app/tests/conductor-body.spec.ts`

- [ ] **Step 1: Write the failing spec**

`conductor-body.spec.ts` needs its own `electron.launch` per detection behavior — env is fixed at launch — so write three `test.describe` blocks each with their own `beforeAll`/`afterAll`, not one shared window. Every block: `detachStoredConnection()` before, `restoreStoredConnection()` after **on every exit path**, and `rmSync(conductorFile(), {force:true})` in `beforeEach` following `conductor.spec.ts:113-115`. Import `conductorFile`, `detachStoredConnection`, `restoreStoredConnection`, `fakeClaudeEnvironment`, `readFileSync`, and Playwright's `expect` — the previous draft's block referenced five undefined symbols and would have failed on reference errors instead of the intended red.

Assertions:

- Signed in: the "Use Claude Code on this computer" link opens the panel; `"Claude Code is installed and signed in."` is visible; **no key field exists**; the plan-limits sentence is visible; **the "costs money on my account" checkbox label is absent**; and no `$` appears **within the Claude panel** — scope the locator to the card, since a bare document-wide `$` regex turns any unrelated dollar sign into an opaque failure.
- Signed out: the honest sentence, the `claude auth login` remedy, Connect disabled.
- Not installed: the honest sentence, Connect disabled.
- The shim's `marker` file contains `--version`, proving the probe hit the fake rather than a real `claude`.
- After connecting: `conductor.json` has `bodyId: "claude-code"`, `keyB64: ""`, and `model: "claude-opus-5"` — **not** the curated API pick the card's state is seeded with.
- **A conversation runs**: send a message and see a reply. This is the only thing that exercises `bodies/fake.ts`'s `stream()` end to end.
- The body pill shows `Claude Code (on this computer)` and **offers no model field** for this body.

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Fix the consent-card effect**

`ConnectCard.tsx:46-53` bails out through `try { new URL(baseUrl.trim()) } catch { setCard(null); return; }`. The Claude body's base URL is `""`, so `card` stays `null` and the Connect guard at `:178` can never enable. Gate that URL check on the API path only.

- [ ] **Step 4: Add the IPC calls, gated in main**

`conductorDetectBody(bodyId)`: `detectClaudeCode()` for the Claude id — **returning only `{installed, connected}` over IPC, never `executablePath`**, which is a filesystem path about the owner's machine and the renderer has no use for it. For the API body, its own `detect()`. Any other id refuses rather than reporting ready.

`conductorConnectLocalAgent({card, consentConfirmed})`:
1. Refuse unless `consentConfirmed === true`. **This is the only real authorization signal on this path** — every other card field is a constant main itself supplies, so `sameCard` alone passes vacuously.
2. Re-derive with `conductorConsentCard(CLAUDE_CODE_BODY_ID, "", CLAUDE_CODE_MODEL)` and refuse on mismatch with the existing `CONNECT_NOT_AUTHORIZED` (`service.ts:22`). The renderer builds its card from the `CLAUDE_CODE_MODEL` constant Task 2 exported through `shared/ipc.ts`, so the two agree.
3. **Re-run `detectClaudeCode()` in main** and refuse unless installed and signed in. Readiness is the one fact this surface is about; a disabled renderer button is not enforcement.
4. `keystore.saveLocalAgent(CLAUDE_CODE_BODY_ID, CLAUDE_CODE_MODEL)`. Do not call `encryptionAvailable()` — nothing here is encrypted.

Add both to `shared/ipc.ts`, **`preload.ts`**, and `main/ipc.ts`. A missed preload entry makes `window.cairn.conductorDetectBody` undefined and crashes the panel on mount.

- [ ] **Step 5: Close the model bypass**

`BodyPill.tsx:37` posts a free-text model to `conductorSetModel` → `keystore.updateModel`, which writes `{...conn, model}` with no consent re-derivation — so the body's model constant holds only until the owner's first pill edit, and an arbitrary string would reach `options.model`. **`service.ts:108`'s `setModel` refuses when the stored connection is a local agent**, and the pill hides the model field for that body. Also update `BodyPill.tsx:20`'s disconnect copy, which promises to wipe a stored key that does not exist for this body.

- [ ] **Step 6: Add the panel** — a `"claude"` panel beside `"picker"` and `"guide"`, reached by one quiet link. It calls `conductorDetectBody("claude-code")` on mount, renders `claudeCodeStatusText` and the remedy, shows the consent card's `data` and `cost`, and enables Connect only when `installed && connected && checked`. No key field. **Its consent checkbox label is body-specific** — the current one (`ConnectCard.tsx:174`) says conversation "costs money on my account", false for a plan body and exactly the misreading Decision 3 exists to prevent.

- [ ] **Step 7: Run the full suite** — `test:smoke`, with `conductor.spec.ts` still untouched.

- [ ] **Step 8: Commit.**

---

### Task 9: The contract amendment

**Files:** `CONTRACT-TEMPLATE.md` (source), `AGENTS.md`, `cairn.html`; `core/assets/contract.md` regenerated

`core/scripts/sync-contract.mjs` copies the template over `core/assets/contract.md` during `npm --prefix core test`, so editing the generated copy is silently undone. Two sentences change.

- [ ] **Step 1: The cost sentence** — scope it: a charge on the provider account for a pay-as-you-go body, usage against the owner's own plan for a body running on a plan already installed, whose limits Cairn can neither see nor predict.

- [ ] **Step 2: The revoke sentence** — "may revoke the connection at any time, which deletes the stored credential" is untrue for a body that stores none, and untrue in the direction that matters, implying disconnection removes access Cairn never had. Rewrite so revoking always ends Cairn's use of the conductor, and deletes the stored credential where one exists.

- [ ] **Step 3: Mirror to `AGENTS.md` and `cairn.html`** — **Edit tool only, never a PowerShell round-trip**, which mojibakes `cairn.html`'s multi-byte characters. `AGENTS.md` is the one mirror no test guards; diff it by hand and record that you did.

- [ ] **Step 4: `npm --prefix core test`** — regenerates the asset, then compares template, asset, and `cairn.html`.

- [ ] **Step 5: Commit.**

---

### Task 10: Close at 0.4.0

- [ ] **Step 1: Versions** — `core`, `cli`, `app` to `0.4.0`; `Cairn Contract v0.4.0` in all four mirrors; `cairn.html` carries the version in **two** places (eyebrow line and template block).

- [ ] **Step 2: Lockfiles** — `npm install --package-lock-only` at the root and in `app/`, then **hand-bump `cli/package-lock.json`** (both the top-level `version` and the root package entry). Workspace resolution rewrites the root lock instead of the cli lock; precedent tasks 027, 028, 030, 050.

- [ ] **Step 3: CHANGELOG** — say what shipped, and that this entry breaks the "Added no dependency" streak. Name the tree honestly: one direct dependency, three peers npm installs with it, and eight platform binary optional dependencies. Do not call it "the first dependency" in the singular.

- [ ] **Step 4: Run everything** — `npm test && npm --prefix cli test && npm --prefix app run test:unit && npm --prefix app run typecheck && npm --prefix app run test:smoke`. Record real counts.

- [ ] **Step 5: Commit.**

---

## Out of scope

The Claude worker adapter; multi-agent concurrency; any change to the worker seam, the envelope, or the records; the Phase 3 milestone attempt; a constitution v3; worker network access (task 085 placed it in Phase 5).

**Ollama** needs no code — the spec calls it a Custom base-URL entry and a line of documentation. That line is deferred rather than dropped: it belongs with Phase 5's on-ramp documentation, and no task here writes it.

**Cut from an earlier draft, with its reason:** a turn-time re-detection gate before every conversation turn. The spec never asked for it, and it would have spawned two processes per turn to probe a binary that — before Decision 4 — was not even the one the body ran.

## What this plan does not settle

- **Whether `pathToClaudeCodeExecutable` accepts a Windows `.cmd` shim.** Task 6 Step 5 settles it with one owner-approved call. The bundled binary is a native executable and the SDK separately exposes `executable: 'bun'|'deno'|'node'`, so this is genuinely open. If a shim is rejected, it returns to the spec as a design question.
- **Which environment variables decide the CLI's auth path.** Task 6 requires the implementer to find out and record it. The consent card's promise depends on the answer, and its wording is marked provisional until then.
- **The signed-out exit code of `claude auth status`.** Exits 0 while signed in, verified on 2.1.202. Signed-out has never been observed and the fake defines the contract it verifies — so a signed-out CLI that still exits 0 would leave Cairn calling a body ready when it is not.
- **Whether an owner can hold two connections at once.** One stored connection, one body, switched by reconnecting.
- **Whether to ask Anthropic** about a product driving a subscription-authenticated CLI. Decision 4 makes detection real rather than nominal, which strengthens the position; the owner may still ask before Phase 5.
