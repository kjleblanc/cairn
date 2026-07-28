# Cairn Two-Lane Working Protocol — Design

Date: 2026-07-28
Status: proposed — awaiting owner approval. This document changes no
behavior, no code, and no contract. `AGENTS.md` continues to govern
unchanged until the owner adopts this protocol with a `Change the project
rules:` decision.
Scope: a protocol for multiple **human-driven AI chats** working in this
repository at the same time. Product-runtime multi-worker concurrency is
explicitly out of scope (the envelope stays serial:
`runRefusal(isTaskRunning…)`, no real run ids). This is not Phase 7.

## Where this comes from

On 2026-07-28 two parallel owner sessions worked this repository for most
of a day. Everything below was observed live, not hypothesized:

- **Task-number race.** Both sessions drafted task number 099. One
  committed "the visual lab" as 099; the other had to renumber its
  single-instance-lock task to 101 mid-flight.
- **A committed record was overwritten in the working tree.** The
  parallel session's `099-brief.md` was clobbered while uncommitted work
  from the other task sat beside it. It survived only because it was
  committed (`git checkout 7db6f97 -- docs/ai-work/tasks/099-brief.md`
  restored it byte-for-byte).
- **Contaminated verification.** Task 100's checks compiled the other
  session's uncommitted `main.ts` changes — one lane's verification ran
  against code another lane owned. Its report carries the mixed-tree
  caveat.
- **App state corruption.** The 12:47 two-instance incident — two Cairn
  apps sharing one `userData` profile — left the app unresponsive and
  produced Task 101 (the single-instance lock).
- **Suite confounding.** Task 101's green-suite re-check failed with a
  hang signature that a controlled revert experiment proved belonged to
  the parallel session's in-flight state and machine load, not to the
  change under test.

Prior art, read before designing:

- `docs/legacy/CHANGELOG-pre-reset.md` — legacy Contract v2.2
  (2026-07-20) built a bounded concurrent path: at most two independent
  tasks, declared non-overlapping paths, isolated OS temporary
  worktrees, one-at-a-time integration into `main`. The 0.0.1 reset
  (Task 031) removed it with the other concurrency paths. The walls it
  hit were ceremony and product-runtime complexity — neither of which
  this proposal carries, because the drivers here are humans in chats,
  not a scheduler.
- `docs/travelers/2026-07-24-claude-fable-5.md` — "The concurrency trap
  will knock again, dressed as the obvious next feature. The legacy
  archive already paid for that lesson three times." This proposal is
  scoped to stay beneath that trap: no product change, no model-driven
  parallelism, no scheduler.
- `docs/ai-work/PROJECT.md` and the route spec — "Multi-agent concurrency
  is explicitly late" refers to the product. Maintainer tooling is a
  different question, and the maintainer need is now demonstrated.

## The six gaps and the six decisions

### 1. Task-number allocation — the brief commit is the claim

**Gap.** "Next unused number" is a filesystem race: two chats computed
099 at the same time.

**Decision.** A task number is claimed by **committing the brief**, not
by writing it. The first act of any task, before any other work:

1. List candidates from three places, not one: the working tree,
   `main`'s history, and **every lane branch's tree**
   (`git ls-tree --name-only <lane-branch> -- docs/ai-work/tasks/`).
   Lane branches live in the shared `.git`, so each lane can see the
   other's claims without touching the other's working tree.
2. Take the lowest number free in all three.
3. Write `NNN-brief.md` and commit it immediately, alone, on the lane
   branch: `git commit -m "Task NNN: claim" -- docs/ai-work/tasks/NNN-brief.md`.
   The commit lands in the shared object store at once, so the other
   lane's step 1 sees it.

The residual race is seconds wide (between check and commit) and has a
deterministic backstop: the merge ritual (decision 4) detects a
double-claim — two branches carrying the same `NNN-brief.md` with
different content — and the later-merging lane renumbers, exactly as
Task 101 did this week. Detection plus a cheap recovery is honest here;
a lock server is not.

**Rejected:** a number-registry file (it is itself a merge-conflict
point); atomic file creation alone (works in one tree, but lanes have
separate trees — see decision 3 — so the shared refs are the only common
surface).

### 2. LOG.md — make appends auto-merge, then verify

**Gap.** One append-only file; two concurrent appends conflict.

**Decision.** Add one line to `.gitattributes`:

```text
docs/ai-work/LOG.md merge=union
```

Git's built-in `union` driver resolves conflicting hunks by keeping
**both** sides. Concurrent appends of distinct rows therefore merge
automatically; row order may interleave, but every row is
self-describing (the Task column), and the table's value is its rows,
not their adjacency. The contract's one-table format is unchanged. The
merge ritual (decision 4) re-reads the merged log and confirms both
rows are present exactly once — a duplicate row is possible only if two
lanes logged the same task, which decision 1 prevents and the ritual
catches.

**Rejected:** per-lane log files with a periodic consolidation (fragments
the project's memory and changes the contract's artifact for no gain —
the union driver already preserves every row); "let the human resolve it"
(every concurrent week would end in a manual conflict for a conflict
that carries no information).

### 3. One working tree per lane — git worktrees

**Gap.** One shared tree means one lane's verification compiles another
lane's uncommitted work (Task 100), and one lane's file operations can
clobber another's records (the 099 overwrite).

**Decision.** Each lane works in its own git worktree on its own branch:

- **Lane A** is the existing checkout — no change to how work happens
  today.
- **Lane B** is created once:
  `git worktree add ..\cairn-lane-b -b lane/b` (path and name are
  conventions, not magic), then `npm install` inside it (each worktree
  needs its own ignored `node_modules`).

A lane never writes outside its own worktree. Verification in a lane
compiles only that lane's branch — the mixed-tree class of failure is
eliminated by construction. The two worktrees share one `.git`, which is
what makes decision 1's cross-lane visibility free.

Costs, stated plainly: a second `node_modules` (disk and one install);
two dev servers need distinct ports (lane B uses alternates — e.g. the
visual lab's 8081 moves to 8082 — set by environment, not by editing
tracked config); and the owner must know which window is which lane —
the lane branch name in the terminal title or prompt is enough.

**Rejected:** "discipline only" in one tree (it failed this week, twice,
with honest careful operators — the failure is structural, not
carelessness); a full second clone (same isolation, but loses the shared
object store that decision 1's visibility depends on, and doubles fetch
and disk cost).

### 4. The serial merge ritual — one lane integrates at a time

**Gap.** Two lane branches must become one `main` without losing the
honesty guarantees the serial flow provided.

**Decision.** Integration into `main` is the protocol's one mutex, held
for minutes at a time:

1. A lane finishes a task DONE in its own worktree (decision 6) and
   commits its task paths on its lane branch, exactly as today.
2. To land it, the lane announces integration (in practice: tells the
   owner, who is the only person running both lanes) and checks the
   other lane is not mid-integration. First come, first served;
   integrations are minutes, so waiting is cheap.
3. Merge the lane branch into `main`. Expected conflicts: **none** in
   code (tasks declare non-overlapping paths in their briefs, and the
   brief boundary-of-intent section already exists for this), LOG.md
   (auto-resolved by decision 2), task files (distinct numbers by
   decision 1 — a same-number collision here is the double-claim
   backstop firing: stop, renumber the later task, redo the merge).
4. Run the **settle check** on `main` in the integration worktree:
   typecheck, unit tests, and the Vite build. This is the re-verification
   that replaces today's resting-tree assumption: `main` is proven good
   after every landing, not assumed good because nobody else could have
   touched it.
5. The other lane merges `main` into its branch **between tasks**, never
   mid-task — its in-flight verification baseline does not move beneath
   it.

Lane A may keep working directly on `main` as today (its "merge" is its
ordinary exact-path commit); the ritual applies in full to lane B and to
any moment both lanes have unlanded work.

**Rejected:** continuous rebasing (moves a lane's verification baseline
mid-task — the resting-tree assumption breaks *within* a task instead of
between tasks); merging at task start (lands nothing, still requires the
end-of-task merge; pure ceremony).

### 5. App and E2E exclusivity — the app token

**Gap.** App and test state is single-tenant: one real `userData`
profile (the 12:47 incident), and the E2E fixture
(`app/tests/fixtures/conductor-connection.ts`) that snapshots, deletes,
and restores the owner's real `conductor.json` from module state. That
fixture is documented in `app/playwright.config.ts` as safe for exactly
one detach at a time — `workers: 1` is load-bearing — and two Playwright
runs from two lanes are two processes, each holding its own snapshot:
one restore can put a real provider key back mid-way through the other
lane's dispatching tests.

**Decision.** One machine-wide **app token** serializes three activities
across lanes and the owner: launching the real Cairn app, running any
Playwright/E2E suite, and the owner's own interactive use of Cairn. The
mechanism is a lock directory acquired atomically —
`mkdir %TEMP%\cairn-app-token` fails if it exists — held for the
duration of the run, removed after. A lane that cannot take the token
does its other checks first (typecheck, unit, build are all parallel-
safe: unit tests use temp profiles, and `CAIRN_TEST_USER_DATA` already
isolates test userData per process) and takes the token when it frees.
The token is claimed and released by the chat, named in the task report.

Task 101's single-instance lock makes a second *plain app launch*
harmless (it focuses the running app), but it does nothing for the E2E
fixture's detach/restore — the token remains necessary.

A later task could give the fixture per-lane snapshots and relax the
token for E2E specifically. That is real implementation work and is
deliberately not assumed here.

**Rejected:** per-lane E2E profiles as part of this proposal (scope:
this is a protocol, and the fixture change touches the load-bearing
mechanism the config comment warns about); "only one lane may ever run
E2E" (arbitrary — the token gives the same serialization to whichever
lane needs it).

### 6. Verifying DONE in a tree you don't solely own — you do solely own it

**Gap.** The contract's brief → verify → exact-path-commit flow assumes
a resting tree; with two lanes the tree is never globally resting.

**Decision.** The assumption is relocated, not abandoned. A lane's
worktree **is** solely owned by that lane for the duration of a task
(decision 3), and its branch tip is `main` as of the lane's last
between-tasks sync plus only this task's commits (decision 4, step 5).
So lane-DONE means exactly what DONE means today, evaluated in the lane
worktree: the visible outcome holds, the checks in the brief pass, the
diff contains only the task's declared paths. The brief names the base
commit the lane synced from, so any later chat can reproduce the
verification exactly.

What changes is that lane-DONE is a claim about the lane branch. The
settle check (decision 4, step 4) is what promotes the claim onto
`main`: if the settle check fails, the landing — not the lane task — is
what STOPPED, and the failure is diagnosed as an integration problem in
the open, not silently absorbed into either task's record. The report's
honesty rule is unchanged: say what was verified, where, and against
which base.

**Rejected:** re-running the full suite on `main` after every landing
(minutes of app-token time for a merge that, by decisions 1–3, can only
have combined already-verified trees; the settle check is the
proportionate control, and any task that touched app behavior already
ran E2E under the token in its lane).

## What stays serial, and why

- **Integration into `main`** — one lane at a time, because a single
  always-good `main` is the project's memory and its recovery point,
  and the merge is minutes long. Parallelizing it buys almost nothing
  and costs the ability to say "main is good."
- **The real app, all E2E, and the owner's own app use** — one token,
  because `userData` and the conductor-connection fixture are
  single-tenant by construction, and the 12:47 incident is what
  multi-tenancy there looks like.
- **The product runtime** — the envelope dispatches one worker task at a
  time, unchanged. This protocol never asks it to do otherwise.
- **Contract changes** — `AGENTS.md` and its mirrors change only by the
  owner's explicit `Change the project rules:` decision, one at a time,
  as today. This document is input to such a decision, not the decision
  itself.
- **Two lanes, not N** — the protocol is written for two because two is
  what the owner runs and what the week's evidence covers. Every
  mechanism generalizes (more worktrees, the same token, the same
  ritual), but nothing here is validated beyond two, and the honest
  scope is two.

## What this deliberately does not build

No code, no scripts, no lock daemon, no changes to the E2E fixtures, no
product-runtime change, no contract edit. Adoption needs exactly: one
`.gitattributes` line, one `git worktree add`, one `npm install`, and
the owner's amendment to `AGENTS.md` describing the protocol — each its
own small recorded task after approval.

## Trade-offs, collected

- A second `node_modules` and a second dev-server port: the price of
  eliminating the mixed-tree failure class by construction instead of by
  vigilance.
- A claim-commit per task (decision 1): one extra small commit per task,
  in exchange for making the number race visible and recoverable instead
  of silent.
- The union merge driver: row adjacency in LOG.md is no longer
  guaranteed chronological across lanes; each row is self-describing,
  and the gain is that the most common conflict of parallel work
  disappears entirely.
- The app token: lanes sometimes wait to run E2E. The alternative —
  proving the conductor-connection fixture safe for two processes — is
  real work on a load-bearing mechanism, deferred by choice.

## Open questions for the owner

- Should lane B's worktree live beside the repo (`..\cairn-lane-b`) or
  under an ignored directory inside it? (Beside is simpler; inside keeps
  one folder.)
- Should the app token also gate `npm start` dev runs, which share the
  real profile when `CAIRN_TEST_USER_DATA` is unset? (Proposed: yes —
  they are the real app for profile purposes.)
- Does the owner want the protocol piloted for one week on two real
  lanes before the contract amendment, or amended in directly?
