# Cairn changelog

The contract version lives in the header of `CONTRACT-TEMPLATE.md` and in every
project's `AGENTS.md`. To bring a project up to date, follow "When Cairn updates" in
[EVERYDAY-WORKFLOW.md](EVERYDAY-WORKFLOW.md) — updates are approved by you, never
automatic.

## Contract v1.2 — 2026-07-17

- Added the work log: every closed task appends one row to `docs/ai-work/LOG.md`,
  and the AI reads the last few rows when orienting a new chat. Setup creates the
  file.
- The Cairn app can now connect a project folder (Chrome/Edge, read-only): it shows
  your real recent work, stacks stones from actual DONE outcomes, and generates a
  "Share your cairn" snippet.

## Contract v1.1 — 2026-07-17

- Every prompt that stops for approval now names the exact message that resumes it,
  so the AI points you to the right next step instead of improvising its own
  approval question.
- A casual "yes" no longer counts as approval to build — only the scripted approval
  message does.
- The contract header carries the framework's home
  (https://github.com/kjleblanc/cairn) so any AI or human can find the full guides.

## Contract v1.0 — 2026-07-16

- First public release: the Define → Build → Verify → Decide loop, the eight owner
  commands, Tiny / Standard / High-Stakes lanes, Draft and Final, honest DONE and
  STOPPED, the Direction Gate, the five-task pilot, and always-on protections for
  existing work, secrets, and explicit authority.
