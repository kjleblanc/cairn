# Task 256 brief - refresh the overhaul handoff so it starts Slice 2, not Slice 1

**Lane:** A (the main checkout). **Base commit:** `d9df42d`.

## Requested visible outcome

`docs/ai-work/HANDOFF-resident-program-visual-overhaul.md` currently starts
Slice 1, which finished and was owner-approved at commit `d9df42d`. Anyone who
opens it today is told to do work that is already done, against a task number
that is 25 short. The owner asked for it to start Slice 2 instead.

After this task the handoff is a living document rather than a one-shot note:
it opens with a short ledger saying which slices of the eleven are finished and
where the overhaul stands, and then carries one copy-ready prompt for the next
slice only. A fresh conversation can be started from it without reading this
one, and a reader who arrives three slices later can tell at a glance that it is
current.

The Slice 2 prompt it carries must make three things unmissable, because they
invert or extend what Slice 1 was allowed to do:

- Slice 2 **edits production code** under `app/src/**`. Slice 1 was forbidden to.
- Its Playwright scenarios **do** need the app-token mutex. Slice 1's did not.
- There is **no owner gate** in Slice 2; Owner gate 2 falls at the end of Slice 4.

It must also carry forward the three hazards Task 255 recorded — a Playwright
config with no `outputDir` destroying another task's evidence, a PowerShell
round-trip corrupting a source file, and an edited assertion that was never
re-run — so the next lane inherits them as warnings rather than rediscovering
them.

## Boundary of intent

- **Documentation only.** No renderer, Main, Core, CLI, phone, package,
  configuration, test, stored project, or generated application data changes.
- This task does not begin Slice 2, does not preclaim its task number, and does
  not treat the refreshed handoff as approval to cross any later owner gate.
- The plan at `docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`
  is the authority and is **not** edited here. The handoff points at it and must
  not contradict it or restate a decision it does not contain.
- Preserve history: Task 230 wrote the original handoff and Task 255 closed
  Slice 1. Neither record is rewritten, and no earlier LOG row or task file is
  touched. Replacing the handoff's body is the requested outcome; erasing what
  it documented is not, so the ledger keeps the finished slices visible.
- Exact paths: this task's brief and report, one LOG row, and
  `docs/ai-work/HANDOFF-resident-program-visual-overhaul.md`. Nothing else.
- Protect every tracked, staged, modified and untracked path, including other
  lanes' work and untracked evidence under `app/test-results/`. Stage by exact
  name. Never clean, stash, reset, broadly stage, or rewrite history.
- No dependency install, provider or model call, credential use, paid call,
  external write, push, publication or deployment.

## Checks

1. **`c1` - the handoff starts Slice 2 and cannot be mistaken for Slice 1.** Its
   status ledger names Slice 1 as DONE at `d9df42d` under Task 255 and names the
   owner's Gate 1 approval. No instruction anywhere in the file asks for Slice 1
   work, and the single copy-ready prompt it carries is Slice 2's.
2. **`c2` - the prompt can safely start a fresh conversation.** It names the
   plan and the Task 255 report as required reading, requires a preflight that
   re-derives the lowest free task number rather than trusting one, requires
   owner confirmation that Lane A is free, states the visible finish line and
   the exact paths Slice 2 may touch, names its preserve list and its stop
   conditions, and authorises only Slice 2.
3. **`c3` - the three posture changes and the three inherited hazards are
   explicit.** Production-code editing, the app-token mutex, and the absence of
   an owner gate each appear as their own statement. The `outputDir`, encoding
   round-trip and unrun-assertion hazards each appear with what went wrong.
4. **`c4` - the file agrees with the settled repository.** Every path, commit,
   task number, script name and command it names is checked against the tree at
   `d9df42d` rather than remembered, and every statement it makes about the plan
   is checked against the plan's own Slice 2 section.
5. **`c5` - records and Git isolation are exact.** The final diff and status
   contain only this task's brief, report, LOG row and the handoff. The report
   answers every id above; one LOG row is appended; one exact-path completion
   commit follows the separate brief-only claim commit.

## DONE and STOPPED

**DONE** means checks `c1`-`c5` pass, the handoff starts Slice 2 with a
copy-ready prompt a fresh conversation can use unaided, its ledger shows where
the overhaul stands, no product source or historical record changed, and the
main checkout is left clean.

**STOPPED** means the refresh would require guessing an owner decision,
contradicting the saved plan, restating a decision the plan does not contain,
weakening a product or safety contract, or overlapping another lane's work; or
the file cannot be isolated in its own commit.

Slice 2 itself does not begin in this conversation.
