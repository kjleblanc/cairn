# Handoff — Task 263, Slice 6: the decision family

**This is a MID-TASK handoff, not a slice handoff.** Task 263 is claimed, its
brief is committed, its baseline is captured and one pre-existing defect is
already repaired. The CSS itself has not been started. Nothing is uncommitted.

**Do not re-claim a number.** Task 263 is yours.
**Authority:** `docs/ai-work/tasks/263-brief.md` first, then
`docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`
(Slice 6 section, plus sections 2, 3, 4 and 6), then
`docs/superpowers/specs/2026-08-13-cairn-resident-program-visual-design.md`
sections 6 and 7. Read `docs/ai-work/tasks/260-report.md` for how Slice 5 did
the same job on the conversation — this slice is that recipe applied to the
decision surfaces.

## Where it stands

| | |
|---|---|
| Task number | **263**, claimed. Brief at `docs/ai-work/tasks/263-brief.md` |
| Base commit | `6b6295a` |
| HEAD when written | `7f093f8` |
| Working tree | **clean** |
| Unit baseline, re-derived in-lane | **1036 / 1025 / 9 / 2**, failure set identical to the nine documented pre-existing failures in `builderlivetransport.test.js` (4) and `buildertrackedtext.test.js` (5) |
| App-token | both locations free |
| Owner gate | none at the end of this slice; the next is gate 3 at the end of Slice 7 |

Commits so far on this task: `e0b4272` (an erroneous 261 claim, kept in the log
on purpose), `6b6295a` (renumber + restore of another session's brief),
`5f98b0a` + `31df581` (renumber to 263), `7f093f8` (the encoding repair below).

### Already done, do not redo

1. **Both read-only audits.** Their findings are reproduced in full below and in
   the brief. You do not need to re-run them.
2. **The `c2` characterization baseline** is captured, and the harness is
   reproduced verbatim at the end of this file because it lived in a
   session-scoped scratchpad that is now gone. **Re-create the three scripts and
   re-run `pre` before your first edit**, then check the thirteen digests
   against the table below — if they match, you are starting from the same tree
   I did.
3. **One pre-existing defect repaired** (`7f093f8`): `HarnessRevision.tsx:41`
   held `c3 a2 e2 80 a0 e2 80 99`, which is `→` double-encoded through CP1252,
   so the card rendered `30s â†’ 60s`. Fixed at the byte level. **Seven more of
   these exist under `core/src`, from the same commit `35e5607`** — including
   `serial.ts:4700` and `:4715`, the pre-seal candidate's STOPPED and DONE
   result lines, which the app reads straight onto the run strip. `core/**` is
   outside this slice's boundary; a separate session is on them. Do not touch
   `core/`.

## The shape of the work — this slice is TWO problems

**Problem one: three surfaces are inside the `chat-column-villager` hook.** The
question card, the task card with its intent rows, and the dispatch panel.
Slice 5's recipe applies directly — write `.rp-conversation`-anchored rules in
`surfaces.css`, delete the originals from `app.css`, re-point the guarding test
with a recorded disposition.

That is **88 rules, 95 selector-list entries**, measured:

| Family | `app.css` lines | Rules |
|---|---|---|
| Task card + its intent rows | 972–1042 | 19 |
| Dispatch panel | 1872–2027 | 44 |
| Question card | 2033–2119 | 23 |
| `.bubble-active-question-only` | 2033 | 1 |
| Last reduced-motion block | 2313–2314 | 2 |

**Problem two: six surfaces also render on TaskRun, which is Slice 7's screen.**
`TaskReviewView`, `TaskSpecProposalPreviewView`, `CriticCallCard`,
`RepairCallCard`, `HarnessRevisionCard` and `DisclosureConfirm` are mounted by
both `Chat.tsx` and `TaskRun.tsx`, and their rules in `app.css` are **unscoped**
— they only re-tone inside the conversation because the column re-points
`--card`, `--line`, `--muted` and `--stop`.

`visualtokens.test.ts` requires every selector in `surfaces.css` to be anchored
on an `.rp-` class, so **they cannot be moved there unscoped**. Give them
`.rp-conversation`-anchored rules and leave the unscoped originals in place for
TaskRun until Slice 7 migrates it. That duplication is forced by the guard, not
chosen. Say so in the report.

**Three decision pauses post-date the plan's path list and are in scope:**
`TaskPromiseCard`, `UnsealedCandidateCard`, `CandidateCritiqueCard` (Tasks
238–245). They render only inside the conversation. Leaving them in the retired
language beside restyled siblings would read as broken.

**The intent row exists three times and you own two of them.** Inside
`.task-card` (with fills), inside `.dispatch-panel` (flat), and inside
`.result-card-request-body` (flat, near-identical to the dispatch copy) — which
is Slice 7's receipt. Write ONE shared rule set with the task-card variation as
an override, leave the receipt's copy alone, and tell Slice 7 in the handoff to
delete its copy in favour of the shared one rather than porting it.

**`.card` is rendered by sixteen files**, every screen included, and
`conductor.spec.ts` finds the connect card with `locator(".card", …)`. No global
`.card` restyle. **Keep every existing class name and add `rp-` ones beside
them**, exactly as Slice 5 did — the Playwright specs are live-DOM locators and
survive a move only if the class names survive.

## Facts about the 88 rules you will move

- **No hex literals anywhere.** Every hard-coded colour is `rgb(… / N%)`, and
  they reduce to three inks: cream `rgb(246 236 225 / N%)` at eleven alphas,
  amber `rgb(242 185 92 / 11%)` and `/ 3%`, and mint `rgb(163 221 208 / 28%)`.
- Legacy tokens read: `--garden-cyan`, `--garden-amber`, `--lantern-ink`,
  `--lantern-soft`, `--line`, `--pond-stop`, `--inner-card-fill`,
  `--inner-card-tint`, `--paper-grain`, `--mono`.
- **Eight rules sit behind `max-width: 620px`**, in two blocks at `app.css` 2022
  and 2112. 620 px is below the supported 760 px minimum, so they only ever
  reach the containment stress view. **Move them to 820 px** — the breakpoint
  set across the three new sheets is asserted to be exactly `{820, 1260}`.
- **Two disabled-opacity defects are already in this family**, the same class
  Slice 5 found on the composer and fixed:
  `.task-card-actions .pill-primary:disabled` → `opacity: .68`, and
  `.question-card-controls input:disabled` → `opacity: .5`. The question card's
  actions also *transition* `opacity`. Two sibling rules already use the safe
  pattern — fading only the underline, at `app.css` 2008 and 2109.
- **The reduced-motion kills work by source order, not specificity.** Lines 2313
  and 2314 are effective only because they sit after the generic
  `.chat-column-villager .pill { transition: none; }` at 2312, in the file's last
  block. Anything you move out must keep that property, which for the new system
  means the end of `motion.css` — imported last. Slice 5 did exactly this.
- **One `:has()` rule:** `.task-card:has(.task-risk)::before` turns the card's
  left rule amber when it carries a concern. That is a real non-colour signal.
  It must survive.
- `motion.css`'s `chat-arrive` still slides **and scales** `.task-card`, which
  holds interactive controls — forbidden by the constitution, and it blurs the
  card's own text mid-flight. Slice 5 removed it from `.bubble` only.

## The test map

**Seven of the eleven guarding files read no CSS at all** and survive a restyle
untouched: `taskreviewpaper`, `qualitypreviewpaper`, `repaircallpaper`,
`harnessrevisionpaper`, `unsealedcandidatepaper`, `taskblock`, `setaside`.

**Two carry the CSS-text weight:** `questionpaper` (six of eight tests, thirteen
sliced selectors) and `dispatchpaper` (four of seven, thirteen sliced
selectors). `criticcallpaper` has three unscoped CSS assertions inside one
otherwise-behavioural test. `builderproposalreview` has exactly three CSS lines,
all positive `assert.match`, so they fail RED rather than silently — and one
already asserts an `@media (max-width: 820px)` block.

**Three files outside the plan's list break on the same move:**

- `conversationpaper.test.ts` — thirteen task-card selectors. Slice 5
  deliberately left its proposal half pointing at `app.css`; you collect it.
- `resultreceipt.test.ts:149` — one `.result-card-request-body .task-intent-row`.
- **`evidencepresentation.test.ts` — eight assertions on the identical class
  families, UNSCOPED**, so a scoped grep misses it entirely. Slice 5's lesson
  repeating: the plan's path list is not the blast radius.

### Three guards that go quiet rather than red

Repair each with a positive `assert.notEqual(marker, -1)` while the file is open.

1. **`questionpaper.test.ts:112` is ALREADY DEAD on `main`.** Its marker
   `".chat-column-villager .question-card,"` — with a trailing comma — has
   **zero** occurrences in `app.css`; `lastIndexOf` returns `-1` and the
   ordering assertion has been vacuously true. Verified independently by grep.
2. **`dispatchpaper.test.ts:116`** pins the whole one-line declaration
   `.chat-column-villager .route-facts { grid-template-columns: repeat(3, 1fr); }`
   as an ordering marker. Live today; vacuous the moment it is reformatted or
   moved.
3. **`repaircallpaper.test.ts:32`** slices between two `export type` markers and
   asserts only `doesNotMatch` — a missing marker yields an empty string that
   satisfies everything.

### One number to raise deliberately

`questionpaper.test.ts:93-97` pins `.question-card-actions .pill` at
**`min-height: 40px`**, below the 44 × 44 floor `surfaces.css` declares and that
Slice 5 measured from real bounding boxes. Raising it is a Rewritten
disposition with a stated reason, not a quiet edit.

## Task 229's contract — the hardest constraint

`tests-qualification/builder-proposal-review.browser.spec.ts` pins:

- `getComputedStyle(.builder-proposal-review).borderLeftWidth` **exactly `"5px"`**
- **zero** elements inside the card matching `a, button, input, textarea,
  select, option, form, label, details, summary, iframe, object, embed, audio,
  video, canvas, img, svg, style, script, [href], [src], [for], [role],
  [tabindex], [contenteditable=true]`
- nothing inside the card may hold focus
- interacting causes no navigation, no new page, no network request
- no horizontal overflow at 1280 or 600; single column at 600

**So: no `role=`, no SVG mark, no `<details>` fold may be added to that card**,
and a changed border is a Rewritten disposition with a stated reason. The
component takes no callback at all, so its authority contract is structural —
keep it that way.

## Hazards

1. **`app.css` may not name an `.rp-` class in a RULE or in a COMMENT.**
   `visualtokens.test.ts` regexes the whole file, comments included. Slice 5's
   first draft explained two deletions by naming where they went and would have
   gone red on prose alone.
2. **Do not edit anything under `app/src/` while a Playwright sweep is running.**
   `playwright.global-setup.ts` compares `.vite`'s mtime against `app/src`; one
   CSS edit mid-sweep cost Slice 5 twelve of fourteen scenarios to a stale
   timestamp that looks like twelve failures. Editing under `app/tests/` is safe.
3. **App-token mutex:** create `%TEMP%\cairn-app-token` and `app/.app-token` with
   `mkdir`, record which you created, release only those — in a `finally` that
   **also covers the launch itself**. Slice 5 put the launch outside the guard,
   threw before it, and left both held.
4. **Windows worker-teardown `EPERM`** aborts batched Playwright runs. One
   invocation per scenario. A 60 s timeout inside a batch is not evidence of a
   regression until it has been rerun alone.
5. **Back up `app/test-results/` before any Playwright run** and verify hashes
   after. `--output=…` is not enough; Playwright has cleared the whole directory
   anyway. Write anything that must survive into `app/shots/`.
6. **`playwright.cmd` fails from Git Bash** (space in the path). Use
   `node ./node_modules/@playwright/test/cli.js test …`.
7. **Never round-trip a source file through PowerShell's `Get-Content -Raw` /
   `Set-Content`.** That is what produced the eight double-encoded characters.
   Use the editor tools, or byte-level Node for surgical fixes.
8. **A disabled control is skipped by the tab order**, so a keyboard walk cannot
   reach it — type a draft first. And **an exact-attribute marker in a
   source-text test goes QUIET when a class is appended**: match on a prefix and
   assert the marker was found.
9. **Delete `app/dist-unit/` after removing a test file** — `tsc` leaves stale
   compiled tests behind and they report phantom failures.

## Other sessions are live in this repository

- **`lane/i`** — the owner-verdict document repairs, Task 262, in its own
  worktree. Docs only.
  **Merge hazard:** `lane/i` branched from `e0b4272`, which carried an overwrite
  of their Task 261 brief, so on that branch `docs/ai-work/tasks/261-brief.md`
  holds *this task's* Slice 6 text while `main` holds *their* restored text.
  **When `lane/i` lands, take `main`'s side on that path.**
- **A session repairing the seven `core/src` double-encodings.** Stay out of
  `core/`.

Two sessions racing for a task number in one checkout cost this task two
renumbers in ten minutes. **Re-read `git log` immediately before every write to
a shared path, not only before a commit, and never use a whole-file write on a
task path.**

## What to do next, in order

1. Re-create the three harness scripts below in your scratchpad; run
   `characterize.sh pre`; check the digests against the table.
2. Re-derive the unit baseline in your own lane before the first edit.
3. Move problem one — the three hooked surfaces — first, since the recipe is
   known. Write `.rp-conversation`-anchored rules in `surfaces.css`, delete the
   originals from `app.css`, move the 620 px rules to 820 px, move the
   reduced-motion kills to the end of `motion.css`.
4. Then problem two — the six shared surfaces — leaving the unscoped originals.
5. Then the three post-plan pauses.
6. Fix the two disabled-opacity defects and the `transition: opacity`.
7. Remove `chat-arrive` from `.task-card` inside the conversation.
8. Re-point every test with a recorded disposition; repair the three quiet
   guards; raise the 40 px floor.
9. Widen `contrast.spec.ts`'s **connected** scenario to reach a proposal — the
   fixture machinery is already in that file, and the message
   `"Please change the page title for me."` produces a task card. Task 259 and
   260 both recorded that the proposal's primary control looks low-contrast and
   is unmeasured; this is where that gets a number.
10. Run every check in the brief's `c1`–`c14`, then report, LOG row, and one
    exact-path completion commit.

## The characterization harness

It lived in a session-scoped scratchpad and is gone. Re-create these three files
anywhere outside the repository, then run `characterize.sh pre`.

**Why two tripwires.** The digest proves "only presentation moved" for markup.
It is not enough here, because these components hold strings that look like
class names and are not: `"stop-task"`, `"continue-without-critic"`,
`"approve-revision"` are action ids the main process matches on;
`"owner-stated"`, `"owner-unsure"`, `"cairn-chosen"` are intent-source data;
`"not-met"`, `"cant-tell"`, `"waiting-owner"`, `"settled-by-cairn"` are status
values; `"replacement-proposal"` and `"capability-request"` are discriminants.
A restyle that fat-fingers one changes what the product does. **558 literals**
are under watch across the thirteen components.

### `behaviour-digest.mjs`

```js
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { argv } from "node:process";

/** Remove the VALUE of every className attribute, leaving the attribute so the
 *  element structure itself is still part of the digest. */
function stripClassNames(source) {
  let out = "";
  let index = 0;
  while (index < source.length) {
    const at = source.indexOf("className=", index);
    if (at === -1) { out += source.slice(index); break; }
    out += source.slice(index, at) + "className= ";
    let cursor = at + "className=".length;
    const opener = source[cursor];
    if (opener === '"') {
      cursor = source.indexOf('"', cursor + 1) + 1;
    } else if (opener === "{") {
      let depth = 0;
      do {
        if (source[cursor] === "{") depth += 1;
        else if (source[cursor] === "}") depth -= 1;
        cursor += 1;
      } while (depth > 0 && cursor < source.length);
    }
    index = cursor;
  }
  return out;
}

const file = argv[2];
const label = argv[3] ?? file;
const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const stripped = stripClassNames(source);
const digest = createHash("sha256").update(stripped).digest("hex");
if (argv[4]) writeFileSync(argv[4], stripped, "utf8");
console.log(`${digest}  ${label}`);
```

### `literal-inventory.mjs`

```js
import { readFileSync, writeFileSync } from "node:fs";
import { argv } from "node:process";

/** Every double-quoted, single-quoted and static template chunk, sorted. */
function literals(source) {
  const found = new Set();
  for (const match of source.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'/gu)) {
    found.add(match[1] ?? match[2]);
  }
  for (const match of source.matchAll(/`((?:[^`\\]|\\.)*)`/gsu)) {
    for (const chunk of match[1].split(/\$\{[^}]*\}/gu)) {
      const text = chunk.trim();
      if (text) found.add(text);
    }
  }
  return [...found].filter((text) => text.length > 0).sort();
}

const list = literals(readFileSync(argv[2], "utf8").replace(/\r\n/gu, "\n"));
writeFileSync(argv[3], list.join("\n") + "\n", "utf8");
console.log(`${String(list.length).padStart(4)}  ${argv[2]}`);
```

### `characterize.sh`

```bash
#!/usr/bin/env bash
# ./characterize.sh pre | post | diff      (run pre BEFORE the first edit)
set -u
APP="/c/Users/KenJL/Desktop/WebApp Projects/AI Coding Workflow Framework/app"
S="<the directory holding these three scripts>"
SP="$S/t263"
COMPONENTS="QuestionCard TaskCard TaskIntentList TaskReview DisclosureConfirm ConnectCard CriticCall RepairCall HarnessRevision BuilderProposalReview TaskPromiseCard UnsealedCandidate CandidateCritique"

capture() {
  local phase="$1"; mkdir -p "$SP/$phase"; cd "$APP" || exit 1
  : > "$SP/$phase/digests.txt"
  for c in $COMPONENTS; do
    node "$S/behaviour-digest.mjs" "src/renderer/components/$c.tsx" "$c.tsx" \
      "$SP/$phase/$c.stripped.txt" >> "$SP/$phase/digests.txt"
    node "$S/literal-inventory.mjs" "src/renderer/components/$c.tsx" \
      "$SP/$phase/$c.literals.txt" > /dev/null
  done
  echo "captured $phase"
}

case "${1:-}" in
  pre|post) capture "$1" ;;
  diff)
    echo "=== 1. digests that MOVED ==="
    diff "$SP/pre/digests.txt" "$SP/post/digests.txt" | grep -E '^[<>]' || echo "  none"
    echo "=== 2. the exact non-className change in each ==="
    for c in $COMPONENTS; do
      diff -q "$SP/pre/$c.stripped.txt" "$SP/post/$c.stripped.txt" > /dev/null 2>&1 || {
        echo "--- $c"; diff -u "$SP/pre/$c.stripped.txt" "$SP/post/$c.stripped.txt" | sed -n '4,$p'; }
    done
    echo "=== 3. LITERALS gained or lost (a protocol literal here is a DEFECT) ==="
    for c in $COMPONENTS; do
      diff -q "$SP/pre/$c.literals.txt" "$SP/post/$c.literals.txt" > /dev/null 2>&1 || {
        echo "--- $c"; diff "$SP/pre/$c.literals.txt" "$SP/post/$c.literals.txt" | grep -E '^[<>]'; }
    done
    ;;
  *) echo "usage: characterize.sh pre|post|diff"; exit 2 ;;
esac
```

### The baseline digests at `7f093f8`

Re-run `characterize.sh pre` on a clean tree at this commit and you must get
exactly these. If one differs, something moved before you started and you should
find out what before editing.

```text
9ed12a496e008baa625f332677e0a21516151cb4051ce400e69177edd9cacae6  QuestionCard.tsx
5d48fc7dc7d96c49ee1f1cc0d3121f4a1cf2a73a977a765617f7cf2fab575b01  TaskCard.tsx
c7a0dcbd65af114c36dc6edb3465f0ee1e8b525eb16b6b3ee19442c531fb35e2  TaskIntentList.tsx
b486c4bb23b458692c83b36fb2239dc0c01bae5cca17952a177df084c7079118  TaskReview.tsx
85982c416942decc3b71c1a86d666410ebbd1ec1a0cf03ea87720ed7693df5e1  DisclosureConfirm.tsx
5ce6766aaa78284c2eb9d6c83ea0b280f297fe052cbb138c89ab006f5b9d3d30  ConnectCard.tsx
29dddc01c00ee021abcc8ca567fe7fa9e96039742169d54b4a5d0f982304ebc5  CriticCall.tsx
1024040009e996fceff2a47c92975665c8f11290c1a953fa31e42bfa8e04da9a  RepairCall.tsx
1c4a7acfee62bd0f1bb367710cf768b2640717c3addc1d6ccadcb71c3f95c45c  HarnessRevision.tsx
794f070df4ed6b3516cc3b818345d572611ca5c2a28246f127d41222b759885a  BuilderProposalReview.tsx
b3baad8325691d972218d6b9e80bcbe63a13adfe6c1f09df853bf9a49bf541b7  TaskPromiseCard.tsx
274bf0a42a9bc52296552d8de0d74bf19d9c53b02296656646a868467a5766cd  UnsealedCandidate.tsx
45dda2bc6ee9b8af4ac02cc38ec8b890c3a9fbd73e6086c5db030742b5619e4e  CandidateCritique.tsx
```

`HarnessRevision.tsx`'s digest is post-repair; before `7f093f8` it was
`b2eea009e6396e9004f4880ea97f1ccf920a16b89be5451c9030055d887953b6`.
