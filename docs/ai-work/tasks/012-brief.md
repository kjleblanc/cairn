# Task 012 — brief

**Lane:** High-Stakes — the proposed policy changes Cairn’s security and authority boundary.

**Mode:** Draft — produces a candidate for judgment, not an adopted rule.

## Visible outcome

Create `docs/ai-work/tasks/012-prepare-activate-policy-draft.md`, clearly labeled:

> NON-AUTHORITATIVE DRAFT — PREPARE ONLY — NOT ACTIVE

The Draft defines two gates:

### Prepare

Prepare permits AI-only work that has no live risky effect, including:

- analysis, design, documentation, and isolated prototypes;
- synthetic data and clearly fake credential canaries;
- offline tests, static checks, and local rehearsals;
- local task files and commits that do not change authoritative policy, defaults, runtime behavior, production, or external systems.

Prepare may reach `DONE` when its approved scope and checks complete, even without an experienced human.

`Prepare: DONE` means only that the offline candidate was completed and checked. It does not mean the candidate is correct, adopted, safe for live use, or authorized for Activate.

The default state after Prepare is:

> `Prepare: DONE — Activate: NOT AUTHORIZED`

### Activate

Activate begins before any action that would:

- adopt the Draft into Cairn’s project contract, canonical framework, defaults, or runtime;
- publish, push, release, deploy, distribute, or publicly describe it as active policy;
- access, create, inspect, store, use, rotate, or revoke a real credential;
- call an AI provider or another external service;
- incur cost, change billing, authorize spending, or move money;
- affect production, infrastructure, security controls, real users, or real data;
- send messages, write externally, perform destructive work, make legal commitments, or cause another live effect.

Every Activate action requires both:

1. a qualified experienced human appropriate to the affected risk; and
2. the owner’s separate, explicit approval of the exact action, target, cost where applicable, and rollback.

Approval of Prepare, acceptance of the Draft, a passing synthetic rehearsal, or a local commit never authorizes Activate.

### Task 011 status

The Draft must state that Task 011 is deferred historical work:

- its credential-exception candidate is unadopted and non-authoritative;
- it is not the baseline for Task 012;
- none of its proposed exceptions are imported;
- real credentials retain the expert and explicit-approval gates.

## Milestone relationship

This creates a judgeable route for AI-only preparation to finish honestly without weakening live-action protections. It is a visible planning checkpoint toward the real-model milestone, but it does not itself activate a real model or change Cairn’s operative policy.

## What may change

After the brief is separately saved, pinned, and approved:

- create `docs/ai-work/tasks/012-prepare-activate-policy-draft.md`;
- create `docs/ai-work/tasks/012-report.md`;
- commit those two files by exact name if the task reaches `DONE`.

## What must not change

Do not modify, stage, adopt, regenerate, or commit:

- `AGENTS.md`;
- `CONTRACT-TEMPLATE.md`;
- `HIGH-STAKES.md`;
- any other public documentation;
- `cairn.html` or any embedded contract copy;
- runtime code, defaults, tests, dependencies, build or release configuration;
- `docs/ai-work/LOG.md`;
- any Task 011 file or candidate;
- any existing modified, untracked, ignored, or generated file.

Do not install anything or make any network, provider, credential, paid, public, production, or external-service request.

## Protected starting work

The following current work must remain unchanged and unstaged:

- `CHANGELOG.md`
- `CONTRACT-TEMPLATE.md`
- `EVERYDAY-WORKFLOW.md`
- `GETTING-READY.md`
- `HIGH-STAKES.md`
- `README.md`
- `cairn.html`
- `docs/ai-work/LOG.md`
- `docs/ai-work/tasks/007-approval.json`
- `docs/ai-work/tasks/008-approval.json`
- `docs/ai-work/tasks/009-approval.json`
- `docs/ai-work/tasks/011-report.md`

Task 011’s pinned brief and all other historical task records must also remain untouched.

## What could be damaged

The main danger is that someone mistakes the Draft for active policy and uses it to bypass expert or owner authority.

That local confusion is reversible while the Draft remains isolated. A live action taken because of that confusion might not be reversible.

Controls:

- unmistakable non-authoritative labeling;
- isolation inside Task 012 files;
- no links from public or operative files;
- explicit `Activate: NOT AUTHORIZED` status;
- immediate stop if adoption or another live effect becomes necessary.

## Safe rehearsal

Use only clearly synthetic scenarios:

| Scenario | Required result |
|---|---|
| AI writes an isolated policy candidate and runs offline text checks | Prepare; may reach `DONE` |
| AI tests a prototype with clearly fake data and no active default | Prepare; may reach `DONE` |
| Synthetic checks pass | Prepare evidence only; Activate remains locked |
| Draft is copied into `AGENTS.md`, canonical documents, defaults, or runtime | Activate; expert and exact approval required |
| Draft is pushed, published, released, or deployed | Activate; expert and exact approval required |
| A real credential or provider login would be accessed | Activate; expert and exact approval required |
| Any provider or external network call would occur | Activate; expert and exact approval required |
| Cost, billing, spending, payment, or money is involved | Activate; expert and exact approval required |
| Production, users, real data, external writes, or destructive actions are involved | Activate; expert and exact approval required |

No real credential, provider, network, cost, production system, or external service may be used during rehearsal.

## Required experienced human

**None for Prepare.**

Concrete reason: Task 012 creates labeled local text only. It does not change an authoritative security boundary or cause a live effect.

A qualified security and authority reviewer is mandatory before any later Activate task adopts or publishes the policy. Other Activate actions require an experienced human appropriate to their particular risk.

Mandatory fresh-context AI review still applies to Task 012 before the owner closes it.

## Checks

The builder will:

1. Re-orient and confirm the pinned brief is unchanged.
2. Record full Git status and SHA-256 hashes for every protected modified or untracked file.
3. Confirm only the Draft and report are created during the build.
4. Check that the Draft defines Prepare, Activate, and the default locked state.
5. Check every Activate category listed above is present.
6. Check both expert review and exact owner approval are required for Activate.
7. Check Prepare can explicitly reach `DONE` without an expert when no live risky action occurs.
8. Check `Prepare: DONE` cannot be read as activation or safety approval.
9. Check Task 011 is described as deferred, unadopted history and its credential exception is not imported.
10. Walk the complete synthetic scenario matrix.
11. Run the existing `git diff --check`.
12. Inspect the actual diff and end-state Git status.
13. Recompute protected-file hashes and require exact matches.
14. Record that no installation, network request, credential access, provider call, cost, publication, or live effect occurred.

## DONE requires

- The isolated Draft and report are complete.
- The Draft is unmistakably non-authoritative.
- Prepare can reach `DONE` through AI-only work and synthetic verification.
- Activate remains locked after Prepare.
- Every listed Activate action retains both gates.
- Task 011 remains deferred and untouched.
- No operative policy, runtime, public artifact, or protected work changes.
- Every declared check passes.
- The implementation receives one exact-name local commit containing only the Draft and report.

`Disposition: DONE` means the Prepare artifact is complete. It does not activate the policy. The owner must still obtain the mandatory fresh-context review before closing the task.

## STOPPED conditions

- `DRAFT_AMBIGUOUS` — the artifact could reasonably be mistaken for active policy.
- `AUTHORITY_BOUNDARY_CROSSED` — an operative policy, default, or runtime would change.
- `EXPERT_GATE_WEAKENED` — an Activate category lacks qualified-human review.
- `APPROVAL_GATE_WEAKENED` — an Activate category lacks exact owner approval.
- `TASK_011_REACTIVATED` — Task 011’s candidate is reused or treated as authoritative.
- `LIVE_EFFECT_ATTEMPTED` — any credential, provider, network, money, production, publication, external write, or other live action is attempted.
- `PROTECTED_WORK_CHANGED` — starting work changes.
- `ROLLBACK_UNPROVEN` — the isolated result cannot be safely reversed.
- `SCOPE_DRIFT` — more than the Draft and report are needed.
- `CHECK_FAILED` — a declared check fails.
- `INSTALL_REQUIRED` — completion requires installing or updating anything.

A stopped build receives no success commit and preserves its exact state.

## Rollback plan

Before building, record the pinned-brief commit, starting commit, full status, and protected-file hashes.

If the completed Draft is later rejected:

1. Start a separately approved High-Stakes rollback task.
2. Verify the implementation commit contains only the Task 012 Draft and report.
3. Use an additive `git revert` of that exact implementation commit—never reset, clean, stash, or broadly restore.
4. Confirm the pinned brief remains as history.
5. Confirm every protected file retains its recorded hash.
6. Inspect the resulting diff and full Git status.

If the build stops before a success commit, preserve it exactly. Removing incomplete Task 012 files requires a separately approved rollback task.

## Actions requiring separate approval

None of these are authorized by this brief:

1. Saving and pinning the Task 012 brief.
2. Building the pinned brief in a fresh chat.
3. Contacting or sending material to an expert.
4. Adopting the Draft into any authoritative policy, public artifact, default, or runtime.
5. Pushing, publishing, releasing, distributing, or deploying it.
6. Accessing or using any real credential or login.
7. Making any provider or external network call.
8. Incurring cost or changing billing, spending, payment, or money settings.
9. Touching production, infrastructure, security controls, real users, or real data.
10. Sending messages or writing to an external service.
11. Performing destructive, irreversible, legal, or safety-critical actions.
12. Installing or updating anything.
13. Deleting, moving, or rolling back files.

## Plain-language summary

Task 012 would let Cairn finish safe offline preparation without pretending that preparation authorizes real-world action. The Draft stays isolated. Anything live remains behind both an expert gate and an exact owner-approval gate.
