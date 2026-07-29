# Task 124 report — Pin Kimi K3, clarify the picker, open the add-a-model path

## Requested visible outcome

From `docs/ai-work/HANDOFF-model-picker.md` (owner decisions 2026-07-29): pin
Kimi K3 as the recommended brain, simplify the model picker by making it
clearer (not smaller), and give "the model I want isn't listed" a first-class
path that becomes a Cairn task. Full brief: `124-brief.md` (claimed as 123 in
046186a, renumbered by 5f53b60 after the double-claim described below).

## What actually changed

- `app/src/renderer/bodies.ts` — new first entry `moonshotai/kimi-k3` ("Kimi
  K3") carrying `recommended: true`, blurb "Kimi's newest model; a long chat
  usually costs a few dimes — about five times K2's price." K2 stays,
  un-pinned, its cents blurb intact. `Body` gains a required `billing`
  field; every entry names how it bills in plain words (OpenRouter seats:
  "Bills per use — key from openrouter.ai"; subscription seat: "Uses your
  membership's coding quota — key from the Kimi Code Console"). The Kimi
  seat's blurb drops its key-source clause (now the billing line's job) and
  keeps the quota truth byte-relevant to connect-kimi.spec. The catalog
  comment records the 2026-07-29 re-verification.
- `app/src/renderer/components/ConnectCard.tsx` — picker intro now says the
  list is "a starting point, not a fence"; every row renders its billing
  line; new picker item "The model I want isn't listed…" opens a fourth
  panel (`add`) naming both doors (Custom… now, a Cairn task once connected)
  with the exact sentence to send (`ADD_MODEL_REQUEST`) in a selectable box
  plus a clipboard copy button with a "Copied ✓" flip and a rejection-safe
  fallback; the Kimi guide gains the CLI truth ("Cairn can't borrow that
  sign-in yet — the console key above is the way today"); the custom-model
  placeholder becomes `e.g. moonshotai/kimi-k3`; the component doc comment
  records the task.
- `app/src/renderer/app.css` — two rules: `.brain-item-billing`,
  `.add-model-sentence`.
- `app/tests-unit/bodies.test.ts` — new pin: every body has a non-empty
  billing line under 100 chars (written red-first; failed compile before the
  implementation landed).
- `app/tests/conductor.spec.ts` — both placeholder pins move to kimi-k3; the
  connect test now asserts K3 on the default card, all five curated names,
  the Recommended tag, both billing lines, and walks the not-listed panel
  (sentence visible, copy click flips to "Copied ✓", Back returns).
- `app/tests/connect-kimi.spec.ts` — asserts the seat's billing line in the
  picker and the CLI-truth line in the guide.
- `docs/ai-work/tasks/124-brief.md`, this report, `docs/ai-work/LOG.md`.

`app/src/main/conductor/consent.ts` untouched (host split already honest).
No behavior, IPC, core, CLI, contract, or dependency changes. Screenshots
(untracked scratch, like previous tasks): `design/attachments/task-123-*.png`
— connect default, picker, add panel, Kimi guide; visually inspected.

## Checks run and their real results

- `npm run test:unit` — 106/106 pass (was 105; +1 billing pin, red-first).
- `npm run typecheck` — green. `npm run build:vite` — green.
  `npm run build:lab` — green.
- Full Playwright E2E with the app token held (taken and released at
  `$TEMP/cairn-app-token`): 43/43 pass — chunks 7 + 14 + 22, then chunks 1–2
  (21) re-run on the final bundle after the repair below, conductor's 22
  already final. Token verified released.
- Repair inside the task: the not-listed item's first sub-line contained the
  substring "Custom…", which collided with the suite's existing substring
  role locator (strict-mode violation, conductor.spec connectToFixture).
  Reworded to "the custom option" (one line in ConnectCard.tsx), rebuilt,
  reran — disclosed per the repair rule; no test needed loosening, the copy
  was the bug.
- Scratch harness disclosure: a standalone (non-runner) screenshot script
  hung at `firstWindow()` and was removed; the screenshots were instead
  captured through a scratch Playwright spec (deleted after the run, never
  committed). Three electron.exe processes from a PREVIOUS day's E2E run
  (2026-07-28, profile `cairn-e2e-profile-4qUUmu`) are still alive on the
  machine — not this task's, left running for the owner's call.
- OpenRouter keyless catalog re-verified this turn: `moonshotai/kimi-k3`
  exists at $3/M input, $15/M output; K2 still $0.57/$2.30 (fetch saved
  transiently, removed).

## Mixed-tree disclosures (parallel lane active in the same checkout)

- The Soft festival palette lane committed 8a52831 claiming task 123 AFTER
  this lane's 046186a, overwriting `123-brief.md` in the tree; it then
  landed Task 123 (0535919) while this lane's checks ran. Per the two-lane
  backstop, and with both lanes mid-landing, this lane renumbered to 124
  (5f53b60); the palette brief content is intact at HEAD.
- That lane's uncommitted tokens.css port sat in the tree during this
  lane's builds and tests (all green); every token this task's CSS uses was
  verified present in the ported file. The screenshots therefore show the
  palette lane's coral Cairn — the picker's own styles are unaffected.
- `design/` stays untracked scratch; the palette lane's files were never
  staged or committed by this lane.

## How to try it

Open the app on any governed project while disconnected: the connect card
names Kimi K3. "Choose a different brain" shows five entries, each with a
plain billing line, K3 pinned "Recommended" at the top; "The model I want
isn't listed…" explains both doors and offers the copyable sentence; the
Kimi subscription seat's key guide carries the new CLI line.

## Limitations / remaining human judgment

- The copy button's label flip is E2E-asserted; the OS clipboard contents
  are not read back by the suite (the sentence remains on screen with
  `user-select: all` as the manual path).
- The add panel cannot dispatch the add-a-model task itself — no conductor
  exists at the connect card — so it arms the owner with the exact sentence;
  whether Cairn-then-worker performs that task well is the self-hosting
  loop's own future test.
- K3's "not yet evaluated" note stays; the evaluation set may move the pin.

Disposition: DONE
