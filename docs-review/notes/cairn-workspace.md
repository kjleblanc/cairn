# Notes — Cairn (workspace)

**What it is:** Cairn, an AI conductor with a desktop app, portable contract, and swappable worker adapters, so people with zero coding experience can build real software safely.

**Status / milestone:** ACTIVE. Contract v0.4.0. Current milestone: "one conversation on Cairn itself runs request → pushback → dispatch → verified DONE → honest explanation, delivered as the envelope's result card with the conductor's commentary."

**Doc health:** Excellent. All canonical files agree on version, mechanics, and status:
- `AGENTS.md` == `CONTRACT-TEMPLATE.md` (with project facts filled in)
- `README.md` accurately reflects current capabilities (conductor, two lanes, Codex Exec, offline mock, push button)
- `CHANGELOG.md` is current through 0.4.0 with honest, detailed entries
- `MAINTAINERS.md` correctly describes mirror system, versioning, and two-lane discipline
- `EVERYDAY-WORKFLOW.md` is up to date with two-lane wording
- `docs/ai-work/LOG.md` shows 129 completed tasks (001–129), most recent dated 2026-07-29
- `docs/ai-work/PROJECT.md` matches the milestone stated in `AGENTS.md`

**Staleness / drift:**
- No significant staleness detected in canonical docs.
- Task 130 has a brief (2026-07-29) but no report yet — it is in flight.
- `docs/legacy/` contains pre-reset history (tasks 000–047, contracts v1.0–v3.0) and is appropriately archived. The pre-reset state is pinned at git tag `legacy-v3.0`.
- One minor note: `MAINTAINERS.md` still references `cairn.html` as a contract mirror maintained by hand; the current contract-mirror test covers template ↔ core asset ↔ app resource, with `cairn.html` as a manual fourth mirror. This is documented honestly.

**Missing pieces:**
- No `docs/ai-work/tasks/130-report.md` yet — expected, task is open.
- No `EVERYDAY-WORKFLOW.md` mirror in `docs/legacy/` (not needed; it did not exist pre-reset).

**Surprising:**
- The pace is extraordinary: 129 tasks in roughly 7 days (2026-07-22 to 2026-07-29), including a full formal reset, conductor v0, Phase 2 core surgery, Phase 3 full-atom, Phase 4 design, town-square workspace, two-lane protocol, and Level 3a worker adapter planning.
- The two-lane protocol is already stress-tested: task-number collisions occurred (126/127 double-claim) and were resolved by renumbering, with full disclosure in reports.
- The project develops itself through its own workflow — a genuine self-hosting loop.
