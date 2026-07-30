# Notes — Workflow Docs

**What it is:** The "Repo-First AI Workflow Kit" — a portable, exportable reference for running AI-assisted software work with repository truth, accepted briefs, Explore/Promote modes, and honest STOPPED closes. This is the **predecessor framework** to Cairn's current contract.

**Status / milestone:** Reference / documentation kit. Not a governed project.

**Doc health:** Good internal consistency. The three files cross-reference each other correctly:
- `README.md` — overview, three roles, five non-negotiables, proof boundaries, vocabulary, Mermaid flowchart.
- `PROJECT-KICKOFF.md` — guide for starting a new project with Core/Verified/Forensic levels, copy/paste prompt library.
- `PROJECT-CONVERSION.md` — guide for migrating an active repository, with audit stages, dry-run matrix, and stop/rollback rules.

**Staleness / drift:**
- These docs describe a **different workflow** from Cairn's current contract:
  - Uses "Explore" and "Promote" modes instead of Cairn's continuous "Work on:" task flow.
  - Uses three-digit "sessions" instead of three-digit "tasks."
  - Emphasizes generated receipts, exact-close Git rules, and forensic custody.
  - Commands reference `npm run orient`, `CLAUDE.md`, and `AGENTS.md` as bootstrap files.
- The README explicitly warns: "Do not copy scripts blindly. `npm`, Node, `CLAUDE.md`, three-digit sessions, exact-close Git ancestry, and RunWithFriends' verifier schemas are examples from one repository, not portable law."
- `PROJECT-KICKOFF.md` and `PROJECT-CONVERSION.md` contain the phrase "Cairn-v1.0/PROJECT-CONVERSION.md" in one reference, confirming they predate the 0.0.1 reset.

**Missing pieces:**
- No `AGENTS.md` (correct — this is a kit, not a project).
- No `CHANGELOG.md`.
- No version number in the kit itself.

**Surprising:**
- The README explicitly states that RunWithFriends is governed by `root CLAUDE.md`, not by this kit. This confirms the kit is a reference, not a source of law.
- The kit's philosophy (repository truth before chat memory, owner accepts exact brief, independent review) is spiritually aligned with Cairn, but the mechanics are different. Cairn's current contract is simpler and more beginner-friendly; this kit is more rigorous and more complex.
