# Task 025 — The proposed-task card: concerns gate dispatch

Requested visible outcome: when a `done` delta carries a task block, Chat
renders `TaskCard` — the outcome sentence plus one chip per concern. A
question chip's one-line answer, once submitted, sends `"About your
question — <answer>"` as a normal owner message. A risk chip's "Set aside"
marks it struck-through and sends `"I understand the risk you raised — set
it aside and keep the task as proposed."`. "Send to dispatch" stays disabled
until every chip is answered or set aside; enabled, it hands the outcome
sentence to `App`, which switches to TaskRun with that outcome already in
the textarea. A new `done` delta that carries its own task block replaces
the card; one that doesn't (e.g. a plain reply to an answered question)
leaves the current card exactly as it is. TaskRun's existing route preview,
disclosure checkbox, and confirmation flow are untouched.

Boundary of intent: create `app/src/renderer/components/TaskCard.tsx`;
modify `app/src/renderer/screens/Chat.tsx` (own the current task block and
render the card), `app/src/renderer/App.tsx` (the `"task"` view gains
`initialOutcome?: string`; `onOpenTask` now carries the prefill through),
`app/src/renderer/screens/TaskRun.tsx` (accept `initialOutcome?: string`,
seed the outcome field once via `useState(initialOutcome ?? "")`),
`app/src/renderer/app.css` (chip styling only).

Checks: `npm run typecheck` clean; `npm run test:unit` stays at 37/37;
`npm run build:vite` clean; `npm run test:smoke` stays at 13/13, including
`routing.spec.ts`'s source tripwires on `App.tsx`; manual visual check
against a throwaway fake SSE server (not committed) proving the full
answer/set-aside/send handoff into a prefilled TaskRun.

DONE means the outcome above holds and the checks pass. STOPPED means they
do not.
