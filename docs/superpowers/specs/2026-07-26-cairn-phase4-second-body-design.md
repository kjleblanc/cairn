# Cairn Phase 4 — The Second Body — Design

Date: 2026-07-26
Status: approved by owner (design session)
Scope: design only. This document changes no behavior. It governs the Phase 4
implementation plan and its serial recorded tasks.

## Where this comes from

The route spec (`2026-07-23-cairn-conductor-route-design.md`) scoped Phase 4 as
"second worker, second body": a Claude worker adapter over a subscription
transport, plus a local Ollama body. A phase boundary is a re-plan moment, and
this session's re-plan changed the shape substantially. Four findings:

- **The owner's constraint is the conductor, not the worker.** The Codex
  worker already runs on a ChatGPT subscription and is not the bottleneck.
  The conductor is the surface that costs money per turn, and the owner
  wants a stronger model in that seat.
- **The conductor slot is not a seam.** Phase 2 did that surgery for
  workers — one universal result shape, adapters translating at their own
  edge, validation in the envelope. The conductor is still a single HTTP
  client with `Bearer` in it (`app/src/main/conductor/client.ts:86`), and
  `ownerMessageFor(status)` maps HTTP status codes that a non-HTTP
  transport does not have.
- **`streamChat` is closer to a seam than it looks.** It already yields a
  transport-neutral `StreamEvent` union (`delta` / `usage` / `done`), so a
  second body must produce that same shape rather than force a rewrite of
  the conductor service.
- **The premise that blocked this work was false.** The owner believed a
  subscription body was a prerequisite for putting Opus 5 in the seat.
  OpenRouter carries `anthropic/claude-opus-5` at first-party pricing
  ($5/$25 per million tokens), and the owner already holds an OpenRouter
  key. Opus 5 is reachable today through the Custom field with no code at
  all — so this phase is an improvement, not an unblocking.

## Decisions

Owner-approved in this session:

1. **Build a general body seam, with the Claude Code body as its first
   non-HTTP occupant.** Rejected: a conductor-body-only change that special
   cases one transport (the Phase 2 worker seam is the precedent that doing
   it properly pays off), and bundling the Claude worker adapter into the
   same phase (see Out of scope).
2. **Detection, not a connect flow.** Cairn detects that Claude Code is
   installed and signed in, exactly as it detects Codex; it presents no
   credential field, stores no token, and never inspects or operates the
   login. Beyond being less code, this keeps Cairn on the right side of a
   real distinction: a product that *offers* an account login as its own
   auth method is doing something different from a local tool that notices
   a CLI the owner independently installed and signed into. The Agent SDK's
   documentation asks third-party products not to offer claude.ai login
   without prior approval; detection is not an offer, and the owner may
   still choose to ask Anthropic before Phase 5 puts Cairn in front of
   people who are not the owner.
3. **Name the real limit, not a dollar figure.** For the Claude Code body,
   the consent surface says conversation runs on the Claude plan already
   installed, and that the real constraint is that plan's own usage limits,
   which Cairn cannot see or predict. The SDK does report a
   `total_cost_usd`, but it is a client-side *estimate of API-equivalent
   cost*, not a charge — showing it would invite a beginner to read a
   dollar figure as money being spent, which would be false. Rejected:
   showing the estimate with a disclaimer, and saying nothing about cost at
   all.

## Chunk 1 — The body seam

Core defines nothing here; this is app-side, in `app/src/main/conductor/`.

A `ConductorBody` value carries:

- `descriptor`: `{ id, label, provider, model, transport }` where
  `transport` is `"api"` or `"local-agent"`. The id is what settings
  persist and what the body indicator names.
- `detect(): Promise<{ installed: boolean; connected: boolean }>` — the
  same two-boolean shape `detectCodexExecStatus` returns, and for the same
  reason: it is the most a readiness probe may know without inspecting a
  credential. The API body reports `installed: true` always and `connected`
  from whether a key is stored.
- `stream(messages, signal): AsyncGenerator<StreamEvent>` — the **existing**
  `StreamEvent` union, unchanged. Every body translates its own transport
  into it at its own edge.
- `consent(): { provider, model, data, limits }` — the facts the connect
  card renders. `limits` replaces today's hardcoded cost sentence, so each
  body states its own truth rather than the card assuming one.
- `ownerMessage(failure): string` — each body maps its own failures to
  plain words. `ownerMessageFor(status)`'s HTTP-code table moves inside the
  API body, where it is true.

Transport-neutral pieces stay where they are: `PROMPT_CHAR_LIMIT` and
`promptTooLarge` are about the conversation's size, not its carrier, and
`streamTurn` in `service.ts` keeps owning persistence, the task-block parse,
and the abort path.

The API body is today's `streamChat` moved behind the interface with no
behavior change. This is the safety property of the chunk: the path the
owner's evaluations run on must be byte-identical in effect afterward.

## Chunk 2 — The Claude Code body

**Detection.** `claude --version` establishes installed; `claude auth status`
establishes signed-in (verified against Claude Code 2.1.202, whose `auth`
subcommand exposes `login`, `logout`, and `status`). Both are output-free
probes in the `CodexStatusProbe` idiom — the result is two booleans, and no
raw output, account detail, or token ever reaches a record, a log, or the
screen. The implementation reads only the exit status, never the text: an
auth-status line is exactly the kind of output that carries account details.

**The turn.** `query()` from `@anthropic-ai/claude-agent-sdk`, with:

- `systemPrompt` — Cairn's constitution as a plain string, which replaces
  Claude Code's own system prompt rather than appending to it.
- `includePartialMessages: true` — the SDK's incremental text events, which
  is what preserves the conductor's typing-as-it-thinks behavior. Without
  it the body still works but the owner sees a pause and then a wall of
  text.
- `maxTurns: 1` — one exchange, no agentic loop.
- An empty tool set — the conductor has never had tools and must not
  acquire them by inheritance.
- `settingSources` pinned to empty. **This is load-bearing.** By default the
  SDK loads `.claude/` from the working directory and `~/.claude/`; left
  alone, the body would inherit the host machine's CLAUDE.md, skills, slash
  commands, and MCP servers. A body governed by Cairn's constitution would
  instead be carrying someone's personal configuration into every
  conversation, including into a beginner's project.
- `model: "claude-opus-5"`.

**Process hardening.** The SDK spawns a bundled Claude Code binary as a
child process, so this body inherits the shape `codex.ts` already proved:
an inactivity timer, an absolute cap, process-tree termination on Windows
and a group kill on POSIX, and an owner-initiated cancel. It lives in the
app's main process rather than core, so it reuses the pattern rather than
the code.

**Packaging.** `forge.config.ts` already sets `asar: false` with a comment
naming the agent SDK's bundled CLI — a fossil from before the reset that is
about to be true again. `vite.main.config.ts` externalizes only Electron and
Node built-ins today; the SDK must join that list, or Rollup will attempt to
bundle a package that spawns a binary.

## Chunk 3 — Selection, consent, and the contract

**Selection.** The connect surface gains a choice between the API path
(base URL, model, and a pasted key, exactly as today) and Claude Code
(detected). The Claude Code path shows no key field and no credential UI:
it shows whether Claude Code is installed and signed in, and if not, what
the owner can do about it in plain words. The stored connection gains the
body id so a relaunch restores the same seat.

**Consent.** The data scope sentence is unchanged and remains true for both
bodies. The cost line becomes body-supplied: the API body keeps today's
pay-as-you-go wording; the Claude Code body says that conversation runs on
the Claude plan already installed, and that the plan's own usage limits are
the real constraint and Cairn cannot see or predict them.

**Contract.** One sentence, in the connected-conductor section. Version
0.3.0 states that the conductor's comment turn "costs like any other turn,"
which is true of an API body and false of a subscription one. The amendment
scopes that claim and names the alternative: when the conductor runs on a
plan the owner has already installed, the limit is that plan's usage rather
than a per-turn charge. All four mirrors move together, with AGENTS.md
hand-updated and diff-verified as always.

## Testing

Every change red-first, through the repo's own workflow.

- **The seam:** the existing fake-body Playwright fixture proves a body
  behind the interface end to end; a unit test proves the API body's
  observable behavior is unchanged from `streamChat` (same events, same
  owner messages for the same HTTP statuses).
- **Detection:** injected-probe unit tests in the `FakeProbe` idiom, both
  directions, plus the not-installed and installed-but-signed-out cases
  rendering their honest copy.
- **The Claude Code body:** unit tests over the SDK-message-to-`StreamEvent`
  mapping with a fake `query()`, including a partial-message sequence, a
  clean finish, and a failure. A test asserts `settingSources` is empty in
  the composed options — the leak this prevents is invisible at runtime and
  needs a pin.
- **The hazard, stated plainly:** no suite may invoke the real Claude Code.
  A test that did would spend the owner's plan limits and could recurse.
  The fake-codex PATH-shim fixture is the pattern — a fake `claude` on PATH
  — and it needs the loud, enforced protection that `conductor-connection.ts`
  got after the same class of mistake nearly shipped in Phase 3.

## Sequencing

Seam (Chunk 1) → Claude Code body (Chunk 2) → selection, consent, contract,
close (Chunk 3). The seam lands first because both bodies then sit behind
it, and because it is the chunk whose success criterion is "nothing
observable changed."

## Out of scope

**Ollama needs no work.** It exposes the OpenAI-compatible API the current
client already speaks, so once the seam exists it is a Custom base-URL
entry and a line of documentation, not a chunk. The route spec called it a
configuration exercise and it turns out to be exactly that.

**The Claude worker adapter stays deferred**, with its reason recorded: the
Codex worker already runs and is not the bottleneck; a second worker is
hardened-envelope work rather than conversation work; and it raises the
same question about a product driving a subscription-authenticated CLI that
Decision 2 addresses for the conductor. That question is worth answering
once, deliberately, rather than inside a phase about something else.

Also out: multi-agent concurrency (Phase 7), the beginner on-ramp and
packaging (Phase 5), and any change to the worker seam, the envelope, or
the records.

## Version

Phase 4 closes at 0.4.0.

## Amendment 2026-07-27 — What the SDK actually is

Everything above is unchanged and remains approved. This amendment corrects
five requirements that were written before anyone had read the Agent SDK's
shipped type declarations. All of them were faithfully implemented in the
first draft of the implementation plan, and three adversarial reviews found
the resulting defects independently — which means the fault is here, in the
spec, not in the plan.

Every claim below was verified on 2026-07-27 against
`@anthropic-ai/claude-agent-sdk` **0.3.220**, installed outside the
repository and read from `sdk.d.ts` and `package.json`. Where a review
asserted something that turned out to be false, that is recorded too: a
confident reviewer is not evidence.

**1. The options go under `options`, and the pin belongs on what `query`
received.** The signature is
`query({ prompt: string | AsyncIterable<SDKUserMessage>, options?: Options })`.
The Testing section above asks for "a test asserts `settingSources` is empty
in the composed options"; read literally, that pins a helper's return value,
which a call site can then drop, reshape, or override with every test still
green. **The test must capture the object actually handed to `query()` and
assert on `params.options.settingSources`.** Pinning a helper proves nothing
about what the SDK was told.

**2. An empty tool set is `tools: []`, not `allowedTools: []`.** These read
as synonyms and are not. The SDK documents `allowedTools` as "tool names that
are auto-allowed without prompting for permission" and says outright: "To
restrict which tools are available, use the `tools` option instead."
`tools: []` is documented as "Disable all built-in tools." So
`allowedTools: []` means *nothing is auto-approved while every built-in tool
remains available* — Read, Write, Edit, Bash and the rest — which is the exact
inheritance Chunk 2 forbids, wearing the appearance of the fix. One review
proposed `disallowedTools: ["*"]`; that is also wrong, and `tools: []` is the
documented mechanism. `canUseTool` and `permissionMode` exist and may back it
up, but the tool roster is what this decision turns on.

**3. The test seam is `pathToClaudeCodeExecutable`, and the PATH shim was
never going to work.** The Testing section names "a fake `claude` on PATH" as
the pattern. That protects detection, which really does spawn `claude` off
PATH — and protects the streaming path not at all, because the SDK spawns a
binary bundled inside its own package. As written, every end-to-end test of a
conversation would have invoked the real Claude Code with the owner's real
credentials, spending plan usage and potentially recursing, which is the one
thing this spec says must never happen.

The SDK provides the answer: `pathToClaudeCodeExecutable?: string` — "Path to
the Claude Code executable. Uses the built-in executable if not specified."
One review stated this option does not exist; it does. **Phase 4 therefore
needs two seams, not one:** a fake `claude` on PATH for the detection probe,
and an injected executable path for the body's own turns, reached through a
main-process test switch in the shape `CAIRN_MOCK` already has for the worker.
No suite may construct the real body.

**4. The consent sentence has to be made true, not just written.** The consent
line promises that conversation runs on the Claude plan already installed. The
SDK spawns a child process, and a child that inherits an ambient
`ANTHROPIC_API_KEY` (or a Bedrock or Vertex switch) may authenticate against a
billed API account instead — in which case Cairn's connect card and its
amended contract would both be telling the owner something false, and the
owner would be paying per turn while reading that they are not.

`Options.env` exists and is the lever. **The body passes an explicit `env`
rather than inheriting the app's ambient Anthropic credentials.** The
implementer verifies which variables actually decide the CLI's auth path and
records what they found; if it turns out the promise cannot be guaranteed,
the consent wording changes to match reality rather than the reality being
left to chance. A consent sentence Cairn cannot keep is worse than a vaguer
one it can.

**5. The contract amendment is two sentences, not one.** Chunk 3 scopes the
amendment to the comment turn's cost. The same section also says the owner
"may revoke the connection at any time, which deletes the stored credential"
— untrue for a body that stores none, and untrue in the direction that
matters, since it implies a disconnect removes access it never had. Both
sentences move together, across all four mirrors. Note also that
`core/assets/contract.md` is generated from `CONTRACT-TEMPLATE.md` by
`core/scripts/sync-contract.mjs`, which runs during `npm --prefix core test`:
the template is the source, and editing the generated copy is silently undone.

**Two further facts, recorded because they change the packaging chunk.** The
SDK is ESM-only (`"type": "module"`, entry `sdk.mjs`), while the app's main
process is bundled to CommonJS — so externalizing it is necessary but may not
be sufficient, and the import may have to be dynamic. And `Options.cwd`
defaults to the Electron process's working directory rather than the owner's
project; the body sets it deliberately, because it decides both where a
leaked tool would act and whose `.claude/` would load if the `settingSources`
pin ever failed open.

**Also settled here:** the Claude Code body supplies its own model constant
(`claude-opus-5`), rather than inheriting the connect card's existing model
state, which is seeded with the curated API pick. And the consent checkbox is
body-specific: its current hardcoded label says conversation "costs money on
my account," which is false for a plan-based body and is precisely the
misreading Decision 3 exists to prevent.
