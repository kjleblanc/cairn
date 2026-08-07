# Task 205 report — stable check ids in the contract and the generator

**Lane:** A (the main checkout). **Base commit:** `6d86561`.

Executes `docs/superpowers/plans/2026-08-07-cairn-check-ids-contract-amendment.md`,
Plan 1 of 4 for the owner-verdict spec. Its four plan-tasks landed as four
commits: `03e9564`, `c5977ad`, `a18d763`, `a0a4967`.

## What actually changed

Eight files. No product runtime.

- `core/test/contract-mirrors.test.mjs` — a second test guarding `AGENTS.md`.
- `CONTRACT-TEMPLATE.md`, `cairn.html`, `AGENTS.md` — the three hand-edited
  contract sources: the taken-number rule, the brief rule, the report rule, and
  the version, now v0.8.0.
- `core/test/contract-check-ids.test.mjs` (new) — pins the amendment.
- `core/package.json` — registers that test in the enumerated list.
- `cli/src/flows/claim.ts` — `briefSkeleton` emits ids.
- `cli/test/claim.test.ts` — the generator test.

The two generated contract copies were regenerated with
`core/scripts/sync-contract.mjs` and never hand-edited or staged.

## Checks run and real results

Answered by the ids `205-brief.md` declared. Output was observed in Lane A's
terminal and is not saved in the repository.

- **`c1` — the `AGENTS.md` drift guard works.** PASSED. Appending a probe line
  to `AGENTS.md` produced `AssertionError: AGENTS.md drifted from
  CONTRACT-TEMPLATE.md outside the project-facts block`; `git checkout --
  AGENTS.md` restored it and `git status --porcelain` confirmed clean. Both
  mirror tests then passed. **This is why the plan's original Task A was
  deleted:** it tried the same probe on `app/resources/contract.md`, which is
  gitignored, where `git checkout` cannot restore and `git status` cannot
  detect the failure.
- **`c2` — the taken-number rule matches the code.** PASSED. All three sources
  now read "a number is taken if **any file there begins with it** — a brief, a
  report, or any later record". Stated generally rather than naming two file
  kinds, which would drift again when a third record type appears — and the
  owner-verdict spec adds exactly that. `grep -n "148" CONTRACT-TEMPLATE.md`
  returns nothing: the portable template carries no Cairn-specific example.
- **`c3` — the amendment is pinned, and every source is covered.** PASSED, and
  the coverage was proven rather than asserted. The new test failed first (6
  failing, both files × three assertions). Then, one source at a time:
  neutering the report rule in `AGENTS.md` fails `contract-check-ids`;
  neutering it in `cairn.html` fails `contract-mirrors` with "src-contract
  script block drifted"; `CONTRACT-TEMPLATE.md` is read directly by the new
  test. Each probe was restored and the tree verified clean. The contract
  declares v0.8.0.
- **`c4` — the generator emits ids.** PASSED. Failed first on "the first check
  must be pre-labelled `c1`". A real `briefSkeleton(206, …)` call now returns a
  Checks section reading ``1. **`c1`** — TODO: exact command…`` with no
  task-numbered id anywhere.
- **`c5` — suites and staging.** PASSED. `npm test --workspaces`: **core 185
  tests, 185 pass, 0 fail; cli 24 tests, 24 pass, 0 fail** — against the
  `6d86561` baseline of core 178 and cli 23, so +7 and +1, all new. Every file
  in `git diff --name-only ce829d0..HEAD` was run through `git check-ignore`:
  none is ignored. Working tree clean.

## Two traps hit, both recorded so the next amendment does not pay them again

1. **`cairn.html` carries the contract version twice** — the page eyebrow at
   `:43` and the embedded contract at `:95` — and `contract-mirrors.test.mjs`
   compares only the embedded block. An amendment that bumped one would leave
   the page displaying a stale version with every test green. The edit script's
   per-file occurrence count caught it and refused to write; both are now
   v0.8.0.
2. **The brief rule's original sentence is a prefix of its replacement.** "3.
   Restate the visible outcome and write a short task brief." still matches
   inside the amended text, so a second pass appended the new clause twice in
   `CONTRACT-TEMPLATE.md`. Caught immediately by a post-edit occurrence count,
   and the mirror test is what proved the three sources agreed again after the
   repair. A find-and-replace whose needle survives in its own replacement is
   not idempotent, and a script that reruns is not safe by default.

## How to try it

```
cd cli && npm run build
node -e "import('./dist/src/flows/claim.js').then(m => console.log(m.briefSkeleton(206,'a visible outcome','A (main checkout)','abc1234')))"
```

The Checks section carries `` **`c1`** `` and `` **`c2`** ``. Then read
`AGENTS.md:40-46` for the brief rule and `AGENTS.md:150-154` for the report
rule.

## Limitations and remaining human judgment

- **Nothing enforces the ids yet.** The contract requires them and the
  generator emits them; no check verifies that a given report answered every id
  its brief declared. That verification is what makes promised-versus-answered
  actually checkable, and it belongs to Plan 2, which needs to parse them
  anyway.
- **The 199 existing briefs are untouched** and record `rubric: "none"` under
  the spec's Decision 3.
- **`briefText()` at `core/src/serial.ts:250` still emits an id-less `## Checks`
  block** on every dispatch. The amendment is deliberately scoped to briefs a
  lane writes so Cairn's own runtime is not in violation; Plan 2 owns bringing
  it into line.
- **Whether the id format actually helps is unproven.** Two briefs have used it
  — 204 and 205 — and neither has been read by anyone but its author. That is
  the question this plan landed first to answer.
- **No paid call was made and nothing was pushed.** Measured immediately before
  this report landed, `git rev-list --count origin/main..main` returned **117**.

**Disposition: DONE**
