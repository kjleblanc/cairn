# Task 009 — report

## Result (plain language)

Both rough edges named in the brief are fixed. This is a Draft — one candidate
design for you to judge by using it.

1. **The five-step walk reads cleanly.** The app's tiny text renderer now
   understands what Cairn's own agents actually write: numbered lists come out
   numbered, indented sub-points nest properly, lines that wrap in the file
   join into one clean paragraph, fenced code blocks appear as one styled
   block, and simple tables render as real tables. No more `**`, `#`, `|---|`,
   or backtick litter in the brief, the report, the verdict, or the try-it
   box. It still builds screen elements the safe way — never injected HTML —
   and it never changes what any file on disk contains, so approval still
   locks the exact file bytes. The live activity feed is tidier too: markdown
   litter is stripped from each line, tool actions show in a quieter style,
   and empty lines are dropped. A free side effect, disclosed in the brief:
   the Direction screen uses the same renderer, so it reads better without
   being edited.
2. **A way home, and a way back.** Every step of the task walk now has a
   "← Project home" button — including while the AI is working, where a small
   note says "the AI keeps working if you step away." Going home never touches
   the run: the task screen stays alive behind the home screen (the running
   agent lives in the app's engine room and was never tied to the screen —
   the window just used to throw the live view away). While a task is open,
   the home and projects screens show one plain clickable reminder — "Task 001
   is still building — the AI keeps working while you look around," or, if the
   AI has asked you something, "The AI is waiting on a question for you." One
   click lands you back exactly where the task stands — live view, waiting
   question card and all — or on the finished result if it ended while you
   were away. Trying to start a second task while one runs gets the plain
   "One step at a time — an agent is already running." message.

**Two design judgments, disclosed.**

- The one-step-at-a-time message now appears the moment you click, from the
  window itself, using the engine room's exact words — you no longer have to
  wait for the engine room to refuse. The engine room's own refusal is
  untouched and still stands behind it.
- One open walk at a time, even at quiet steps: if a task in *another* project
  is parked mid-walk (say, at a brief waiting for approval) and you try to
  start a task elsewhere, the app says that task is still open and points you
  to the reminder. Without this, the parked walk's screen would have been
  silently thrown away.

## An honest note: this task was built across two sessions

When this build session started, the working tree already held roughly 370
lines of uncommitted changes plus two new files — a previous builder session
for this same task had been interrupted before running checks, writing this
report, or committing. Before touching anything I verified: the brief's
SHA-256 matched the CLI's approval record exactly (`4b6517f5…`), and every
changed file sat inside this brief's allowed list. I read the entire existing
diff hunk by hunk and both new files in full, judged the work a faithful and
complete build of this brief, and finished the task rather than redoing it:
all checks, this report, and the commit are from this session. Task 008 went
through the same thing and the gates held then too. The reviewer should treat
all of it as one builder's work to verify.

## Files changed

- `app/src/renderer/components/Md.tsx` — the renderer learns numbered lists
  (keeping their real numbers), nested sub-points, wrapped-line joining,
  *italics*, fenced code blocks, horizontal rules, and simple tables. Still
  React screen elements only; display only.
- `app/src/renderer/components/ActivityFeed.tsx` — each feed line is tidied
  (markdown symbols stripped, whitespace folded, blanks dropped); tool lines
  get a quieter style.
- `app/src/renderer/components/RunReminder.tsx` — **new**; the one new
  component (the brief allowed up to two). The clickable reminder banner: one
  plain sentence about what the open task is doing, with a distinct look for
  working / waiting-on-you / ready.
- `app/src/renderer/screens/Wizard.tsx` — the "← Project home" button on
  every step; reports its step and any waiting question upward so the
  reminder can tell the truth. Nothing about how it talks to the engine room
  changed.
- `app/src/renderer/App.tsx` — the task walk now lives behind the other
  screens instead of being destroyed on navigation; shows the reminder on the
  home and projects screens; refuses a second simultaneous walk.
- `app/src/renderer/app.css` — style rules for the document look, the tidier
  feed, and the reminder.
- `app/tests/away.spec.ts` — **new**; the one allowed test file (two tests,
  detailed below). It snapshots and restores the machine's real
  remembered-projects file, so a test run leaves no trace in your app.
- `docs/ai-work/tasks/009-report.md` — this report.

`app/src/renderer/screens/StepRail.tsx`, `Dashboard.tsx`, and `Picker.tsx`
were allowed but needed no edit — the reminder is placed above them from
`App.tsx`. **Not touched, verified in the diff:** nothing under
`app/src/main/`, `app/src/preload.ts`, `app/src/shared/`,
`app/src/renderer/api.ts`, `core/`, or `cli/`; no `package.json` or lockfile;
`app/tests/smoke.spec.ts`, `projects.spec.ts`, and `ask.spec.ts` unchanged.
Your uncommitted `docs/ai-work/LOG.md` decision rows (005–008), the
`007/008/009-approval.json` files, and the four unpushed commits were left
exactly as found. Nothing was pushed, installed, or sent anywhere.

## Commands run and their real results

All offline, in mock mode; no real model call, no money, nothing installed.
(The PowerShell command runner's permission layer failed with the same
internal error tasks 007 and 008 reported, so commands ran through the Bash
runner.)

1. `sha256sum docs/ai-work/tasks/009-brief.md` →
   `4b6517f5…addb93`, **equal** to the hash in the CLI's approval record.
2. `app/ npm run typecheck` → clean.
3. `app/ npm run build:vite` → all three bundles built (main, preload,
   renderer).
4. `app/ npx playwright test` → **8 passed (1.7 m), 0 failed**: the two new
   tests plus, unchanged, the two ask tests, the three project tests, and the
   smoke test. The new tests prove exactly what the brief demanded:
   - *Rendering:* a crafted fixture holding a numbered list with wrapped
     lines, indented sub-points, inline code, a fenced block, and a small
     table — **concatenated with the real task 008 brief and report from this
     repo, the brief's yardstick** — renders with a real numbered list
     (wrapped lines joined), nested sub-points, one styled code block, real
     table cells, and **zero** raw `**`, triple-backtick, `|---`, `1.`, `- `,
     or `#` litter anywhere outside code blocks.
   - *Going home:* a mock run is left via "← Project home" **while the AI is
     waiting on its question** — the reminder says so plainly; a second
     "Start a task" gets the one-step-at-a-time message; one click returns to
     the same untouched question card (never silently thrown away); stepping
     away again, the untouched card's 10-second demo self-skip fires as
     today and the reminder flips to "brief ready"; after approving and
     leaving mid-build, returning lands on the same task's report; the file
     system shows task 001 only, never a 002 (nothing restarted or doubled);
     and the walk closes normally to "1 stone."
5. `git diff` (every hunk) and `git status` inspected in full, before and
   after the test run → only the files listed above changed; the protected
   work is byte-for-byte as found; the tests left the machine's real
   `projects.json` exactly as it was.

## How you can see or try it (offline, $0)

Close any open Cairn Desktop window first — an old window runs old code. Then
from the repo root: `cd app`, then `set CAIRN_MOCK=1`, then `npm start`.

- **Success looks like:** start a task; the drafted brief reads like a clean
  document — numbered lists numbered, sub-points indented, tables readable,
  no `**` or `|---|` anywhere. While the build runs, click "← Project home":
  the home screen appears with a plain reminder that the task is still
  working; browse another project if you like; click the reminder and you are
  back on the live task exactly where it stands (or on the finished report,
  if it finished while you were away). Try "Start a task" while the first
  runs — you get the plain one-step-at-a-time note and nothing breaks.
- **Failure looks like:** raw markup litter still shows; going home kills,
  restarts, or doubles a run; there is no way back, or the way back lands on
  a blank or wrong screen; a question the AI asked while you were away is
  silently gone; or a second agent starts alongside the first.

## What still needs a human check

1. **Your own eyes on the text and your own hands on the navigation** — the
   scripts prove no litter and an undisturbed run; only you can say whether
   the documents *read* well and stepping away *feels* safe. That judgment is
   the point of a Draft.
2. **The first real-model run with the home button** — everything above ran
   in mock mode. The reasoning says navigation can't touch the run (the agent
   lives in the engine room, which was not edited), but the first real run
   where you actually step away should be watched.
3. **The one-open-walk judgment** — is being pointed back to a parked task in
   another project helpful, or annoying? Your call.

## Limitations and remaining uncertainty

- **Mock mode only.** No real model ran, by design — the brief allowed
  nothing that spends money. See the human checks above.
- **The renderer is deliberately small.** It covers what Cairn's agents
  actually write (proven against the real task 008 texts). Exotic markdown —
  nested tables, images, links-as-buttons, four-plus levels of list nesting —
  is out of scope and would show as plain text, not a crash.
- **The reminder appears on the home and projects screens only.** On the
  Settings and Direction screens there is no banner; the walk still survives
  visiting them, and going back home shows the reminder again.
- Evidence proves the named checks ran and passed; it cannot prove the
  design feels right, and a mock run cannot prove live-model behavior.
- `docs/ai-work/tasks/009-approval.json` (the CLI's approval record) stays
  uncommitted, matching tasks 007 and 008; the contract names the commit's
  contents as brief, implementation, and report. Tasks 004 and 006 committed
  theirs — the owner may want one consistent rule some day.

## Milestone movement

YES — the milestone is "a real-model cairn task completes an improvement to
Cairn itself, end to end." This task is a real improvement to Cairn — the
owner can only approve well what they can read well, and the way home removes
a real reason to abandon a long real-model run midway — and it was defined,
hash-approved, built, and checked through Cairn's own gated tooling. As with
tasks 007 and 008, the loop's last step — your decision — is what closes it
end to end. For the record: the build again spanned two sessions after an
interruption, and again the gates (the hash-locked brief, the allowed-files
list, the declared checks) held across the gap.

Disposition: DONE
