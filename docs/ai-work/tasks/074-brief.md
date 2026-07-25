# Task 074 — Brief

Requested visible outcome: Phase 3 Task 11 — the push chip and the contract's
pause. After a DONE result card posts into the conversation, Cairn offers a
plain nudge that local commits are waiting; pressing it opens a confirmation
that discloses the exact target, the exact effect, and the recovery plan;
pressing Push on that confirmation runs one plain `git push` and the outcome
is reported honestly, whatever it was.

This is the one place in Phase 3 where Cairn writes to the world outside the
owner's machine.

Details (verbatim from the plan, `Task 11` of
`docs/superpowers/plans/2026-07-24-cairn-phase3-full-atom.md`):

> After a `disposition === "DONE"` result card renders, Chat calls
> `pushPreview`; `ahead > 0` renders the chip:
> `This project is {ahead} commits ahead of {remote}. Push?` Press →
> confirmation panel: target (`{remote} — {url}`, branch), effect (the exact
> commit subjects + "Pushing publishes these commits. On a public repository
> they become publicly visible."), recovery ("A pushed commit can be reverted
> by a new commit. Publication itself cannot be recalled."), Push / Not now.
> Approve → `pushExecute` → honest outcome inline. STOPPED/ERROR cards never
> evaluate the chip; null preview renders nothing. No conductor channel.

## Why the two presses are not one

This is a governance requirement, not a convenience. `CONTRACT-TEMPLATE.md`,
"Concrete risk boundaries", requires that immediately before writing to an
external service or using a credential, the owner is shown the exact target,
effect, likely cost or exposure, and recovery plan — and that Cairn proceeds
only after the owner clearly approves **that exact action**. The design's
first draft had the chip push on one press; the owner-approved spec
(`docs/superpowers/specs/2026-07-24-cairn-phase3-full-atom-design.md`,
Chunk 5) revised it to chip → confirmation → push precisely because one press
did not satisfy that rule. The chip is the nudge, the confirmation IS the
pause, and the press on the confirmation is the approval.

## The fixture, corrected by the plan's review

A `CAIRN_MOCK` DONE run commits NOTHING — `task:run` never passes
`commitRecords` on that lane — so a fixture whose upstream already holds the
scaffold is ahead 0 after a DONE run and the chip correctly never renders.
Setup therefore pushes the scaffold to a bare `file://` upstream and then
makes exactly ONE extra local commit that is never pushed. Ahead is then
exactly 1, and the chip copy must read in the singular ("1 commit ahead", not
"1 commits ahead").

## Checks that will show the outcome landed

- A DONE card grows a chip that names the real count in the singular; pressing
  it does not push (verified against git, not the screen) and opens a
  confirmation carrying the remote, the URL, the branch, the exact commit
  subject, the publication sentence, and the recovery sentence.
- "Not now" leaves the project byte-identical and the nudge still standing.
- Push on the confirmation really pushes: the upstream ends up holding the
  commit and the ahead count drops to 0.
- A refused push (the upstream carries a commit this project lacks) reports
  git's real reason in plain words, claims nothing that did not happen, and
  leaves HEAD and the ahead count exactly as they were.
- A STOPPED run's card never evaluates the chip, even though the same local
  commit is waiting the whole time and `pushPreview` would offer it.
- `npm run typecheck`, `npm run test:unit` (app), `npx playwright test` (app),
  `cd core && npm test` — all green. No `core/` changes.

DONE means: nothing leaves this machine without a disclosure of that exact
action immediately before it, and the outcome reported afterward is the one
that happened. STOPPED means a press can publish something the owner was not
shown, or a card that verified nothing can offer to publish.
