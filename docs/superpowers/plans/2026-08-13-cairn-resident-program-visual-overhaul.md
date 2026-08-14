# Cairn resident-program visual overhaul — implementation plan

**Status:** READY for serial implementation after Task 230 is DONE and its
completion commit has landed.

**Planning task:** Task 230. **Repository baseline audited:** Task 229 completion
commit `c3a9575`. **Task 230 claim commit:** `77530e2`.

**Owner authority:** This plan records the visual decisions made in the
2026-08-13 design conversation. It supersedes earlier pond, town, worker-cast,
stone-scene, B2-face, and exact Lantern presentation decisions. It does not
supersede workflow truth, safety, provenance, project isolation, accessibility,
phone authority, result authorship, or any historical record.

**Goal:** Make Cairn feel like one small, memorable software intelligence living
inside a calm, chat-first desktop app. Retire the literal pond and visible worker
world, introduce the approved pane-based Cairn with face D, and carry one
slightly darker dusty-blue and warm-paper visual system through every owner-facing
desktop and phone surface without changing what the product is allowed to do.

**Technical approach:** Preserve behavior-bearing React and Main state machines;
separate runtime truth from the outgoing Town presentation; add semantic tokens,
code-native Cairn art, and bounded stylesheets; migrate one visible surface family
at a time; remove obsolete Town/Pond code only after every consumer and truth test
has moved. TypeScript, React, plain CSS, `node:test`, and Playwright remain the
stack. No new dependency is planned.

**This plan claims no future task numbers.** Each implementation slice is claimed
only when it begins, using the lowest number then free across the main checkout,
all registered worktrees, `main`, and every local lane branch. Every slice gets
its own brief, stable `cN` checks, report, LOG row, and exact-path local commit.

## 1. Owner-visible finish line

When the whole plan is complete:

- Cairn opens on a centered, warm conversation surface inside a slightly darker
  dusty-blue desktop shell.
- The pond, TownSquare, draggable workers, worker faces, transfer packets,
  ripples, tucked villager bubble, and literal stone landscape are absent from
  the owner-facing product.
- Cairn is a small resident software program: three offset rounded panes, a warm
  amber front pane with a clipped top-right corner, translucent teal rear panes,
  tiny cyan seam/data marks, and the selected D face.
- Chat is the visual and interaction center of gravity. Project navigation,
  activity, evidence, settings, and operational detail remain easy to reach but
  visually subordinate.
- Tasks and workers are represented by plain-language activity, provenance, and
  evidence where relevant—not characters moving through a world.
- Questions, proposals, approvals, live work, results, errors, evidence, project
  management, settings, and the local phone companion all feel like parts of one
  product.
- System, Light, and Dark theme choices still work. “Slightly darker” means one
  step darker than the approved daylight mockup's shell; it is not permission to
  return to a neon or permanently dark digital cockpit.
- The complete request → pushback → dispatch → verified DONE or honest STOPPED →
  Cairn commentary journey works exactly as before and is easier to understand.

## 2. Approved visual constitution

### 2.1 Cairn

The selected base is **face D**:

- outlined square left eye;
- gentle closed-crescent right eye; and
- tiny lopsided stepped smile.

The body is an original stacked-window program, not a humanoid, animal, orb,
spider robot, anime portrait, or conventional assistant avatar. The form uses
three offset software panes. The front pane is amber and carries the face; two
teal panes sit behind it; the upper-right corner is clipped; two or three tiny
data squares may sit at a seam.

Cairn should read as warm, capable, conspiratorial, and slightly impish. He can
appear in the surface that currently matters—header at rest, current response,
decision pause, activity, or result—but must not be stamped decoratively on
every card. There is one canonical expressive presence. A tiny brand mark may
repeat in chrome, but it does not become a second status source.

The final production form should be a code-native React/SVG component. That
keeps geometry sharp from a roughly 28–34 px brand mark through a roughly
64–88 px conversational presence, supports state changes without raster
replacement, and adds no asset pipeline or dependency.

### 2.2 Cairn's semantic states

Face and pane treatments reinforce state; written language carries truth. The
first implementation task must present the expression geometry at real runtime
sizes for owner approval before production use.

| Semantic state | Required written truth | Character direction to audition | Motion rule |
|---|---|---|---|
| Ready / idle | `Ready` or no redundant status when context is obvious | D unchanged; relaxed | Static |
| Thinking / replying | `THINKING` or Cairn prose visibly streaming | D-derived attentive state | One finite arrival/reassembly; never delay text |
| Needs owner / pushback | `NEEDS DECISION` or equivalent explicit request | Focused and candid, not angry | One finite amber emphasis |
| Starting / working | `WORKING · 1 APPROVED TASK` or exact truthful count | Purposeful, compact | One dispatch pulse; no loop |
| Checking | `CHECKING` | Concentrated | One finite scan/settle |
| Done | `VERIFIED DONE` where verification supports it | Contained satisfaction, not celebration | One settle; no confetti |
| Stopped | `STOPPED` plus reason and next choice | Serious and attentive, not ashamed | Static after one arrival |
| Error | `ERROR` plus plain-language effect and recovery | Distinct from STOPPED but not menacing | Static after one arrival |
| Disconnected | `NOT CONNECTED` or the current explicit connection copy | Neutral and available | Static |

The state board decides expression geometry. The table does not pre-approve
unseen variants.

### 2.3 Interface character

The target is calm, tactile software with a small resident intelligence—not a
cyberpunk dashboard and not a toy-game imitation.

- Outer structure: dusty blue-gray, one step darker than the approved final
  mockup.
- Conversation: warm parchment/ivory with quiet static fibre.
- Text: deep blue-green ink; long prose uses a comfortable regular weight.
- Owner messages: warm apricot notes.
- Cairn/action accent: teal.
- Activity: pale blue.
- Connected/success: pale sage.
- Attention: warm amber.
- STOPPED/error: restrained coral, always paired with words and shape/icon.
- Shape: softly rounded but not bubbly everywhere; cards feel like paper and
  controls feel tactile.
- Depth: subtle shadows and hairlines. No glass panels, circuit traces, neon
  glow, fake code fields, holographic grids, or excessive gradients.
- Texture: at most one restrained, static paper/noise vocabulary; never animated.

Starting palette seeds below are relationships, not unchecked release values.
Implementation may adjust them to meet contrast while preserving the approved
temperature and hierarchy.

| Role | Daylight seed |
|---|---|
| Dusty shell | `#BFCED2` |
| Quiet chrome | `#D7E0E1` |
| Conversation paper | `#F3EBDD` |
| Raised paper | `#FAF4E8` |
| Ink | `#15384B` |
| Muted ink | `#607681` |
| Teal action | `#177F8C` |
| Cairn amber | `#F0C65A` |
| Owner apricot | `#F2D2AC` |
| Activity blue | `#D2E2E9` |
| Success sage | `#D9E4C9` |
| Risk coral | `#C86F67` |

The Dark theme must be designed as the same warm paper desk after dusk, not the
old garden or a blue-neon inversion. System follows the operating-system theme;
the saved `cairn-theme` behavior remains compatible.

### 2.4 Typography, density, and controls

- Reuse the bundled Quicksand 400/600/700 faces and system fallbacks. Do not
  install a font.
- Use 400 for most long conversation prose, 600 for compact labels and controls,
  and 700 sparingly for headings or decisive states.
- Body text is normally 16–18 px, about 1.5–1.6 line height, and 65–75 characters
  wide.
- Monospace is reserved for commands, paths, hashes, check ids, and comparable
  machine evidence.
- Interactive targets are at least 44×44 px. Focus is obvious and meets 3:1
  non-text contrast.
- Body text meets 4.5:1; large text and non-text controls meet 3:1.
- Hover, focus, active, disabled, busy, error, and long-copy states are designed,
  not left to browser defaults.
- At minimum height, message history scrolls. Header, truthful activity, and
  composer retain natural size and never overlap.

### 2.5 Motion

“Nothing moves that you did not cause.” Motion is finite, event-driven, and
transform/opacity-based. Cairn may arrive, separate, reassemble, blink once, or
settle in response to a real event. There is no perpetual float, sheen, blink,
packet, ripple, bounce, or glitch loop. Text is never held back for a typewriter
effect. Reduced motion reaches the identical semantic end state without travel
or stagger. No transform is applied to a container that holds interactive
controls.

### 2.6 Reference custody and originality

Approved target references currently live outside Git:

- Darkened approved UI mockup:
  `C:\Users\KenJL\.codex\generated_images\019ffd1c-5e39-7273-89bb-aeff037f9650\exec-916fd1da-c80e-47ca-8be7-b725b8a39398.png`
  — SHA-256 `5B56B4A7018D35BA4D815DD161E591470092915E11A705873E758B3F698CF470`.
- Face audition board, with D selected:
  `C:\Users\KenJL\.codex\generated_images\019ffd1c-5e39-7273-89bb-aeff037f9650\exec-2d6630ac-e3b0-4191-9618-8c30e34589c5.png`
  — SHA-256 `AFCAD4FF92CF8C07B7F1E00B34B1D28E2F2A12F70B964EDB454AF275738EC5D0`.
- Original mood references:
  `C:\Users\KenJL\Desktop\CAIRN REF\ref1.png` through `ref8.png`.

The first visual task should verify those hashes and copy the two approved
generated references into these exact tracked, non-product paths using lossless
byte copies:

- `docs/visual-reference/cairn-resident-program-ui-approved-2026-08-13.png`;
- `docs/visual-reference/cairn-face-d-approved-2026-08-13.png`.

If a destination already exists, verify that its hash matches before doing
anything; never overwrite a different file. If a source is absent or a source
or destination hash differs, stop and ask the owner to reattach or resolve it;
do not substitute a remembered image.

The mood references contribute principles only: emotionally legible presence,
one playful program inside a machine, warm/cool cinematic contrast, and calm
friendly hierarchy. Do not copy a Laughing Man mark or circular text, a
Tachikoma body, an anime character, Ed's exact signature, Animal Crossing's
cursor/tabs, or any proprietary logo/layout. Cairn must remain original.

## 3. Product truth that must survive

This is presentation architecture, not a workflow, security, or personality
rewrite. Every implementation task preserves:

1. Cairn as the conductor who knows the project, pushes back plainly, follows
   the owner's decision, dispatches a swappable worker, and reports verified
   outcomes honestly.
2. The primary milestone journey: request → pushback → dispatch → verified DONE
   or honest STOPPED → result-card commentary.
3. Chat streaming, queued sends, unsent drafts, stop, retry, take-back, new
   conversation, close/reopen reattachment, and saved-result recovery.
4. Exact task proposal, question, review, dispatch, critic, repair, harness,
   publication/push, cancellation, busy, stale-action, and focus semantics.
5. Provider/model identity, data scope, selected-file scope, cost basis, recovery,
   and separate approval at every real risk boundary.
6. The difference between Cairn-checked facts, worker-reported claims, owner
   request context, and unverified suggestions.
7. Literal `DONE`, `STOPPED`, and `ERROR` meaning; state is never color-, face-,
   position-, or motion-only.
8. The serial runtime, project-local records, project-switch isolation, stale
   poll guards, unfinished-run recovery, and current-project capture identity.
9. `App`'s persistent base view plus inert and `aria-hidden` overlay behavior,
   Escape behavior, focus containment, and focus restoration.
10. The single truthful runtime presentation source: snapshot monotonicity,
    cue deduplication, stale-timer inertness, terminal settlement, and reduced-
    motion parity currently implemented under `renderer/town/presentation.ts`.
11. Existing stored data. Never delete or transform an owner's
    `.cairn/town-square.json`; an obsolete file may safely remain unread.
12. The phone companion's currently shipped authority. It is self-contained,
    LAN-only with no cloud or third party, and read-only after pairing; this
    visual plan neither implements nor cancels the separately accepted future
    full-conversation/approval-parity direction.
13. Task 229's Builder proposal review as a lab-only, literal-text, no-callback,
    no-control, no-route, nonterminal, authority-free surface.
14. The dormant Task-Spec candidate route and Builder proposal activation remain
    dark or output-only. Existing critic, repair, and harness approval surfaces
    remain exactly as active and reachable as they are at the settled baseline.
15. Keyboard access, native control semantics, ARIA live regions, accessible
    names, reduced motion, zoom/long-copy containment, and theme persistence.

Worker characters can disappear. Worker/provider names cannot disappear where
provenance, routing, consent, or cost depends on them.

## 4. Current architecture and migration seams

The audited baseline is a persistent shell:

```text
App
├─ Welcome
├─ Picker / creation / checkup / conversion
└─ Workspace (defaults to Chat)
   ├─ ProjectRail
   ├─ Chat
   │  ├─ connection and conversation
   │  ├─ questions and proposals
   │  ├─ approvals and live run
   │  ├─ result/evidence/commentary
   │  └─ publication/push
   ├─ Dashboard
   └─ TaskRun

Settings and in-project Picker are overlays above the still-mounted base.
The phone page is a separate self-contained HTML/CSS/JS renderer.
```

The migration must respect four load-bearing seams:

- `app/src/renderer/screens/Chat.tsx` is a large behavior state machine. Change
  its presentation in bounded passes; do not rewrite its orchestration with its
  skin.
- `app/src/renderer/screens/Workspace.tsx` combines project switching, polling,
  event cues, capture identity, view routing, responsive state, and Town
  presentation. Separate truth before removing scenery.
- `app/src/renderer/app.css` is a long cascade with late task-specific overrides.
  Do not append another whole-theme override. Add bounded namespaced files,
  migrate consumers, then delete old blocks.
- Town presentation mixes truthful runtime projection with visual flight/landing
  cues. Extract the truth into `renderer/activity/presentation.ts` before deleting
  Town components.

Useful existing behavior-bearing surfaces include `App.tsx`, `Workspace.tsx`,
`Chat.tsx`, `TaskRun.tsx`, `ConnectCard.tsx`, `QuestionCard.tsx`, `TaskCard.tsx`,
`TaskReview.tsx`, `DisclosureConfirm.tsx`, `CriticCall.tsx`, `RepairCall.tsx`,
`HarnessRevision.tsx`, and `EvidenceAlbum.tsx`. Existing paper hierarchy from
Tasks 185–194 is reusable even though its color and environment change.

Presentation-heavy retirement candidates include `TownSquare.tsx`,
`TownDetail.tsx`, `PondLine.tsx`, `Scene.tsx`, `town/faces.ts`, `town/layout.ts`,
and most of `town/model.ts`. They are removed only after replacement proof.

## 5. Whole-app surface and state matrix

Each row must appear in the visual lab or an executable rendered scenario before
the overhaul closes.

| Surface family | Required representative states |
|---|---|
| Boot and shell | loading, welcome, recent project, broken project, base inert under overlay |
| Project entry | picker, new project, checkup, conversion inspect, conversion confirmation/error |
| Chat basics | empty, disconnected, connected, owner turn, Cairn turn, streaming, queued, retry/take-back, error |
| Decisions | question, pushback, proposal, quality review, set-aside, needs-owner |
| Authorization | dispatch disclosure, provider/model/data/cost, critic, repair, harness revision, cancellation |
| Runtime | starting, working, checking, reattached, stopped, error, task-running composer lock |
| Results | verified DONE, STOPPED, ERROR, worker claims, Cairn facts, folded history, commentary, follow-up |
| Evidence and publication | evidence pair/album, missing evidence, push available, push confirmation, push result |
| Project/support | Dashboard summary, rail collapsed/expanded, project switch, Settings, ConnectCard, PairPhone |
| Manual/dormant | TaskRun, lab-only Builder proposal review, output-only dormant surfaces |
| Responsive/theme | System, Light, Dark; 1320×980, 1320×820, 760×1000, 760×720, supported minimum 760×620, plus test-only below-minimum containment stress at 540×900 |
| Phone | pairing; invalid, expired, and revoked/unpaired recovery; live/offline; owner/Cairn turns; streaming; DONE; STOPPED/error at 390×700 |

## 6. Global execution rules

Before every slice:

1. Read `AGENTS.md`, `docs/ai-work/PROJECT.md`, this plan, the preceding slice's
   report, and the complete Git status.
2. Confirm `main` is between tasks or work only in an owner-confirmed isolated
   lane based on the latest settled `main`. Do not infer lane availability from
   a worktree's existence.
3. Find and claim the lowest genuinely free task number. Do not preclaim later
   slices.
4. Capture a red-first test or an exact baseline for the specific behavior and
   visual contract being changed.
5. Protect every unrelated modified, staged, and untracked path. Never stash,
   reset, clean, broadly stage, or rewrite history.
6. Land source-bearing slices serially. They overlap `Workspace`, `Chat`, shared
   CSS, lab configuration, and E2E fixtures too heavily for parallel writers.
7. Use no dependency install, provider/model call, credential, paid call,
   external service, publication, push, deployment, or stored-data deletion.
   If implementation unexpectedly needs one, stop at the concrete risk boundary.
8. For Electron or Playwright work, follow the then-current exact mutex protocol
   and acquire every required token location atomically (currently the OS-temp
   `cairn-app-token` and repository-local `app/.app-token` where the harness
   requires both). Track ownership separately and release in `finally` only the
   locations this run created. If acquisition fails, wait; never remove another
   lane's or the owner's token.
9. Keep Playwright `workers: 1`. It protects the owner's real conductor
   connection snapshot and is not a performance preference.
10. Bring the owner a rendered surface—not source code—at every visual gate.
11. A lane completes and commits its exact task paths, joins the landing queue,
    re-syncs `main` only between tasks if needed, lands only while `main` is
    between tasks, runs the required build/unit settle checks in the main
    checkout, and verifies its LOG row appears exactly once. The brief-only
    claim commit and exact-path completion commit remain separate.

### Baseline command families

Every task records and runs the then-current exact commands relevant to its
slice. The audited command families are root `npm test`; App
`npm run typecheck`, `npm run test:unit`, `npm run build:lab`, and
`npm run build:vite`; plus focused or full mutex-protected serial Playwright.
These are orientation, not permission to ignore a newer package script or a
task-specific red/causal check.

For old visual tests, record one of three dispositions in the slice report:

- **Preserved:** the test asserts behavior or accessibility that still applies.
- **Rewritten:** the old appearance is superseded; the test now proves the new
  approved contract and names why.
- **Replaced:** the component no longer exists; an equivalent rendered or causal
  check proves the replacement before deletion.

No blanket snapshot update or unexplained visual-test deletion is acceptable.

## 7. Serial implementation slices

### Slice 1 — Visual constitution and owner-approved system board

**Visible finish line:** A lab-only board shows the real D program at intended
header and conversation sizes; proposed expressions for every semantic state;
type, colors, materials, controls, written activity, conversation turns, and one
representative decision-to-result sequence in System/Light/Dark, wide, compact,
and phone compositions. The owner can judge the direction without running a
real task or reading code.

**Exact paths:**

- Create `docs/superpowers/specs/2026-08-13-cairn-resident-program-visual-design.md`.
- Create `docs/visual-reference/cairn-resident-program-ui-approved-2026-08-13.png`
  and `docs/visual-reference/cairn-face-d-approved-2026-08-13.png` as exact
  lossless copies.
- Create `app/lab/resident-program.html`,
  `app/lab/resident-program.tsx`, and `app/lab/resident-program.css`.
- Create `app/tests-unit/residentprogramboard.test.ts`,
  `app/playwright.residentprogram.config.ts`, and
  `app/tests-qualification/resident-program-board.browser.spec.ts`.
- Create
  `app/tests-qualification/resident-program-bundle-dark.test.mjs`.
- Modify only `app/lab/controls.ts`, `app/vite.lab.config.ts`, and
  `app/tsconfig.unit.json` outside this task's records and reference/spec files.

**Work:**

1. Verify the external reference hashes in section 2.6 and preserve exact copies
   in the repository's design-reference area.
2. Build the board from code-native shapes and real text, not another AI image.
3. Show D unchanged plus candidate thinking, pushback, working, checking, DONE,
   STOPPED, and error variants at actual intended sizes.
4. Show daylight, dark, System behavior, focus, disabled, long-copy, and reduced-
   motion final states.
5. Include a compact written activity capsule and one representative owner note,
   Cairn reply, approval card, and result receipt.
6. Keep the board synthetic and product-dark like Task 229's lab page.

Here, **product-dark** means absent from production imports, routes, and bundles;
it does not mean dark-colored.

**Preserve:** no edits under `app/src/**`, `core/**`, package manifests/locks,
phonepage, IPC, stores, or production routes; no production import, route,
behavior, authority, connection, storage, or generated application data change.
The phone-sized view is synthetic lab composition only. Task 229's existing lab
entry and build remain intact. The production CairnProgram belongs to Slice 3.

**Exact checks:**

From the repository root:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath docs/visual-reference/cairn-resident-program-ui-approved-2026-08-13.png
Get-FileHash -Algorithm SHA256 -LiteralPath docs/visual-reference/cairn-face-d-approved-2026-08-13.png
```

Expected: the hashes in section 2.6. From `app/`:

```powershell
npm.cmd run typecheck
npm.cmd run build:lab
.\node_modules\.bin\tsc.cmd -p tsconfig.unit.json --pretty false
node --test dist-unit/tests-unit/residentprogramboard.test.js
.\node_modules\.bin\playwright.cmd test --config playwright.residentprogram.config.ts
npm.cmd run build:vite
node --test tests-qualification/resident-program-bundle-dark.test.mjs
```

The dedicated installed-Edge config remains `workers: 1`, uses a strict local
port, and renders only fixed synthetic data. The bundle-dark test inspects the
fresh `npm.cmd run build:vite` output and proves the lab page and its markers are
absent from production imports, routes, and emitted bundles. The browser test
proves keyboard/focus and horizontal containment hold; screenshots cover
1320×980, 760×620, test-only 540×900, and phone composition 390×700 in explicit
Light/Dark plus System resolved through browser color-scheme emulation. It also
checks reduced-motion final states. Do not change the owner's operating-system
setting. Shut down every lab/browser process and prove its strict port and every
task-owned token are released after capture.

**Owner gate 1:** The owner confirms implementation fidelity to the already-fixed
D body, daylight palette, and shell direction, and decides only the previously
unseen derived expressions, Dark treatment, and compact treatment. Taste-
dependent DONE requires that confirmation. Do not begin Slice 2 while the verdict
is pending.

### Slice 2 — Extract neutral activity truth with no visible change

**Visible finish line:** The running app looks unchanged, but its truthful
runtime state no longer lives in a Town-named module. A neutral activity
projection can drive Cairn and written status without worker scenery.

**Exact paths:**

- Create `app/src/renderer/activity/presentation.ts`.
- Create `app/tests-unit/activitypresentation.test.ts`.
- Modify `app/src/renderer/screens/Workspace.tsx`,
  `app/src/renderer/components/TownSquare.tsx`,
  `app/src/renderer/components/PondLine.tsx`, and `app/tsconfig.unit.json` to
  consume the neutral module.
- Delete `app/src/renderer/town/presentation.ts` and
  `app/tests-unit/townpresentation.test.ts` in the same task after every import
  and characterization has moved.
- Modify `app/tests-unit/pondline.test.ts` only to import the neutral projection;
  its outgoing visual contract remains until Slice 4.

**Work:** preserve current truth states, monotonic snapshots, repeated-activity
deduplication, dispatch/return/terminal cue ordering, stale timer inertness,
STOPPED→ERROR escalation, terminal settlement, new-run reset, commentary over a
terminal result, and reduced-motion semantic equality. Separate truth fields
from Town-only flight/landing positions without changing the rendered Town yet.

**Preserve:** current DOM, CSS, Town visuals, project switching, capture identity,
poll intervals, focus, and all runtime behavior.

**Checks:** characterize the old module first; causal state-transition tests and
existing source mutants for stale
snapshots and terminal regression; complete focused unit suite; typecheck; build;
targeted run/reattachment E2E under the mutex; a rendered no-visible-change
assertion with controlled fonts, timers, and motion where pixels are compared.
Add no mutation-test framework or dependency.

Run from `app/`: `npm.cmd run typecheck`, `npm.cmd run test:unit`, and
`npm.cmd run build:vite`, followed by the mutex-protected focused Playwright
scenarios named in the task brief for run state, reattachment, STOPPED, ERROR,
and reduced motion.

**Stop if:** truth cannot be separated without changing runtime semantics or a
stale project/run can paint the current project.

### Slice 3 — Semantic foundations and CairnProgram primitive

**Visible finish line:** Approved tokens, type, focus, controls, paper materials,
motion primitives, and CairnProgram exist as reusable production components and
remain demonstrated in the lab; the production workspace composition is not yet
swapped.

**Exact source paths:**

- Modify `app/src/renderer/tokens.css`, `app/src/renderer/main.tsx`,
  `app/src/renderer/motion.css`, `app/src/renderer/components/Ui.tsx`, and the
  Slice 1 resident-program lab files.
- Create `app/src/renderer/workspace.css`, `app/src/renderer/surfaces.css`,
  `app/src/renderer/cairn-program.css`, and
  `app/src/renderer/components/CairnProgram.tsx`.
- Create `app/tests-unit/cairnprogram.test.ts` and
  `app/tests-unit/visualtokens.test.ts`; modify `app/tsconfig.unit.json`.

**Work:**

1. Add semantic roles such as desk field/chrome, paper/raised paper, ink/muted,
   hairline/focus, Cairn amber/teal/seam, info/attention/success/stop, and depth.
2. Preserve old aliases and their existing computed values while unmigrated
   surfaces still consume them; a foundation task must not silently recolor the
   rest of the app before its surface slice.
3. Remove the forced-night assumption from new components; do not yet delete old
   garden tokens.
4. Implement approved state geometry in one decorative SVG with
   `aria-hidden="true"` and `focusable="false"`; it has no announced name or
   state. Textual labels remain the sole announced truth.
5. Consolidate reduced-motion behavior for new components and eliminate motion
   specificity traps.

**Preserve:** theme persistence, existing surfaces, safe Markdown, control
callbacks, no new dependencies, and no runtime import from `@cairn/core` into
the renderer.

**Checks:** token completeness; explicit theme renders; measured contrast;
focus/non-text contrast; SVG accessible treatment; finite/no-infinite motion
source check; reduced-motion final-state equality; typecheck/unit/lab build.
Run from `app/`: `npm.cmd run typecheck`, `npm.cmd run test:unit`,
`npm.cmd run build:lab`, and `npm.cmd run build:vite`, plus the Slice 1 browser
board config updated to import the production primitive without making the page
reachable from production.

### Slice 4 — Chat-first workspace and visible Town/Pond retirement

**Visible finish line:** Production Workspace uses the approved slim rail,
quiet header, centered conversation paper, one small Cairn presence, and an
noninteractive written activity capsule. TownSquare, PondLine, worker characters,
threads, and tucked chat are no longer mounted or reachable in the visible app.

**Exact paths:**

- Create `app/src/renderer/components/ActivityCapsule.tsx` and
  `app/src/renderer/activity/presence.ts`.
- Create `app/tests-unit/activitycapsule.test.ts` and
  `app/tests-unit/cairnpresence.test.ts`.
- Modify `app/src/renderer/screens/Workspace.tsx`,
  `app/src/renderer/screens/Chat.tsx`,
  `app/src/renderer/components/ProjectRail.tsx`,
  `app/src/renderer/workspace.css`, `app/src/renderer/surfaces.css`,
  `app/src/renderer/app.css`, `app/src/renderer/motion.css`,
  `app/tsconfig.unit.json`, `app/tests/conductor.spec.ts`,
  `app/tests/projects.spec.ts`, and `app/tests/contrast.spec.ts`.
- Delete `app/src/renderer/components/PondLine.tsx` and
  `app/tests-unit/pondline.test.ts` after their truth/live/focus coverage moves.
  Stop mounting `TownSquare.tsx`; do not delete TownSquare or persistence yet.

**Work:**

1. Preserve Workspace's active project, polling, capture identity attributes,
   project-generation guard, view routing, and Chat focus signal.
2. Add one pure `CairnPresenceState` combiner that resolves neutral runtime truth
   plus Chat's needs-owner seam. The owner-approved state board must include its
   precedence table. Written status and expression derive from the same resolved
   value; collision and project-switch tests cover overlapping streaming,
   needs-owner, terminal, stale-project, and disconnected inputs.
3. Make Chat a main region/section rather than a permanently mounted dialog.
4. Replace the 1260 px pond-open state with deliberate chat-first responsive
   composition; do not introduce another breakpoint cliff.
5. Leave Town files and persistence code temporarily present but unused.

**Preserve:** Dashboard and TaskRun routes, project switch/reattachment, composer
focus, overlays, current-project capture bounds and identity, live status, long
copy, and the exact serial run.

**Checks:** no mounted Town/Pond/tucked DOM; written idle/ready behavior plus working,
checking, needs-owner, DONE, STOPPED, and error; project switch stale-event test;
capture-bound identity test; keyboard focus; overflow at every desktop size in
the matrix; reduced motion; targeted E2E under the mutex; contrast.

**Owner gate 2:** Present real production screenshots or the running app in
empty, responding, needs-owner, working, DONE, and STOPPED states at wide,
supported minimum 760×620, and a 540×900 test-only below-minimum containment
stress view. Confirm scale, calmness, hierarchy, and that Cairn feels present but
small. Do not proceed on assumed approval. This plan does not lower the desktop
window's 760 px minimum width.

### Slice 5 — Core conversation surface

**Visible finish line:** The transcript, Cairn prose, owner notes, streaming,
queues, errors, follow-ups, and composer use the approved paper language across
themes and sizes. Conversation remains the dominant object.

**Exact paths:** modify `app/src/renderer/screens/Chat.tsx`,
`app/src/renderer/components/Md.tsx`,
`app/src/renderer/components/BodyPill.tsx`,
`app/src/renderer/surfaces.css`, `app/src/renderer/app.css`,
`app/src/renderer/motion.css`, `app/tests-unit/conversationpaper.test.ts`,
`app/tests-unit/followuppaper.test.ts`, and the behavior-preserving conversation
scenarios in `app/tests/conductor.spec.ts`. Add no new state owner.

**Work:** change markup and classes only where needed for presentation. Preserve
Chat's connection restore, transcript merging, stream lifecycle, queued messages,
pending actions, task attachment, result recovery, retry/take-back, stop/new
conversation, and focus settlement. Keep Cairn prose mostly open on paper;
owner text uses quieter apricot notes; machine evidence stays in bounded mono
surfaces. Do not place a full Cairn face beside every historical turn.

**Checks:** characterize behavior before edits; conversation/stream/queue/error
tests; composer native semantics; long Markdown/path/code containment; keyboard
and screen-reader flow; wide/compact/minimum screenshots; both themes; no
perpetual motion; typecheck/unit/build and targeted E2E.
Run from `app/`: `npm.cmd run typecheck`, `npm.cmd run test:unit`,
`npm.cmd run build:vite`, and the mutex-protected focused Chat scenarios named
in the brief.

### Slice 6 — Questions, proposals, approvals, and operational papers

**Visible finish line:** Questions, pushback, task proposals, quality review,
dispatch disclosure, connection consent, critic/repair/harness pauses, and the
lab-only Builder proposal review form one readable decision family. The next
owner action and its consequences are visually obvious.

**Exact paths:**

- Modify `app/src/renderer/components/QuestionCard.tsx`, `TaskCard.tsx`,
  `TaskIntentList.tsx`, `TaskReview.tsx`, `DisclosureConfirm.tsx`,
  `ConnectCard.tsx`, `CriticCall.tsx`, `RepairCall.tsx`,
  `HarnessRevision.tsx`, `BuilderProposalReview.tsx`,
  `app/src/renderer/surfaces.css`, `app/src/renderer/app.css`,
  `app/lab/builderproposal.css`, and the exact behavior/CSS tests that currently
  cover these components: `questionpaper.test.ts`, `dispatchpaper.test.ts`,
  `taskreviewpaper.test.ts`, `qualitypreviewpaper.test.ts`,
  `criticcallpaper.test.ts`, `repaircallpaper.test.ts`,
  `harnessrevisionpaper.test.ts`, `builderproposalreview.test.ts`, and
  `builder-proposal-review.browser.spec.ts`.

**Work:** establish one hierarchy: decision first, effect/reason/recovery next,
complete details on demand, actions last. Keep native controls, unsent question
drafts, defer/set-aside choices, busy state, callback identity, focus movement,
and exact provider/model/project/data/cost copy. Restyle the Builder proposal
lab card without adding any action or production consumer.

**Preserve:** every approval boundary and Task 229's literal/no-callback/no-route/
no-authority contract. A prettier card must never look already approved,
executed, applied, published, verified, or terminal.

**Checks:** focused behavioral/custody tests; hostile literal-text qualification;
no action seam for Builder proposal; keyboard/focus; long disclosure containment;
contrast; all semantic states; typecheck/unit/lab/production builds; targeted E2E.
Run from `app/`: `npm.cmd run typecheck`, `npm.cmd run test:unit`,
`npm.cmd run build:lab`, `npm.cmd run build:vite`, the dedicated Builder
proposal browser qualification, and mutex-protected focused approval E2E.

### Slice 7 — Running, results, evidence, history, and publication

**Visible finish line:** Live work, terminal receipts, evidence, commentary,
follow-ups, history, manual TaskRun, and the separate push checkpoint use the new
system and make truth easier to scan than decoration.

**Exact paths:** modify result/run composition in
`app/src/renderer/screens/Chat.tsx`, `app/src/renderer/screens/TaskRun.tsx`,
`app/src/renderer/components/ActivityFeed.tsx`, `ModelRoute.tsx`,
`EvidenceAlbum.tsx`, `app/src/renderer/surfaces.css`, `app/src/renderer/app.css`,
`app/tests-unit/resultreceipt.test.ts`, `resultcard.test.ts`, `runpaper.test.ts`,
`evidencepresentation.test.ts`, `pushpaper.test.ts`, and the relevant
`app/tests/conductor.spec.ts`, `routing.spec.ts`, and `evidence.spec.ts` scenarios.

**Work:** keep the result picture/outcome first; separate checked facts from
Builder-reported claims; keep source/model identity; preserve evidence trust,
pagination, focus containment, local-image loading, folded historical receipts,
commentary, follow-ups, and exact push target/effect/recovery confirmation.

**Preserve:** the envelope authors the result; conductor commentary remains a
separate turn; push remains a separate risk approval; screenshots never rescue
failed Git verification; TaskRun and Chat agree on session truth.

**Checks:** DONE/STOPPED/ERROR non-color distinction; checked-vs-reported causal
test; evidence trust and project identity; push stale-read/approval; reattachment;
live-region same-node behavior; long data; themes/sizes/contrast; typecheck/unit/
build and targeted E2E.
Run from `app/`: `npm.cmd run typecheck`, `npm.cmd run test:unit`,
`npm.cmd run build:vite`, and the mutex-protected focused run/result/evidence/
push scenarios named by the brief.

**Owner gate 3:** In a disposable fixture project and isolated test profile, show
one complete synthetic or fake-provider request →
pushback/question → proposal → approval → working/checking → VERIFIED DONE or
STOPPED → evidence → commentary route. The owner confirms the workflow reads as
one Cairn conversation before secondary surfaces are finalized.

### Slice 8 — Welcome, projects, Dashboard, Settings, and support surfaces

**Visible finish line:** Every remaining desktop screen belongs to the same calm
desk. The old scenic Dashboard becomes a compact project summary/evidence entry;
the literal stone landscape no longer competes with Cairn or chat.

**Exact paths:** modify `app/src/renderer/screens/Welcome.tsx`, `Picker.tsx`,
`Dashboard.tsx`, `Settings.tsx`, `Chat.tsx`,
`app/src/renderer/components/ProjectSwitcher.tsx`, `Checkup.tsx`, `Convert.tsx`,
`PairPhone.tsx`, `Overlay.tsx`, `Ui.tsx`, `app/src/renderer/sound.ts`,
`app/src/renderer/surfaces.css`, `workspace.css`, `app.css`, and the relevant
unit/E2E tests. Delete `app/src/renderer/components/Scene.tsx` after moving
`STONE_MEANING` to `app/src/renderer/project-progress.ts`, changing it to plain
milestone-claim language, and migrating Dashboard, Picker, ProjectSwitcher, and
the standalone Chat branch. Delete `RunReminder.tsx` only if the fresh task
consumer scan is empty; otherwise leave it and record the consumer.

**Work:** retain project name, milestone, legacy/unfinished warnings, recent
records, project switching, new/open/forget actions, inspect-first conversion,
checkup suggestion handoff, theme/sound/update settings, external-guide behavior,
connection reachability, pairing disclosure, and overlay focus/inertness. Replace
Scene rather than merely recoloring it. Preserve the existing opt-in milestone-
success sound trigger and `cairn-sound` preference while removing the visual
stone metaphor; update its owner-facing label/comments to outcome language and
prove rerenders do not duplicate the sound. Remove unused `RunReminder` only if
a fresh consumer search proves it dead.

The existing `stones` value is milestone-moved claim history, not disposable
scenery. Keep the numeric value and its honesty caveat in plain language as
`milestone-move claims`; do not rename it `verified progress`. Preserve the
underlying `ProjectStatus.stones` data. Remove Chat's Scene-only status poll when
the standalone scene retires. Preserve the existing opt-in sound trigger and
preference, but rename owner-facing copy from stone landing to a milestone-move
claim being recorded.

**Checks:** boot/open/create/switch/checkup/convert/settings/pair flows; overlay
keyboard and focus restoration; warnings and errors; theme persistence; long
project names; compact containment; contrast; no lost action or accessible name;
typecheck/unit/build and relevant E2E.
Run from `app/`: `npm.cmd run typecheck`, `npm.cmd run test:unit`,
`npm.cmd run build:vite`, and focused Welcome/projects/checkup/convert/overlay/
settings/pairing E2E under the mutex.

### Slice 9 — Compact desktop and phone parity

**Visible finish line:** The supported 760 px-and-wider desktop experience is
intentionally chat-first without the old line-or-whole-pond mechanism; 540×900
is retained only as a below-minimum containment stress test. The self-contained
phone page shares the new visual language while retaining its current read-only
authority.

**Exact paths:** modify `app/src/renderer/workspace.css`, `surfaces.css`,
`app.css`, `motion.css`, `app/src/renderer/screens/Workspace.tsx`,
`app/src/renderer/components/PairPhone.tsx`,
`app/src/main/bridge/phonepage.ts`, `app/tests-unit/bridge.test.ts`,
`app/tests/bridge.spec.ts`, `app/tests/contrast.spec.ts`, and the compact
workspace tests introduced by Slice 4. Do not modify `app/src/main/main.ts` or
lower the supported minimum width.

**Work:** audit header condensation, rail access, composer, activity capsule,
evidence stacking, approval card containment, virtual keyboard space, safe-area
padding, zoom, long model/path/result text, and scroll ownership. Mirror semantic
tokens manually into the phone's inline CSS; it has no desktop asset pipeline.
Keep phone pairing, SSE watching, offline/unpaired recovery, literal text
insertion, and no remote assets.
The phone retains its inline rounded system-font stack; importing bundled
Quicksand would violate the one-file/no-asset-pipeline contract.

**Preserve:** the shipped phone remains LAN-only/no-cloud/no-third-party and
read-only; no sending, approvals, relay, external dependency, or widened data
scope. This plan neither implements
nor cancels the accepted future full-parity direction. Render both OS color
schemes; do not add a phone theme selector or preference synchronization.

**Checks:** desktop 760×1000, 760×720, 760×620, 540×900; phone 390×700; pairing,
streaming, live/offline, DONE, STOPPED/error; touch targets; zoom/overflow;
contrast; reduced motion; `npm.cmd run typecheck`, `npm.cmd run test:unit`,
`npm.cmd run build:vite`, and mutex-protected `bridge.spec.ts` plus the focused
compact/contrast scenarios.

### Slice 10 — Retire obsolete Town/Pond implementation safely

**Visible finish line:** No dead Town/Pond presentation code, tokens, motion,
IPC, persistence reader, or stale concept-lab route remains in the shipped code;
historical records and owner data remain untouched.

**Exact candidate paths, deleted or modified only after the fresh zero-consumer
proof described below:**

- `components/TownSquare.tsx`, `TownDetail.tsx`, `PondLine.tsx`, and replaced
  `Scene.tsx`;
- `town/faces.ts`, `town/layout.ts`, and Town-only portions of `town/model.ts`;
- only the Town-specific members and handlers inside `shared/ipc.ts`,
  `main/ipc.ts`, and `preload.ts`, plus `main/townstore.ts`; the three app-wide
  files themselves are never retirement/deletion targets;
- Town/Pond CSS, tokens, motion, stale comments, and obsolete lab pages;
- Town-specific unit/E2E assertions after replacement coverage is green.

**Work:** prove zero production/test consumer before each deletion. Remove only
visual-only persistence code; never enumerate, delete, move, or transform an
owner's `.cairn/town-square.json`. Preserve historical specs, task reports,
screenshots, and LOG rows. Rename remaining generic activity terminology and
update comments such as `App`'s old “one world / sky / town” description.

**Checks:** exact reference scans; no Town/Pond DOM or bundle markers; neutral
activity tests remain; stored fixture file stays untouched; IPC/preload surface
tests; typecheck/unit/lab/production builds; targeted E2E; exact deletion list in
the report.

**Stop if:** any candidate still carries runtime truth, current project identity,
focus/live-region behavior, or a production consumer.

### Slice 11 — Whole-app qualification and final owner verdict

**Visible finish line:** The complete app and phone are demonstrably coherent,
accessible, behaviorally intact, and faithful to the approved direction. This
slice fixes qualification defects but introduces no new art direction.

**Automated qualification:**

1. Run the full root/Core checks required by the then-current package scripts.
2. From `app/`, run typecheck, complete unit tests, production build, and lab
   build. Record exact commands and real counts.
3. Run serial Playwright under the app-token mutex with `workers: 1`. Compare
   failures by full title and fingerprint, never count alone.
4. Exercise the complete matrix in section 5, including disconnected, queued,
   stale, reattached, every approval, DONE, STOPPED, error, push, overlays,
   project switching, and phone states.
5. Measure body, large-text, focus, control, and state contrast in explicit
   Light/Dark plus System resolution.
6. Verify keyboard order, focus restoration, live-region behavior, accessible
   names, native disclosure/control semantics, 200% zoom/long-copy containment,
   and reduced-motion semantic equality.
7. Capture representative screenshots at 1320×980, 1320×820, 760×1000,
   760×720, 760×620, 540×900, and phone 390×700.
8. Inspect production bundles and the exact committed range for obsolete Town,
   Pond, worker-face, forced-night, infinite-motion, and accidental lab-only
   Builder proposal markers.

The recorded baseline commands are, from the repository root, `npm.cmd test`;
from `app/`, `npm.cmd run typecheck`, `npm.cmd run test:unit`,
`npm.cmd run build:vite`, and `npm.cmd run build:lab`; then full Playwright under
the exact mutex protocol with its configured single worker. If package scripts
have intentionally changed by this slice, the brief records and runs both the
new canonical command and the reason the baseline command changed.

**Owner gate 4:** Leave the running app or a complete owner-readable screenshot
set available. The owner judges Cairn's scale/personality, overall calmness, the
slightly darker shell, theme fidelity, full workflow clarity, compact desktop,
and phone. Human-taste DONE requires the owner's explicit confirmation.

The project milestone changes only if the owner separately says the evidence
moved it. Visual completion does not silently rewrite `CURRENT MILESTONE`.

## 8. Risk register

| Risk | Why it matters | Control |
|---|---|---|
| Big `Chat.tsx` state machine | A cosmetic rewrite can break queues, approvals, recovery, or focus | Presentation-only slices; characterize behavior first; keep callbacks/state intact |
| Timer-driven Workspace | Stale cues can lie about project/run state | Extract neutral truth first; retain monotonicity/dedupe/stale-timer tests |
| Long global CSS cascade | A palette swap can leave contradictory forced-dark islands | Semantic aliases; bounded files; migrate then delete; rendered contrast tests |
| Town is more than decoration | Hiding it can leave invisible timers, persistence, and narrow navigation | Replace activity/live/focus behavior before unmount; cleanup last |
| Exact CSS-source tests | Mechanical deletions can create false confidence or needless churn | Preserve/rewrite/replace classification with rendered causal checks |
| Theme persistence | A daylight-only pass could strand Dark/System users | Gate and test all three choices from the first board onward |
| Single-tenant E2E | Parallel tests can overwrite a real saved connection | App-token mutex and `workers: 1` remain load-bearing |
| Reference fragility | Generated-image paths are outside Git | Verify hashes and copy exact approved references in Slice 1 |
| Character overuse | Repeated faces become mascot clutter and duplicate status | One canonical active presence; art is decorative; one written truth source |
| Copyright imitation | Mood sources contain recognizable protected designs | Extract principles only; original geometry and interaction language |
| Task 229 authority boundary | Restyling could make an inert proposal look actionable | Keep lab-only/no-callback/no-control/darkness qualifications |
| Stored Town data | Cleanup could destroy owner data needlessly | Remove readers only; never delete or transform `.cairn` files |

## 9. Definition of whole-plan DONE

The overhaul is DONE only when:

- every serial slice has its own truthful DONE record and exact commit;
- all four owner gates are explicitly approved;
- the full surface/state/size/theme matrix has executable evidence;
- the milestone journey still works with the same authorization and result truth;
- no visible Town/Pond/worker-cast/stone-scene metaphor remains;
- Cairn's approved D resident-program form is small, original, and state-aware;
- old visual tests have documented dispositions and replacement proof;
- obsolete code is removed without touching owner data or historical evidence;
- final Git status is clean and the owner receives exact safe trial steps.

STOP rather than dilute the plan if an implementation slice requires a new owner
art decision, changes workflow authority, widens data/provider scope, needs an
unapproved dependency or external call, cannot protect concurrent work, or
cannot prove recovery.

## 10. Deliberate exclusions

This plan does not:

- add multi-agent visualization, task maps, XP, achievements, or gamification;
- change Cairn's conductor prompt or invent catchphrases/personality copy;
- activate Builder proposals or any dormant capability;
- add phone sending or approval parity;
- change accounts, analytics, cloud, LAN scope, credentials, providers, cost, or
  deployment;
- delete stored `.cairn` data or rewrite earlier owner decisions and reports;
- require a new package, font, image service, or visual-regression dependency;
- authorize a real provider/model call, push, publication, or paid evaluation;
- claim that screenshots prove workflow correctness; or
- pre-approve expression variants the owner has not yet seen.
