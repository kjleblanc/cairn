# Task 137 report: the quiet card — few words, inline steps, sign-in first

**Lane:** A (main checkout)
**Date:** 2026-07-30
**Brief:** `docs/ai-work/tasks/137-brief.md` (claimed as commit `49d4cd2`)

## What the owner asked

"There's still a lot of text/lists, how can we compact this into an easier
system for the user? if a key is needed, step by step and easy copy/paste
field etc, in as few and as simple words and steps as possible."

## What actually changed

Every file touched:

- `app/src/renderer/components/ConnectCard.tsx` — the card is now three
  lean flavors:
  - **OpenRouter seat (not Custom):** body name → consent block → checkbox
    → **Sign in with OpenRouter** button → one hint line ("No key needed —
    approve Cairn in your browser.") → a quiet **"Use a key instead"**
    toggle. The toggle opens three inline steps: 1. an `Open
    openrouter.ai/keys` pill button, 2. "Create a key and copy it.", 3.
    "Paste it here:" with the key field, then the consent+Connect block.
    New `keyPathOpen` state initializes open when a remembered seat
    exists (Task 127's returning-owner memory keeps landing on a
    pre-filled, key-area-open screen) and resets to closed in
    `chooseBody`. The OAuth flavor renders only when `openRouterSeat &&
    !custom`.
  - **Kimi seat:** the three steps *are* the screen — 1. an `Open the Kimi
    Code Console` pill, 2. "Create a key and copy it — it's shown only
    once.", 3. "Paste it here:" with the field; one CLI-truth line
    ("Signed into the Kimi command-line tool? Cairn can't borrow it yet —
    the console key is the way."); consent block → checkbox → Connect.
  - **Custom:** unchanged (fields + key + consent + Connect).
  - The "Where do I get a key?" guide panel, its two list screens, the
    guide pill, and the intro / "Connecting with X" blurb lines are
    removed. Shared `keyInput` / `consentBlock` / `checkboxRow` /
    `connectRow` consts keep the three flavors rendering the identical
    consent surface.
- `app/src/shared/bodies.ts` — the four OpenRouter billing lines become
  **"Bills per use — sign in or paste a key"** (replace-all), and the
  header comment is updated to match the post-131 truth.
- `app/tests-unit/bodies.test.ts` — new pin: every OpenRouter body's
  billing line names the sign-in choice (written red-first: failed before
  the bodies.ts change, green after).
- `app/tests/conductor.spec.ts` — connect walk rewritten for
  sign-in-first / toggle / inline steps / new billing lines; the OAuth
  happy-path test no longer pastes a key first (sign-in button is visible
  immediately); the cancel test now asserts zero password fields on the
  sign-in screen.
- `app/tests/connect-kimi.spec.ts` — the guide-panel walk is replaced
  with inline-steps assertions (three steps, console pill, shown-once
  honesty, short CLI truth, Connect still gated until consent).
- `app/tests/fixtures/fake-conductor.mjs` — **disclosed adjacent repair
  #2** (see below): added `holdCommentary` / `releaseCommentary` and a
  `commentaryGatePoint()` gate that `streamReply` awaits before the usage
  frame (new optional `beforeDone` param, wired only in the commentary
  branch).
- `docs/ai-work/tasks/137-brief.md`, this report, and
  `docs/ai-work/LOG.md`.

**Untouched on purpose:** `app/src/shared/consent.ts` is byte-identical —
the consent block stays fully visible above the checkbox in every flavor;
no main-process, IPC, keystore, or `oauth.ts` changes; the paste path is
the same `conductorConnect`; picker, add, and start panels unchanged
except the billing line; `RECOMMENDATION_NOTE` unchanged; key-field
placeholder unchanged. The other lane's in-flight work (`M
app/vite.lab.config.ts`, untracked `app/lab/chatmock.*`,
`app/lab-server.log`, `app/launch-build.log`, `design/`) was never
staged or touched.

## Disclosed adjacent repairs (two, both test-side, both flake fixes)

1. **Chip test (~conductor.spec.ts:729).** Two sequential transient
   expects ("Wait for Cairn to finish answering." chip, then disabled
   Set aside) raced each other; replaced with ONE atomic locator —
   `riskChip.filter({ hasText: "Wait for Cairn to finish answering."
   }).locator('button:has-text("Set aside")[disabled]')` — so the chip's
   text and its disabled button are asserted in the same snapshot.
2. **Commentary test (~conductor.spec.ts:1194).** The fixture streamed
   its commentary instantly, so a 3 ms `setFixtureCommentaryDelay` still
   let the commentary finish before `sendChat` arrived; the owner's
   message then went through as an owner turn instead of being refused.
   Proven by snapshot, then fixed deterministically: the spec arms
   `holdFixtureCommentary()` at the start, the fixture's streamReply
   awaits the gate before its usage frame, and the test calls
   `releaseFixtureCommentary()` right before the "comment lands"
   assertion. The delay hack is gone.

## Checks run (real results, Verified level)

All from `app/` with `export PATH="/c/Program Files/nodejs:$PATH"`:

- `npm run test:unit` — **124/124 pass** (includes the red-first billing
  pin; seen failing before the bodies.ts edit).
- `npm run typecheck` — clean, no output errors.
- `npm run build:vite` — green.
- `npm run build:lab` — green.
- `npx playwright test tests/conductor.spec.ts` — **26/26 pass** with the
  app token held (connect walk + OAuth tests failed red-first against the
  old card, green after).
- `npx playwright test tests/away.spec.ts tests/connect-kimi.spec.ts
  tests/projects.spec.ts tests/routing.spec.ts tests/serial.spec.ts
  tests/smoke.spec.ts` — **21/21 pass** with the app token held.
- Total E2E: **47/47**.
- Screenshots captured via a throwaway `app/tests/quiet-screenshot.spec.ts`
  (deleted after use) and visually inspected:
  - `app/test-results/task-137-signin-first.png` — K3 quiet screen: name,
    consent, checkbox, sign-in button, hint, toggle.
  - `app/test-results/task-137-key-path.png` — the toggle expanded: three
    steps, field, credit line.
  - `app/test-results/task-137-kimi-steps.png` — Kimi steps + CLI truth +
    Kimi consent.
  (These live under untracked `app/test-results/` scratch output and are
  not committed.)

## How to try it

Open the lab preview (link in the chat reply). In the app mock,
disconnect the brain if one is connected — the connect card now shows the
quiet OpenRouter screen: name, consent, checkbox, **Sign in with
OpenRouter**. Click **Use a key instead** to see the three-step key path
with the openrouter.ai/keys pill. Pick the Kimi seat to see the
steps-first layout with the console pill and the CLI-truth line.

## Limitations and remaining human judgment

- The consent block itself is still long — it is the standing
  authorization and stays fully visible by contract; only the text around
  it went on the diet.
- Edge case kept deliberately: Custom + a hand-typed OpenRouter base URL
  keeps the Custom shape (no sign-in button) — the OAuth flavor is tied
  to named OpenRouter seats, not string matching.
- Taste confirmation invited per the v0.5.0 human-judgment clause: the
  owner may want to eyeball the three screens in the lab and adjust
  wording.
- The real OpenRouter handshake remains owed its live confirmation from
  the owner's first sign-in (carried over from Task 131).

**Disposition: DONE**
