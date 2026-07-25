# Task 074 — Report

Phase 3 Task 11: the push chip and the contract's pause. Three files changed,
all in `app/` — `src/renderer/screens/Chat.tsx`, `src/renderer/app.css`,
`tests/conductor.spec.ts`. No `core/` change, no IPC change, no new main-process
code: Task 072/073 already landed `pushPreview` / `pushExecute` behind
`push:preview` / `push:execute`, and this task is the screen that uses them.

## What changed

**`app/src/renderer/screens/Chat.tsx`.** A `PushFlow` state (`preview`, one of
six phases, and the settled `PushResult`) and a `PushFlowView` that renders one
element at a time directly under the DONE card that prompted it:

- **chip** — a single button whose whole label is the nudge:
  `This project is 1 commit ahead of origin. Push?` The count is singularized
  by `aheadPhrase`, so Cairn never miscounts out loud. The word "verified"
  appears nowhere near it: the envelope did not verify the owner's own commits
  and does not claim to.
- **confirmation** — `Target: {remote} — {url}`, `Branch: {branch}`, the exact
  commit subjects as a list, then the two fixed sentences ("Pushing publishes
  these commits. On a public repository they become publicly visible." and
  "A pushed commit can be reverted by a new commit. Publication itself cannot
  be recalled."), then **Push** and **Not now**.
- **outcome** — `summary` on success, `message` on failure, verbatim from
  `pushExecute`. Nothing is re-derived, re-worded, or softened.

The trigger is one effect keyed to the newest envelope card in view. It fires
only when that card's `disposition === "DONE"`; a STOPPED or ERROR card clears
the flow **without asking git anything at all**. A null preview (no upstream)
and an `ahead` of 0 both render nothing.

**`app/src/renderer/app.css`.** Nine lines: the chip, the confirmation panel,
its fact list and subject list, and the outcome block, all built from the
existing card and pill tokens.

## Decisions worth naming

**The chip's press re-reads git.** The confirmation is the contract's pause, so
the facts it shows have to be true at the moment of approval — not a snapshot
taken when the card landed, which a commit made in between would silently have
outgrown. Pressing the chip therefore runs `pushPreview` again (local,
network-free) and opens the panel on the fresh answer. If the project is no
longer ahead, the panel says exactly that and offers no Push button. This is
one local git read beyond the plan's literal text, taken deliberately: without
it, "approves that exact action" would be approval of a possibly-stale list.

**One push per approval, and no way to ask for a second.** A ref guard blocks a
second press while `git push` is running; both controls disable during it; and
the settled state carries no control at all. Cairn never offers a retry —
`pushExecute`'s own failure messages tell the owner to try the push again
themselves, which is a new decision and gets a new pause.

**The carried finding from Task 073, handled.** `pushExecute`'s `other` bucket
appends git's own first stderr line, which can contain a local absolute path
(on Windows, one carrying the user's name). Task 074 is where that string first
reaches a screen. It is **kept** — a real error in git's own words beats a
falsely generic sentence, and the app's existing plain-message idiom already
works this way — and it is **labeled**: when and only when `kind === "other"`,
the outcome block adds a quiet line reading "The sentence above ends with git's
own words about this failure, quoted as git reported them." The label keys off
the structured `kind`, never off parsing the sentence back apart, so no string
constant is duplicated across the process boundary. The second half of the
finding — that this project's own convention quotes owner-facing strings
verbatim into committed reports — is honored here by describing the shape
(`The push did not complete. <git's first stderr line>`) instead of pasting a
real machine path into this file.

**No conductor channel.** Nothing in the flow sends, streams, or persists a
turn. The model is never told a chip exists, never asked whether to push, and
never shown the result.

## Test-first evidence

Written before the implementation, and the RED was a real assertion failure:

```
Error: expect(locator).toBeVisible() failed
Locator: locator('.push-chip')
Expected: visible
Timeout: 15000ms
Error: element(s) not found
```

That is the chip test, failing 19.6s in — after the DONE card had already
rendered — so the fixture was proven working before the feature existed.

The two other tests assert absences and honest wording, which a missing feature
cannot fail. Both were shown to discriminate by staging a defect and observing
the failure:

- **DONE-only trigger.** Removing `latestCard.disposition !== "DONE"` from the
  effect's guard made the STOPPED card grow a chip:
  `expect(locator).toHaveCount(expected) failed — Locator: locator('.push-chip'), Expected: 0, Received: 1`.
  Restored, the test passes.
- **Honest failure outcome.** Replacing the rendered `result.message` with a
  generic "The push did not complete." made the refused-push test fail on the
  real sentence: `Received string: "the pushThe push did not complete."`
  Restored, the test passes.

## The three new Playwright tests

1. **`a DONE card offers the push chip, and the chip's press opens the contract's pause instead of pushing`** — mock lane. Asserts the singular chip copy by exact accessible name and asserts `1 commits` is absent; asserts the confirmation carries `origin — file:///…`, the branch, the exact commit subject, and both fixed sentences; asserts against git (not the screen) that the first press published nothing; presses **Not now** and asserts the project is untouched and the nudge is back; then approves and asserts the real push landed — ahead drops from 1 to 0 and the bare upstream's tip is the expected subject.
2. **`a refused push reports the real reason and leaves the project exactly as it was`** — a second clone advances the upstream first, so the one push is refused. Asserts the real remote-ahead sentence, asserts "Pushed" is absent, and asserts HEAD, the ahead count, and the upstream tip are all unchanged. This is the proof that a refusal is neither retried nor forced.
3. **`a stopped run never evaluates the push chip, with a real local commit waiting the whole time`** — fake-codex slow lane, stopped by the owner. Reads `pushPreview` through the renderer and asserts `ahead === 1`, so the absent chip is a decision about the disposition rather than an accident of an empty repository; waits for the conductor's comment on the card, which lands strictly after it, so the assertion is taken well past any moment a chip could have appeared.

The fixture is the plan's corrected recipe: the scaffold is pushed to a bare
`file://` upstream, then exactly one extra local commit is made and never
pushed. The mock lane commits nothing, so `ahead` is exactly 1 when the DONE
card posts. `conductor.spec.ts` continues to detach and restore the stored
provider connection around the whole file, so no test in it can reach a real
key.

## Verification

- `npm run typecheck` (app) — clean.
- `npm run test:unit` (app) — **59 / 59**, unchanged.
- `npx playwright test` (app) — **38 passed** (35 before, 3 new), one clean run.
- `cd core && npm test` — **104 / 104**. No `core/` changes.

## Limitations and remaining human judgment

- The **no-remote** and **auth** outcome renderings are not exercised
  end-to-end. Both are covered at unit level in `app/tests-unit/push.test.ts`
  (Task 072), and the renderer treats every failure kind identically apart from
  the `other` label, so the untested part is a class the tested paths already
  represent. The plan's own test note scopes auth to unit level for the same
  reason.
- The "no longer ahead" panel — shown when the press-time re-read finds nothing
  to push — has no automated test. It is a defensive branch for a race whose
  window is a fraction of a second.
- If a brand-new DONE card were to arrive in the seconds while a push is in
  flight, the flow would be replaced and that push's outcome would not be shown
  on screen. The push itself is unaffected, and nothing false is displayed. The
  window requires a run dispatched and completed inside one `git push`.
- The chip is re-evaluated when a DONE card is read back on reload, not only
  when one is freshly posted. The count is a live git fact, and dropping a true
  nudge because the screen was rebuilt would lose it for good. This is a
  superset of the plan's "after a DONE card posts" and is stated here rather
  than left to be discovered.
- Milestone movement: NO. Phase 3's milestone closes with the constitution, the
  contract amendment, and the 0.3.0 version close still ahead.

Disposition: DONE
