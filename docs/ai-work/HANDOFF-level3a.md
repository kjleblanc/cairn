# Handoff — Level 3a worker adapter, mid-build (2026-07-29)

**Read first (in this order):** `AGENTS.md` (v0.4.0, two-lane rules),
`docs/superpowers/plans/2026-07-29-cairn-level3a-worker-adapter.md` (the plan
being executed), the spec
`docs/superpowers/specs/2026-07-28-cairn-kimi-cli-body-worker-design.md`
**including both amendments** (Decision 6 replacement; Task 106 spike
findings — the only source of Kimi CLI facts), and the latest LOG rows.

## Where things stand

- Level 3 design approved by owner; Decision 6 (owner direction): every
  multi-worker dispatch asks the owner which worker to use, with Cairn's
  suggestion + reason shown.
- Spike done (Task 106): Kimi Code CLI 0.29.2 installed at
  `C:\Users\KenJL\.kimi-code\bin\kimi.exe`, owner signed in via OAuth.
  All six questions answered by observation — see spec amendment.
- Plan written (Task 112): six tasks. **Plan Task 1 DONE (Task 113,
  commit 2bb8ef0):** `core/src/kimi.ts` detection half + 9 tests.
  115/115 core, 9/9 cli green.
- This lane is A (main checkout). A parallel lane works the renderer
  visual layer; check `git log`, `git status`, and `docs/ai-work/tasks/`
  for the highest claimed number before claiming the next one (claim by
  committing the brief). Highest landed so far: 114 (parallel lane).

## Next: plan Task 2 — the exec process (core)

Per the plan: `KimiExecRequest` (prompt separate from args; appended at
spawn, `KIMI_PROMPT_TOO_LONG` past 24,000 chars, refused pre-spawn),
`createSystemKimiExecProcess` spawning
`kimi -p <prompt> --output-format stream-json -m kimi-code/kimi-for-coding`,
codex-shape watchdogs (600 s inactivity / 3 600 s absolute, tree kill,
force-settle, redacted debug copies as `kimi-*.jsonl`), and the stream-json
parser built **only from spike-observed lines**: assistant content (last
wins = finalMessage), assistant tool_calls (count), role:tool (matching),
role:meta (debug only), malformed → error, oversized → drop + null
finalMessage. No token fields (none observed). Red-first in
`core/test/kimi.test.ts`, transcripts from the spike (PONG; echo-tool
sequence) as fixtures. Then plan Task 3 (disclosure/authorization/factory,
priority 90, shared `REAL_MODEL_CALL_NOT_AUTHORIZED`), Task 4 (app wiring +
fake-kimi fixture), Task 5 (Decision 6 chooser + suggestion — coordinate
with the parallel lane, it touches dispatch renderer code), Task 6 (close,
0.5.0).

## Rules that bite

- **No suite may invoke the real Kimi CLI** — a signed-in one exists on
  this machine. The test-lane guard (`CAIRN_TEST_LANE=1` requires
  `CAIRN_FAKE_KIMI=1`) lives in `core/src/kimi.ts` resolution; keep it,
  keep its test.
- Wire pins only: assert argv/JSON-RPC actually sent, never helper returns.
- Owner approvals are per-action: any real CLI invocation, install, or
  quota spend pauses first. Owner is a beginner — plain language.
- Windows: spawn cwd must exist (ENOENT otherwise); `.cmd` shims via
  ComSpec; this shell lacks ComSpec (bare `cmd.exe` works, but probes
  spawn with real cwd).
