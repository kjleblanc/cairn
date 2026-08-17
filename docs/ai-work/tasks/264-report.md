# Task 264 — Report

Lane: worktree `.claude/worktrees/wonderful-banach-10effe`, branch
`claude/peaceful-elion-eb127e`. Base commit synced from: `31df581`.

## What actually changed

Eight CP1252 double-encodings are gone, and a test now fails if one returns.

| File | Change |
|---|---|
| `core/src/serial.ts` | 2 byte repairs; 2 dead overwrite blocks removed (10 lines) |
| `core/src/codex.ts` | 3 byte repairs |
| `core/src/candidate.ts` | 2 byte repairs |
| `app/src/renderer/components/HarnessRevision.tsx` | 1 byte repair, a different sequence — see below |
| `core/test/source-encoding.test.mjs` | **new** — the guard |
| `core/package.json` | runs the guard in core's test script |
| `docs/ai-work/tasks/264-brief.md` | committed alone at `edb3a3e` to claim the number |
| `docs/ai-work/tasks/264-report.md`, `docs/ai-work/LOG.md` | this record |

Every repair was a substitution on the file's byte buffer — read `Buffer`,
splice, write `Buffer`. No source file was decoded to a string and re-encoded,
so no editor round-trip could re-introduce the corruption it was fixing.

## The correction that changes the task

The brief was given two sites in `serial.ts` as urgent because they reach the
owner's run strip. **They do not, and never did.** Each is pushed and then
discarded by the very next statement:

```js
projected.push({ stage: "Result", state: "stopped", detail: `STOPPED â€” ${...}` });  // 4700
projected[projected.length - 1] = {                                                  // 4701
  stage: "Result", state: "stopped", detail: `STOPPED — ${...}`,                     // 4704
};
```

`candidateActivityView` (serial.ts:1464) returns `activities.map(...)` — a plain
array, no proxy — and nothing reads `projected` between the two statements, so
the index assignment replaces the pushed object before `Object.freeze` returns
it. Confirmed as JS semantics too: `a.push({d:"BAD"}); a[a.length-1]={d:"GOOD"}`
yields `[{"d":"GOOD"}]`. The same shape repeated at 4715–4720.

`git log -L 4694,4722:core/src/serial.ts` shows both the corrupt push and its
overwrite arriving in `35e5607` together. This was an in-commit self-repair that
patched over the bad line instead of editing it.

So the defect was never a wrong string on screen. It was a booby trap: the two
overwrite blocks looked redundant, and deleting them — an obviously
correct-looking cleanup — would have made the mojibake live. Repairing the bytes
defused it, and the owner then chose to remove the blocks in this task, which is
now safe because both object literals are textually identical: same three keys,
same order, same values.

The three sites in `codex.ts` were the genuinely live ones. They compose worker
instruction text sent to the model, so every dispatched worker has been reading
`Required Task Spec promises â€” every cN must be answered`.

## Checks

**c1 — the guard was watched failing first.** Written before any repair.
`node --test core/test/source-encoding.test.mjs` reported all 8 sites with
`file:line` and the offending line, failing for the right reason:

```
core/src/candidate.ts:3322   (twice)
core/src/codex.ts:1483, 1507, 1509
core/src/serial.ts:4700, 4715
app/src/renderer/components/HarnessRevision.tsx:41
```

**c2 — `core/src` holds no `c3 a2` byte pair.** An independent scanner (not the
test under review) walks the tree and reports every occurrence; it prints
nothing. Re-confirmed after every later edit.

**c3 — only the intended bytes changed.** Proved rather than eyeballed: each
file's blob was read back with `git show HEAD:<path>`, the 8-byte run replaced
with `e2 80 94` in memory, and the result compared to the working tree.

```
core/src/serial.ts:    replacements=2 identical=true
core/src/codex.ts:     replacements=3 identical=true
core/src/candidate.ts: replacements=2 identical=true
```

Byte counts corroborate: each replacement drops 5 bytes, and the files shrank by
10, 15, and 10. `git diff` showed exactly 6 changed lines, each differing only in
that character. Adjacent non-ASCII was untouched — the curly apostrophes in
`Cairn’s` two lines below codex.ts:1507 are unchanged.

**c4 — the guard covers all four directories.** Not assumed: a probe file
carrying the byte pair was planted in each of `core/src`, `app/src`, `app/lab`,
and `cli/src`, and the guard reported all four with correct line numbers, then
went green when they were removed. The walker reaches 26 + 144 + 28 + 6 = 204
files, matching an independent extension census (133 `.ts`, 49 `.tsx`, 13
`.css`, 9 `.html`). It skips `node_modules`, `dist`, `.git`, and any file with a
NUL byte in its first 8 KB — Git's own binary heuristic — so an image dropped
into a source tree cannot fail it on chance bytes.

**c5 — the guard runs in `npm test -w @cairn/core`.** Added beside the existing
repo-wide `.mjs` checks, which is the established home for scans that need no
build. Root `npm test` runs `npm test --workspaces`, so it is reachable from the
top-level command too. It costs 35 ms.

**c6 — `npm run typecheck -w @cairn/core` is clean.** Exit 0, no output.

**c7 — the full core suite passes.** `npm test -w @cairn/core`, output at
`scratchpad/core-suite-final.log`:

```
tests 519   pass 509   fail 0   skipped 10   duration_ms 941190   SUITE_EXIT=0
```

Against a baseline captured after the byte repairs but before the overwrite
removal — `tests 519 pass 508 fail 1 skipped 10` — where the single failure was
this guard on the then-unrepaired `app/src` file. Same test count, same skip
count, that one failure now green, nothing else moved.

Disclosed: one edit landed *after* that run. The guard's own doc comment spelled
out the mojibake characters by writing them, which put the forbidden byte pair
inside the guard itself — harmless today because `core/test` is not scanned, but
it would have made the test fail on itself the moment anyone widened the scan.
The comment now names the characters instead. No production file changed after
the suite ran; the guard was re-run green and re-proved against a planted probe.

### Checks added during the work

**c8 (addition) — the `app/src` repair merges cleanly with Task 263.** The
eighth site was not in the brief's list and is a *different* sequence:
`c3 a2 e2 80 a0 e2 80 99`, a double-encoded `→` (U+2192), repaired to
`e2 86 92`. Task 263 had already repaired it in the main checkout but had not
committed, so it was still present on `main` and in this worktree, and the guard
could not go green without it. The owner chose repair here over shipping a red
test. The resulting blob hash is `57d0a9c` — identical to Task 263's pending
version — so the two changes are the same change and will merge without
conflict, unless Task 263 edits that line further before committing.

**c9 (addition) — the removal of the dead overwrite blocks is behaviour-
preserving.** The retained push and the deleted assignment carried identical
object literals, so the array is unchanged. `stopReasonInPlainWords`
(`records.ts:590`) is now called once per terminal instead of twice; it is an
exported pure mapping from reason code to plain words, so the count does not
matter. See the limitation below.

## How to try it

Run the guard on its own — no build needed, well under a second:

```bash
node --test core/test/source-encoding.test.mjs
```

To watch it catch a reintroduction, plant a probe and run it again:

```bash
node -e 'require("fs").writeFileSync("cli/src/probe.ts", Buffer.concat([Buffer.from("const x = \"a "), Buffer.from([0xc3,0xa2,0xe2,0x82,0xac,0xe2,0x80,0x9d]), Buffer.from(" b\";\n")]))'
```

Then delete `cli/src/probe.ts`. The failure names the file, the line, and the
line's text.

## Whether `serial.ts:4700`/`4715` deserve a pinned test

**No — and the reason is the finding above.** A test pinning the observable
`detail` on that path would have passed before this repair and after it, because
the observable value was already correct. It could not have caught this bug, and
a test that cannot fail for the defect it is aimed at is worse than no test: it
reads as coverage.

The four correct siblings are pinned because their strings are what the owner
reads; those assertions guard the *wording*, and they work. The instrument that
matches *this* risk is the byte guard, because the risk is character corruption
in source, not a logic error — and the guard covers all four sites, the four
siblings, and every file in four directories, for 35 ms and no build.

One thing did change: with the overwrite blocks gone, the push at 4700/4715 is
now the live value. That raises the stakes on those two lines, and the guard is
exactly what watches them.

## Limitations and remaining human judgment

- **The pre-seal candidate path has no test coverage.** No test in `core/test`,
  `app/tests`, or `cli/test` names `pre-seal candidate was finalized`. The
  519-test suite therefore cannot independently confirm that removing the
  overwrite blocks preserved behaviour; that rests on the two literals being
  textually identical, which is checkable by reading the diff but is not proved
  by a run. Worth a task if that path is ever worth pinning.
- **The guard scans four directories, not the whole repository.** Test
  directories, `docs/`, and the contract sources are unscanned. `core/test`
  contains this guard, which deliberately avoids embedding the byte pair in its
  own failure message so that widening the scan later cannot make it fail on
  itself.
- **`c3 a2` is the needle, and it is the right one for punctuation**: every
  character in U+2000–U+2FFF encodes to UTF-8 starting with `e2`, which CP1252
  renders as `â`, so one pair catches em dashes, en dashes, curly quotes,
  ellipses, and arrows alike. It would also flag a deliberate `â` — in a French
  string, say. Nothing in the repository writes one today; if that changes, the
  guard needs an exception rather than deletion.
- **The eighth repair writes under `app/src/renderer`**, which Task 263 is
  restyling. It is one line and byte-identical to 263's own pending fix (c8),
  but it is a write into another lane's area, made on the owner's explicit
  decision.
- Nothing was pushed. No provider, model, credential, network, dependency,
  external write, or deployment was involved.

Disposition: DONE
