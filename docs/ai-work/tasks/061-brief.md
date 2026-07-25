# Task 061 — Brief

Requested visible outcome: build the core side of the owner-details channel
(Phase 3 Task 3). The conductor gathers the owner's own data — numbers, names,
exact wording — but the task pipeline carries only the outcome sentence today.
In the first milestone run (task 055) the owner's word counts were silently
dropped and the worker invented plausible ones. After this task the contract is
`cairn-serial-task/v2` with a `details` field carried verbatim; the contract
digest binds outcome and details together; the brief shows the details; the
worker prompt hands them over unedited; and the disclosure the owner
byte-confirms carries both parts, with the codex authorization gate recomputing
its expected card from the contract's details — the seam that would otherwise
refuse every detailed dispatch.

Boundary of intent: `core/src/routing.ts`, `core/src/serial.ts`,
`core/src/codex.ts`, `core/test/serial.test.ts`, `core/test/codex.test.ts`,
plus this task's three record files. No version bump, no milestone movement, no
app or cli source change: the app's two `disclosure?.(outcome)` call sites are
Phase 3 Task 5's scope and are deliberately left alone here. Rendered brief
bytes for a task with no details must be unchanged; the offline demo adapter
still echoes the digest it was given.

Checks that will show the outcome holds:

- `cd core && npm test` — RED first for content reasons (the v1 literal, the
  missing details field, the outcome-only digest, the outcome-only disclosure),
  then GREEN across the whole suite.
- `npm test` at the repo root — core and cli both green, proving the defaulted
  `details` parameter keeps every existing caller working.
- `grep -rn "cairn-serial-task/v1" core/src core/test` — no site left behind.
- A rendered brief inspected directly for the `## Details (verbatim)` section,
  and for byte-unchanged spacing when there are no details.

DONE means: `AdapterTaskContract` is v2 with `details: string`;
`requestedOutcomeSha256` is always `sha256(JSON.stringify([outcome, details]))`;
`runSerialTask` accepts `options.details`; the brief renders
`## Details (verbatim)` blockquoted when non-empty; the worker prompt carries
`Details from the owner (use verbatim, do not restate):` with the text
unedited; `TaskAdapter.disclosure?(outcome, details)`,
`codexExecDisclosure(root, outcome, details)`, and
`authorizeCodexExec(root, outcome, details)` all take both parts;
`authorizationMatches` re-derives the expected card with `contract.details`;
and a worker result echoing the outcome-only digest against a details-bearing
contract fails closed. STOPPED means any of those does not hold or a suite is
not green.
