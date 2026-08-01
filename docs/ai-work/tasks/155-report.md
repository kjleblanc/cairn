# Task 155 report — a smoother conversation with Cairn

**Disposition: DONE**

The owner, after Task 153: "It's better, but still a bit cluttered. How can we
make the flow of a conversation with CAIRN smoother?" — and then approved all
four proposed improvements: "All of them sound great." This task built all
four.

## What actually changed (every file touched)

- `app/src/renderer/screens/Chat.tsx` — all four features:
  - **A. Fold away the past.** `latestCardIndex` marks the newest envelope
    turn; every older result card renders as a one-line chip (disposition
    pill, `Task NNN`, `open`/`fold away`) with honest `aria-expanded`,
    toggling its full card in and out of view. Opened indices live in
    `openedCards` (local state, reset with the conversation). The newest card
    is always expanded; the push flow still mounts under it and it only.
  - **B. Queue instead of bounce.** New `pending: string[]` state. `send()`
    no longer refuses while `streaming || commentary`: it appends the
    trimmed text to `pending`, clears the composer, and counts as dispatched.
    Each waiting message renders as a dimmed owner bubble ("Will send when
    Cairn finishes.") with a **Take back** that returns its exact words to
    the composer (appending, never clobbering). A flush effect sends the
    oldest the moment `!streaming && !commentary && !runActive`; the first
    attempt is quiet (main frees its stream lock in a `finally` *after* the
    done delta, so a flush fired on that delta can arrive a beat early), one
    300 ms wait, then the loud retry whose refusal keeps the words in the
    composer with Try again (the Task 153 path, preserved as the fallback).
    If another stream has started meanwhile, `send()` simply re-queues.
    `newConversation` returns unsent queued words to the composer. The
    composer is now disabled only while a task runs (`runActive`) — the run
    gate and its explanation are unchanged.
  - **D. Needs-you dot.** `needsYou` = a proposed task waiting, a dispatch at
    confirm, or a push at chip/confirm. The tucked chip gains an amber dot
    (`aria-hidden`) and its accessible name becomes "Open the conversation
    with Cairn — a decision is waiting for you".
  - The commentary caption now says sends "wait their turn below" instead of
    "if a send bounces".
- `app/src/renderer/app.css` — **C. Less chrome** plus the styles for A/B/D:
  `.bubble-cairn` lost its border and fill (plain prose; the owner's green
  tint stays so the two voices remain scannable; decision surfaces keep
  their card weight), and new `.bubble-pending`, `.result-card-folded`,
  `.chat-villager-chip-dot` rules; the chip is now a flex row.
  **Disclosure:** these CSS lines were swept into Task 156's commit
  `be248f6` when that lane staged the whole file mid-flight — they are
  already on `main`, so this task's own commit does not (and cannot
  honestly) include them. See "The multi-lane interruption" below.
- `app/tests/conductor.spec.ts` —
  - The Task 071 refusal test became the queue test ("a message sent while
    the comment streams waits visibly and sends itself when the lock
    frees"): two sends queue in order with their exact words, no refusal, no
    phantom turn, a take-back returns words to the composer, and on release
    the queue flushes itself — one owner turn on disk, the taken-back
    message nowhere. This is a deliberate replacement of an owner-approved
    behavior (bounce → queue), not a weakened test: every guarantee the old
    test pinned (no phantom turn, no lost words, no false Stop) is pinned
    harder.
  - New reply-lane queue test ("a message sent while a reply streams queues
    and flushes when the reply lands") — pins the composer enabled
    mid-reply, which was disabled before this task.
  - New needs-you test ("the tucked chip carries a needs-you dot while a
    decision waits inside") — dot absent when nothing waits, present with
    the waiting-decision accessible name once a proposal is open; the chip
    still opens the dialog (force-clicked: it bobs on a loop).
  - The second-dispatch regression gained the fold pins: the first card's
    chip is the second-run gate, `aria-expanded` toggles, the card opens and
    re-folds.
- `app/shots/` (untracked local page) — three inspected captures published
  as the top manifest entry (`task-155-folded.png`, `task-155-queue.png`,
  `task-155-needsyou.png`). The folded shot is at the default 1320×755; the
  other two use a 1320×980 window because the default height fits one queued
  bubble plus a sliver — disclosed in the manifest caption.
- `docs/ai-work/tasks/155-brief.md`, this report, and the `LOG.md` row.

## Checks run and their real results

- `npm.cmd run typecheck` — clean (run twice: mid-task, and again on the
  settled tree).
- `npm.cmd run test:unit` — **158/158 pass** on the settled tree (the count
  grew from 141 as lanes 156–159 landed their own tests).
- `npm.cmd run build:vite` and `npm.cmd run build:lab` — both green on the
  settled tree; the E2E bundle was rebuilt after the lanes landed (the
  global-setup freshness guard requires it).
- E2E, all with the app token held (`mkdir app/.app-token`, removed after):
  - `npx.cmd playwright test tests/conductor.spec.ts:<lines>` — **30/30** in
    five line-targeted chunks under the 300 s shell cap, including all four
    new/changed tests and Task 157's follow-ups test coexisting with mine.
  - `tests/bridge.spec.ts tests/away.spec.ts tests/serial.spec.ts` — **4/4**.
  - `tests/routing.spec.ts tests/smoke.spec.ts tests/connect-kimi.spec.ts` —
    **15/15**.
  - `tests/projects.spec.ts` — **6/6**. (Now an ordinary committed spec:
    Task 158 repaired and landed it, retiring the stopped-worker hazard that
    had kept it off-limits since Task 150.)
- Captures: a throwaway Playwright harness (`app/tmp-capture/capture-155.mjs`,
  fixture conductor, offline-demo runs, deleted after) drove the real built
  app through the four states; all three shots above were inspected.
- Final `git status --porcelain` — only my two source files, this report,
  and the LOG row; the known untracked items (`design/`, `app/*.log`) stay
  untouched.

### The multi-lane interruption (honest account)

Mid-verification, three other lanes began working **in this checkout**
(tasks 156, 157, 158, later 159): files changed under my test runs, a
rebuilt `core/dist` tripped the staleness guard, and `app.css`/`Chat.tsx`
gained foreign hunks adjacent to mine. I stopped and asked; the owner chose
**serialize** — let them land, then verify on the settled tree. They landed
(`be248f6`, `cc32c8a`, `259cb7e`, `021390c`; their hunk-splits were verified
clean of my lines), and every check above ran **after** that, at base commit
`021390c`. Two consequences are disclosed rather than silently absorbed:
Task 156's commit swept my `app.css` lines (they are on `main` under 156's
record; 156's report does not name them), and one earlier failure of the
run-strip test's town-face assertion during the congestion did not
reproduce — the same test passed on the settled tree.

## How to try it

Open any project and talk with Cairn:

1. **Queue** — while Cairn is answering (or commenting on a result card),
  type and send. Your message waits as a dimmed bubble; **Take back** puts
  the words back in the composer. When Cairn finishes, it sends itself.
2. **Fold** — run two tasks (or open a conversation with two result cards):
  the older card is a one-line chip; tap it to open, tap again to fold away.
3. **Less chrome** — Cairn's plain answers now sit directly on the dialog;
  only decisions (proposals, dispatch, result cards, the run strip) keep
  cards.
4. **Needs-you dot** — with a proposal waiting, "tuck away ↘": the chip
  shows an amber dot.

## Limitations and remaining human judgment

- The queue is renderer-only and ephemeral, like composer text: a reload,
  "New conversation" (words return to the composer), or leaving the screen
  drops what was waiting. Persisting it would be a new task.
- An opened older card re-folds only via its chip; a reload also re-folds
  (the newest-expanded rule is the deterministic default).
- Whether the conversation now *feels* smooth is the owner's judgment — the
  shots page (`app/shots/`, top entry) shows the three states, and the four
  steps above exercise each behavior live.

**Disposition: DONE**
