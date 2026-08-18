# Handoff — Slice 8: Welcome, projects, Dashboard, Settings, and support surfaces

**This is a SLICE handoff, not a mid-task one.** Slice 7 is complete, committed
and gated: Task 267 (`a7a9b83`), the owner's verdict recorded in Task 270
(`41a2c2e`). Nothing is in flight, no number is claimed for Slice 8, and the
working tree is clean.

**Every measurement below was taken in this session against `41a2c2e`.** Where a
claim is inherited rather than measured, it says so — and there are fewer
inherited claims here than usual, on purpose. The handoff Slice 7 received
carried one flatly false claim and four significant omissions, and the omissions
cost more than the false claim did. Both are itemised under "What the last
handoff got wrong", because the pattern is more useful than the specifics.

**Authority order:** `AGENTS.md`, then
`docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`
(Slice 8, plus sections 2, 3, 4 and 6), then
`docs/superpowers/specs/2026-08-13-cairn-resident-program-visual-design.md`.
Read `docs/ai-work/tasks/267-report.md` for the recipe Slices 5–7 used — **and
then read the next section, because Slice 8 cannot use it.**

---

## The single most important thing: Slice 8 is not shaped like Slices 5–7

Slices 5, 6 and 7 each migrated a **named component family**. `.task-card-*`,
`.result-card-*`, `.run-strip-*`, `.push-*` — every rule could be found by its
prefix, moved wholesale into `surfaces.css` under `.rp-conversation`, and
deleted from `app.css`. The families had one consumer each and clean edges.

**Slice 8's screens have no families.** Measured — every `className` those four
screens render:

| Screen | Classes it renders |
|---|---|
| `Welcome.tsx` | `eyebrow`, `muted`, `row`, `welcome-steps` |
| `Picker.tsx` | `card`, `card-title`, `row`, `row spread`, `muted`, `small`, `mono`, `pill pill-quiet`, `badge badge-done`, `note-banner` |
| `Dashboard.tsx` | `row`, `row spread`, `muted`, `small`, `mono`, `log-row`, `serial-map`, `status-pill`, `warning-banner`, `scene-head`, `scene-wrap` |
| `Settings.tsx` | `row`, `row spread`, `small`, `muted`, `pill pill-quiet` |

These are the app's **generic primitives**. `.card`, `.row`, `.pill`, `.muted`,
`.small`, `.mono` are shared with the already-migrated conversation, with
TaskRun, with the Town/Pond surfaces Slice 10 deletes, and with the lab pages.
There is no prefix to grep and nothing that can be moved wholesale: deleting
`.card` from `app.css` would strip half the product.

**So the work is the opposite shape.** Slices 5–7 moved rules to a scope that
already existed on the element. Slice 8 has to **put a scope on the elements
first**, then write the primitives' treatment under it — the same move Slice 4
made when it added `rp-conversation` to the chat column, and the reason that
class had to exist at all.

Plan for that from the start. A migration that begins by grepping for a family
will find nothing and conclude the screens are already done.

---

## Where the scope goes, measured

`Workspace.tsx:369` is the desk's view container, and it holds **three
siblings**:

```tsx
<main className="rp-desk-view">
  {centerView === "chat"      ? <Chat … embedded />                          // migrated
   : centerView === "dashboard" ? <div className="workspace-scroll"><Dashboard … /></div>
   :                              <div className="workspace-scroll"><TaskRun … /></div>}
</main>
```

Chat carries `rp-conversation` and is done. **Dashboard and TaskRun are the two
un-migrated desk views, in the same wrapper, needing the same treatment.**

Outside the desk, `App.tsx:117` renders `<main className="shell">`, and Welcome
and Picker are views inside it (`App.tsx:96`, `:100`). Settings and Picker
*also* render inside `<Overlay>` (`App.tsx:127`–`138`) — so **Picker has two
mount contexts** and any scope must reach both.

### TaskRun is Slice 8's, and that resolves the debt Slice 7 left

Slice 7 deliberately did not migrate TaskRun and said so in its report. The
reason was real: Slice 6's rules are anchored on `.rp-conversation`, and making
them reach a second screen needs either a second anchor across ~150 selector
entries or an `:is()` prelude that `visualtokens.test.ts` rejects, because that
guard requires every selector to **begin** with `.rp-`.

That framing treated TaskRun as an orphan. It is not: **Dashboard and TaskRun
are siblings in the same container, built from the same primitives, needing the
same scope.** Whatever scope Slice 8 gives Dashboard is the scope TaskRun
should get, and the six components TaskRun mounts (`TaskReviewView`,
`TaskSpecProposalPreviewView`, `CriticCallCard`, `RepairCallCard`,
`HarnessRevisionCard`, `DisclosureConfirm`) stop needing their duplicated
unscoped halves at that point.

**Do not take the anchor-guard question lightly.** It is a real boundary. If
Slice 8 concludes the guard should accept `:is(.rp-a, .rp-b) …`, that is a
deliberate change to a test that has caught real regressions, and it needs its
own reasoning and its own record — not a quiet edit to make a migration
compile.

---

## What is provably dead, measured this session

**`RunReminder.tsx` — DELETE IT.** The plan says remove it only if a fresh
consumer scan is empty. It is:

```bash
grep -rn "RunReminder" src lab tests tests-unit --include=*.tsx --include=*.ts \
  | grep -v "components/RunReminder.tsx:"     # no output
```

**Chat's un-embedded branch is dead, and it is where `<Scene>` lives.**
`Chat.tsx:2497`'s `if (!embedded)` renders `<div className="chat-screen">` with
`<Scene fill …>`. The only production consumer of `<Chat>` is
`Workspace.tsx:371`, which passes `embedded`. No test references `chat-screen`
or `chat-scene`. Measured in Task 267 and re-measured here. So deleting Scene
from Chat means deleting that whole branch, and the plan's "migrating … the
standalone Chat branch" is really "delete it".

**`Scene.tsx` has exactly three real consumers**, all of which the plan already
names: `Chat.tsx:16/2500`, `Dashboard.tsx:4/22`, and `STONE_MEANING` at
`Dashboard.tsx:35` and `Picker.tsx:141`. The `Scene` functions in
`lab/lookboard.tsx:144` and `lab/worldboard.tsx:140` are **unrelated local
functions that share the name** — do not count them, and do not touch them.

**`project-progress.ts` does not exist.** The plan says move `STONE_MEANING`
there; it is a file to create, not to edit.

---

## A defect the plan is pointing at without naming, measured

The plan asks Slice 8 to "prove rerenders do not duplicate the sound". Here is
what the trigger actually does today, at `Dashboard.tsx:13`:

```tsx
useEffect(() => { /* Stones land only for DONE + milestone YES records. */
  if (status.stones > 0) pluck(); }, [status.stones]);
```

`pluck()` is gated on `localStorage["cairn-sound"] === "1"`, so it is off unless
the owner turned it on. But the effect fires **on mount whenever `stones > 0`**,
not only when a new claim lands. Opening the Dashboard on a project that already
has claims plays the sound; navigating to the run screen and back plays it
again. That is "this project has claims", not "a claim was just recorded".

The plan says to *preserve* the existing trigger and its preference. It also
says to prove rerenders do not duplicate it. **Those two instructions are in
tension with what the code does**, and the slice has to decide which it is
honouring and record the choice. Do not discover this at the end.

---

## The test map, measured — and the real risk

**These screens have almost no unit guard.** Files naming each surface:

| Surface | Unit tests that name it |
|---|---|
| `Welcome` | **none** |
| `Picker` | **none** |
| `Dashboard` | **none** |
| `ProjectSwitcher` | **none** |
| `Convert` | **none** |
| `PairPhone` | **none** |
| `Scene` | **none** |
| `sound` | **none** |
| `Settings` | `papersignal.test.ts` |
| `Checkup` | `checkup.test.ts` |
| `Overlay` | `applicationmenu.test.ts`, `deskcomposition.test.ts`, `evidencepresentation.test.ts` |

**This is the inverse of Slice 7's situation and it is the slice's main danger.**
Slice 7 had ten test files pointing at the surfaces it moved; every one that
went red pointed at something real, and two genuine defects were caught that way.
Slice 8 can restyle Welcome, Picker, Dashboard, ProjectSwitcher, Convert and
PairPhone into rubble and the unit suite will stay green.

Two consequences. Capture a **rendered** baseline before the first edit, not a
stylesheet one. And expect to *write* guards rather than re-point them — the
"Rewritten / Preserved / Replaced" disposition vocabulary still applies, but
most of this slice's tests will be new.

### E2E, which is where the real coverage lives

| Spec | Tests | Covers |
|---|---|---|
| `projects.spec.ts` | **7** | remembered list, switcher, **"the desk's chrome contains itself at wide and compact sizes"**, broken entry, removal, bounded list, failed open |
| `checkup.spec.ts` | 1 | the checkup suggestion handoff |
| `convert.spec.ts` | 1 | inspect-first conversion |
| `away.spec.ts` | 1 | |
| `smoke.spec.ts` | 2 | |
| `bridge.spec.ts` | 1 | |
| `connect-kimi.spec.ts` | 1 | |

`projects.spec.ts:202` is the one to read first — it is an appearance and
containment test over the desk's chrome, and it is the closest thing Slice 8 has
to `conductor.spec.ts`'s pins.

**Note: `grep -c '^test('` reports 0 for `projects.spec.ts`.** Its tests are
indented inside a `describe`, so they need `grep -cE '^\s*test\('`. A count of
zero there is a grep artifact, not an empty file.

---

## The stylesheet, measured

`app.css` is **1777 lines** after Slice 7 (from 2393). What remains, by leading
selector family:

```
 106 town-*      60 candidate-*   55 task-*    53 rail-*    50 unsealed-*
  29 builder-*   25 chat-*        22 evidence-* 20 checkup-* 16 pond-*
  16 critic-*    11 pill*         11 md-*       8 project-*  8 brain-*
   7 workspace-* 7 question-*      7 bubble-*   6 overlay-*  6 followup-*
```

**The largest remaining block is Town/Pond (106 + 16 = 122 entries), and it is
Slice 10's, not Slice 8's.** Do not be drawn into it. The `candidate-*`,
`unsealed-*`, `critic-*`, `task-*` and `builder-*` blocks are the unscoped
halves serving TaskRun — they become deletable exactly when TaskRun migrates.

### One block with genuinely mixed ownership

`app.css:1183`, `@media (max-width: 620px)`:

```css
.shell            /* Slice 8 */
.serial-map       /* Slice 8 — Dashboard */
.route-facts      /* TaskRun's ModelRoute */
.log-row          /* Slice 8 — Dashboard */
.chat-column      /* already migrated; workspace.css outranks it */
.bubble           /* already migrated */
.chat-villager-chip  /* Slice 10 */
.town-detail      /* Slice 10 */
```

620 px is below the supported 760 px minimum, and the breakpoint census in
`visualtokens.test.ts` allows only `{820, 1260}` in the migrated sheets. **Read
Task 267's report before porting any of these.** Moving the run strip's rules
from 620 px to 820 px looked mechanical, fired a reflow at the supported
minimum, and broke a contract `conductor.spec.ts` measures at exactly
760 × 620 — while every unit test stayed green.

---

## Baselines, measured at `41a2c2e`

**Re-derive these in your own lane before the first edit.** They are given so a
discrepancy is visible, not so they can be trusted.

```powershell
npm.cmd run test:unit    # 1034 tests, 1023 pass, 9 fail, 2 skipped  (423s)
```

The nine failures are the documented pre-existing set — 4 in
`builderlivetransport.test.js`, 5 in `buildertrackedtext.test.js` — and the set
was byte-identical to Task 267's own pre-edit baseline when compared by full
test title. **Diff the failure SET, never the count.**

**Two pre-existing E2E reds, both baselined before Slice 7 began:**

1. `builder-proposal-conversation.spec.ts` — `TASK232_SELECTION_REFUSED` from
   `src/main/builderreviewroutefixture.ts:22`, the same module carrying five of
   the nine unit failures.
2. `conductor.spec.ts` — *a reload mid-run reattaches the conversation's strip
   and shows the finished state there*. Fails at `toContainText("DONE —")`; the
   strip stays at the `Check` stage. **Slice 7's handoff did not name this one**,
   and without a pre-edit baseline it looks exactly like migration damage.

---

## Hazards — all carried forward, all still true

1. **`app.css` may not name an `.rp-` class in a RULE or a COMMENT.**
   `visualtokens.test.ts` regexes the whole file, comments included. Every slice
   since 5 has nearly tripped on prose alone.
2. **Removing a class from markup is not a local change.** Grep **every**
   stylesheet first. `workspace.css` keyed three selectors on the class Slice 7
   deleted — one of them carrying the paired-token block that re-tones every
   unmigrated surface — and the damage would have read as a hundred unrelated
   colour regressions.
3. **A second `@media (prefers-reduced-motion: reduce)` block breaks the
   suite silently.** Four tests in three files pin their contract with
   `lastIndexOf` on that string. There is exactly one final block in
   `motion.css`; add to it, never after it.
4. **Portals escape every scope.** `EvidenceAlbum.tsx:247` is
   `createPortal(…, document.body)`. `Overlay.tsx` is Slice 8's own portal-like
   surface — check where it actually mounts before anchoring rules on it.
5. **A first Playwright batch will lie.** The Windows worker-teardown `EPERM` at
   `tests/fixtures/isolated-profile.ts:46` reports failures with no assertion
   error. Rerun every failure **alone** with `--reporter=list` before believing
   it — that is how Slice 7 separated four real failures from teardown noise.
6. **A capture spec MUST import `test` from `./fixtures/isolated-profile`.**
   The bare `@playwright/test` import launches Electron against the owner's real
   profile.
7. **Scaffold test projects with core's `initProject`**, never by hand.
8. **App-token mutex:** `%TEMP%\cairn-app-token` and `app/.app-token`, both with
   `mkdir`, ownership tracked per location, released in a `trap` that also
   covers the launch.
9. **`playwright.cmd` fails from Git Bash** (space in the path). Use
   `node ./node_modules/@playwright/test/cli.js test …`.
10. **Do not edit under `app/src/` while a Playwright sweep runs**, and do not
    edit stylesheets while `test:unit` runs — its CSS tests read `src/` at
    runtime, not from `dist-unit`.
11. **Never round-trip a source file through PowerShell's `Get-Content -Raw` /
    `Set-Content`** — that produced the CP1252 double-encodings Task 264
    repaired. Bash heredocs of the form `cmd <<'EOF'` are also unreliable in
    this shell when the body contains apostrophes; `cat >> file <<'EOF'` works.
12. **Deleting a `tests-unit/*.ts` file leaves its compiled artifact behind.**
    `tsc` does not remove it, and `node --test dist-unit/tests-unit/*.test.js`
    keeps running the stale copy. Delete both.
13. **`app/shots/` is gitignored.** Captures are local evidence and are never in
    a commit. Say so in the report rather than implying they are recoverable.
14. **Playwright clears `test-results/` wholesale**, `--output=` regardless.
    Anything that must survive goes in `app/shots/`.

---

## What the last handoff got wrong, and why it is worth knowing

Not to criticise it — it was careful, and most of it held. The pattern is what
matters:

- **One flatly false claim.** It said `lantern.test.ts`'s helper had "no `-1`
  assertion". Line 11 asserted it. Cost: minutes.
- **Four omissions.** The `workspace.css` landmine, the evidence portal, the
  follow-ups already being migrated by Slice 5, and the second pre-existing red.
  Cost: hours, and one of them would have shipped a broken screen.

**Omissions cost far more than errors**, because an error announces itself the
moment you check it and an omission never does. A handoff's job is less "here is
what I know" than "here is what I checked, and here is what I did not". This
document's last section is that list.

---

## What to do, in order

1. **Claim the number.** Highest anywhere is **270**; `271` is free as of
   `41a2c2e`. Re-read the listing across every branch immediately before writing
   the brief, and never overwrite a task path:
   ```bash
   git log --all --diff-filter=A --name-only --format="" -- "docs/ai-work/tasks/27*" | sort -u
   ```
2. **Re-derive the unit baseline and capture a RENDERED baseline** of Welcome,
   Picker, Dashboard, Settings, the overlay and TaskRun, before the first edit.
   The stylesheet baseline that served Slice 7 will not protect these screens.
3. **Run `projects.spec.ts`, `checkup.spec.ts` and `convert.spec.ts` first**, so
   you know which reds are yours later.
4. **Decide the scope, and write that decision down before writing CSS.** Where
   does the `rp-` class go — `.shell`, `.workspace-scroll`, each screen's root?
   Does the anchor guard need to change, and if so is that its own task? This is
   the decision the whole slice hangs on.
5. Migrate the desk views (Dashboard, then TaskRun) before the outer shell:
   they sit beside an already-migrated sibling, so they are the ones where
   "belongs to the same desk" is checkable.
6. Then Welcome, Picker, Settings, and the overlay surfaces.
7. Replace Scene rather than recolouring it; move `STONE_MEANING` into a new
   `project-progress.ts` in plain milestone-claim language; keep
   `ProjectStatus.stones` and its honesty caveat; delete `RunReminder.tsx`.
8. Resolve the sound question deliberately and record which way you went.
9. Every check in the brief, then the report, one LOG row, one exact-path
   commit — and there is **no owner gate at the end of Slice 8**. The next
   owner judgment is Slice 11's final verdict. Do not invent one; do put the
   captures somewhere the owner can find them.

---

## What I did NOT check, and you should not assume

- **The phone page.** `cairn.html` is a tracked contract mirror and a shipped
  companion. I did not look at whether Slice 8's changes reach it; Slice 9 owns
  phone parity, but the boundary is not measured here.
- **`Overlay.tsx`'s mount context.** I confirmed it exists and that three test
  files reference it, but I did not trace whether it portals or renders inline.
  That determines whether a scope on `.shell` reaches Settings.
- **Whether `projects.spec.ts:202` has computed-style pins.** I read its title,
  not its body. Slice 7's experience says appearance pins hide in E2E where no
  selector grep finds them — assume they exist until you have read it.
- **The Convert and PairPhone flows in the running app.** I read their file
  sizes and their consumers, nothing more.
- **`Checkup.tsx`'s and `Ui.tsx`'s internals.** Named by the plan, not opened.
- **Anything about Slices 9–11.** Their boundaries with 8 are the plan's, not
  something I verified.

`main` was clean at `41a2c2e` when this was written. **Re-read `git log`
immediately before every write to a shared path** — another session committed
Task 268 into this repository between two of Slice 7's own commits.

---

## A live demonstration of hazard 2, which happened while this was being written

`main` was at `41a2c2e` when the measurements above were taken. Before this file
was committed, another session committed `8816b77` — **"Claim Task 262: design
Cairn's solution-frame gate"** — into this same checkout, on top of Slice 7's
work. Nothing was lost: every commit from `a7a9b83` through `41a2c2e` is intact
and reachable, and the measurements above still hold.

**But `262` is a reused number, and the number space is now contested.**
Measured:

```bash
git log --all --diff-filter=A --format="%h %s" --name-only -- "docs/ai-work/tasks/262*"
#   8816b77  Claim Task 262: design Cairn's solution-frame gate        (new, on main)
#   6b6295a  Renumber the decision-family claim to 262 …               (in main's own history)
#   ae29482  Claim Task 262 for the owner-verdict document repairs …   (lane/i)
```

No branch's working tree currently holds a `262-*` file except `main`, which is
exactly why this happened: **262 was claimed, renumbered away, and left no file
behind, so a scanner that lists `docs/ai-work/tasks/` offers it as free.** The
contract's rule is history-based rather than tree-based for precisely this
reason, and its check is the all-branches one above — not `ls`.

Three different tasks now answer to "262" in the record. Resolving it is that
session's call, not this one's: the contract says the later claimant renumbers.
**Do not silently renumber another lane's in-flight work**, and do not assume
the number space is quiet just because your own scan came back clean.

For Slice 8: `271` was free at `8816b77`, verified across every branch. Run the
check again yourself immediately before you write.
