# Cairn Level 3 — Kimi Code CLI body and worker adapter — Design

Date: 2026-07-28
Status: proposed, awaiting owner approval
Scope: design only. This document changes no behavior. If approved, it
governs the Level 3 implementation plan and its serial recorded tasks.

## Where this comes from

The Task 098 scoping conversation settled Kimi support in levels. Level 2 —
the curated "Kimi — your subscription" entry on the existing API transport —
is built and verified (Task 098). What remains is Level 3, recorded there as
future work in two parts:

- **The Kimi Code CLI body**: detect a locally installed, owner-signed-in
  Kimi Code CLI and offer it as the conductor's brain — the Kimi counterpart
  of the Claude Code body the Phase 4 spec
  (`2026-07-26-cairn-phase4-second-body-design.md`) designed.
- **The Kimi worker adapter**: the same CLI running one envelope-governed
  serial task, beside the existing Codex Exec adapter — the second real
  occupant of the Phase 2 worker seam.

Two facts from the current tree shape everything below:

1. **The conductor body seam does not exist yet.** Phase 4 is designed and
   planned, not implemented: `app/src/main/conductor/` still holds the single
   HTTP client, and there is no `ConductorBody` interface in code. The Kimi
   body is designed here against the approved Phase 4 interface, and its
   implementation cannot precede the seam's.
2. **The worker seam is real, and a second real adapter is a supported
   shape.** `core/src/routing.ts` defines the one execution seam
   (`TaskAdapter` → `worker-result/v1`), `routeTask` already sorts multiple
   connected adapters and accepts an owner override, and
   `app/src/main/tasks.ts` already takes the disclosure from the *routed*
   adapter's own seam rather than a codex-only branch. The Codex Exec
   adapter (`core/src/codex.ts`) is the proven inhabitant: output-free
   probes, authorization re-derived from the exact bytes the owner
   confirmed, watchdogged process with tree kill, redacted local debug
   copies, and one universal result translation.

## Facts verified today (2026-07-28)

From Kimi's own documentation and repository, retrieved today. Where a claim
comes from a third party instead, it is marked unverified and deferred to the
spike.

- **The product and the install.** Kimi Code CLI is TypeScript on
  Node.js ≥ 22.19, distributed by an install script (the `kimi` executable
  lands in `~/.kimi-code/bin/`, which the script adds to PATH) or by npm
  global install. Local data — configuration (`config.toml`), session
  records, logs, update caches — lives under `~/.kimi-code/`, movable with
  `KIMI_CODE_HOME`. On Windows the CLI requires Git for Windows and uses its
  Git Bash as the shell (`KIMI_SHELL_PATH` overrides the lookup).
  [Source: Kimi Help Center, "Install Kimi Code CLI and Quick Start Guide"]
- **Sign-in.** `/login` inside the interactive UI offers two routes: Kimi
  Code OAuth (a device/verification-code flow tied to the membership) or an
  API key (Kimi Code console, or the separate pay-as-you-go Kimi Open
  Platform — the two account systems' keys are not interchangeable).
  Credentials are stored locally under `~/.kimi-code/`; `/logout` clears
  them. Device authorizations idle 30 days expire. **The same CLI can
  therefore be signed into a flat-quota membership or a metered API key, and
  Cairn cannot tell which from outside** — this decides the consent wording
  below. [Source: same, plus "Kimi Code Membership Benefits Guide"]
- **Headless execution.** `kimi -p "<prompt>"` runs one prompt without the
  TUI; `--output-format stream-json` emits one JSON object per line on
  stdout — Assistant messages, tool-call messages, Tool results — while
  thinking, tool progress, and resume notices go to stderr. In `-p` mode no
  approval is requested: tool calls run under the `auto` permission policy
  with static deny rules still in effect. `--prompt` rejects combination
  with `--yolo`, `--auto`, or `--plan`. Model selection is `-m`.
  [Source: Kimi Code Docs, "kimi Command" reference]
- **Print-mode streaming is whole-message.** Each assistant turn is buffered
  into one JSONL line after the turn completes; there are no incremental
  text deltas in print mode. [Source: MoonshotAI/kimi-cli issue #2179,
  confirmed against the docs' "stream-json" description]
- **Print mode can linger by design.** Since 0.24.2, `kimi -p` stays alive
  while background tasks or subagents are pending, with no default wait or
  turn limit (`print_background_mode` restores exit-after-one-turn), and
  prompt-mode background tasks and subagents have no default timeout.
  [Source: Kimi Code Docs, Changelog 0.24.2]
- **ACP is the streaming seam.** `kimi acp` speaks Agent Client Protocol —
  JSON-RPC over stdio — and implements the stable agent surface an embedder
  needs: `initialize`, `authenticate` (returns the `authRequired (-32000)`
  error when no token is present), `session/new` (accepts `cwd` and
  client-supplied `mcpServers`), `session/prompt` (streams
  `agent_message_chunk` via `session/update`), `session/cancel`,
  `session/set_config_option` (model / thinking / mode picker). Reverse-RPC
  file reads and writes (`fs/read_text_file`, `fs/write_text_file`) are
  routed *to the client* — the embedder answers them. Terminal reverse-RPC
  is not connected: **shell commands the agent runs execute locally and are
  not routed through the client.**
  [Source: Kimi Code Docs, "Wire 协议 / `kimi acp` Subcommand" capability
  matrix]
- **Membership limits are plan-shaped, not dollar-shaped.** Roughly
  300–1,200 requests per 5-hour window depending on plan, up to 30
  concurrent streams; model ids `kimi-for-coding` (Standard) and
  `kimi-for-coding-highspeed` are stable aliases. Quota visibility (`/usage`)
  exists only inside the interactive UI. [Source: "Kimi Code Membership
  Benefits Guide"]
- **This machine.** No Kimi Code CLI is installed here: `where kimi` finds
  nothing and `~/.kimi-code/` contains only a stray `bin/rg.exe` (checked
  again today, unchanged from Task 098). Kimi Desktop's own runtime carries
  a bundled `kimi-code` copy under `%APPDATA%\kimi-desktop\...`; it is not
  on PATH and is **not** a detection target — that copy belongs to another
  product and its sign-in is that product's, not the owner's independent
  install.

## Decisions

### Decision 1 — Level 3 lands in two independent halves: 3a the worker adapter, 3b the body

The worker adapter needs nothing that does not exist today: the Phase 2 seam
is shipped, the app's dispatch and disclosure flow is already
adapter-general, and `kimi -p --output-format stream-json` is a documented,
parseable headless transport. The body needs the Phase 4 seam, which is not
implemented, and it has one open hazard (tool suppression, Decision 5) that
documentation does not settle. Sequencing them independently lets the worker
adapter land on its own evidence without holding it hostage to the body
questions — and without bundling two risky things into one phase, the
mistake the Phase 4 sequencing explicitly avoided. Rejected: body first (it
is the less ready half), and one combined phase (couples a settled transport
to an unsettled one).

### Decision 2 — The worker adapter spawns `kimi -p` over stdin, mirroring the Codex adapter's shape

One ephemeral `kimi` process per confirmed task: prompt on stdin (Codex
reads its prompt from stdin; passing a multi-kilobyte briefing as an argv
element on Windows invites command-line length and quoting failure classes
the project has already paid for once — spike verifies `kimi -p` accepts a
piped prompt, as its transcript-style examples and Unix-tool shape suggest),
`--output-format stream-json` for the parse, `-m kimi-for-coding` pinned so
the disclosure's named model is the model that runs rather than whatever
`/model` the owner last chose interactively. No session continuation flags:
one call, no resume, exactly the quota sentence the Codex adapter makes.

The adapter translates the JSONL into the universal `worker-result/v1` at
its own edge: `completed` iff exit 0 and a terminal assistant message was
seen; the final assistant message text becomes `claimsText` (the claims
fence lives in the prompt, unchanged); the numeric evidence map carries
what the stream actually offers — message, tool-call, and failed-tool
counts — with token fields only if the spike finds usage records in the
stream (the docs do not show them; the evidence map is adapter-chosen, so
their absence is honest, not a gap). Malformed lines and oversized lines
follow the codex parser's rules: a dropped or unparseable line nulls the
final message so a partial view can never masquerade as final.

### Decision 3 — Detection stays output-free, and "connected" comes from ACP's `authRequired`, never from reading `~/.kimi-code/`

Installed: `kimi --version`, resolved in the `resolvePathCodexCommand`
idiom — absolute PATH entries only, workspace-contained binaries refused,
`.cmd` shim handling on Windows, exit status only, five-second cap. The
`~/.kimi-code/bin/` install location is a *fallback probe directory* when
PATH resolution fails (the install script's PATH edit does not reach
already-running processes), never a replacement.

Connected: spawn `kimi acp`, send `initialize` then `authenticate` with
`method_id: "login"`, read the JSON-RPC response code: success means a
usable token, `-32000 authRequired` means signed out, process failure means
unknown. The probe reads the protocol's own status codes, never file
contents, account details, or tokens — the same two-boolean,
most-a-probe-may-know shape as `detectCodexExecStatus`, and the same refusal
the Phase 4 spec made to read auth-status *text*. Rejected: inspecting
`~/.kimi-code/` for credential files (that is exactly the credential
inspection the contract forbids), and launching an interactive `kimi` to
observe behavior (a TUI is not a probe). Spike verifies the probe's timing
and exact behavior on a signed-in and a signed-out machine.

### Decision 4 — The disclosure tells the billing truth Detection 3 can actually know

The Codex quota sentence says "connected-account pricing, credits, and
limits apply; Cairn cannot promise a dollar cap." The Kimi worker's quota
sentence says the Kimi version of the same truth: the task runs on the Kimi
account this computer's Kimi Code CLI is signed into — membership quota or
metered key, whichever the owner configured — and Cairn cannot see which,
cannot see the remaining quota, and runs exactly one ephemeral process with
no retry or resume. Rejected: promising "your membership" (the CLI may be
on a metered key — the consent would be false on exactly the machines where
it matters, the lesson of Phase 4's env amendment: a consent sentence Cairn
cannot keep is worse than a vaguer one it can), and probing config files to
distinguish (Decision 3). If the spike finds an output-free way to
distinguish membership OAuth from API-key auth, the sentence sharpens in
implementation; the design commits only to the honest floor.

### Decision 5 — The body uses ACP, refuses every tool request fail-closed, and treats shell execution as the open hazard

The body is designed against the approved Phase 4 `ConductorBody` interface
(descriptor / detect / stream / consent / ownerMessage) and adds nothing to
it. Transport: `kimi acp`, not print mode — `agent_message_chunk` preserves
the conductor's typing-as-it-thinks behavior, `session/cancel` is a real
cancel channel, and print mode's whole-message buffering would reduce the
conductor to a pause and a wall of text (the Phase 4 spec made the same call
for partial messages).

Tool isolation is the design's load-bearing question, and its current answer
is asymmetric:

- **File tools are containable.** ACP routes `fs/read_text_file` and
  `fs/write_text_file` to the client. Cairn answers every such request with
  a refusal, so the conductor cannot read or write through that channel.
  The refusal is fail-closed: an unrecognized reverse-RPC method gets the
  same treatment.
- **Shell is not routed.** Kimi's ACP layer does not connect terminal
  reverse-RPC; shell commands run locally, invisible to the client. The
  conductor has never had tools and must not acquire them by inheritance —
  so the body must suppress shell at the CLI side, and today's docs name no
  switch that does. Plan mode is not the answer (it *prioritizes* read-only
  tools; its Bash handling falls under allow rules), and `--plan` rejects
  combination with `-p` but its interaction with ACP sessions is
  undocumented.

The spike therefore settles, before any body task is written: whether an
ACP session can be driven to a no-shell configuration (`session/set_mode`,
`set_config_option`, a `config.toml` permission section under a redirected
`KIMI_CODE_HOME`, or static deny rules), and what the observable behavior is
when the model attempts Bash under it. **If no configuration suppresses
shell, the body does not ship in this level**; the level closes with the
worker adapter and a recorded reason, which is a designed outcome, not a
failure. Redirecting `KIMI_CODE_HOME` to a Cairn-authored minimal config is
attractive for isolation but carries the Decision 3 problem in reverse:
credentials live under `~/.kimi-code/`, so a redirected home is a signed-out
home unless the CLI separates credential storage from config — another spike
question, stated here rather than discovered in code.

The body supplies its own model constant (`kimi-for-coding`), composes the
child's environment as an allowlist rather than inheriting the app's ambient
variables (the Phase 4 env lesson applies verbatim: a Kimi CLI can also be
pointed at other providers by environment or config, and the consent
sentence must be *made* true), holds the ACP session handle and cancels it
on owner cancel, inactivity, and the absolute cap, and pins `cwd`
deliberately. The consent and contract wording follow the Phase 4 pattern:
the data-scope sentence unchanged and still true; the cost sentence
body-supplied with the Decision 4 floor; and the same two-sentence contract
amendment Phase 4 identified (the "revoke deletes the stored credential"
sentence is false for a body that stores none) — moved across all four
mirrors in the implementation task, not here.

### Decision 6 — Routing keeps Codex as the default; the owner picks Kimi explicitly

`routeTask` sorts by priority and accepts an override, and the app already
surfaces candidates. The Kimi adapter registers with priority below Codex
Exec's 100, so a machine with both keeps today's default and its every
existing string and test, while the route surface offers Kimi as a named
candidate the owner can choose per dispatch. Rejected: priority above Codex
(changes the default for every existing user of the current flow), and an
owner-level settings toggle (a second mechanism where the existing override
already works; can be revisited when a third adapter makes per-dispatch
choice tedious).

## The worker adapter, concretely (3a)

New `core/src/kimi.ts`, shaped on `core/src/codex.ts` and sharing nothing by
accident: the probe interface, the process-runner interface (`kind:
"system" | "fake"`), the authorization re-derivation against the exact
disclosure bytes, the boundary error, the timeout/cancelled/process
`WorkerProcessError` specializations, the inactivity + absolute watchdogs
with tree kill (taskkill `/T` on Windows — the shim-chain lesson is
identical, and a piped-prompt `kimi` spawns the same way), the force-settle
fallback, the redacted debug copies outside every project, and the
workspace-identity containment on command resolution. Kimi-specifics:
`KIMI_SHELL_PATH` passes through the child environment on Windows;
`KIMI_CODE_HOME` is **not** redirected for the worker (the owner signed in
under the default home; the worker inherits the owner's CLI config, which
the disclosure's data sentence will name, and the spike lists which config
knobs — MCP servers, skills dirs, subagents — can reach a run so the
sentence stays true); `--skills-dir` is not passed (replacing skill
discovery silently would make runs differ from the owner's own `kimi`
invocations in a way nobody was told about; the honest move is naming the
inheritance, not secretly pruning it — revisited if the spike shows skills
materially misdirecting workers).

The worker prompt is the codex `taskPrompt` with the codex-specific
`apply_patch` line removed and two lines sharpened for this CLI: subagents
and background tasks are forbidden (the CLI has both, and one serial call
means one), matching the existing "work serially, do not delegate" rule in
words the model cannot read as negotiable. Print mode's stay-alive behavior
(0.24.2) makes the absolute cap load-bearing, not decorative: a worker that
keeps a background task pending is ended by the watchdog and closed as
`ADAPTER_TIMED_OUT`, with the debug copy showing why.

App wiring is the seam's own: `detectedAdapters` in `app/src/main/tasks.ts`
gains the Kimi probe alongside the Codex one, each adapter constructed only
when its detection says connected, the route preview and run gates
unchanged. The ModelRoute surface needs no new mechanism — candidates and
override exist.

## The body, concretely (3b, gated)

App-side only (`app/src/main/conductor/`), behind the Phase 4 seam: an ACP
client in the main process holding one `kimi acp` child per conversation,
`session/new` per project with `cwd` pinned, `session/prompt` per turn with
the constitution as the system layer (spike: how ACP sessions carry
system-level instruction — `session/new` config or prompt convention; the
docs do not say), chunks mapped to the existing `StreamEvent` union,
`session/cancel` on abort, the same persistence and task-block parse in
`service.ts` untouched. Detection is Decision 3's probe shared with the
worker. Selection joins the connect surface as a detected seat with no key
field, beside the API seats, with the body indicator naming it. Everything
above Decision 5's hazard line is conditional on the spike finding a
no-shell configuration.

## Testing

Every change red-first, through the repo's own workflow, and **no suite may
invoke the real Kimi CLI** — the Phase 4 hazard, restated: a real
invocation spends the owner's membership quota or metered key and can
recurse into a signed-in agent.

- **Two fake seams, like the CLI's two transports.** A fake `kimi` on PATH
  (the fake-codex fixture idiom) covers detection and the worker's print
  mode; an in-process fake ACP peer (JSON-RPC over the child's stdio)
  covers the body. The fake-lane guard follows the Phase 4 third amendment
  exactly: keyed on a positive test marker, fail-closed in the module that
  reaches the real binary, with a test that fails when the guard is
  removed.
- **Worker:** injected-probe detection tests in the `FakeProbe` idiom (both
  directions plus signed-out), JSONL→`worker-result/v1` mapping tests
  (clean finish, tool-call sequence, malformed line, oversized line,
  non-zero exit, missing terminal message), disclosure byte-pins, and the
  authorization re-derivation refusing a mismatched card — the codex test
  suite's own structure, renamed.
- **Body (3b only):** chunk→`StreamEvent` mapping, cancel, fs-refusal
  fail-closed (a test drives a fake `fs/read_text_file` request and asserts
  the refusal), env allowlist presence asserted before contents (the Phase
  4 lesson), and the no-shell configuration pinned *at the ACP wire* — what
  the session was actually told — not at a helper's return value.
- **Existing suites as pins:** the Codex E2E and unit suites pass
  unmodified with the second adapter registered (proving priority and
  override change nothing by default), and the connect-kimi API-seat spec
  passes unmodified (Level 2 is untouched).

## The spike comes first, and it is the owner's to authorize

No implementation task may be written against an inference (the Phase 4
third amendment's rule, adopted whole). The spike needs a machine with the
Kimi Code CLI installed and signed in — this machine has neither, and
installing the CLI and signing in are the owner's actions at a concrete
risk boundary (installing software; an OAuth sign-in). The spike itself
makes real calls on the owner's membership quota, so it is authorized
outside the agent loop, stops, hands back, and waits. Its recorded
findings amend this spec before dependent tasks are written:

1. Does `kimi -p` accept a piped stdin prompt? Exact argv and Windows
   `.cmd`/shim spawn behavior (the install lands `kimi` — which form?).
2. The full stream-json schema: event shapes, whether usage/token records
   exist, how the terminal state is marked, retry notices (0.23.5 surfaces
   them), and exit codes for success / provider failure / auth failure.
3. The ACP auth probe: real behavior of `initialize` + `authenticate`
   signed-in vs signed-out, startup cost, and whether probing disturbs the
   session store.
4. Credential storage: is it separable from config (does a redirected
   `KIMI_CODE_HOME` lose sign-in)? Which config knobs reach a headless run
   (MCP servers, skills, subagents) so the worker's data sentence can be
   made true?
5. The body's hazard: can an ACP session be driven to no-shell
   (`set_mode`/`set_config_option`/config permissions/static deny), and
   what is observed when the model attempts Bash under it? Does
   `session/cancel` stop a running tool? How does the constitution ride the
   session?
6. Does the CLI distinguish membership OAuth from API-key sign-in in any
   output-free way (version output, ACP agentInfo, error codes)?

## Sequencing

Spike → 3a worker adapter (core adapter + app wiring + fakes + tests) →
[Phase 4 seam, whenever it lands] → 3b body (if the spike clears the shell
hazard). 3a and the Phase 4 seam are independent and may interleave; 3b
depends on both.

## Out of scope

- Level 2 (the API subscription seat) is shipped and unchanged; so is the
  OpenRouter path.
- Kimi Desktop's bundled `kimi-code` runtime is not a detection target,
  now or later, without an explicit owner decision.
- The experimental Rust `kimi-agent` wire server is rejected at design
  time, not deferred: it has no Kimi account login (API keys only), so it
  cannot carry the membership truth this level exists to serve.
- `kimi server` / `kimi web` modes, session resume, subagents as a Cairn
  feature, multi-agent concurrency (Phase 7), and any change to the worker
  seam, the envelope, or the records.
- No contract amendment in this design task. The two-sentence amendment
  (cost basis; revoke semantics) lands with the body implementation, if it
  ships, across all four mirrors with AGENTS.md hand-updated and
  diff-verified as always.

## Open questions for the owner

1. Approve this design as the Level 3 route — including Decision 5's
   willingness to close the level with only the worker adapter if the shell
   hazard has no answer?
2. Authorize the spike's prerequisites: installing Kimi Code CLI on this
   machine and signing it into the owner's membership, then a bounded spike
   that spends real quota? (Each is its own approval at the moment of
   action, per the contract; this question only asks whether the route
   should reach those moments.)
3. Decision 6 keeps Codex as the default worker when both are connected.
   If the owner would rather be asked per dispatch, or prefers Kimi as the
   default, that is a one-line change in the implementation plan.
