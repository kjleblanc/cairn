# Handoff — the showing-not-asking work

Written 2026-08-03, at the end of the session that produced it, so the state
survives a fresh context. Spec:
`docs/superpowers/specs/2026-08-02-cairn-showing-not-asking-design.md`
(nine Decisions). Plan 1 of 4:
`docs/superpowers/plans/2026-08-02-cairn-voice-and-plain-language.md`.

## Where it came from

Three owner complaints, one cause. Cairn asks the owner to supply what it could
establish itself, records the answer as certain, and says it in words the owner
cannot check. The fix is **verify more and show the result** — not ask less and
assume more.

## Shipped and running

- **Task 169** — `conductor-v4`. Warmth lives in rhythm, never catchphrases (a
  tic cannot step aside for bad news). Plain-words rule extended past chat into
  outcomes, details, notes. Four surfaces stopped showing raw codes: result
  card, written report, run strip, and — via Task 170 — the run screen.
  `app/src/shared/stopwords.ts` holds the app's table; `core/src/records.ts`
  holds core's; a mirror test in `core/test/records.test.ts` fails if they
  disagree (verified by deliberately diverging one word).
- **Task 170** — closed two defects Task 169's verification surfaced. Full
  Playwright went **5 failed / 29 passed → 3 failed / 38 passed**.

## Decided, approved, and NOT built

**All of Decision 9 — the entire visual language — is design only. None of it
is in the app.** Verified: the pastel palette appears zero times in
`app/src/renderer/tokens.css`.

- Lantern on Water as the conversation panel, replacing the white rectangle
- Muted pastel palette (Cairn `#a3ddd0`, Kimi `#d5c0ec`, Codex `#f3c49a`,
  Claude `#b8c9de`; done `#c2ddb6`, stopped `#f2aaa4`, in transit `#f7d3a8`)
- Still water by default; ripples only on real landed events. **Note: the
  shipped pond ripples continuously, so this is a change to Task 168's
  behaviour** — a rule 168's brief stated and its implementation did not reach.
- New Horizons treatment: chunky pills that compress, overshoot easing,
  staggered menus, rounded heavy type
- The cast carries the identity; the furniture goes warm and rounded. Face
  geometry stays verbatim from `faces.ts` — now by the owner's choice, not
  constraint
- The narrow-window resolution (see Decision 9; approved 2026-08-03)

Mockups persist in `.superpowers/brainstorm/*/content/` — excluded via
`.git/info/exclude`, not `.gitignore`, so they never enter a task commit.
`narrow-v2.html` is the approved narrow behaviour; `lantern-v3.html` the
approved look.

## Not yet written

- **Plan 2** — the panel and visual language. Its blocker is now resolved, so
  it is writable.
- **Plan 3** — evidence: before/after pictures in the card, the album. Mostly
  delivery: `app/shots/` already holds 50+ captures and a captioned
  `manifest.json`, gitignored and unlinked. Capture code is written fresh per
  task and deleted with it — Task 168's `captureTask168` never entered its
  commit.
- **Plan 4** — attribution: "I'm not sure" as a real answer, three-way marking
  (owner-stated / owner-unsure / Cairn-chose) carried into the worker brief.
  Depends on Decision 6, which reconciles "Never invent values" with Cairn
  deciding: **the boundary is attribution, not choice.**

## Open for the owner

1. **The eval has never been run against v4.** Scenarios 11 and 12 exist with
   written bars and no results. ~$0.03. **The owner must run it** — it is
   manual by design and needs their connected provider; an agent cannot.
   A run sheet was produced in the session scratchpad (not committed).
   Watch S3: citation honesty has now failed there in v1 and v2, on the very
   scenario written to fix it, and v4 did not address it.
2. **An eval harness** was proposed and not built: drives the owner's already
   connected app, key never touches the agent, hard call cap and kill switch,
   fake-first. The eval has run twice in 170 tasks because it is expensive in
   owner-time, not money.
3. **Three Playwright failures remain**, all proven pre-existing. Two fail
   identically with Task 169's changes reverted to `84abc91`; one
   (`routing.spec.ts:387`) depends on a real codex being on this machine's
   PATH, which makes the suite non-portable. A rotating set passes in isolation
   alongside `EPERM` temp-profile errors — contention, undiagnosed.

## Gotchas worth not relearning

- **The E2E app token is a mutex directory**: `mkdir %TEMP%\cairn-app-token`
  fails if held. Hold for the whole run, remove after, name it in the report.
- **The renderer imports `@cairn/core` for types only** — all five existing
  imports. Do not make one a runtime import; that is why the stop-words table
  is duplicated with a mirror test rather than shared.
- **`core/src/records.ts` must import `serial.ts` type-only** — `serial.ts:8`
  imports records as a value, so a value import back cycles.
- **Bash mangles `${...}` inside inline `node -e`.** Write the script to a file.
- **`cairn init` and `cairn claim` are interactive / commit alone.** `claim`
  commits the brief by itself to reserve the number.
- **Look at the thing.** Every automated check passed on Task 169 while the app
  still showed `STOPPED — CANCELLED_BY_OWNER`, because the screenshot was the
  run strip, not the result card. The final check that caught it was reading a
  screenshot aloud, not a command.
