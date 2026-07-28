# Task 097 — plain words in the chat experience

Requested outcome: The words a beginner actually reads in the conversation —
the result card, the proposed-task card, and the dispatch confirmation —
say the same things they say today, in plain language, with jargon terms
("byte-identical", "sent verbatim", "the composer", "route", "runtime")
replaced by everyday ones. No fact, disclosure, or verified/claimed
separation is dropped or softened.

Owner direction (2026-07-28): Cairn gives "too many, and too long" details
the intended beginner user cannot understand; simplify and align everything
for that user. This task is the chat experience; a later task takes the
remaining screens.

Boundary of intent:

- Files that may change: `app/src/renderer/screens/Chat.tsx`,
  `app/src/renderer/components/TaskCard.tsx`,
  `app/src/renderer/components/DisclosureConfirm.tsx`, and the E2E
  assertions in `app/tests/conductor.spec.ts` that pin the old strings —
  plus this task's records.
- Stable control labels stay put ("Send to dispatch", "Set aside", "Stop
  this task", "Open the run screen", "Start one real … call", "Run offline
  demonstration"): they are pinned across dozens of E2E assertions and are
  already short. The target is the dense explanatory prose.
- Every disclosure keeps its substance: the paid-call confirmation keeps
  all six facts; the result card keeps the verified-facts block, Cairn's
  own record-recovery and process-failure disclosures verbatim from core,
  and a clearly separated worker-claims block that still says Cairn has not
  checked it.
- Model-facing strings do NOT change: `relay.ts`'s briefing lines and
  `constitution.ts` are untouched (they are pinned by unit tests and are
  not owner-facing).
- No behaviour, layout, styling, dependency, or stored-data change. No
  provider call, no external write.

Checks:

1. Every changed sentence carries the same fact as the sentence it
   replaced; the verified/claimed split on the result card remains visibly
   labeled.
2. `npm.cmd run test:unit` passes (96 tests).
3. The Vite renderer build and full type check pass.
4. The Playwright E2E suites pass with the updated assertions
   (`npm.cmd run test:smoke`).
5. Final diff and Git status contain only the scoped files and records.

DONE means a beginner reading the chat sees plain words, the disclosures
are intact, and every suite is green.

STOPPED means a disclosure would lose substance, a pinned model-facing
string would have to move, or a suite fails without an in-scope correction.
