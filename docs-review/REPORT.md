# Documentation Review Synthesis Report

**Date:** 2026-07-29  
**Reviewer:** Cairn documentation-review automation  
**Scope:** Read-only review of documentation across seven projects. No source code was reviewed. No files outside this workspace were modified.

---

## Overall state

Cairn (the workspace) is the only project with fully current, internally consistent documentation and active daily work. The other six projects exhibit a spectrum of states: one paused but rigorously documented (delve), one in migration without an installed contract (SpecDeck), one dormant with a stale contract (cairn-eval), one apparently unused with a retired contract format (cairn-test), one whose docs were physically inaccessible from the reviewed path (RunWithFriends), and one reference kit that predates Cairn's current form (Workflow Docs). The most important finding is **contract drift**: three incompatible contract versions are in play across the owner's machine, and two projects carry copies of contracts that Cairn itself has already retired.

---

## Per-project findings

### 1. Cairn (workspace)

- **Status:** ACTIVE — contract v0.4.0, milestone current, Task 130 in flight.
- **Doc health:** Excellent. All canonical files (AGENTS.md, CONTRACT-TEMPLATE.md, README.md, CHANGELOG.md, MAINTAINERS.md, EVERYDAY-WORKFLOW.md, docs/ai-work/PROJECT.md, LOG.md) agree on version, status, and mechanics. 129 tasks recorded with honest DONE / STOPPED dispositions.
- **Top issues:** None critical. The legacy archive (`docs/legacy/`) is large but correctly isolated. The two-lane protocol is already experiencing real collisions (task 126/127 double-claim) and resolving them correctly.

### 2. RunWithFriends

- **Status:** Unknown — the copied docs are wrapper files only.
- **Doc health:** The root `AGENTS.md` and `CLAUDE.md` are pointer-only files that redirect to a `runwithfriends/` subdirectory. The actual project contract and docs were not copied because they live inside the nested repo, not the parent folder root.
- **Top issues:** This review could not access the real project docs. The parent-folder wrappers contain zero project-specific information. The `docs/` folder at the root level is essentially empty (`evidence/021/` with no files).

### 3. SpecDeck / Menu Study App

- **Status:** In migration — phases 1–5 and half of phase 6 built; governing documents are being moved from Claude Project knowledge files into the repo.
- **Doc health:** One substantial handoff document (`Migration_Brief.md`) exists and is detailed. A `spec.json` file in the root is misleading — it is the StabilityAI REST API schema, not a project specification.
- **Top issues:** No README, no AGENTS.md, no installed contract. The four governing documents (`App_Master_Context.md`, `Project_State_Handoff.md`, `Theme_Specification.json`, `Project_Instructions.md`) were not found in the reviewed root folder; they may live inside the `menu-mastery/` monorepo subfolder or remain in Claude Project knowledge files. The terminology ban and three-party workflow (Orchestrator / Executor / User) are well-documented but not yet under any formal project contract.

### 4. delve

- **Status:** PAUSED — owner direction, 2026-07-24, task 009. Milestone M4 (sound and heartbeat) not yet attempted.
- **Doc health:** Very high. The project has an extraordinary documentation culture: 1,931-line CLAUDE.md, 8 top-level design docs, 31 ADRs, 26 pre-Cairn sessions with receipts, and a meticulously maintained milestones file with ratchet-gate records and human sign-offs.
- **Top issues:** The `AGENTS.md` contract is **Cairn v1.0** (pre-reset framework), which is now retired. The project adopted Cairn on 2026-07-17 and was paused six days later. Many Cairn-numbered task reports are missing (008, 010–014, 016, 017 have briefs but no reports). The pre-Cairn session workflow remains authoritative while the Cairn contract is paused.

### 5. cairn-eval (Bookshelf)

- **Status:** ACTIVE but **dormant** — no tasks since 2026-07-26 (3 days ago).
- **Doc health:** Minimal but consistent. AGENTS.md, PROJECT.md, and LOG.md agree.
- **Top issues:** The contract is **Cairn v0.2.0**, missing two major version bumps (v0.3.0, v0.4.0). It lacks the two-lane protocol, the conductor constitution updates, the envelope-authored result relay refinements, and the push-button pause. Only 5 tasks exist; the project may have stalled after the offline demonstration task (005) explicitly did not attempt the requested product change.

### 6. cairn-test (Test Project)

- **Status:** ACTIVE but **unused** — zero completed tasks, empty LOG and PILOT tables.
- **Doc health:** Minimal. AGENTS.md and PROJECT.md agree, but there is no work history.
- **Top issues:** The contract is **Cairn v1.2** — the **legacy pre-reset framework**, a completely different workflow from today's Cairn. This format was retired on 2026-07-22. The project appears to be a test artifact or abandoned conversion attempt. It should probably be deleted or converted to the current contract if the owner still wants it.

### 7. Workflow Docs

- **Status:** Reference kit — not a governed project.
- **Doc health:** Good internal consistency. README, PROJECT-KICKOFF.md, and PROJECT-CONVERSION.md cross-reference correctly.
- **Top issues:** These docs describe the **pre-reset framework** (Explore/Promote modes, exact-close Git rules, generated receipts, Core/Verified/Forensic levels). They are spiritually aligned with Cairn but mechanically different. The README honestly warns that they are examples from one repository, not portable law. They are not stale — they are simply a different product.

---

## Cross-project findings

### Contract drift

Four distinct contract lineages exist on this machine:

| Project | Contract version | Format |
|---|---|---|
| Cairn (workspace) | v0.4.0 (current) | Post-reset: `Work on:`, brief/report, two lanes, conductor, push button |
| cairn-eval | v0.2.0 (stale) | Post-reset, missing v0.3 and v0.4 |
| delve | v1.0 template (paused, retired) | Pre-reset framework: `Define a task:`, Tiny/Standard/High-Stakes, receipts |
| cairn-test | v1.2 (retired) | Pre-reset framework, more elaborate than delve's copy |

**Risk:** An AI agent reading `AGENTS.md` in cairn-eval or cairn-test will follow rules that the workspace no longer maintains. The v0.2.0 contract in cairn-eval is two full minor versions behind and lacks safety features (two-lane protocol, improved record authorship, push-button pause) that were added because this project watched real failures.

### Duplicated effort

- `PROJECT-KICKOFF.md` and `PROJECT-CONVERSION.md` exist in both the **Workflow Docs** folder and the **Cairn workspace root**. The Workflow Docs versions are the pre-reset framework guides; the Cairn workspace versions are the current, simplified beginner guides. They are **not byte-identical**.
- `CONTRACT-TEMPLATE.md` exists in the Cairn workspace root and in `delve/docs/`. The delve copy is the retired v1.0 template.

### Gaps spanning projects

- **RunWithFriends:** Real docs inaccessible. The wrapper files give no signal about project health.
- **SpecDeck:** No installed contract. The migration brief is excellent but the project is not yet under any formal governance.
- **delve:** Paused with a retired contract. If the owner resumes, the contract should be updated to v0.4.0 or the project should explicitly choose to stay on its own CLAUDE.md workflow.
- **cairn-eval:** Stale contract + dormancy. If work resumes, updating the contract is the first task.
- **cairn-test:** Retired contract + zero activity. This project is likely dead weight.

---

## Decisions only the owner can make

1. **RunWithFriends:** Do you want the real RunWithFriends docs reviewed? They live inside the `runwithfriends/` subdirectory, not the parent folder. Should the wrapper files be updated to include project facts?

2. **SpecDeck:** Should SpecDeck adopt the current Cairn contract (v0.4.0) after migration, or does its three-party Orchestrator/Executor/User model need a different governance structure?

3. **delve:** When you unpause delve, do you want to update its `AGENTS.md` to Cairn v0.4.0, or do you want to keep the pre-reset v1.0 template / CLAUDE.md hybrid? The two are meaningfully different.

4. **cairn-eval (Bookshelf):** Do you intend to continue the Bookshelf project? If so, the first task should be updating its contract from v0.2.0 to v0.4.0. If not, should it be archived or deleted?

5. **cairn-test (Test Project):** This project uses a retired contract format and has zero work history. Should it be deleted, or converted to the current contract as a fresh beginner exercise?

6. **Workflow Docs:** These pre-reset guides still exist as a separate folder. Do you want to keep them as historical reference, update them to reflect Cairn's current form, or archive them?

---

## Limitations of this review

- **RunWithFriends real docs were not copied.** The copy script only saw wrapper files at the parent-folder root. The actual project docs are inside a nested `runwithfriends/` directory.
- **SpecDeck governing documents were not found.** `App_Master_Context.md`, `Project_State_Handoff.md`, `Theme_Specification.json`, and `Project_Instructions.md` may live inside the `menu-mastery/` monorepo subfolder, which was not copied.
- **No source code was reviewed.** This is a documentation review only. Claims about build state, test results, or product functionality are taken from the docs themselves.
- **No external verification.** Dates and version numbers were read from files, not cross-checked against Git history or remote state.
- **Previous report:** No previous `docs-review/REPORT.md` existed, so no "what changed since last time" section is possible. Future reviews should compare against this file.
