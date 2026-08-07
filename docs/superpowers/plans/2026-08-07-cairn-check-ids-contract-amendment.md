# Check Ids — Contract Amendment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every check in a task brief a stable id that its report must
answer, so promised-versus-answered becomes checkable — and close a shipping
defect found while planning it.

**Architecture:** Documentation and one generator function. The contract gains
two amended rules; `briefSkeleton()` emits the new format; the existing
mirror test is extended to cover the fourth contract copy it was silently
missing. No product runtime changes.

**Tech Stack:** Node's built-in `node:test`, TypeScript 5.6, plain Markdown.

**Plan 1 of 4** for
`docs/superpowers/specs/2026-08-07-cairn-owner-verdict-design.md`. Plans 2–4
(the verdict record, the review queue, the conductor's read access) are named
in that spec's "Order of work" and are not written yet, by design: this format
must survive contact with real briefs before anything is built on it.

## Global Constraints

- **The contract has FIVE copies.** Any amendment edits all five or the build
  fails: `CONTRACT-TEMPLATE.md` (canonical), `core/assets/contract.md`,
  the `<script type="text/plain" id="src-contract">` block in `cairn.html`,
  `app/resources/contract.md`, and `AGENTS.md` (this project's live instance).
- **`app/resources/contract.md` ships to users.** `app/forge.config.ts:14`
  bundles it as an `extraResource`; `app/src/main/main.ts:33-34` reads it at
  runtime. Task A exists because no test covers it today.
- **All five are byte-identical for the shared sections.** Verified
  2026-08-07: `CONTRACT-TEMPLATE.md`, `core/assets/contract.md`, and
  `app/resources/contract.md` share sha256 prefix `11dc963a9c0404db`.
  `AGENTS.md` differs only by carrying this project's own facts.
- **Line endings matter.** `core/test/contract-mirrors.test.mjs` normalises
  `\r\n?` to `\n` before comparing. Task 197 lost time to a scripted edit that
  rewrote a file as CRLF. Write LF.
- **No task number is claimed by this plan.** Each task below is claimed at
  execution time under the contract's own rule.
- **Nothing is pushed.** Every commit is local; publication keeps its pause.
- **No paid model call.** This plan makes none.

---

### Task A: Cover the fourth contract mirror

The mirror test checks three copies and misses the one that ships. Amending the
contract before closing this would risk shipping a stale contract to every
installed app with no test to catch it.

**Files:**
- Modify: `core/test/contract-mirrors.test.mjs:11-38`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: a mirror test covering all four file copies. Tasks B and C rely on
  it failing when a copy is missed.

- [ ] **Step 1: Write the failing assertion**

Add to `core/test/contract-mirrors.test.mjs`, inside the existing test, after
the `asset` constant:

```javascript
  const shipped = normalizeLineEndings(
    readFileSync(join(repository, "app", "resources", "contract.md"), "utf8"),
  );
```

and after the existing `assert.equal(asset, canonical, ...)` line:

```javascript
  assert.equal(
    shipped,
    canonical,
    "app/resources/contract.md drifted from CONTRACT-TEMPLATE.md — this copy ships to users via forge.config.ts extraResource",
  );
```

- [ ] **Step 2: Prove it red by deliberate divergence**

The files are identical today, so a new assertion passes immediately and proves
nothing. Diverge one on purpose — the A/B control method Task 197 used to prove
its pre-existing failures.

Run:

```bash
printf '\nDIVERGENCE PROBE - REMOVE ME\n' >> app/resources/contract.md && node --test core/test/contract-mirrors.test.mjs; git checkout -- app/resources/contract.md
```

Expected: FAIL, naming `app/resources/contract.md drifted`. The trailing
`git checkout` restores the file whether the test passed or failed.

- [ ] **Step 3: Confirm the restore and that the test now passes**

Run:

```bash
git status --porcelain app/resources/contract.md && node --test core/test/contract-mirrors.test.mjs
```

Expected: no output from `git status` (file restored), then PASS.

- [ ] **Step 4: Commit**

```bash
git add core/test/contract-mirrors.test.mjs
git commit -m "Cover app/resources/contract.md in the mirror test"
```

---

### Task B: Make the taken-number rule match its implementation

The written rule says a number is taken if its **brief** exists. Task 148 has no
brief — `3e0be00` renumbered it away — but holds `148-report.md` and a STOPPED
log row. A reader following the prose would reuse it. The code already refuses
it: `taskNumbersInDir` matches `/^(\d{3,})-/` against every file
(`cli/src/flows/claim.ts:37`), and the branch scan applies the same match
(`:92`). This task makes the sentence match the code.

**Files:**
- Modify: `CONTRACT-TEMPLATE.md:79-80`
- Modify: `core/assets/contract.md:79-80`
- Modify: `app/resources/contract.md:79-80`
- Modify: `AGENTS.md:79-80`
- Modify: `cairn.html:171-172` — inside the `id="src-contract"` block. **Its
  line numbers are offset by the HTML wrapper**, so do not reuse the others'.

**Interfaces:**
- Consumes: Task A's four-way mirror test.
- Produces: the amended rule. Task C edits the same five files.

- [ ] **Step 1: Verify the current text is identical in all five**

Run:

```bash
grep -n "a number is taken if its brief file exists" CONTRACT-TEMPLATE.md core/assets/contract.md app/resources/contract.md cairn.html AGENTS.md
```

Expected: five matches, one per file.

- [ ] **Step 2: Replace the sentence in all five**

Replace this exact text:

```text
  `docs/ai-work/tasks/`: a number is taken if its brief file exists,
  committed or not.
```

with:

```text
  `docs/ai-work/tasks/`: a number is taken if a brief **or a report** exists
  for it, committed or not. A renumbered task can leave a report behind with
  no brief — Task 148 does — and reusing that number would collide a new task
  with a finished run's records.
```

- [ ] **Step 3: Run the mirror test**

Run: `node --test core/test/contract-mirrors.test.mjs`
Expected: PASS. A FAIL here names whichever copy was missed — that is the test
doing its job, so fix that copy and rerun.

- [ ] **Step 4: Run the full core and cli suites**

Run: `npm test --workspaces`
Expected: PASS, core and cli both green.

- [ ] **Step 5: Commit**

```bash
git add CONTRACT-TEMPLATE.md core/assets/contract.md app/resources/contract.md cairn.html AGENTS.md
git commit -m "A task number is taken by a brief or a report, matching the code"
```

---

### Task C: Amend the contract for stable check ids

**Files:**
- Modify: the brief rule at line 40 and the report rule at lines 143-145 in
  each of `CONTRACT-TEMPLATE.md`, `core/assets/contract.md`,
  `app/resources/contract.md`, and `AGENTS.md` — all four share these numbers,
  verified 2026-08-07.
- Modify: `cairn.html:132` (brief rule) and `cairn.html:235-237` (report rule).
  **Offset by the HTML wrapper; do not reuse the others' numbers.**
- Create: `core/test/contract-check-ids.test.mjs`

**Interfaces:**
- Consumes: Task A's four-way mirror test; Task B's amended file set.
- Produces: the amended contract text that Task D's generator must satisfy, and
  the id format `NNN.cM` that Plans 2–4 parse.

- [ ] **Step 1: Write the failing test that pins the amendment verbatim**

Create `core/test/contract-check-ids.test.mjs`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function contract() {
  return readFileSync(join(REPOSITORY, "CONTRACT-TEMPLATE.md"), "utf8").replace(/\r\n?/g, "\n");
}

test("the contract requires each brief check to carry a stable id", () => {
  assert.match(
    contract(),
    /each check carries a stable id of the form `NNN\.cM`/,
    "the brief rule naming the check-id format is missing",
  );
});

test("the contract requires the report to answer every brief check by id", () => {
  assert.match(
    contract(),
    /answering every id the brief declared, and naming any check added during the work/,
    "the report rule requiring per-id answers is missing",
  );
});
```

- [ ] **Step 2: Run it to verify both fail**

Run: `node --test core/test/contract-check-ids.test.mjs`
Expected: FAIL, 2 failing — "the brief rule naming the check-id format is
missing" and "the report rule requiring per-id answers is missing".

- [ ] **Step 3: Amend the brief rule in all five copies**

Replace this exact line:

```text
3. Restate the visible outcome and write a short task brief.
```

with:

```text
3. Restate the visible outcome and write a short task brief. Its checks are a
   numbered list, and each check carries a stable id of the form `NNN.cM` —
   the task number, then `c`, then the check's position — so a report can
   answer it and a later reader can find it.
```

- [ ] **Step 4: Amend the report rule in all five copies**

Replace this exact text:

```text
- checks run and their real results, naming each check's exact command and
  where its output can be seen, so a later conversation — or the owner — can
  re-run the decisive one;
```

with:

```text
- checks run and their real results, naming each check's exact command and
  where its output can be seen, so a later conversation — or the owner — can
  re-run the decisive one, answering every id the brief declared, and naming
  any check added during the work as an addition rather than renumbering the
  brief's;
```

- [ ] **Step 5: Run the new test and the mirror test**

Run: `node --test core/test/contract-check-ids.test.mjs core/test/contract-mirrors.test.mjs`
Expected: PASS, 3 passing.

- [ ] **Step 6: Run the full suites**

Run: `npm test --workspaces`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add CONTRACT-TEMPLATE.md core/assets/contract.md app/resources/contract.md cairn.html AGENTS.md core/test/contract-check-ids.test.mjs
git commit -m "Brief checks carry stable ids; reports answer every one"
```

---

### Task D: Emit the id format from the brief generator

Every brief `cairn claim` writes must carry the format, or the amendment is a
rule nobody follows.

**Files:**
- Modify: `cli/src/flows/claim.ts:128-158` (`briefSkeleton`)
- Modify: `cli/test/claim.test.ts`

**Interfaces:**
- Consumes: Task C's amended contract text and the `NNN.cM` format.
- Produces: `briefSkeleton(n, title, laneLabel, baseCommit)` — unchanged
  signature, amended output. Plans 2–4 parse briefs produced by it.

- [ ] **Step 1: Write the failing test**

Add to `cli/test/claim.test.ts`:

```typescript
test("the brief skeleton declares check ids for the claimed number", () => {
  const skeleton = briefSkeleton(7, "a visible outcome", "A (main checkout)", "abc1234");
  assert.match(skeleton, /## Checks that will show the outcome holds/);
  assert.match(
    skeleton,
    /1\. \*\*`007\.c1`\*\*/,
    "the first check must be pre-labelled with the zero-padded task number",
  );
  assert.ok(
    !skeleton.includes("NNN.c"),
    "the skeleton must interpolate the real number, not leave the placeholder",
  );
});
```

Add `briefSkeleton` to the existing import block at the top of the file:

```typescript
import {
  scanTakenNumbers,
  lowestFree,
  detectLane,
  claimTask,
  renumberTask,
  verifyByteExact,
  padNumber,
  briefSkeleton,
} from "../src/flows/claim.js";
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd cli && npm test`
Expected: FAIL on "the first check must be pre-labelled with the zero-padded
task number" — the current skeleton emits `1. TODO: exact commands...`.

- [ ] **Step 3: Amend the skeleton's Checks section**

In `cli/src/flows/claim.ts`, replace this exact block inside `briefSkeleton`:

```text
## Checks that will show the outcome holds

1. TODO: exact commands, named so a later conversation can re-run them.
```

with:

```text
## Checks that will show the outcome holds

Each check carries a stable id so the report can answer it by name. Add or
remove numbered items as the task needs; keep the ids in order.

1. **\`${nnn}.c1\`** — TODO: exact command, named so a later conversation can
   re-run it, and what its output must show.
2. **\`${nnn}.c2\`** — TODO.
```

Note the escaped backticks: `briefSkeleton` returns a template literal, so
every literal backtick inside it needs a leading backslash.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd cli && npm test`
Expected: PASS, all cli tests green.

- [ ] **Step 5: Run the full suites**

Run: `npm test --workspaces`
Expected: PASS.

- [ ] **Step 6: Prove it end to end on a real claim**

Run, in a scratch clone rather than this repository:

```bash
cd cli && npm run build && node dist/src/index.js claim "a throwaway probe"
```

Expected: a brief whose Checks section reads ``**`NNN.c1`**`` with the real
claimed number interpolated. Delete the scratch clone afterwards; do not commit
the probe brief.

- [ ] **Step 7: Commit**

```bash
git add cli/src/flows/claim.ts cli/test/claim.test.ts
git commit -m "Brief skeleton pre-labels checks with stable ids"
```

---

## How we would know this plan held

- `npm test --workspaces` passes, core and cli both green.
- The mirror test fails when any one of the four file copies diverges, proven
  by deliberate divergence rather than asserted.
- A brief written by `cairn claim` after Task D carries `NNN.c1` with the real
  number interpolated.
- No product runtime changed: `git diff --stat` across the four tasks touches
  only contract copies, `claim.ts`, and tests.

## Deliberately not in this plan

- **The verdict record, the queue, and the conductor's read access.** Plans
  2–4. They parse the format this plan establishes and are not written until it
  has been used on real briefs.
- **Retrofitting ids onto the 120 existing briefs.** They record `rubric:
  "none"` under the spec's Decision 3 and are left exactly as they are.
- **Any change to what a check may assert.** This plan changes how a check is
  labelled, never what counts as one.
