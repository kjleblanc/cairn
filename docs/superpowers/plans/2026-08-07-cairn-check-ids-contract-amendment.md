# Check Ids — Contract Amendment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every check in a task brief a stable id that its report must
answer, so promised-versus-answered becomes checkable — and close the one
contract copy that genuinely has no drift test.

**Architecture:** Documentation, two tests, and one generator function. No
product runtime changes.

**Tech Stack:** Node's built-in `node:test`, TypeScript 5.6, plain Markdown.

**Plan 1 of 4** for
`docs/superpowers/specs/2026-08-07-cairn-owner-verdict-design.md`.

**Revised by Task 204** after an adversarial review. The first version's Task A
was built on a false premise — it claimed `app/resources/contract.md` ships
unguarded, when that file and `core/assets/contract.md` are **gitignored build
artifacts** regenerated from the canonical template and cannot drift. That task
is deleted. Its replacement covers `AGENTS.md`, which is tracked,
hand-maintained, and genuinely untested. Four other defects that would have
stopped an engineer are fixed and marked below.

## Global Constraints

- **Three contract copies are SOURCES, edited by hand.** `CONTRACT-TEMPLATE.md`
  (canonical), the `<script type="text/plain" id="src-contract">` block in
  `cairn.html`, and `AGENTS.md` (this project's live instance). Every amendment
  edits all three.
- **Two are BUILD OUTPUTS and are never edited or staged.**
  `core/assets/contract.md` (from `core/scripts/sync-contract.mjs`) and
  `app/resources/contract.md` (from `app/scripts/copy-assets.mjs`). Both are
  gitignored — `.gitignore:8`, `app/.gitignore:4`, `core/.gitignore:3` — and
  `git add` **exits 1** on them. Regenerate; never hand-edit.
- **What the mirror test actually enforces:** `core/test/contract-mirrors.test.mjs`
  compares `core/assets/contract.md` and `cairn.html`'s embedded block against
  `CONTRACT-TEMPLATE.md`. It runs after `npm run build`, which is why the
  generated copy is meaningful there. `AGENTS.md` is compared to nothing —
  Task A fixes that.
- **`AGENTS.md` differs from the template only inside the first fenced
  ```text``` block** (the project facts, lines 13-17). Verified 2026-08-07 at
  `83dfd0d`: everything outside that block is byte-identical.
- **`cairn.html`'s line numbers are offset from the `.md` copies** by the HTML
  wrapper. Never reuse the others' numbers for it.
- **Line endings:** the mirror test normalises `\r\n?` to `\n` before
  comparing. Write LF.
- **No task number is claimed by this plan.** Each task is claimed at execution
  time under the contract's own rule.
- **Nothing is pushed. No paid model call.**

---

### Task A: Cover the one contract copy that has no drift test

`AGENTS.md` is the contract this repository actually runs under, it is
hand-edited by every amendment, and nothing compares it to anything. Tasks B
and C both edit it, so this lands first.

**Files:**
- Modify: `core/test/contract-mirrors.test.mjs:11-33`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: a mirror test that fails when `AGENTS.md` drifts from the template
  outside the project-facts block. Tasks B and C rely on it.

- [ ] **Step 1: Write the failing assertion**

In `core/test/contract-mirrors.test.mjs`, add this helper above the existing
`test(...)` call:

```javascript
/** The contract text with the first fenced project-facts block removed.
 * AGENTS.md is the template plus this project's facts; everything else must
 * match byte for byte. */
function withoutProjectFacts(value) {
  return value.replace(/```text\n[\s\S]*?\n```/, "```text\n<facts>\n```");
}
```

Then add a second `test(...)` after the existing one:

```javascript
test("AGENTS.md matches the canonical template outside its project facts", () => {
  const repository = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const canonical = normalizeLineEndings(
    readFileSync(join(repository, "CONTRACT-TEMPLATE.md"), "utf8"),
  );
  const live = normalizeLineEndings(
    readFileSync(join(repository, "AGENTS.md"), "utf8"),
  );
  assert.equal(
    withoutProjectFacts(live),
    withoutProjectFacts(canonical),
    "AGENTS.md drifted from CONTRACT-TEMPLATE.md outside the project-facts block",
  );
});
```

- [ ] **Step 2: Prove it red by deliberate divergence**

The files agree today, so a new assertion passes immediately and proves
nothing. Diverge one on purpose — the A/B control method Task 197 used.
**`AGENTS.md` is tracked, so `git checkout` genuinely restores it.** (The
deleted first version of this task tried the same trick on a gitignored file,
where `git checkout` cannot restore and `git status` cannot detect the failure.)

Run:

```bash
printf '\nDIVERGENCE PROBE\n' >> AGENTS.md && node --test core/test/contract-mirrors.test.mjs; git checkout -- AGENTS.md
```

Expected: FAIL naming `AGENTS.md drifted from CONTRACT-TEMPLATE.md`.

- [ ] **Step 3: Confirm the restore and that both tests pass**

Run:

```bash
git status --porcelain AGENTS.md && node --test core/test/contract-mirrors.test.mjs
```

Expected: `git status` prints nothing (tracked file restored), then PASS with
2 passing.

- [ ] **Step 4: Commit**

```bash
git add core/test/contract-mirrors.test.mjs
git commit -m "Guard AGENTS.md against drifting from the canonical contract"
```

---

### Task B: Make the taken-number rule match its implementation

The written rule says a number is taken if its **brief** exists. Task 148 has
no brief — `3e0be00` renumbered it away — but holds `148-report.md` and a
STOPPED log row. A reader following the prose would reuse it. The code already
refuses it, and it does not enumerate file kinds: `taskNumbersInDir` matches
`/^(\d{3,})-/` against every entry (`cli/src/flows/claim.ts:37`) and the branch
scan applies the same match (`cli/src/flows/claim.ts:93`).

**Files:**
- Modify: `CONTRACT-TEMPLATE.md:79-80`
- Modify: `AGENTS.md:79-80`
- Modify: `cairn.html:171-172` — **offset by the HTML wrapper; do not reuse the
  numbers above.**

**Interfaces:**
- Consumes: Task A's `AGENTS.md` coverage.
- Produces: the amended rule. Task C edits the same three files, **two lines
  lower**, because this task adds two lines above them.

- [ ] **Step 1: Verify the current text is identical in all three sources**

Run:

```bash
grep -n "a number is taken if its brief file exists" CONTRACT-TEMPLATE.md cairn.html AGENTS.md
```

Expected: three matches, one per file.

- [ ] **Step 2: Replace the sentence in all three**

Replace this exact text:

```text
  `docs/ai-work/tasks/`: a number is taken if its brief file exists,
  committed or not.
```

with the rule the code actually implements — **not** a narrower one naming two
file kinds, which would drift again the moment a third record type is added:

```text
  `docs/ai-work/tasks/`: a number is taken if **any file there begins with
  it** — a brief, a report, or any later record — committed or not. A
  renumbered task can leave a report behind with no brief, and reusing that
  number would collide a new task with a finished run's records.
```

Note there is no repository-specific example here: `CONTRACT-TEMPLATE.md` is
copied into every project, so "Task 148" would be meaningless there. The Task
148 evidence belongs in this task's report.

- [ ] **Step 3: Regenerate the build outputs and run the mirror tests**

```bash
node core/scripts/sync-contract.mjs && node --test core/test/contract-mirrors.test.mjs
```

Expected: PASS, 2 passing. A FAIL names whichever source was missed.

- [ ] **Step 4: Run the full suites**

Run: `npm test --workspaces`
Expected: PASS, core and cli both green.

- [ ] **Step 5: Commit — three source files only**

The two generated copies are gitignored and `git add` would exit 1 on them.

```bash
git add CONTRACT-TEMPLATE.md cairn.html AGENTS.md
git commit -m "A task number is taken by any record file, matching the code"
```

---

### Task C: Amend the contract for stable check ids

**Files:**
- Modify: the brief rule at line 40 and the report rule at lines 145-147 in
  `CONTRACT-TEMPLATE.md` and `AGENTS.md` — **145-147, not 143-145: Task B adds
  two lines above them.** Re-grep rather than trusting these numbers.
- Modify: the same two rules in `cairn.html` — **offset; re-grep.**
- Modify: `CONTRACT-TEMPLATE.md:3`, `cairn.html`, `AGENTS.md:3` — the version
  string.
- Modify: `core/package.json` (register the new test)
- Create: `core/test/contract-check-ids.test.mjs`

**Interfaces:**
- Consumes: Task A's coverage; Task B's amended files.
- Produces: the id format `c1`…`cM` that Plans 2–4 parse, and a contract at
  v0.8.0.

- [ ] **Step 1: Write the failing test that pins the amendment**

Create `core/test/contract-check-ids.test.mjs`. **The assertions collapse
whitespace before matching**, because the contract's prose is hard-wrapped and
a literal-space regex cannot cross a line break — the defect that made the
first version of this plan permanently red where it claimed green:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Line endings normalised and every whitespace run collapsed, so a hard-wrapped
 * sentence matches the same regex as a single-line one. */
function contractText(file) {
  return readFileSync(join(REPOSITORY, file), "utf8").replace(/\s+/g, " ");
}

for (const file of ["CONTRACT-TEMPLATE.md", "AGENTS.md"]) {
  test(`${file} requires each brief check to carry a stable id`, () => {
    assert.match(
      contractText(file),
      /each check carries a stable id of the form `cN`/,
      "the brief rule naming the check-id format is missing",
    );
  });

  test(`${file} requires the report to answer every brief check by id`, () => {
    assert.match(
      contractText(file),
      /answering every id the brief declared, and naming any check added during the work/,
      "the report rule requiring per-id answers is missing",
    );
  });

  test(`${file} declares contract version 0.8.0`, () => {
    assert.match(contractText(file), /Cairn Contract v0\.8\.0/);
  });
}
```

- [ ] **Step 2: Register the test, then run it to verify it fails**

`core/package.json`'s `test` script is an explicit file list, not a glob — an
unregistered test file is silently never run. Add
`test/contract-check-ids.test.mjs` immediately after
`test/contract-mirrors.test.mjs` in that list.

Run: `node --test core/test/contract-check-ids.test.mjs`
Expected: FAIL, 6 failing (two files × three assertions).

- [ ] **Step 3: Amend the brief rule in all three sources**

Replace this exact line:

```text
3. Restate the visible outcome and write a short task brief.
```

with:

```text
3. Restate the visible outcome and write a short task brief. Its checks are a
   numbered list, and each check carries a stable id of the form `cN` — `c`
   then the check's position — so a report can answer it and a later reader can
   find it. The id carries no task number: renumbering a task rewrites its
   heading, not its body, so a task-numbered id would survive pointing at the
   old number.
```

- [ ] **Step 4: Amend the report rule in all three sources**

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

This governs briefs a lane writes. It does not govern the adapter contract
`briefText()` generates at `core/src/serial.ts:250`, which emits a worker-facing
`## Checks` block with no ids; wording the rule to cover that would put Cairn's
own runtime in violation on every dispatch. Bringing the runtime into line
belongs to Plan 2.

- [ ] **Step 5: Bump the contract version in all three sources**

The declared version is the only drift signal the contract defines, and it is
machine-read. Replace `Cairn Contract v0.7.0` with `Cairn Contract v0.8.0`.

- [ ] **Step 6: Regenerate, then run both test files**

```bash
node core/scripts/sync-contract.mjs && node --test core/test/contract-check-ids.test.mjs core/test/contract-mirrors.test.mjs
```

Expected: PASS, 8 passing.

- [ ] **Step 7: Run the full suites**

Run: `npm test --workspaces`
Expected: PASS. Core's count rises by 6.

- [ ] **Step 8: Commit — sources, the test, and the registration**

```bash
git add CONTRACT-TEMPLATE.md cairn.html AGENTS.md core/test/contract-check-ids.test.mjs core/package.json
git commit -m "Brief checks carry stable ids; reports answer every one (contract v0.8.0)"
```

---

### Task D: Emit the id format from the brief generator

**Files:**
- Modify: `cli/src/flows/claim.ts:128-158` (`briefSkeleton`)
- Modify: `cli/test/claim.test.ts`

**Interfaces:**
- Consumes: Task C's amended contract and the `cN` format.
- Produces: `briefSkeleton(n, title, laneLabel, baseCommit)` — unchanged
  signature, amended output.

- [ ] **Step 1: Write the failing test**

Add `briefSkeleton` to the existing import block at the top of
`cli/test/claim.test.ts`:

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

Then add:

```typescript
test("the brief skeleton pre-labels its checks with stable ids", () => {
  const skeleton = briefSkeleton(7, "a visible outcome", "A (main checkout)", "abc1234");
  assert.match(skeleton, /## Checks that will show the outcome holds/);
  assert.match(skeleton, /1\. \*\*`c1`\*\*/, "the first check must be pre-labelled `c1`");
  assert.match(skeleton, /2\. \*\*`c2`\*\*/, "the second check must be pre-labelled `c2`");
  assert.ok(
    !/`\d{3}\.c\d`/.test(skeleton),
    "ids must not carry the task number — renumbering would strand them",
  );
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd cli && npm test`
Expected: FAIL on "the first check must be pre-labelled `c1`" — the current
skeleton emits `1. TODO: exact commands...`.

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

1. **\`c1\`** — TODO: exact command, named so a later conversation can re-run
   it, and what its output must show.
2. **\`c2\`** — TODO.
```

`briefSkeleton` returns a template literal, so every literal backtick inside it
needs a leading backslash. No `${nnn}` interpolation is needed here — that is
the point of dropping the task number.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd cli && npm test`
Expected: PASS, all cli tests green.

- [ ] **Step 5: Run the full suites**

Run: `npm test --workspaces`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add cli/src/flows/claim.ts cli/test/claim.test.ts
git commit -m "Brief skeleton pre-labels checks with stable ids"
```

**No scratch-clone probe.** The first version of this plan ended with
`cd cli && npm run build && node dist/src/index.js claim "a throwaway probe"` in
a fresh clone. That step was wrong three ways: `cli/src/index.ts:11` reads
`process.cwd()`, which would be `<clone>/cli` and contains no
`docs/ai-work/tasks`; `cli` imports `@cairn/core` and cannot build alone; and
cloning plus installing is work outside the named repository and a dependency
install, both of which `AGENTS.md:224-233` puts behind an owner pause that the
step never named. Step 1 already calls `briefSkeleton` directly, which is the
same proof without leaving the repository.

---

## How we would know this plan held

- `npm test --workspaces` passes, core and cli both green, with core's count up
  by 6 from Task C.
- The mirror test fails when `AGENTS.md` diverges from the template outside its
  facts block, proven by deliberate divergence rather than asserted.
- The check-id test fails when any of the three sources is missed, proven the
  same way.
- A brief written by `cairn claim` after Task D carries `` **`c1`** `` and no
  task-numbered id.
- No `git add` in this plan names a gitignored path.
- `git diff --stat` across the four tasks touches only the three contract
  sources, `claim.ts`, `core/package.json`, and tests.

## Deliberately not in this plan

- **The verdict record, the queue, and the conductor's read access.** Plans
  2–4, unwritten until this format has been used on real briefs.
- **Bringing `briefText()` and `composeWorkerReport` into line with the id
  rule.** Plan 2 needs it; the amendment is scoped so the runtime is not in
  violation meanwhile.
- **Teaching `renumberTask` about ids.** Dropping the task number from the id
  removes the need entirely.
- **Retrofitting ids onto existing briefs.** They record `rubric: "none"`.
