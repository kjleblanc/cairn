# Task 018 — prove the smallest serial Contract v2.0 core path

Lane: **Standard**

Reason: this is local, reversible implementation using already-installed tools and
new synthetic temporary data. It adds no dependency, network call, credential,
deployment, stored-data migration, destructive action, or external effect.

Mode: **Bootstrap Cairn — serial only**

## Visible outcome and milestone movement

An internal, default-off, mock-only core path completes one newly created synthetic
Standard task continuously under Contract v2.0. The task writes its brief, performs a
small visible build, runs finite checks, writes its report, appends an `Applied /
completed / DONE` log row, and returns `DONE` without an approval artifact, review
step, coordinator state, Git branch, or parallel worktree.

This is the smallest local proof of the v2 serial lifecycle that a later real-model
task can build on. It does not itself complete the real-model milestone.

Expected milestone movement: **YES**, because Cairn gains an executable Contract
v2.0 lifecycle where it previously had only the legacy gated core path and the
disabled parallel candidate.

## Files that may change

- `core/src/serial-v2.ts` — a new internal mock-only serial lifecycle.
- `core/test/steps.test.ts` — default-off, mock-only, artifact, and containment
  assertions using a newly created temporary project.
- `docs/ai-work/tasks/018-brief.md` — this boundary.
- `docs/ai-work/tasks/018-report.md` — final evidence.

Generated ignored build output under `core/dist` and `core/assets` may refresh when
the declared checks run.

## Files and behavior that must stay untouched

- Current CLI behavior, commands, and defaults.
- Current Desktop behavior, screens, and defaults.
- `core/src/steps.ts` and every existing approval or review gate.
- `core/src/coordinator.ts`, all coordinator tests, and all parallel candidate code.
- `core/src/index.ts`; the experiment is not added to the package's public root API.
- Package manifests, lockfiles, dependencies, build/release configuration, and
  public documentation.
- Real repositories, Git branches, worktrees, coordinator state, credentials,
  network services, and external systems.

## Protected starting work

The approved Contract v2.0 amendment is preserved in commit
`9a3d36f6bffbd76cee7b7df4ba3554927ea5728e`.

The following pre-existing modified file must remain unstaged and byte-identical:

- `docs/ai-work/LOG.md` — SHA-256
  `F428CCD609485334E4ABD13468A4B672C2FC6A4B21277AD8B0D6A99679C0C56E`.

The following pre-existing untracked files must remain untracked and byte-identical:

- `docs/ai-work/tasks/007-approval.json` —
  `1204556CD1F51DF44D0EA2069643FE71CAA9BCFC08413E30CC35C6BDA07F2691`;
- `docs/ai-work/tasks/008-approval.json` —
  `2CB40F65212506ED3037AB1B174A769C7307D1C8D071DA6A7B42B9EDE145344E`;
- `docs/ai-work/tasks/009-approval.json` —
  `78933AC2EB2A00B6F6C40F92C6EDD2D5EBAF37D98F96C77FCF64F017A366D822`;
- `docs/ai-work/tasks/011-report.md` —
  `C70BABB41335C4F2D8C39FB44430A915C14F389A86D254524BFDE3E24FADF5F8`;
- `docs/ai-work/tasks/014-report.md` —
  `A67C8E09DFABDAF9B600B692FD31551B456DA50DFC4D452FB1F4D891CF6C3795`.

Because the owner explicitly protected the existing root work-log change, this
bootstrap task will not append or stage a Task 018 row in the real project's
`docs/ai-work/LOG.md`. The synthetic lifecycle must append and verify its own row,
and the final report must disclose this project-history exception.

## First visible checkpoint

A targeted local test demonstrates both sides of the boundary:

1. with no serial-v2 flag, the call refuses before writing task artifacts;
2. with the exact opt-in flag and mock mode, a synthetic temporary project gains a
   visible build file, brief, report, and completed log row, and the call returns
   `DONE`.

## Implementation boundary

The new path may use existing file helpers, but it must remain separate from the
legacy gated steps and coordinator. It must:

- enable only when `CAIRN_SERIAL_V2_DRAFT=1`;
- require `CAIRN_MOCK=1`;
- accept only an active Cairn Contract v2.x project strictly beneath the operating
  system temporary directory;
- create no approval or decision JSON;
- invoke no reviewer;
- create no coordinator state, Git branch, commit, or worktree;
- use a fixed synthetic Standard outcome and fixed local mock build;
- check the built artifact before claiming success;
- write an `Applied / completed / DONE` log row itself; and
- leave all current entry points unwired so their default behavior is unchanged.

## Checks

- Inspect the focused source and test diff.
- Build core with the existing installed toolchain.
- Run the targeted serial-v2 tests from the compiled `steps.test.js`.
- Run the full existing core test suite.
- Confirm no approval, decision, coordinator, branch, worktree, or review artifact
  exists in the synthetic project.
- Confirm the synthetic brief, visible file, report, log row, and returned
  disposition agree.
- Run `git diff --check` on the named task files.
- Inspect the actual diff and final full Git status.
- Recheck every protected SHA-256 and confirm the protected files' tracked/untracked
  state did not change.
- If safe, make one exact-name local commit containing only the brief,
  implementation, test, and report. The protected root log is excluded.

## Uncertainty and assumptions

- This is intentionally a narrow mock proof, not the eventual real-model runner.
- A fixed synthetic Standard outcome is sufficient to prove the lifecycle shape;
  general outcome classification and model integration remain future work.
- The internal module is intentionally not exported from `core/src/index.ts`, so it
  does not add or change the supported package-root interface.
- Passing tests prove only the fixed temporary mock path they exercise.

## High-Stakes boundary

Stop before any dependency or build-system change, public API change, CLI/Desktop
wiring, real-model or credential use, network call, valuable-repository execution,
Git branch/worktree/coordinator operation, deployment, external write, destructive
action, or alteration of protected starting work. Each would require a separately
planned High-Stakes task or explicit authority.

## DONE and STOPPED

`Disposition: DONE` means the default-off and mock-only guards passed, one contained
synthetic Standard task completed through brief, build, checks, report, log, and
`DONE`, all existing core tests passed, current defaults and parallel code stayed
untouched, protected work retained its exact bytes and state, and the exact-name
implementation commit succeeded.

`Disposition: STOPPED — [stable blocker]` means any required lifecycle stage or
check did not complete, the boundary could not be proved, protected work changed,
or finishing would cross into High-Stakes work.
