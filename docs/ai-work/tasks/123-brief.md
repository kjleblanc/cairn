# Task 123 brief — Pin Kimi K3, clarify the picker, open the add-a-model path

Implements the owner decisions recorded in
`docs/ai-work/HANDOFF-model-picker.md` (2026-07-29).

## Requested visible outcome

The connect card's model picker becomes calm and clear for a beginner:

1. **Kimi K3 is the recommended brain.** A new curated entry
   `moonshotai/kimi-k3` ("Kimi K3") carries `recommended: true`; Kimi K2
   stays in the list without the pin. Verified in this task against
   OpenRouter's keyless catalog: K3 is $3/M input, $15/M output — about 5×
   K2 ($0.57/$2.30) — so K3's blurb says a long chat costs dimes, and K2's
   "a few cents" sentence never transfers. `RECOMMENDATION_NOTE` is
   untouched ("not yet evaluated…").
2. **Every entry says how it bills, in plain words.** Each picker row gets a
   short billing line: per-use keys ("Bills per use — key from
   openrouter.ai") versus the membership seat ("Uses your membership's
   coding quota — key from the Kimi Code Console"). No jargon.
3. **The picker stays open, and says so.** DeepSeek V3.1 and GPT-5 Mini stay
   (the confusion was presentation, not the entries). A new first-class
   picker item, "The model I want isn't listed…", opens a small panel
   telling the truth: Custom… accepts any provider/model right now, and once
   connected the owner can tell Cairn in chat to add the model to the list —
   showing the exact sentence to send, with a copy button. (No dispatch from
   the card itself: the card only shows when no conductor is connected.)
4. **The Kimi seat tells the CLI truth.** The subscription seat's key guide
   gains one plain line: a Kimi Code command-line sign-in on this computer
   can't be borrowed by Cairn yet, so the console key is the way today
   (allowed interim improvement per the handoff; no credential paths are
   read, ever).
5. The custom-model placeholder moves to `e.g. moonshotai/kimi-k3`.

## Boundary of intent

- Files in scope: `app/src/renderer/bodies.ts`,
  `app/src/renderer/components/ConnectCard.tsx`, `app/src/renderer/app.css`
  (billing-line style only), the pinned tests
  (`app/tests/conductor.spec.ts`, `app/tests/connect-kimi.spec.ts`,
  `app/tests-unit/bodies.test.ts` if a field becomes required), plus task
  records.
- `app/src/main/conductor/consent.ts` stays byte-identical: the kimi/API
  split is by host and already honest; K3 is an OpenRouter seat.
- No behavior changes to the connect flow's gates (consent re-derivation,
  checkbox, one-paste default). No dependency, core, CLI, or contract
  changes. No credential reading or CLI detection.
- The parallel lane's in-flight untracked files (`app/lab/lookboard.*`,
  `design/`) are not touched, staged, or committed.
- consent.test.ts's `moonshotai/kimi-k2` fixtures are arbitrary ids, not
  recommendation pins — verified, left alone.

## Checks that will show the outcome holds

- `npm run test:unit` and `npm run typecheck` green in `app/`.
- `npm run build:vite` and `npm run build:lab` green.
- Full Playwright E2E green with the app token held
  (`mkdir "$TEMP/cairn-app-token"`), including the updated conductor and
  connect-kimi specs asserting: K3 pinned and named on the default card,
  every billing line visible, the not-listed path renders and copies, the
  Kimi seat's CLI-truth line, and the new placeholder.
- Red-first where pins change.

## DONE and STOPPED

- DONE: the five picker entries render with billing lines, K3 carries the
  recommendation, the not-listed panel and CLI-truth line read plain, all
  checks above pass.
- STOPPED: checks fail, or clarity cannot be kept without breaking a pinned
  consent/honesty string.
