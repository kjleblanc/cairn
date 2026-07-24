# Task 025 — Report

What changed:

- Created `app/src/renderer/components/TaskCard.tsx` (77 lines). Props match
  the plan exactly: `{ block: TaskBlock; onAnswer(concern, answer);
  onSetAside(concern); onSend(outcome) }`. Renders `block.outcome` as a
  plain sentence, then one chip per `block.concerns` entry, keyed by array
  index (concerns have no id of their own; index is stable for the life of
  one card). Local state is two maps keyed by that index:
  `resolved: Record<number, "answered" | "set-aside">` and
  `drafts: Record<number, string>` for the question chips' in-progress
  answer text. A `question` chip shows a one-line `<input>` plus an
  "Answer" pill, disabled until the draft is non-empty, and also submits on
  Enter; on submit it marks the chip `"answered"` locally and calls
  `onAnswer(concern, answer.trim())` — it does not touch the conversation
  itself, that is `Chat`'s job. A `risk` chip shows a single "Set aside"
  pill; clicking it marks the chip `"set-aside"` locally and calls
  `onSetAside(concern)`. Once a chip is resolved either way, its text
  renders struck-through (`task-chip-strike`) with a small "Answered" /
  "Set aside" status line, and its input/button no longer render. "Send to
  dispatch" is `<Pill kind="primary" disabled={!allResolved}>`, where
  `allResolved = block.concerns.every((_, i) => resolved[i] !== undefined)`
  — vacuously true for a block with no concerns, so a card with nothing to
  resolve can dispatch immediately. Clicking it calls
  `onSend(block.outcome)` and does nothing else; `TaskCard` never navigates
  or knows about `TaskRun`.

- Modified `app/src/renderer/screens/Chat.tsx`: added `taskBlock: TaskBlock
  | null` state and a `taskBlockKey: number` counter. The `done` branch of
  the delta handler, after appending the persisted turn as before, now also
  checks `event.taskBlock` (present-but-`null` on a plain reply, a real
  object on a reply with a valid `cairn-task` fence — main's `taskblock.ts`
  already guarantees the shape): only a truthy block replaces `taskBlock`
  and bumps `taskBlockKey`. A falsy `taskBlock` (the common case — most
  replies are plain conversation) leaves whatever card is already showing
  untouched, which is what "a new done-delta with a task block replaces the
  current card" requires — an owner reply to a question or a set-aside is
  itself an owner message that reliably triggers *some* reply, and unless
  that reply happens to carry its own new proposal, the original card and
  its now-resolved chips stay exactly as the owner left them. `TaskCard` is
  rendered with `key={taskBlockKey}` in the message list (right after the
  turn bubbles, before the streaming bubble and the error bubble) so a
  genuine replacement remounts it with fresh, empty `resolved`/`drafts`
  state rather than carrying over the previous proposal's answered chips.
  Two new handlers wire the card's callbacks to the existing `send()`
  pipeline exactly as the plan specifies:
  `onCardAnswer(_concern, answer) { void send(\`About your question —
  ${answer}\`); }` and `onCardSetAside(_concern) { void send("I understand
  the risk you raised — set it aside and keep the task as proposed."); }` —
  both go through the same `send()` used by the composer, so they append an
  owner bubble, stream a reply, and persist to the conversation log exactly
  like anything the owner types. `onSend` is wired straight to the screen's
  own `onOpenTask` prop. `newConversation()` now also clears `taskBlock` to
  `null`, so switching conversations doesn't leave a stale card floating
  over an unrelated thread. The doc comment on `onOpenTask` (previously
  noting it was unused, per Task 024's report) is updated to describe the
  now-real handoff, and the destructured prop is no longer renamed
  `_onOpenTask`.

- Modified `app/src/renderer/App.tsx`: the `"task"` view variant gained
  `initialOutcome?: string`; the `"task"` case now passes
  `initialOutcome={view.initialOutcome}` to `TaskRun` (`undefined` from
  Dashboard's "Start a task", same as before); the `"chat"` case's
  `onOpenTask` is now `(prefill) => setView({ name: "task", dir: view.dir,
  initialOutcome: prefill })` instead of a bare navigation with no prefill.
  `routing.spec.ts`'s two source tripwires on `App.tsx` were re-read before
  editing and still hold: `'name: "task"'` is still a literal substring, and
  none of `Wizard|Scheduler|parallelDraft|TaskDeck|Direction` were
  introduced.

- Modified `app/src/renderer/screens/TaskRun.tsx`: the component signature
  gained `initialOutcome?: string`, and `outcome` is now
  `useState(initialOutcome ?? "")` — the exact minimal change the plan
  called for. Nothing else in the file changed: `findRoute`, `run`,
  `tryAnother`, and every other phase are untouched, so the prefill only
  ever affects what's in the textarea the first time the screen mounts
  (`tryAnother`'s `setOutcome("")` still resets to empty, matching its
  existing "start over" behavior, not back to the prefill).

- Modified `app/src/renderer/app.css`: added `.task-card` (a `.card` with no
  bottom margin, since `.chat-messages`'s own `gap: 10px` already spaces
  it), `.task-card-outcome`, `.task-card-chips` (column, 8px gap),
  `.task-chip` / `.task-chip-risk` (a faint amber border so a risk chip
  reads differently from a question chip at a glance, reusing the existing
  `--amber-soft` token rather than adding a new color), `.task-chip-resolved`
  (dims the whole chip once answered or set aside),
  `.task-chip-text`/`.task-chip-kind` (the small uppercase "QUESTION"/"RISK"
  label), `.task-chip-strike` (the struck-through concern text),
  `.task-chip-status`, and `.task-chip-answer` (the inline input+button
  row). No existing selector or rule was changed.

Checks run (all real, this session, in `app/`):
- `npm run typecheck` — clean, no errors.
- `npm run test:unit` — 37/37 pass (unchanged; no pure-module logic in this
  task's scope — `TaskCard` is a renderer component with no unit-test
  target in this suite, per the brief's own note that behavior tests arrive
  with Task 026).
- `npm run build:vite` — all three bundles built cleanly (main.js 64.45 kB,
  preload.js 1.60 kB, renderer index.js 179.65 kB, index.css 12.06 kB).
- `npm run test:smoke` — 13/13 pass, including both `routing.spec.ts`
  tripwires against `App.tsx` (read before editing, as instructed) and
  `shared/ipc.ts` (untouched by this task).

How to try it (visual check, no real provider needed): a throwaway local
`node:http` server (not committed) stands in for an OpenAI-compatible
`/chat/completions` SSE endpoint. Its first reply is a `cairn-task` fence
with one question concern and one risk concern; every reply after that is
plain text with no fence. Launched the real app with
`CAIRN_CONDUCTOR=1 CAIRN_OPEN=<scratch project>`, connected through the real
`ConnectCard` UI (base URL pointed at the fake server, any model/key text),
and drove it exactly like the owner would: sent a message, the card
appeared showing the outcome and both chips, "Send to dispatch" was
disabled; typed an answer into the question chip and clicked "Answer" — the
chip switched to struck-through "Answered" and the button stayed disabled
(one chip still open); clicked "Set aside" on the risk chip — it switched to
struck-through "Set aside" and "Send to dispatch" became enabled; clicked
it — the screen switched to TaskRun with "What should change?" and the
outcome textarea already containing the exact outcome sentence from the
card, matching the screenshot below.

Limitations:
- No new automated (unit or Playwright) coverage was added for `TaskCard`
  itself or for the Chat/App/TaskRun wiring — per the task's own framing,
  "behavior tests arrive with Task 026" and this task's brief lists no test
  file in its boundary of intent. Everything above beyond `typecheck` /
  `test:unit` / `build:vite` / the unchanged `test:smoke` suite was verified
  manually this session with a throwaway script and fake server, neither of
  which is checked in.
- The card's local `resolved`/`drafts` state lives only in `TaskCard` and is
  lost if the component remounts for any reason other than a genuine new
  task block (e.g. switching away from Chat and back re-mounts the whole
  screen, which currently shows no card at all — history replay of a past
  `cairn-task` fence into a card is out of scope here, matching the
  spec's "the app keeps no conversation state outside the project" framing
  and the fact that stored turns don't carry a `taskBlock` field).
- If the model's very next reply after an answer/set-aside message happens
  to include its own new task block, the card is replaced outright — any
  chips the owner had just resolved on the old card are gone along with it,
  by design ("a new done-delta with a task block replaces the current
  card"), but there is no visual transition or owner-facing note marking
  that swap beyond the new card itself appearing.

Self-review: read `tests/routing.spec.ts` in full before touching
`App.tsx`, confirmed both tripwires by exact string/regex before and after
the edit. Re-read `Chat.tsx`'s existing delta-race-guarding logic
(`inFlightRef`, `conversationIdRef`) before adding the task-block branch, to
make sure the new code sat inside the already-guarded `done` branch and
introduced no new delta-matching logic of its own. Verified
`git status --porcelain=v1` at the repo root lists only the five intended
paths before staging, and that the scratch fake-server script and its two
screenshots (`scratch-taskcard-check.mjs`,
`scratch-taskcard-before-send.png`, `scratch-taskcard-taskrun.png`) were
deleted from `app/` after the manual run, leaving no stray untracked files.

## Review fix

Review found one Important issue: a chip marked itself resolved
unconditionally the instant its own callback was invoked, but `Chat.send()`
silently no-ops (does nothing, returns without dispatching) while a reply is
already streaming. That opened two real gaps: (1) resolving a second chip
while the first chip's answer was still streaming could open "Send to
dispatch" without that second concern's message ever reaching the
conductor, and (2) a send refused for any reason left the chip falsely
marked resolved regardless. Fixed honestly, smallest robust shape, no new
repo task number, per the coordinator's direction:

- `app/src/renderer/screens/Chat.tsx`: `send()` now returns `Promise<boolean>`
  — `true` when it actually dispatched (appended the owner turn and invoked
  `conductorSend`), `false` when refused outright (empty text, or already
  streaming). `onCardAnswer`/`onCardSetAside` now return that boolean
  straight through instead of `void`-firing it. `TaskCard` is now also
  passed `busy={streaming}`.

- `app/src/renderer/components/TaskCard.tsx`: added a required `busy:
  boolean` prop. Both `onAnswer`/`onSetAside` props are now typed `(...) =>
  boolean | Promise<boolean>`. `submitAnswer`/`setAside` are now `async`,
  guard on `busy` up front (so the common case never even attempts a call
  that would be refused), `await` the callback's result, and mark the chip
  resolved *only* when that result is `true` — never optimistically before
  the call, and never regardless of outcome. While `busy`, the "Answer" and
  "Set aside" pills are `disabled`, and an unresolved chip shows a small
  sentence-case hint, "Wait for Cairn to finish answering." (new
  `.task-chip-hint` rule in `app.css`, matching the existing `.task-chip-
  status` spacing). No other behavior changed: remount-on-replace via
  `taskBlockKey`, the exact owner-message strings, the `allResolved` gating
  math, and the `onSend`/prefill handoff into `TaskRun` are all untouched.

Re-verified live with a throwaway fake SSE server (not committed), this
time with the second call (the reply to the answered question) delayed
1.5s so the busy window is actually observable rather than resolving
near-instantly: answered the question chip — it flipped to "Answered"
almost immediately, because `send()`'s own promise resolves as soon as the
`conductorSend` IPC call returns, well before the model's delayed reply
finishes streaming. Critically, at that exact moment — one chip already
answered, the model still streaming — "Set aside" on the *other* chip was
disabled, its hint text was visible, and "Send to dispatch" stayed
disabled. A forced click on the disabled "Set aside" button (Playwright
`{force: true}`, bypassing the library's own actionability check) produced
no state change at all — a real disabled `<button>` doesn't dispatch a
click event in the first place, so `setAside()`'s own `if (busy) return`
guard was never even reached; the chip stayed unresolved. Once the delayed
reply actually finished (the "done" delta, confirmed by the assistant's
"Understood, thanks." bubble appearing), "Set aside" became enabled and the
hint disappeared; clicking it for real resolved the chip, "Send to
dispatch" enabled, and the send-to-TaskRun handoff still prefilled the
outcome exactly as before. Scratch script and its failure-only screenshot
were deleted after the run.

Re-ran `npm run typecheck` (clean), `npm run test:unit` (37/37), `npm run
build:vite` (clean), and `npm run test:smoke` (13/13) after the fix — all
green. `git status --porcelain=v1` at the repo root listed only
`app/src/renderer/components/TaskCard.tsx`, `app/src/renderer/screens/
Chat.tsx`, `app/src/renderer/app.css`, and this report before staging.

Commit: `Task 025: review fix — a chip resolves only when its message was
sent`.

### Follow-up correction

Re-review caught one remaining deterministic gap: the `!response.ok` branch
in `send()` still returned `true`, but main's `service.ts` `send()` only
calls `appendTurn` (persisting the owner turn) *after* every `ok: false`
early return (task already running, already answering, not connected) —
so a refused response means the message provably never reached the
conductor, yet the chip would still resolve. Changed that branch to
`return false`, matching the `!trimmed || streaming` guard's semantics;
nothing else in `send()`'s logic changed. Confirmed the branch above it
(`inFlightRef.current !== inFlight → return true`, the "superseded by New
conversation" case) is unrelated: by the time a response resolves `ok:
true`, main has already persisted the owner turn synchronously before
returning, regardless of what the renderer does afterward, so that branch
returning `true` stays correct. Re-ran `npm run typecheck` (clean), `npm
run test:unit` (37/37), and `npm run test:smoke` (13/13) — all green.

Milestone movement: NO

Disposition: DONE
