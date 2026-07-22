# Task 005 — report

## Result (plain language)

Choosing the model — and now the effort — is Cairn's real, documented behaviour. Everything
task 004 built is kept exactly as it was; this task documented it, gave it a pick-list, added
the matching effort dial, and retired the "any AI product" neutrality stance the owner asked
to remove. All of it was verified offline with real command output, for $0.

What changed, in plain words:

- **The guides now say it.** `EVERYDAY-WORKFLOW.md` has a "Choosing the model and effort"
  section naming the default (`claude-opus-4-8`) and the plain cost note: a bigger model, or
  a higher effort, costs more per real run. `cairn.html` carries the same note as a "Model &
  effort" card on the daily dashboard.
- **The pick-list is live in two places.** The app's Settings → Model field now offers all
  seven current Claude models as a dropdown (`claude-fable-5`, `claude-opus-4-8` (default),
  `claude-opus-4-7`, `claude-opus-4-6`, `claude-sonnet-5`, `claude-sonnet-4-6`,
  `claude-haiku-4-5`) while still accepting any typed id; `cairn help` names the same picks
  and the default.
- **Effort is choosable.** `cairn task --effort <low|medium|high|xhigh|max>` in the CLI and a
  Settings → Effort choice (five levels + Default) in the app. An invalid CLI level fails
  before any run with one plain line naming the valid choices. Nothing chosen means no
  effort option is sent at all — byte-for-byte today's behaviour.
- **The neutrality stance is removed** from its five homes (`MAINTAINERS.md` rule 7,
  `PROJECT.md`'s out-of-scope line, `README.md`, `GETTING-READY.md`, and `cairn.html`'s
  onboarding card). The docs now say plainly: Cairn is built on Claude, Claude Code is the
  recommended agent, and the written commands still work in similar tools. The freedom the
  old line protected lives in the model field itself — type any id you want.

Nothing about *what each role is allowed to do* changed — only which model runs and how hard
it thinks. The contract (`AGENTS.md` / `CONTRACT-TEMPLATE.md`) is untouched: no version bump,
no changelog entry, and `cairn.html`'s embedded contract block still matches the template
byte-for-byte (verified, see below).

## Files changed

Docs and stance (as named in the brief):

- `EVERYDAY-WORKFLOW.md` — new "Choosing the model and effort" section with the cost note.
- `cairn.html` — the onboarding "AI coding agent" card now recommends Claude Code (the
  "Cairn doesn't care which you pick" sentence is gone); a new "Model & effort" card sits
  beside the Direction Gate and High-Stakes cards. Two edits, nothing else.
- `MAINTAINERS.md` — rule 7 no longer forbids ties to an AI product; everything else in the
  rule (no personal data, self-contained app, no CDNs, language-neutral) is kept, plus one
  sentence saying Cairn builds on Claude.
- `README.md` — the two "works with any AI" claims rephrased: built on Claude, Claude Code
  recommended, written commands portable.
- `GETTING-READY.md` — the AI-coding-agent section now recommends Claude Code.
- `docs/ai-work/PROJECT.md` — "anything that ties the written protocol to a single AI
  product" removed from Out of scope. Nothing else in the file changed.

Code (mirroring task 004's accepted seam):

- `core/src/agents.ts` — new `EFFORT_LEVELS` (`low|medium|high|xhigh|max`) and a pure
  `resolveEffort(explicit?)`: explicit wins, else `CAIRN_EFFORT`, else `undefined` (send
  nothing); both engines take an optional effort via constructor; `pickEngine(mock, model,
  effort)` threads it; `SdkEngine` adds `effort` to the existing `query(...)` options only
  when chosen; the mock engine echoes `Using model: <id> · effort: <level> (mock)`.
  `resolveModel`, `DEFAULT_MODEL`, the `canUseTool` gate, role policies, report lockout,
  `maxTurns`, and prompts are unchanged.
- `cli/src/flows/task.ts` — `parseEffort` (both flag forms, mirroring `parseModel`); the
  run prints `Using effort: <level>` when chosen; `taskFlow` threads it through.
- `cli/src/index.ts` — validates `--effort` against the five levels before any run; help
  names the default model, the seven picks, `--effort`, and the cost line.
- `cli/test/effort.test.ts` (new) — six `parseEffort` tests; registered in
  `cli/package.json`'s test script (the only package.json change anywhere).
- `app/src/renderer/screens/Settings.tsx` — `<datalist>` of the seven picks on the Model
  field (default labelled); a new Effort card (Default + five levels) persisted in
  `localStorage["cairn-effort"]`, applied on open, active level shown, with its own cost
  note. The Model field's free-text, blank-means-default, active line, and cost note kept.
- `app/src/shared/ipc.ts`, `app/src/preload.ts`, `app/src/main/tasks.ts` — one new
  `task:setEffort` IPC mirroring the model path; the main process remembers both choices
  and rebuilds the engine.
- `core/test/agents.test.ts` — six new tests (resolveEffort precedence, the level list, the
  mock echo with and without effort); the env helper generalised, existing tests unchanged.
- `docs/ai-work/tasks/005-brief.md` and this report.

**One design note, disclosed plainly.** The brief's file list did not include
`app/src/renderer/App.tsx`, whose single task-004 line applies the saved model at startup.
To make the saved *effort* also apply at startup without touching an unauthorized file, the
preload bridge sends the saved effort along with the existing `task:setModel` call (read
from localStorage at call time, wrapped in a try/catch). Worst case, if storage were ever
unreachable, behaviour degrades to exactly what task 004 shipped — model-only. No file
outside the brief's list was changed.

## Commands run and their real results

All offline. None called a real model or spent money.

- `core/ npm test` → **34 passed, 0 failed** (28 existing + 6 new effort tests).
- `cli/ npm test` → **16 passed, 0 failed** (10 existing + 6 new `parseEffort` tests).
- root `npm test` (workspaces) → **green** (34 + 16, 0 failures).
- `app/ npm run typecheck` (`tsc --noEmit`) → **clean, no errors**.
- `app/ npm run build:vite` → **built OK** (main, preload, renderer bundles), run after all
  app code changes.
- `app/ npx playwright test tests/smoke.spec.ts` → **1 passed (2.6 s)**.
- Embedded-contract check → **MATCH: cairn.html's `src-contract` block equals
  `CONTRACT-TEMPLATE.md`** (13,333 chars compared, line endings normalised).
- `cairn.html` opened in a browser → the landing screen renders and runs (the whole app is
  one script, so a syntax slip in the edited string would have blanked it).

Recorded before/after (real output):

```
cairn help =>
  Flags: --mock (offline demo engine, no AI calls) · --model <id> (choose the Claude model;
    default: claude-opus-4-8) · --effort <low|medium|high|xhigh|max> (how hard the model
    thinks; default: the model decides)
  Model picks: claude-fable-5 · claude-opus-4-8 (default) · claude-opus-4-7 ·
    claude-opus-4-6 · claude-sonnet-5 · claude-sonnet-4-6 · claude-haiku-4-5 — any model id works
  A bigger model, or a higher effort, costs more per real run.

cairn task --mock --model claude-fable-5 --effort low =>
  Using model: claude-fable-5
  Using effort: low

cairn task --mock =>
  Using model: claude-opus-4-8          (no "Using effort" line — today's exact behaviour)

cairn task --mock --effort silly =>
  "silly" is not an effort level. Valid choices: low, medium, high, xhigh, max — or leave
  the flag off for the default.        (exit code 1, before any run)
```

## How the owner can see or try the result (offline, $0)

From the repo root:

1. **The guides:** open `EVERYDAY-WORKFLOW.md` → "Choosing the model and effort"; open
   `cairn.html` in a browser → the onboarding path recommends Claude Code, and the daily
   dashboard (with a project connected, or any visit to the Daily screen) shows the
   "Model & effort" card.
2. **The CLI:** `node cli/dist/src/index.js help` → the picks and flags above.
   `node cli/dist/src/index.js task --mock --model claude-fable-5 --effort low` → both
   announced; Ctrl+C at the first question. `--mock` makes no AI call.
3. **The app:** `cd app`, `set CAIRN_MOCK=1`, `npm start` → Settings. The Model box drops
   down the seven picks; the Effort row shows Default + five levels; pick one and "Active
   effort" updates; close and reopen — both are remembered; clear both to return to the
   default. Typing a custom model id still works.

Success looks like: the model and effort you chose show up in the announcements and the
Active lines. Failure looks like: the default appears no matter what you choose, or an
effort line appears when you chose nothing.

## What still needs a human check / decisions for the owner

1. **A real, paid run is yours to make.** The checks prove your choices flow through Cairn's
   code to the SDK — not that a live combination works. Only your own
   `cairn task --model <id> --effort <level>` proves that, and it bills the paid API.
   Fable is the priciest pick and needs the account to allow standard (30-day) data
   retention; higher effort spends more per run.
2. **The Direction Gate is currently tripped.** Orientation for your next step, not part of
   this task: the log's last two tasks (003, 004) both record "milestone moved: NO", so the
   mechanical gate now fires — a `cairn task` run will hold and offer a direction check
   before defining anything new. The gate did exactly this during an offline mock probe here
   (it changed nothing). Your Decide step on this task will write the next log row either way.
3. **Fresh-context review.** This is the third Standard task since the last review —
   `Review task 5.` in a brand-new chat is due by the workflow's own rhythm.

## Limitations and remaining uncertainty

- No real model call was made; no model id or model+effort combination was validated live.
- Not every model supports every effort level (smaller models support fewer). The SDK
  handles unsupported levels on real runs; mock mode does not validate the pairing —
  the report's checks cannot prove how a given model honours a given level.
- The model pick-list is a snapshot of the current Claude lineup (from Anthropic's current
  model reference, cached 2026-06-24). When the lineup changes, the two live surfaces (the
  Settings datalist and the CLI help) are the places to update.
- The startup-apply for effort rides on the existing boot call through the preload bridge
  (see the design note above); it was exercised by the smoke test's app boot, but the
  "restart with a saved effort, run without opening Settings" path specifically is worth one
  human glance in the mock app.

## Milestone movement

NO — as the brief predicted. This task documents and finalises the dials in front of the
milestone run; it does not perform it. The milestone run is now one owner command away, with
both dials visible and chosen on purpose.

Disposition: DONE
