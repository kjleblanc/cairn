# Task 096 report — give Cairn its new voice

## What actually changed

- `app/src/main/conductor/constitution.ts` — the only behavioural change.
  The Voice section now describes an upbeat, warm, occasionally playful
  companion ("the kind of videogame character who is genuinely glad to be on
  this adventure with the owner") instead of the v2 "quiet, competent
  friend" that banned exclamation marks, cuteness, and cheerleading. A new
  short section, "When it matters", adds the rule the owner accepted: when
  something is wrong, risky, or STOPPED, the cheer steps aside and Cairn
  speaks plainly. Exclamation marks moved from banned to permitted
  sparingly (one per reply at most, never to dress up bad news). Emojis
  remain banned. `CONSTITUTION_VERSION` moved to `conductor-v3`, and the
  header comment records why. Every other section — Honesty, Thinking
  partner, Boundaries, Proposing a task, Results, Format — is
  byte-identical.
- `app/tests-unit/constitution.test.ts` — the version pin now expects
  `conductor-v3`; three new pins cover the v3 persona sentence, the
  sparing-exclamation rule, and the serious-when-it-matters rule (pinned
  whole, same as the v2 failure-born rules); the combined
  no-emoji/no-exclamation test was split into a pinned emoji ban and a new
  guard bounding exclamation marks in the constitution itself to at most
  three.
- `docs/ai-work/tasks/096-brief.md` and this report — the task records.

No other file was touched. The constitution is consumed in exactly one
place (`service.ts`, as the conversation system prompt); nothing else
imports it.

## Checks run and their real results

1. All twelve pre-existing `LOAD_BEARING` pins pass unchanged — the
   honesty, citation, boundary, task-block, and result-commentary rules
   survived the voice change verbatim. (Unit run below.)
2. Version pin passes at `conductor-v3`.
3. Emoji ban passes; the new sparing-exclamation guard passes (the
   constitution text contains zero exclamation marks, within the bound).
4. The new Voice text names the persona and contains the
   serious-when-it-matters rule; both are pinned in the test.
5. `npm.cmd run test:unit` (desktop suite: tsc unit build + node --test):
   96 tests, 96 pass, 0 fail.
6. `git status --short` shows only the two source files and this task's
   records; `git diff --stat` matches.

Not run: the core and CLI suites (no core or CLI file changed) and the
Electron Playwright suite (no renderer, main-process wiring, or behaviour
changed; the constitution string is data consumed by one import). This is
a scope judgement, disclosed so the owner can ask for the full sweep if
wanted.

## How to try it

Launch the desktop app as usual:

```powershell
npm.cmd --prefix app start
```

Open a governed project and chat with the conductor. Expect a warmer,
brighter tone with the same plain words and short sentences — and expect
it to turn plain and calm the moment a risk or a STOPPED result is on the
table. (With no conductor connected, the same text is readable directly in
`app/src/main/conductor/constitution.ts`.)

## Limitations and remaining human judgment

- The voice change is prose in a system prompt; its real-world feel depends
  on the connected model. If the owner finds the result too flat or too
  silly in practice, the dial is the "seasoning, never the meal" paragraph.
- UI copy (result cards, disclosure screens, town square) is unchanged;
  that is the proposed follow-up task, not part of this one.

Disposition: DONE
