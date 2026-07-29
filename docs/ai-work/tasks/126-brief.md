# Task 126 brief — Ask the power question first, collapse the picker

Owner direction (2026-07-29, after Task 124): simplify and streamline the
connect process and model picker — options A + B from this lane's proposal.

Note: this lane's brief was committed first (0166612). A parallel lane
claimed the same number later (f05a9d9, the motion-slice task); per the
two-lane rule the later claim renumbers before landing — that lane's next
free number is 127, and its brief content is preserved in f05a9d9. This lane
lands 126 first.

## Requested visible outcome

1. **A — the card asks the question first.** The connect card's first screen
   becomes two plain choices instead of presuming OpenRouter: "How do you
   want to power Cairn?" with **Kimi K3** (Recommended — its honest dimes
   blurb, per-use billing line, and the unchanged RECOMMENDATION_NOTE) and
   **Kimi — your subscription** (its quota blurb and billing line) as two
   large buttons, plus the quiet "Choose a different brain" link to the full
   picker. Choosing either lands on the existing one-paste screen pre-filled
   for that seat. `Body` gains `primary?: true` (K3 and the subscription
   seat); the start screen renders the primaries from the same data, so cost
   honesty is never duplicated.
2. **B — the picker stops being a wall of text.** The picker shows the two
   primary entries in full, then a collapsed "More choices (3)" toggle
   hiding Kimi K2, DeepSeek V3.1, and GPT-5 Mini until clicked; "Custom…"
   and "The model I want isn't listed…" stay visible whether or not the
   toggle is open.
3. **Navigation stays lossless.** Picker Back goes to the start screen (the
   top of the flow); the add panel's Back still goes to the picker; the key
   guide's Back still returns to the paste screen. Every panel reachable
   today stays reachable.

## Boundary of intent

- Files in scope: `app/src/renderer/bodies.ts` (the `primary` field + doc),
  `app/src/renderer/components/ConnectCard.tsx`, `app/src/renderer/app.css`
  (toggle styling only, if needed), `app/tests-unit/bodies.test.ts`,
  `app/tests/conductor.spec.ts`, `app/tests/connect-kimi.spec.ts`, plus task
  records.
- The consent surface is untouchable: `consent.ts` byte-identical, and the
  "What may flow / Cost" block, checkbox, and connect gate on the paste
  screen keep their exact strings — that block is the standing
  authorization, not clutter.
- The 22-call `connectToFixture` helper keeps working unchanged: the start
  screen's picker link keeps the exact name "Choose a different brain", and
  "Custom…" stays visible on the picker without expanding.
- No IPC, core, CLI, contract, or dependency changes. No change to what
  connects or what is stored (remembering the last seat is Task D's, not
  this task's).
- The parallel lane's work — its landed Task 125 (`app.css`, `tokens.css`,
  `TownSquare.tsx`), its in-flight Task 126/127 brief, and untracked
  `design/` — is never touched, staged, or committed; its presence in the
  tree during checks gets the usual mixed-tree disclosure.

## Checks that will show the outcome holds

- `app/tests-unit/bodies.test.ts` gains a red-first pin: exactly two bodies
  are primary; unit 107/107 and `npm run typecheck` green.
- `npm run build:vite` and `npm run build:lab` green.
- Full Playwright E2E (43 tests) green with the app token held, including
  the rewritten connect walk: start screen shows both doors and the note;
  picker hides K2/DeepSeek/GPT-5 Mini until "More choices" opens, then shows
  all entries with billing lines; Custom… reachable exactly as before; the
  Kimi seat flows start-to-guide with its CLI-truth line.
- Screenshots of the start screen, collapsed picker, and expanded picker via
  a scratch spec (deleted after), visually inspected.

## DONE and STOPPED

- DONE: first screen asks the two-door question, picker collapses to the
  primaries plus a toggle, every path from Task 124 still reachable, all
  checks green.
- STOPPED: a check fails, or the collapse hides a door a beginner needs
  visible.
