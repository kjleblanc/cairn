# Handoff — Slice 7: running, results, evidence, history and publication

**This is a SLICE handoff, not a mid-task one.** Slice 6 is complete, committed
and merged (`1d336c1`, then `256b17d`). Nothing is in flight, no number is
claimed for Slice 7, and the working tree is clean.

**Every measurement below was taken in this session against `1d336c1`.** Where a
claim is inherited rather than measured, it says so. That distinction is not
pedantry: the handoff Slice 6 received carried three confident claims that did
not survive checking, and one of them — a table of thirteen baseline digests —
cost real time before it turned out to disagree with the script shipped beside
it. **Nothing in this file is a hash you cannot regenerate.**

**Authority order:** `AGENTS.md`, then
`docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`
(Slice 7, plus sections 2, 3, 4 and 6), then
`docs/superpowers/specs/2026-08-13-cairn-resident-program-visual-design.md`
sections 6 and 7. Read `docs/ai-work/tasks/263-report.md` for how Slice 6 did
this same job on the decision family — Slice 7 is that recipe applied to the
result family, plus one thing Slice 6 did not have to do.

## Claim 267, not 265

**265 and 266 are already taken**, on `lane/i`, and `main`'s
`docs/ai-work/tasks/` does not show it. Verified this session:

| Number | Where | What |
|---|---|---|
| 262 | `lane/i` (`ae29482`) | owner-verdict document repairs |
| 263 | `main` | Slice 6, this work |
| 264 | `main` (`edb3a3e`) | the CP1252 double-encoding repair |
| 265 | `lane/i` (`2ff5a55`, completed `3133764`) | contract v0.9.0, the verdict tree |
| 266 | `lane/i` (`6ba2257`, `8519a8b`) | owner-verdict Plan 2, reviewed round two |
| **267** | **free** | **Slice 7** |

```bash
git log --all --diff-filter=A --name-only --format="" -- "docs/ai-work/tasks/26*" | sort -u
```

That command is the check. Listing `main`'s `docs/ai-work/tasks/` alone would
have told you 265 was free, and it is not.

## A contract change is coming that affects you

`lane/i` carries **Cairn Contract v0.9.0**; `main` is still v0.8.0. Verified by
diffing `HEAD:AGENTS.md` against `3133764:AGENTS.md`. Three changes matter here:

1. **`docs/ai-work/verdicts/` becomes a reserved tree.** "Never write anything
   under `docs/ai-work/verdicts/`… Cairn stops any run whose changes include
   such a path and reports it as unverified, so a file written there costs the
   whole run — including work that was otherwise correct. The name is reserved
   whether or not the folder exists." Slice 7 has no reason to go near it; know
   that it exists so you do not create it as a convenient place for evidence.
2. **The number check widens** to `docs/ai-work/verdicts/` as well as
   `docs/ai-work/tasks/`.
3. **Re-read the listing immediately before you write the brief**, not only
   before you commit it, and never write a task path with a whole-file
   overwrite. That clause exists because of Task 263's own two renumbers.

**A project's own contract is law even when it is older than another branch's.**
Work to whichever version is in `main` when you start, and mention the drift.

## What Slice 7 actually is, and why it is bigger than the plan's path list

The plan describes Slice 7 as the result family. It is that, **plus the removal
of `chat-column-villager` itself**, which Slice 5's report scheduled for "the end
of Slice 7, when the last family has moved". That second half is not in the
plan's exact-path list and it is the harder half.

**167 scoped entries remain in `app.css`. Only 125 of them are the result
family.** Measured this session:

| Block | Lines | Rules | Scoped entries |
|---|---|---|---|
| Task 188 — the result receipt | 988–1148 | ~54 | 57 |
| Task 193 — publication and push | 1824–1974 | ~44 | 44 |
| Task 189 — the run strip | 1708–1808 | ~23 | 24 |
| **subtotal** | | | **125** |
| The last reduced-motion block | 2001+ | | 7 |
| **Everything else** | scattered | | **35** |

### The 35 outside the blocks, which are the real work

Enumerate them yourself with:

```bash
grep -n "chat-column-villager" app/src/renderer/app.css
```

They are four different things, and only the first is optional:

1. **Leftovers of the families already moved** — `.route-facts` responsive rules
   (924–925), `.result-card-files .mono` (926), and the three result-state
   colours (985–987, `--pond-done` / `--pond-task` / `--pond-stop`). The last
   three are yours; they are the disposition words.
2. **The generic control skin**, `app.css` 1160–1188: `.chat-column-villager
   .pill`, `.pill-primary`, `.pill-quiet`, `.chat-tuck`. **Slice 5 left this
   deliberately and said so.** Every control this slice does not explicitly
   restyle is wearing it, so when the hook comes off they all lose their skin at
   once. This is the single most likely way to ship a silently broken screen.
3. **The topbar's responsive rules** (1595–1600, 1670–1671). Slice 5 moved
   `.chat-topbar` into `surfaces.css` but left its `@media` rules here, still
   scoped to the hook. A scoped grep for "topbar" in `surfaces.css` will tell
   you the topbar migrated and will not tell you this.
4. **The column itself** — `.chat-column.chat-column-villager` at 748, 879, 898,
   907, 914, 915, 1526, 1591, 1657, 1679. This is what the hook *is*: the paper
   field, its grain `::after`, the flex layout that makes the transcript the
   only scrolling child, and the 1260 px responsive behaviour. Removing the
   class means these rules either move to `workspace.css`/`surfaces.css` or are
   proved dead. **Do not delete them on the assumption that `workspace.css`
   already covers it — check each one.**

### Three `620px` blocks are yours; a fourth is not

`grep -n "max-width: 620px" app/src/renderer/app.css` returns four. **1144
(result card), 1799 (run strip) and 1966 (push) are Slice 7's** and move to
820 px, for the reason Slice 6 recorded: 620 px is below the supported 760 px
minimum, so those rules only ever reached the containment stress view.

**1547 is NOT yours.** It is the app-wide legacy block — `.shell`,
`.serial-map`, `.chat-column`, `.bubble` — and belongs to Slice 8 or 10. Moving
it would change screens this slice has no business touching.

## The test map, measured

`grep -c` counts of hook references, taken this session:

| File | Hook refs | Note |
|---|---|---|
| `pushpaper.test.ts` | 16 | 21 result/run/push hits; uses a `lastRule` that DOES assert `-1`. Safe helper. |
| `resultreceipt.test.ts` | 14 | 34 hits. The big one. |
| `lantern.test.ts` | 13 | **See below — this one is special.** |
| `runpaper.test.ts` | 13 | Slice 6 already re-pointed one end marker in it. |
| `continuousspace.test.ts` | 4 | reads `.chat-column.chat-column-villager` |
| `evidencepresentation.test.ts` | 0 | **unscoped**, and it still has a quiet guard — see below |

### `lantern.test.ts` is the hook's own guard, and its subject disappears

All seven of its tests are *about the class you are deleting*: "the panel is warm
lit paper", "one soft light spill lifts the paper", "the lantern re-points the
paired tokens instead of rewriting its children", "the lantern has no tail",
"the lantern lands, and then holds still", "reduced motion WINS over the
lantern's entrance", and "each receipt disposition word keeps its approved pond
colour".

That last one is a result-family assertion hiding in a file named for something
else. The other six are **Replaced** dispositions — the component they guard
stops existing — and the plan is explicit that a Replaced test needs "an
equivalent rendered or causal check [that] proves the replacement before
deletion". Budget for that; it is not a delete.

Its helper at line 10 is `css.indexOf(".chat-column.chat-column-villager {")`
with **no `-1` assertion**. When the class goes, that returns `-1` and the slice
degenerates. It fails RED rather than quiet (an empty string fails the
`includes` checks), which is the right failure, but the message will be
confusing rather than pointing at the cause.

### One quiet guard, confirmed

**`evidencepresentation.test.ts:109`:**

```js
const evidenceCss = css.slice(css.indexOf("/* Task 173:"), css.indexOf("/* The push flow."));
assert.ok(!/animation\s*:|transition\s*:/.test(evidenceCss));
```

Two bare `indexOf` markers, no `-1` assertion, and the only assertion on the
slice is a **negative**. If either marker moves — and Task 173's evidence block
at `app.css` 345–433 is Slice 7's surface — the slice can go empty and the
assertion passes while reading nothing. Repair it with a positive
`assert.notEqual(…, -1)` on both ends while the file is open.

Both markers exist today: `/* Task 173:` at line 345 and `/* The push flow.` at
line 411. Note that 411 is the **unscoped** push-chip base, not Task 193's
scoped push block at 1824 — two different comments, easy to confuse.

## What Slice 6 hands you specifically

1. **Delete the receipt's intent-row copy** at `app.css` **1109–1127**
   (`.chat-column-villager .result-card-request-body .task-intent*`). Slice 6
   wrote ONE shared intent-row rule set in `surfaces.css`, used flat by the
   dispatch checkpoint and the operational papers with the proposal's fill as an
   override. The receipt's copy only still wins because it is (0,3,0) against
   the shared rule's (0,2,0). **Delete it in favour of the shared one; do not
   port it.** Slice 6 deliberately did not reach into the receipt's interior.
2. **Six components have duplicated rules, scoped and unscoped**, and the
   unscoped halves exist only because TaskRun still needs them: `TaskReviewView`,
   `TaskSpecProposalPreviewView`, `CriticCallCard`, `RepairCallCard`,
   `HarnessRevisionCard`, `DisclosureConfirm` — all mounted by `TaskRun.tsx`
   (verified: imports at lines 16–19). **When you migrate TaskRun, the unscoped
   halves can go.** Until then they are load-bearing.
3. **`dispatchpaper.test.ts`'s "the shared disclosure keeps every byte" test
   still reads `app.css` on purpose**, and asserts `.dispatch-approval` keeps
   `margin-top: 12px` (app.css:500). That is the TaskRun copy. It is marked
   Preserved. When TaskRun migrates, re-point it rather than deleting it.
4. **Widen `contrast.spec.ts` a third time rather than writing a fourth
   scenario.** Slice 5 gave it a connected conversation; Slice 6 drove a
   proposal-with-concern onto the paper and took it from 22 elements to 36 at
   worst 5.47:1. The same scenario can reach a result card. The fixture answers
   anything containing `"title"` with a proposal, and `conductor.spec.ts` shows
   the route from there to a DONE card.
5. **Owner gate 3 falls at the end of this slice** — the first owner judgment
   since gate 2. The plan asks for one complete request → pushback → proposal →
   approval → working → DONE/STOPPED → evidence → commentary route in a
   disposable project and isolated profile. Slice 6's captures are in
   `app/shots/task263/`; put yours in `app/shots/task267/`.

## Hazards — every one of these was hit this session

1. **`app.css` may not name an `.rp-` class in a RULE or a COMMENT.**
   `visualtokens.test.ts` regexes the whole file, comments included. Slice 5 and
   Slice 6 both nearly went red on prose alone.
2. **The E2E suite pins appearance in ways no selector grep can find.**
   `conductor.spec.ts` carried **ten** `getComputedStyle` pins for the decision
   family — radius, shadow, a disabled `opacity`, focus-ring geometry, a
   focused-heading mechanism, a mono weight, and a mark read off a `::before`.
   Expect the same for results. **Run the E2E before you believe a restyle is
   done**, and read the failures rather than dismissing them.
3. **A first Playwright batch will lie to you.** Five scenarios failed with the
   Windows worker-teardown `EPERM` at `tests/fixtures/isolated-profile.ts:46`
   and **no assertion error at all**. One of those was genuinely just teardown;
   four had real failures underneath. Rerun each alone with `--reporter=list`
   and read the whole output — a `tail -8` truncates the actual assertion.
4. **Pin shadows theme-stably.** `--rp-shadow-low` is a cool ink at 10% in Light
   and black at 30% in Dark, so pinning a whole computed `box-shadow` string
   makes a scenario depend on the machine's theme. Strip the colour:
   `style.boxShadow.replace(/^rgba?\([^)]*\)\s*/u, "")`. Same for any
   `light-dark()` colour — assert a relationship, not an `rgb()` triple.
5. **A capture spec MUST import `test` from `./fixtures/isolated-profile`**, not
   from `@playwright/test`. That fixture is what points `CAIRN_TEST_USER_DATA`
   at a throwaway directory. Importing the bare `test` launched Electron against
   **the owner's real Cairn profile** and wedged on boot exactly as that
   fixture's own comment predicts. Nothing was written that time; the next step
   would have stored a fixture conductor connection in the owner's profile.
6. **Scaffold test projects with core's `initProject`**, the way
   `contrast.spec.ts` does. Writing `AGENTS.md` and a couple of files by hand
   produces a directory the app does not recognise, and it hangs at
   `.workspace-stage` for the full timeout with no useful error.
7. **Never re-point assertions with a repository-wide `sed`.** Restoring the
   paper grain split a `background:` shorthand into `background-color:` plus
   `background-image:`; a broad `sed` also rewrote an assertion about a control
   that legitimately still used the shorthand. **A targeted test run had gone
   green** because it predated the change — only the full `test:unit` showed it,
   as a tenth failure against a nine-failure baseline. Re-run everything.
8. **Playwright clears `test-results/` wholesale**, `--output=` regardless. It
   removed every `task2*` run directory this session, including Slice 6's own.
   Write anything that must survive into `app/shots/`, which nothing clears.
9. **App-token mutex:** create `%TEMP%\cairn-app-token` and `app/.app-token` with
   `mkdir`, track ownership per location, and release in a `trap`/`finally` that
   **also covers the launch**. Verified working this session, including after a
   run killed mid-flight — both tokens released.
10. **`playwright.cmd` fails from Git Bash** (space in the path). Use
    `node ./node_modules/@playwright/test/cli.js test …`.
11. **Do not edit under `app/src/` while a Playwright sweep runs.**
    `playwright.global-setup.ts` compares `.vite`'s mtime against `app/src`.
    Editing under `app/tests/` or `app/tests-unit/` is safe.
12. **Never round-trip a source file through PowerShell's `Get-Content -Raw` /
    `Set-Content`.** That is what produced the CP1252 double-encodings Task 264
    repaired. Use the editor tools, or byte-level Node.

## The characterization baseline — capture your own

`c2`'s question is "did any component's behaviour move", and the honest answer
comes from a **within-session** before/after comparison. Slice 6's harness is
below. **Run `pre` before your first edit and keep the output; do not compare
against any number written in a document, including this one.**

Slice 6's own `c2` was a clean zero because it touched no `.tsx` at all. Slice 7
will touch `Chat.tsx`, `TaskRun.tsx`, `ActivityFeed.tsx`, `ModelRoute.tsx` and
`EvidenceAlbum.tsx`, so yours will not be — which is exactly why the diff has to
be readable rather than a pass/fail hash.

**Why the literal inventory matters here too.** Several strings in these
components look like class names and are not: result dispositions, push phases
and evidence kinds are protocol values the main process matches on. Slice 6 had
558 such literals across thirteen components (472 distinct), counted from its
own capture.

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

Set `S` to wherever you put the two scripts, outside the repository. The
component list is Slice 7's, not Slice 6's.

```bash
#!/usr/bin/env bash
# ./characterize.sh pre | post | diff      (run pre BEFORE the first edit)
set -u
APP="/c/Users/KenJL/Desktop/WebApp Projects/AI Coding Workflow Framework/app"
S="<the directory holding these two scripts>"
SP="$S/slice7"
SCREENS="Chat TaskRun"
COMPONENTS="ActivityFeed ModelRoute EvidenceAlbum"

capture() {
  local phase="$1"; mkdir -p "$SP/$phase"; cd "$APP" || exit 1
  : > "$SP/$phase/digests.txt"
  for c in $SCREENS; do
    [ -f "src/renderer/screens/$c.tsx" ] || continue
    node "$S/behaviour-digest.mjs" "src/renderer/screens/$c.tsx" "$c.tsx" \
      "$SP/$phase/$c.stripped.txt" >> "$SP/$phase/digests.txt"
    node "$S/literal-inventory.mjs" "src/renderer/screens/$c.tsx" \
      "$SP/$phase/$c.literals.txt" > /dev/null
  done
  for c in $COMPONENTS; do
    [ -f "src/renderer/components/$c.tsx" ] || continue
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
    for f in "$SP"/pre/*.stripped.txt; do
      c=$(basename "$f" .stripped.txt)
      diff -q "$f" "$SP/post/$c.stripped.txt" > /dev/null 2>&1 || {
        echo "--- $c"; diff -u "$f" "$SP/post/$c.stripped.txt" | sed -n '4,$p'; }
    done
    echo "=== 3. LITERALS gained or lost (a protocol literal here is a DEFECT) ==="
    for f in "$SP"/pre/*.literals.txt; do
      c=$(basename "$f" .literals.txt)
      diff -q "$f" "$SP/post/$c.literals.txt" > /dev/null 2>&1 || {
        echo "--- $c"; diff "$f" "$SP/post/$c.literals.txt" | grep -E '^[<>]'; }
    done
    ;;
  *) echo "usage: characterize.sh pre|post|diff"; exit 2 ;;
esac
```

**The component list is the plan's, verified to exist but not verified to be
complete.** All three are real files as of `1d336c1`: `ActivityFeed.tsx` (18
lines), `ModelRoute.tsx` (24), `EvidenceAlbum.tsx` (344). **`ResultEvidence` is
NOT a file** — it is exported from `EvidenceAlbum.tsx:293`, so digesting
`EvidenceAlbum` covers it; do not add a path for it.

**Sweep the consumers rather than trusting the list.** Slice 2 found
`chatmock-view.tsx` that way and would have broken `build:lab` without it;
Slice 6 found three decision pauses (`TaskPromiseCard`, `UnsealedCandidate`,
`CandidateCritique`, Tasks 238–245) that post-dated the plan entirely. The plan
is two months older than the surfaces it names.

## The baseline to re-derive, and the one number worth knowing

**Re-derive the unit baseline in your own lane before the first edit.** Do not
take this from a document. As of `1d336c1` it was **1037 tests / 1026 pass /
9 fail / 2 skipped**, and the nine failures are the documented pre-existing set:
four in `builderlivetransport.test.js`, five in `buildertrackedtext.test.js`.
Diff the failure **set** by full test title, not the count.

```powershell
npm.cmd run test:unit
```

It takes roughly 45 minutes; several Q9 tests run 15–30 s each. It is not hung.

**`builder-proposal-conversation.spec.ts` is red before you start**, with
`TASK232_SELECTION_REFUSED` from `src/main/builderreviewroutefixture.ts:22` —
the same `buildertrackedtext.ts` module carrying five of those nine unit
failures. Not yours.

**`evidence.spec.ts` was repaired at `cf6033b`** ("the connect race and the owner
pause"), which is in `main`'s history. Task 260 had recorded it as red; the
repair landed after that. **I did not re-run it this session** — the plan names
it as one of Slice 7's specs, so run it early and find out rather than assuming
either way.

## What to do, in order

1. Claim **267** — re-read the listing across all branches immediately before
   you write the brief, and never overwrite a task path.
2. Re-create the harness, run `pre`, and re-derive the unit baseline. Both
   before the first edit.
3. Run `evidence.spec.ts` and the result/push `conductor.spec.ts` scenarios
   **before** touching anything, so you know which reds are yours later.
4. Move the three big blocks — receipt, run strip, push — with Slice 6's recipe:
   `.rp-conversation`-anchored rules in `surfaces.css`, delete from `app.css`,
   620 px → 820 px, reduced-motion kills to the end of `motion.css`.
5. Delete the receipt's intent-row copy in favour of the shared rule set.
6. Migrate TaskRun, then delete the six shared surfaces' unscoped halves.
7. Then the 35 stragglers — the control skin and the column itself last, because
   they are what the hook is.
8. **Remove `chat-column-villager` and prove nothing lost its skin.** Task 259
   proved what removing it early costs: the dispatch panel silently reverted to
   a pre-Task-186 card language and only `conductor.spec.ts` caught it.
9. Re-point every test with a recorded disposition; Replace `lantern.test.ts`
   with real equivalents; repair `evidencepresentation.test.ts:109`.
10. Widen `contrast.spec.ts` to reach a result card.
11. Every check in the brief, then the report, one LOG row, one exact-path
    commit — and **owner gate 3**, which needs a rendered surface, not code.

## Other sessions are live in this repository

- **`lane/i`** — the owner-verdict work, Tasks 262/265/266, in its own worktree.
  It carries contract v0.9.0. Docs only, but the contract lands with it.
- Several `claude/*` worktrees exist; `claude/peaceful-elion-eb127e` merged
  `main` at `256b17d`.

`main` moved between Slice 6's commit and this handoff. **Re-read `git log`
immediately before every write to a shared path, not only before a commit.**
