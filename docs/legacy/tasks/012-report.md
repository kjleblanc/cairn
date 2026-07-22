# Task 012 — report

## Result (plain language)

An isolated Draft now defines a clean separation between safe offline preparation
and any action with a live effect.

- Prepare may reach `DONE` through AI-only local work and synthetic checks when no
  live risky action occurs.
- The locked state after preparation is
  `Prepare: DONE — Activate: NOT AUTHORIZED`.
- Every Activate category requires both a qualified experienced human appropriate
  to the risk and the owner's separate, explicit approval of the exact action,
  target, cost where applicable, and rollback.
- Task 011 remains deferred, unadopted history. Its credential exception is not
  imported, and real credentials keep both gates.

The result is a candidate to judge, not active Cairn policy. No operative policy,
public artifact, default, runtime behavior, or external system changed.

## Starting point and protected work

- Pinned brief commit: `9139ad30bad47dbd1faf6bb53569739523622ac5`
  (`Task 012: pin Prepare Activate policy brief`).
- Starting commit: `9139ad30bad47dbd1faf6bb53569739523622ac5`.
- The pinned brief had no working-tree diff and started at SHA-256
  `E3F6DADD50073C002980F03EF32785CFA217911ED2928E2D75E9E072C8CFDF51`.
- There were no staged changes and neither permitted Task 012 output existed before
  the build.
- The following protected modified or untracked files were left unstaged and were
  recorded before building:

| Protected file | Starting SHA-256 |
|---|---|
| `CHANGELOG.md` | `760DF019240F8539E96074D8D8DFFAA3AC2E11EC85A573394AD6CCA15783CB85` |
| `CONTRACT-TEMPLATE.md` | `92B1D74630D2B4D588DBDD0670CF14CD45C78763AD8E9143624E458B2559E5BB` |
| `EVERYDAY-WORKFLOW.md` | `577CAD0E89C57C46733C5A2C1A666650D05D4850FA5287BA321ACD1C8E619ABC` |
| `GETTING-READY.md` | `5FA9D8A338FD2DF73AD4C05919A8C956D53D0933E34F11B0DA27FA0289920406` |
| `HIGH-STAKES.md` | `267161B307C7B4EE576353566112B6BE65E57391B7F8014793BAF9B58FCB2389` |
| `README.md` | `3AA6133267C2F437741101FC9F31F09C78F8C8246D3E9FA871F300AFA6D8A7B1` |
| `cairn.html` | `40B4EEE8707DD0CEB046BCF438025C51E3246982D95C2B5837566C169F80A0FF` |
| `docs/ai-work/LOG.md` | `E3909E66B04DBC3A4CF45825E305E50656B441F146247195C35F90DD527838C1` |
| `docs/ai-work/tasks/007-approval.json` | `1204556CD1F51DF44D0EA2069643FE71CAA9BCFC08413E30CC35C6BDA07F2691` |
| `docs/ai-work/tasks/008-approval.json` | `2CB40F65212506ED3037AB1B174A769C7307D1C8D071DA6A7B42B9EDE145344E` |
| `docs/ai-work/tasks/009-approval.json` | `78933AC2EB2A00B6F6C40F92C6EDD2D5EBAF37D98F96C77FCF64F017A366D822` |
| `docs/ai-work/tasks/011-report.md` | `C70BABB41335C4F2D8C39FB44430A915C14F389A86D254524BFDE3E24FADF5F8` |

## Files changed

- `docs/ai-work/tasks/012-prepare-activate-policy-draft.md` — the isolated,
  unmistakably non-authoritative Prepare/Activate candidate and synthetic scenario
  matrix.
- `docs/ai-work/tasks/012-report.md` — this report.

No other file was created, modified, staged, regenerated, adopted, or committed by
Task 012.

## Commands run and their real results

1. Re-orientation read the project contract, project memory, recent log rows, Task
   011 report, pinned Task 012 brief, maintainer standards, High-Stakes guide, commit
   history, and full Git status. Git showed the brief pinned at `9139ad3`, no brief
   diff, no staged work, and exactly the protected starting changes listed above.
2. SHA-256 baseline recording covered all 12 protected modified or untracked files,
   plus the pinned brief. Both Task 012 output paths were absent — **passed**.
3. The first text-check invocation failed in the JavaScript wrapper before
   PowerShell ran because Markdown backticks conflicted with wrapper quoting. It
   changed nothing and supplied no evidence.
4. The second invocation reached PowerShell but used the wrong `String.Replace`
   overload. PowerShell printed non-terminating errors and an invalid pass line. The
   entire result was discarded.
5. A strict rerun stopped with two missing-string results because Windows PowerShell
   decoded the UTF-8 em dashes using its legacy default. This was a checker-decoding
   failure, not a content pass, so it was also discarded.
6. The corrected strict checker used explicit UTF-8 decoding and checked 25 policy
   requirements — Prepare, Activate, the locked default, all Activate categories,
   both gates, the limited meaning of `Prepare: DONE`, and Task 011's deferred status.
   **25 passed, 0 failed**.
7. The same strict checker walked all nine approved synthetic scenario rows exactly.
   **9 passed, 0 failed**. It used no real credential, provider, network, cost,
   production system, or external service.
8. `git diff --check` used the repository's existing Git checker and produced no
   whitespace errors — **passed**. Git printed only pre-existing line-ending and
   inaccessible global-ignore warnings; neither changed a file or invalidated the
   check.
9. Exact-name staging, staged-diff inspection, staged whitespace checking, protected
   hash comparison, and final commit verification are recorded by the final state:
   the repository history contains one Task 012 implementation commit with only the
   Draft and this report. The final commit identifier is reported to the owner at
   handoff because a commit cannot contain its own identifier.

## Safe rehearsal result

Every approved scenario produced the required result:

| Scenario group | Observed result |
|---|---|
| Isolated writing, offline checks, fake data, or a prototype with no active default | Prepare; may reach `DONE` |
| Passing synthetic checks | Prepare evidence only; Activate stays locked |
| Adoption into policy, canonical documents, defaults, or runtime | Activate; both gates required |
| Push, publication, release, or deployment | Activate; both gates required |
| Real credential or provider login access | Activate; both gates required |
| Provider or external network call | Activate; both gates required |
| Cost, billing, spending, payment, or money | Activate; both gates required |
| Production, users, real data, external writes, or destructive work | Activate; both gates required |

This was a text rehearsal only. It proves that the Draft contains the approved
classifications; it does not prove the policy is correct or safe to activate.

## Rollback proof

The result is isolated to two new Task 012 files and changes no operative behavior.
The implementation commit is verified to contain only those additions. If the owner
later rejects the Draft, a separately approved High-Stakes rollback task can perform
an additive `git revert` of that exact implementation commit while retaining the
pinned brief as history.

Rollback was not executed because this brief forbids deletion, moving, or rollback
without separate approval. The isolation and exact commit boundary make the planned
revert specific and reviewable; the mandatory fresh-context reviewer must still
judge whether that proof is believable.

## How the owner can see or try the result

1. Open `docs/ai-work/tasks/012-prepare-activate-policy-draft.md` locally.
2. Confirm the first heading says
   `NON-AUTHORITATIVE DRAFT — PREPARE ONLY — NOT ACTIVE`.
3. Find `Prepare: DONE — Activate: NOT AUTHORIZED` near the top and again after the
   two Activate gates.
4. Read the Activate list. Success means every live category requires both a
   qualified experienced human and the owner's exact separate approval.
5. Read the Task 011 section. Success means Task 011 is deferred, unadopted history,
   none of its exceptions are imported, and real credentials retain both gates.
6. Read the scenario matrix. Success means only isolated, offline, synthetic work
   can finish as Prepare; every live scenario remains Activate.

Failure looks like the Draft appearing authoritative, Prepare implying safety or
activation, any live category missing either gate, or Task 011 being reused.

## What still needs a human check

- The owner should read the Draft using the steps above and decide whether it is a
  useful candidate.
- A mandatory fresh-context AI review must inspect Task 012 before the owner closes
  this High-Stakes task.
- No experienced human is required for this Prepare artifact because it is isolated
  local text with no live effect. A qualified experienced human appropriate to the
  affected risk is mandatory before any later Activate task.

## Limitations and remaining uncertainty

- Text checks prove that named wording and classifications are present. They cannot
  prove the policy is wise, complete, or safe to adopt.
- The Draft is not active policy and is not linked from any operative or public file.
- No real credential was requested, read, printed, stored, transmitted, rotated,
  revoked, or used.
- No installation, provider call, network request, cost, publication, push, release,
  deployment, production action, external write, destructive action, or other live
  effect occurred.
- No Task 011 file or candidate changed, and none of its credential exceptions were
  imported.
- Adoption or any other Activate action requires a new High-Stakes task, the
  appropriate qualified human, and the owner's separate explicit approval.

## Milestone movement

YES — Cairn now has a judgeable, credential-free planning checkpoint that lets safe
offline preparation finish honestly while keeping every live action locked. It does
not itself activate a real model or change operative Cairn policy.

Disposition: DONE

`Prepare: DONE — Activate: NOT AUTHORIZED`
