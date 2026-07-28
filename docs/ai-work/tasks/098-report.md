# Task 098 report — Kimi subscription as a curated brain

## What actually changed

- `app/src/renderer/bodies.ts` — `Body` gains an optional `baseUrl`; a fourth
  curated entry "Kimi — your subscription" (`https://api.kimi.com/coding/v1`,
  model `kimi-for-coding`) joins the picker, not recommended. Its blurb was
  shortened to 133 chars to fit the existing under-140 pin in
  `tests-unit/bodies.test.ts` (an in-scope repair; the only file that pin
  guards is this one).
- `app/src/renderer/components/ConnectCard.tsx` — choosing a body honors its
  own base URL; the picker intro, the default-panel key line, and the key
  guide switch for the Kimi seat (guide points at the verified console URL
  `https://www.kimi.com/code/console`, HTTP 200 today); the consent checkbox
  label now renders from the main-derived card. Every string the OpenRouter
  seats show is byte-identical to before.
- `app/src/shared/ipc.ts` — `ConductorConsentCard` gains a `checkbox` field,
  so the label is derived in main and compared field-by-field before a key is
  stored, same as the rest of the card.
- `app/src/main/conductor/consent.ts` — NEW. The consent card as one pure
  function of baseUrl+model. Host `api.kimi.com` gets the subscription truth
  (membership quota, already paid for, invisible to Cairn); every other host
  keeps the exact pre-098 pay-as-you-go sentences. The data-scope sentence is
  one constant, unchanged for every seat.
- `app/src/main/conductor/service.ts` — `conductorConsentCard` delegates to
  `consentCardFor`; `sameCard` also compares `checkbox`.
- `app/tsconfig.unit.json` — adds `consent.ts` to the unit compile set.
- `app/tests-unit/consent.test.ts` — NEW, 4 tests pinning the API sentences
  byte-for-byte and the Kimi sentences' truth conditions.
- `app/tests/connect-kimi.spec.ts` — NEW E2E: renders the seat, the consent
  wording, and the console guide. It never clicks Connect — the seat's URL is
  the real `api.kimi.com`, so a connect would be a real call on the owner's
  membership.
- Records: this report, `098-brief.md`, and one LOG.md row.

Task 097's in-flight files were not touched. During the session, two 097
artifacts changed externally (the owner reverted
`app/tests/fixtures/fake-conductor.mjs` to HEAD and deleted the untracked
`app/tests/diag.spec.ts` at 02:25); my work is disjoint from both.

## Checks run and their real results

- `npm.cmd run test:unit`: **100/100 pass** (96 existing + 4 new).
- `npm.cmd run typecheck`: **pass**. `npm.cmd run build:vite`: **pass**.
- New `connect-kimi.spec.ts`: **pass**.
- The OpenRouter pin — `conductor.spec.ts` "the connect card blocks until
  consent…", unmodified: **pass**.
- `smoke.spec.ts`, `projects.spec.ts` (3), `away.spec.ts`: **pass**.
- `routing.spec.ts` "serial route", "Squirrel", "requires confirmation",
  "details-bearing": **pass**.

**Pre-existing failures, proven independent of this task.** Eight E2E tests
fail in the current tree, all with one signature — navigation clicks hang
("← Project home", "Run offline demonstration") or project-keyed stream state
comes back empty:

- `conductor.spec.ts` "a live reply belongs to its project and reattaches
  after navigation" (`conductorCurrent` returns undefined mid-stream);
- `serial.spec.ts` "a beginner completes the offline serial path…";
- `routing.spec.ts` "normal mode shows connection-required…", plus the six
  run-lifecycle tests (malformed JSONL, missing claims, retained records,
  stop, navigate-away, window reload).

Twice I stashed exactly my four modified source files, rebuilt, and re-ran:
both conductor and serial **fail identically without my changes**. The
failures live in surfaces this task never touched (097's in-flight files and
the task-091/092 navigation state), all timeout-class (~40 s), all green as
of task 095's close on 2026-07-27. The deleted `diag.spec.ts` suggests this
was already under diagnosis before this session.

The full `test:smoke` run also exceeds the 5-minute shell cap on this
machine, so suites were run per-file instead of through the single script.

## How to try it

1. `npm.cmd start` in `app/` and open a governed project.
2. On the connect card: "Choose a different brain" → "Kimi — your
   subscription".
3. "Where do I get a key?" → "Open the Kimi Code Console", sign in, create a
   key (shown once), paste it.
4. Read the consent card — it should describe membership quota, not
   pay-as-you-go — check the box, Connect.

The first real Connect is the live verification this task deliberately did
not perform: it spends the owner's membership quota, and it requires the
membership to include Kimi Code benefits (the console shows the tier).

## Limitations and remaining human judgment

- The Kimi seat has not made a real call from Cairn. Endpoint, model id, key
  format, and quota billing are from Kimi's own Help Center and Kimi Code
  Docs (retrieved 2026-07-28); behavior against the owner's actual membership
  is unverified until the owner connects.
- The full-suite-green gate in the brief cannot be met while the eight
  pre-existing failures stand. They are out of this task's scope to repair —
  they sit in 097's protected in-flight state — but they block the brief's
  DONE definition. Whether the verified feature is committed onto a red tree
  is the owner's call, not mine.
- Level 3 from the scoping conversation (detecting a locally installed Kimi
  Code CLI, and a Kimi worker adapter) remains future work; no Kimi CLI is
  installed on this machine.

Disposition: STOPPED — the requested outcome holds and passed every check
within the task's control, but the brief's every-suite-green gate is blocked
by pre-existing E2E failures in protected in-flight work, with no in-scope
correction; per the contract, stopped evidence stays uncommitted for
inspection.
