# Task 205 brief — stable check ids in the contract and the generator

**Lane:** A (the main checkout).

**Base commit:** `6d86561` — main after Task 204 corrected the owner-verdict
design and rewrote its Plan 1.

**Plan:** `docs/superpowers/plans/2026-08-07-cairn-check-ids-contract-amendment.md`
— Plan 1 of 4 for the owner-verdict spec. Its four plan-tasks land as four
commits under this one task number, the shape Task 197 used.

## Requested visible outcome

Every brief written from now on declares its checks with stable ids, and the
contract requires the report to answer each one. Concretely:

1. A brief created by `cairn claim` carries `**\`c1\`**` and `**\`c2\`**`
   placeholders instead of a bare `1. TODO`.
2. The contract says a brief's checks carry ids of the form `cN`, and that a
   report must answer every id the brief declared, naming any check added
   during the work as an addition.
3. The contract's taken-number rule matches what `claim.ts` actually does.
4. `AGENTS.md` — the contract copy this repository runs under, hand-edited by
   every amendment and until now compared to nothing — is guarded against
   drifting from the canonical template.

The point is the first one. Promised-versus-answered is not checkable today
because a brief's checks and a report's answers are two independently numbered
prose lists; Task 203 promised five checks and its report delivered seven.

## Boundary of intent — what must not change

- **No product runtime changes.** Contract prose, two test files,
  `core/package.json`'s test list, and `briefSkeleton` only.
- **The two generated contract copies are never hand-edited or staged.**
  `core/assets/contract.md` and `app/resources/contract.md` are gitignored
  build artifacts; `git add` exits 1 on them. Regenerate with
  `core/scripts/sync-contract.mjs`.
- **The amendment does not reach `briefText()`.** `core/src/serial.ts:250`
  generates the worker-facing adapter contract with no ids. Wording the rule to
  cover it would put Cairn's own runtime in violation on every dispatch;
  bringing it into line belongs to Plan 2.
- **No risk boundary moves. Nothing is pushed. No paid call.**
- **Task 203's and 204's records are not edited.**

## Checks that will show the outcome holds

1. **`c1`** — the `AGENTS.md` drift test fails when `AGENTS.md` diverges from
   the template outside its project-facts block, proven by deliberate
   divergence and then restored, and passes once restored.
2. **`c2`** — the taken-number rule in all three sources states the rule the
   code implements (any file beginning with the number, not just a brief), and
   carries no repository-specific example, since `CONTRACT-TEMPLATE.md` is
   copied into every project.
3. **`c3`** — a new test pins the two amended rules and the version bump, fails
   first when the sources are unamended, and would fail if any one of the three
   sources were missed. The contract declares v0.8.0.
4. **`c4`** — `briefSkeleton` emits `**\`c1\`**` and `**\`c2\`**` and no
   task-numbered id, asserted by a test that fails first.
5. **`c5`** — `npm test --workspaces` passes with both counts named against the
   `6d86561` baseline of core 178 and cli 23, and no `git add` in this task
   names a gitignored path.

## What DONE and STOPPED mean here

**DONE:** all five checks pass, a freshly generated brief carries the ids, and
the working tree holds only this task's own files.

**STOPPED:** a check cannot be made to pass without changing product runtime or
widening the amendment past the boundary above. In particular, if pinning the
amendment turns out to require `briefText()` to change, this task stops and
says so rather than reaching into the runtime.

**Remaining human judgment.** Whether the id format actually helps is a
question only real use answers; that is why this plan lands before the three
that build on it.
