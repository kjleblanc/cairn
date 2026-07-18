# Task 011 — brief

**Lane:** High-Stakes  
**Mode:** Final — implements the owner’s exact policy choice from the 2026-07-18 planning request: permit narrowly isolated, owner-managed local AI credentials without mandatory expert review while retaining the other expert-required categories.

## Visible outcome

Cairn Contract v1.3 and its High-Stakes guide define a narrow exception:

An owner-managed local AI credential does not require an experienced human solely because it is a credential, but only when every isolation condition below is established. “Local” by itself is not evidence of safety.

An **owner-managed local AI credential** means a credential that:

- the owner creates, installs, rotates, and revokes using the AI provider’s official local login mechanism or an operating-system credential store;
- Cairn never asks the owner to type or paste into Cairn, a chat, a task, or a project;
- is consumed only by a trusted provider-authentication component outside the model and its tool-execution boundary.

The exception applies only when all of these are true:

1. No credential value enters chat, prompts, model context, model output, tool requests, tool results, or owner-question channels.
2. No credential value enters project files, task briefs, reports, work logs, Git data, diffs, test fixtures, build output, terminal output, or command-line arguments.
3. No credential value enters application logs, error messages, crash data, analytics, or telemetry.
4. No credential value enters the renderer process, IPC payloads, browser APIs, `localStorage`, `sessionStorage`, IndexedDB, or renderer-accessible memory.
5. No model-accessible tool—including Read, Glob, Grep, Bash, subprocesses, or MCP tools—can read the credential store or inherit the credential through its environment.
6. Isolation is enforced by a real process, operating-system, or equivalent allow-list boundary. Prompts, conventions, path-name filters, and command deny-lists are not sufficient.
7. The provider-facing component returns only non-secret status, opaque handles, and redacted errors.
8. A synthetic canary rehearsal and boundary inspection support the isolation claim before any real credential is used. Failed or incomplete evidence fails closed.
9. The owner separately approves the exact credential use, provider network access, and any cost before the live action.

The exception covers authentication to an AI provider only under those conditions. It does not cover application-user login, authorization, permissions, or any other credential class.

Mandatory experienced-human review remains in force for:

- real application login, permissions, and authorization boundaries;
- secrets that do not meet the local-AI-credential exception;
- personal, health, financial, or regulated data;
- payment, billing, refund, or money-movement systems;
- destructive migrations, deletions, and irreversible actions;
- production infrastructure and security controls;
- public messages, legal commitments, and safety-critical behavior.

A provider call under an already configured account may still cost money. Every paid call requires the owner’s separate approval. The exception does not authorize creating or changing billing, payments, refunds, spend authority, or money movement.

The current Cairn runtime is not grandfathered into the exception. Its broad model-tool access and deny-list-based builder shell gate do not presently prove that local credential files and inherited environment values are inaccessible. A separate future High-Stakes task must establish every condition before Cairn claims that its live credential path qualifies.

## Milestone movement

This moves the milestone by defining a safe route for a future real-model Cairn run without treating every properly isolated local AI credential as automatically requiring an expert.

This task does not itself prove Cairn’s runtime qualifies, use a credential, or make a real provider call.

## Files that may change

- `CONTRACT-TEMPLATE.md`
  - bump the contract to v1.3;
  - add the narrow exception, fail-closed conditions, retained expert categories, and unchanged separate-approval requirement.
- `HIGH-STAKES.md`
  - explain the exception in novice-first language;
  - add qualifying and non-qualifying examples;
  - make clear that “local” and “not displayed” are insufficient;
  - require synthetic rehearsal and non-grandfathering.
- `README.md`
  - accurately summarize when an experienced human remains mandatory.
- `GETTING-READY.md`
  - define “owner-managed local AI credential” and distinguish it from an ordinary secret.
- `EVERYDAY-WORKFLOW.md`
  - summarize the exception and direct owners to the complete High-Stakes test;
  - update the active contract version reference.
- `CHANGELOG.md`
  - add a plain-language Contract v1.3 entry.
- `cairn.html`
  - update the byte-matching embedded contract;
  - update the novice-facing High-Stakes explanation and glossary where needed.
- Generated contract copies, updated only from the canonical template:
  - `core/assets/contract.md`
  - `cli/assets/contract.md`
  - `app/resources/contract.md`
- `docs/ai-work/tasks/011-report.md`

The pinned `docs/ai-work/tasks/011-brief.md` must remain unchanged during building.

## What must not change

- `AGENTS.md`; this project continues under Contract v1.2 during the task. Adopting v1.3 into Cairn’s own project contract requires the existing separate contract-update procedure after this task is accepted.
- Runtime credential, logging, renderer, IPC, model-engine, or model-tool code.
- Tests or checking tools.
- Dependencies, package manifests, lockfiles, build configuration, or release configuration.
- Any existing task brief, report, approval record, log history, or pilot record.
- The owner’s modified `docs/ai-work/LOG.md`.
- The untracked task 007, 008, and 009 approval JSON files.
- Any credential file, environment secret, provider account, billing setting, or external service.
- Anything outside the named files.

Nothing may be deleted, moved, deployed, published, or broadly staged.

## What could be damaged

A badly written exception could:

- encourage owners to expose credentials to an AI or its tools;
- treat renderer storage or inherited environment variables as safe;
- let “stored locally” become a meaningless security claim;
- allow a credential exception to bypass payment, personal-data, production, legal, or safety review;
- incorrectly imply that Cairn’s current runtime already qualifies;
- produce inconsistent rules across the contract, guides, CLI asset, desktop asset, and companion app.

A credential leak can require revocation and may permit account use or charges. Once disclosed to a model, log, repository, or external system, confidentiality cannot be restored merely by deleting the local copy.

Within this task, the changes are locally reversible because no credential or external release is authorized. Public distribution would make complete recall impossible, which is why publishing is excluded.

## Rollback plan

Before implementation, record the exact pinned-brief commit and the pre-implementation commit in the report.

If the completed local change is rejected before release:

1. Change nothing automatically.
2. Start a separate High-Stakes rollback task.
3. Re-orient and confirm unrelated modified and untracked work still exists.
4. Revert only the implementation/report commit with an additive `git revert`; never reset, clean, stash, or broadly restore.
5. Verify that the canonical contract and generated copies match the pre-implementation v1.2 bytes.
6. Re-run the copy, version, build, diff, and protected-work checks.
7. Keep the pinned brief commit as an honest historical record.

If the work stops before receiving a success commit, preserve the exact state. A separately approved rollback task must reverse only the named task files using the pinned baseline.

If the policy is ever published, rollback requires a new reviewed corrective contract release and changelog entry. It cannot promise to recall copies already downloaded.

## Safe rehearsal before the change counts

No real credential may be used.

Before the task can be called DONE:

1. Apply the proposed wording locally only; do not update this project’s `AGENTS.md`.
2. Walk a scenario matrix using a clearly fake synthetic canary:
   - official local provider login plus a verified tool/process boundary: potentially qualifies;
   - credential inherited by Bash or another model tool: does not qualify;
   - credential in `.env`, a project file, CLI argument, renderer, IPC, or browser storage: does not qualify;
   - credential hidden from the UI but readable by Read/Glob/Grep: does not qualify;
   - work involving billing, personal data, destructive migration, production infrastructure, legal commitments, or safety-critical behavior: still needs an experienced human;
   - Cairn’s current runtime: not qualified without a future isolation task.
3. Confirm every scenario produces the intended allow-or-stop result in both the contract and High-Stakes guide.
4. Extract the embedded contract from `cairn.html` and compare it byte-for-byte with `CONTRACT-TEMPLATE.md`.
5. Open `cairn.html` locally and verify that a beginner sees the narrow exception, the retained expert requirements, and the warning that “local” alone is insufficient.
6. Obtain the qualified security review described below before disposition DONE.

The rehearsal tests policy meaning and copy consistency. It does not prove that any runtime safely isolates credentials.

## Required human review

This task requires a qualified application-security reviewer because it changes a security boundary. The desired future credential exception does not waive expert review of this policy change itself.

The reviewer should have practical experience with desktop or Node/Electron process boundaries, credential storage, subprocess environments, and AI-agent tool access. The reviewer must inspect:

- the exact pinned brief and implementation diff;
- the definition and every condition of the exception;
- whether the rule fails closed;
- whether prompt rules and deny-lists are correctly rejected as sufficient isolation;
- whether current Cairn is clearly not grandfathered;
- whether every existing expert-required category remains intact;
- the scenario rehearsal and rollback plan.

The reviewer must not receive or inspect a real credential. Their role, verdict, scope checked, and remaining concerns must be recorded in the report.

If no qualified reviewer is available, disposition is `STOPPED — EXPERT_NEEDED`. Fresh-context AI review remains mandatory afterward and does not substitute for this person.

## Checks

The builder will run and record the real results of:

1. Re-orientation, full Git status, pinned-brief verification, and protected-file fingerprints before editing.
2. Manual inspection of every changed policy paragraph against this brief.
3. Byte equality:
   - `CONTRACT-TEMPLATE.md`
   - the contract block embedded in `cairn.html`
   - `core/assets/contract.md`
   - `cli/assets/contract.md`
   - `app/resources/contract.md`
4. Active-version inspection: all current public references say v1.3 while historical changelog headings remain unchanged.
5. Text checks confirming:
   - all nine exception conditions are present;
   - current Cairn is not grandfathered;
   - missing evidence fails closed;
   - separate owner approval remains mandatory;
   - authentication/permissions, other secrets, payments, personal data, destructive migrations, production infrastructure, legal work, and safety-critical work retain expert requirements.
6. Existing offline project tests with the already-installed toolchain: `npm.cmd test`.
7. Existing app checks: `npm.cmd run typecheck` and `npm.cmd run build:vite` from `app`.
8. Local, offline visual inspection of the companion page and embedded contract.
9. `git diff --check`.
10. Complete inspection of the actual diff and changed-file list.
11. End-state Git status and comparison of the protected modified/untracked files with their starting fingerprints.
12. Qualified security review of the exact final diff.
13. A mandatory fresh-context High-Stakes review in a new chat after the build.

No check may access a real credential or contact a provider.

## DONE requires

- Contract v1.3 implements exactly the narrow exception in this brief.
- Every public source and generated copy agrees.
- The exception fails closed and cannot be satisfied merely by local storage, UI hiding, prompt instructions, or deny-list filtering.
- The current runtime is explicitly not declared eligible.
- Every retained expert category remains intact.
- Separate owner approval remains mandatory for credential use, network access, and cost.
- No real credential is accessed, requested, printed, stored, or transmitted.
- No forbidden or protected file changes.
- The rehearsal, rollback proof, declared checks, and qualified security review all complete successfully.
- The report contains the reviewer’s role and verdict.
- The implementation receives one named-file task commit, separate from the already pinned brief commit.

## STOPPED conditions

- `EXPERT_NEEDED` — the qualified security reviewer is unavailable or does not approve.
- `BOUNDARY_UNPROVEN` — the exception could expose a credential to any forbidden surface or could grandfather the current runtime.
- `COPY_DRIFT` — the canonical contract and any public/generated copy differ.
- `ROLLBACK_UNPROVEN` — the exact safe return path cannot be demonstrated.
- `PROTECTED_WORK_CHANGED` — the owner’s pre-existing work changes.
- `SCOPE_DRIFT` — runtime, dependency, release, or other excluded work becomes necessary.
- `CHECK_FAILED` — any declared check fails.
- `INSTALL_REQUIRED` — a check requires installing or updating software.

A STOPPED task receives no success commit and preserves its exact state.

## Actions requiring separate approval

Each of these needs its own explicit authority:

1. **Save and pin this brief:** the next exact owner message described below.
2. **Build the pinned brief:** a fresh-chat message approving its exact current contents.
3. **Contact or send material to a security reviewer:** the owner coordinates this unless external messaging is separately authorized.
4. **Access, inspect, test, use, rotate, or revoke any real credential:** forbidden in this task; requires a separate future High-Stakes task and exact approval.
5. **Make a real provider or other network request:** forbidden in this task; requires separate approval.
6. **Incur model cost or change billing/payment settings:** forbidden in this task; requires separate approval and any applicable expert review.
7. **Update this project’s `AGENTS.md` to v1.3:** excluded; requires the separate contract-update procedure after acceptance.
8. **Push, publish, release, deploy, or write to any external service:** excluded; requires a separate task and approval.
9. **Install or update anything:** excluded; the task stops if installation is needed.
10. **Delete, move, or roll back files:** excluded; requires a separately approved rollback task.

## Plain-language summary

This changes the rule, not the credential system. A carefully isolated local AI credential would no longer need an expert solely because it is a credential. The exception is deliberately hard to qualify for: the credential must be inaccessible to the chat, project, logs, renderer, and every model tool through a real technical boundary. Cairn’s current runtime does not automatically pass. All other sensitive categories remain protected.
