# Task 269 brief — the loop milestone is reached, and the next one is named

**Lane:** A (the main checkout), clean and between tasks. **Base commit:**
`daa1bdb`. **Contract:** Cairn Contract v0.8.0.

**Why this is its own task.** The contract says the `CURRENT MILESTONE` fact
changes only inside a task whose report names the evidence that moved it, in the
same commit as that task's records, and never edited in on its own. Task 268 is
the evidence, but its records are history now and must not be rewritten — so
moving the milestone is a new task, not an amendment to that one.

**Whose decision this is.** Whether the milestone truly moved is the owner's
call, and the owner made it. Task 268's LOG row carries `Milestone moved? NO`,
which is correct and stays: that column carries **the worker's** answer, and the
worker — Codex Exec, asked to fix a title bar — had no way to know its run was
the first end-to-end loop on Cairn itself. This task does not rewrite that row.

## The requested visible outcome

Someone opening this project's records sees three true things: that the loop
milestone was reached, exactly what evidence reached it, and what the project is
aiming at next.

## The evidence being claimed

**Task 268**, commit `daa1bdb`, authored by Cairn's own runtime, records a
complete loop on Cairn's own repository:

- **request** — the owner's exact words kept verbatim and marked authoritative;
- **pushback** — a concern raised and then set aside by the owner, retained in
  the record as context rather than as a requirement;
- **dispatch** — a real paid worker call, Codex Exec on OpenAI / gpt-5.6-sol;
- **verified DONE** — protected starting work byte-identical, files changed read
  from Git rather than from the worker's claims, one exact-path commit, and only
  bounded numeric worker evidence retained;
- **honest explanation** — each requirement labelled "You said so" or "Cairn
  chose", with the latter stated plainly as *not* evidence of owner preference.

The result card and the conductor's commentary — the last clause of the
milestone — were seen by the owner in the running app. They live in the
conversation rather than in the task records, so this task records them as the
owner's confirmation and does not claim to have verified them from disk.

## The next milestone, and where it comes from

**It is not invented here.** `docs/ai-work/PROJECT.md` already records the
owner's accepted next direction, adopted 2026-07-31: *the mobile groundwork —
Cairn from the owner's phone on the home network, full approval parity — from
the phone, pair once, converse, and take one full task through dispatch
approval, verified DONE, and the push decision.* This task promotes that
recorded direction into the `CURRENT MILESTONE` fact, in the voice the other
milestones use.

The shipped companion is LAN-only and **read-only after pairing** today, so the
full-parity direction is accepted and unbuilt — which is what makes this a
forward milestone rather than a description of what already works.

## The boundary of intent — what must not change

- **No product file.** Nothing under `app/src/**`, `core/**`, `cli/**`, IPC,
  preload, stores, the phone page, package manifests or lockfiles. This task
  changes records only.
- **No test.** If a check fails, that is a finding to report, not a test to edit.
- **The contract's rules.** Only the project-facts block of `AGENTS.md` changes,
  and only its `CURRENT MILESTONE` line. `CONTRACT-TEMPLATE.md`,
  `cairn.html` and `core/assets/contract.md` are untouched — the two build
  artifacts are gitignored and are never staged.
- **History.** Task 268's brief, report and LOG row are history and are not
  rewritten, including its `Milestone moved? NO`.

## Checks

1. **`c1` — `AGENTS.md` states the new milestone and nothing else moved.** The
   diff of `AGENTS.md` is exactly one line, inside the project-facts block.

2. **`c2` — the contract mirrors still match.** `contract-mirrors.test.mjs`
   passes. It blanks the first fenced project-facts block by design, so a
   milestone change is excluded from the comparison — this check proves that
   holds in fact rather than in reasoning.

3. **`c3` — `PROJECT.md` records what was reached and what is next.** The
   achieved milestone moves into the milestone history with its task number and
   commit; the current milestone becomes the recorded next direction.

4. **`c4` — the evidence named is real and says what is claimed.** Commit
   `daa1bdb` exists, contains `docs/ai-work/tasks/268-report.md`, and that
   report names the Codex Exec route, the Git-verified file list, and the
   set-aside concern. Verified by reading, not by memory.

5. **`c5` — no product file and no test changed.** `git status` over
   `app/src`, `core`, `cli` and every test directory is empty, and the unit
   suites are unaffected because nothing they read changed.

6. **`c6` — records and Git protection.** This brief is committed alone to claim
   the number; the completion commit stages only this task's exact paths by
   name; one LOG row, appearing exactly once; nothing cleaned, stashed, reset,
   broadly staged or history-rewritten.

## What DONE and STOPPED mean here

**DONE** means `c1`–`c6` hold: the records state a reached milestone with real
evidence and a named next one, the contract's rules are byte-identical, and no
product file or test moved.

**STOPPED** means any of these, stated plainly: the mirror test fails, meaning
the project-facts exclusion does not work as the file claims; the evidence in
Task 268 does not support the claim being made; or a product file would have to
change to make a record true.
