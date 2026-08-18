# Task 270 brief — Slice 7's owner gate 3, answered

**Lane:** A (the main checkout), clean and between tasks. **Base commit:**
`acd7489`. **Contract:** Cairn Contract v0.8.0.

**Why this is its own task.** Task 267 shipped Slice 7 and completed DONE with
owner gate 3 explicitly unanswered — its report says so, and says the task's
disposition did not depend on it. The owner has now answered. Task 267's records
are history and are not rewritten, so the verdict is recorded here.

**Where it is NOT recorded.** Nothing is written under `docs/ai-work/verdicts/`.
That tree belongs to the owner-verdict design being built on another branch at
contract v0.9.0, where it is a reserved path a lane must never write to. This
project's contract is v0.8.0 and has no such tree; a normal task record is the
right and only place.

## The requested visible outcome

The project's records say that Slice 7's owner gate was put in front of the
owner, what the owner was actually shown, which five decisions were put to them,
and what they answered — so a later session can see the gate is cleared without
asking anyone.

## What the owner was shown

One complete route through a disposable fixture project and an isolated test
profile, captured from the real built app at 1320 × 980 through the local fake
conductor: connected desk → question → answered question → proposal carrying a
concern → its attributed request rows → concern set aside → dispatch checkpoint
→ working → **VERIFIED DONE receipt** → both provenance disclosures open →
Cairn's commentary turn → follow-ups. Twelve stages, in order, in a single
conversation, plus three of them after dusk.

Task 267's own captures showed the result end only. The gate asks whether the
workflow **reads as one Cairn conversation**, which endpoint captures cannot
answer, so a second harness walked the whole route and was deleted afterwards.

## The five decisions put to the owner

- **d1** — the disposition is a word with a geometric mark, not a coloured pill.
- **d2** — provenance is stated in the summary line, in small uppercase; it is
  the lowest-contrast text in the conversation at 4.77:1 against a 4.5 floor.
- **d3** — every control on the paper is flat, at least 44 × 44, and never fades
  when disabled.
- **d4** — nothing in the result family arrives with motion any more.
- **d5** — the registration rule is a real left border in the surface's semantic
  ink.

## The boundary of intent

- **No product file, no test, no stylesheet.** This task changes records only.
  If the verdict had been a rejection, the change would have been a separate
  task with its own checks.
- **No contract change.** `AGENTS.md` and its mirrors are untouched.
- **History.** Tasks 267, 268 and 269 are not rewritten.
- **Nothing under `docs/ai-work/verdicts/`.**

## Checks

1. **`c1` — the verdict is recorded in full.** The report names all five
   decision ids, states the owner's answer to each, and names who answered.
2. **`c2` — the evidence the owner judged from is named and still exists.** The
   capture set is on disk at the path the report gives, and the count matches
   what the report claims. `app/shots/` is gitignored, so the report says that
   plainly rather than implying the images are in the commit.
3. **`c3` — Task 267's records are unchanged.** `git diff` of
   `docs/ai-work/tasks/267-*.md` against `a7a9b83` is empty.
4. **`c4` — no product file, no test and no contract file changed.**
   `git status` over `app/src`, `app/tests`, `app/tests-unit`, `core`, `cli`,
   `AGENTS.md`, `CONTRACT-TEMPLATE.md` and `cairn.html` is empty.
5. **`c5` — records and Git protection.** Brief committed alone to claim the
   number; completion commit stages only this task's exact paths by name; one
   LOG row appearing exactly once; nothing cleaned, stashed, reset, broadly
   staged or history-rewritten.

## What DONE and STOPPED mean here

**DONE** means `c1`–`c5` hold and the records now carry the gate's outcome.

**STOPPED** means the evidence the verdict rests on cannot be found where the
report says it is, or recording the verdict would require changing a file
outside this task's boundary.
