# Cairn N-Lane Working Protocol — Design

**Status:** proposal for owner decision, 2026-07-30 (Task 138). Extends, and
where it says so replaces, `2026-07-28-cairn-two-lane-protocol-design.md`.
No contract text changes until the owner approves an amendment.

## Where this comes from

The two-lane protocol has run for two weeks (2026-07-28 → today) under real
load, and the load is growing in two directions at once: the owner now keeps
more parallel conversations going, and the mobile groundwork (Task 139's
subject) will add a conversation that is physically never at the machine.
This spec answers one question: what does the protocol look like when "two"
stops being the number?

The pilot's evidence, all from `docs/ai-work/LOG.md`:

- **Three task-number double-claims in two days.** Tasks 123/124, the first
  126/127 pair, and the second 126/127 pair — every one resolved by the
  protocol's own rule (the later claim renumbers before landing). Then, on
  2026-07-30, a fourth: a session wrote its brief *over* an existing
  134-brief, restored it, and renumbered (the repair commit and this task's
  history show it). Recovery works; the race is frequent.
- **Union merge on LOG.md: zero failures.** Rows from concurrent lanes landed
  correctly at every merge; the landing checks confirmed each row once.
- **The app token held.** No cross-lane app/E2E contamination was recorded;
  lanes waited instead.
- **Worktrees held.** One lane's checks never compiled another's uncommitted
  work — with one operational lesson: a fresh worktree needs its own
  `npm install` and a core build before tests run (Task 133's report).
- **Landing waited correctly.** Lane B's contract work (132/133) landed only
  after lane A's task 131 closed, so the settle check on `main` never ran
  over uncommitted work.

## The six mechanisms at N lanes

The two-lane spec made six decisions. Here is what the evidence says each one
becomes when N is larger than two.

### 1. Task-number allocation — keep claim-by-commit; the race is cheap

Three options were considered:

- **Keep claim-by-commit with renumber-on-collision (recommended).** Four
  collisions in two weeks, each repaired in minutes by rule. The failure is
  visible (a commit diff shows it immediately), the repair is mechanical, and
  the rule already lives in every lane's contract. At three lanes the
  collision rate rises but the repair cost does not.
- **Lane number pools** (lane A takes odd, B even, C ≡ 2 mod 3…). Eliminates
  the race but breaks the property that makes the log readable — numbers stop
  being chronological — and still needs a renumber rule when a lane abandons
  a claim. Machinery to prevent a cheap, visible, recoverable failure; the
  contract's own evidence-levels section (v0.5.0) says not to do that.
- **A claims registry file.** A single `CLAIMS.md` would itself be the most
  contended file in the repo — the same race, moved.

One hardening is worth its weight: the 134 overwrite happened because a lane
wrote its brief *before* checking the tree. The claiming rule gains one
sentence: **before writing, list `docs/ai-work/tasks/` and read any brief
with your candidate number — a number is taken if its file exists, committed
or not.**

### 2. LOG.md — unchanged

Union merge plus the landing check ("each row exactly once") has a perfect
record. Nothing to change at N lanes.

### 3. Worktrees — one per lane, and an onboarding note

The convention generalizes directly: `.lanes/<letter>`, branch
`lane/<letter>`, lane A remains the main checkout. The spec should state what
the pilot taught: a new worktree is not ready until `npm install` and a core
build have run in it — two commands, once, per worktree. (This belongs in the
contract's lane section as one parenthetical, and in MAINTAINERS.md.)

How many lanes? The honest answer is that the protocol's mechanisms scale
further than the owner does. **The contract should say "a small number —
three by default; more only by owner amendment."** Three is not derived from
a mechanism limit; it is the point where the landing queue (decision 4) and
one human's attention both stay sane. It also matches the observed reality:
two active lanes plus one occasional.

### 4. Landing — the queue gets an etiquette

Landing stays strictly serial: one lane merges into `main` at a time, then
runs the settle check. At N lanes this is a queue, so the protocol needs two
sentences of etiquette:

- **Main must be between tasks to receive a landing.** The settle check runs
  in the main checkout (lane A's tree); it proves nothing if it compiles a
  lane's uncommitted work. A lane lands when main's tree is clean of in-flight
  work — exactly what lane B did for tasks 132/133 behind task 131.
- **First ready, first landed; a landing lane announces by merging.** There
  is no reservation system. A lane that finds another landing in progress
  waits, then re-syncs `main` into its branch before its own attempt. A lane
  carrying a double-claimed number renumbers *before* joining the queue, as
  today.

### 5. The app token — still the true serializer; the phone does not change that

The app token exists because the real app, E2E suites, and the owner's own
use share one profile and one conductor connection. That stays single-tenant
at any N; the deferred work (proving the conductor fixture safe for two
processes) is still deferred and still the real price of parallel E2E.

What the mobile groundwork changes is the *device*, not the tenancy: a phone
conversation reaches the **same** app, profile, and conductor connection
through the bridge (Task 139), so it lives under the same token semantics as
the desktop. The rule generalizes from "the app" to **"the single-tenant
surface is the profile, not the device."**

### 6. DONE in your own tree — unchanged

Each lane's DONE is verified in its worktree on its branch; the settle check
promotes it onto `main`. Reports name the base commit. Nothing about N
changes this.

## A lane is a conversation, not a device

For the contract amendment, one definitional sentence does real work:

> A lane is one human-driven conversation working this repository, whatever
> device it speaks from. Each lane gets its own worktree on the machine; a
> lane speaking through the mobile bridge uses a worktree on the PC — the
> phone carries no files.

This makes the phone a first-class lane without a second protocol.

## Automations are not lanes

The project now runs a recurring automation (the weekly docs-review cron).
Automations need one rule so they can never silently foul a lane:

> An automation is not a lane. It claims no task number, writes only inside
> its designated directory (`docs-review/` for the docs review), and never
> touches task paths, the contract, or source. A lane treats an automation's
> directory as automation-owned: it does not commit from it, and the
> automation's writes there are expected change, not "protected work changed
> unexpectedly."

## What stays serial, and why

Unchanged from the two-lane spec, restated for N: the envelope dispatches one
worker task at a time (product concurrency remains Phase 7, explicitly late);
landings are serial; contract changes are serial and the owner's decision,
however many lanes are running.

## What this deliberately does not build

No E2E-parallelism proof, no lock daemon, no claims registry, no number
pools, no code, no mobile client (Task 139), no contract edit. Adoption needs
exactly: the owner-approved amendment of the lane section in `AGENTS.md` and
its mirrors, one parenthetical about worktree onboarding, the automation
rule, and — when a third lane is actually wanted — one `git worktree add` and
two setup commands.

## Trade-offs, collected

- Keeping claim-by-commit accepts a continuing trickle of renumber repairs
  (four so far) in exchange for zero new machinery and a chronological log.
- Capping at three-by-default is an attention budget, not a technical limit;
  it will feel arbitrary the day a fourth lane is genuinely useful, which is
  why raising it is one owner sentence rather than a redesign.
- "Main must be between tasks to land" can idle a ready lane behind a long
  lane-A task; the alternative — settling in a throwaway tree — buys speed
  with a second settle environment to keep honest.
- Defining a lane as a conversation means the mobile bridge inherits the
  whole protocol before it exists; if Task 139's bridge never ships, this
  costs one inert sentence.

## Open questions for the owner

1. Three as the default cap — or straight to "as many as the worktrees
   survive," with attention as the only governor?
2. Should the claim-time hardening ("a number is taken if its brief file
   exists, committed or not") go into the contract text, or is it maintainer
   lore for MAINTAINERS.md?
3. When the mobile lane exists, does it count against the lane cap, or does
   the phone get a standing exemption as "the owner, remote"?
