# Cairn Conversation Panel and Visual Language (Corrected) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the owner-approved Lantern on Water conversation panel, pastel visual language, earned-ripple motion, New Horizons interaction treatment, and line-or-whole-pond narrow window without changing workflow truth or face geometry.

**Architecture:** Event truth remains exclusively in `app/src/renderer/town/presentation.ts`; React renders that truth, CSS supplies appearance and motion, and Playwright verifies the real composed result at both approved viewport sizes. Colour is data: the pastel set lands on the token names the cast already reads in `tokens.css`, so `faces.ts` stays verbatim. The lantern re-points paired surface tokens inside `.chat-column-villager`; tests therefore check cascade winners, not merely selector presence. The narrow window adds one accessible status-line component and one `pondOpen` state in `Workspace`; Chat publishes its existing needs-you signal, while `TownSquare` separates the wider render shore from the deliberately unchanged saved-position shore.

**Tech Stack:** TypeScript, React, plain CSS, `node:test`, Playwright. No new dependencies.

This is **plan 2 of 4** from `docs/superpowers/specs/2026-08-02-cairn-showing-not-asking-design.md`, covering Decision 9 only. It is second because it holds the spec's only unsolved problem — four panel directions failed at 760×620 — and because it is the container plan 3 fills.

**Execution baseline:** create an isolated worktree at `9d46a954b0b3b5878e9d50efa962095977b9540d` (`Task 171: fill in the brief, and land plan 2 of 4`). Its `app/` and `core/` trees are identical to owner-handoff commit `0db4a0c98aa35b7d20437527732e2ee6d88e9f03`. At that baseline none of this exists: the pastel palette appears zero times in `app/src/renderer/tokens.css`. This is a build, not a refactor.

**Historical note:** current `main` already contains Task 171's implementation. Preserve `docs/superpowers/plans/2026-08-03-cairn-conversation-panel-and-visual-language.md` and commits `a1d7b5d` through `8e3f454` unchanged: they are evidence of the concurrent execution that exposed the old plan's defects. This corrected sibling is the executable reconstruction. Do not run it against current `main`, do not rewrite Task 171, and do not use its final tree as the red-test baseline.

**This plan claims no task number and authorizes no implementation.** Only after a later owner request to execute it, run `node cli/dist/src/index.js claim "The conversation panel and visual language: Lantern on Water (corrected)"` and commit that generated brief alone before Task 1.

## Execution preflight (only after the owner asks to implement)

- [ ] List the registered worktrees before adding one:

```powershell
git worktree list --porcelain
```

The original checkout currently has protected worktrees at `.lanes/b`, `.lanes/c`, and `.lanes/d`; their continued presence does not prove whether their human-driven lanes are active. Ask the owner which are active. If adding Lane E would exceed the currently authorized three active lanes, pause for an explicit amendment allowing Lane E for this isolated reconstruction. Do not delete, move, reset, or reuse any registered worktree to make room.

- [ ] From the current repository root, prove the fixed branch and worktree targets are free:

```powershell
git branch --list lane/e
Test-Path -LiteralPath .lanes\e
```

Expected: the branch command prints nothing and `Test-Path` prints `False`. If either target exists, stop and inspect it; do not delete, reuse, or overwrite it.

- [ ] Create the isolated worktree at the fixed red-test baseline, then enter it:

```powershell
git worktree add -b lane/e .lanes/e 9d46a954b0b3b5878e9d50efa962095977b9540d
Set-Location .lanes\e
git status --short --branch
git rev-parse HEAD
```

Expected: a clean `lane/e` branch, lane identity E at `.lanes/e`, and exactly `9d46a954b0b3b5878e9d50efa962095977b9540d`. All commands below run in this worktree unless they explicitly say otherwise. The fixed baseline predates this corrected plan file, so keep the plan open read-only from `C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\docs\superpowers\plans\2026-08-03-cairn-conversation-panel-and-visual-language-corrected.md`; do not copy or cherry-pick it into the reconstruction branch.

- [ ] A fresh worktree is not ready until its own dependencies and builds exist. Installing is a concrete risk boundary under `AGENTS.md`: pause and show the owner that the next two `npm ci` commands restore the already-locked root and app dependencies into ignored `node_modules` directories, may use the network and disk, add no package, and can be recovered by removing this new worktree only after a separate deletion approval. Proceed only after that exact install is approved, then run:

```powershell
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw "root npm ci failed with exit code $LASTEXITCODE" }
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "root workspace tests failed with exit code $LASTEXITCODE" }

Push-Location app
try {
  npm.cmd ci
  if ($LASTEXITCODE -ne 0) { throw "app npm ci failed with exit code $LASTEXITCODE" }
  npm.cmd run build:vite
  if ($LASTEXITCODE -ne 0) { throw "baseline app build failed with exit code $LASTEXITCODE" }
} finally {
  Pop-Location
}
```

Expected: the locked installs, root workspace tests, and baseline app build succeed. This is setup, not permission to change source.

- [ ] Before Task 1, preserve the baseline Playwright failures by full title and message in a unique temp log. Acquire the app mutex exactly as shown; if acquisition fails, wait and never remove the existing token:

```powershell
$taskToken = Join-Path ([System.IO.Path]::GetTempPath()) "cairn-app-token"
$baselineLog = Join-Path ([System.IO.Path]::GetTempPath()) ("cairn-plan2-9d46a95-smoke-{0}.txt" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
$taskOwnsToken = $false
$baselineExit = $null
try {
  New-Item -ItemType Directory -Path $taskToken -ErrorAction Stop | Out-Null
  $taskOwnsToken = $true
  Push-Location app
  try {
    $baselineOutput = & npm.cmd run test:smoke 2>&1
    $baselineExit = $LASTEXITCODE
    $baselineOutput | Out-File -FilePath $baselineLog -Encoding utf8
    $baselineOutput
  } finally {
    Pop-Location
  }
} finally {
  if ($taskOwnsToken -and (Test-Path -LiteralPath $taskToken)) {
    Remove-Item -LiteralPath $taskToken -Force
  }
}
Write-Host "Baseline smoke log: $baselineLog"
Write-Host "Baseline smoke exit code: $baselineExit"
```

Read the log and preserve every failing title plus its error fingerprint; a count alone is never a baseline. The known identities are repeated under Final verification.

- [ ] Immediately before claiming, compensate for `claim.ts` resolving `.lanes` under its current working directory: require that every brief filename visible on disk in the main checkout or a lane already exists on at least one local branch. Committed filenames are safe because `claim` scans every local branch; a filename absent from all branches is an uncommitted sibling claim and must stop this lane.

```powershell
$mainCheckout = 'C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework'

# A filename found on any local branch is already committed and therefore
# visible to claim.ts. Only a matching file on disk that is absent from this
# set can be an uncommitted sibling claim. This avoids `git -C` entirely: Git
# may reject a sibling worktree as dubious even though its files are readable.
$committedBriefNames = @{}
$branches = @(git for-each-ref --format='%(refname)' refs/heads)
if ($LASTEXITCODE -ne 0) { throw "could not list local branches" }
foreach ($branch in $branches) {
  $briefPaths = @(git ls-tree -r --name-only $branch -- docs/ai-work/tasks)
  if ($LASTEXITCODE -ne 0) { throw "could not inspect committed briefs on $branch" }
  foreach ($briefPath in $briefPaths) {
    if ($briefPath -match '([^/]+-brief\.md)$') {
      $committedBriefNames[$Matches[1].ToLowerInvariant()] = $true
    }
  }
}

$taskDirectories = @((Join-Path $mainCheckout 'docs\ai-work\tasks'))
$lanesRoot = Join-Path $mainCheckout '.lanes'
if (Test-Path -LiteralPath $lanesRoot) {
  foreach ($laneDir in @(Get-ChildItem -LiteralPath $lanesRoot -Directory)) {
    $taskDirectories += Join-Path $laneDir.FullName 'docs\ai-work\tasks'
  }
}

$pendingSiblingBriefs = @()
foreach ($taskDirectory in $taskDirectories) {
  if (-not (Test-Path -LiteralPath $taskDirectory)) { continue }
  foreach ($brief in @(Get-ChildItem -LiteralPath $taskDirectory -File -Filter '*-brief.md')) {
    if (-not $committedBriefNames.ContainsKey($brief.Name.ToLowerInvariant())) {
      $pendingSiblingBriefs += $brief.FullName
    }
  }
}
if ($pendingSiblingBriefs.Count -gt 0) {
  $pendingSiblingBriefs
  throw "a sibling brief is uncommitted; wait for its claim commit before claiming here"
}
```

Expected: no output and no throw. This closes the CLI's nested-worktree blind spot without asking Git to trust another checkout and without patching the CLI out of scope. Run the claim immediately after this gate. If a sibling brief appears in the race window, the post-claim collision check below stops before source work.

- [ ] Now that source implementation is actually beginning, claim the task:

```powershell
$claimOutput = & node cli/dist/src/index.js claim "The conversation panel and visual language: Lantern on Water (corrected)" 2>&1
$claimExit = $LASTEXITCODE
$claimOutput
if ($claimExit -ne 0) { throw "claim failed with exit code $claimExit" }
$claimText = $claimOutput -join [Environment]::NewLine
$briefMatch = [regex]::Match($claimText, 'Brief:\s+(docs/ai-work/tasks/(\d{3})-brief\.md)')
if (-not $briefMatch.Success) { throw "claim output did not name its brief" }
$claimedBrief = $briefMatch.Groups[1].Value
$claimedName = Split-Path -Leaf $claimedBrief
$claimedText = Get-Content -LiteralPath $claimedBrief -Raw
if (-not $claimedText.Contains('**Lane:** E (`.lanes/e`)')) {
  throw "claim wrote an untruthful lane identity"
}
$mainCheckout = 'C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework'
$collisionPaths = @()
$mainCollision = Join-Path $mainCheckout "docs\ai-work\tasks\$claimedName"
if (Test-Path -LiteralPath $mainCollision) { $collisionPaths += $mainCollision }
foreach ($laneDir in @(Get-ChildItem -LiteralPath (Join-Path $mainCheckout '.lanes') -Directory)) {
  if ($laneDir.Name -eq 'e') { continue }
  $candidate = Join-Path $laneDir.FullName "docs\ai-work\tasks\$claimedName"
  if (Test-Path -LiteralPath $candidate) { $collisionPaths += $candidate }
}
if ($collisionPaths.Count -gt 0) {
  $collisionPaths
  throw "the claimed number collided in a sibling worktree; stop before source work and follow the contract's renumber ritual"
}
git status --short --branch
```

The claim command itself writes the lowest-free brief skeleton, stages that exact path, and commits it alone. Expected: it prints the concrete brief path under `docs/ai-work/tasks/` and “Committed alone”; the brief truthfully says Lane E; the exact-number collision scan is empty; status is clean. Do not guess or substitute a number in advance. Open `$claimedBrief`; set its H1 title to the fixed corrected title in the claim command; and complete every generated section with this plan's visible outcome, intent boundary, checks, DONE/STOPPED meaning, and the printed baseline-log path plus exact failure fingerprints. Add one machine-readable line beginning `Worker-running baseline: `. If `a dispatched run lives in the conversation…` passed at the baseline, finish that line with `PASS`; if it failed, finish it with `FAIL | ` followed by one exact, unique single-line error fingerprint copied from the baseline log. Task 9 reads this line and rejects any different failure. Stage `$claimedBrief` only and commit the filled brief alone before Task 1.

## Global Constraints

- **No new dependencies.** Nothing is added to any `package.json`. `@fontsource/quicksand/700.css` (Task 6) is a weight already shipped inside the installed `@fontsource/quicksand`.
- **The approved reference is two files**, both outside the repository's history (excluded via `.git/info/exclude`, so they never enter a task commit):
  - `.superpowers/brainstorm/19609-1785686173/content/lantern-v3.html` — the look.
  - `.superpowers/brainstorm/52918-1785736835/content/narrow-v2.html` — the narrow behaviour.
  Open both before starting. An isolated worktree will not contain excluded files, so read them from the original checkout at `C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\.superpowers\brainstorm\19609-1785686173\content\lantern-v3.html` and `C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\.superpowers\brainstorm\52918-1785736835\content\narrow-v2.html`; do not copy or stage them. Every literal colour, easing curve, and radius in this plan is transcribed from them.
- **Invent no colours.** Three of the four generated directions asserted in their own headers that they had invented none, and all three had. Every value below is either one of the seven approved colours, a value copied verbatim from an approved mockup, or a `color-mix` of one of those. **The plan contains exactly one derived value** — STOPPED ink `#4a201c`, named once as `--stopped-ink` in Task 2 and used by the solid STOPPED chip in Task 4 — and records that implementation detail explicitly.

  **What this rule protects, stated exactly, because three tasks in a row turned up borderline cases:** it protects against inventing a **hue**. That is the failure the spec records — directions that shipped colours the palette never approved and then said they hadn't.

  Three consequences, each one checkable rather than a matter of taste:

  1. **Every hue-bearing value must trace** to one of the seven approved colours, a mockup line, or an approved token — or be a `color-mix` of those. In a `color-mix`, the percentage is a blend ratio, not an alpha, and does not itself need a source.
  2. **The alpha on a traced hue must match** its mockup source or the rule it replaces. The hue being right does not make the alpha free. Three of this plan's own defects were exactly this, all caught in review: `--card: rgb(246 236 225 / 6%)` in Task 4 (fixed in `96c1284`), and `rgb(246 236 225 / 15%)` plus `rgb(22 27 44 / 94%)` in Task 5 (fixed in `61fb550`).
  3. **A neutral black shadow carries no hue** and does not need a mockup line — but it must use an alpha `app.css` already contains, so "the app's idiom" is a grep rather than a feeling. That set is `{.14, 16%, .18, 24%, 32%, 42%}` as of this plan's base. A shadow wanting a value outside it is proposing a new idiom and should say so.
- **The seven approved colours, with the roles they land on:** Cairn `#a3ddd0` → `--garden-cyan`; Kimi `#d5c0ec` → `--face-kimi`; Codex `#f3c49a` → `--face-codex`; Claude `#b8c9de` → `--face-claude`; done `#c2ddb6` → `--pond-done`; stopped `#f2aaa4` → `--pond-stop`; work in transit `#f7d3a8` → `--pond-task`.
- **Face geometry stays verbatim from `app/src/renderer/town/faces.ts`.** Now the owner's choice, not a constraint. Task 1 pins it and every later task must keep that test green.
- **Still water is the default.** At rest the pond is one continuous blend — no rings, no drawn contours, no perpetual animation. A ripple exists only because a real event landed, in the receiver's own colour. **This changes Task 168's shipped behaviour**: the pond currently draws three permanent contour rings. That is a rule 168's brief stated and its implementation did not reach — not a defect it introduced.
- **`app/src/renderer/town/presentation.ts` stays the only arbiter of "an event happened."** No new notion of when something occurred, in CSS or anywhere else.
- **No new breakpoints.** 1260px and 620px already exist in `app/src/renderer/app.css`. Every failed direction invented its own.
- **Nothing above 1260px changes about the narrow work.** The approved wide layout is untouched by Task 8.
- **The lantern lands once, then holds still.** Keep `villager-rise`; never add `lantern-sway` or any other infinite transform to `.chat-column.chat-column-villager`. The approved HTML swayed a picture. The real panel contains every conversation control, and an infinite container transform makes every one a moving target.
- **The entrance must release `transform` and `opacity` after it lands.** Use `backwards`, never `both` or `forwards`, on `villager-rise`. A forwards fill would pin the keyframe's final values above Task 8's pond-open slide and fade, leaving the conversation visibly fixed until `visibility` snaps off.
- **`prefers-reduced-motion` reaches the same final state.** Both reduced-motion blocks — `app.css` and `motion.css` — must cover every animation and transition this plan adds. A source-text assertion that merely finds a selector is insufficient: the kill must equal or exceed the animated selector's specificity and come after it when specificity ties.
- **The renderer may import from `@cairn/core` only with `import type`.** All five existing imports are type-only. Do not introduce the first runtime import.
- **Every line number below is relative to baseline `9d46a95`**, before any task has run. Most tasks edit `app/src/renderer/app.css`, so line numbers shift as you go. Locate each edit by the selector or rule named beside the number, not by the number alone.
- Run app checks from `app/`: `npm.cmd run typecheck`, `npm.cmd run test:unit`, `npm.cmd run build:vite`, `npm.cmd run build:lab`.
- Playwright runs from `app/` as `npm.cmd run test:smoke` (it builds first). Compare full test titles and error fingerprints against a baseline run from `9d46a95`; never compare only the number of failures. The known identities and the safe command appear under Final verification.
- **The E2E app token is a mutex directory.** Acquire `%TEMP%\cairn-app-token` with `New-Item -ErrorAction Stop`; if acquisition fails, wait. Release it in `finally` only when this process set the ownership flag. Never use `mkdir ... && ...; rmdir ...`, which is not PowerShell 5.1 syntax and can remove another lane's token after failed acquisition.
- **Look at it.** Every automated check passed on Task 169 while the app still showed `STOPPED — CANCELLED_BY_OWNER`. A screenshot read aloud caught it; no command did.

---

### Task 1: Pin the approved face geometry

**Files:**
- Create: `app/tests-unit/lanternfaces.test.ts`

**Interfaces:**
- Consumes: `TOWN_FACES`, `TownFaceDef`, `TownFaceState` from `app/src/renderer/town/faces.ts` (all already exported).
- Produces: nothing imported by later tasks. It is the guard every later task must keep green.

This task is first and changes no behaviour. The owner approved the mockups on the promise that every face path in them came verbatim from `faces.ts` — 20 of 20, checked by hand. That promise is currently held by a sentence in a spec. After this task it is held by a test, so a redesign cannot quietly redraw a face.

The mockups are excluded from the repository's history, so the test cannot read them. It carries their paths as literals instead, which is the stronger arrangement: the bar is fixed here, in tracked code.

`app/tests-unit/**/*.ts` is already inside `tsconfig.unit.json`'s `include` list, so a new test file needs no config change.

- [ ] **Step 1: Write the failing test**

Create `app/tests-unit/lanternfaces.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { TOWN_FACES, type TownFaceDef, type TownFaceState } from "../src/renderer/town/faces.js";

/**
 * The approved mockups' faces, transcribed.
 *
 * The owner approved `lantern-v3.html` (the look) and `narrow-v2.html` (the
 * narrow behaviour) on the promise that every face path in them came verbatim
 * from `app/src/renderer/town/faces.ts` — 20 of 20 checked by hand. Both files
 * live outside this repository's history (`.git/info/exclude`), so this test
 * carries their paths as literals rather than reading them. That is the
 * stronger arrangement: the bar is fixed here, in tracked code, and a redesign
 * that redraws a face fails rather than passing quietly.
 *
 * Order matters and is the order the mockups draw in, which is the order
 * `TownFace` renders: the signature mark first, then eyeL, eyeR, mouth.
 */
type DrawnPath = [d: string, width: number, opacity: number];

function drawn(face: TownFaceDef, state: TownFaceState): DrawnPath[] {
  return [...face.mark, ...face.states[state]].map((stroke) => [stroke.d, stroke.w, stroke.o ?? 1]);
}

/** The four cast faces in lantern-v3, at rest. 4 + 5 + 5 + 3 = 17 paths. */
const LANTERN_V3_AT_REST: Record<"claude" | "kimi" | "codex" | "cairn", DrawnPath[]> = {
  claude: [
    ["M 42 25 L 58 25", 2.2, 0.7],
    ["M 28 40 L 44 40", 3.2, 1],
    ["M 56 40 L 72 40", 3.2, 1],
    ["M 35 61 Q 50 66 65 61", 2.8, 1],
  ],
  kimi: [
    ["M 77 23 Q 71 28.5 77 34", 2, 1],
    ["M 81.5 28 L 81.5 28.1", 2.4, 0.8],
    ["M 29 42 Q 37 33 45 42", 3.4, 1],
    ["M 57 40 Q 63 34 69 40", 2.6, 0.8],
    ["M 38 61 Q 50 69 64 59", 3, 1],
  ],
  codex: [
    ["M 24 17 L 24 25", 2, 1],
    ["M 20 21 L 28 21", 2, 1],
    ["M 27 33 L 43 40", 3.6, 1],
    ["M 60 36 L 68 36", 2.8, 0.85],
    ["M 36 62 Q 50 68 69 57", 3, 1],
  ],
  cairn: [
    ["M 36 35 L 36 48", 3.8, 1],
    ["M 64 39 L 64 46", 2.6, 0.75],
    ["M 33 63 Q 48 70 70 57", 3, 1],
  ],
};

/** narrow-v2 draws Codex mid-run instead of at rest. Its 5 paths again. */
const NARROW_V2_CODEX_WORKING: DrawnPath[] = [
  ["M 24 17 L 24 25", 2, 1],
  ["M 20 21 L 28 21", 2, 1],
  ["M 26 32 L 44 40", 3.8, 1],
  ["M 73 31 L 58 39", 3.2, 1],
  ["M 38 64 L 47 61 L 55 66 L 63 62 L 71 63", 3, 1],
];

test("every face in the approved look mockup is verbatim from faces.ts", () => {
  for (const [id, paths] of Object.entries(LANTERN_V3_AT_REST)) {
    assert.deepEqual(
      drawn(TOWN_FACES[id as keyof typeof LANTERN_V3_AT_REST], "ready"),
      paths,
      `${id}'s resting face no longer matches the approved lantern-v3 mockup`,
    );
  }
});

test("the narrow mockup's working Codex is verbatim from faces.ts too", () => {
  assert.deepEqual(
    drawn(TOWN_FACES.codex, "working"),
    NARROW_V2_CODEX_WORKING,
    "Codex mid-run no longer matches the approved narrow-v2 mockup",
  );
});

test("all twenty approved paths are accounted for", () => {
  // lantern-v3 draws Cairn twice: once on the pond, once in the lantern's own
  // header. 17 distinct strokes + Cairn's 3 again = the 20 the owner was told
  // had been checked.
  const distinct = Object.values(LANTERN_V3_AT_REST).reduce((total, paths) => total + paths.length, 0);
  assert.equal(distinct + LANTERN_V3_AT_REST.cairn.length, 20);
});

test("the mockups drew a face for every cast member the app can show", () => {
  // Gemini and the fallback worker are absent from both mockups, so nothing
  // here pins them — but their geometry must still exist, or a live run with
  // one of those adapters would render an empty head.
  for (const id of ["gemini", "worker-fallback"] as const) {
    assert.ok(TOWN_FACES[id].states.ready.length >= 3, `${id} has no resting face`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

First, prove the test bites rather than passing vacuously. In `app/src/renderer/town/faces.ts` line 43, temporarily change Cairn's resting left eye from `"M 36 35 L 36 48"` to `"M 36 35 L 36 47"`, then run from `app/`:

```powershell
npm.cmd run test:unit
```

Expected: FAIL — `every face in the approved look mockup is verbatim from faces.ts` reports `cairn's resting face no longer matches the approved lantern-v3 mockup`.

Now **revert that one character** (`M 36 35 L 36 48`) and move to Step 3.

- [ ] **Step 3: Confirm no face implementation is needed**

None. `faces.ts` already satisfies the test; the whole point of this task is that it does. Confirm `git diff app/src/renderer/town/faces.ts` is empty before continuing.

- [ ] **Step 4: Run tests to verify they pass**

Run from `app/`: `npm.cmd run test:unit` — Expected: PASS, all tests, including the four new ones.

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0.

- [ ] **Step 5: Commit**

```powershell
git add app/tests-unit/lanternfaces.test.ts
git commit -m "Pin the approved mockups' face geometry against faces.ts"
```

---

### Task 2: The pastel palette

**Files:**
- Modify: `app/src/renderer/tokens.css:6-35` (warm shared cards plus semantic, rail, and focus aliases), `:61-66` (garden cyan), `:75-78` (pond semantics), `:82-87` (the cast), and a new block before `:113` (`--mono`)
- Modify: `app/src/renderer/app.css:20,32-44,76-80,118-135,185,209-215,253,269-279,816,825` (keep semantic roles legible and distinct on every real surface, including the sibling app-error overlay, and saturated fallback-worker amber out of the workspace atmosphere)
- Modify: `app/src/renderer/components/Ui.tsx:19-22` (STOPPED is coral; UNKNOWN remains amber)
- Modify: `app/src/renderer/components/Scene.tsx:38,43` (completion marks use done moss, not Cairn mint)
- Modify: `app/tests-unit/faces.test.ts:70-75`
- Modify: `app/tests/conductor.spec.ts` — twelve computed-colour pins
- Modify: `app/tests/away.spec.ts` (the real light-theme workspace warning)
- Modify: `app/tests/projects.spec.ts` (the real app-level error surface and contrast)
- Test: `app/tests-unit/palette.test.ts` (create)

**Interfaces:**
- Consumes: the Task 1 guard stays green (this task changes no geometry).
- Produces: CSS custom properties `--lantern-deep`, `--lantern-mid`, `--lantern-plum`, `--lantern-paper`, `--lantern-paper-lit`, `--lantern-ink`, `--lantern-soft`, `--pop`, `--ease`. Tasks 3 through 8 read them.

The pastel set lands on the token names the cast and the rest of the renderer already read, so `faces.ts` is untouched and every surface re-tones at once. Decision 9 makes no rail exception: the shared primary/warning/stop aliases, the rail's semantic aliases, and `--town-focus` all move to the approved roles here. Pastels on a dark pond raise contrast rather than lowering it, so this costs no legibility.

Two colours the owner did not name are handled by naming them, not by guessing:

- **`--pond-result` (`#70e3d3`)** becomes `#a3ddd0`. It is not an eighth colour: `--pond-result` means "the result is with Cairn", and `TownSquare.tsx:277` already paints a returning ripple with Cairn's own colour. After this they finally agree.
- **`--face-gemini` (`#8ad8b0`) and `--garden-amber` (`#f2b95c`) are deliberately left alone for the two unapproved cast identities.** The owner approved four cast colours; Gemini and the fallback worker are not among them, and picking pastels for them would be exactly the invention the spec's process note warns about. They will read as more saturated than the four beside them. That does not license fallback amber as scenery: the workspace's lower wash moves to the approved work-in-transit pastel while preserving its existing 8% strength. Record the two saturated cast identities as the unchanged out-of-scope limitation; do not let either leak into furniture or atmosphere.

- [ ] **Step 1: Write the failing test**

Create `app/tests-unit/palette.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const tokens = renderer("tokens.css");
const app = renderer("app.css");
const ui = renderer("components", "Ui.tsx");
const scene = renderer("components", "Scene.tsx");

function appRule(selector: string): string {
  const start = app.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return app.slice(start, app.indexOf("}", start));
}

/**
 * Decision 9, rule 3: the muted pastels supersede the saturated set. These
 * seven were chosen by the owner on 2026-08-02 and are the only colours this
 * work is allowed to introduce.
 */
const APPROVED: Array<[token: string, hex: string]> = [
  ["--garden-cyan", "#a3ddd0"],
  ["--face-kimi", "#d5c0ec"],
  ["--face-codex", "#f3c49a"],
  ["--face-claude", "#b8c9de"],
  ["--pond-done", "#c2ddb6"],
  ["--pond-stop", "#f2aaa4"],
  ["--pond-task", "#f7d3a8"],
];

/** The values the pastels replace. Any survivor is a half-finished re-tone. */
const SUPERSEDED = ["#7fd8c8", "#c9a7e8", "#f2a35c", "#9fb8d8", "#a9d39b", "#ff8178", "#ffb467", "#70e3d3"];

test("every approved pastel is on its own token", () => {
  for (const [token, hex] of APPROVED) {
    assert.match(tokens, new RegExp(`${token}:\\s*${hex};`), `${token} is not ${hex}`);
  }
});

test("no superseded saturated value survives on a re-toned token", () => {
  for (const hex of SUPERSEDED) {
    assert.ok(!tokens.includes(hex), `${hex} is still in tokens.css after the pastel re-tone`);
  }
});

test("shared UI, rail, and focus aliases use the approved roles too", () => {
  assert.match(tokens, /--card:\s*light-dark\(rgb\(255 250 240 \/ 74%\), rgb\(255 250 240 \/ 88%\)\);/);
  assert.match(tokens, /--card-solid:\s*#fffaf0;/);
  for (const [token, value] of [
    ["--green", "#a3ddd0"],
    ["--amber", "#f7d3a8"],
    ["--stop", "#f2aaa4"],
    ["--neon", "#a3ddd0"],
    ["--neon-warm", "#f7d3a8"],
    ["--neon-green", "#c2ddb6"],
    ["--town-focus", "#a3ddd0"],
  ] as const) {
    assert.match(tokens, new RegExp(`${token}:\\s*${value};`), `${token} escaped the pastel re-tone`);
  }
  assert.match(tokens, /--rail-line:\s*color-mix\(in srgb, var\(--pond-task\) 18%, transparent\);/);
  assert.match(tokens, /--neon-soft:\s*color-mix\(in srgb, var\(--garden-cyan\) 72%, var\(--lantern-deep\)\);/);
});

test("semantic text follows its surface instead of becoming dark-on-dark", () => {
  assert.match(tokens, /--green-deep:\s*light-dark\(var\(--green-ink\), var\(--garden-cyan\)\);/);
  assert.match(tokens, /--amber-ink:\s*#4a3520;/);
  assert.match(tokens, /--amber-deep:\s*light-dark\(var\(--amber-ink\), var\(--pond-task\)\);/);
  assert.match(tokens, /--done-text:\s*light-dark\(var\(--green-ink\), var\(--pond-done\)\);/);
  assert.match(tokens, /--stopped-ink:\s*#4a201c;/);
  assert.match(tokens, /--stopped-text:\s*light-dark\(var\(--stopped-ink\), var\(--pond-stop\)\);/);
  for (const selector of [".card", ".overlay-card", ".chat-column", ".feed"]) {
    const body = appRule(selector);
    assert.ok(body.includes("--green-deep: var(--green-ink)"),
      `${selector} does not use dark semantic ink on its light paper`);
    assert.ok(body.includes("--amber-deep: var(--amber-ink)"),
      `${selector} does not use dark warning ink on its light paper`);
    assert.ok(body.includes("--done-text: var(--green-ink)"),
      `${selector} does not use dark done ink on its light paper`);
    assert.ok(body.includes("--stopped-text: var(--stopped-ink)"),
      `${selector} does not use dark stopped ink on its light paper`);
  }
  const workspace = appRule(".workspace-shell");
  for (const [token, value] of [
    ["--green-deep", "var(--garden-cyan)"],
    ["--amber-deep", "var(--pond-task)"],
    ["--done-text", "var(--pond-done)"],
    ["--stopped-text", "var(--pond-stop)"],
  ] as const) {
    assert.ok(workspace.includes(`${token}: ${value}`),
      `the always-dark workspace does not set ${token} to ${value}`);
  }
  const appError = appRule(".app-error-overlay .error-card");
  assert.ok(appError.includes("--stopped-text: var(--stopped-ink)"),
    "the app-level error has no deterministic dark ink");
  assert.ok(appError.includes("var(--pond-stop) 12%, var(--card-solid)"),
    "the app-level error is not an opaque coral-on-light-paper surface");
  assert.ok(appError.includes("color: var(--stopped-text)"));
});

test("completion, stopping, and uncertainty keep their approved distinct roles", () => {
  const done = appRule(".badge-done");
  assert.ok(done.includes("var(--pond-done)"), "DONE badges use Cairn mint instead of done moss");
  assert.ok(done.includes("var(--done-text)"), "DONE badge text ignores its surface-aware ink");
  const stopped = appRule(".badge-stopped");
  assert.ok(stopped.includes("var(--pond-stop)"), "STOPPED badges use work amber instead of stop coral");
  assert.ok(stopped.includes("var(--stopped-text)"), "STOPPED badge text ignores its surface-aware ink");
  const unknown = appRule(".badge-unknown");
  assert.ok(unknown.includes("var(--pond-task)"), "UNKNOWN no longer stays in the amber attention role");
  const resultDone = appRule(".result-card-done");
  assert.ok(resultDone.includes("var(--pond-done)"), "the global DONE result still borrows Cairn mint");
  assert.ok(resultDone.includes("var(--done-text)"), "the global DONE result ignores its surface-aware ink");
  assert.ok(appRule(".activity-done strong").includes("var(--done-text)"));
  assert.ok(appRule(".activity-stopped strong").includes("var(--stopped-text)"));
  for (const selector of [
    ".pill-danger",
    ".error-card",
    ".bubble-system",
    ".result-card-stopped",
    ".result-card-error",
    ".result-card-recovery",
    ".dispatch-error",
  ]) {
    assert.ok(appRule(selector).includes("color: var(--stopped-text)"),
      `${selector} paints coral text directly instead of using surface-aware stopped ink`);
  }
  assert.ok(appRule(".result-card-stopped").includes("var(--pond-stop)"),
    "the global STOPPED result still borrows work amber");
  assert.ok(appRule(".checkup-mark-healthy").includes("var(--pond-done)"));
  assert.ok(appRule(".checkup-cell-done").includes("var(--pond-done)"),
    "completed checkup trail cells still fall through to neutral stone");
  assert.ok(ui.includes('className="badge badge-unknown"'), "UNKNOWN still shares STOPPED's coral class");
  assert.equal((scene.match(/fill="var\(--pond-done\)"/g) ?? []).length, 1,
    "the completed trail endpoint does not use done moss");
  assert.ok(scene.includes('top ? "var(--pond-done)"'),
    "the current completion stone does not use done moss");
  assert.ok(!scene.includes('fill="var(--green)"'), "a completion mark still uses Cairn mint");
});

test("each cast glow is derived from its own pastel, not the old one", () => {
  assert.match(tokens, /--garden-cyan-dim:\s*rgb\(163 221 208 \/ 35%\);/);
  assert.match(tokens, /--garden-cyan-glow:\s*rgb\(163 221 208 \/ 9%\);/);
  assert.match(tokens, /--face-kimi-glow:\s*rgb\(213 192 236 \/ 9%\);/);
  assert.match(tokens, /--face-codex-glow:\s*rgb\(243 196 154 \/ 9%\);/);
  assert.match(tokens, /--face-claude-glow:\s*rgb\(184 201 222 \/ 9%\);/);
});

test("the lantern's own surfaces and easings exist for the panel work", () => {
  for (const [token, value] of [
    ["--lantern-deep", "#161b2c"],
    ["--lantern-mid", "#212739"],
    ["--lantern-plum", "#2f2946"],
    ["--lantern-paper", "#332c3a"],
    ["--lantern-paper-lit", "#3d3444"],
    ["--lantern-ink", "#f6ece1"],
    ["--lantern-soft", "#c3b3a6"],
  ] as const) {
    assert.match(tokens, new RegExp(`${token}:\\s*${value};`), `${token} is not ${value}`);
  }
  assert.match(tokens, /--pop:\s*cubic-bezier\(\.34, 1\.56, \.64, 1\);/);
  assert.match(tokens, /--ease:\s*cubic-bezier\(\.22, \.9, \.3, 1\);/);
});

test("Gemini and the fallback worker stay saturated only as cast identities", () => {
  // Recorded, not fixed. The owner approved four cast colours; these two are
  // not among them, and inventing pastels for them is exactly the failure the
  // design spec's process note records. Delete this test the day they are
  // chosen — never by changing the values under it.
  assert.match(tokens, /--face-gemini:\s*#8ad8b0;/);
  assert.match(tokens, /--garden-amber:\s*#f2b95c;/);
  assert.ok(!app.includes("var(--garden-amber"),
    "fallback-worker amber leaks out of the cast and into the workspace");
  assert.match(app,
    /radial-gradient\(1000px 560px at 55% 115%, color-mix\(in srgb, var\(--pond-task\) 8%, transparent\), transparent 60%\)/,
    "the lower workspace wash does not use work-in-transit at the replaced rule's 8% strength");
});
```

In `app/tests/away.spec.ts`, inside `legacy state is preserved and the project conversion path remains visible`, insert this immediately after `const window = await app.firstWindow();` so the real workspace cascade is deterministic rather than dependent on the owner's OS setting:

```typescript
  await window.emulateMedia({ colorScheme: "light" });
```

Replace the existing `Legacy task state is preserved.` visibility assertion with:

```typescript
  const legacyWarning = window.locator(".warning-banner");
  await expect(legacyWarning).toContainText("Legacy task state is preserved.");
  await expect.poll(() => legacyWarning.evaluate((element) => getComputedStyle(element).color))
    .toBe("rgb(247, 211, 168)");
```

This is a direct warning on the always-dark workspace, not a child of a warm `.card`. In explicit light mode it must still resolve to the approved work amber.

In `app/tests/projects.spec.ts`, inside `a failed open lets go: dismissible, and never follows across screens`, insert this immediately after `const win = await app.firstWindow();`:

```typescript
    await win.emulateMedia({ colorScheme: "light" });
```

In the same test, immediately after `await expect(dismiss).toBeVisible();`, insert this complete composed-surface check:

```typescript
    const appErrorContrast = await errorOverlay.locator(".error-card").evaluate((element) => {
      const style = getComputedStyle(element);
      const canvas = document.createElement("canvas");
      canvas.width = 1; canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("canvas context unavailable");
      const pixel = (fill: string): [number, number, number, number] => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = fill;
        context.fillRect(0, 0, 1, 1);
        const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
        return [red!, green!, blue!, alpha!];
      };
      const luminance = (rgb: [number, number, number]): number => rgb
        .map((channel) => channel / 255)
        .map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
        .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index]!, 0);
      const foreground = pixel(style.color);
      const background = pixel(style.backgroundColor);
      const foregroundLuminance = luminance([foreground[0], foreground[1], foreground[2]]);
      const backgroundLuminance = luminance([background[0], background[1], background[2]]);
      return {
        text: style.color,
        backgroundAlpha: background[3],
        ratio: (Math.max(foregroundLuminance, backgroundLuminance) + .05)
          / (Math.min(foregroundLuminance, backgroundLuminance) + .05),
      };
    });
    expect(appErrorContrast.text).toBe("rgb(74, 32, 28)");
    expect(appErrorContrast.backgroundAlpha).toBe(255);
    expect(appErrorContrast.ratio).toBeGreaterThanOrEqual(4.5);
```

The app error overlay is a sibling of `.shell-base` in `App.tsx`, so it cannot inherit workspace tokens. This test proves its own surface is opaque, carries the dark stopped ink in explicit light mode, and meets ordinary text contrast over the real computed background.

- [ ] **Step 2: Run test to verify it fails**

Run from `app/`: `npm.cmd run test:unit`

Expected: FAIL. `every approved pastel is on its own token` reports `--garden-cyan is not #a3ddd0`; `no superseded saturated value survives` reports the old rail teal first; the shared-alias, semantic-surface, distinct DONE/STOPPED/UNKNOWN role, cast-glow, lantern-surface, and workspace-atmosphere assertions fail too. The two token assertions inside `Gemini and the fallback worker stay saturated only as cast identities` pass already, while its renderer assertions fail on the old ambient fallback-amber wash. That split is deliberate.

From the reconstruction worktree root, acquire the app mutex and run the two new composed light-theme checks:

```powershell
$paletteRedToken = Join-Path ([System.IO.Path]::GetTempPath()) "cairn-app-token"
$paletteRedOwnsToken = $false
$paletteRedExit = $null
try {
  New-Item -ItemType Directory -Path $paletteRedToken -ErrorAction Stop | Out-Null
  $paletteRedOwnsToken = $true
  Push-Location app
  try {
    npm.cmd run test:smoke -- tests/away.spec.ts tests/projects.spec.ts --grep "legacy state is preserved|a failed open lets go"
    $paletteRedExit = $LASTEXITCODE
  } finally {
    Pop-Location
  }
} finally {
  if ($paletteRedOwnsToken -and (Test-Path -LiteralPath $paletteRedToken)) {
    Remove-Item -LiteralPath $paletteRedToken -Force
  }
}
if ($paletteRedExit -eq 0) { throw "expected the light-theme semantic surface checks to fail before implementation" }
if ($null -eq $paletteRedExit) { throw "the palette red test never ran" }
```

Expected: the warning's computed colour is not `rgb(247, 211, 168)`, and the app error's computed text is not `rgb(74, 32, 28)`; no unrelated assertion fails. If mutex acquisition fails, wait and never remove the existing token.

- [ ] **Step 3: Install the approved palette and lantern tokens**

In `app/src/renderer/tokens.css`, first replace `--card` and `--card-solid`, then replace the shared semantic and rail colour block from `--green` through `--neon-green`, and replace the later `--town-focus`, with these exact values. The global card keeps its existing 74%/88% opacity but uses the already-shipped warm cream in both themes, so welcome and overlay panels stop flashing white without becoming lantern-dark. The dark inks are copied from `lantern-v3.html`; the wash percentages come from its 14% hover, 13% status, and the measured 12% stop wash. `--rail-line` keeps its old 18% strength but changes to the approved work-in-transit hue:

```css
  --card: light-dark(rgb(255 250 240 / 74%), rgb(255 250 240 / 88%));
  --card-solid: #fffaf0;
  --green: #a3ddd0;
  --green-ink: #17302b;
  --green-deep: light-dark(var(--green-ink), var(--garden-cyan));
  --green-soft: color-mix(in srgb, var(--green) 14%, transparent);
  --done-text: light-dark(var(--green-ink), var(--pond-done));
  --amber: #f7d3a8;
  --amber-ink: #4a3520;
  --amber-deep: light-dark(var(--amber-ink), var(--pond-task));
  --amber-soft: color-mix(in srgb, var(--amber) 13%, transparent);
  --stop: #f2aaa4;
  --stopped-ink: #4a201c;
  --stopped-text: light-dark(var(--stopped-ink), var(--pond-stop));
  --stop-soft: color-mix(in srgb, var(--stop) 12%, transparent);
  --stone-a: light-dark(#d6d1c5, #545064);
  --stone-b: light-dark(#c4beb0, #45405a);
  --trail: light-dark(#a49c8c, #7a7494);
  --rail-bg: light-dark(#17232a, #28223f);
  --rail-panel: light-dark(#20343d, #322b4d);
  --rail-hover: light-dark(#29414a, #3b3459);
  --rail-avatar: light-dark(#2a3c43, #403860);
  --rail-line: color-mix(in srgb, var(--pond-task) 18%, transparent);
  --rail-heading: #f7efe6;
  --rail-ink: #e2d8ce;
  --rail-muted: #a89d9e;
  --neon: #a3ddd0;
  --neon-soft: color-mix(in srgb, var(--garden-cyan) 72%, var(--lantern-deep));
  --neon-warm: #f7d3a8;
  --neon-green: #c2ddb6;
```

```css
  --town-focus: #a3ddd0;
```

In `app/src/renderer/tokens.css`, replace lines 59-66 (the garden block's cyan) so it reads:

```css
  --garden-deep: #2c2842;
  --garden-ink: #35304f;
  /* Decision 9, rule 3 (owner, 2026-08-02): the muted pastels supersede the
     saturated set. Cairn's is #a3ddd0; its dim and glow are that colour, not
     a second choice. The rail's --neon alias above points here too: Decision 9
     says every interactive surface, so the same Cairn identity crosses rooms. */
  --garden-cyan: #a3ddd0;
  --garden-cyan-dim: rgb(163 221 208 / 35%);
  --garden-cyan-glow: rgb(163 221 208 / 9%);
```

Replace lines 74-78 (the pond's semantic colours; `--pond-line` and the ground colours are Task 3's) so that block reads:

```css
  --pond-line: rgb(112 227 211 / 17%);
  --pond-task: #f7d3a8;
  /* "The result is with Cairn" — Cairn's own approved colour, not an eighth.
     TownSquare.tsx already paints a returning ripple with it; now the ripple
     and the status text agree. */
  --pond-result: #a3ddd0;
  --pond-done: #c2ddb6;
  --pond-stop: #f2aaa4;
```

Replace lines 82-87 (the cast) with:

```css
  --face-kimi: #d5c0ec;
  --face-kimi-glow: rgb(213 192 236 / 9%);
  --face-codex: #f3c49a;
  --face-codex-glow: rgb(243 196 154 / 9%);
  --face-claude: #b8c9de;
  --face-claude-glow: rgb(184 201 222 / 9%);
  /* Not part of Decision 9: the owner approved four cast colours, and Gemini
     is not one of them. Left saturated deliberately rather than guessed at. */
  --face-gemini: #8ad8b0;
  --face-gemini-glow: rgb(138 216 176 / 9%);
```

Immediately before line 113 (`--mono: ...`), insert:

```css
  /* Lantern on Water (Decision 9). The panel's own warm paper and the water it
     rests on, transcribed from the approved lantern-v3 mockup, plus its two
     easing curves: --pop overshoots (New Horizons), --ease settles. */
  --lantern-deep: #161b2c;
  --lantern-mid: #212739;
  --lantern-plum: #2f2946;
  --lantern-paper: #332c3a;
  --lantern-paper-lit: #3d3444;
  --lantern-ink: #f6ece1;
  --lantern-soft: #c3b3a6;
  --pop: cubic-bezier(.34, 1.56, .64, 1);
  --ease: cubic-bezier(.22, .9, .3, 1);
```

In `app/src/renderer/app.css`, replace the complete `.workspace-shell` rule so the old lower `var(--garden-amber-glow)` wash becomes:

```css
.workspace-shell {
  /* This world is dark in BOTH themes. Direct semantic text therefore uses
     the approved pastels; each light-paper surface below restores dark ink. */
  --green-deep: var(--garden-cyan);
  --amber-deep: var(--pond-task);
  --done-text: var(--pond-done);
  --stopped-text: var(--pond-stop);
  position: fixed; inset: 0; display: grid; grid-template-columns: 248px minmax(0, 1fr);
  overflow: hidden;
  /* One sky: fallback-worker amber belongs to the fallback face, not the
     atmosphere shared by every project screen. */
  background:
    var(--garden-stars),
    radial-gradient(900px 520px at 50% -18%, var(--garden-cyan-glow), transparent 62%),
    radial-gradient(1000px 560px at 55% 115%, color-mix(in srgb, var(--pond-task) 8%, transparent), transparent 60%),
    linear-gradient(160deg, var(--garden-ink), var(--garden-deep));
}
```

The hue is the approved work-in-transit pastel. The 8% blend preserves the strength of the exact `--garden-amber-glow` rule being replaced; no new alpha or role is invented. `--garden-amber` and `--garden-amber-glow` remain available only through the fallback face entry in `faces.ts`.

The app-level error overlay is a sibling of `.shell-base` in `App.tsx`, so it cannot inherit `.workspace-shell` even while Workspace is visible. Replace the complete `.app-error-overlay .error-card` rule with an opaque light-paper surface whose 12% coral wash and dark stopped ink work over every screen:

```css
.app-error-overlay .error-card {
  --stopped-text: var(--stopped-ink);
  margin: 0;
  background: color-mix(in srgb, var(--pond-stop) 12%, var(--card-solid));
  color: var(--stopped-text);
  box-shadow: 0 6px 24px rgba(0, 0, 0, .18);
}
```

Both inputs to the mix are opaque, so content beneath the overlay can never lower its contrast. The coral ratio is the already-approved stopped wash; this introduces no new hue or alpha.

The root semantic text aliases above adapt to the page's light/dark ground. Shared cards are light paper in both themes, so replace the complete `.card` rule with:

```css
.card {
  --green-deep: var(--green-ink);
  --amber-deep: var(--amber-ink);
  --done-text: var(--green-ink);
  --stopped-text: var(--stopped-ink);
  margin: 0 0 12px; padding: 16px 20px; border-radius: var(--r);
  background: var(--card); color: var(--card-ink);
}
```

Replace the complete `.overlay-card` rule with:

```css
.overlay-card {
  --green-deep: var(--green-ink);
  --amber-deep: var(--amber-ink);
  --done-text: var(--green-ink);
  --stopped-text: var(--stopped-ink);
  position: relative; z-index: 1; width: min(680px, 100%); height: fit-content;
  padding: 6px 8px 14px; border-radius: var(--r);
  background: var(--card-solid); color: var(--card-ink);
  box-shadow: 0 24px 70px rgb(0 0 0 / 32%);
}
```

The base conversation is also light paper until Task 4 builds the dark lantern. Replace the complete `.chat-column` rule with:

```css
.chat-column {
  --green-deep: var(--green-ink);
  --amber-deep: var(--amber-ink);
  --done-text: var(--green-ink);
  --stopped-text: var(--stopped-ink);
  position: relative; z-index: 1; display: flex; flex-direction: column;
  width: min(720px, calc(100% - 32px)); height: min(86vh, 760px);
  margin: 6vh auto 0; background: var(--card-solid); border-radius: var(--r);
  padding: 16px 18px 14px; box-shadow: 0 20px 60px rgba(0, 0, 0, .18); overflow: hidden;
  color: var(--card-ink);
}
```

The activity feed is also its own light-paper surface when TaskRun reaches its result phase; it is not always nested in `.card`. Replace the complete `.feed` rule with:

```css
.feed {
  --green-deep: var(--green-ink);
  --amber-deep: var(--amber-ink);
  --done-text: var(--green-ink);
  --stopped-text: var(--stopped-ink);
  background: var(--card); border-radius: var(--r-sm); padding: 10px 14px;
  font-family: var(--mono); font-size: .8rem; color: var(--card-muted);
  max-height: 220px; overflow-y: auto;
}
```

This is surface policy, not a new hue: dark semantic inks stay on shared light paper, while the root aliases remain pastel over a dark page. Task 4 explicitly re-points all four aliases again inside the permanently dark lantern, including its nested `.card`. Task 5 replaces `.feed` to remove machine type and must preserve these four declarations.

In `app/src/renderer/app.css`, replace the complete DONE/STOPPED/UNKNOWN badge rules, every coral text consumer, the two activity result rules, and the healthy checkup mark with:

```css
.pill-danger { background: var(--stop-soft); color: var(--stopped-text); }
.badge-done {
  background: color-mix(in srgb, var(--pond-done) 14%, transparent);
  color: var(--done-text);
}
.badge-stopped {
  background: color-mix(in srgb, var(--pond-stop) 12%, transparent);
  color: var(--stopped-text);
}
.badge-unknown {
  background: color-mix(in srgb, var(--pond-task) 13%, transparent);
  color: var(--amber-deep);
}
.activity-done strong { color: var(--done-text); }
.activity-stopped strong { color: var(--stopped-text); }
.error-card { background: var(--stop-soft); border-radius: var(--r-sm); padding: 12px 16px; color: var(--stopped-text); margin: 0 0 12px; }
.bubble-system { align-self: center; background: var(--stop-soft); color: var(--stopped-text); text-align: center; }
.result-card-done { background: color-mix(in srgb, var(--pond-done) 14%, transparent); color: var(--done-text); }
.result-card-stopped { background: color-mix(in srgb, var(--pond-stop) 12%, transparent); color: var(--stopped-text); }
.result-card-error { background: var(--stop-soft); color: var(--stopped-text); }
.result-card-recovery { color: var(--stopped-text); }
.dispatch-error { background: var(--stop-soft); border-radius: var(--r-sm); padding: 10px 14px; color: var(--stopped-text); margin: 8px 0 0; }
.checkup-cell-done { background: var(--pond-done); }
.checkup-mark-healthy { background: var(--pond-done); }
```

The blend strengths are the exact semantic washes already established in this task: 14% success, 12% stop, and 13% attention. The roles now come from the owner-approved moss, coral, and work amber instead of inheriting Cairn's identity mint. Decorative borders and checkup marks may still use the solid `--stop` pastel; owner-facing text must use `--stopped-text`, which resolves to dark coral on light paper and the approved pastel on dark ground. Task 4 later gives embedded disposition chips their stronger lantern-specific treatment, and Task 6's complete `.pill-danger` replacement preserves this surface-aware text token.

In `app/src/renderer/components/Ui.tsx`, replace the complete `Badge` function with:

```tsx
export function Badge({ kind }: { kind: "DONE" | "STOPPED" | "UNKNOWN" }) {
  if (kind === "DONE") return <span className="badge badge-done">done</span>;
  if (kind === "STOPPED") return <span className="badge badge-stopped">stopped</span>;
  return <span className="badge badge-unknown">unclear</span>;
}
```

UNKNOWN is not STOPPED: it keeps the amber attention role instead of borrowing the coral terminal role.

In `app/src/renderer/components/Scene.tsx`, replace the completed trail endpoint with:

```tsx
      <circle cx="352" cy="96" r="2.5" fill="var(--pond-done)" />
```

Then replace the mapped stone's complete `fill` prop with:

```tsx
            fill={top ? "var(--pond-done)" : i % 2 ? "var(--stone-a)" : "var(--stone-b)"}
```

Both marks exist only for completed milestone-claim rows, so they use the approved done moss. Cairn mint remains Cairn's identity and the primary-action/focus hue.

- [ ] **Step 4: Retarget the existing cast-token unit pin**

In `app/tests-unit/faces.test.ts`, replace lines 70-75 (the end of the last test) with:

```typescript
  // Decision 9, rule 3: the cast keeps its identity tokens; the values inside
  // them moved to the owner's pastel set on 2026-08-02.
  const tokensCss = readFileSync(join(__dirname, "..", "..", "src", "renderer", "tokens.css"), "utf8");
  assert.match(tokensCss, /--garden-cyan:\s*#a3ddd0;/);
  assert.match(tokensCss, /--face-kimi:\s*#d5c0ec;/);
  assert.match(tokensCss, /--face-codex:\s*#f3c49a;/);
  assert.match(tokensCss, /--face-claude:\s*#b8c9de;/);
});
```

- [ ] **Step 5: Retarget every real-browser computed-colour pin**

In `app/tests/conductor.spec.ts`, replace the dispatch-flight and dispatch-landing colour assertions with this complete block. These are the exact `rgb()` forms Chromium reports for the approved hexes:

```typescript
  await expect.poll(async () => (await townMotionProbe(win)).some((entry) =>
    entry.motion === "dispatch-flight" && entry.receiver === "codex"
      && entry.packetText === "TASK" && entry.packet && !entry.ripple
      && entry.cairnStroke === "rgb(163, 221, 208)"
      && entry.workerStroke === "rgb(243, 196, 154)"), { timeout: 10_000 }).toBe(true);
  await expect.poll(async () => (await townMotionProbe(win)).some((entry) =>
    entry.motion === "dispatch-landing" && entry.receiver === "codex"
      && entry.rippleColor === "rgb(243, 196, 154)"
      && entry.rippleReceiverDistance !== null && entry.rippleReceiverDistance < 70
      && entry.workerStroke === "rgb(243, 196, 154)"
      && !entry.packet && entry.ripple), { timeout: 10_000 }).toBe(true);
```

Replace the STOPPED landing and Cairn-stroke assertions with:

```typescript
  await expect.poll(async () => (await townMotionProbe(win)).some((entry) =>
    entry.motion === "stopped-landing" && entry.outcome === "stopped"
      && entry.rippleColor === "rgb(242, 170, 164)"
      && entry.cairnStroke === "rgb(163, 221, 208)"
      && entry.terminalRipple && entry.cairnFace === "thinking" && !entry.doneFace),
  { timeout: 15_000 }).toBe(true);
  const stoppedEntries = await townMotionProbe(win);
  const stoppedCues = uniqueTownCues(stoppedEntries).filter((cue) => cue.kind === "stopped");
  expect(stoppedCues).toHaveLength(1);
  expect(motionsForCue(stoppedEntries, stoppedCues[0]!.key)).toEqual(["stopped-landing"]);
  await expect(town).toHaveAttribute("data-town-motion", "none", { timeout: 10_000 });
  await expect(town).toHaveAttribute("data-town-truth", "stopped");
  await expect(town).toHaveAttribute("data-town-outcome", "stopped");
  expect(stoppedEntries.some((entry) => entry.motion === "done-landing"
    || entry.outcome === "done" || /DONE/.test(entry.status))).toBe(false);
  await expect(town.locator(".town-node-cairn")).toHaveAttribute("data-face-state", "thinking");
  await expect(town.locator(".town-node-done")).toHaveCount(0);
  await expect.poll(() => town.locator(".town-face-cairn .town-face-svg path").first()
    .evaluate((element) => getComputedStyle(element).stroke)).toBe("rgb(163, 221, 208)");
```

Replace the DONE return, terminal landing, and final Cairn-stroke assertions with:

```typescript
  await expect.poll(async () => (await townMotionProbe(win)).some((entry) =>
    entry.motion === "return-flight" && entry.receiver === "cairn"
      && entry.packetText === "RESULT" && entry.packet && !entry.ripple
      && entry.cairnStroke === "rgb(163, 221, 208)"), { timeout: 15_000 }).toBe(true);
  await expect.poll(async () => (await townMotionProbe(win)).some((entry) =>
    entry.motion === "return-landing" && entry.receiver === "cairn"
      && entry.rippleColor === "rgb(163, 221, 208)"
      && entry.rippleReceiverDistance !== null && entry.rippleReceiverDistance < 70
      && !entry.packet && entry.ripple), { timeout: 15_000 }).toBe(true);
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card.locator(".result-card-disposition")).toHaveText("DONE");
  await expect.poll(async () => (await townMotionProbe(win)).some((entry) =>
    entry.motion === "done-landing" && entry.outcome === "done"
      && entry.rippleColor === "rgb(194, 221, 182)"
      && entry.cairnStroke === "rgb(163, 221, 208)"
      && entry.terminalRipple && (entry.cairnFace === "done" || entry.cairnFace === "thinking")),
  { timeout: 15_000 }).toBe(true);
```

Later in the same DONE test, keep this full computed-style pin:

```typescript
  await expect(town).toHaveAttribute("data-town-truth", "done");
  await expect(town).toHaveAttribute("data-town-outcome", "done");
  await expect(town.locator(".town-node-cairn.town-node-done")).toHaveCount(1);
  await expect(town.locator(".town-square-header [role=status]")).toContainText("DONE");
  await expect.poll(() => town.locator(".town-face-cairn .town-face-svg path").first()
    .evaluate((element) => getComputedStyle(element).stroke)).toBe("rgb(163, 221, 208)");
```

- [ ] **Step 6: Run tests to verify they pass**

Run from `app/`: `npm.cmd run test:unit` — Expected: PASS, all tests.

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0.

Run from `app/`: `npm.cmd run build:vite` — Expected: builds clean.

From the reconstruction worktree root, prove the two composed light-theme surfaces now pass under the app mutex:

```powershell
$paletteGreenToken = Join-Path ([System.IO.Path]::GetTempPath()) "cairn-app-token"
$paletteGreenOwnsToken = $false
$paletteGreenExit = $null
try {
  New-Item -ItemType Directory -Path $paletteGreenToken -ErrorAction Stop | Out-Null
  $paletteGreenOwnsToken = $true
  Push-Location app
  try {
    npm.cmd run test:smoke -- tests/away.spec.ts tests/projects.spec.ts --grep "legacy state is preserved|a failed open lets go"
    $paletteGreenExit = $LASTEXITCODE
  } finally {
    Pop-Location
  }
} finally {
  if ($paletteGreenOwnsToken -and (Test-Path -LiteralPath $paletteGreenToken)) {
    Remove-Item -LiteralPath $paletteGreenToken -Force
  }
}
if ($paletteGreenExit -ne 0) { throw "palette light-theme browser checks failed with exit code $paletteGreenExit" }
```

Expected: both focused scenarios pass. The direct workspace warning is work amber in explicit light mode, and the sibling app-level error is opaque with at least 4.5:1 computed contrast. If mutex acquisition fails, wait and never remove the existing token.

Confirm no stale pin survived:

```powershell
rg -n 'rgb\(127, 216, 200\)|rgb\(242, 163, 92\)|rgb\(169, 211, 155\)|rgb\(255, 129, 120\)' tests/conductor.spec.ts
```

Expected: no output and ripgrep exit code 1. Any exit code above 1 is a command error.

- [ ] **Step 7: Commit**

```powershell
git add app/src/renderer/tokens.css app/src/renderer/app.css app/src/renderer/components/Ui.tsx app/src/renderer/components/Scene.tsx app/tests-unit/palette.test.ts app/tests-unit/faces.test.ts app/tests/conductor.spec.ts app/tests/away.spec.ts app/tests/projects.spec.ts
git commit -m "The cast and the pond wear the owner's pastel palette"
```

---

### Task 3: Still water — the pond stops rippling for nothing

**Files:**
- Modify: `app/src/renderer/components/TownSquare.tsx:372-376`
- Modify: `app/src/renderer/app.css:460-467` (`.town-square`), `:490-493` (`.town-skyglow`), `:495-518` (pond layer, contours, outcomes)
- Modify: `app/src/renderer/tokens.css` (delete the dead ground tokens)
- Modify: `app/src/renderer/motion.css:78-82`
- Modify: `app/tests/conductor.spec.ts` (quiet composed-water guard across a real Workspace poll)
- Test: `app/tests-unit/stillwater.test.ts` (create), `app/tests-unit/townpresentation.test.ts` (append)

**Interfaces:**
- Consumes: `--lantern-deep`, `--lantern-mid`, `--lantern-plum` from Task 2; the pastel `--pond-done` / `--pond-stop`.
- Produces: nothing later tasks import. The `.town-skyglow` element keeps its class name and becomes the sheen.

The shipped pond draws three permanent contour rings inside a bordered blob (`TownSquare.tsx:373-375`, `app.css:504-510`). Nothing animates them, and that is the problem: they are ripples that never happened, drawn forever. Decision 9 rule 4 says at rest the pond is one continuous blend.

The outcome tint moves with them. A settled DONE currently draws a coloured *rim*; still water has no rim, so it colours the water instead.

- [ ] **Step 1: Write the failing test**

Create `app/tests-unit/stillwater.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");

/**
 * Decision 9, rule 4: "At rest the pond is one continuous blend — no rings, no
 * drawn contours, no perpetual animation." Task 168's brief already required
 * that motion be information and never perpetual decoration; its pond drew
 * three permanent contour rings anyway. These tests hold the rule where the
 * rings actually lived, so it cannot quietly come back.
 */
test("no drawn contour ring survives anywhere in the renderer", () => {
  for (const file of [["app.css"], ["components", "TownSquare.tsx"], ["motion.css"]]) {
    const source = renderer(...file);
    assert.ok(
      !source.includes("town-pond-contour"),
      `${file.join("/")} still draws a pond contour ring`,
    );
  }
});

test("the pond has no rim to draw", () => {
  // --pond-line was the contour and border colour. With still water there is
  // nothing for it to outline, so its absence is the rule made structural.
  assert.ok(!renderer("tokens.css").includes("--pond-line"), "--pond-line is still defined");
  assert.ok(!renderer("app.css").includes("--pond-line"), "--pond-line is still used");
});

test("resting water carries no perpetual animation", () => {
  for (const file of ["app.css", "motion.css"]) {
    const source = renderer(file).replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(!source.includes("town-sky-breathe"), `${file} still pulses the resting water`);
    assert.ok(!source.includes("town-sheen-drift"), `${file} still drifts the resting water`);
    for (const rule of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/\.(?:town-square(?![-\w])|town-skyglow(?![-\w])|town-pond-layer(?![-\w]))/.test(rule[1]!)) continue;
      const animations = [...rule[2]!.matchAll(/\banimation(?:-name)?\s*:\s*([^;}]+)/g)]
        .map((match) => match[1]!.trim())
        .filter((value) => value !== "none");
      assert.deepEqual(animations, [], `${file} animates resting water in ${rule[1]!.trim()}`);
    }
  }
});

test("a settled outcome colours the water instead of ringing it", () => {
  const css = renderer("app.css");
  const layer = css.slice(css.indexOf(".town-pond-layer {"), css.indexOf(".town-threads"));
  assert.ok(!/\bborder:/.test(layer), "the pond layer still draws a border");
  assert.ok(!/border-radius/.test(layer), "the pond layer still draws a blob edge");
  assert.ok(layer.includes("var(--pond-done)"), "DONE no longer tints the water");
  assert.ok(layer.includes("var(--pond-stop)"), "STOPPED no longer tints the water");
});
```

Append to `app/tests-unit/townpresentation.test.ts`:

```typescript
test("still water: a quiet pond makes no ripple, however often it is polled", () => {
  let state = hydrateTownPresentation(null, null);
  for (let poll = 0; poll < 12; poll += 1) {
    state = observeTownPresentation(state, null, null, true);
    assert.equal(state.activeCue, null, `poll ${poll} made a ripple out of nothing`);
    assert.deepEqual(state.queuedCues, [], `poll ${poll} queued a ripple out of nothing`);
  }
});

test("still water: a spent ripple is never replayed by a later poll", () => {
  const closed = session({
    activities: [routeDone, runWorking, runDone, checkWorking, checkDone, resultDone],
    phase: "closed",
    result: { status: "done", disposition: "DONE" } as RunSessionSnapshot["result"],
  });
  // One observation of a finished run earns two landings: the result returning
  // to Cairn, then DONE. The obsolete dispatch is dropped — a handoff that is
  // already over is not news. (`a collapsed snapshot omits an obsolete dispatch
  // but keeps return then DONE`, above, pins that ordering.)
  let state = observeTownPresentation(hydrateTownPresentation(null, null), closed, null, true);
  assert.equal(state.activeCue?.kind, "return");

  // Drain every earned ripple, then the water must be still.
  const spent: string[] = [];
  for (let step = 0; state.activeCue && step < 10; step += 1) {
    const key = state.activeCue.key;
    if (!spent.includes(key)) spent.push(key);
    state = advanceTownCue(state, key);
  }
  assert.equal(state.activeCue, null, "the water never went still");
  assert.deepEqual(spent.map((key) => key.split(":").at(-1)), ["return", "done"]);

  // Every later poll of the same snapshot leaves it still.
  for (let poll = 0; poll < 12; poll += 1) {
    state = observeTownPresentation(state, closed, null, true);
    assert.equal(state.activeCue, null, `poll ${poll} replayed a spent ripple`);
    assert.deepEqual(state.queuedCues, [], `poll ${poll} queued a spent ripple`);
  }
  assert.equal(state.settledOutcome, "done");
});
```

In `app/tests/conductor.spec.ts`, inside `a dispatched run lives in the conversation`, replace the setup from `const town = ...` through the `dispatchOneRealCall` callback with the following. This is the composed-renderer proof the source tests cannot provide: it watches a visible quiet pond across the Workspace's real two-second poll before dispatching anything.

```typescript
  await win.setViewportSize({ width: 1320, height: 820 });
  const town = win.getByRole("region", { name: "Conductor town square" });
  await expect(town.getByRole("button", { name: "Cairn, ready" })).toBeVisible();
  await expect(town.locator(".town-face-cairn")).toHaveCount(1);
  await expect(town.locator(".town-node-worker")).toHaveCount(0);
  await expect(town.locator(".town-thread-target")).toHaveCount(0);

  // Still water is a visible invariant, not only a reducer invariant. Arm the
  // real DOM probe while quiet and cross Workspace's two-second refresh. No
  // permanent contour, packet, or earned-event ripple may appear before an
  // event has actually landed.
  await installTownMotionProbe(win);
  await win.waitForTimeout(2_200);
  await expect(town.locator(
    ".town-pond-contour, .town-transfer-packet, .town-transfer-ripple, .town-terminal-ripple",
  )).toHaveCount(0);
  const quietEntries = await townMotionProbe(win);
  expect(quietEntries.every((entry) =>
    entry.motion === "none" && !entry.packet && !entry.ripple && !entry.terminalRipple,
  )).toBe(true);
  const quietSheen = town.locator(".town-skyglow");
  await expect.poll(async () => quietSheen.evaluate((element) => ({
    animationName: getComputedStyle(element).animationName,
    activeAnimations: element.getAnimations().filter((animation) => animation.playState !== "finished").length,
  }))).toEqual({ animationName: "none", activeAnimations: 0 });

  await town.getByRole("button", { name: "Cairn, ready" }).click({ noWaitAfter: true });
  await expect(win.getByPlaceholder("Talk with Cairn")).toBeFocused();
  await dispatchOneRealCall(win, async () => {
    await expect(town.locator(".town-node-worker")).toHaveCount(0);
    await expect(town.locator(".town-transfer-layer")).toHaveCount(0);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run from `app/`: `npm.cmd run test:unit`

Expected: FAIL. `no drawn contour ring survives anywhere in the renderer` reports `app.css still draws a pond contour ring`; `the pond has no rim to draw`, `resting water carries no perpetual animation`, and `a settled outcome colours the water instead of ringing it` all fail. The two `still water:` reducer tests **pass already** — the reducer was always right; it is the drawing that was not. Keeping them is deliberate: they are the guard that the fix below stays a presentation fix.

- [ ] **Step 3: Write minimal implementation**

In `app/src/renderer/components/TownSquare.tsx`, replace lines 372-376 with:

```tsx
        {/* Still water (Decision 9, rule 4). Three drawn contour rings used to
            live here — ripples that never happened, drawn forever. At rest the
            pond is now one continuous blend, and this layer carries only the
            colour a settled outcome washes over it. A real ripple exists only
            inside the keyed cue below. */}
        <div className={`town-pond-layer town-pond-${presentation.settledOutcome ?? "quiet"}`} aria-hidden="true" />
```

In `app/src/renderer/app.css`, replace lines 460-467 (`.town-square`) with:

```css
.town-square {
  position: relative; height: 100%; min-height: 360px; overflow: hidden;
  color: var(--lantern-ink);
  /* One continuous blend, from the approved lantern-v3 frame: three soft
     ellipses over a single diagonal. Nothing here has an edge that could read
     as a drawn ring. */
  background:
    radial-gradient(ellipse 90% 70% at 30% 68%, #2b3350, transparent 70%),
    radial-gradient(ellipse 70% 55% at 74% 14%, #352c4e, transparent 72%),
    radial-gradient(ellipse 60% 45% at 50% 100%, #1d2438, transparent 70%),
    linear-gradient(165deg, var(--lantern-plum), var(--lantern-mid) 45%, var(--lantern-deep));
}
```

Replace lines 490-493 (`.town-skyglow`) with:

```css
/* The static sheen: two soft pastel blooms from the approved lantern-v3 frame,
   blurred well past any edge. Decision 9's settled rule is stronger than the
   exploratory mockup's breathing animation: resting water never moves. */
.town-skyglow {
  position: absolute; inset: 0; pointer-events: none; filter: blur(46px); opacity: .5;
  background:
    radial-gradient(ellipse 30% 20% at 32% 62%, rgb(163 221 208 / 13%), transparent 70%),
    radial-gradient(ellipse 22% 15% at 62% 40%, rgb(213 192 236 / 10%), transparent 72%);
}
```

Replace lines 495-518 (the pond layer, the three contour rules, and the two outcome rules) with:

```css
/* The outcome wash. Still water has no rim, so a settled DONE or STOPPED
   colours the water itself rather than drawing a ring around it. Quiet water
   carries no wash at all. */
.town-pond-layer {
  position: absolute; z-index: 0; inset: 0; pointer-events: none;
  opacity: 0; transition: opacity 300ms ease, background 300ms ease;
}
.town-pond-done {
  opacity: 1;
  background: radial-gradient(ellipse 62% 48% at 44% 56%,
    color-mix(in srgb, var(--pond-done) 13%, transparent), transparent 72%);
}
.town-pond-stopped, .town-pond-error {
  opacity: 1;
  background: radial-gradient(ellipse 62% 48% at 44% 56%,
    color-mix(in srgb, var(--pond-stop) 13%, transparent), transparent 72%);
}
```

In `app/src/renderer/tokens.css`, replace the pond block's now-dead ground colours. The block currently reads `--pond-deep`, `--pond-mid`, `--pond-plum`, `--pond-water`, `--pond-line`, then the four semantic colours. `.town-square` no longer names the first three, `--pond-water` never had a use, and `--pond-line` was the contour colour. Delete all five, leaving:

```css
  /* Task 168, re-toned by Decision 9: the pond's semantic colours. Identity
     stays on the faces above; these say what happened, not who did it. The
     ground colours that used to sit here are gone — still water is one blend,
     drawn by .town-square from the --lantern-* set. */
  --pond-task: #f7d3a8;
  --pond-result: #a3ddd0;
  --pond-done: #c2ddb6;
  --pond-stop: #f2aaa4;
```

In `app/src/renderer/motion.css`, replace the entire “Calmer idle life” block — from its comment through the closing `town-sky-breathe` keyframe — with:

```css
/* Calmer idle life: the cast's existing bob slows and shallows. The pond's
   sheen is deliberately absent from motion.css: at rest the water is still,
   and motion remains evidence of a real landed event. */
.town-face-holo { animation: town-face-float 7.5s ease-in-out infinite; }
@keyframes town-face-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
```

Keep `.town-skyglow` in `motion.css`'s existing reduced-motion selector list even though it is now static; removing it buys nothing and would make a future accidental animation easier to miss. `.town-pond-layer` remains under `transition: none` because the settled outcome wash still changes opacity.

- [ ] **Step 4: Run tests to verify they pass**

Run from `app/`: `npm.cmd run test:unit` — Expected: PASS, all tests.

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0.

Run from `app/`: `npm.cmd run build:vite` — Expected: builds clean.

Confirm no retired declaration, `var()` use, or contour element survives in runtime code. The guard test necessarily quotes the strings it forbids, and explanatory comments may name history, so this sweep deliberately targets runtime uses rather than raw words:

```powershell
rg -n -- '(var\(--pond-(deep|mid|plum|water|line)\)|--pond-(deep|mid|plum|water|line)\s*:|town-pond-contour)' src/renderer lab
```

Expected: no output and ripgrep exit code 1. Exit code greater than 1 is a command error.

- [ ] **Step 5: Commit**

```powershell
git add app/src/renderer/components/TownSquare.tsx app/src/renderer/app.css app/src/renderer/tokens.css app/src/renderer/motion.css app/tests-unit/stillwater.test.ts app/tests-unit/townpresentation.test.ts app/tests/conductor.spec.ts
git commit -m "Still water: the pond ripples only for events that happened"
```

---

### Task 4: The lantern

**Files:**
- Modify: `app/src/renderer/screens/Chat.tsx:7-13,1027-1041` (render the approved lantern identity header directly from `TOWN_FACES.cairn`)
- Modify: `app/src/renderer/app.css:386-405` (the villager column and its tail), and a new block after `:458`
- Modify: `app/src/renderer/app.css:451-458` (keep the one-shot `villager-rise`; retire the tucked control's infinite `villager-bob`)
- Modify: `app/tests/conductor.spec.ts` (remove the stale bob-dependent forced clicks from the tucked-control scenario)
- Test: `app/tests-unit/lantern.test.ts` (create)

**Interfaces:**
- Consumes: `--lantern-paper`, `--lantern-paper-lit`, `--lantern-ink`, `--lantern-soft`, `--pond-done`, `--pond-task`, `--pond-stop` from Task 2.
- Consumes: `TOWN_FACES.cairn`; the same `faces.ts` geometry data used by the pond cast.
- Produces: the `.chat-column-villager` scope re-points `--card`, `--card-solid`, `--card-ink`, `--card-muted`, `--line`, and all four surface-aware semantic text aliases; its nested `.card` and `.feed` overrides keep those aliases on dark paper. Task 6's lantern button rules and Task 8's narrow rules rely on it.

The conversation is currently a large bright white rectangle occupying about a third of the screen and fighting the whole scene. It becomes a warm lit lantern resting on the dark water: light spills out of it onto the pond instead of covering the pond.

The load-bearing mechanic is the token re-point. `.chat-column` and its several dozen descendants are written against the app's paired tokens; redefining those five tokens on the lantern element re-tones every card, rule, and muted line inside it through the cascade. Only the surfaces that carry their own colour in the approved mockup are named explicitly below.

**The lantern gets its approved identity header without removing real controls.** In embedded mode, a second Cairn face shown in `lantern-v3.html` appears above the unchanged topbar, followed by the exact `Cairn` / `Conductor project` title. The real tuck control is positioned into that header visually; `Project home` and the connected conductor's provider/model disclosure remain in the DOM and keep their behaviour. The header maps the ready strokes from `TOWN_FACES.cairn`; it does not transcribe even one path or create a second state arbiter.

**The tail goes.** `.chat-column-villager::before` draws a cream pointer at Cairn. The approved lantern has none, and a cream tail against warm plum paper reads as a seam rather than an anchor.

- [ ] **Step 1: Write the failing test**

Create `app/tests-unit/lantern.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(__dirname, "..", "..", "src", "renderer", "app.css"), "utf8");
const chat = readFileSync(join(__dirname, "..", "..", "src", "renderer", "screens", "Chat.tsx"), "utf8");

/** The `.chat-column.chat-column-villager` rule body. */
function lanternRule(): string {
  const start = css.indexOf(".chat-column.chat-column-villager {");
  assert.notEqual(start, -1, "the villager column rule is gone");
  return css.slice(start, css.indexOf("}", start));
}

function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
}

/**
 * app.css's `prefers-reduced-motion` block, brace-balanced.
 *
 * Slicing to end-of-file instead would be worse than useless here: the ≤620px
 * block further down carries `.chat-column.chat-column-villager`, whose text
 * contains `.chat-column-villager`, so a regression that dropped this element
 * from the real reduced-motion rule would still find the substring and pass.
 */
function reducedMotionBlock(): string {
  const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
  assert.notEqual(start, -1, "app.css has no reduced-motion block");
  let depth = 0;
  for (let index = css.indexOf("{", start); index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    else if (css[index] === "}" && --depth === 0) return css.slice(start, index + 1);
  }
  return assert.fail("app.css's reduced-motion block never closes");
}

/**
 * Decision 9: "Lantern on Water". The conversation is a warm, softly lit
 * lantern resting on dark water — light spills from it onto the pond instead
 * of covering the pond. It replaces a large bright white rectangle that
 * occupied roughly a third of the screen and fought the whole scene.
 */
test("the panel is warm lit paper, not a bright rectangle", () => {
  const rule = lanternRule();
  assert.ok(rule.includes("var(--lantern-paper-lit)"), "the lantern is not lit paper");
  assert.ok(rule.includes("var(--lantern-paper)"), "the lantern has no paper body");
  assert.ok(!rule.includes("var(--card-solid);"), "the lantern is still the app's flat card fill");
});

test("the embedded lantern header renders the approved second Cairn face", () => {
  assert.match(chat, /import \{ TOWN_FACES \} from "\.\.\/town\/faces";/);
  assert.ok(chat.includes("const cairn = TOWN_FACES.cairn;"));
  assert.ok(chat.includes("const strokes = [...cairn.mark, ...cairn.states.ready];"));
  assert.ok(chat.includes("{embedded ? <LanternCairnHeader /> : null}"));
  assert.match(chat, /<strong className="lantern-header-title">Cairn<\/strong>/);
  assert.match(chat, /<span className="lantern-header-subtitle">Conductor project<\/span>/);
  assert.ok(!chat.includes('d="M 36 35 L 36 48"'),
    "Chat.tsx copied Cairn's path instead of using faces.ts");
});

test("the lantern identity uses the approved header geometry", () => {
  const identity = rule(".chat-column-villager .lantern-header");
  const face = rule(".chat-column-villager .lantern-header-face");
  assert.ok(identity.includes("gap: 11px"), "the identity spacing drifted from lantern-v3");
  assert.ok(face.includes("width: 36px") && face.includes("height: 36px"),
    "the header Cairn is not the approved 36px size");
  assert.ok(face.includes("rgb(163 221 208 / 24%)"),
    "the header Cairn lost the mockup's pastel halo");
  assert.ok(rule(".chat-column-villager .lantern-header-title").includes("font-size: 14.5px"));
  assert.ok(rule(".chat-column-villager .lantern-header-subtitle").includes("font-size: 11px"));
  assert.ok(rule(".chat-column-villager .chat-tuck").includes("position: absolute"),
    "the real tuck button is not placed in the approved header");
});

test("light spills out of the lantern onto the water", () => {
  // Three shadows from the approved mockup: a hairline halo, a wide warm
  // spill, and the drop that lifts it off the pond. Two would be a border.
  const rule = lanternRule();
  const shadow = rule.slice(rule.indexOf("box-shadow:"), rule.indexOf(";", rule.indexOf("box-shadow:")));
  assert.equal(shadow.match(/rgb\(/g)?.length, 3, "the lantern does not spill light onto the water");
  assert.ok(shadow.includes("247 211 168"), "the spill is not the mockup's lantern gold");
});

test("the lantern re-points the paired tokens instead of rewriting its children", () => {
  const rule = lanternRule();
  for (const token of ["--card:", "--card-solid:", "--card-ink:", "--card-muted:", "--line:"]) {
    assert.ok(rule.includes(token), `${token} is not re-pointed inside the lantern`);
  }
  assert.ok(rule.includes("--card-ink: var(--lantern-ink)"), "the lantern's ink is not lantern ink");
});

test("the lantern has no tail", () => {
  // The narrow baseline keeps a harmless `display: none` reset for the old
  // pseudo-element. What must disappear is every rule that can draw a tail.
  const tailBodies = [...css.matchAll(/\.chat-column-villager::before\s*\{([^}]*)\}/g)]
    .map((match) => match[1]!);
  assert.ok(tailBodies.every((body) => !body.includes("content:") && !body.includes("border")),
    "the villager tail is still drawn; the approved lantern floats free");
});

test("the lantern lands, and then holds still", () => {
  // The approved mockup swayed the whole lantern on an 8s infinite loop. It is
  // deliberately NOT shipped: the mockup swayed a picture, while this panel
  // holds the composer, run controls, and every card. An infinite transform
  // makes every control inside it a moving target.
  assert.ok(!css.includes("lantern-sway"),
    "the lantern sways again — every control inside it is now a moving target");
  const panel = lanternRule();
  assert.ok(panel.includes("villager-rise"), "the lantern no longer lands, it just appears");
  assert.ok(!/animation:[^;]*infinite/.test(panel),
    "the lantern carries an infinite animation, so its contents never settle");
  assert.match(panel, /animation:[^;]*villager-rise[^;]*backwards/,
    "the entrance does not release transform and opacity after it lands");
  assert.ok(!/animation:[^;]*(?:both|forwards)/.test(panel),
    "the entrance pins its final keyframe over the narrow pond-open transition");
  assert.ok(reducedMotionBlock().includes(".chat-column-villager"),
    "the entrance is not killed for reduced motion");
});

test("reduced motion WINS over the lantern entrance, rather than merely naming it", () => {
  // The entrance is declared on `.chat-column.chat-column-villager` at
  // specificity (0,2,0). A `.chat-column-villager` kill at (0,1,0) loses.
  // Anchor the plain compound selector inside the final reduced-motion block;
  // the still-more-specific pond-open selector cannot stand in for it.
  const reducedAt = css.lastIndexOf("@media (prefers-reduced-motion: reduce)");
  const block = css.slice(reducedAt);
  const match = block.match(/^\s*\.chat-column\.chat-column-villager\s*[,{]/m);
  assert.ok(match, "the final reduced-motion block lacks the lantern's own selector");
  const from = block.indexOf(match![0]);
  const winner = block.slice(from, block.indexOf("}", from));
  assert.ok(winner.includes("animation: none"),
    "the rule carrying the lantern's selector does not stop its animation");
  assert.ok(reducedAt > css.indexOf("animation: villager-rise"),
    "the entrance is declared after the final reduced-motion block, so it wins");
});

test("the permanently dark panel brings every semantic text token with it", () => {
  const panel = lanternRule();
  assert.ok(panel.includes("--green-deep: var(--garden-cyan)"),
    "positive semantic text becomes dark-on-dark in the lantern");
  assert.ok(panel.includes("--amber-deep: var(--pond-task)"),
    "warning semantic text becomes dark-on-dark in the lantern");
  assert.ok(panel.includes("--done-text: var(--pond-done)"),
    "DONE semantic text does not use the approved moss on dark paper");
  assert.ok(panel.includes("--stopped-text: var(--pond-stop)"),
    "STOPPED semantic text does not use the approved coral on dark paper");
  assert.ok(panel.includes("--stop: var(--pond-stop)"), "warning text still follows the light theme");
  assert.ok(panel.includes("--stop-soft: color-mix(in srgb, var(--pond-stop) 12%, transparent)"),
    "the warning wash is not the measured 4.83:1 version");
  for (const selector of [".chat-column-villager .card", ".chat-column-villager .feed"]) {
    const nestedSurface = rule(selector);
    assert.ok(nestedSurface.includes("--green-deep: var(--garden-cyan)"));
    assert.ok(nestedSurface.includes("--amber-deep: var(--pond-task)"));
    assert.ok(nestedSurface.includes("--done-text: var(--pond-done)"));
    assert.ok(nestedSurface.includes("--stopped-text: var(--pond-stop)"));
  }
});

test("the tucked chip and provider popover are opaque lantern surfaces", () => {
  const chip = rule(".chat-villager-chip");
  assert.ok(chip.includes("var(--lantern-paper-lit)"), "the tucked chip is still the global cream card");
  assert.ok(chip.includes("var(--lantern-ink)"), "the tucked chip does not carry lantern ink");
  assert.ok(!/animation:[^;]*infinite/.test(chip),
    "the tucked button never holds still long enough to take the New Horizons press");
  assert.ok(!css.includes("@keyframes villager-bob"),
    "the retired decorative bob can be reattached to an interactive control");
  const popover = rule(".chat-column-villager .body-pill-panel");
  assert.ok(popover.includes("background: var(--lantern-paper-lit)"),
    "the provider popover reads through to the conversation behind it");
});

test("needs-you amber follows the approved task pastel everywhere", () => {
  const dot = rule(".chat-villager-chip-dot");
  assert.ok(dot.includes("background: var(--pond-task)"),
    "the tucked needs-you dot still uses the old saturated amber");
  assert.ok(dot.includes("0 0 9px var(--pond-task)"),
    "the tucked dot's glow is not the same approved task pastel");
  const risk = rule(".chat-column-villager .task-chip-risk");
  assert.ok(risk.includes("var(--pond-task)"),
    "a waiting concern still leaks the old theme amber into the lantern");
});

test("each disposition chip wears its own approved colour", () => {
  const done = rule(".chat-column-villager .result-card-done");
  const stopped = rule(".chat-column-villager .result-card-stopped");
  const error = rule(".chat-column-villager .result-card-error");
  assert.ok(done.includes("background: var(--pond-done)"), "DONE is not the approved moss");
  assert.ok(stopped.includes("background: var(--pond-stop)"), "STOPPED is not the approved coral");
  assert.ok(error.includes("color-mix(in srgb, var(--pond-stop) 12%, transparent)"),
    "ERROR is not the coral role's outlined wash");
  assert.ok(error.includes("color: var(--pond-stop)"), "ERROR has lost its coral meaning");
  assert.notEqual(stopped, error, "STOPPED and ERROR have become indistinguishable chips");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `app/`: `npm.cmd run test:unit`

Expected: FAIL. The approved identity header, warm-paper, spill, token re-point, no-tail, semantic-text, opaque-chip/popover, approved needs-you amber, disposition, and cascade-winner tests fail. The landing test confirms the baseline already has `villager-rise` and no sway, but fails on its forwards `both` fill: that fill would mask Task 8's pond-open transform and opacity. The fix keeps the entrance and changes only its fill direction.

- [ ] **Step 3: Render the approved identity header directly from `faces.ts`**

In `app/src/renderer/screens/Chat.tsx`, add this import beside the existing renderer imports:

```typescript
import { TOWN_FACES } from "../town/faces";
```

Immediately after the imports, add this complete presentational component. It always uses Cairn's approved `ready` geometry because this is a decorative identity mark, not a second source of runtime state:

```tsx
function LanternCairnHeader() {
  const cairn = TOWN_FACES.cairn;
  const strokes = [...cairn.mark, ...cairn.states.ready];

  return (
    <div className="lantern-header">
      <span className="lantern-header-face" aria-hidden="true"
        style={{ color: cairn.color }}>
        <svg viewBox="0 0 100 100" focusable="false">
          <g>
            {strokes.map((stroke, index) => (
              <path key={`${stroke.part}:${index}`}
                d={stroke.d}
                strokeWidth={stroke.w}
                opacity={stroke.o ?? 1} />
            ))}
          </g>
        </svg>
      </span>
      <span className="lantern-header-copy">
        <strong className="lantern-header-title">Cairn</strong>
        <span className="lantern-header-subtitle">Conductor project</span>
      </span>
    </div>
  );
}
```

In the `column` JSX, insert the header immediately before the existing `.chat-topbar` and leave that topbar's complete JSX verbatim:

```tsx
        {embedded ? <LanternCairnHeader /> : null}
        <div className="row spread chat-topbar">
```

No path literal enters `Chat.tsx`; Task 1's 20-of-20 geometry pin therefore covers both appearances of Cairn. The existing topbar controls remain real and reachable.

- [ ] **Step 4: Build the lantern body and retire motion from its tucked control**

In `app/src/renderer/app.css`, replace lines 386-405 — the whole `.chat-column.chat-column-villager` rule **and** the `.chat-column-villager::before` tail rule that follows it — with:

```css
.chat-column.chat-column-villager {
  position: absolute; top: 12%;
  /* Wide enough for the conversation's contents (the run strip's two
   * controls, the top bar's three items); the 400px of Task 146 squeezed
   * them into wraps and clips. The width never pushes the left edge back
   * over Cairn's node while there is room to avoid it: calc(50% - 128px)
   * keeps the 96px anchor clearance plus the 32px pane margin, with a 400px
   * floor — below the floor (very narrow panes) the dialog slides left over
   * the node, the same overlay tradeoff the ≤620px centered mode already
   * makes, and tucking reveals him again. */
  left: max(16px, min(calc(50% + 96px), calc(100% - 32px - var(--town-chat-width))));
  width: var(--town-chat-width);
  height: auto; max-height: 76%; margin: 0;
  /* Lantern on Water (Decision 9). Warm paper lit from inside, resting on the
     dark pond: the light spills OUT of the panel onto the water instead of the
     panel covering the water. Three shadows do it — a hairline halo, a wide
     warm spill, and the drop that lifts it off the surface. */
  padding: 21px;
  border: 1px solid rgb(246 236 225 / 12%);
  border-radius: 34px;
  background: linear-gradient(170deg, var(--lantern-paper-lit), var(--lantern-paper) 62%, #2b2533);
  box-shadow:
    0 0 0 7px rgb(247 211 168 / 4%),
    0 0 70px rgb(247 211 168 / 11%),
    0 22px 54px rgb(0 0 0 / 42%);
  /* The paired tokens are re-pointed once, here. Every card, rule, and muted
     line inside the lantern is already written against them, so they re-tone
     through the cascade rather than being rewritten rule by rule. Only what
     carries its own colour in the approved mockup is named below.
     Each alpha is the mockup's own value for the surface that token serves:
     5% is `.l3-card` / `.l3-menu`, the card fill (lantern-v3.html:99,110);
     7% is `.l3-input`, the composer field (lantern-v3.html:130); 13% is the
     hairline rule (narrow-v2.html:66,69). */
  --card: rgb(246 236 225 / 5%);
  --card-solid: rgb(246 236 225 / 7%);
  --card-ink: var(--lantern-ink);
  --card-muted: var(--lantern-soft);
  --line: rgb(246 236 225 / 13%);
  --green-deep: var(--garden-cyan);
  --amber-deep: var(--pond-task);
  --done-text: var(--pond-done);
  --stopped-text: var(--pond-stop);
  /* The panel is dark paper in BOTH themes now, so the theme-paired warning
     tokens come with it. The 12% wash was measured against the card's own 5%
     paper wash: 18% produced 4.27:1, 15% only 4.54:1, and 12% gives 4.83:1
     for the 14.7px bold coral warning text. */
  --stop: var(--pond-stop);
  --stop-soft: color-mix(in srgb, var(--pond-stop) 12%, transparent);
  color: var(--card-ink);
  /* The rise lands the panel, and then it stays landed. The approved HTML
     swayed a picture; this real panel contains every conversation control, so
     an infinite container transform would make all of them moving targets. */
  animation: villager-rise .42s var(--spring) backwards;
}
```

Delete the complete `@keyframes villager-bob` block at lines 455–458. Keep `@keyframes villager-rise` verbatim. The tucked chip is an interactive button and Task 6 gives it a lower edge that must compress under a real press; an infinite transform would own the same property and make that treatment inert.

In `app/tests/conductor.spec.ts`, in `the tucked chip carries a needs-you dot while a decision waits inside`, insert this immediately **before** its existing `connectToFixture(...)` call. Clearing only the renderer's remembered seat makes the real initial recommendation tag deterministic; no credential or conductor state is touched:

```typescript
  await win.evaluate(() => localStorage.removeItem("cairn-last-seat"));
  await win.reload();
  const recommendation = win.locator(".brain-item-tag").first();
  await expect(recommendation).toBeVisible();
  const semanticContrast = await recommendation.evaluate((element) => {
    const panel = element.closest<HTMLElement>(".chat-column-villager");
    if (!panel) throw new Error("recommendation is outside the lantern");
    const probe = document.createElement("i");
    probe.style.backgroundColor = "var(--lantern-paper)";
    panel.appendChild(probe);
    const paper = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const style = getComputedStyle(element);
    const canvas = document.createElement("canvas");
    canvas.width = 1; canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("canvas context unavailable");
    const pixel = (fill: string, under?: string): [number, number, number] => {
      context.clearRect(0, 0, 1, 1);
      if (under) { context.fillStyle = under; context.fillRect(0, 0, 1, 1); }
      context.fillStyle = fill; context.fillRect(0, 0, 1, 1);
      const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
      return [red!, green!, blue!];
    };
    const luminance = (rgb: [number, number, number]): number => rgb
      .map((channel) => channel / 255)
      .map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
      .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index]!, 0);
    const foreground = luminance(pixel(style.color));
    const background = luminance(pixel(style.backgroundColor, paper));
    return {
      text: style.color,
      paper,
      ratio: (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05),
    };
  });
  expect(semanticContrast.text).toBe("rgb(163, 221, 208)");
  expect(semanticContrast.paper).toBe("rgb(51, 44, 58)");
  expect(semanticContrast.ratio).toBeGreaterThanOrEqual(4.5);
```

This is the actual recommended provider tag on its translucent semantic wash over the dark lantern paper, not a token string asserted in isolation.

In `app/tests/conductor.spec.ts`, in `the tucked chip carries a needs-you dot while a decision waits inside`, insert this immediately after its existing `connectToFixture(...)` call. This is the composed-renderer proof that the second face is present and is reading the approved Cairn stroke colour:

```typescript
  const lanternHeader = win.locator(".lantern-header");
  await expect(lanternHeader).toBeVisible();
  await expect(lanternHeader.locator(".lantern-header-title")).toHaveText("Cairn");
  await expect(lanternHeader.locator(".lantern-header-subtitle"))
    .toHaveText("Conductor project");
  await expect(lanternHeader.locator("path")).toHaveCount(3);
  await expect.poll(() => lanternHeader.locator("path").first()
    .evaluate((element) => getComputedStyle(element).stroke))
    .toBe("rgb(163, 221, 208)");
```

Then, in the same scenario, replace both forced tucked-chip clicks and the stale bob comment with ordinary clicks:

```typescript
  // The tucked control now holds still, so its ordinary hit target must work.
  await chip.click();
```

Use that exact statement at both existing forced-click sites. A forced click would hide a hit-target regression after the bob is removed.

- [ ] **Step 5: Retone the lantern's descendants, identity, and disposition chips**

Immediately after the remaining `@keyframes villager-rise` block, add the lantern's descendant rules. Do **not** add `@keyframes lantern-sway`:

```css
/* Inside the lantern (Decision 9). Everything not named here re-tones through
   the paired tokens re-pointed on the panel itself. The approved lantern
   repeats Cairn's face in its identity header; every path comes from
   TOWN_FACES.cairn at runtime, while CSS supplies only its frame. */
.chat-column-villager .card {
  /* Task 2 gives light shared cards dark semantic inks. A card inside this
     permanently dark lantern is dark paper instead, so restore the pastels. */
  --green-deep: var(--garden-cyan);
  --amber-deep: var(--pond-task);
  --done-text: var(--pond-done);
  --stopped-text: var(--pond-stop);
}
.chat-column-villager .feed {
  /* Task 2 also pins the standalone feed to light-paper ink. Inside this
     permanently dark lantern it must follow the panel, just like a card. */
  --green-deep: var(--garden-cyan);
  --amber-deep: var(--pond-task);
  --done-text: var(--pond-done);
  --stopped-text: var(--pond-stop);
}
.chat-column-villager .lantern-header {
  display: flex; min-width: 0; min-height: 36px; align-items: center; gap: 11px;
  padding: 0 92px 14px 0;
  border-bottom: 1px solid rgb(246 236 225 / 9%);
}
.chat-column-villager .lantern-header-face {
  width: 36px; height: 36px; flex: none; display: grid; place-items: center;
  border-radius: 47% 53% 49% 51% / 53% 47% 53% 47%;
  background: radial-gradient(circle at 38% 32%,
    rgb(163 221 208 / 24%), transparent);
}
.chat-column-villager .lantern-header-face svg {
  width: 76%; height: 76%; overflow: visible;
}
.chat-column-villager .lantern-header-face g {
  fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round;
}
.chat-column-villager .lantern-header-copy {
  min-width: 0; display: flex; flex-direction: column; line-height: 1.15;
}
.chat-column-villager .lantern-header-title {
  color: var(--lantern-ink); font-size: 14.5px; font-weight: 700;
}
.chat-column-villager .lantern-header-subtitle {
  color: var(--lantern-soft); font-size: 11px; font-weight: 600;
}
.chat-column-villager .chat-topbar { margin-top: 10px; row-gap: 4px; }
/* Keep the real tuck button in the unchanged topbar DOM so Task 8's direct
   child selectors remain valid, but place it in the approved header visually. */
.chat-column-villager .chat-tuck {
  position: absolute; z-index: 2; top: 26px; right: 21px;
}
.chat-column-villager .chat-messages { gap: 13px; padding: 15px 3px 10px; }
.chat-column-villager .bubble-cairn { line-height: 1.62; }
/* The owner's own voice keeps a fill so the two stay scannable — the mockup's
   warm peach, which is the one bright thing on the dark paper. */
.chat-column-villager .bubble-owner {
  background: linear-gradient(165deg, #fae3c8, #f3d0a8); color: #453120;
  border-radius: 20px 20px 7px 20px; box-shadow: 0 4px 15px rgb(247 211 168 / 20%);
}
.chat-column-villager .result-card,
.chat-column-villager .task-card,
.chat-column-villager .push-confirm,
.chat-column-villager .dispatch-panel { border-radius: 22px; }
.chat-column-villager .result-card-claims,
.chat-column-villager .task-card-details,
.chat-column-villager .task-chip { border-radius: 16px; }
/* The disposition chips. `lantern-v3.html` says this explicitly: “Moss for
   done, coral for stopped.” Amber belongs to work in transit / needs-you and
   must never stand in for STOPPED. `--stopped-ink` is the ONE derived value
   in this plan: its approved coral, heavily darkened. ERROR shares the
   stop semantic role but is an outlined 12% wash, so the two remain distinct. */
.chat-column-villager .result-card-done { background: var(--pond-done); color: #1e2e18; }
.chat-column-villager .result-card-stopped { background: var(--pond-stop); color: var(--stopped-ink); }
.chat-column-villager .result-card-error {
  background: color-mix(in srgb, var(--pond-stop) 12%, transparent);
  color: var(--pond-stop); box-shadow: inset 0 0 0 1px var(--pond-stop);
}
.chat-column-villager .chat-composer {
  padding-top: 14px; border-top: 1px solid rgb(246 236 225 / 9%);
}
.chat-column-villager .chat-composer textarea { border-radius: 18px; padding: 12px 16px; }
.chat-column-villager .bubble-system { border-radius: 16px; }
/* A popover needs an opaque fill. `--card-solid` is a 7% wash inside the
   lantern, right for a field but wrong for a panel over conversation text. */
.chat-column-villager .body-pill-panel { background: var(--lantern-paper-lit); }
```

- [ ] **Step 6: Retone the tucked control, needs-you dot, and risk chip**

Replace the existing `.chat-villager-chip` rule with the following. The chip sits outside `.chat-column-villager`, so it cannot inherit the lantern's re-pointed surface tokens:

```css
.chat-villager-chip {
  /* Same right-edge guard as the dialog: 266 = 250 max-width + 16 margin. */
  position: absolute; top: 30%; max-width: 250px;
  left: max(16px, min(calc(50% + 84px), calc(100% - 266px)));
  display: flex; align-items: center; gap: 8px;
  padding: 9px 16px; border: 1px solid rgb(246 236 225 / 12%);
  border-radius: 18px 18px 18px 4px;
  background: linear-gradient(170deg, var(--lantern-paper-lit), var(--lantern-paper) 62%);
  color: var(--lantern-ink); font: inherit;
  font-size: .84rem; text-align: left; cursor: pointer;
  box-shadow: 0 10px 28px rgb(0 0 0 / 24%);
}
```

Replace the existing `.chat-villager-chip-dot` rule immediately after it with the approved work-in-transit pastel. The 9px glow is copied from `narrow-v2.html`'s status dot:

```css
.chat-villager-chip-dot {
  flex-shrink: 0; width: 9px; height: 9px; border-radius: 50%;
  background: var(--pond-task); box-shadow: 0 0 9px var(--pond-task);
}
```

Add this lantern-scoped risk rule beside the other descendant rules. Its 60% pastel border is the exact `.l3-unsure` border treatment from `lantern-v3.html`, not a new warning hue:

```css
.chat-column-villager .task-chip-risk {
  border-color: color-mix(in srgb, var(--pond-task) 60%, transparent);
}
```

- [ ] **Step 7: Make the lantern's one-shot entrance yield to reduced motion**

Finally, append this second reduced-motion block at the **end** of `app/src/renderer/app.css`. The compound selector matches the entrance rule's `(0,2,0)` specificity, and source order makes the kill win. Task 8 will extend this same final block for the narrow window.

```css
/* Cascade-safe reduced motion for the lantern. A media query adds no
   specificity; the earlier `.chat-column-villager` kill loses to the compound
   selector that owns the entrance. Repeat that selector after the entrance. */
@media (prefers-reduced-motion: reduce) {
  .chat-column.chat-column-villager { animation: none; transition: none; }
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run from `app/`: `npm.cmd run test:unit` — Expected: PASS, all tests, including Task 1's face pins and Task 3's still-water pins.

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0.

Run from `app/`: `npm.cmd run build:vite` — Expected: builds clean.

Run from `app/`: `npm.cmd run build:lab` — Expected: builds clean. `lab/chatmock.tsx` imports the same `app.css`, so this proves the lantern rules parse in the lab's build too.

- [ ] **Step 9: Commit**

```powershell
git add app/src/renderer/screens/Chat.tsx app/src/renderer/app.css app/tests-unit/lantern.test.ts app/tests/conductor.spec.ts
git commit -m "The conversation becomes a lantern resting on the water"
```

---

### Task 5: The furniture goes warm and rounded

**Files:**
- Modify: `app/src/renderer/app.css:17,61,118` (renderer-wide owner-facing type), `:191,260` (conversation HUD labels), `:475-489` (header type), `:519-523` (threads), `:527-534` (the packet), `:558-567` (node labels), `:613-623` (the bed), `:624-627` (overflow), `:628-685` (thread target, empty note, and complete detail surface), and the complete `.project-rail` furniture block
- Modify: `app/src/renderer/screens/Dashboard.tsx:25` (replace the idle HUD readout with a sentence)
- Modify: `app/src/renderer/components/Scene.tsx:48` (stones are owner-facing prose, not machine data)
- Test: `app/tests-unit/furniture.test.ts` (create)
- Test: `app/tests-unit/palette.test.ts` (strengthen the Task 2 sweep from token-only hex to renderer-wide hex and `rgb()` forms)

**Interfaces:**
- Consumes: `--lantern-ink`, `--lantern-soft` from Task 2; the pastel `--garden-cyan`, `--pond-task`, `--pond-result`.
- Produces: nothing later tasks import.

Decision 9 rule 1, second half: **the cast carries the identity; the furniture does not.** The owner said the imagery read *"too sci fi"*. The resolution is that the crisp luminous face strokes on dark **are** the Ghost in the Shell half, and everything around them goes warm, rounded, and friendly — so *"hairline rules, monospaced type, HUD labels, and crawling data-threads are removed."*

Every one of those four is still shipped: eight Town rules and four rail rules use machine type as decoration, Town has five uppercase readouts, the rail has two more, the relationship threads are dashed with a glow (`stroke-dasharray: 4 4`), each character stands inside a drawn 1px ellipse (`.town-node-bed span`), and the rail divides itself with decorative hairlines and saturated HUD accents.

Two boundaries, drawn once so this task stays exact without inventing an exception:

- **The visual language covers the whole renderer.** Decision 9 says everything around the cast goes warm and New Horizons reaches every interactive surface. The rail is beside the Town, not a different product. Welcome cards, overlay cards, and the project switcher already use the shared warm card tokens and rounded radii; Task 2 makes their opaque surface cream, and this task pins that compliant structure rather than rewriting it for activity's sake. The rail and Town do not already comply, so both change.
- **The approved mockup's own warm container boundaries stay.** `lantern-v3.html` uses its 9% header divider and 11% menu/card boundary. Those exact cream boundaries define a soft paper surface; they are not the old teal HUD rules this task removes. The rail separators, node ellipse, dashed relationship feed, and machine readout lines go. No new divider is invented.
- **`--mono` survives only where the text itself is machine data** — for example a result-card file path. It is removed from every rail label, glyph button, task id, Town status, kicker, and packet label. This is a semantic exception for data, not a room-based visual exception.

**The bed's `<span>` is restyled, not deleted.** `conductor.spec.ts:1194` locates `.town-worker-pad span` to check its animation under reduced motion; removing the element would fail that test with "element not found" rather than honestly.

**Nothing is resized.** *"The characters must be large and central"* already holds: `lantern-v3` draws Cairn in a 104px blob whose svg fills 76% — 79px — and ours is 78px; it draws the others in 68px blobs, 52px of svg, and ours are 68px, so they are larger than the approved mockup's, not smaller. A resize would put the 760×620 containment checks at risk for nothing.

- [ ] **Step 1: Write the failing test**

Create `app/tests-unit/furniture.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(__dirname, "..", "..", "src", "renderer", "app.css"), "utf8");
const dashboard = readFileSync(
  join(__dirname, "..", "..", "src", "renderer", "screens", "Dashboard.tsx"), "utf8");
const scene = readFileSync(
  join(__dirname, "..", "..", "src", "renderer", "components", "Scene.tsx"), "utf8");

/** Every `.town-*` rule, from the square down to its keyframes. */
const town = css.slice(css.indexOf(".town-square {"), css.indexOf("@keyframes town-face-float"));
const rail = css.slice(css.indexOf(".project-rail {"), css.indexOf(".workspace-stage {"));

function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
}

/**
 * Decision 9, rule 1: the cast carries the identity; the furniture does not.
 * The owner's words were that the imagery read "too sci fi". The crisp
 * luminous faces ARE the Ghost in the Shell half; everything around them goes
 * warm, rounded, and friendly, and "hairline rules, monospaced type, HUD
 * labels, and crawling data-threads are removed."
 */
test("the town labels itself in words, not in machine type", () => {
  assert.ok(!town.includes("var(--mono)"), "a town surface is still set in machine type");
  assert.ok(!/text-transform:\s*uppercase/.test(town), "a town surface still shouts in HUD caps");
});

test("the rail is warm furniture, not a second HUD", () => {
  assert.ok(!rail.includes("var(--mono)"), "the rail still uses machine type as decoration");
  assert.ok(!/text-transform:\s*uppercase/.test(rail), "the rail still shouts in HUD caps");
  for (const selector of [".project-rail", ".rail-identity", ".rail-bottom", ".rail-cairn-mark"]) {
    const body = rule(selector);
    assert.ok(!/\bborder(?:-(?:right|top|bottom))?:\s*1px/.test(body),
      `${selector} keeps a decorative hairline`);
  }
  assert.ok(rule(".project-rail").includes("var(--lantern-plum)"),
    "the rail is not part of Lantern on Water's warm furniture");
  assert.ok(!rail.includes("rgb(127 216 200"), "the old saturated rail glow survives");
});

test("welcome, overlay, and switcher panels already use the shared rounded furniture", () => {
  for (const selector of [".card", ".overlay-card", ".switcher-list"]) {
    const body = rule(selector);
    assert.ok(body.includes("var(--card") || body.includes("var(--card-solid)"), `${selector} bypasses shared warm paper`);
    assert.ok(body.includes("border-radius"), `${selector} is not rounded furniture`);
  }
});

test("the conversation drops its HUD labels too", () => {
  for (const selector of [
    ".run-strip-stage",
    ".task-chip-kind",
  ]) {
    const body = rule(selector);
    assert.ok(body.includes("text-transform: none"), `${selector} still shouts in HUD caps`);
    assert.ok(body.includes("letter-spacing: .02em"), `${selector} still carries HUD tracking`);
  }
});

test("rounded owner-facing type reaches the whole renderer", () => {
  // `.mono` remains the one semantic opt-in for a real path or code value.
  // Everywhere else, machine type and shouted readouts are decoration.
  const furnitureCss = css.replace(/\.mono\s*\{[^}]*\}/, "");
  assert.ok(!furnitureCss.includes("var(--mono)"),
    "an owner-facing renderer surface still uses machine type as decoration");
  assert.ok(!/text-transform:\s*uppercase/.test(furnitureCss),
    "an owner-facing renderer surface still shouts in HUD caps");
  assert.ok(dashboard.includes("No task is running."),
    "the Dashboard does not say its resting state in a sentence");
  assert.ok(!dashboard.includes("▸ idle ·"), "the Dashboard still prints a HUD status readout");
  assert.ok(!scene.includes('fontFamily="var(--mono)"'),
    "the owner-facing stone count is still machine type");
});

test("machine type survives where the text really is machine text", () => {
  // A file path in a result card IS a path. What Decision 9 removes is
  // monospace used as decoration, not monospace used correctly.
  assert.match(css, /\.mono \{[^}]*font-family: var\(--mono\)/s);
});

test("the threads no longer crawl", () => {
  assert.ok(!town.includes("stroke-dasharray"), "the relationship threads are still dashed");
});

test("the town header uses the lantern's warm boundary, not a teal HUD rule", () => {
  const header = rule(".town-square-header");
  assert.ok(header.includes("rgb(246 236 225 / 9%)"),
    "the Town header does not share the approved warm divider");
  assert.ok(!header.includes("rgb(163 221 208"),
    "the Town header still draws a luminous HUD hairline");
});

test("the Town detail is lantern furniture, not a bright inspector", () => {
  const detail = rule(".town-detail");
  assert.ok(detail.includes("light-dark(rgb(22 27 44 / 91%), rgb(22 27 44 / 95%))"),
    "the detail surface does not rest in the lantern's deep water");
  assert.ok(detail.includes("rgb(246 236 225 / 11%)"),
    "the detail surface does not use the approved warm card boundary");
  assert.ok(detail.includes("border-radius: 22px"),
    "the detail surface still has inspector geometry");
  assert.ok(!detail.includes("var(--town-detail)"),
    "the old bright inspector surface survives");
  assert.ok(rule(".town-empty-note").includes("var(--lantern-soft)"),
    "the empty state is not in the lantern's soft voice");
  assert.ok(rule(".town-node strong").includes("var(--lantern-ink)"),
    "a villager's name bypasses the lantern palette");
});

test("no character stands inside a drawn ring", () => {
  const bed = town.slice(town.indexOf(".town-node-bed span {"));
  const rule = bed.slice(0, bed.indexOf("}"));
  assert.ok(!/border:/.test(rule), "each character still stands inside a hairline ellipse");
});

test("the cast is already the approved size and is deliberately not resized", () => {
  assert.match(town, /\.town-face \{[^}]*width: 78px/s);
  assert.match(town, /\.town-face-kimi[^{]*\{[^}]*width: 68px/s);
});
```

`app/tests-unit/palette.test.ts` already reads both `tokens.css` and `app.css` from Task 2. Replace `SUPERSEDED` and the `no superseded saturated value` test with this complete renderer-wide guard:

```typescript
/**
 * The values the pastels replace, each with the `rgb()` form it also takes.
 * Any survivor is a half-finished re-tone.
 */
const SUPERSEDED: Array<[hex: string, rgb: string]> = [
  ["#7fd8c8", "127 216 200"],
  ["#c9a7e8", "201 167 232"],
  ["#f2a35c", "242 163 92"],
  ["#9fb8d8", "159 184 216"],
  ["#a9d39b", "169 211 155"],
  ["#ff8178", "255 129 120"],
  ["#ffb467", "255 180 103"],
  ["#70e3d3", "112 227 211"],
];

test("no superseded saturated value survives on a re-toned token", () => {
  // Sweep app.css as well as tokens.css, and rgb() as well as hex. Decision 9
  // names no rail exception: every old saturated literal is a real failure.
  const swept = [tokens, app].join("\n");
  for (const [hex, rgb] of SUPERSEDED) {
    assert.ok(!swept.includes(hex), `${hex} is still in the renderer after the pastel re-tone`);
    assert.ok(!swept.includes(rgb), `${hex} survives as rgb(${rgb}) after the pastel re-tone`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `app/`: `npm.cmd run test:unit`

Expected: FAIL. The furniture test reports the Dashboard HUD sentence, the Welcome/TaskRun eyebrow caps, the status and activity-feed machine type, the SVG stone-count machine type, the conversation's two HUD labels, Town machine type, dashed threads, drawn bed ring, non-warm header divider, and the rail's machine type, caps, hairlines, and saturated furniture. The strengthened palette test first reports the old Cairn teal surviving as `rgb(127 216 200 / 12%)` in `.rail-cairn-mark`; after Step 6 removes that earliest survivor, the same guard covers `.town-thread-target-transfer::after` and the old `rgb(112 227 211)` Town literals removed in Steps 4 and 5. The semantic `.mono` rule and face-size pins pass already, which is correct.

- [ ] **Step 3: Remove decorative HUD type from every remaining owner-facing surface**

In `app/src/renderer/app.css`, replace the complete `.eyebrow`, `.status-pill`, and `.feed` rules with:

```css
.eyebrow {
  color: var(--green-deep); font-size: .78rem; font-weight: 700;
  letter-spacing: .02em; text-transform: none;
}
.status-pill {
  display: inline-block; padding: 8px 16px; border-radius: 999px;
  background: var(--card); color: var(--card-muted);
  font-family: inherit; font-size: .78rem; font-weight: 700;
}
.feed {
  --green-deep: var(--green-ink);
  --amber-deep: var(--amber-ink);
  --done-text: var(--green-ink);
  --stopped-text: var(--stopped-ink);
  max-height: 220px; overflow-y: auto; padding: 10px 14px; border-radius: var(--r-sm);
  background: var(--card); color: var(--card-muted);
  font-family: inherit; font-size: .8rem; font-weight: 600;
}
```

In `app/src/renderer/screens/Dashboard.tsx`, replace the complete `.status-pill` line with:

```tsx
        <span className="status-pill">No task is running. {stones} {stones === 1 ? "stone" : "stones"} in this project.</span>
```

In `app/src/renderer/components/Scene.tsx`, replace the complete conditional stone-count line with:

```tsx
        <text x="440" y="70" fontSize="12" fill="var(--muted)">{stones} stones</text>
```

The visible count inherits the renderer's rounded face. Real paths still opt in through `.mono`; no semantic machine value changes.

Replace the complete original `.run-strip-stage` and `.task-chip-kind` rules. Do not add later overrides: the renderer-wide source guard deliberately rejects stale HUD declarations even when the cascade hides them.

```css
.run-strip-stage {
  color: var(--card-muted); font-size: .74rem; font-weight: 700;
  letter-spacing: .02em; text-transform: none;
}
.task-chip-kind {
  flex-shrink: 0; color: var(--card-muted); font-size: .74rem; font-weight: 700;
  letter-spacing: .02em; text-transform: none;
}
```

Run from `app/`: `npm.cmd run test:unit`.

Expected: the renderer-wide type and conversation-label assertions pass. The same file still reports the untouched Town and rail furniture; the palette sweep still reports the rail's old raw teal. Those remaining red tests lead the next three steps.

- [ ] **Step 4: Warm the town header, threads, packet, and node labels**

In `app/src/renderer/app.css`, replace the `.town-square-header` surface rule with:

```css
.town-square-header {
  position: absolute; z-index: 6; inset: 0 0 auto; height: 62px; display: flex; align-items: center;
  justify-content: space-between; gap: 16px; padding: 11px 16px;
  /* The approved lantern header's warm 9% divider, not a teal HUD hairline. */
  border-bottom: 1px solid rgb(246 236 225 / 9%); background: rgb(22 27 44 / 78%);
  backdrop-filter: blur(14px);
}
```

In `app/src/renderer/app.css`, replace lines 475-489 (the header's type and its button) with:

```css
.town-square-header span {
  color: var(--lantern-soft); font-size: .68rem; font-weight: 700; letter-spacing: .02em;
}
.town-square-header strong { overflow: hidden; color: var(--lantern-ink); font-size: .9rem; text-overflow: ellipsis; white-space: nowrap; }
.town-header-actions { display: flex; min-width: 0; align-items: center; justify-content: flex-end; gap: 9px; }
.town-square-header p {
  min-width: 0; max-width: min(42vw, 390px); margin: 0; overflow: hidden; color: var(--lantern-ink);
  font-size: .74rem; text-align: right; text-overflow: ellipsis; white-space: nowrap;
}
.town-square-header button {
  flex: none; padding: 6px 12px; border: 0; border-radius: 999px;
  /* 7% is the mockup's ghost-button fill; 8% was a border alpha spent as fill. */
  background: rgb(246 236 225 / 7%); color: var(--lantern-soft);
  font: inherit; font-size: .68rem; font-weight: 700; cursor: pointer;
}
/* 14% is the mockup's own hover fill (`.l3-ghost:hover`, lantern-v3.html:81). */
.town-square-header button:hover:not(:disabled) { background: rgb(246 236 225 / 14%); color: var(--lantern-ink); }
.town-square-header button:disabled { opacity: .38; cursor: default; }
```

Replace lines 519-523 (`.town-threads` and its path) with:

```css
.town-threads { position: absolute; z-index: 1; inset: 0; width: 100%; height: 100%; overflow: visible; }
/* A soft tether, not a data feed. The dashes and the glow were the crawling
   thread Decision 9 names; what a thread has to say is that two villagers are
   working together, and a faint continuous line says exactly that. */
.town-threads path {
  fill: none; stroke: color-mix(in srgb, var(--garden-cyan) 26%, transparent);
  stroke-width: .55; vector-effect: non-scaling-stroke;
}
```

Replace lines 527-534 (`.town-transfer-packet` and its dot) with:

```css
/* The packet keeps its word — the owner should be able to read what is
   crossing the water — but says it in the app's own rounded voice.
   `rgb(22 27 44 / …)` throughout this task is --lantern-deep (#161b2c) with an
   alpha, the same shape the old rules used with the retired --pond-deep — and
   with the SAME alphas those rules carried (92% here, 88% and 62% on the thread
   target below), so only the hue moves. It is a derivation of an approved
   colour, not a new one. */
.town-transfer-packet {
  position: absolute; left: var(--town-from-x); top: var(--town-from-y); display: flex; align-items: center; gap: 6px;
  min-width: 48px; max-width: 86px; padding: 5px 11px; transform: translate(-50%, -50%);
  border: 0; border-radius: 999px;
  background: color-mix(in srgb, var(--town-packet-color) 22%, rgb(22 27 44 / 92%));
  color: var(--lantern-ink); box-shadow: 0 0 18px color-mix(in srgb, var(--town-packet-color) 28%, transparent);
  font: inherit; font-size: .68rem; font-weight: 700; white-space: nowrap;
}
.town-transfer-packet i { width: 7px; height: 7px; flex: none; border-radius: 50%; background: var(--town-packet-color); box-shadow: 0 0 7px var(--town-packet-color); }
```

Replace lines 558-567 (`.town-node strong`, `.town-node-status`, and its dot) with:

```css
.town-node strong {
  position: relative; z-index: 1; width: 100%; overflow: hidden;
  color: var(--lantern-ink); font-size: .76rem; letter-spacing: .02em;
  text-align: center; text-overflow: ellipsis; white-space: nowrap;
}
.town-node-status {
  position: relative; z-index: 1; display: flex; align-items: center; gap: 5px;
  color: var(--lantern-soft); font-size: .68rem; font-weight: 700;
}
.town-node-status i { width: 7px; height: 7px; border: 0; border-radius: 50%; background: var(--pond-task); }
```

Replace the two old raw-teal node-state rules with:

```css
.town-node:hover { background: rgb(163 221 208 / 7%); }
.town-node[aria-pressed="true"] {
  background: rgb(163 221 208 / 11%);
  box-shadow: 0 0 0 1px rgb(163 221 208 / 38%);
}
```

Run from `app/`: `npm.cmd run test:unit`.

Expected: the continuous-thread assertion now passes, villager names use lantern ink, and the old `rgb(112 227 211)` literals are gone. The strengthened pastel sweep deliberately remains red on the rail mark's earlier `rgb(127 216 200 / 12%)`, then on `.town-thread-target-transfer::after`'s `rgb(127 216 200 / 45%)` after the rail is fixed. The furniture suite also remains red on the still-untouched bed ring, bright detail surface, empty-note colour, and rail. Do not weaken those assertions.

- [ ] **Step 5: Replace the bed rings, overflow, thread target, and detail chrome**

Replace lines 613-627 (`.town-node-bed`, its two parts, and `.town-overflow-shape`) with:

```css
.town-node-bed {
  position: absolute; z-index: 0; left: 50%; top: 91px; width: 96px; height: 24px;
  transform: translate(-50%, -50%); pointer-events: none;
}
.town-node-bed::before {
  content: ""; position: absolute; inset: -8px 8px; border-radius: 50%;
  background: radial-gradient(ellipse, color-mix(in srgb, var(--agent-color) 12%, transparent), transparent 70%);
}
/* The hairline ellipse each character used to stand inside is now the light
   it casts. The element stays — conductor.spec.ts locates it for the
   reduced-motion check, and an absent element would fail that dishonestly.
   No `border` declaration at all, not `border: 0`: a span has no default
   border to reset, so the reset would be a no-op that reads — to a later
   maintainer and to this task's own test — as a border still being managed
   here. Absence is the assertion. */
.town-node-bed span {
  position: absolute; inset: 3px 7px; border-radius: 50%;
  background: radial-gradient(ellipse, color-mix(in srgb, var(--agent-color) 16%, transparent), transparent 72%);
}
.town-overflow-shape {
  width: 64px; height: 48px; display: grid; place-items: center; border: 0;
  /* 7% is a fill from the mockup; 9% was a hairline alpha spent as fill. */
  border-radius: 24px; background: rgb(246 236 225 / 7%); color: var(--lantern-ink);
  font: inherit; font-size: .9rem; font-weight: 700;
}
```

Replace lines 628-648 (`.town-thread-target` and its parts) with:

```css
.town-thread-target {
  position: absolute; z-index: 4; min-width: 74px; padding: 5px 10px; transform: translate(-50%, -50%);
  border: 0; border-radius: 999px; background: rgb(22 27 44 / 88%);
  color: var(--lantern-ink); font: inherit; cursor: pointer;
  box-shadow: 0 4px 14px rgb(0 0 0 / 24%);
  transition: left 320ms var(--spring), top 320ms var(--spring), background-color 160ms ease;
}
.town-thread-target span { color: var(--pond-result); }
.town-thread-target small { display: block; color: var(--lantern-soft); font-size: .58rem; font-weight: 700; }
.town-thread-target[aria-pressed="true"] { background: color-mix(in srgb, var(--garden-cyan) 16%, rgb(22 27 44 / 88%)); }
.town-thread-target-transfer {
  min-width: 18px; width: 18px; height: 18px; padding: 0;
  background: rgb(22 27 44 / 62%); box-shadow: none;
}
.town-thread-target-transfer > * {
  position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip-path: inset(50%); white-space: nowrap;
}
.town-thread-target-transfer::after {
  content: ""; width: 4px; height: 4px; border-radius: 50%; background: var(--pond-result);
  box-shadow: 0 0 6px color-mix(in srgb, var(--pond-result) 45%, transparent);
}
```

Replace lines 649-685 (`.town-empty-note` through `.town-overflow-list span` — the complete detail surface, including the old hover and overflow rules) with:

```css
.town-empty-note {
  position: absolute; z-index: 5; inset: auto 18px 24px; margin: 0;
  color: var(--lantern-soft); font-size: .72rem; text-align: center;
}
.town-detail {
  position: absolute; z-index: 7; inset: auto calc(var(--town-chat-width) + 48px) 12px 12px;
  max-height: 184px; overflow-y: auto; padding: 12px 14px;
  border: 1px solid rgb(246 236 225 / 11%); border-radius: 22px;
  /* Keep both exact alphas from the `--town-detail` rule this replaces: 91%
     in light mode and 95% in dark. Only the hue moves to --lantern-deep. */
  background: light-dark(rgb(22 27 44 / 91%), rgb(22 27 44 / 95%));
  color: var(--lantern-ink);
  box-shadow: 0 14px 36px rgb(0 0 0 / 16%); backdrop-filter: blur(16px);
}
.town-detail-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.town-detail-heading > div { min-width: 0; }
.town-detail-kicker { color: var(--lantern-soft); font-size: .62rem; font-weight: 700; letter-spacing: .02em; }
.town-detail h3 { margin: 2px 0 8px; font-size: .9rem; }
.town-detail p { margin: 0; color: var(--lantern-soft); font-size: .72rem; line-height: 1.45; }
.town-detail dl { display: grid; gap: 4px; margin: 0; font-size: .7rem; }
.town-detail dl div { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 8px; }
.town-detail dt { color: var(--lantern-soft); }
.town-detail dd { margin: 0; overflow-wrap: anywhere; }
.town-state-shape {
  flex: none; padding: 4px 10px; border: 0; border-radius: 999px;
  background: color-mix(in srgb, currentColor 14%, transparent);
  color: var(--garden-cyan); font: inherit; font-size: .62rem; font-weight: 700;
}
.town-state-working { color: var(--pond-task); }
.town-state-returned, .town-state-checking { color: var(--pond-result); }
.town-state-stopped, .town-state-error { color: var(--pond-stop); }
.town-state-thinking { opacity: .75; }
.town-state-more { color: var(--garden-cyan); }
.town-thread-key { color: var(--garden-cyan); font-size: 1.25rem; }
.town-detail-action {
  width: 100%; margin-top: 9px; padding: 8px 12px; border: 0;
  border-radius: 999px; background: rgb(246 236 225 / 7%); color: var(--lantern-ink);
  font: inherit; font-size: .72rem; font-weight: 700; cursor: pointer;
}
.town-detail-action:hover:not(:disabled) { background: rgb(246 236 225 / 14%); }
.town-overflow-list { display: grid; gap: 5px; margin: 2px 0 0; padding: 0; list-style: none; font-size: .7rem; }
.town-overflow-list li { display: flex; justify-content: space-between; gap: 10px; }
.town-overflow-list span {
  overflow: hidden; color: var(--lantern-soft); text-overflow: ellipsis; white-space: nowrap;
}
```

Run from `app/`: `npm.cmd run test:unit`.

Expected: the complete Town furniture suite now passes. The rail furniture test and palette sweep remain red on the old rail HUD styling and its `rgb(127 216 200 / 12%)` glow. That is the deliberate lead-in to the next step.

- [ ] **Step 6: Warm the complete project rail and remove its HUD furniture**

In `app/src/renderer/app.css`, replace the complete rail furniture block from `.project-rail {` through `.project-rail-collapsed .rail-action` (immediately before `.workspace-stage`) with this block. It preserves every rail layout and state selector, but removes decorative hairlines, machine type, shouted labels, raw teal, and the separate sci-fi colour language:

```css
.project-rail {
  position: relative; z-index: 4; min-width: 0; display: flex; flex-direction: column;
  background: linear-gradient(180deg, var(--lantern-plum), var(--lantern-mid));
  backdrop-filter: blur(14px);
  color: var(--rail-ink); border-right: 0; overflow: hidden;
  box-shadow: 10px 0 30px rgb(0 0 0 / 14%);
}
.rail-identity {
  min-height: 74px; display: flex; align-items: center; gap: 10px; padding: 12px;
  border-bottom: 0; background: rgb(246 236 225 / 5%);
}
.rail-cairn-mark {
  flex: 0 0 38px; width: 38px; height: 38px; display: grid; place-items: center;
  border: 0; border-radius: 14px 14px 18px 18px;
  color: var(--garden-cyan); background: rgb(246 236 225 / 7%); font-weight: 700;
  box-shadow: inset 0 0 18px rgb(163 221 208 / 12%);
}
.rail-cairn-mark::after {
  content: ""; position: absolute; width: 5px; height: 5px; margin: 26px 0 0 26px;
  border-radius: 50%; background: var(--rail-muted);
}
.rail-cairn-connected::after { background: var(--pond-done); box-shadow: 0 0 8px var(--pond-done); }
.rail-identity-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rail-identity-copy strong { color: var(--rail-heading); }
.rail-identity-copy span { color: var(--rail-muted); font-size: .72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rail-collapse {
  width: 28px; height: 34px; padding: 0; border: 0; border-radius: 10px; cursor: pointer;
  background: rgb(246 236 225 / 7%); color: var(--rail-muted);
  font: inherit; font-size: 1.25rem; line-height: 1;
}
.rail-collapse:hover, .rail-collapse:focus-visible {
  color: var(--garden-cyan); background: rgb(246 236 225 / 14%); outline: none;
}
.project-rail-collapsed .rail-identity { padding-inline: 10px; justify-content: center; flex-wrap: wrap; }
.project-rail-collapsed .rail-collapse { height: 24px; }
.rail-projects { flex: 1; overflow-y: auto; padding: 12px 8px; }
.rail-section-label {
  margin: 0 8px 8px; color: var(--rail-muted); font-size: .7rem; font-weight: 700;
  letter-spacing: .02em; text-transform: none;
}
.rail-project { margin-bottom: 5px; border-radius: 13px; }
.rail-project-active { background: rgb(246 236 225 / 7%); box-shadow: none; }
.rail-project-row { display: flex; align-items: stretch; }
.rail-project-select {
  flex: 1; min-width: 0; position: relative; display: flex; align-items: center; gap: 9px;
  padding: 8px; border: 0; border-radius: 12px; background: transparent; color: inherit;
  font: inherit; text-align: left; cursor: pointer;
}
.rail-project-select:hover, .rail-project-select:focus-visible {
  background: rgb(246 236 225 / 10%); outline: none;
}
.rail-project-avatar {
  flex: 0 0 32px; width: 32px; height: 32px; display: grid; place-items: center;
  border-radius: 12px; background: rgb(246 236 225 / 7%); color: var(--pond-task);
  font-size: .72rem; font-weight: 700;
}
.rail-project-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rail-project-copy > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--rail-heading); font-weight: 600; }
.rail-project-copy > span:last-child { color: var(--rail-muted); font-size: .68rem; }
.rail-activity { flex: 0 0 8px; width: 8px; height: 8px; border-radius: 50%; background: var(--rail-muted); }
.rail-activity-thinking { background: var(--garden-cyan); box-shadow: 0 0 8px var(--garden-cyan); }
.rail-activity-working { background: var(--pond-task); box-shadow: 0 0 8px var(--pond-task); }
.rail-activity-complete { background: var(--pond-done); }
.rail-urgent {
  position: absolute; right: 1px; top: 0; width: 16px; height: 16px; display: grid; place-items: center;
  border-radius: 50%; background: var(--pond-task); color: #4a3520;
  font: inherit; font-size: .65rem; font-weight: 700; line-height: 1;
}
.rail-project-toggle {
  width: 28px; border: 0; border-radius: 10px;
  background: rgb(246 236 225 / 7%); color: var(--rail-muted);
  cursor: pointer; font: inherit; font-size: 1rem;
}
.rail-project-toggle:hover, .rail-project-toggle:focus-visible { color: var(--garden-cyan); outline: none; }
.rail-tasks { padding: 2px 8px 8px 46px; }
.rail-empty { margin: 3px 0; color: var(--rail-muted); font-size: .7rem; }
.rail-task { display: grid; grid-template-columns: 7px minmax(0, 1fr); gap: 8px; padding: 5px 0; }
.rail-task-mark { width: 7px; height: 7px; margin-top: 5px; border: 1px solid var(--rail-muted); border-radius: 50%; }
.rail-task-running .rail-task-mark { border-radius: 2px; border-color: var(--pond-task); background: var(--pond-task); box-shadow: 0 0 6px var(--pond-task); }
.rail-task-unfinished .rail-task-mark { border-color: var(--pond-task); }
.rail-task-done .rail-task-mark { border-color: var(--pond-done); background: var(--pond-done); }
.rail-task-stopped .rail-task-mark { border-color: var(--pond-stop); }
.rail-task-copy { min-width: 0; display: flex; flex-direction: column; color: var(--rail-ink); font-size: .72rem; }
.rail-task-copy > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rail-task-copy > span:last-child { color: var(--rail-muted); font-size: .63rem; text-transform: none; letter-spacing: .01em; }
.rail-task-id { margin-right: 6px; color: var(--rail-muted); font-family: inherit; }
.rail-bottom { padding: 10px 8px 14px; border-top: 0; background: rgb(246 236 225 / 5%); }
.rail-action {
  width: 100%; display: flex; align-items: center; gap: 11px; padding: 8px 10px; border: 0;
  border-radius: 11px; background: rgb(246 236 225 / 5%); color: var(--rail-muted);
  font: inherit; text-align: left; cursor: pointer;
}
.rail-action > span:first-child { width: 28px; text-align: center; color: var(--garden-cyan); }
.rail-action:hover, .rail-action:focus-visible {
  background: rgb(246 236 225 / 14%); color: var(--rail-heading); outline: none;
}
.project-rail-collapsed .rail-projects { padding-inline: 10px; }
.project-rail-collapsed .rail-project-select { justify-content: center; padding-inline: 0; }
.project-rail-collapsed .rail-project-avatar { flex-basis: 38px; width: 38px; height: 38px; }
.project-rail-collapsed .rail-activity { position: absolute; right: 3px; bottom: 5px; }
.project-rail-collapsed .rail-action { justify-content: center; padding-inline: 0; }
```

- [ ] **Step 7: Run tests to verify the complete furniture change**

Run from `app/`: `npm.cmd run test:unit` — Expected: PASS, all tests.

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0.

Run from `app/`: `npm.cmd run build:vite` — Expected: builds clean.

Confirm the town's own chrome is genuinely clear of HUD type:

```powershell
rg -n 'town-.*var\(--mono\)|stroke-dasharray' src/renderer/app.css
```

Expected: no output and ripgrep exit code 1.

- [ ] **Step 8: Commit**

```powershell
git add app/src/renderer/app.css app/src/renderer/screens/Dashboard.tsx app/src/renderer/components/Scene.tsx app/tests-unit/furniture.test.ts app/tests-unit/palette.test.ts
git commit -m "The town's furniture goes warm and rounded; the cast keeps the identity"
```

---

### Task 6: The New Horizons treatment

**Files:**
- Modify: `app/src/renderer/main.tsx:1-5` (the 700 weight)
- Modify: `app/src/renderer/components/ConnectCard.tsx:336-338` (name the OAuth fallback link as an interactive lantern surface)
- Modify: `app/src/renderer/screens/Picker.tsx:143-149` (give each project-opening menu row its stable stagger index and class)
- Modify: `app/src/renderer/app.css:3-10` (body and headings), `:22-32` (`.pill`), every renderer-wide action/menu/field/focus surface, `:572-574` (`.town-face`), the existing `@media (max-width: 620px)` tucked-chip rule, and the final cascade-safe reduced-motion block
- Modify: `app/src/renderer/motion.css:89-97` and its reduced-motion list (retire the later generic composer, Town-header, and rail transforms that would outrank the new treatment)
- Test: `app/tests-unit/newhorizons.test.ts` (create)

**Interfaces:**
- Consumes: `--pop`, `--ease` from Task 2; the `.chat-column-villager` scope from Task 4.
- Produces: `--pill-edge` for `.pill`, `--control-edge` for every other action button, borderless staggered menu rows, and one cascade-winning Cairn focus contract across the renderer. Task 8 applies the same `--control-edge` contract to `.pond-line` and `.pond-back` when those controls are created.

Decision 9 rule 5, on every interactive surface: buttons are chunky pills with a solid lower edge that compresses on press; motion uses overshoot easing rather than linear ease-out; menu items stagger in and slide on hover; characters spring when touched; type is rounded and heavy, never thin.

“Every” is literal. Global `.pill` reaches Welcome, Dashboard, Picker, Settings, TaskRun, checkups, phone pairing, overlays, and Chat. This task separately names the visible non-pill actions, the five menu-row families, every field/focus surface, Town characters, the project rail, and the OAuth fallback. A menu row is not forced into a chunky edge: the approved mockup gives rows a warm rounded wrapper, no border, a staggered entrance, and a five-pixel sideways hover. Characters get a face spring rather than a furniture edge.

**One honest substitution.** The mockup asks for weights up to 850. `@fontsource/quicksand` ships 300–700, and asking a browser for 850 gets synthesized faux-bold, which looks worse than the real 700. Every weight in this task is 600 or 700, and the 700 face is imported so none of it is faked.

- [ ] **Step 1: Write the failing test**

Create `app/tests-unit/newhorizons.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");
const firstReducedMotion = css.indexOf("@media (prefers-reduced-motion: reduce)");
assert.notEqual(firstReducedMotion, -1, "app.css has no reduced-motion block");
const liveCss = css.slice(0, firstReducedMotion);

function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
}

function lastRule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...liveCss.matchAll(new RegExp(`\\n${escaped}(?=\\s*[,\\{])`, "g"))];
  const start = matches.at(-1)?.index ?? -1;
  assert.notEqual(start, -1, `${selector} has no final rule`);
  const open = liveCss.indexOf("{", start);
  const close = liveCss.indexOf("}", open);
  assert.ok(open > start && close > open, `${selector} has no complete final rule`);
  return liveCss.slice(start, close);
}

function liveRuleBodies(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...liveCss.matchAll(new RegExp(`\\n${escaped}(?=\\s*[,\\{])`, "g"))]
    .map((match) => {
      const open = liveCss.indexOf("{", match.index!);
      const close = liveCss.indexOf("}", open);
      assert.ok(open > match.index! && close > open, `${selector} has an incomplete rule`);
      return liveCss.slice(open + 1, close);
    })
    .join("\n");
}

/**
 * Decision 9, rule 5. Buttons are chunky pills with a solid lower edge that
 * compresses on press; motion overshoots rather than easing out; menu items
 * stagger; characters spring when touched; type is heavy, never thin.
 */
test("a pill has a solid lower edge that compresses under a press", () => {
  assert.ok(rule(".pill").includes("--pill-edge"), "the pill has no lower edge");
  const pressed = rule(".pill:active:not(:disabled)");
  assert.ok(pressed.includes("translateY(2px)"), "the pill does not sink when pressed");
  assert.ok(/box-shadow:\s*0 1px 0/.test(pressed), "the pill's edge does not compress");
  assert.ok(!lastRule(".pill-quiet").includes("--pill-edge: transparent"),
    "a quiet pill has no solid edge at all");
});

test("every renderer action has an edge and a real press", () => {
  assert.ok(renderer("components", "ConnectCard.tsx").includes('className="connect-card-link"'),
    "the OAuth fallback link is not wired to the lantern control treatment");
  assert.ok(renderer("screens", "Picker.tsx").includes('className="project-card-open"'),
    "the project-opening row has no class for the shared menu treatment");
  for (const [surface, pressed] of [
    [".overlay-close", ".overlay-close:active:not(:disabled)"],
    [".run-reminder", ".run-reminder:active:not(:disabled)"],
    [".rail-collapse", ".rail-collapse:active:not(:disabled)"],
    [".rail-project-toggle", ".rail-project-toggle:active:not(:disabled)"],
    [".rail-action", ".rail-action:active:not(:disabled)"],
    [".chat-column-villager .result-card-folded", ".chat-column-villager .result-card-folded:active:not(:disabled)"],
    [".chat-column-villager .chat-tuck", ".chat-column-villager .chat-tuck:active:not(:disabled)"],
    [".chat-villager-chip", ".chat-villager-chip:active:not(:disabled)"],
    [".town-square-header button", ".town-square-header button:active:not(:disabled)"],
    [".town-thread-target", ".town-thread-target:active:not(:disabled)"],
    [".town-detail-action", ".town-detail-action:active:not(:disabled)"],
    [".town-node-overflow .town-overflow-shape", ".town-node-overflow:active .town-overflow-shape"],
    [".chat-column-villager .connect-card-link", ".chat-column-villager .connect-card-link:active"],
  ] as const) {
    const base = lastRule(surface);
    assert.ok(base.includes("--control-edge"), `${surface} has no named solid lower edge`);
    assert.match(base, /box-shadow:\s*0 4px 0/, `${surface} has no 4px resting edge`);
    assert.ok(base.includes("var(--pop)"), `${surface} still uses flat motion`);
    const active = lastRule(pressed);
    assert.match(active, /box-shadow:\s*0 1px 0/, `${surface}'s edge does not compress`);
    assert.ok(active.includes("scale(.97)"), `${surface} does not compress under the pointer`);
  }
});

test("motion overshoots instead of easing out", () => {
  assert.ok(rule(".pill").includes("var(--pop)"), "the pill does not overshoot");
  assert.ok(rule(".town-face").includes("var(--pop)"), "the cast does not spring");
});

test("the cast springs when touched", () => {
  assert.ok(css.includes(".town-node:hover .town-face"), "the cast does not react to a pointer");
  assert.ok(css.includes(".town-node:active .town-face"), "the cast does not compress when touched");
});

test("menu rows are warm, borderless, staggered, and slide on hover", () => {
  assert.ok(css.includes("@keyframes lantern-arrive"), "there is no arrival to stagger");
  const menuRows = [
    ".chat-column-villager .followup-chip",
    ".brain-item",
    ".switcher-item",
    ".rail-project-select",
    ".project-card-open",
  ];
  for (const selector of menuRows) {
    const base = liveRuleBodies(selector);
    assert.match(base, /border:\s*0/, `${selector} is not a borderless menu row`);
    assert.ok(base.includes("border-radius: 14px"), `${selector} is not warmly rounded`);
    assert.ok(base.includes("lantern-arrive") && base.includes("backwards"),
      `${selector} has no unfreezing staggered arrival`);
    assert.ok(lastRule(`${selector}:hover:not(:disabled)`).includes("translateX(5px)"),
      `${selector} does not slide under the pointer`);
  }
  const picker = renderer("screens", "Picker.tsx");
  assert.ok(picker.includes("recent.map((r, index) =>"),
    "project rows have no stable source index for their stagger");
  assert.ok(picker.includes("data-menu-index={Math.min(index + 1, 4)}"),
    "project rows do not expose their stagger turn to CSS");
  const projectRow = lastRule(".project-card-open");
  assert.ok(projectRow.includes("flex-direction: column") && projectRow.includes("align-items: flex-start"),
    "the project name and its two metadata lines no longer stack vertically");
  for (const [nth, delay] of [[1, ".05s"], [2, ".11s"], [3, ".17s"], [4, ".23s"]] as const) {
    const turn = rule(`.project-card-open[data-menu-index="${nth}"]`);
    assert.ok(turn.includes(`animation-delay: ${delay}`),
      `project menu turn ${nth} does not have its distinct ${delay} stagger delay`);
  }
  const followupRow = rule(".chat-column-villager .followups-row");
  assert.ok(followupRow.includes("flex-direction: column"),
    "suggestions are still a horizontal chip row");
  assert.ok(followupRow.includes("rgb(246 236 225 / 5%)"),
    "suggestions do not sit in the approved warm menu");
  assert.ok(!lastRule(".chat-column-villager .followup-chip").includes("dashed"),
    "a suggestion is still a dashed chip");
  const dot = rule(".chat-column-villager .followup-chip::before");
  assert.ok(dot.includes("width: 9px") && dot.includes("border-radius: 50%"),
    "the approved menu dot is missing");
  for (const nth of [1, 2, 3]) {
    assert.ok(
      css.includes(`.chat-column-villager .followup-chip:nth-child(${nth})`),
      `suggestion ${nth} does not take its own turn`,
    );
  }
  for (const repeated of [".brain-item:nth-child(2)", ".switcher-item:nth-child(2)",
    ".rail-project:nth-of-type(2) .rail-project-select"]) {
    assert.ok(css.includes(repeated), `${repeated} is not staggered`);
  }
  for (const later of [
    ".chat-column-villager .followup-chip:nth-child(n + 4)",
    ".brain-item:nth-child(n + 4)",
    ".switcher-item:nth-child(n + 4)",
    ".rail-project:nth-of-type(n + 4) .rail-project-select",
  ]) {
    assert.ok(liveRuleBodies(later).includes("animation-delay: .23s"),
      `${later} jumps ahead of the first four menu turns`);
  }
  // `both` would leave the final keyframe's `transform: none` pinned over the
  // hover slide forever. `backwards` fills only the delay, which is the half
  // the stagger actually needs.
  assert.ok(/animation:[^;]*lantern-arrive[^;]*backwards/.test(css),
    "the staggered arrival would freeze the hover slide");
});

test("type is heavy, and the heavy face is really loaded", () => {
  assert.match(css, /body\s*{[^}]*font-weight:\s*600/s);
  assert.match(css, /h1, h2, h3\s*{[^}]*font-weight:\s*700/s);
  assert.ok(!/font-weight:\s*(?:300|400|500)\b/.test(css),
    "a renderer label is still thinner than the approved 600 minimum");
  assert.ok(!/font-weight:\s*[89]\d\d/.test(css),
    "a weight above 700 was asked for; Quicksand tops out at 700 and the rest is faux bold");
  assert.ok(renderer("main.tsx").includes("@fontsource/quicksand/700.css"),
    "700 is used but never imported, so it renders as synthesized bold");
  assert.ok(!renderer("main.tsx").includes("@fontsource/quicksand/400.css"),
    "the retired thin face is still loaded");
});

test("every focus treatment uses Cairn's approved pastel", () => {
  for (const selector of [
    ".pill:focus-visible", ".overlay-close:focus-visible", ".run-reminder:focus-visible",
    ".rail-collapse:focus-visible", ".rail-project-toggle:focus-visible",
    ".rail-action:focus-visible", ".chat-column-villager .result-card-folded:focus-visible",
    ".chat-column-villager .chat-tuck:focus-visible", ".chat-villager-chip:focus-visible",
    ".town-square-header button:focus-visible", ".town-thread-target:focus-visible",
    ".town-detail-action:focus-visible", ".town-node:focus-visible",
    ".chat-column-villager .connect-card-link:focus-visible",
    ".chat-column-villager .followup-chip:focus-visible", ".brain-item:focus-visible",
    ".switcher-item:focus-visible", ".rail-project-select:focus-visible",
    ".project-card-open:focus-visible", "textarea:focus", "input[type=\"text\"]:focus",
    "input[type=\"password\"]:focus", "input[type=\"checkbox\"]:focus-visible",
    ".push-confirm:focus",
  ]) {
    const focus = lastRule(selector);
    assert.ok(focus.includes("var(--garden-cyan)"), `${selector} still uses an old focus hue`);
    assert.match(focus, /outline:\s*3px solid/, `${selector} has no visible three-pixel ring`);
  }
});

test("every added motion has a winning reduced-motion rule and the same resting edge", () => {
  // Task 4 appended the cascade-safe block after every width query. Use that
  // final block: checking the earlier generic block would certify selectors
  // that still lose to scoped conversation rules and to the ≤620px chip rule.
  const start = css.lastIndexOf("@media (prefers-reduced-motion: reduce)");
  assert.notEqual(start, -1, "app.css has no final reduced-motion block");
  let depth = 0;
  let end = -1;
  for (let index = css.indexOf("{", start); index < css.length && end < 0; index += 1) {
    if (css[index] === "{") depth += 1;
    else if (css[index] === "}" && --depth === 0) end = index + 1;
  }
  assert.notEqual(end, -1, "app.css's final reduced-motion block never closes");
  assert.equal(css.slice(end).trim(), "",
    "a live rule follows the final reduced-motion block and can win on source order");
  const reduced = css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, "");
  const bodiesFor = (selector: string): string[] => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return [...reduced.matchAll(new RegExp(`${escaped}(?=\\s*[,\\{])`, "g"))].map((match) => {
      const open = reduced.indexOf("{", match.index!);
      const close = reduced.indexOf("}", open);
      assert.ok(open > match.index! && close > open, `${selector} has no complete reduced-motion rule`);
      return reduced.slice(open + 1, close);
    });
  };
  const has = (selector: string, declaration: string): boolean =>
    bodiesFor(selector).some((body) => body.includes(declaration));

  for (const selector of [
    ".pill", ".town-face", ".overlay-close", ".run-reminder",
    ".rail-collapse", ".rail-project-toggle", ".rail-action",
    ".chat-column-villager .followup-chip", ".brain-item", ".switcher-item",
    ".rail-project-select", ".project-card-open",
    ".chat-column-villager .result-card-folded",
    ".chat-column-villager .chat-tuck", ".chat-villager-chip",
    ".town-square-header button", ".town-thread-target", ".town-detail-action",
    ".town-node-overflow .town-overflow-shape",
    ".chat-column-villager .connect-card-link", "textarea",
    "input[type=\"text\"]", "input[type=\"password\"]", "input[type=\"checkbox\"]",
  ]) {
    assert.ok(has(selector, "transition: none"),
      `${selector} has no specificity-winning transition kill`);
  }
  assert.ok(has(".chat-column-villager .followup-chip", "animation: none"),
    "the scoped suggestion still staggers under reduced motion");
  for (const selector of [".brain-item", ".switcher-item", ".rail-project-select", ".project-card-open"]) {
    assert.ok(has(selector, "animation: none"), `${selector} still staggers under reduced motion`);
  }

  for (const selector of [
    ".pill:hover:not(:disabled)", ".pill:active:not(:disabled)",
    ".town-node:hover .town-face", ".town-node:active .town-face",
    ".overlay-close:hover:not(:disabled)", ".overlay-close:active:not(:disabled)",
    ".run-reminder:hover:not(:disabled)", ".run-reminder:active:not(:disabled)",
    ".rail-collapse:hover:not(:disabled)", ".rail-collapse:active:not(:disabled)",
    ".rail-project-toggle:hover:not(:disabled)", ".rail-project-toggle:active:not(:disabled)",
    ".rail-action:hover:not(:disabled)", ".rail-action:active:not(:disabled)",
    ".chat-column-villager .followup-chip:hover:not(:disabled)",
    ".chat-column-villager .followup-chip:active:not(:disabled)",
    ".brain-item:hover:not(:disabled)", ".brain-item:active:not(:disabled)",
    ".switcher-item:hover:not(:disabled)", ".switcher-item:active:not(:disabled)",
    ".rail-project-select:hover:not(:disabled)", ".rail-project-select:active:not(:disabled)",
    ".project-card-open:hover:not(:disabled)", ".project-card-open:active:not(:disabled)",
    ".chat-column-villager .result-card-folded:hover:not(:disabled)",
    ".chat-column-villager .result-card-folded:active:not(:disabled)",
    ".chat-column-villager .chat-tuck:hover:not(:disabled)",
    ".chat-column-villager .chat-tuck:active:not(:disabled)",
    ".town-square-header button:hover:not(:disabled)",
    ".town-square-header button:active:not(:disabled)",
    ".town-detail-action:hover:not(:disabled)",
    ".town-detail-action:active:not(:disabled)",
    ".town-node-overflow:hover .town-overflow-shape",
    ".town-node-overflow:active .town-overflow-shape",
    ".chat-column-villager .connect-card-link:hover",
    ".chat-column-villager .connect-card-link:active",
  ]) {
    assert.ok(has(selector, "transform: none"),
      `${selector} keeps its travel under reduced motion`);
  }
  for (const selector of [
    ".pill:active:not(:disabled)",
    ".overlay-close:active:not(:disabled)", ".run-reminder:active:not(:disabled)",
    ".rail-collapse:active:not(:disabled)", ".rail-project-toggle:active:not(:disabled)",
    ".rail-action:active:not(:disabled)",
    ".chat-column-villager .result-card-folded:active:not(:disabled)",
    ".chat-column-villager .chat-tuck:active:not(:disabled)",
    ".chat-villager-chip:active:not(:disabled)",
    ".town-square-header button:active:not(:disabled)",
    ".town-thread-target:active:not(:disabled)",
    ".town-detail-action:active:not(:disabled)",
    ".town-node-overflow:active .town-overflow-shape",
    ".chat-column-villager .connect-card-link:active",
  ]) {
    assert.ok(has(selector, "box-shadow: 0 4px 0"),
      `${selector} keeps the compressed one-pixel edge under reduced motion`);
  }
  assert.ok(has(".town-thread-target:hover:not(:disabled)", "translate(-50%, -50%)"));
  assert.ok(has(".town-thread-target:active:not(:disabled)", "translate(-50%, -50%)"));
  assert.ok(has(".chat-villager-chip:hover:not(:disabled)", "var(--chat-villager-rest-transform)"));
  assert.ok(has(".chat-villager-chip:active:not(:disabled)", "var(--chat-villager-rest-transform)"));
  assert.ok(has(
    ".chat-column-villager .pill-primary:active:not(:disabled)",
    "0 5px 0 var(--pill-edge), 0 8px 20px rgb(163 221 208 / 22%)",
  ), "Send loses its five-pixel edge and mint glow under reduced motion");
});

test("the tucked control keeps its centring geometry at 620px", () => {
  assert.ok(lastRule(".chat-villager-chip").includes("--chat-villager-rest-transform"));
  assert.ok(lastRule(".chat-villager-chip:hover:not(:disabled)")
    .includes("var(--chat-villager-rest-transform)"));
  assert.ok(lastRule(".chat-villager-chip:active:not(:disabled)")
    .includes("var(--chat-villager-rest-transform)"));
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.chat-villager-chip\s*\{[^}]*--chat-villager-rest-transform:\s*translateX\(-50%\)/);
});

test("the lantern's own buttons are the mockup's mint and ghost", () => {
  assert.ok(rule(".chat-column-villager .pill-primary").includes("#bfe8dd"),
    "Send is not the approved mint gradient");
  assert.ok(rule(".chat-column-villager .pill-primary").includes("#7cbdae"),
    "Send has no solid lower edge to compress");
  assert.ok(rule(".chat-column-villager .pill-primary:active:not(:disabled)").includes("0 2px 0"),
    "Send does not compress its five-pixel edge to the mockup's two pixels");
});

test("nothing in motion.css outranks the new button presses", () => {
  // `.chat-composer` holds exactly one button — the Send pill — and
  // `motion.css`'s `.chat-composer button:hover:not(:disabled)` is (0,3,1)
  // against `.pill:hover:not(:disabled)`'s (0,3,0), in a file imported AFTER
  // app.css. So a generic button rule there wins twice over, and the app's
  // most-clicked control keeps the old flat press while every test, the
  // typecheck, and both builds stay green. It happened; this is the guard.
  // Unqualified, not just `:hover`/`:active`: the bare
  // `.chat-composer button { transition: … }` shorthand alone is (0,1,1)
  // against `.pill`'s (0,1,0), which would silently drop `box-shadow` from
  // Send's transition list and make the edge snap instead of compress.
  const motion = renderer("motion.css")
    // A comment may name the selector — that is how the rule explains itself.
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Killing the transition under reduced motion is correct, and this block
    // runs to the end of the file.
    .replace(/@media \(prefers-reduced-motion: reduce\)[\s\S]*$/, "");
  for (const selector of [
    ".chat-composer button", ".town-square-header button",
    ".rail-action", ".rail-collapse",
  ]) {
    assert.ok(!motion.includes(selector),
      `a live rule in motion.css outranks the New Horizons press on ${selector}`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `app/`: `npm.cmd run test:unit`

Expected: FAIL by named contract: the pill and renderer-action edge/press tests, borderless warm menus and stagger, character spring, 600/700 type, Cairn focus, specificity-winning reduced motion, tucked-control centring, lantern button variants, source wiring for Picker/OAuth, and the live `motion.css` composer/header/rail override. A category may report several concrete selectors; do not turn this back into a failure-count comparison.

- [ ] **Step 3: Load the real heavy face and set the rounded type hierarchy**

In `app/src/renderer/main.tsx`, replace lines 1-5 with:

```typescript
import "@fontsource/quicksand/600.css";
// Decision 9, rule 5: type is rounded and heavy, never thin. Quicksand ships
// 300–700; asking for the mockup's 750–850 would get synthesized faux bold, so
// the heaviest real face is the one we load and the one we use.
import "@fontsource/quicksand/700.css";
import "./tokens.css";
import "./app.css";
import "./motion.css";
```

In `app/src/renderer/app.css`, replace lines 3-10 with:

```css
body {
  background: var(--bg); color: var(--ink);
  font-family: "Quicksand", ui-rounded, "Segoe UI", system-ui, sans-serif;
  font-size: 15.5px; line-height: 1.55; overflow-x: hidden;
  /* Decision 9, rule 5: heavy, never thin. 700 is Quicksand's real top. */
  font-weight: 600;
}
#root { min-height: 100vh; display: flex; flex-direction: column; }
h1, h2, h3 { line-height: 1.2; margin: 0 0 .35em; letter-spacing: -.01em; font-weight: 700; }
h1 { font-size: 1.65rem; }
h2 { font-size: 1.2rem; }
```

Replace the only thinner explicit weight in the renderer as well:

```css
.checkup-group-title .muted { font-weight: 600; }
```

- [ ] **Step 4: Give pills weight and turn every repeated choice into the approved warm menu**

Replace lines 22-32 (`.pill` and its variants) with:

```css
/* New Horizons pills (Decision 9, rule 5): a chunky pill with a solid lower
   edge. It lifts under the pointer and sinks onto its own edge when pressed,
   so a press has weight instead of a colour change. --pill-edge is the edge
   colour each variant sets for itself. */
.pill {
  font: inherit; font-weight: 700; font-size: .95rem; border: none; border-radius: 999px;
  padding: 11px 22px; background: var(--card-solid); color: var(--card-ink); cursor: pointer;
  /* The lower edge is opaque, not a transparent shadow pretending to be one.
     Every variant below derives its edge only from approved tokens. */
  --pill-edge: var(--lantern-deep);
  box-shadow: 0 4px 0 var(--pill-edge);
  transition: transform .3s var(--pop), box-shadow .3s var(--ease), background-color .2s, opacity .15s;
}
.pill:hover:not(:disabled) { transform: translateY(-2px) scale(1.04); }
.pill:active:not(:disabled) {
  transform: translateY(2px) scale(.97); box-shadow: 0 1px 0 var(--pill-edge);
  transition-duration: .09s;
}
.pill:focus-visible { outline: 3px solid var(--garden-cyan); outline-offset: 3px; }
.pill:disabled { opacity: .5; cursor: default; transform: none; }
.pill-primary { background: var(--green); color: var(--green-ink); --pill-edge: color-mix(in srgb, var(--green-deep) 55%, var(--lantern-deep)); }
.pill-quiet { background: transparent; color: var(--card-muted); --pill-edge: var(--lantern-deep); }
.pill-danger { background: var(--stop-soft); color: var(--stopped-text); --pill-edge: color-mix(in srgb, var(--stop) 34%, var(--lantern-deep)); }
```

Delete lines 177-184 (`.followups-row`, `.followup-chip`, and its states); preserve `.followups-label` at line 176. Append this complete replacement block immediately after Task 5's final `.town-detail-action:hover:not(:disabled)` rule, before the first reduced-motion block. That later source position is load-bearing: it lets the same row contract beat the rail, switcher, provider, and Picker base rules instead of merely coexisting with them earlier in the file.

```css
/* Menu rows (Decision 9, rule 5), copied from lantern-v3's approved menu.
   They are warm choices, not miniature action buttons: no dashed chip, no
   lower edge. The arrival fills BACKWARDS, not both, because forwards fill
   would pin `transform: none` over the hover slide after arrival. */
.chat-column-villager .followups-row {
  display: flex; flex-direction: column; flex-wrap: nowrap; gap: 7px;
  padding: 9px; border: 1px solid rgb(246 236 225 / 11%); border-radius: 20px;
  background: rgb(246 236 225 / 5%);
}
.brain-list {
  display: flex; flex-direction: column; gap: 7px; margin: 12px 0; padding: 9px;
  border: 1px solid rgb(246 236 225 / 11%); border-radius: 20px;
  background: rgb(246 236 225 / 5%);
}
.switcher-list {
  padding: 9px; border: 1px solid rgb(246 236 225 / 11%); border-radius: 20px;
}
.chat-column-villager .followup-chip,
.brain-item,
.switcher-item,
.rail-project-select,
.project-card-open {
  display: flex; align-items: center; width: 100%; gap: 10px;
  padding: 11px 13px; border: 0; border-radius: 14px;
  background: transparent; font: inherit; font-size: .85rem; font-weight: 700;
  text-align: left; cursor: pointer;
  animation: lantern-arrive .5s var(--pop) backwards;
  transition: transform .3s var(--pop), background-color .2s;
}
.chat-column-villager .followup-chip,
.brain-item,
.switcher-item,
.project-card-open { color: var(--card-ink); }
.rail-project-select { color: var(--rail-ink); }
.brain-item { flex-direction: column; align-items: flex-start; }
.brain-toggle { border: 0; }
.project-card-open {
  flex: 1; min-width: 0; flex-direction: column; align-items: flex-start;
}
.chat-column-villager .followup-chip { max-width: 100%; }
/* The dots repeat the approved menu's pastel rhythm; they are decorative and
   deliberately do not claim semantics for suggestions that have none. */
.chat-column-villager .followup-chip::before {
  content: ""; width: 9px; height: 9px; flex: none; border-radius: 50%;
  background: var(--menu-dot, var(--garden-cyan));
}
.chat-column-villager .followup-chip:nth-child(1) { --menu-dot: var(--garden-cyan); animation-delay: .05s; }
.chat-column-villager .followup-chip:nth-child(2) { --menu-dot: var(--pond-task); animation-delay: .11s; }
.chat-column-villager .followup-chip:nth-child(3) { --menu-dot: var(--face-kimi); animation-delay: .17s; }
.chat-column-villager .followup-chip:nth-child(n + 4) { --menu-dot: var(--face-codex); animation-delay: .23s; }
.brain-item:nth-child(1), .switcher-item:nth-child(1),
.rail-project:nth-of-type(1) .rail-project-select { animation-delay: .05s; }
.brain-item:nth-child(2), .switcher-item:nth-child(2),
.rail-project:nth-of-type(2) .rail-project-select { animation-delay: .11s; }
.brain-item:nth-child(3), .switcher-item:nth-child(3),
.rail-project:nth-of-type(3) .rail-project-select { animation-delay: .17s; }
.brain-item:nth-child(n + 4),
.switcher-item:nth-child(n + 4),
.rail-project:nth-of-type(n + 4) .rail-project-select { animation-delay: .23s; }
.project-card-open[data-menu-index="1"] { animation-delay: .05s; }
.project-card-open[data-menu-index="2"] { animation-delay: .11s; }
.project-card-open[data-menu-index="3"] { animation-delay: .17s; }
.project-card-open[data-menu-index="4"] { animation-delay: .23s; }
.chat-column-villager .followup-chip:hover:not(:disabled),
.brain-item:hover:not(:disabled),
.switcher-item:hover:not(:disabled),
.rail-project-select:hover:not(:disabled),
.project-card-open:hover:not(:disabled) {
  background: rgb(246 236 225 / 10%); transform: translateX(5px) scale(1.02);
}
.chat-column-villager .followup-chip:active:not(:disabled),
.brain-item:active:not(:disabled),
.switcher-item:active:not(:disabled),
.rail-project-select:active:not(:disabled),
.project-card-open:active:not(:disabled) {
  transform: translateX(5px) scale(.98); transition-duration: .09s;
}
.chat-column-villager .followup-chip:focus-visible,
.brain-item:focus-visible,
.switcher-item:focus-visible,
.rail-project-select:focus-visible,
.project-card-open:focus-visible {
  outline: 3px solid var(--garden-cyan); outline-offset: 2px;
}
.chat-column-villager .followup-chip:disabled { opacity: .5; cursor: default; }
@keyframes lantern-arrive {
  from { opacity: 0; transform: translateY(10px) scale(.94); }
  to { opacity: 1; transform: none; }
}
```

- [ ] **Step 5: Make the cast spring without fighting its existing transforms**

Replace lines 572-574 (`.town-face`) with:

```css
/* The cast springs when touched (Decision 9, rule 5). The transform lives on
   .town-face, which carries none of its own — .town-face-holo owns the float,
   .town-face-tilt owns the tilt, so nothing here fights either. */
.town-face {
  position: relative; z-index: 1; width: 78px; height: 78px; display: block; margin-bottom: 4px;
  transition: transform .45s var(--pop);
}
.town-node:hover .town-face { transform: scale(1.06); }
.town-node:active .town-face { transform: scale(.94); }
```

- [ ] **Step 6: Make every new movement yield at winning specificity**

Keep the earlier baseline reduced-motion block at lines 718–723. It still kills the old one-class animation rules, but it is too early and too weak to own the new scoped controls. Replace the final cascade-safe block that Task 4 appended at the end of `app/src/renderer/app.css` with this complete winning block:

```css
/* Cascade-safe reduced motion. A media query adds no specificity, so every
   selector repeats the live selector it defeats and this block stays at EOF.
   The same final state remains: action edges stay raised, menu rows stay
   borderless and arrived, fields keep their focus state, and centred controls
   keep their coordinate transform. Nothing travels there. */
@media (prefers-reduced-motion: reduce) {
  .chat-column.chat-column-villager { animation: none; transition: none; }
  .pill, .town-face, .overlay-close, .run-reminder,
  .rail-collapse, .rail-project-toggle, .rail-action,
  .chat-column-villager .followup-chip, .brain-item, .switcher-item,
  .rail-project-select, .project-card-open,
  .chat-column-villager .result-card-folded,
  .chat-column-villager .chat-tuck,
  .chat-villager-chip, .town-square-header button,
  .town-thread-target, .town-detail-action,
  .town-node-overflow .town-overflow-shape,
  .chat-column-villager .connect-card-link,
  textarea, input[type="text"], input[type="password"], input[type="checkbox"],
  .push-confirm { transition: none; }

  .chat-column-villager .followup-chip, .brain-item, .switcher-item,
  .rail-project-select, .project-card-open { animation: none; }

  .pill:hover:not(:disabled), .pill:active:not(:disabled),
  .town-node:hover .town-face, .town-node:active .town-face,
  .overlay-close:hover:not(:disabled), .overlay-close:active:not(:disabled),
  .run-reminder:hover:not(:disabled), .run-reminder:active:not(:disabled),
  .rail-collapse:hover:not(:disabled), .rail-collapse:active:not(:disabled),
  .rail-project-toggle:hover:not(:disabled), .rail-project-toggle:active:not(:disabled),
  .rail-action:hover:not(:disabled), .rail-action:active:not(:disabled),
  .chat-column-villager .followup-chip:hover:not(:disabled),
  .chat-column-villager .followup-chip:active:not(:disabled),
  .brain-item:hover:not(:disabled), .brain-item:active:not(:disabled),
  .switcher-item:hover:not(:disabled), .switcher-item:active:not(:disabled),
  .rail-project-select:hover:not(:disabled), .rail-project-select:active:not(:disabled),
  .project-card-open:hover:not(:disabled), .project-card-open:active:not(:disabled),
  .chat-column-villager .result-card-folded:hover:not(:disabled),
  .chat-column-villager .result-card-folded:active:not(:disabled),
  .chat-column-villager .chat-tuck:hover:not(:disabled),
  .chat-column-villager .chat-tuck:active:not(:disabled),
  .town-square-header button:hover:not(:disabled),
  .town-square-header button:active:not(:disabled),
  .town-detail-action:hover:not(:disabled), .town-detail-action:active:not(:disabled),
  .town-node-overflow:hover .town-overflow-shape,
  .town-node-overflow:active .town-overflow-shape,
  .chat-column-villager .connect-card-link:hover,
  .chat-column-villager .connect-card-link:active { transform: none; }

  .pill:active:not(:disabled) { box-shadow: 0 4px 0 var(--pill-edge); }
  .chat-column-villager .pill-primary:active:not(:disabled) {
    box-shadow: 0 5px 0 var(--pill-edge), 0 8px 20px rgb(163 221 208 / 22%);
  }
  .overlay-close:active:not(:disabled),
  .run-reminder:active:not(:disabled),
  .rail-collapse:active:not(:disabled),
  .rail-project-toggle:active:not(:disabled),
  .rail-action:active:not(:disabled),
  .chat-column-villager .result-card-folded:active:not(:disabled),
  .chat-column-villager .chat-tuck:active:not(:disabled),
  .town-square-header button:active:not(:disabled),
  .town-detail-action:active:not(:disabled),
  .town-node-overflow:active .town-overflow-shape,
  .chat-column-villager .connect-card-link:active {
    box-shadow: 0 4px 0 var(--control-edge);
  }
  /* These two controls have a non-zero resting transform or a second resting
     shadow, so their no-motion rule restores that complete resting state. */
  .chat-villager-chip:hover:not(:disabled),
  .chat-villager-chip:active:not(:disabled) {
    transform: var(--chat-villager-rest-transform);
    box-shadow: 0 4px 0 var(--control-edge), 0 10px 28px rgb(0 0 0 / 24%);
  }
  .town-thread-target:hover:not(:disabled),
  .town-thread-target:active:not(:disabled) {
    transform: translate(-50%, -50%);
    box-shadow: 0 4px 0 var(--control-edge), 0 4px 14px rgb(0 0 0 / 24%);
  }
}
```

- [ ] **Step 7: Carry the weighted press and Cairn focus across the complete renderer**

Append the lantern's own button variants **after** Task 4's `.chat-column-villager` children block (so their source order beats the equal-specificity globals above):

```css
/* The lantern's buttons. The globals above give every pill its chunky edge;
   these give the lantern's three the mockup's own colours. Specificity note:
   `.pill:active:not(:disabled)` is 0,3,0 and beats these 0,2,0 rules, which is
   exactly right — the press must still compress whatever the resting colour. */
/* Only the edge needs saying: `--card-solid` and `--card-ink` are already
   re-pointed on the lantern (Task 4), so the base `.pill` rule above resolves
   to exactly these values inside this scope on its own. */
.chat-column-villager .pill {
  --pill-edge: var(--lantern-deep);
}
.chat-column-villager .pill-primary {
  background: linear-gradient(165deg, #bfe8dd, var(--garden-cyan)); color: #17302b;
  --pill-edge: #7cbdae;
  box-shadow: 0 5px 0 var(--pill-edge), 0 8px 20px rgb(163 221 208 / 22%);
}
.chat-column-villager .pill-primary:active:not(:disabled) {
  box-shadow: 0 2px 0 var(--pill-edge), 0 4px 12px rgb(163 221 208 / 18%);
}
.chat-column-villager .pill-quiet {
  background: rgb(246 236 225 / 7%); color: var(--lantern-soft); --pill-edge: var(--lantern-deep);
}
.chat-column-villager .pill-quiet:hover:not(:disabled) {
  background: rgb(246 236 225 / 14%); color: var(--lantern-ink);
}
.chat-column-villager .chat-tuck {
  padding: 7px 14px; border-radius: 999px;
  color: var(--lantern-soft); font-weight: 700;
}
.chat-column-villager .chat-tuck:hover { background: rgb(246 236 225 / 14%); color: var(--lantern-ink); }
```

In `app/src/renderer/components/ConnectCard.tsx`, replace the OAuth fallback anchor's opening tag with this complete tag; leave its text and closing tag unchanged:

```tsx
            <a className="connect-card-link" href={oauthUrl}
              onClick={(event) => { event.preventDefault(); void cairn.openExternal(oauthUrl); }}>
```

The class is on the real anchor, not a decorative wrapper, so keyboard focus, hover, and press all reach the same surface.

In `app/src/renderer/screens/Picker.tsx`, first replace the successful-project map's opening expression:

```tsx
        {recent.map((r) => r.ok ? (
```

with:

```tsx
        {recent.map((r, index) => r.ok ? (
```

Then replace the project-opening button's complete opening tag, including its inline style and `onClick`, with:

```tsx
            <button type="button" className="project-card-open"
              data-menu-index={Math.min(index + 1, 4)}
              onClick={() => onOpen(r.dir)}>
```

Leave the button's existing project name, milestone, last-opened text, and closing tag unchanged. The class removes presentation from JSX while Step 4 preserves `flex: 1`, `min-width: 0`, left alignment, and the existing vertical name/milestone/last-opened stack. The capped `data-menu-index` gives the first four project rows the approved stagger and lets every later row arrive on the fourth beat rather than adding an unbounded delay.

Append this block immediately after Step 4's renderer-wide menu block — **not** beside the earlier lantern variants. That position is after the rail, conversation, and Town base rules, so equal specificity cannot erase the edge or transition later in the file, and it is still before the first reduced-motion block. It covers every visible non-pill action in the renderer. Menu rows stay under Step 4's borderless contract; character buttons stay under Step 5's face-spring contract. Special shapes keep their geometry, while the tucked chip and thread target repeat their resting transforms so a press never moves their coordinate origin:

```css
/* New Horizons on every non-pill action in the renderer. Global `.pill`
   already reaches every ordinary action; these named shapes keep their useful
   geometry while sharing the same solid edge and weighted press. */
.overlay-close,
.run-reminder,
.rail-collapse,
.rail-project-toggle,
.rail-action,
.chat-column-villager .result-card-folded,
.chat-column-villager .chat-tuck,
.chat-villager-chip,
.town-square-header button,
.town-detail-action,
.town-node-overflow .town-overflow-shape,
.chat-column-villager .connect-card-link {
  --control-edge: var(--lantern-deep);
  box-shadow: 0 4px 0 var(--control-edge);
  transition: transform .3s var(--pop), box-shadow .3s var(--ease),
    background-color .2s, border-color .2s, color .2s;
}
.chat-column-villager .connect-card-link {
  display: inline-block; padding: 5px 11px;
  border: 1px solid rgb(246 236 225 / 13%); border-radius: 999px;
  background: rgb(246 236 225 / 7%); color: var(--garden-cyan);
  font-weight: 700; text-decoration: none;
  --control-edge: var(--lantern-deep);
  box-shadow: 0 4px 0 var(--control-edge);
  transition: transform .3s var(--pop), box-shadow .3s var(--ease),
    background-color .2s, border-color .2s, color .2s;
}
.chat-column-villager .connect-card-link:focus-visible {
  outline: 3px solid var(--garden-cyan); outline-offset: 3px;
}
.overlay-close:hover:not(:disabled),
.run-reminder:hover:not(:disabled),
.rail-collapse:hover:not(:disabled),
.rail-project-toggle:hover:not(:disabled),
.rail-action:hover:not(:disabled),
.chat-column-villager .result-card-folded:hover:not(:disabled),
.chat-column-villager .chat-tuck:hover:not(:disabled),
.town-square-header button:hover:not(:disabled),
.town-detail-action:hover:not(:disabled),
.town-node-overflow:hover .town-overflow-shape,
.chat-column-villager .connect-card-link:hover {
  transform: translateY(-2px) scale(1.02);
}
.overlay-close:active:not(:disabled),
.run-reminder:active:not(:disabled),
.rail-collapse:active:not(:disabled),
.rail-project-toggle:active:not(:disabled),
.rail-action:active:not(:disabled),
.chat-column-villager .result-card-folded:active:not(:disabled),
.chat-column-villager .chat-tuck:active:not(:disabled),
.town-square-header button:active:not(:disabled),
.town-detail-action:active:not(:disabled),
.town-node-overflow:active .town-overflow-shape,
.chat-column-villager .connect-card-link:active {
  transform: translateY(2px) scale(.97); box-shadow: 0 1px 0 var(--control-edge);
  transition-duration: .09s;
}
.overlay-close:focus-visible,
.run-reminder:focus-visible,
.rail-collapse:focus-visible,
.rail-project-toggle:focus-visible,
.rail-action:focus-visible,
.chat-column-villager .result-card-folded:focus-visible,
.chat-column-villager .chat-tuck:focus-visible,
.chat-villager-chip:focus-visible,
.town-square-header button:focus-visible,
.town-thread-target:focus-visible,
.town-detail-action:focus-visible,
.town-node:focus-visible {
  outline: 3px solid var(--garden-cyan); outline-offset: 3px;
}
textarea, input[type="text"], input[type="password"] {
  border-radius: 18px; font-weight: 600;
  transition: border-color .2s, box-shadow .2s;
}
textarea:focus,
input[type="text"]:focus,
input[type="password"]:focus {
  border-color: var(--garden-cyan);
  outline: 3px solid var(--garden-cyan); outline-offset: 2px;
}
input[type="checkbox"] {
  accent-color: var(--garden-cyan);
  transition: outline-color .2s;
}
input[type="checkbox"]:focus-visible {
  outline: 3px solid var(--garden-cyan); outline-offset: 2px;
}
.push-confirm { transition: border-color .2s, box-shadow .2s; }
.push-confirm:focus {
  border-color: var(--garden-cyan);
  outline: 3px solid var(--garden-cyan); outline-offset: 2px;
}
.chat-villager-chip {
  --chat-villager-rest-transform: translateX(0);
  --control-edge: var(--lantern-deep);
  box-shadow: 0 4px 0 var(--control-edge), 0 10px 28px rgb(0 0 0 / 24%);
  transition: transform .3s var(--pop), box-shadow .3s var(--ease),
    background-color .2s, border-color .2s, color .2s;
}
.chat-villager-chip:hover:not(:disabled) {
  transform: var(--chat-villager-rest-transform) translateY(-2px) scale(1.02);
}
.chat-villager-chip:active:not(:disabled) {
  transform: var(--chat-villager-rest-transform) translateY(2px) scale(.97);
  box-shadow: 0 1px 0 var(--control-edge), 0 7px 20px rgb(0 0 0 / 24%);
  transition-duration: .09s;
}
.town-thread-target {
  --control-edge: var(--lantern-deep);
  box-shadow: 0 4px 0 var(--control-edge), 0 4px 14px rgb(0 0 0 / 24%);
  transition: left 320ms var(--spring), top 320ms var(--spring),
    transform .3s var(--pop), box-shadow .3s var(--ease), background-color .2s;
}
.town-thread-target:hover:not(:disabled) {
  transform: translate(-50%, calc(-50% - 2px)) scale(1.02);
}
.town-thread-target:active:not(:disabled) {
  transform: translate(-50%, calc(-50% + 2px)) scale(.97);
  box-shadow: 0 1px 0 var(--control-edge), 0 3px 10px rgb(0 0 0 / 24%);
  transition-duration: .09s;
}
```

In the existing `@media (max-width: 620px)` block, replace its `.chat-villager-chip` rule with this version. The custom property is the chip's resting coordinate system; every hover, press, and reduced-motion rule above composes with it instead of dropping the centring transform:

```css
  .chat-villager-chip {
    left: 50%; top: auto; bottom: 16%;
    --chat-villager-rest-transform: translateX(-50%);
    transform: var(--chat-villager-rest-transform);
    max-width: calc(100% - 32px); animation: none;
  }
```

- [ ] **Step 8: Retire the later stylesheet rules that would outrank the treatment**

In `app/src/renderer/motion.css`, retire the generic composer, Town-header, and rail button treatments that the new rules supersede. **This is the step that makes the task real across rooms.** `.chat-composer button` outranks `.pill`; the Town-header selector likewise replaces the new overshoot; and the rail selectors load after `app.css` and flatten the rail's approved press. None may survive as a live rule.

Delete the complete baseline block from `/* Buttons respond under the pointer. */` through the last `.rail-collapse:active` rule. Decision 9 names no rail exception; put this ownership comment in its place:

```css
/* Renderer actions live in app.css, where the complete New Horizons edge,
   overshoot, focus, pressed state, and reduced-motion rest state stay together. */
```

In the same file's reduced-motion block, replace its transition selector list with the only two motion.css-owned transitions still needing a kill:

```css
  .town-node, .town-pond-layer { transition: none; }
```

After this edit, `motion.css` contains no live or reduced selector for composer, Town-header, or rail buttons; the final `app.css` block owns all of them at the same specificity as their live rules.

- [ ] **Step 9: Run tests to verify they pass**

Run from `app/`: `npm.cmd run test:unit` — Expected: PASS, all tests.

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0.

Run from `app/`: `npm.cmd run build:vite` — Expected: builds clean.

Run from `app/`: `npm.cmd run build:lab` — Expected: builds clean.

- [ ] **Step 10: Commit**

```powershell
git add app/src/renderer/main.tsx app/src/renderer/components/ConnectCard.tsx app/src/renderer/screens/Picker.tsx app/src/renderer/app.css app/src/renderer/motion.css app/tests-unit/newhorizons.test.ts
git commit -m "New Horizons treatment: pills with weight, springs, staggered suggestions"
```

---

### Task 7: Make reduced motion win the cascade

**Files:**
- Modify: `app/src/renderer/motion.css` (repeat all eight state-specific face selectors in its reduced-motion block)
- Modify: `app/src/renderer/app.css` (extend the final cascade-safe reduced-motion block)
- Test: `app/tests-unit/reducedmotion.test.ts` (create)

**Interfaces:**
- Consumes: the one-shot lantern entrance from Task 4 and the renderer-wide action, menu, field, and character motion from Task 6.
- Produces: a final `app.css` reduced-motion block that Task 8 extends with the pond-line selectors.

This is its own task because the failure mode crosses stylesheets: a rule can exist, match the element, and still lose. `motion.css` is imported after `app.css`, but source order only settles equal specificity. The cast's state-pop rules and blink rules use compound selectors; a one-class kill does not override them.

- [ ] **Step 1: Write the failing test**

Create `app/tests-unit/reducedmotion.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (file: string) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", file), "utf8");
const app = renderer("app.css");
const motion = renderer("motion.css");

function finalReduced(source: string): { start: number; block: string } {
  const start = source.lastIndexOf("@media (prefers-reduced-motion: reduce)");
  assert.notEqual(start, -1, "stylesheet has no reduced-motion block");
  return { start, block: source.slice(start) };
}

function ruleBodyFor(block: string, selector: string): string {
  const selectorAt = block.indexOf(selector);
  assert.notEqual(selectorAt, -1, `${selector} is absent from the final reduced-motion block`);
  const open = block.indexOf("{", selectorAt);
  const close = block.indexOf("}", open);
  assert.ok(open > selectorAt && close > open, `${selector} has no complete reduced-motion rule`);
  return block.slice(open + 1, close);
}

test("motion.css repeats every state-pop selector at winning specificity", () => {
  const reduced = finalReduced(motion);
  for (const state of [
    "ready", "thinking", "starting", "working",
    "checking", "done", "stopped", "error",
  ]) {
    const selector = `.town-node-${state} .town-face-svg`;
    const first = motion.indexOf(selector);
    const last = motion.lastIndexOf(selector);
    assert.notEqual(first, -1, `${selector} has no animated rule`);
    assert.ok(ruleBodyFor(reduced.block, selector).includes("animation: none"),
      `${selector}'s winning rule does not set animation: none`);
    assert.ok(last > first && last >= reduced.start,
      `${selector}'s animation declaration wins by specificity or source order`);
  }
});

test("app.css repeats every compound blink selector after the animation", () => {
  const reduced = finalReduced(app);
  for (const selector of [
    ".town-face-blink-single .town-face-eye",
    ".town-face-blink-double .town-face-eye-l",
    ".town-face-blink-slow .town-face-eye",
    ".town-face-blink-alternate .town-face-eye-l",
    ".town-face-blink-alternate .town-face-eye-r",
    ".town-face-blink-squeeze .town-face-eye",
    ".town-face-mark-gemini path:nth-child(1)",
    ".town-face-mark-gemini path:nth-child(2)",
  ]) {
    assert.ok(ruleBodyFor(reduced.block, selector).includes("animation: none"),
      `${selector}'s winning rule does not set animation: none`);
  }
  assert.ok(reduced.start > app.indexOf("@keyframes town-face-blink"),
    "the blink declarations come after their reduced-motion kill");
});

test("the final block carries the lantern's exact compound selector", () => {
  const reduced = finalReduced(app).block;
  const match = reduced.match(/^\s*\.chat-column\.chat-column-villager\s*[,{]/m);
  assert.ok(match, "a weaker selector is standing in for the lantern selector");
  const start = reduced.indexOf(match![0]);
  const winner = reduced.slice(start, reduced.indexOf("}", start));
  assert.ok(winner.includes("animation: none"), "the lantern entrance is not stopped");
  assert.ok(winner.includes("transition: none"), "the lantern still travels between states");
});

test("the lantern never gains an infinite container sway", () => {
  assert.ok(!app.includes("lantern-sway"));
  const start = app.indexOf(".chat-column.chat-column-villager {");
  const panel = app.slice(start, app.indexOf("}", start));
  assert.ok(!/animation:[^;]*infinite/.test(panel));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `app/`: `npm.cmd run test:unit`

Expected: FAIL. The state-pop and compound-blink tests name the first missing winning selector. The exact lantern selector and no-sway tests pass because Task 4 already established them.

- [ ] **Step 3: Write minimal implementation**

In the existing `@media (prefers-reduced-motion: reduce)` block at the end of `app/src/renderer/motion.css`, add these selectors after the existing animation and transition kills:

```css
  /* `town-face-pop` is declared on eight compound selectors above. The old
     one-class `.town-face-svg` kill matched but lost; repeat them verbatim so
     source order settles equal specificity. */
  .town-node-ready .town-face-svg,
  .town-node-thinking .town-face-svg,
  .town-node-starting .town-face-svg,
  .town-node-working .town-face-svg,
  .town-node-checking .town-face-svg,
  .town-node-done .town-face-svg,
  .town-node-stopped .town-face-svg,
  .town-node-error .town-face-svg { animation: none; }
```

In the final cascade-safe reduced-motion block that Task 6 completed at the end of `app/src/renderer/app.css`, insert these selectors immediately before that block's closing brace. Do **not** replace or remove its renderer-wide action/menu/field kills, resting-edge rules, centred-thread rule, or tucked-chip rule; `newhorizons.test.ts` continues to pin all of them.

```css
  /* These compound blink and mark selectors outrank the baseline one-class
     kill. Repeating them inside the already-final block makes source order
     settle equal specificity without weakening Task 6's control coverage. */
  .town-face-blink-single .town-face-eye,
  .town-face-blink-double .town-face-eye-l,
  .town-face-blink-slow .town-face-eye,
  .town-face-blink-alternate .town-face-eye-l,
  .town-face-blink-alternate .town-face-eye-r,
  .town-face-blink-squeeze .town-face-eye,
  .town-face-mark-gemini path:nth-child(1),
  .town-face-mark-gemini path:nth-child(2) { animation: none; }
```

- [ ] **Step 4: Run checks to verify they pass**

Run from `app/`:

```powershell
npm.cmd run test:unit
npm.cmd run typecheck
npm.cmd run build:vite
```

Expected: all unit tests pass; typecheck is silent with exit 0; Vite builds clean.

- [ ] **Step 5: Commit**

```powershell
git add app/src/renderer/app.css app/src/renderer/motion.css app/tests-unit/reducedmotion.test.ts
git commit -m "Make reduced motion win the renderer cascade"
```

---

### Task 8: The narrow window — a line, or the whole pond

**Files:**
- Create: `app/src/renderer/components/PondLine.tsx`
- Modify: `app/src/renderer/town/presentation.ts` (append two pure functions)
- Modify: `app/src/renderer/town/layout.ts` (name the wide-layout shore and separate render policy from saved drag policy)
- Modify: `app/src/renderer/screens/Workspace.tsx` (the narrow query, `pondOpen`, `chatNeedsYou`, the pane)
- Modify: `app/src/renderer/screens/Chat.tsx:368-373` (the new prop), `~:992` (publish it)
- Modify: `app/src/renderer/components/TownSquare.tsx:172-190` (the `wholePond` prop), `:206-214`, `:307-314` (the shore)
- Modify: `app/lab/chatmock-view.tsx` (the second `<TownSquare>` call site — `wholePond={false}`)
- Modify: `app/src/renderer/app.css` — a `.pond-line` base rule, and a new `@media (max-width: 1260px)` block **after** the existing `@media (min-width: 621px) and (max-width: 1260px)` block
- Modify: `app/tests/conductor.spec.ts:1064-1104` (the 760×620 block)
- Modify: `app/tests/projects.spec.ts` (the existing 900px scenario uses the tucked chip; Cairn's node remains the wide affordance)
- Test: `app/tests-unit/pondline.test.ts` (create)

**Interfaces:**
- Consumes: `TownRuntimePresentation` and `townPresentationStatus` from `town/presentation.ts`; `TOWN_BOUNDS` from `town/layout.ts`; `--pop`, `--ease`, `--lantern-ink`, `--lantern-soft` from Task 2; the `--control-edge` button contract from Task 6; the final reduced-motion block from Task 7.
- Produces: `pondLineTone(state, needsYou)`, `pondLineLabel(state, needsYou)`, `TOWN_SHORE_BESIDE_CHAT`, `townShore(wholePond)`, the `PondLine` component, `TownSquare`'s required `wholePond` prop, and Chat's optional `onNeedsYouChange` prop.

All four explored panel directions failed at 760×620, each differently, and all for one reason: each tried to shrink its wide layout. A first attempt kept a reduced pond as a band and the owner's verdict was that it *"reads more consolation prize"*, which settled the rule:

> **A line is honest because it is a line. A small pond is dishonest because it pretends to be a picture.**

So: the pond is never reduced. At any width it is either its whole self or it is a sentence. Below 1260px the conversation is the default and takes the window; a status line at the top carries who is working and the water's state, and pressing it opens the pond **whole**, over the window.

Three things this needs from the existing code rather than from new invention:

1. **The needs-you signal is Task 155's, published, not recomputed.** `Chat.tsx:988` already computes `needsYou` from the proposal, dispatch, and push flows. Two independent answers to "is something waiting?" would eventually disagree, and the line would be the one that lied.
2. **The line's words are `townPresentationStatus`'s.** No second notion of what the water is doing.
3. **The whole pond renders to the whole width, but a drag still saves at the wide-layout shore.** Rendering relaxes from `0.52` to `TOWN_BOUNDS.maxX` when the conversation is away. Persistence deliberately stays at `0.52`, because a narrow window has no Reset control and a saved point beyond the wide shore would later be clamped invisibly behind the conversation. This leaves the owner-approved, documented tradeoff: grabbing a villager beyond that invisible saved shore makes it jump left. Preserve it; do not reopen it in implementation.

`1260px` and `620px` are the only breakpoints used. The new rules go in a **second** `@media (max-width: 1260px)` block placed after the existing `@media (min-width: 621px) and (max-width: 1260px)` block, because that block sets `left`, `width`, and `.town-square-ground { right: 152px }` at equal specificity and would otherwise win on source order. That is placement, not a new breakpoint.

- [ ] **Step 1: Write the failing test**

Create `app/tests-unit/pondline.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RunSessionSnapshot } from "../src/shared/ipc.js";
import {
  hydrateTownPresentation,
  pondLineLabel,
  pondLineTone,
} from "../src/renderer/town/presentation.js";
import { TOWN_BOUNDS, TOWN_SHORE_BESIDE_CHAT, townShore } from "../src/renderer/town/layout.js";

function session(overrides: Partial<RunSessionSnapshot> = {}): RunSessionSnapshot {
  return {
    dir: "C:\\project",
    outcome: "Make the pond explain the work",
    adapterId: "codex-exec",
    conversationId: "conversation-1",
    worker: true,
    startedAt: "2026-08-02T12:00:00.000Z",
    activities: [],
    phase: "running",
    result: null,
    error: null,
    ...overrides,
  };
}

const runWorking = { stage: "Run", state: "working", detail: "Codex Exec is working." } as const;

/**
 * The narrow window, resolved 2026-08-03 and owner-approved. Below 1260px the
 * conversation takes the window and the pond becomes a line you can press. The
 * line is honest because it is a line: it never pretends to be a picture, so
 * it cannot read as a shrunken one.
 */
test("the line says who is working, in the pond's own words", () => {
  const working = hydrateTownPresentation(session({ activities: [runWorking] }), null);
  assert.equal(pondLineLabel(working, false), "Codex Exec worker is working.");
  assert.equal(pondLineTone(working, false), "busy");
});

test("a waiting decision turns the line amber and changes what it says", () => {
  const working = hydrateTownPresentation(session({ activities: [runWorking] }), null);
  assert.equal(pondLineTone(working, true), "needs-you");
  assert.equal(
    pondLineLabel(working, true),
    "Codex Exec worker is working. Something in the conversation is waiting for you.",
  );
  assert.ok(pondLineLabel(working, true).startsWith(pondLineLabel(working, false)),
    "needs-you erased who is working and what the water is doing");
});

test("the line carries the water's settled state", () => {
  const quiet = hydrateTownPresentation(null, null);
  assert.equal(pondLineTone(quiet, false), "quiet");
  assert.equal(pondLineLabel(quiet, false), "Town is quiet.");

  const done = hydrateTownPresentation(session({
    activities: [runWorking, { stage: "Result", state: "done", detail: "DONE — verified." }],
    phase: "closed",
    result: { status: "done", disposition: "DONE" } as RunSessionSnapshot["result"],
  }), null);
  assert.equal(pondLineTone(done, false), "done");

  const stopped = hydrateTownPresentation(session({
    activities: [{ stage: "Run", state: "stopped", detail: "The worker stopped safely." }],
    phase: "closed",
  }), null);
  assert.equal(pondLineTone(stopped, false), "stopped");
});

test("a decision waiting outranks everything else the water is doing", () => {
  // Amber is the one state the owner has to act on; nothing may bury it.
  for (const state of [
    hydrateTownPresentation(null, null),
    hydrateTownPresentation(session({ activities: [runWorking] }), null),
  ]) {
    assert.equal(pondLineTone(state, true), "needs-you");
  }
});

test("the whole pond gives the cast the whole width", () => {
  assert.equal(townShore(false), TOWN_SHORE_BESIDE_CHAT);
  assert.equal(townShore(true), TOWN_BOUNDS.maxX);
  assert.ok(townShore(true) > townShore(false), "the whole pond is no wider than the shore");
});

test("the whole-pond shore is wired to the prop, not pinned to a constant", () => {
  const town = readFileSync(
    join(__dirname, "..", "..", "src", "renderer", "components", "TownSquare.tsx"), "utf8");
  assert.match(town, /const shore = townShore\(wholePond\)/,
    "the render clamp is not wired to the wholePond prop");
});

test("a narrow drag saves to the wide-layout shore even while the whole pond renders wider", () => {
  const town = readFileSync(
    join(__dirname, "..", "..", "src", "renderer", "components", "TownSquare.tsx"), "utf8");
  const start = town.indexOf("function pointFromClient");
  const end = town.indexOf("function beginDrag", start);
  assert.notEqual(start, -1, "TownSquare has no pointFromClient drag mapping");
  assert.notEqual(end, -1, "TownSquare has no beginDrag boundary");
  const dragMapping = town.slice(start, end);
  assert.match(dragMapping, /Math\.min\(TOWN_SHORE_BESIDE_CHAT,/,
    "a narrow drag can save beyond the shore the wide layout can show");
  assert.ok(!dragMapping.includes("Math.min(shore,"),
    "the render-only whole-pond shore leaked into saved drag positions");
});

const css = readFileSync(join(__dirname, "..", "..", "src", "renderer", "app.css"), "utf8");

/** The final 1260px block, brace-balanced so later rules cannot satisfy it. */
function narrowBlock(): string {
  const start = css.lastIndexOf("@media (max-width: 1260px)");
  assert.notEqual(start, -1, "app.css has no narrow-window block");
  let depth = 0;
  for (let index = css.indexOf("{", start); index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    else if (css[index] === "}" && --depth === 0) return css.slice(start, index + 1);
  }
  return assert.fail("app.css's narrow-window block never closes");
}

/** The existing 620px block, brace-balanced so the later 1260px block cannot
 * silently undo its one-column facts layout at the smallest window. */
function smallestBlock(): string {
  const start = css.indexOf("@media (max-width: 620px)");
  assert.notEqual(start, -1, "app.css has no smallest-window block");
  let depth = 0;
  for (let index = css.indexOf("{", start); index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    else if (css[index] === "}" && --depth === 0) return css.slice(start, index + 1);
  }
  return assert.fail("app.css's smallest-window block never closes");
}

function finalReducedMotionBlock(): string {
  const start = css.lastIndexOf("@media (prefers-reduced-motion: reduce)");
  assert.notEqual(start, -1, "app.css has no final reduced-motion block");
  return css.slice(start);
}

function ruleBodyFor(block: string, selector: string): string {
  const selectorAt = block.indexOf(selector);
  assert.notEqual(selectorAt, -1, `${selector} has no rule in the selected block`);
  const open = block.indexOf("{", selectorAt);
  const close = block.indexOf("}", open);
  assert.ok(open > selectorAt && close > open, `${selector} has no complete rule`);
  return block.slice(open + 1, close);
}

test("the later 1260px block preserves the existing one-column 620px facts layout", () => {
  assert.ok(!narrowBlock().includes(".route-facts"),
    "the later narrow block outranks the smallest window's one-column facts grid");
  assert.ok(ruleBodyFor(smallestBlock(), ".route-facts").includes("grid-template-columns: 1fr"),
    "the existing smallest-window facts grid is no longer one column");
});

test("the pond is never reduced — it is whole, or it is a line", () => {
  // Wide: the line is not there at all. Narrow: the line is, and the pond's
  // contents wait behind it. Nothing anywhere shrinks the pond to fit.
  const base = css.slice(css.indexOf("\n.pond-line {"), css.indexOf("}", css.indexOf("\n.pond-line {")));
  assert.ok(base.includes("display: none"), "the line shows on the approved wide layout");
  const narrow = narrowBlock();
  assert.ok(narrow.includes(".pond-line { display: flex"), "the line never appears at any width");
  assert.match(narrow, /\.town-square-ground\s*[,{][^{}]*\{[^{}]*visibility:\s*hidden/,
    "the pond's contents do not wait behind the line");
});

test("the landed lantern releases the properties the pond-open transition needs", () => {
  const narrow = narrowBlock();
  const panel = ruleBodyFor(narrow, ".chat-column.chat-column-villager");
  assert.match(panel, /animation:\s*villager-rise[^;]*backwards/,
    "the narrow entrance does not release transform and opacity after landing");
  assert.ok(!/animation:[^;]*(?:both|forwards)/.test(panel),
    "the entrance's forward fill masks the pond-open slide and fade");
  const openPanel = ruleBodyFor(
    narrow, ".workspace-town-pane-pond-open .chat-column.chat-column-villager",
  );
  assert.ok(openPanel.includes("transform: translateY(102%)"),
    "opening the pond does not slide the conversation away");
  assert.ok(openPanel.includes("opacity: .35"),
    "opening the pond does not fade the conversation as approved");
});

test("no new breakpoint was invented for the narrow window", () => {
  const widths = [...css.matchAll(/@media \(m(?:in|ax)-width: (\d+)px\)/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(widths)].sort(), ["1260", "620", "621"]);
});

test("needs-you amber cannot be replaced by the generic hover wash", () => {
  assert.ok(css.includes(".pond-line:not(.pond-line-needs-you):hover"),
    "the generic hover selector still outranks the needs-you line");
  assert.ok(!css.includes("\n.pond-line:hover"),
    "an unqualified hover rule can replace the needs-you background");
});

test("the line and Back button continue New Horizons on every interactive surface", () => {
  for (const [surface, pressed] of [
    [".pond-line", ".pond-line:active:not(:disabled)"],
    [".pond-back", ".pond-back:active:not(:disabled)"],
  ] as const) {
    const base = ruleBodyFor(css, surface);
    assert.ok(base.includes("--control-edge"), `${surface} has no named lower edge`);
    assert.match(base, /box-shadow:\s*0 4px 0/, `${surface} has no solid resting edge`);
    assert.ok(base.includes("var(--pop)"), `${surface} has no overshoot treatment`);
    const active = ruleBodyFor(css, pressed);
    assert.match(active, /box-shadow:\s*0 1px 0/, `${surface}'s edge does not compress`);
  }
});

test("every narrow transition reaches the same final state under reduced motion", () => {
  const reduced = finalReducedMotionBlock();
  const openPanel = ruleBodyFor(
    reduced, ".workspace-town-pane-pond-open .chat-column.chat-column-villager",
  );
  assert.ok(openPanel.includes("animation: none"), "the narrow panel still re-enters");
  assert.ok(openPanel.includes("transition: none"), "the narrow panel still travels away");
  for (const selector of [".pond-line", ".pond-line-chevron", ".pond-back"]) {
    assert.ok(ruleBodyFor(reduced, selector).includes("transition: none"),
      `${selector} still transitions under reduced motion`);
  }
  assert.ok(ruleBodyFor(reduced, ".pond-back:hover").includes("translateX(-50%)"),
    "the reduced-motion Back button loses its required centring transform");
  assert.ok(!ruleBodyFor(reduced, ".pond-back:hover").includes("translateY"),
    "the reduced-motion Back button still lifts on hover");
  assert.ok(ruleBodyFor(reduced, ".pond-line:active:not(:disabled)").includes("transform: none"),
    "the reduced-motion status line still sinks on press");
  assert.match(ruleBodyFor(reduced, ".pond-line:active:not(:disabled)"), /box-shadow:\s*0 4px 0/,
    "the reduced-motion status line keeps its compressed one-pixel edge");
  assert.ok(ruleBodyFor(reduced, ".pond-back:active:not(:disabled)").includes("translateX(-50%)"),
    "the reduced-motion Back button loses its centring rest pose on press");
  assert.ok(!ruleBodyFor(reduced, ".pond-back:active:not(:disabled)").includes("translateY"),
    "the reduced-motion Back button still sinks on press");
  assert.match(ruleBodyFor(reduced, ".pond-back:active:not(:disabled)"), /box-shadow:\s*0 4px 0/,
    "the reduced-motion Back button keeps its compressed one-pixel edge");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `app/`: `npm.cmd run test:unit`

Expected: FAIL at the TypeScript build step. It names the missing `pondLineLabel` / `pondLineTone` exports from `presentation.js` and the missing `TOWN_SHORE_BESIDE_CHAT` / `townShore` exports from `layout.js`.

- [ ] **Step 3: Add the pure line and shore policies**

In `app/src/renderer/town/layout.ts`, immediately after `TOWN_BOUNDS`, add:

```typescript
/** The wide conversation occupies the right side of the Town. */
export const TOWN_SHORE_BESIDE_CHAT = 0.52;

/**
 * The render shore. A whole narrow pond has no conversation beside it, so the
 * cast may use the layout's full x bound. Saved drag coordinates deliberately
 * keep using TOWN_SHORE_BESIDE_CHAT in TownSquare: there is no Reset control at
 * narrow widths, and a point saved farther right would later hide behind the
 * wide conversation.
 */
export function townShore(wholePond: boolean): number {
  return wholePond ? TOWN_BOUNDS.maxX : TOWN_SHORE_BESIDE_CHAT;
}
```

Append to `app/src/renderer/town/presentation.ts`:

```typescript
export type PondLineTone = "quiet" | "busy" | "needs-you" | "done" | "stopped";

/**
 * The narrow window's status line (Decision 9, resolved 2026-08-03). Below
 * 1260px the conversation takes the window and the pond becomes a sentence the
 * owner can go and look at — so this line carries who is working and what
 * state the water is in, and turns amber when a decision is waiting.
 *
 * `needsYou` is Task 155's signal, computed once in Chat and passed in. Two
 * independent answers to "is something waiting?" would eventually disagree,
 * and the line would be the one that lied.
 */
export function pondLineTone(state: TownRuntimePresentation, needsYou: boolean): PondLineTone {
  if (needsYou) return "needs-you";
  if (state.truth === "done") return "done";
  if (state.truth === "stopped" || state.truth === "error") return "stopped";
  if (state.truth === "quiet") return "quiet";
  return "busy";
}

/** The line's words. Needs-you adds urgency; it never replaces water truth. */
export function pondLineLabel(state: TownRuntimePresentation, needsYou: boolean): string {
  const water = townPresentationStatus(state);
  return needsYou ? `${water} Something in the conversation is waiting for you.` : water;
}
```

Run from `app/`: `npm.cmd run test:unit` — Expected: the pure label/tone/shore tests now pass. The component/source-wiring, narrow CSS, hover-cascade, and narrow reduced-motion assertions remain red because those layers do not exist yet.

- [ ] **Step 4: Create the accessible status-line component**

Create `app/src/renderer/components/PondLine.tsx`:

```tsx
import { useRef } from "react";
import { pondLineLabel, pondLineTone, type TownRuntimePresentation } from "../town/presentation";

/**
 * The honest line (Decision 9, the narrow-window resolution, owner-approved
 * 2026-08-03).
 *
 * A line is honest because it is a line: it never pretends to be a picture, so
 * it cannot read as a shrunken pond. Pressing it opens the pond WHOLE, over
 * the window; the control below brings the conversation back. Above 1260px the
 * whole thing is `display: none` — the approved wide layout is untouched.
 */
export function PondLine({ presentation, needsYou, open, onToggle }: {
  presentation: TownRuntimePresentation;
  needsYou: boolean;
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  const tone = pondLineTone(presentation, needsYou);
  const lineRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" className={`pond-line pond-line-${tone}`}
        ref={lineRef}
        aria-expanded={open}
        onClick={() => onToggle(!open)}>
        <span className="pond-line-dot" aria-hidden="true" />
        <span className="pond-line-text">{pondLineLabel(presentation, needsYou)}</span>
        <span className="pond-line-peek">
          look at the pond
          <span className="pond-line-chevron" aria-hidden="true">⌃</span>
        </span>
      </button>
      {/* A sibling, not a child of the button. Buttons have Children
          Presentational: True; nesting role=status inside one can strip the
          live-region role from the accessibility tree. */}
      <span className="pond-line-live" role="status" aria-live="polite" aria-atomic="true">
        {pondLineLabel(presentation, needsYou)}
      </span>
      {open ? (
        <button type="button" className="pond-back"
          onClick={() => { onToggle(false); lineRef.current?.focus(); }}>
          Back to the conversation
        </button>
      ) : null}
    </>
  );
}
```

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0.

- [ ] **Step 5: Publish Chat's existing needs-you signal**

In `app/src/renderer/screens/Chat.tsx`, replace lines 368-377 — the whole signature, from `export function Chat({` through the `}) {` that closes its type literal — with:

```tsx
export function Chat({ dir, onBack, onOpenRun, embedded = false, focusSignal = 0, initialComposer = "", onNeedsYouChange }: {
  dir: string;
  onBack: () => void;
  onOpenRun: () => void;
  embedded?: boolean;
  focusSignal?: number;
  /** Task 160: words carried in once (a checkup suggestion) — read only at
   * mount, so later re-renders and project switches never re-seed them. */
  initialComposer?: string;
  /** Decision 9: the narrow window's status line turns amber when a decision
   * is waiting. That signal is Task 155's, computed below; this publishes it
   * rather than letting a second component work it out again. */
  onNeedsYouChange?: (needsYou: boolean) => void;
}) {
```

`useEffect` is already imported at `Chat.tsx:1`, so the effect below needs no import change.

Immediately after the `needsYou` constant (currently ending at line 991), insert:

```tsx
  // The narrow window's status line lives outside this component, so the
  // needs-you signal is published rather than recomputed there. One answer,
  // one place.
  useEffect(() => { onNeedsYouChange?.(needsYou); }, [needsYou, onNeedsYouChange]);
```

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0. The optional callback changes no existing call site yet.

- [ ] **Step 6: Separate TownSquare's render shore from its saved drag shore**

In `app/src/renderer/components/TownSquare.tsx`, replace the layout import with:

```typescript
import {
  computeTownLayout,
  townShore,
  TOWN_BOUNDS,
  TOWN_CENTER,
  TOWN_SHORE_BESIDE_CHAT,
} from "../town/layout";
```

Then add `wholePond` to the props. Replace lines 172-190 with:

```tsx
export function TownSquare({
  projectName,
  task,
  stream,
  presentation,
  positions,
  wholePond,
  onPositionsChange,
  onFocusChat,
  onOpenRun,
}: {
  projectName: string;
  task: RunSessionSnapshot | null;
  stream: ConductorStreamSnapshot | null;
  presentation: TownRuntimePresentation;
  positions: Record<string, TownPoint>;
  /** True only while the narrow window is showing the pond whole, over the
   *  conversation. There is then no shore to keep the cast behind. */
  wholePond: boolean;
  onPositionsChange: (positions: Record<string, TownPoint>) => void;
  onFocusChat: () => void;
  onOpenRun: () => void;
}) {
```

Replace lines 206-214 (the `points` memo) with:

```tsx
  // Chat is part of this same Town at every desktop width, so villagers stay
  // on the pond side of its shore — including at the 1260/1261 rail
  // breakpoint. When the narrow window shows the pond WHOLE there is no
  // conversation beside it, so the cast uses the layout's own full bound.
  // Stored coordinates are never rewritten either way.
  const shore = townShore(wholePond);
  const points = useMemo(() => Object.fromEntries(
    Object.entries({ ...automaticPoints, ...dragPoints }).map(([id, point]) => [
      id,
      { ...point, x: Math.min(point.x, shore) },
    ]),
  ), [automaticPoints, dragPoints, shore]);
```

Replace the clamp inside `pointFromClient` (line 311) with the deliberately narrower persistence bound. Do not use `shore` here:

```tsx
      x: Math.max(TOWN_BOUNDS.minX,
        Math.min(TOWN_SHORE_BESIDE_CHAT, (clientX - bounds.left) / bounds.width)),
```

In `app/lab/chatmock-view.tsx`, replace the Town call site with:

```tsx
        <div className="chatmock-town">
          {/* Never whole: this harness has no `.workspace-town-pane` and no
              narrow-window line to open the pond with, so the cast keeps the
              shore the wide layout reserves for the conversation. */}
          <TownSquare projectName="Garden Lab (mock)" task={task} stream={stream}
            presentation={hydrateTownPresentation(task, stream)}
            positions={positions} onPositionsChange={setPositions}
            wholePond={false}
            onFocusChat={() => setOpen(true)} onOpenRun={() => undefined} />
        </div>
```

In the existing `app/src/renderer/screens/Workspace.tsx` `<TownSquare>` call, add the required prop in its final line before `onPositionsChange`:

```tsx
              positions={townPresentation.positions}
              wholePond={false}
              onPositionsChange={(positions: Record<string, TownPoint>) => {
```

This is a truthful intermediate value: Workspace has not published its narrow open state yet, so the pond is not whole. Step 6 replaces this call with the final `wholePond={narrow && pondOpen}` wiring.

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0, including both `<TownSquare>` call sites.

Run from `app/`: `npm.cmd run test:unit` — Expected: the render-versus-saved-shore source assertions now pass. The CSS assertions remain red.

- [ ] **Step 7: Integrate the line and narrow open state in Workspace**

In `app/src/renderer/screens/Workspace.tsx`, add the import beside the others:

```tsx
import { PondLine } from "../components/PondLine";
```

Add these three state hooks beside `reducedMotion` (after line 58):

```tsx
  // The narrow window (Decision 9). 1260px is the app's existing breakpoint;
  // this mirrors it in JS only because the cast's shore depends on it, and
  // CSS cannot tell the layout algorithm anything.
  const [narrow, setNarrow] = useState(() => window.matchMedia?.("(max-width: 1260px)").matches ?? false);
  const [pondOpen, setPondOpen] = useState(false);
  const [chatNeedsYou, setChatNeedsYou] = useState(false);
```

Add the matching effect immediately after the existing `prefers-reduced-motion` effect (after line 140):

```tsx
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1260px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // `pondOpen` is a narrow-window state. Widening closes it so a later
  // 1261→1260 round trip returns to the conversation rather than reviving a
  // hidden open pond.
  useEffect(() => {
    if (!narrow) setPondOpen(false);
  }, [narrow]);
```

In the `activeDir` effect (line 142), add the reset beside `setError(null)`:

```tsx
    // A new active project is a new context: a stale error card from the old
    // one never follows the owner across it, and neither does an open pond.
    setError(null);
    setPondOpen(false);
    setChatNeedsYou(false);
```

Replace the `workspace-town-pane` section (lines 298-313) with:

```tsx
          <section className={`workspace-town-pane${pondOpen ? " workspace-town-pane-pond-open" : ""}`}
            aria-label="Town square">
            <PondLine presentation={runtimePresentation} needsYou={chatNeedsYou}
              open={pondOpen} onToggle={setPondOpen} />
            <TownSquare key={`town:${activeDir}`} projectName={projectStatus.facts.name || "Project"}
              task={townTask} stream={townStream}
              presentation={runtimePresentation}
              positions={townPresentation.positions}
              wholePond={narrow && pondOpen}
              onPositionsChange={(positions: Record<string, TownPoint>) => {
                const state = { ...townPresentationRef.current, positions };
                persistTownPresentation(activeDirRef.current, state);
              }}
              onFocusChat={focusChat}
              onOpenRun={() => setCenterView("task")} />
            <Chat key={`chat:${activeDir}`} dir={activeDir} embedded focusSignal={chatFocusSignal}
              initialComposer={composerSeedRef.current ?? undefined}
              onNeedsYouChange={setChatNeedsYou}
              onBack={openDashboard}
              onOpenRun={() => setCenterView("task")} />
          </section>
```

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0.

- [ ] **Step 8: Add the narrow visual language and cascade-safe reduced motion**

In `app/src/renderer/app.css`, add the line's base rule immediately after the `.workspace-town-pane` rule (currently ending at line 383):

```css
/* The narrow window's status line (Decision 9, approved 2026-08-03). Absent
   from the approved wide layout, which is untouched; the ≤1260px block below
   turns it on. */
.pond-line {
  display: none; position: absolute; z-index: 9; inset: 0 0 auto; width: 100%; height: 54px;
  align-items: center; gap: 11px; padding: 0 15px;
  border: 0; border-bottom: 1px solid rgb(246 236 225 / 9%);
  background: rgb(33 39 57 / 72%); backdrop-filter: blur(14px);
  color: var(--lantern-ink); font: inherit; font-size: .78rem; font-weight: 700;
  text-align: left; cursor: pointer;
  --control-edge: var(--lantern-deep);
  box-shadow: 0 4px 0 var(--control-edge);
  transition: transform .3s var(--pop), box-shadow .3s var(--ease), background-color .25s var(--ease);
}
.pond-line-live { display: none; }
.pond-line:not(.pond-line-needs-you):hover { background: rgb(43 51 74 / 82%); }
.pond-line:active:not(:disabled) {
  transform: translateY(2px); box-shadow: 0 1px 0 var(--control-edge);
  transition-duration: .09s;
}
.pond-line:focus-visible { outline: 3px solid var(--garden-cyan); outline-offset: -3px; }
.pond-line-dot {
  flex: none; width: 7px; height: 7px; border-radius: 50%;
  background: var(--lantern-soft); box-shadow: 0 0 9px var(--lantern-soft);
}
.pond-line-busy .pond-line-dot { background: var(--pond-task); box-shadow: 0 0 9px var(--pond-task); }
.pond-line-done .pond-line-dot { background: var(--pond-done); box-shadow: 0 0 9px var(--pond-done); }
.pond-line-stopped .pond-line-dot { background: var(--pond-stop); box-shadow: 0 0 9px var(--pond-stop); }
/* Amber is the one state the owner has to act on, so it colours the whole
   line rather than a 7px dot. Task 155's needs-you signal decides it. */
.pond-line-needs-you {
  color: var(--pond-task);
  background: color-mix(in srgb, var(--pond-task) 14%, rgb(22 27 44 / 82%));
}
.pond-line-needs-you .pond-line-dot { background: var(--pond-task); box-shadow: 0 0 9px var(--pond-task); }
.pond-line-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pond-line-peek {
  display: flex; align-items: center; gap: 6px; margin-left: auto; flex: none;
  color: var(--lantern-soft); font-size: .72rem;
}
.pond-line-chevron { transition: transform .4s var(--pop); }
.workspace-town-pane-pond-open .pond-line-chevron { transform: rotate(180deg); }
.pond-back {
  display: none; position: absolute; z-index: 10; left: 50%; bottom: 18px;
  transform: translateX(-50%); padding: 10px 20px;
  border: 1px solid rgb(246 236 225 / 16%); border-radius: 999px;
  background: rgb(33 39 57 / 88%); color: var(--lantern-ink);
  font: inherit; font-size: .78rem; font-weight: 700; cursor: pointer;
  --control-edge: var(--lantern-deep);
  box-shadow: 0 4px 0 var(--control-edge);
  transition: transform .35s var(--pop), box-shadow .3s var(--ease), background-color .2s;
}
.pond-back:hover { transform: translateX(-50%) translateY(-2px) scale(1.04); }
.pond-back:active:not(:disabled) {
  transform: translateX(-50%) translateY(2px) scale(.97);
  box-shadow: 0 1px 0 var(--control-edge); transition-duration: .09s;
}
.pond-back:focus-visible { outline: 3px solid var(--garden-cyan); outline-offset: 3px; }
```

Then add a **new** `@media (max-width: 1260px)` block immediately after the existing `@media (min-width: 621px) and (max-width: 1260px)` block (currently ending at line 806), before the Task 160 checkup comment:

```css
/* The narrow window, resolved 2026-08-03 and owner-approved.
   "A line is honest because it is a line. A small pond is dishonest because it
   pretends to be a picture." So the pond is never reduced: at this width it is
   either its whole self or it is a sentence. The conversation is the default,
   because that is where the owner acts; the pond is orientation, and
   orientation is something you go and check.
   This is a SECOND block at the SAME 1260px breakpoint, not a new one. It sits
   after the 621–1260 block because that block sets `left`, `width`, and
   `.town-square-ground { right }` at equal specificity and would otherwise win
   on source order. Do not let a CSS minifier merge the blocks: a merged block
   lands at the first one's position and resurrects the rejected small pond. */
@media (max-width: 1260px) {
  .pond-line { display: flex; }
  /* The header's role=status is hidden here. This sibling live region exists
     at exactly these widths and is visually clipped, never nested in a button. */
  .pond-line-live {
    position: absolute; display: block; width: 1px; height: 1px; overflow: hidden;
    clip-path: inset(50%); white-space: nowrap;
  }
  .workspace-town-pane-pond-open .pond-back { display: block; }

  /* The town header is replaced by the line at this width. */
  .workspace-town-pane .town-square-header { display: none; }

  /* The pond's contents wait behind the line. `visibility`, not `opacity`:
     nothing hidden may be focusable, hoverable, or reported as visible. */
  .workspace-town-pane .town-square-ground,
  .workspace-town-pane .town-empty-note,
  .workspace-town-pane .town-detail { visibility: hidden; }
  .workspace-town-pane-pond-open .town-square-ground,
  .workspace-town-pane-pond-open .town-empty-note,
  .workspace-town-pane-pond-open .town-detail { visibility: visible; }

  /* Whole, not reduced: the ground fills the pane under the line. */
  .workspace-town-pane .town-square-ground { inset: 54px 12px 12px; }
  .workspace-town-pane .town-detail { inset: auto 12px 68px 12px; }
  .workspace-town-pane .town-empty-note { inset: auto 18px 68px; }

  /* The conversation takes the window. */
  .chat-column.chat-column-villager {
    left: 11px; right: 11px; top: 65px; bottom: 11px;
    width: auto; height: auto; max-height: none; transform: none;
    border-radius: 26px; padding: 15px;
    animation: villager-rise .42s var(--spring) backwards;
    transition: transform .48s var(--pop), opacity .3s var(--ease), visibility .48s;
  }
  /* With the full width back, the top bar and run controls need none of the
     621–1260 block's cramping. */
  .chat-column-villager .chat-topbar { display: flex; }
  .chat-column-villager .run-strip-controls { flex: none; width: auto; margin-left: auto; }
  .chat-column-villager .run-strip-controls .pill { flex: none; padding: 11px 22px; font-size: .95rem; }

  /* Opening the pond puts the conversation away rather than shrinking it. */
  /* `visibility` removes every translated child from keyboard navigation;
     pointer-events alone would leave an off-screen composer tabbable. */
  .workspace-town-pane-pond-open .chat-column.chat-column-villager {
    transform: translateY(102%); opacity: .35; visibility: hidden; pointer-events: none;
  }
  .workspace-town-pane-pond-open .chat-villager-chip { display: none; }
}
```

Finally, extend Task 7's existing final reduced-motion block at the end of `app/src/renderer/app.css`: insert these exact rules immediately before its closing brace. Do not replace, duplicate, or remove the renderer-wide action/menu/field, resting-edge, centred-thread, tucked-chip, lantern, or face rules already in that block.

```css
  /* Narrow controls join the one final block; the same final state remains,
     but nothing travels there. Back's translateX is centring, not motion. */
  .workspace-town-pane-pond-open .chat-column.chat-column-villager {
    animation: none; transition: none;
  }
  .pond-line, .pond-line-chevron, .pond-back { transition: none; }
  .pond-line:active:not(:disabled) {
    transform: none; box-shadow: 0 4px 0 var(--control-edge);
  }
  .pond-back:hover,
  .pond-back:active:not(:disabled) {
    transform: translateX(-50%); box-shadow: 0 4px 0 var(--control-edge);
  }
```

Run from `app/`: `npm.cmd run test:unit` — Expected: PASS, including the generic-hover guard and rule-body assertions for every new reduced-motion selector.

- [ ] **Step 9: Replace the two existing end-to-end narrow sequences**

In `app/tests/conductor.spec.ts`, inside `a dispatched run lives in the conversation`, insert this immediately after Task 3's `quietEntries` assertion and before clicking Cairn. It proves still water at the other approved viewport with the whole pond actually open:

```typescript
  await win.setViewportSize({ width: 760, height: 620 });
  const quietPondLine = win.locator(".pond-line");
  await expect(quietPondLine).toHaveText(/Town is quiet/);
  await quietPondLine.click({ noWaitAfter: true });
  await expect(quietPondLine).toHaveAttribute("aria-expanded", "true");
  await win.waitForTimeout(2_200);
  await expect(town.locator(
    ".town-pond-contour, .town-transfer-packet, .town-transfer-ripple, .town-terminal-ripple",
  )).toHaveCount(0);
  await expect.poll(async () => town.locator(".town-skyglow").evaluate((element) => ({
    animationName: getComputedStyle(element).animationName,
    activeAnimations: element.getAnimations().filter((animation) => animation.playState !== "finished").length,
  }))).toEqual({ animationName: "none", activeAnimations: 0 });
  await win.getByRole("button", { name: "Back to the conversation" }).click({ noWaitAfter: true });
  await expect(quietPondLine).toBeFocused();
  await win.setViewportSize({ width: 1320, height: 820 });
```

Then replace `app/tests/conductor.spec.ts` lines 1064-1104 (the old 760×620 block, from the `// At the minimum supported Town size` comment through `expect(narrowLayout).toEqual({ ... });`) with:

```typescript
  // The narrow window (Decision 9, approved 2026-08-03). All four explored
  // panel directions failed here, each by shrinking its wide layout. The
  // resolution: the pond is never reduced — at 760×620 it is either its whole
  // self or it is a sentence. Closed, the conversation takes the window and
  // the cast waits behind the line; opened, the pond is whole.
  await win.setViewportSize({ width: 760, height: 620 });
  await expect(win.getByRole("button", { name: /Conductor.*worker task running/ })).toBeVisible();
  const pondLine = win.locator(".pond-line");
  const pondLive = win.locator(".pond-line-live");
  await expect(pondLine.locator('[role="status"]')).toHaveCount(0);
  await expect(pondLive).toHaveAttribute("role", "status");
  await expect(pondLive).toHaveAttribute("aria-live", "polite");
  await expect(pondLive).toHaveText("Codex Exec worker is working.");
  await expect(pondLine).toBeVisible();
  await expect(pondLine).toHaveAttribute("aria-expanded", "false");
  await expect(pondLine).toContainText("Codex Exec worker is working");
  await expect(town.locator(".town-node-cairn")).toBeHidden();
  await expect(worker).toBeHidden();
  const narrowClosed = await win.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>(".chat-column-villager")?.getBoundingClientRect();
    const pane = document.querySelector<HTMLElement>(".workspace-town-pane")?.getBoundingClientRect();
    const line = document.querySelector<HTMLElement>(".pond-line")?.getBoundingClientRect();
    if (!dialog || !pane || !line) throw new Error("Expected the narrow line and the conversation");
    const contains = (outer: DOMRect, inner: DOMRect) => inner.left >= outer.left - 1
      && inner.right <= outer.right + 1 && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
    return {
      // Takes the window, and sits clear of the line rather than under it.
      dialogTakesTheWindow: dialog.width > pane.width - 40,
      dialogClearsTheLine: dialog.top >= line.bottom - 1,
      dialogFits: contains(pane, dialog),
      controlsFit: Array.from(document.querySelectorAll<HTMLElement>(
        ".chat-topbar button, .run-strip-controls button",
      )).every((control) => contains(dialog, control.getBoundingClientRect())),
      pageFits: document.documentElement.scrollWidth <= window.innerWidth
        && document.documentElement.scrollHeight <= window.innerHeight,
    };
  });
  expect(narrowClosed).toEqual({
    dialogTakesTheWindow: true,
    dialogClearsTheLine: true,
    dialogFits: true,
    controlsFit: true,
    pageFits: true,
  });

  // Pressing the line opens the pond WHOLE, over the window. Both villagers
  // are fully inside it and clear of each other — not crowded into the half
  // that used to be reserved for the conversation.
  await pondLine.click({ noWaitAfter: true });
  await expect(pondLine).toHaveAttribute("aria-expanded", "true");
  await expect(town.locator(".town-node-cairn")).toBeVisible();
  await expect(worker).toBeVisible();
  const narrowOpen = await win.evaluate(() => {
    const town = document.querySelector<HTMLElement>(".town-square")?.getBoundingClientRect();
    const cairnNode = document.querySelector<HTMLElement>(".town-node-cairn")?.getBoundingClientRect();
    const workerNode = document.querySelector<HTMLElement>(".town-node-worker")?.getBoundingClientRect();
    if (!town || !cairnNode || !workerNode) throw new Error("Expected the whole pond at 760x620");
    const contains = (outer: DOMRect, inner: DOMRect) => inner.left >= outer.left - 1
      && inner.right <= outer.right + 1 && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
    const overlaps = (left: DOMRect, right: DOMRect) => left.left < right.right && left.right > right.left
      && left.top < right.bottom && left.bottom > right.top;
    return {
      cairnFits: contains(town, cairnNode),
      workerFits: contains(town, workerNode),
      castIsSeparate: !overlaps(cairnNode, workerNode),
      pageFits: document.documentElement.scrollWidth <= window.innerWidth
        && document.documentElement.scrollHeight <= window.innerHeight,
    };
  });
  expect(narrowOpen).toEqual({
    cairnFits: true, workerFits: true, castIsSeparate: true, pageFits: true,
  });

  // Rendering may use the far shore, but dragging still saves at the shore
  // the wide layout can show. Narrow has no Reset control, so persistence may
  // not put a villager invisibly behind the later conversation.
  const narrowGroundBox = await town.locator(".town-square-ground").boundingBox();
  const narrowWorkerBox = await worker.boundingBox();
  expect(narrowGroundBox).not.toBeNull();
  expect(narrowWorkerBox).not.toBeNull();
  await win.mouse.move(
    narrowWorkerBox!.x + narrowWorkerBox!.width / 2,
    narrowWorkerBox!.y + narrowWorkerBox!.height / 2,
  );
  await win.mouse.down();
  await win.mouse.move(
    narrowGroundBox!.x + narrowGroundBox!.width * 0.9,
    narrowGroundBox!.y + narrowGroundBox!.height * 0.5,
    { steps: 6 },
  );
  await win.mouse.up();
  await expect.poll(async () => {
    const state = await win.evaluate((dir) => window.cairn.townLoad(dir), project);
    return state.ok ? state.value.positions["worker:codex-exec"]?.x : undefined;
  }).toBeCloseTo(0.52, 3);

  // One control brings the conversation back and returns keyboard focus to
  // the line that opened it rather than dropping focus onto the document.
  const backToConversation = win.getByRole("button", { name: "Back to the conversation" });
  await backToConversation.click({ noWaitAfter: true });
  await expect(pondLine).toHaveAttribute("aria-expanded", "false");
  await expect(pondLine).toBeFocused();
  await expect(town.locator(".town-node-cairn")).toBeHidden();

  // `pondOpen` is narrow state, not hidden state. Opening at 1260, widening,
  // then narrowing must return to the conversation.
  await win.setViewportSize({ width: 1260, height: 820 });
  await expect(pondLine).toBeVisible();
  await pondLine.click({ noWaitAfter: true });
  await expect(pondLine).toHaveAttribute("aria-expanded", "true");
  await win.setViewportSize({ width: 1261, height: 820 });
  await expect(pondLine).toBeHidden();
  // Hidden CSS is synchronous; this attribute proves React observed the
  // matchMedia change and cleared pondOpen before the window narrows again.
  await expect(pondLine).toHaveAttribute("aria-expanded", "false");
  await win.setViewportSize({ width: 1260, height: 820 });
  await expect(pondLine).toBeVisible();
  await expect(pondLine).toHaveAttribute("aria-expanded", "false");
  await expect(town.locator(".town-node-cairn")).toBeHidden();

  // Above 1260px nothing about any of this exists: the approved wide layout is
  // untouched, and the line is gone rather than merely hidden from view.
  await win.setViewportSize({ width: 1320, height: 820 });
  await expect(pondLine).toBeHidden();
  await expect(town.locator(".town-node-cairn")).toBeVisible();
  await expect(town.locator(".town-square-header")).toBeVisible();
```

In `app/tests/projects.spec.ts`, replace the old 900px “Cairn opens chat” sequence with this narrow/wide split. The cast is hidden behind the pond line at 900px; the tucked chip is the truthful narrow affordance, while Cairn's node remains the wide one:

```typescript
    // Narrow or wide, the bubble stays in the world; the Chat/Town tabs are gone.
    await win.setViewportSize({ width: 900, height: 720 });
    await expect(win.getByRole("tab", { name: "Chat" })).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(win.getByRole("region", { name: "Beta town square" })).toBeVisible();

    // Tucked, the chip brings the dialog back. Below 1260px the cast waits
    // behind the pond line rather than shrinking beside the conversation.
    await win.getByRole("button", { name: "Tuck the conversation away" }).click();
    await expect(dialog).toHaveCount(0);
    const chip = win.getByRole("button", { name: "Open the conversation with Cairn" });
    await expect(chip).toBeVisible();
    await chip.click();
    await expect(dialog).toBeVisible();

    await win.setViewportSize({ width: 1320, height: 820 });
    // Wide, the pond sits beside the conversation, so Cairn's node is the
    // other way back.
    await win.getByRole("button", { name: "Tuck the conversation away" }).click();
    await win.getByRole("button", { name: "Cairn, ready" }).click();
    await expect(dialog).toBeVisible();
```

- [ ] **Step 10: Run tests to verify the complete narrow behavior**

Run from `app/`: `npm.cmd run test:unit` — Expected: PASS, all tests.

Run from `app/`: `npm.cmd run typecheck` — Expected: no output, exit 0.

**There are TWO `<TownSquare>` call sites, not one:** `Workspace.tsx` and `app/lab/chatmock-view.tsx`. The lab harness has no narrow window, so `wholePond={false}` is the only truthful value there. Note that `build:lab` does **not** catch a missing prop — only `typecheck` does, because `lab/` sits inside `tsconfig.json`'s include list.

Run from `app/`: `npm.cmd run build:vite` — Expected: builds clean.

Run from `app/`: `npm.cmd run build:lab` — Expected: builds clean.

From the repository root, acquire the app mutex and run the two changed scenarios. This `finally` removes the token only when this process acquired it:

```powershell
$taskToken = Join-Path ([System.IO.Path]::GetTempPath()) "cairn-app-token"
$taskOwnsToken = $false
$conductorLog = Join-Path ([System.IO.Path]::GetTempPath()) ("cairn-plan2-task8-conductor-{0}.txt" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
try {
  New-Item -ItemType Directory -Path $taskToken -ErrorAction Stop | Out-Null
  $taskOwnsToken = $true
  Push-Location app
  try {
    npm.cmd run build:vite
    if ($LASTEXITCODE -ne 0) { throw "build:vite failed with exit code $LASTEXITCODE" }
    $conductorOutput = & .\node_modules\.bin\playwright.cmd test tests/conductor.spec.ts --grep "a dispatched run lives in the conversation" 2>&1
    $conductorExit = $LASTEXITCODE
    $conductorOutput | Out-File -FilePath $conductorLog -Encoding utf8
    $conductorOutput
    & .\node_modules\.bin\playwright.cmd test tests/projects.spec.ts --grep "launch reopens the last project"
    if ($LASTEXITCODE -ne 0) { throw "projects narrow scenario failed with exit code $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
} finally {
  if ($taskOwnsToken -and (Test-Path -LiteralPath $taskToken)) {
    Remove-Item -LiteralPath $taskToken -Force
  }
}
Write-Host "Task 8 conductor log: $conductorLog"
Write-Host "Task 8 conductor exit code: $conductorExit"
```

Expected: the projects scenario passes. The conductor scenario either passes, or ends only with the same full title and byte-identical error fingerprint recorded in the preflight baseline log. Its new quiet-water and narrow-window assertions run before that preserved failure; any new assertion failure changes the fingerprint and is a regression to fix. Record the printed log path. If token acquisition fails, wait; never remove the existing directory.

Two failure modes worth naming, so neither becomes a hunt:

- **`castIsSeparate: false`** means the two villagers still overlap with the pond whole. The shore relax is the lever: confirm `wholePond` is actually reaching `TownSquare` (React DevTools, or a temporary `console.log`), because `narrow && pondOpen` is false if the `matchMedia` effect never ran. The ground at 760×620 is 736×554, a node is 136px wide, and `TOWN_BOUNDS` spans `x ∈ [0.13, 0.87]` — there is room for both, so an overlap means the clamp is still 0.52.
- **A control asserted visible that Playwright calls hidden** means `visibility: hidden` is reaching further than intended. Playwright treats `visibility: hidden` as hidden and `opacity: 0` as visible; that asymmetry is why the narrow block uses visibility, and it is also why a stray inherited `hidden` is easy to miss by eye.

- [ ] **Step 11: Commit**

```powershell
git add app/src/renderer/components/PondLine.tsx app/src/renderer/town/presentation.ts app/src/renderer/town/layout.ts app/src/renderer/screens/Workspace.tsx app/src/renderer/screens/Chat.tsx app/src/renderer/components/TownSquare.tsx app/lab/chatmock-view.tsx app/src/renderer/app.css app/tests/conductor.spec.ts app/tests/projects.spec.ts app/tests-unit/pondline.test.ts
git commit -m "The narrow window: an honest line, or the pond whole"
```

---

### Task 9: Prove every conversation state fits at both approved widths

**Files:**
- Modify: `app/tests/conductor.spec.ts` (one shared containment helper and focused assertions across fifteen existing real-app states)

**Interfaces:**
- Consumes: the finished panel, visual language, and narrow behavior from Tasks 2–8.
- Produces: no runtime API. It turns “every panel state works at 760×620 and 1320×820” into an executable matrix rather than a visual assumption.

The same helper runs against each state below. It checks horizontal containment, page containment, visible controls, and whether a vertically clipped control has a real scroll ancestor. At 760px it also requires the pond line; at 1320px it requires the line to be absent.

| State | Existing scenario | Surface passed to the helper |
|---|---|---|
| Disconnected card | `the connect card blocks until consent…` | `.chat-column-villager .card` |
| Provider menu, collapsed | `the connect card blocks until consent…` | `.chat-column-villager .brain-list` |
| Provider menu, expanded | `the connect card blocks until consent…` after More choices | `.chat-column-villager .card` and its `.brain-list` |
| Quiet | `the tucked chip carries a needs-you dot…` before the first tuck | `.chat-column.chat-column-villager` |
| Streaming | `later proposals after a dispatched run…` while its held third reply is live | `.chat-column.chat-column-villager` |
| Proposal / needs-you | `the full loop…` and the needs-you scenario | `.task-card` |
| Dispatch confirmation | `the full loop…` | `.dispatch-panel` |
| Worker running | `a dispatched run lives in the conversation…` | `.run-strip` |
| DONE | `the envelope posts a DONE result card…` | `.result-card` |
| STOPPED | `a stopped run posts an honest STOPPED card…` | `.result-card` |
| ERROR / refusal | `a run that closes connection-required…` | `.dispatch-panel` |
| Push pause | `a DONE card offers the push chip…` | `.push-confirm` |
| Tucked | `the tucked chip carries a needs-you dot…` | `.chat-villager-chip` inside `.workspace-town-pane` |
| Folded history | `later proposals after a dispatched run…` | `.result-card-folded` |
| Follow-up menu | `the comment's follow-up suggestions render…` | `.followups-row` |

- [ ] **Step 1: Add the shared helper and every state call**

In `app/tests/conductor.spec.ts`, insert this helper after `motionsForCue`:

```typescript
async function expectPanelSurfaceFitsAtBothWidths(
  win: Page,
  selector: string,
  containerSelector = ".chat-column.chat-column-villager",
): Promise<void> {
  for (const viewport of [
    { width: 760, height: 620 },
    { width: 1320, height: 820 },
  ]) {
    await win.setViewportSize(viewport);
    const surface = win.locator(selector).last();
    await expect(surface).toBeVisible();
    const layout = await surface.evaluate((element, containerQuery) => {
      const surfaceElement = element as HTMLElement;
      const container = surfaceElement.closest<HTMLElement>(containerQuery)
        ?? document.querySelector<HTMLElement>(containerQuery);
      if (!container) throw new Error(`Expected container ${containerQuery}`);
      const containerBox = container.getBoundingClientRect();
      const surfaceBox = surfaceElement.getBoundingClientRect();
      const controlSelector = "button, input, textarea, select, [tabindex]";
      const visibleControls = [
        ...(surfaceElement.matches(controlSelector) ? [surfaceElement] : []),
        ...Array.from(surfaceElement.querySelectorAll<HTMLElement>(controlSelector)),
      ].filter((control) => {
        const style = getComputedStyle(control);
        return style.display !== "none" && style.visibility !== "hidden";
      });
      const hasScrollAncestor = (control: HTMLElement): boolean => {
        for (let parent = control.parentElement; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent);
          if (/(auto|scroll)/.test(style.overflowY)
            && parent.scrollHeight > parent.clientHeight + 1) return true;
          if (parent === container) break;
        }
        return false;
      };
      const surfaceVertical = surfaceBox.top >= containerBox.top - 1
        && surfaceBox.bottom <= containerBox.bottom + 1;
      return {
        surfaceFitsHorizontally: surfaceBox.left >= containerBox.left - 1
          && surfaceBox.right <= containerBox.right + 1
          && surfaceElement.scrollWidth <= surfaceElement.clientWidth + 1,
        surfaceReachable: surfaceVertical || hasScrollAncestor(surfaceElement),
        controlsReachable: visibleControls.every((control) => {
          const box = control.getBoundingClientRect();
          const horizontal = box.left >= containerBox.left - 1 && box.right <= containerBox.right + 1;
          const vertical = box.top >= containerBox.top - 1 && box.bottom <= containerBox.bottom + 1;
          return horizontal && (vertical || hasScrollAncestor(control));
        }),
        pageFits: document.documentElement.scrollWidth <= window.innerWidth
          && document.documentElement.scrollHeight <= window.innerHeight,
      };
    }, containerSelector);
    expect(layout).toEqual({
      surfaceFitsHorizontally: true,
      surfaceReachable: true,
      controlsReachable: true,
      pageFits: true,
    });
    const pondLine = win.locator(".pond-line");
    if (viewport.width <= 1260) await expect(pondLine).toBeVisible();
    else await expect(pondLine).toBeHidden();
  }
}
```

Add these exact calls immediately after the named surface first becomes visible in each existing test:

```typescript
// `the connect card blocks until consent…`, after the card is visible following
// `win.reload()` (so remembered-seat state cannot change which panel is open):
  await expectPanelSurfaceFitsAtBothWidths(win, ".chat-column-villager .card");

// The same test, immediately after `await expect(picker).toBeVisible()`:
  await expectPanelSurfaceFitsAtBothWidths(win, ".chat-column-villager .brain-list");

// The same test, after More choices is pressed and its final existing billing
// assertion passes. This is the maximal real provider menu, not the two-door
// start list or the collapsed picker:
  await expectPanelSurfaceFitsAtBothWidths(win, ".chat-column-villager .card");
  await expectPanelSurfaceFitsAtBothWidths(win, ".chat-column-villager .brain-list");

// `the full loop…`, after taskCard is visible:
  await expectPanelSurfaceFitsAtBothWidths(win, ".task-card");

// `the full loop…`, after panel is visible:
  await expectPanelSurfaceFitsAtBothWidths(win, ".dispatch-panel");

// `a dispatched run lives…`, after strip is visible:
  await expectPanelSurfaceFitsAtBothWidths(win, ".run-strip");

// `the envelope posts a DONE result card…`, after card is visible:
  await expectPanelSurfaceFitsAtBothWidths(win, ".result-card");

// `a stopped run posts an honest STOPPED card…`, after card is visible:
  await expectPanelSurfaceFitsAtBothWidths(win, ".result-card");

// `a run that closes connection-required…`, after dispatch-error is visible:
  await expectPanelSurfaceFitsAtBothWidths(win, ".dispatch-panel");

// `a DONE card offers the push chip…`, after pause is visible:
  await expectPanelSurfaceFitsAtBothWidths(win, ".push-confirm");

// `later proposals after a dispatched run…`, inside the existing
// holdFixtureThirdProposal try block, after its Stop button is visible and
// before leaving Chat. The server-side hold makes this a deterministic live
// reply rather than racing the four 500ms slow-stream chunks:
  await expectPanelSurfaceFitsAtBothWidths(
    win, ".chat-column.chat-column-villager", ".workspace-town-pane",
  );

// The same scenario, later, after folded is visible:
  await expectPanelSurfaceFitsAtBothWidths(win, ".result-card-folded");

// `the comment's follow-up suggestions render…`, immediately after the two
// `.followup-chip` elements are visible and before either is pressed:
  await expectPanelSurfaceFitsAtBothWidths(win, ".followups-row");
```

In `the tucked chip carries a needs-you dot while a decision waits inside`, insert this immediately after connecting, before the first tuck:

```typescript
  await expectPanelSurfaceFitsAtBothWidths(
    win, ".chat-column.chat-column-villager", ".workspace-town-pane",
  );
  await win.setViewportSize({ width: 760, height: 620 });
  const pondLine = win.locator(".pond-line");
  const quietBackground = await pondLine.evaluate((element) => getComputedStyle(element).backgroundColor);
  await expect(pondLine).toHaveClass(/pond-line-quiet/);
  await win.setViewportSize({ width: 1320, height: 820 });
```

Immediately after the first `await expect(chip).toBeVisible()`, add the tucked-state call:

```typescript
  await expectPanelSurfaceFitsAtBothWidths(win, ".chat-villager-chip", ".workspace-town-pane");
```

Immediately after the task card later becomes visible, add the complete needs-you color and live-region proof:

```typescript
  await expectPanelSurfaceFitsAtBothWidths(win, ".task-card");
  await win.setViewportSize({ width: 760, height: 620 });
  await expect(pondLine).toHaveClass(/pond-line-needs-you/);
  await expect(pondLine).toContainText("waiting for you");
  const waitingColors = await pondLine.evaluate((element) => ({
    text: getComputedStyle(element).color,
    background: getComputedStyle(element).backgroundColor,
    dot: getComputedStyle(element.querySelector<HTMLElement>(".pond-line-dot")!).backgroundColor,
  }));
  expect(waitingColors.text).toBe("rgb(247, 211, 168)");
  expect(waitingColors.dot).toBe("rgb(247, 211, 168)");
  expect(waitingColors.background).not.toBe(quietBackground);
  await pondLine.hover();
  await expect.poll(() => pondLine.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  )).toBe(waitingColors.background);
  await expect(win.locator(".pond-line-live")).toHaveText(
    "Town is quiet. Something in the conversation is waiting for you.",
  );
  await win.setViewportSize({ width: 1320, height: 820 });
```

- [ ] **Step 2: Prove the new containment guard can fail**

Temporarily append this rule to `app/src/renderer/app.css`; it creates a real horizontal overflow in one of the matrix surfaces:

```css
.run-strip {
  left: 80px !important;
  max-width: none !important;
  position: relative;
  width: calc(100% + 80px) !important;
}
```

From the repository root, run this exact mutex-protected command:

```powershell
$taskToken = Join-Path ([System.IO.Path]::GetTempPath()) "cairn-app-token"
$taskOwnsToken = $false
$guardExit = $null
try {
  New-Item -ItemType Directory -Path $taskToken -ErrorAction Stop | Out-Null
  $taskOwnsToken = $true
  Push-Location app
  try {
    npm.cmd run build:vite
    if ($LASTEXITCODE -ne 0) { throw "intentional-overflow build failed with exit code $LASTEXITCODE" }
    $guardOutput = & .\node_modules\.bin\playwright.cmd test tests/conductor.spec.ts --grep "a dispatched run lives in the conversation" 2>&1
    $guardExit = $LASTEXITCODE
    $guardOutput
  } finally {
    Pop-Location
  }
} finally {
  if ($taskOwnsToken -and (Test-Path -LiteralPath $taskToken)) {
    Remove-Item -LiteralPath $taskToken -Force
  }
}
$guardText = $guardOutput -join [Environment]::NewLine
if ($guardExit -eq 0) { throw "the intentional overflow did not fail the containment guard" }
if ($guardText -notmatch 'surfaceFitsHorizontally') {
  throw "the scenario failed, but not in the containment helper; inspect the preserved output"
}
if ($guardText -notmatch 'surfaceFitsHorizontally[^\r\n]*true' -or
    $guardText -notmatch 'surfaceFitsHorizontally[^\r\n]*false') {
  throw "the failure does not show surfaceFitsHorizontally changing from expected true to actual false"
}
```

Expected: FAIL in `expectPanelSurfaceFitsAtBothWidths`; the output itself names `surfaceFitsHorizontally` and shows expected `true` against actual `false`. The command rejects the scenario's accepted preflight failure when that is the only failure, so a nonzero exit alone cannot masquerade as proof. This demonstrates that the shared geometry guard, not an unrelated assertion, detects a panel that no longer fits.

Remove that temporary rule. Confirm `git diff -- app/src/renderer/app.css` is empty.

- [ ] **Step 3: Run the focused matrix**

From the repository root, run the nine green scenarios and the separately classified worker-running scenario under one mutex:

```powershell
$taskToken = Join-Path ([System.IO.Path]::GetTempPath()) "cairn-app-token"
$taskOwnsToken = $false
$workerLog = Join-Path ([System.IO.Path]::GetTempPath()) ("cairn-plan2-task9-worker-{0}.txt" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
$workerExit = $null
$taskBriefMatches = @(rg -l -g '*-brief.md' --fixed-strings "The conversation panel and visual language: Lantern on Water (corrected)" docs/ai-work/tasks)
if ($LASTEXITCODE -gt 1) { throw "brief lookup failed with exit code $LASTEXITCODE" }
if ($taskBriefMatches.Count -ne 1) { throw "expected exactly one corrected Plan 2 brief, found $($taskBriefMatches.Count)" }
$briefText = Get-Content -LiteralPath $taskBriefMatches[0] -Raw
$baselineMatch = [regex]::Match($briefText, '(?m)^Worker-running baseline:\s*(.+?)\s*$')
if (-not $baselineMatch.Success) { throw "the brief has no Worker-running baseline line" }
$workerBaseline = $baselineMatch.Groups[1].Value
try {
  New-Item -ItemType Directory -Path $taskToken -ErrorAction Stop | Out-Null
  $taskOwnsToken = $true
  Push-Location app
  try {
    npm.cmd run build:vite
    if ($LASTEXITCODE -ne 0) { throw "build:vite failed with exit code $LASTEXITCODE" }

    $workerOutput = & .\node_modules\.bin\playwright.cmd test tests/conductor.spec.ts --grep "a dispatched run lives in the conversation" 2>&1
    $workerExit = $LASTEXITCODE
    $workerOutput | Out-File -FilePath $workerLog -Encoding utf8
    $workerOutput
    if ($workerExit -ne 0) {
      if (-not $workerBaseline.StartsWith("FAIL | ")) {
        throw "worker-running failed even though the recorded baseline passed"
      }
      $acceptedFingerprint = $workerBaseline.Substring(7)
      $workerText = $workerOutput -join [Environment]::NewLine
      if ([string]::IsNullOrWhiteSpace($acceptedFingerprint) -or
          -not $workerText.Contains($acceptedFingerprint)) {
        throw "worker-running failure does not match the exact preflight fingerprint"
      }
    }

    & .\node_modules\.bin\playwright.cmd test tests/conductor.spec.ts --grep "the connect card blocks until consent|the full loop|the envelope posts a DONE|a stopped run posts|a run that closes connection-required|later proposals after a dispatched run|the tucked chip carries|a DONE card offers the push chip|the comment's follow-up suggestions render"
    if ($LASTEXITCODE -ne 0) { throw "the nine green panel-state scenarios failed with exit code $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
} finally {
  if ($taskOwnsToken -and (Test-Path -LiteralPath $taskToken)) {
    Remove-Item -LiteralPath $taskToken -Force
  }
}
Write-Host "Worker-running matrix log: $workerLog"
Write-Host "Worker-running exit code: $workerExit"
```

Expected: all nine green scenarios pass. The worker-running scenario either passes or the command proves its output contains the exact unique fingerprint recorded from preflight; a failure after a baseline PASS or any different fingerprint throws. Because the fit helper runs before that preserved failure, an exact match proves its new assertion completed. Together the ten scenarios cover all fifteen states in the table, including the maximal expanded provider menu. If mutex acquisition fails, wait and never remove the existing token.

- [ ] **Step 4: Commit**

```powershell
git add app/tests/conductor.spec.ts
git commit -m "Prove every conversation state fits at both approved widths"
```

---

## Final verification

### Automated checks

- [ ] Run the app and core checks from the repository root:

```powershell
Push-Location app
try {
  npm.cmd run test:unit
  if ($LASTEXITCODE -ne 0) { throw "app unit tests failed" }
  npm.cmd run typecheck
  if ($LASTEXITCODE -ne 0) { throw "app typecheck failed" }
  npm.cmd run build:vite
  if ($LASTEXITCODE -ne 0) { throw "app Vite build failed" }
  npm.cmd run build:lab
  if ($LASTEXITCODE -ne 0) { throw "app lab build failed" }
} finally {
  Pop-Location
}

Push-Location core
try {
  npm.cmd test
  if ($LASTEXITCODE -ne 0) { throw "core tests failed" }
} finally {
  Pop-Location
}
```

Expected: all unit tests pass, typecheck prints no errors, both builds finish cleanly, and all core tests pass.

- [ ] Run the structural sweeps from `app/`:

```powershell
rg -n -- '(var\(--pond-(deep|mid|plum|water|line)\)|--pond-(deep|mid|plum|water|line)\s*:|town-pond-contour)' src/renderer lab
rg -n 'town-.*var\(--mono\)|stroke-dasharray' src/renderer/app.css
rg -n 'rgb\(127, 216, 200\)|rgb\(242, 163, 92\)|rgb\(169, 211, 155\)|rgb\(255, 129, 120\)' tests/conductor.spec.ts
```

Expected for each: no output and ripgrep exit code 1. Exit code greater than 1 is a command error.

- [ ] The execution preflight already preserved the `9d46a95` baseline log before Task 1. Run the full final Playwright suite under the mutex and preserve this output in a second unique log:

```powershell
$taskToken = Join-Path ([System.IO.Path]::GetTempPath()) "cairn-app-token"
$taskOwnsToken = $false
$smokeExit = $null
$finalLog = Join-Path ([System.IO.Path]::GetTempPath()) ("cairn-plan2-final-smoke-{0}.txt" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
try {
  New-Item -ItemType Directory -Path $taskToken -ErrorAction Stop | Out-Null
  $taskOwnsToken = $true
  Push-Location app
  try {
    $finalOutput = & npm.cmd run test:smoke 2>&1
    $smokeExit = $LASTEXITCODE
    $finalOutput | Out-File -FilePath $finalLog -Encoding utf8
    $finalOutput
  } finally {
    Pop-Location
  }
} finally {
  if ($taskOwnsToken -and (Test-Path -LiteralPath $taskToken)) {
    Remove-Item -LiteralPath $taskToken -Force
  }
}
Write-Host "Final smoke log: $finalLog"
Write-Host "test:smoke exit code: $smokeExit"
Write-Host "Compare full failing titles and fingerprints; never compare only a count."
```

If acquisition fails, another lane or the owner holds the app; wait. Do not remove the existing directory.

Record the printed final log path in the task report. Compare it with the preflight log path recorded in the brief. The rule is `FinalFailures - BaselineFailures = ∅` by full title **and** error fingerprint. A matching count with a different test is a regression. The preserved Task 171 evidence names these baseline identities:

| Identity | Baseline treatment |
|---|---|
| `conductor.spec.ts` — `a dispatched run lives in the conversation…` | Reproduce at `9d46a95` and preserve its exact message before allowing it; the historical report says it was byte-identical but does not preserve the text. |
| `routing.spec.ts` — `navigating away and back reattaches to the running worker…` | Baseline misses the expected running copy after reattachment. |
| `routing.spec.ts` — `the fake-kimi lane discloses…` | Environment-dependent when a real `codex-exec` is on PATH; compare the exact adapter-list message. |
| Rotating temp-profile contention | Accept only with the documented contention/`EPERM` fingerprint **and** an immediate isolated pass of the same test. Identity alone is not enough. |

- [ ] Inspect the final tree from the repository root:

```powershell
git diff --check 9d46a954b0b3b5878e9d50efa962095977b9540d..HEAD
git diff --stat 9d46a954b0b3b5878e9d50efa962095977b9540d..HEAD
git diff --name-status 9d46a954b0b3b5878e9d50efa962095977b9540d..HEAD
git diff 9d46a954b0b3b5878e9d50efa962095977b9540d..HEAD
git status --short
git diff 9d46a954b0b3b5878e9d50efa962095977b9540d..HEAD -- app/src/renderer/town/faces.ts
git check-ignore -v .superpowers/brainstorm/19609-1785686173/content/lantern-v3.html
git check-ignore -v .superpowers/brainstorm/52918-1785736835/content/narrow-v2.html
```

Expected: the range-wide `git diff --check` and `faces.ts` diff print nothing; the stat, name-status list, and full diff show every committed implementation and test change since the fixed red-test baseline; status is clean; each mockup prints an exclusion rule and remains untracked. Read the complete range diff, not merely the working tree: Tasks 1 through 9 are already committed, so an un-ranged `git diff` would prove nothing.

### Owner-only visual and accessibility check

Do **not** run the eval. It is manual by design and needs the owner's hands. Acquire the same app token with this exact PowerShell block and leave the app on screen for the owner; the token is released when the owner closes the app:

```powershell
$manualToken = Join-Path ([System.IO.Path]::GetTempPath()) "cairn-app-token"
$manualOwnsToken = $false
try {
  New-Item -ItemType Directory -Path $manualToken -ErrorAction Stop | Out-Null
  $manualOwnsToken = $true
  Push-Location app
  try {
    npm.cmd start
  } finally {
    Pop-Location
  }
} finally {
  if ($manualOwnsToken -and (Test-Path -LiteralPath $manualToken)) {
    Remove-Item -LiteralPath $manualToken -Force
  }
}
```

- [ ] At 1320×820, watch a quiet pond for ten seconds: one continuous blend, a static soft sheen, and no permanent ring, packet, ripple, or decorative pond motion.
- [ ] At 1320×820, inspect quiet, streaming, proposal, dispatch, running, DONE, STOPPED, ERROR, push pause, tucked, and folded-result states: warm opaque lantern paper, readable controls, no content showing through the provider popover, and no control moving with the panel.
- [ ] At 1320×820, confirm the lantern header visibly carries Cairn's second three-stroke face with `Cairn` / `Conductor project`; follow-up choices are a stacked warm menu with pastel dots; and the project rail, welcome cards, and overlays read as one rounded visual language rather than a second HUD.
- [ ] Use Tab and Space/Enter across a pill, a menu row, the rail, the composer, a Town character, and the push pause: every focus ring is Cairn pastel, action edges compress, menu rows slide rather than grow an edge, and the face springs without its paths changing.
- [ ] At 760×620, confirm the conversation is the default beneath the 54px line. Open the line: the pond is whole, the conversation is absent from keyboard navigation, and Back returns both the conversation and focus.
- [ ] At 760×620 with a decision waiting, confirm the line and dot are amber and the words say it is waiting for the owner.
- [ ] If a screen reader is already available, hear the narrow status update once. It must come from the sibling live region, not announce the entire status button as changed.
- [ ] In Windows Settings → Accessibility → Visual effects, turn **Animation effects** off, repeat wide and narrow, then restore the owner's setting. The same final states appear without travel, stagger, blink, packet, or ripple motion.
- [ ] Ask the owner to confirm implementation fidelity: the running app matches `lantern-v3.html` and `narrow-v2.html`, including the already-approved Lantern on Water look and line-or-whole-pond behavior. This is verification of the visible outcome, not a reopening of either choice. Demonstrate and record the known drag limitation without presenting it as a decision: with the whole pond visible, grabbing a villager beyond `0.52` makes it jump left because saved positions remain safe for the later wide layout.

### Close the claimed task honestly

- [ ] Resolve the task number from the exact corrected title written into the claimed brief; never guess it:

```powershell
$taskBriefMatches = @(rg -l -g '*-brief.md' --fixed-strings "The conversation panel and visual language: Lantern on Water (corrected)" docs/ai-work/tasks)
if ($LASTEXITCODE -gt 1) { throw "brief lookup failed with exit code $LASTEXITCODE" }
if ($taskBriefMatches.Count -ne 1) { throw "expected exactly one corrected Plan 2 brief, found $($taskBriefMatches.Count)" }
$taskBrief = $taskBriefMatches[0].Replace("\", "/")
if ($taskBrief -notmatch '^docs/ai-work/tasks/(\d{3})-brief\.md$') { throw "unexpected brief path: $taskBrief" }
$taskNumber = $Matches[1]
$taskReport = "docs/ai-work/tasks/$taskNumber-report.md"
if (Test-Path -LiteralPath $taskReport) { throw "report already exists: $taskReport" }
Write-Host "Brief: $taskBrief"
Write-Host "Report: $taskReport"
```

Expected: exactly one brief and its matching, not-yet-existing report path. If the lookup is ambiguous or the report already exists, stop and inspect; do not overwrite history.

- [ ] Create the printed report path with these exact sections, replacing no prior record. Its H1 is `# Task ` followed immediately by the resolved three-digit number, then ` report — The conversation panel and visual language: Lantern on Water (corrected)`. Follow it with `Disposition`; `What actually changed`; `Files touched`; `Checks and exact results`; `How to try it`; `Owner visual verdict`; `Known limitations`; and `Base and commits`. Fill them with facts from this execution, not anticipated results. Name every touched path, both preserved smoke-log paths and their full failure fingerprints, every exact command above and its real exit/result, the owner's fidelity verdict, the saved-shore jump and missing narrow Reset limitation, fixed base `9d46a954b0b3b5878e9d50efa962095977b9540d`, and every implementation commit. Write `Disposition: DONE` only when all automated checks hold and the owner has confirmed the manual fidelity check; otherwise write `Disposition: STOPPED —` followed by the concrete reason. Use `apply_patch` to add this one new report file.

- [ ] Append one row to `docs/ai-work/LOG.md` without changing any historical row. Use the resolved task number, the actual local date, `Standard`, `Applied`, `DONE` plus `completed` only for a DONE report (otherwise `STOPPED` plus `stopped`), a one-sentence factual summary, and `NO` for milestone moved unless the owner explicitly says the milestone moved. Use `apply_patch`; do not sort or reformat the log.

- [ ] Inspect and commit only the claimed task's closing records:

```powershell
$taskBriefMatches = @(rg -l -g '*-brief.md' --fixed-strings "The conversation panel and visual language: Lantern on Water (corrected)" docs/ai-work/tasks)
if ($LASTEXITCODE -gt 1) { throw "brief lookup failed with exit code $LASTEXITCODE" }
if ($taskBriefMatches.Count -ne 1) { throw "expected exactly one corrected Plan 2 brief, found $($taskBriefMatches.Count)" }
$taskBrief = $taskBriefMatches[0].Replace("\", "/")
if ($taskBrief -notmatch '^docs/ai-work/tasks/(\d{3})-brief\.md$') { throw "unexpected brief path: $taskBrief" }
$taskReport = "docs/ai-work/tasks/$($Matches[1])-report.md"
if (-not (Test-Path -LiteralPath $taskReport)) { throw "missing matching report: $taskReport" }
Get-Content -LiteralPath $taskReport -Raw
git diff --check -- docs/ai-work/LOG.md
git diff -- docs/ai-work/LOG.md
git status --short
git add -- $taskReport docs/ai-work/LOG.md
git diff --cached --check
git diff --cached --name-status
git diff --cached -- $taskReport docs/ai-work/LOG.md
git commit -m "Close corrected Plan 2 with verified evidence"
git status --short --branch
```

Expected: `Get-Content` shows the complete new report; the unstaged diff contains exactly one appended log row; status names only the report and log; the staged check and name-status list cover exactly those two paths; the commit succeeds; final status is clean. The already-committed brief remains the matching historical start record and is not rewritten at close.

- [ ] Repeat the committed-range integrity check after the closing record commit:

```powershell
git diff --check 9d46a954b0b3b5878e9d50efa962095977b9540d..HEAD
git diff 9d46a954b0b3b5878e9d50efa962095977b9540d..HEAD -- app/src/renderer/town/faces.ts
git status --short --branch
```

Expected: both diffs named as empty print nothing, the branch is clean, and the task is closed by a matching brief, report, and one log row.


## What this plan deliberately does not do

- **It does not run the eval.** A run costs real money on the owner's account and needs their explicit go. Scenarios 11 and 12 still have written bars and no results, which is honest. The visual language is not scored by the eval in any case — it is scored by the owner's eyes.
- **It does not build or prove the evidence section.** Decision 2 puts a before/after pair at the top of the card and an album behind it. Plan 3 owns that DOM, its wide side-by-side layout, its narrow stacked layout, and the viewport proof for both. This plan proves only the panel states that exist now; it neither reserves evidence space nor claims the later pair already fits.
- **It does not touch attribution.** The "You said so / You weren't sure / Cairn chose" tags visible in `lantern-v3.html` are Decision 5, which is plan 4. Their styling is not carried over here, because styling a control that does not exist would leave dead CSS behind for someone to wonder about.
- **It does not pick colours for Gemini or the fallback worker.** The owner approved four cast colours; those two are not among them, and `palette.test.ts` pins their absence deliberately so the gap stays visible rather than being quietly filled in. They will read as more saturated than the four beside them.
- **It does not change what earns a DONE.** Every risk boundary keeps its pause, Git remains the ledger, the claim/verified split stays load-bearing, and `presentation.ts` remains the only arbiter of whether an event happened. Decision 9's release of visual preservation covers appearance only.
- **It does not reopen the narrow-window resolution.** Conversation-first, line-or-whole-pond, the 1260px boundary, and the safe saved-shore clamp are owner-approved. The visible jump when grabbing beyond the saved shore and the missing narrow Reset control remain documented limitations, not implementation choices to revisit here.
