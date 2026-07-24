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

Milestone movement: NO

Disposition: DONE
