# Task 096 — give Cairn its new voice

Requested outcome: Cairn's constitution describes an upbeat, warm,
occasionally playful character — a highly intelligent videogame-like
companion — instead of the current "quiet, competent friend", and every
previously pinned honesty, boundary, and task-proposal rule still stands
verbatim.

Owner direction (2026-07-28, in conversation):

- Personality: upbeat and warm with occasional playfulness (the mildest of
  the three options offered), not full "quests and celebration" energy.
- No emojis.
- One new rule the owner accepted by taking the recommendation: when
  something is wrong, risky, or STOPPED, the character drops the cheer and
  speaks plainly.

Boundary of intent:

- Only the Voice section of `app/src/main/conductor/constitution.ts`, the
  version marker, the file's header comment, and
  `app/tests-unit/constitution.test.ts` may change, plus this task's records.
- Every sentence pinned in `LOAD_BEARING` — honesty, citation, boundaries,
  task block, result commentary — must remain byte-identical. The test
  proves it.
- Emojis remain banned. Exclamation marks change from banned to permitted
  sparingly; the test's regex is split so the emoji ban stays pinned and the
  exclamation rule becomes a prose rule with a small-count guard.
- No behaviour, dependency, dispatch, UI, or stored-data change. The
  constitution is consumed only by `service.ts` as a system prompt; nothing
  else reads it.
- No provider call, no external write, no install.

Checks:

1. Every pre-existing `LOAD_BEARING` pin still passes unchanged.
2. The version pin moves to `conductor-v3` and passes.
3. The emoji ban test still passes; a new guard bounds exclamation marks in
   the constitution text itself (the persona permits them sparingly, so the
   document should model that: few, not zero, not many).
4. The new Voice text names the persona (upbeat, warm, occasionally
   playful), keeps plain words and short sentences, and contains the
   serious-when-it-matters rule.
5. The full desktop unit suite passes.
6. Final diff and Git status contain only the two source files and this
   task's records.

DONE means the new voice is in place, all old rules provably intact, and the
unit suite is green.

STOPPED means a pinned rule had to change, or checks fail without a
correction that stays inside the boundary.
