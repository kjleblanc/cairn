# Task 264 — Repair the CP1252 double-encodings in `core/src` and guard against their return

Lane: worktree `.claude/worktrees/wonderful-banach-10effe`, branch
`claude/peaceful-elion-eb127e`. Base commit: `31df581`.

## Requested visible outcome

Seven characters under `core/src` are CP1252 double-encodings: the byte run
`c3 a2 e2 82 ac e2 80 9d`, which is an em dash `—` (U+2014, `e2 80 94`) read as
Windows-1252 and re-encoded as UTF-8, so it reads as `â€”`. After this task,
`core/src` holds no such byte run, and a cheap test fails — naming the file and
line — if one is ever committed again anywhere under `core/src`, `app/src`,
`app/lab`, or `cli/src`.

All of them trace to `35e5607 Complete Q9 bounded repair and critic lifecycle`,
one editing session that round-tripped several files through a Windows-1252
codec.

## What the sites actually are

Verified by byte offset before writing this brief:

| Site | Effect |
|---|---|
| `core/src/codex.ts:1483`, `1507`, `1509` | **Live.** Worker instruction text sent to the model. |
| `core/src/candidate.ts:3322` (twice) | Cosmetic. Inside a `//` comment. |
| `core/src/serial.ts:4700`, `4715` | **Dead.** See below. |

The two in `serial.ts` were requested as the urgent ones, on the understanding
that they reach the owner's run strip. **They do not.** Each is pushed and then
discarded by the very next statement:

```js
projected.push({ stage: "Result", state: "stopped", detail: `STOPPED â€” ${...}` });  // 4700
projected[projected.length - 1] = {                                                  // 4701
  stage: "Result", state: "stopped", detail: `STOPPED — ${...}`,                     // 4704
};
```

`candidateActivityView` (serial.ts:1464) returns `activities.map(...)` — a plain
array, no proxy — and nothing reads `projected` between the two statements, so
the index assignment overwrites the pushed object before `Object.freeze` returns
it. The same shape repeats at 4715–4720. Both the corrupt push and its overwrite
arrived in `35e5607` together, so this was an in-commit self-repair that patched
over the bad line instead of editing it.

The consequence is a booby trap, not a wrong string: today the two overwrite
blocks look redundant, and deleting them — an obviously correct-looking cleanup —
would make the mojibake live. Repairing the bytes defuses that.

## Boundary of intent

- No behavior changes. Every repaired character is exactly `—` (U+2014), so
  every string's runtime value is identical to what it already produced.
- The repair is a byte-level substitution on the file buffer, never a retyped
  line, so no editor round-trip can re-introduce the corruption.
- No dependency, stored-data, or security-posture change.
- **This lane does not write under `app/src/renderer`.** Task 263 is restyling
  it concurrently in the main checkout. The guard covers `app/src`, so it
  reports `app/src/renderer/components/HarnessRevision.tsx:41` — a *different*
  double-encoding, `c3 a2 e2 80 a0 e2 80 99` (`â†’`, a corrupt `→`). Task 263
  has already repaired it in the main checkout's working tree but has not
  committed it, so it is still present on `main` and in this worktree. Whether
  this lane repairs it too is an owner decision, raised in the report.
- No existing test is rewritten. Records and log rows are appended, never
  edited.

## Checks

1. **c1** — Before the repair, the new guard test fails and names every offending
   file and line. Proved by running it against the unrepaired tree.
2. **c2** — After the repair, a byte scan of `core/src` finds no `c3 a2` pair at
   all.
3. **c3** — Each repaired site holds exactly `e2 80 94` where the eight-byte run
   used to be, confirmed by byte offset, and the surrounding bytes are unchanged.
4. **c4** — The guard covers `core/src`, `app/src`, `app/lab`, and `cli/src`,
   skips binary files, and prints `file:line` for each hit.
5. **c5** — The guard runs as part of `npm test -w cairn-core`, alongside the
   existing repo-wide `.mjs` checks, and needs no TypeScript build.
6. **c6** — `npm run typecheck -w cairn-core` is clean.
7. **c7** — The full `npm test -w cairn-core` suite passes, proving the byte
   edits regressed nothing. (Slow: roughly 20 minutes, I/O-bound.)

## Whether `serial.ts:4700`/`4715` deserve a pinned test

Answered in the report against the evidence above, not assumed here. The short
form: a test pinning the observable `detail` would have passed both before and
after this repair, because the observable value was already correct — so it
could not have caught this, and the guard is the instrument that does.

## DONE / STOPPED

**DONE** means: `core/src` contains no `c3 a2` byte pair; the guard test was
watched failing before the repair and passes after; it is wired into core's test
script; typecheck and the full core suite pass; and the report answers c1–c7 and
the pinned-test question.

**STOPPED** means any of those does not hold — in particular if the core suite
shows a regression traceable to these edits, or if the guard cannot be made green
in this worktree without writing under `app/src/renderer`.
