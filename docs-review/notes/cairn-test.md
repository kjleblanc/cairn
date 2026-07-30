# Notes — cairn-test

**What it is:** Test Project — "An app where you drop a ball onto the floor."

**Status / milestone:** ACTIVE. Current milestone: "The ball falling on the floor."

**Doc health:** Extremely minimal. `AGENTS.md` and `docs/ai-work/PROJECT.md` agree. `docs/ai-work/LOG.md` exists but is empty (only the header row). `docs/ai-work/PILOT.md` exists but is also empty (only header).

**Staleness / drift:**
- **Critical:** `AGENTS.md` is **Cairn Contract v1.2** — this is the **legacy pre-reset framework contract**, not the post-reset Cairn contract. It uses a completely different vocabulary and workflow:
  - Commands: `Define a task:`, `Tiny change:`, `I approve the brief at [path]. Build it.`, `My decision for task [N]:`, `Direction check:`
  - Three lanes: Tiny / Standard / High-Stakes
  - Modes: Explore / Promote
  - Artifacts: receipts, exact-close Git rules, blocker keys
  - Pilot table in `PILOT.md`
- This contract lineage was **retired** in Cairn 0.0.1 (2026-07-22). The workspace's current contract (v0.4.0) uses entirely different commands: `Work on:`, `Continue task NNN.`, `How do I try it?`, `Review task NNN.`
- The project has **zero completed tasks** despite being ACTIVE.

**Missing pieces:**
- No `README.md`.
- No `CHANGELOG.md`.
- No task records at all.
- No `EVERYDAY-WORKFLOW.md` or `PROJECT-KICKOFF.md`.

**Surprising:**
- This project appears to be a test artifact or a failed conversion from the pre-reset era. It is using a contract format that no longer exists in the canonical Cairn workspace.
- The empty LOG and PILOT tables suggest the project was set up but never actually used.
