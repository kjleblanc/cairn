# Contract evolution proposal — what seven projects taught

**Date:** 2026-07-29 · **Task:** 132 (lane B) · **Status:** proposal — every
item is the owner's to accept, reject, or amend individually. No contract file
has been changed.

---

## 1. Why now

The 2026-07-29 seven-project docs review (`docs-review/REPORT.md`) found four
contract lineages on this machine: Cairn's current v0.4.0, cairn-eval's stale
v0.2.0, and two retired pre-reset copies (delve v1.0, cairn-test v1.2). That
drift is the symptom. The cause is that the contract has no story for **living
alongside other projects** — how versions sync, how much machinery a project
should carry, and which decisions belong to whom.

Meanwhile the other projects have been running real experiments Cairn never
tried: delve built a ratchet, a notary, and 31 ADRs; SpecDeck ran a three-party
Orchestrator/Executor/User workflow; the pre-reset kit (Workflow Docs)
codified evidence levels. Some of that is worth adopting. Some was already
tried inside Cairn and deliberately removed. This proposal sorts one from the
other.

**Sources:** `CHANGELOG.md` (v0.0.1–0.4.0), `docs/legacy/CHANGELOG-pre-reset.md`
(v1.0–v3.0), `docs-review/staged/delve/` (CLAUDE.md, ADR-0002, 03-milestones),
`docs-review/staged/specdeck/Migration_Brief.md`,
`docs-review/staged/workflow-docs/`, `docs/ai-work/LOG.md` (130 tasks).

---

## 2. Candidate v0.5.0 changes

### P1 — Say who decides what

**Change.** Add a short contract section classifying every decision:

- **Owner decisions** — how the product looks and feels, scope, risk, spend,
  anything external, and whether a milestone moved. The AI brings these to the
  owner with something to look at, never code to read.
- **AI decisions** — implementation detail: formats, libraries, structure,
  algorithms. The AI decides, records the choice in the task report, and
  explains it in plain language.
- When asking the owner anything, the AI states which kind of decision it is.

**Evidence.** delve's CLAUDE.md "Who decides what" (staged
`delve/CLAUDE.md:100-106`) is the clearest statement of this partition anywhere
on the machine, and its communication rules (:108-116) are written for exactly
Cairn's audience. Cairn's contract today has owner *commands* and risk *pauses*
but never says where ordinary judgment calls live — which is how an AI ends up
either asking permission to pick a library or silently picking the product's
color palette.

### P2 — Milestone movement is recorded, never edited in

**Change.** Strengthen the milestone rule: the `CURRENT MILESTONE` fact may only
change inside a task whose records show the work that moved it — the report
names the gate evidence, and the log row's `Milestone moved?` stays what it is
today: a labelled claim, verified by no one but the owner. Where a project can
cheaply mechanize this (a test that fails when the milestone line outruns its
sign-offs), it should; that machinery is recommended, not required (see P4).

**Evidence.** delve's ratchet (`staged/delve/docs/03-milestones.md`, top
section; ADR-0002:25-33) pinned its milestone line to human sign-offs with an
always-on test — and caught a real unguarded advance ("007 task 1a closed the
hole where the first advance was unguarded"). Cairn 0.3.0 already took the
honesty half (CHANGELOG "Said plainly what a stone counts"); this adds the
records half.

### P3 — A claim without checkable evidence is not a claim

**Change.** One sentence into the report rules: checks named in a report carry
their exact command and where their output can be seen, so a later chat — or
the owner — can re-run the decisive one. No receipt files are mandated for
ordinary chat tasks; envelope-dispatched runs already exceed this (Cairn
authors the report from its own Git verification).

**Evidence.** delve's notary principle "a claim without receipts is not a
claim" (`staged/delve/CLAUDE.md:152-156`) is the strongest version; the
pre-reset kit's "executable brief checks" (Workflow Docs README, evidence
table) is the portable version. Cairn's report rules today say "checks run and
their real results" but don't require the results to be *reachable*.

### P4 — Evidence levels: machinery matches the risk

**Change.** Add a proportionality section, adopted nearly verbatim from the
pre-reset kit: a project declares one of three evidence levels in
`docs/ai-work/PROJECT.md` —

| Level | What it adds over the level below | Fits |
|---|---|---|
| **Core** (default) | brief / report / log / risk pauses — today's contract | beginner projects, small web apps |
| **Verified** | orientation script, executable "done-when" checks, receipts, decision records (ADRs) | long-lived projects with repeated AI handoffs |
| **Forensic** | custody rules, hashes, stop hooks, audit trails | dirty-tree, multi-agent, or provenance-sensitive work |

Machinery is added to close a *demonstrated* failure, never preventively.

**Evidence.** Workflow Docs README evidence-level table. This one idea
reconciles the whole portfolio: delve's ratchet/notary/hooks are *correct* —
at Forensic level, for a deterministic-engine project with 26 sessions of
receipts. Cairn's lightness is *correct* — at Core. Today's contract
accidentally implies one size, which is why delve's adoption reads like
overkill and cairn-eval's reads like neglect.

### P5 — Contracts declare their version; drift is detected, not discovered

**Change.** Two additions:

1. `AGENTS.md` already carries the version in its header; make the rule
   explicit: adopting a newer template is an **explicit task** in that project,
   and until then the local contract governs as written — an AI working there
   follows the local version and *flags* drift, never silently applies a newer
   contract.
2. Add `ARCHIVED` beside `ACTIVE`/`PAUSED` in the status vocabulary: a project
   the owner has set aside is marked, its records preserved, and no work
   proceeds until reactivated. Deletion stays a separate owner decision.

**Evidence.** The review found v0.2.0 and v1.2 contracts still governing
projects (`docs-review/REPORT.md` § Contract drift) — an AI starting work in
cairn-test today would follow rules retired on 2026-07-22. The weekly
docs-review cron job created 2026-07-29 is the detection mechanism this rule
assumes.

### P6 — A portfolio section: one template, many deliberate copies

**Change.** A short new section: Cairn's repo holds the canonical
`CONTRACT-TEMPLATE.md`; every other project's `AGENTS.md` is a deliberate copy
at a declared version; a project's own contract is law *there* even when stale
(workflow-docs README: "these guides… never outrank" the project's canonical
contract). Updating copies is routine owner-directed work, not an emergency.

**Evidence.** This section simply describes the reality the review measured —
seven projects, four versions — and gives the owner a standing answer to "which
contract is real?"

### P7 — Measurement preconditions are named and confirmed

**Change.** One paragraph: when a check's result depends on machine state the
AI cannot observe (other running apps, thermal state, network), the brief
names the precondition, the owner confirms it immediately before the check,
and the AI never closes or kills the owner's applications itself. Optional per
project; declared in PROJECT.md when used.

**Evidence.** delve's GPU quiet window (`staged/delve/CLAUDE.md:116-126`,
ADR-0002 amendment 2026-07-15) exists because a *controlled A/B proved* a game
session moved its benchmarks — "a process snapshot taken after a run cannot
prove what was active during it." Narrow origin, general lesson: unobservable
environment is a human-confirmed input, not an assumption.

### P8 — Human-judgment checks are first-class stops

**Change.** Make explicit what is currently implicit: when only human judgment
can answer whether the outcome holds (feel, taste, "is this fun"), the task
stops, puts the result on the owner's screen with exact steps, and waits;
DONE then carries the owner's confirmation.

**Evidence.** delve: "When only human judgment will do… stop" (CLAUDE.md:76-77)
and the owner's role as feel arbiter. SpecDeck's entire three-party model
(`staged/specdeck/Migration_Brief.md` §3) is built on the user performing
runtime verification on real surfaces — "the user… does runtime verification
on the real surface, and commits." Cairn's contract says verification asks
"does the visible outcome hold" but never says what happens when the AI
*can't* see it.

---

## 3. Considered and not proposed

| Idea (source) | Why not |
|---|---|
| Approval hash-locks, scripted approval messages (pre-reset v1.x) | Tried and removed in v2.0/v3.0 (`docs/legacy/CHANGELOG-pre-reset.md`): ceremony collapsed under its own weight. Today's standing consent + per-action pause works. |
| Direction Gate, mandatory fresh-context review, reviewer verdicts (v2.x) | Removed in v3.0. Reviews stay optional advice that may suggest a new task. |
| High-Stakes lane ceremony (v1.x–v2.x) | Replaced by just-in-time risk pauses (v3.0), which the risk-boundary list already carries unchanged. |
| Mandatory stop hooks / notary scripts for every project (delve) | Harness-specific machinery. Belongs at Forensic level (P4), not in the portable contract. |
| Mandatory ADRs (delve) | Right for 31-decision engine architecture; overhead for a beginner's web app. Included as Verified-level practice instead (P4). |
| SpecDeck's three-party Orchestrator/Executor/User model | Cairn's conductor + envelope already covers the split with stronger verification. Its one transferable lesson — the human verifies on the real surface — is P8. |
| Explore/Promote modes (Workflow Docs) | Cairn's spike-task practice plus written plans covers both without adding modes. |
| Terminology bans, per-file style rules (SpecDeck) | Genuinely project-specific; they belong in that project's docs, not the template. |

---

## 4. Per-project rollout recommendation

| Project | Recommendation |
|---|---|
| **Cairn** (this repo) | Adopt accepted items as v0.5.0: update `AGENTS.md`, `CONTRACT-TEMPLATE.md`, the `cairn.html` embed mirror, CHANGELOG entry. Declare Core+Verified (it already keeps specs and receipts in practice). |
| **cairn-eval** (Bookshelf) | When the owner resumes it: first task = adopt v0.5.0 from v0.2.0, declare Core. Two-version jump is safe; nothing in v0.3/v0.4 requires migration machinery. |
| **delve** | On unpause: adopt v0.5.0 (replacing the retired v1.0 copy) **and declare Forensic** — its ratchet, notary, ADRs, and GPU quiet window are load-bearing and P4/P7 explicitly legitimize them. CLAUDE.md stays as project law beside the contract. |
| **cairn-test** | Mark `ARCHIVED` (P5) or delete — zero tasks, retired format. Archiving costs one line and preserves the evidence. |
| **SpecDeck** | Finish the migration first (its governing docs aren't all in the repo yet). Then adopt v0.5.0 at Core, keeping `Project_Instructions.md` (terminology ban, style, STOP-AND-ASK list) as a project addendum. Its three-party model maps cleanly onto conductor + worker. |
| **RunWithFriends** | **Do not convert.** Its CLAUDE.md is mature Forensic-level law and its own kit says project law outranks portable guides. Optionally add one version-declaration line so the drift detector can see it. |
| **Workflow Docs** | Add a banner: "pre-reset reference kit, historical — current contract lives in Cairn." Updating its content to v0.5.0 is optional; it documents a different product honestly. |

---

## 5. Questions for the owner

1. **Version number** — is this 0.5.0 (additive) or is the portfolio section
   big enough to call it 1.0.0?
2. **Mechanized ratchet for Cairn itself?** delve's always-on test is cheap;
   want one for `docs/ai-work/PROJECT.md`'s milestone line, or is the P2
   records-rule enough at Cairn's level?
3. **Evidence level for Cairn itself** — Core, or Verified (it already behaves
   like Verified: specs, receipts, decision docs)?
4. **`docs-review/` in git** — should the weekly review's staging area be
   gitignored (it's regenerable) or committed (it's evidence)?
5. Any proposal item you want struck or rewritten before the contract task
   runs.
