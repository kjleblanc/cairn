# Notes — cairn-eval

**What it is:** Bookshelf — a simple website where the owner can list books they own and mark the ones they have finished.

**Status / milestone:** ACTIVE. Current milestone: "I can add a book without opening any files myself."

**Doc health:** Minimal but consistent. `AGENTS.md`, `docs/ai-work/PROJECT.md`, and `docs/ai-work/LOG.md` all agree on project name, goal, and milestone.

**Staleness / drift:**
- **Critical:** `AGENTS.md` is **Cairn Contract v0.2.0** — significantly behind the workspace's v0.4.0. Missing features include:
  - The two-lane working protocol
  - The connected conductor (v0.1.0+)
  - The envelope-authored result relay and result card (v0.2.0+ actually has this, but v0.3.0+ has details channel)
  - The push button (v0.3.0)
  - Constitution v2 / v3 (v0.3.0 / v0.4.0)
  - The `Milestone moved?` column semantics (v0.3.0)
- Last task completed: Task 005 on 2026-07-26. That is **3 days ago** with no new activity. The project may be dormant or waiting for owner direction.
- Task 004's log row includes the parenthetical "(worker claim; files verified against Git by Cairn)" — this indicates an envelope-dispatched run, which is a v0.2.0+ feature, so the contract was at least partially functional.

**Missing pieces:**
- No `README.md`.
- No `CHANGELOG.md`.
- No `EVERYDAY-WORKFLOW.md` or `PROJECT-KICKOFF.md`.
- Only 5 tasks in the log; no task files were copied to staging (the `tasks/` dir may be empty or we didn't reach it).

**Surprising:**
- Task 001 moved the milestone ("home page lists every book" marked YES), but the current milestone in PROJECT.md is still "I can add a book without opening any files myself." This suggests either the milestone was not updated after Task 001, or the milestone description evolved.
- Task 005 was an offline routing demonstration that explicitly did NOT attempt the requested product change. This is an honest STOPPED-in-spirit entry disguised as DONE (the log says DONE, decision completed, but the summary says "requested product change not attempted").
