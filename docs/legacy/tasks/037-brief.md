# Task 037 brief — Let Cairn commit verified Codex work

Date: 2026-07-22

## Requested visible outcome

One confirmed Codex Exec task can edit and check the selected workspace without
being asked to write protected Git metadata. After the process completes, Cairn
verifies the model-authored report and log, stages only the exact clean-start paths
created or changed by that task, and makes the one isolated local commit itself.
Stopped Desktop results never claim that records or Git were verified.

## Files or areas that may change

- `core/src/codex.ts` and `core/src/serial.ts`
- focused core fake-process tests
- Desktop stopped-result wording and focused Electron tests
- current README/changelog wording if it describes model-created commits
- this Task 037 report and one append-only `docs/ai-work/LOG.md` row

No dependency entry or lockfile may change.

## Protected starting work

- Project root: `C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework`
- Starting branch: `main`, two commits ahead of `origin/main`
- Starting HEAD: `ac34667` (`Task 036: retain failed real-call evidence`)
- Starting working tree and index: clean
- Tasks 000–036 and all existing log rows are append-only history

## First useful checkpoint

An authorized fake Codex process writes one product file, one matching report, and
one matching log row without touching Git. Cairn validates those artifacts, derives
the exact clean-start changed paths from Git status, stages exactly those names,
creates one commit, and returns DONE.

## Checks

- Core tests prove the fake process never invokes Git and Cairn creates exactly one
  clean-start commit containing only the derived task paths.
- Dirty-start work remains byte-identical and never enters a Cairn-created commit.
- Invalid records, protected-history changes, unsafe path shapes, or unexpected
  index/HEAD changes fail closed without broad staging or retry.
- Desktop DONE retains the verified wording; Desktop STOPPED says verification
  failed and retained evidence needs inspection.
- Core, CLI, Desktop typecheck/build, and Electron tests pass.
- `git diff --check` and dependency/scope audits pass.
- No real Codex process or model call runs during this repair.

## Important assumptions

- Official Codex documentation says `workspace-write` protects `.git`, while
  non-interactive runs cannot surface fresh approvals. Git commit authority must
  therefore stay with Cairn after model output is verified.
- A clean starting tree makes every post-process status path attributable to the
  single serial task. Cairn may stage those exact paths by name; it may not use a
  broad `git add` command.
- A dirty starting tree is not safely attributable. Cairn may verify a DONE result
  without committing it only when every protected starting path and the original
  HEAD/index remain unchanged.

## DONE and STOPPED

DONE means the prompt no longer requests a model-side commit, Cairn creates the one
exact-path clean-start commit after verification, stopped wording is honest, and all
fake-only checks pass.

STOPPED means exact path attribution, protected-work preservation, record matching,
or proportionate checks cannot be proved without another real call or wider scope.
