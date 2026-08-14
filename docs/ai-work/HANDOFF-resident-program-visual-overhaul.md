# Handoff — Cairn resident-program visual overhaul

Written 2026-08-13 after Task 229 landed and Task 230 saved the authoritative
implementation plan. The plan below is the execution authority; this file is
orientation and a copy-ready start prompt.

Copy the prompt below into a fresh Cairn/Codex conversation after Task 230 is
committed and its report says `Disposition: DONE`.

```text
Work on: Begin Cairn's app-wide resident-program visual overhaul described in:

docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md

Own the roadmap, but execute it as separate serial Cairn tasks. In this
conversation, complete only Slice 1 — the lab-only visual constitution and
system board — and stop at Owner gate 1 with something rendered for me to
inspect and exact safe trial steps. Do not start Slice 2 or cross an owner gate
by guessing approval.

Start conditions

Do not edit anything until all of these are true:

1. The project root is:
   C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework
2. Task 229 is committed and its report says `Disposition: DONE`. Its observed
   completion commit was `c3a9575`, but verify current history rather than
   assuming it.
3. Task 230's completion commit—after claim commit `77530e2`—contains its report
   with `Disposition: DONE`, this plan, this handoff, and exactly one Task 230
   LOG row. Verify the eventual completion commit rather than mistaking the
   existing claim commit for completion.
4. The complete working tree is clean and `main` is between tasks: no staged,
   modified, or untracked paths.
5. The owner confirms that no other lane is landing into `main` and Lane A is
   available for this conversation; Git and worktree presence cannot prove
   human lane availability.
6. Do not create, delete, reuse,
   reset, or move any registered worktree. A worktree's existence does not prove
   its human lane is active or free.
7. You have identified the lowest task number free in `docs/ai-work/tasks/` in
   the main checkout and every registered worktree, and across every local
   branch. Any filename beginning with that number—including a report without
   a brief—takes it. Do not assume the next number.

If any condition fails, make no edits. Report the exact blocker and the smallest
safe next step.

Required reading before implementation

Read completely:

- `AGENTS.md`
- `docs/ai-work/PROJECT.md`
- `docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`
- `docs/ai-work/tasks/229-brief.md`
- `docs/ai-work/tasks/229-report.md`
- `docs/ai-work/tasks/230-brief.md`
- `docs/ai-work/tasks/230-report.md`
- `docs/ai-work/HANDOFF-resident-program-visual-overhaul.md`
- the latest relevant visual records named by the saved plan

Inspect current files rather than trusting historical line numbers, especially:

- `app/src/renderer/App.tsx`
- `app/src/renderer/screens/Workspace.tsx`
- `app/src/renderer/screens/Chat.tsx`
- `app/src/renderer/screens/Dashboard.tsx`
- `app/src/renderer/screens/TaskRun.tsx`
- `app/src/renderer/tokens.css`
- `app/src/renderer/app.css`
- `app/src/renderer/motion.css`
- `app/src/renderer/town/presentation.ts`
- `app/src/renderer/town/model.ts`
- `app/src/renderer/components/ProjectRail.tsx`
- `app/src/renderer/components/Scene.tsx`
- `app/src/renderer/components/BuilderProposalReview.tsx`
- `app/src/main/bridge/phonepage.ts`
- the relevant lab, visual, accessibility, unit, and Playwright tests

Visually inspect the approved references before drawing or styling:

- Darkened approved UI mockup:
  `C:\Users\KenJL\.codex\generated_images\019ffd1c-5e39-7273-89bb-aeff037f9650\exec-916fd1da-c80e-47ca-8be7-b725b8a39398.png`
  expected SHA-256:
  `5B56B4A7018D35BA4D815DD161E591470092915E11A705873E758B3F698CF470`
- Face audition board, with face D selected:
  `C:\Users\KenJL\.codex\generated_images\019ffd1c-5e39-7273-89bb-aeff037f9650\exec-2d6630ac-e3b0-4191-9618-8c30e34589c5.png`
  expected SHA-256:
  `AFCAD4FF92CF8C07B7F1E00B34B1D28E2F2A12F70B964EDB454AF275738EC5D0`
- Original mood references:
  `C:\Users\KenJL\Desktop\CAIRN REF\ref1.png` through `ref8.png`

Verify the two approved hashes before copying them into the tracked design
reference area required by Slice 1. If either source is absent or differs, stop
and ask me to reattach it. The generated mockup and D face are the approved
target; the original images are mood influences, not assets or layouts to copy.

Fixed owner decisions

- Chat is the primary product surface.
- Retire the pond, town, worker cast, literal stone scene, and visual task/agent
  representation.
- Cairn is a small resident software program, not a humanoid mascot, animal,
  spider robot, orb, or fixed oversized avatar.
- Cairn's approved body is three offset rounded software panes: warm amber front,
  translucent teal rear panes, clipped top-right corner, and tiny cyan seam/data
  marks.
- Face D is the base: outlined square left eye, closed crescent right eye, and
  tiny lopsided stepped smile.
- The primary UI is a slightly darker dusty blue-gray shell around warm
  parchment conversation paper, with deep blue-green ink, teal actions, apricot
  owner notes, pale-blue activity, sage success, and restrained coral risk.
- “Slightly darker” modifies the approved daylight shell by one step. It does
  not mean returning to a dark/digital/neon workspace.
- Preserve System, Light, and Dark choices. The Dark treatment is the same warm
  desk after dusk, not the old garden.
- The product is matte, tactile, calm, and lightly playful—not glassy,
  circuit-board-like, ominous, generic “AI,” or a copy of any reference.
- Cairn can inhabit the currently relevant surface but must not be repeated as
  decoration everywhere.
- Every important state remains written in plain language. Color, motion, and
  expression reinforce truth but never carry it alone.
- Face D itself is approved; the derived thinking/pushback/working/checking/
  DONE/STOPPED/error expressions are not. Bring those to Owner gate 1.

Behavior that must not change

This is presentation architecture, not a workflow rewrite. Preserve:

- conversation, streaming, queues, pushback, questions, proposals, dispatch,
  approvals, cancellation, stop/retry/take-back/new-conversation, reattachment,
  results, evidence, commentary, follow-ups, push, and connection recovery;
- all safety/authorization boundaries and exact provider/model/data/cost/
  recovery disclosures;
- verified facts versus worker-reported claims and owner context;
- literal DONE/STOPPED/ERROR semantics;
- App overlay mounting, inert background, keyboard behavior, and focus restore;
- project switching, stale-project guards, serial runtime, and evidence-capture
  identity/bounds;
- runtime presentation truth. `town/presentation.ts` may be renamed only in a
  later slice after equivalent monotonicity, dedupe, stale-timer, terminal, and
  reduced-motion tests exist;
- saved owner data. Never delete or transform `.cairn/town-square.json`;
- Task 229's Builder proposal card as lab-only, literal, actionless,
  nonterminal, and authority-free;
- the phone companion's currently shipped self-contained, LAN-only/no-cloud/no-
  third-party, read-only authority. This visual plan neither implements nor
  cancels the separately accepted future full-parity direction;
- Playwright's exact then-current mutex protocol and `workers: 1` discipline.
  Track ownership for every required token location and release only what the
  task created, in `finally`.

No-go constraints

- Do not begin by changing the production Workspace or app palette. Slice 1 is
  a lab-only board and written visual constitution.
- No big-bang rewrite of `Chat.tsx` or `app.css`.
- No new dependency, font, browser install, remote image, image-generation call,
  provider/model call, credential use, paid call, external write, push,
  publication, or deployment.
- No deletion of legacy presentation code until every consumer and truthful
  behavior has migrated and replacement tests pass.
- Do not bulk-delete old visual tests. Classify each as preserved, rewritten,
  or replaced, with replacement proof.
- No perpetual decorative motion, delayed typewriter text, or transformed
  interactive container. Reduced motion reaches the same semantic end state.
- Do not weaken contrast, touch targets, focus visibility, native semantics,
  screen-reader status, minimum-window support, or long-copy containment.
- Do not clean, stash, reset, broadly stage, overwrite, or disturb another
  lane's work.
- Subagents may perform read-only audits/reviews, but only one task and one
  writer may change this repository at a time.
- Slice 1 may write only its brief/records, the two exact tracked design-reference
  copies, lab-only files, and focused lab/qualification tests/config. Do not edit
  `app/src/**`, `core/**`, `app/src/main/bridge/phonepage.ts`, package manifests
  or locks, IPC, stores, or production routes. Its phone view is synthetic lab
  composition; production Cairn belongs to Slice 3.
- “Product-dark” means absent from production imports, routes, and bundles—not
  visually dark.

First action

Run a read-only preflight:

- confirm the exact repository root;
- inspect complete Git status and recent history;
- confirm Task 229 and Task 230 DONE reports and commits;
- confirm the saved plan and handoff are committed;
- list registered worktrees and local branches;
- inventory task filenames everywhere required by `AGENTS.md`;
- establish that `main` is clean, between tasks, and not receiving a landing;
- inspect Task 229's final lab/config/test paths so Slice 1 composes with them;
- verify the approved reference hashes.

Then restate Slice 1's owner-visible outcome in plain language. Claim the lowest
genuinely free task number by writing its complete brief with stable `cN` checks
and commit that brief alone before any source or reference-copy change.

After that brief-only claim commit, copy the approved references only to:

- `docs/visual-reference/cairn-resident-program-ui-approved-2026-08-13.png`
- `docs/visual-reference/cairn-face-d-approved-2026-08-13.png`

If either destination already exists, verify the expected hash and stop on any
mismatch; never overwrite a different file.

Implement and qualify only Slice 1 exactly as the saved plan defines it. Use code-native
geometry and synthetic lab data. Bring me the rendered board—not code—to judge.
Provide exact safe lab steps and screenshots for System, Light, Dark, wide,
minimum, compact, and phone compositions. Test System through browser
color-scheme emulation rather than changing my operating-system setting. Shut
down all lab/browser processes afterward and prove the port and any task-owned
token were released. Pause at Owner gate 1. Human-taste DONE requires my
explicit verdict; do not continue automatically.
After my verdict, close Slice 1 with its truthful report, one LOG row, and exact-
path completion commit as DONE or STOPPED under `AGENTS.md`. Never begin Slice 2
in this conversation.
```
