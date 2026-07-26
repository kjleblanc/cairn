# Cairn Conductor Route — Design

Date: 2026-07-23
Status: approved by owner (planning session)
Scope: direction and phasing only. This document changes no behavior.

## Where this comes from

A full evaluation of the repository — the code, the current-era records, and the
legacy archive — against the owner's vision produced these findings:

- **The first visible milestone was achieved.** Task 006 (commit `80f7ba3`) and
  Task 010 each completed a real-model improvement to Cairn itself through
  Cairn's own runtime. PROJECT.md and AGENTS.md still describe the milestone as
  unmet; Phase 0 corrects them.
- **Real-model runs on Cairn itself completed 2 of 5 attempts.** Every diagnosed
  stop traced to harness fragility — chiefly the Windows phantom-dirty class
  whose remaining fix is briefed as Task 012. Task 004 was never diagnosed; its
  cause is unknown.
- **The deterministic core is a hardened trust envelope with no intelligence in
  it.** Git protection, byte-exact verification, honest STOPPED records, and
  consent gating are strong and incident-tested. Nothing converses, plans,
  interprets, or chooses; "routing" is a priority sort over two adapters.
- **A fresh checkout fails `npm test`.** Core's test script runs the
  contract-mirror test before the build that creates the file the test reads.
  The release workflow has never run and would fail today. No CI runs on push.
- **The conductor exists nowhere in the repository.** Before this document,
  neither code nor any doc named it. This spec is its first artifact.

## The vision, as a fixed reference

Cairn is a character: a conductor model in a swappable, upgradeable slot. It
holds the project in its head, talks with the owner in plain language,
interprets underspecified direction, surfaces gaps and risks — then follows the
owner's decision. It never refuses or overrides. It dispatches coding work to
worker AIs through swappable adapters, relays verified results honestly, and
keeps honest records. A complete beginner can build a real project with it.
Multi-agent concurrency comes late. The surface is one clean, cozy screen.

One refinement adopted during planning: Cairn is the whole character — the
memory, the records, the constitution, the safety envelope, the voice — with a
swappable brain in the seat. The parts that persist across model swaps are what
make Cairn recognizably Cairn; that is why the slot can be swappable at all.

## Decisions

1. **First conductor body: a cheap, capable hosted model behind an
   OpenAI-compatible chat API.** The body is three configuration values: base
   URL, API key, model name. Ollama exposes the same interface locally, so the
   private local body later becomes a configuration change, not a redesign. The
   key lives in the operating system's credential store, never in chat, files,
   logs, or the repository.
2. **First proof: the thinking partner.** Conductor v0 reads the project's
   records, interprets a plain-language request, asks clarifying questions,
   flags risks, and produces the task outcome text. The owner presses the
   existing dispatch button. This requires no change to core.
3. **Where it lives: a new primary chat screen in the existing desktop app**,
   designed from day one as the seed of the one-screen product — the screen we
   keep. Existing screens remain reachable while chat becomes the center of
   gravity.
4. **Consent: standing consent at connect.** One clear, revocable authorization
   when the owner connects the conductor's provider: a card states the
   provider, the model, what may flow (messages, project records, and project
   files Cairn reads to answer), and the cost basis. A visible indicator always
   shows which body is in the seat. Worker dispatch and every existing contract
   risk boundary still confirm per action. Phase 1 drafts the contract
   amendment this requires.
5. **Architecture: the conductor is a new layer built fresh; core survives
   beneath it as the safety envelope.** Core needs two structural surgeries —
   record authorship moves from the worker model to Cairn, and adapter result
   validation generalizes beyond Codex — but no rewrite. The UI evolves in
   place around the chat heart.

## The route

**Phase 0 — Stabilize.** Small recorded serial tasks, immediately: land Task
012 (phantom-dirty snapshot fix); fix the fresh-checkout test order so
`npm test` passes anywhere, and add an on-push CI run; refresh the stale prose
(version strings in README, MAINTAINERS, EVERYDAY-WORKFLOW, and
PROJECT-CONVERSION; PROJECT.md's unmet-milestone claim) and set the new
milestone in AGENTS.md.

**Phase 1 — Conductor v0: the thinking partner.** The chat screen becomes the
app's heart. An OpenAI-compatible client in the Electron main process; the
standing-consent connect card; the body indicator. The conductor reads the
contract, PROJECT.md, the log, and recent reports; its constitution distills
the contract's risk-boundary and honesty sections. Its output is conversation
plus a proposed-task card whose outcome text feeds today's dispatch flow with
one click. From day one, keep a small evaluation set of deliberately vague or
quietly trapped requests to measure whether the brain asks the right question —
and to compare bodies when one is swapped.

*Milestone (goes into AGENTS.md in Phase 0): Cairn's conductor, reading the
real project records, turns a vague request into a well-scoped task — asking a
clarifying question or flagging a risk when one is warranted — and that task
dispatches and completes DONE.*

**Phase 2 — Core surgery.** Record authorship moves from the worker to Cairn,
retiring the MODEL_RECORDS_MISSING failure class. Adapter validation
generalizes to a per-adapter schema registry. The operational debts get paid: a
timeout and cancel path for the worker process, a cross-process run lock, and
run-reattach in the UI so navigation no longer orphans a task.

**Phase 3 — The full atom.** The proposed-task card gains its own dispatch
button, with per-action confirmation kept per the contract. The conductor
relays results in plain language from what the envelope verified, never from
what the worker claimed. Milestone: one conversation on Cairn itself runs
request → pushback → dispatch → verified DONE → honest explanation.

**Phase 4 — Second worker, second body.** A Claude worker adapter over the
Agent SDK's subscription transport (the legacy Task 027 lesson: the owner's
subscription includes no API access), built from the codex.ts hardening
template. Around the same time, the local Ollama body joins the conductor slot
as a configuration exercise.

**Phase 5 — The beginner on-ramp.** Setup and GitHub taught or automated, a
humane path to an API key, packaging and signing, and the old screens folding
fully into the one-screen surface. A person who is not the owner builds
something real.

**Phase 6 — The living scene.** Ambient animation of true events: the conductor
thinking, a worker working, stones landing. Garnish may start earlier where
cheap; the real push waits until there are real events to animate.

**Phase 7 — Multi-agent concurrency, explicitly last.** The project deleted
three earlier concurrency attempts that ran ahead of a working single loop.
When the single loop is boringly reliable, resurrect the invariants documented
in the legacy 024–028 reports — not the code.

## Implementation rhythm

- **Phase by phase, never all at once.** Later phases depend on what earlier
  phases teach: how the chosen brain actually behaves in the seat, and how the
  owner — the first user — reacts to it. The repository's own history warns
  against the alternative: its largest build bypassed its process, and its
  longest failure streak came from building atop an undiagnosed guess.
- **Each phase gets a short design spec, then an implementation plan, then
  serial recorded tasks.** Every working session ends with verified, committed,
  honestly recorded state, so any session can safely be the last.
- **Phase boundaries are decision points, not just milestones.** The model
  landscape shifts monthly by design; re-plan at each boundary before starting
  the next phase.
- **Dogfood where the loop already works.** Small fixes suited to the current
  runtime (Task 012 is a candidate) may be dispatched through Cairn itself.

## Open questions deferred to Phase 1 design

- Where conversation history lives (leaning: project-local and gitignored).
- The exact handoff from the proposed-task card to the existing dispatch flow.
- The contract amendment wording for the connected-conductor channel.
- The contents of the evaluation set of vague and trapped requests.
- The beginner's path to an API key (Phase 5 at the latest).

## Amendment 2026-07-26 — Acquiring software during a task

The sections above are unchanged and remain approved as written. This
amendment records a contradiction found while scoping Phase 4, names the
decision it forces, and places the work.

**The contradiction.** The contract already grants permission to install:
`core/assets/contract.md:113` lists "installing or updating software or
dependencies" among the concrete risk boundaries, requiring the exact target,
effect, likely cost, and recovery plan to be shown before the owner approves.
The code denies the capability: `core/src/codex.ts:718` runs the worker under
`--sandbox workspace-write`, and `network_access` appears nowhere in the
repository. Codex's workspace-write sandbox is network-disabled unless that
value is set, so a task requiring `npm install` does not ask and get refused —
it fails. The rule is currently enforced by a wall rather than by a prompt,
and no run has hit it only because every task so far has edited files that
already existed. (Verified: the contract line, the sandbox flag, and the
absence of `network_access`. Inferred from Codex's documented default: that
the worker therefore has no network. A single run confirms it and should be
done before Phase 5 builds on it.)

**Three things, not one.** "Tools" covers three categories whose risk and
whose reversibility differ:

1. **Dependencies inside the workspace** — `npm install react`. The blast
   radius is the workspace, which is already the worker's bound; the change
   lands in the manifest and lockfile, where Git makes it visible in the
   disclosure and revertible afterward.
2. **Software on the owner's machine** — a global CLI, a runtime, a binary.
   It escapes the workspace, escapes Git, and outlives the run.
3. **Instruction packages** — skills, plugins, MCP servers. These change how
   the conductor or a worker *behaves*, which makes an install channel a
   distribution channel for instructions.

**The decision.** Only category 1 is in scope, and the line is drawn on a
property the envelope already tracks: whether Git can undo it. Category 2
keeps the pattern Cairn already uses for Codex, and which Phase 4 extends to
Claude Code — Cairn detects software the owner installed and never installs
it. Category 3 stays out for the same reason Phase 4 pins the Agent SDK's
`settingSources` to empty: that pin exists to stop a body inheriting the host
machine's instructions by accident, and a deliberate door beside it would
undo the wall.

**Consent is not the mechanism.** "May I install `chalk@5.3.0`?" is not a
question Cairn's intended user can answer. A beginner will approve every
time, because refusing stops the work and they have no basis to judge — so
the prompt transfers liability without transferring understanding, which is
the pattern this project exists to replace. Everywhere else Cairn protects
its user with structure rather than by asking them to adjudicate. The surface
therefore follows the shape already used for dispatch: name what will be
installed before it happens, show what actually changed after, and make the
undo real. The owner's approval still gates the action, as the contract
requires; it is not asked to carry the safety.

**Placement: Phase 5, not Phase 4.** Phase 4 is the conductor-body seam, and
the success criterion of its first chunk is that nothing observable changes;
worker network access has no business inside it. Category 1 belongs with the
beginner on-ramp, where a person who is not the owner builds something real —
and will need a dependency by their second task.
