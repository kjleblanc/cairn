# Task 011 — report

## Result (plain language)

A local Contract v1.3 candidate now defines the approved narrow exception for an
owner-managed local AI credential.

- The credential can avoid mandatory expert review solely because it is a credential
  only after all nine isolation conditions are established.
- “Local,” hidden UI, prompt rules, path filters, and command deny-lists are explicitly
  insufficient.
- Missing evidence fails closed, and Cairn's current runtime is not grandfathered.
- Real application login and permissions, other secrets, payments, personal data,
  destructive work, production security, public or legal commitments, and
  safety-critical behavior still require an experienced human.
- Credential use, provider network access, and cost still need separate owner
  approval.

The candidate is not complete enough to call DONE. No qualified application-security
reviewer supplied the required verdict, and the in-app browser refused the local file
URL, so the required visual inspection could not be completed. No success commit was
made.

## Starting point and protected work

- Pinned brief commit: `76c72b8c2528d46a101c9b9f589224edc9be8ec5`
  (`Task 011: pin local AI credential boundary brief`).
- Pre-implementation commit: `76c72b8c2528d46a101c9b9f589224edc9be8ec5`.
- The brief remained unchanged at SHA-256
  `12BE52E88D158C8F96A3B71D8503830C422B9E155B946E04FDE08BFA0D078F4A`.
- The owner's modified `docs/ai-work/LOG.md` remained unstaged and at SHA-256
  `2E9262F615DB7337BF96E8032ED1754CE946BC00EF72F4D60C73562147C8DA41`.
- The untracked 007, 008, and 009 approval records remained unstaged and at their
  starting SHA-256 values:
  `1204556CD1F51DF44D0EA2069643FE71CAA9BCFC08413E30CC35C6BDA07F2691`,
  `2CB40F65212506ED3037AB1B174A769C7307D1C8D071DA6A7B42B9EDE145344E`,
  and `78933AC2EB2A00B6F6C40F92C6EDD2D5EBAF37D98F96C77FCF64F017A366D822`.

## Files changed

- `CONTRACT-TEMPLATE.md` — bumps the portable contract to v1.3 and contains the full
  definition, nine conditions, retained expert categories, separate approvals,
  fail-closed rule, and non-grandfathering warning.
- `HIGH-STAKES.md` — explains the exception in novice-first language and contains the
  complete test and six-scenario example matrix.
- `README.md` — summarizes the retained expert boundary and narrow exception.
- `GETTING-READY.md` — distinguishes an owner-managed local AI credential from an
  ordinary secret in the glossary.
- `EVERYDAY-WORKFLOW.md` — directs owners to the complete test and names v1.3 as the
  current contract.
- `CHANGELOG.md` — adds the plain-language Contract v1.3 entry without changing older
  version headings.
- `cairn.html` — embeds the byte-matching v1.3 contract and updates the glossary and
  High-Stakes card.
- `docs/ai-work/tasks/011-report.md` — this report.

The ignored generated copies were refreshed only from the canonical template:
`core/assets/contract.md`, `cli/assets/contract.md`, and
`app/resources/contract.md`. All four local files have SHA-256
`92B1D74630D2B4D588DBDD0670CF14CD45C78763AD8E9143624E458B2559E5BB`.

`AGENTS.md`, runtime code, tests, checking tools, dependencies, package files, build
configuration, release configuration, historical task files, and the protected owner
work were not changed.

## Commands run and their real results

1. Re-orientation read the project contract, project memory, recent log rows, Task
   010 report, pinned Task 011 brief, maintainer rules, High-Stakes guide, and full Git
   status. Git confirmed the brief-only pin and unchanged brief.
2. A clearly fake canary,
   `CAIRN_FAKE_CANARY_NOT_A_CREDENTIAL_TASK_011`, walked all six required scenarios
   against both `CONTRACT-TEMPLATE.md` and `HIGH-STAKES.md` — **6 passed**. This was a
   policy-text rehearsal only; it did not inspect a credential or prove runtime
   isolation.
3. Text checks for the nine conditions, fail-closed behavior, non-grandfathering,
   separate approvals, and every retained expert category — **12 passed**.
4. The first active-version scan found one old v1.2 label in the companion page's
   missing-log message. That permitted line was corrected. The final scan found v1.3
   in every active public source and generated copy, no active v1.2 reference there,
   and all historical changelog headings intact — **passed**.
5. Contract copy check — the embedded contract plus its file-ending newline is
   byte-identical to `CONTRACT-TEMPLATE.md`; the canonical and three generated copies
   have the identical SHA-256 recorded above — **passed**.
6. `npm.cmd test` from the repository root — **62 passed, 0 failed** (46 core and 16
   CLI tests). It also refreshed `core/assets/contract.md` from the canonical template.
7. `npm.cmd run typecheck` from `app` — **passed**.
8. `npm.cmd run build:vite` from `app` — the sandboxed attempt could not let esbuild
   inspect required parent-path metadata. The approved local rerun used the
   already-installed toolchain, made no network request, and built the main, preload,
   and renderer bundles — **passed**.
9. Local visual inspection — **not completed**. The in-app browser's safety policy
   blocked the `file://` URL before Cairn loaded. No alternate browser surface or
   workaround was used.
10. `git diff --check` — **passed**. The final tracked diff before this report contained
    only the seven permitted public files plus the owner's already-modified log. Full
    status still showed only the three protected untracked approval records.
11. Qualified security review — **not completed**. Reviewer role: none supplied.
    Reviewer verdict: unavailable. No material was sent to anyone.

## How the owner can see or try the result (offline, no credential)

1. Double-click `cairn.html` in this folder. Do not enter or test any credential.
2. On the Daily screen, read the **High-Stakes work** card. Success means it says the
   exception is narrow, “local” is insufficient, missing evidence fails closed, the
   current runtime is not automatically qualified, and use/network/cost each need
   separate approval.
3. Open **Glossary** and find **Owner-managed local AI credential**. Success means the
   definition says the owner uses the provider's official local login or operating
   system store and the value stays out of Cairn, chat, files, logs, the renderer, and
   every model tool.
4. Open `HIGH-STAKES.md` and read **The narrow local AI credential exception**. Check
   that all nine conditions and all six scenario outcomes match the approved brief.
5. Use the app's contract copy/download view and search the copied text for
   **Narrow exception for an owner-managed local AI credential**. Success means the
   contract identifies itself as v1.3 and contains the same nine conditions.

Failure looks like treating local storage or hidden UI as sufficient, omitting a
retained expert category, implying current Cairn qualifies, or authorizing credential
use, network access, or cost without a separate owner decision.

## What still needs a human check

1. A qualified application-security reviewer with practical desktop or Node/Electron
   process-boundary, credential-store, subprocess-environment, and AI-agent tool-access
   experience must inspect the pinned brief and exact final diff. The review must cover
   all nine conditions, fail-closed behavior, rejection of prompts and deny-lists as
   isolation, non-grandfathering, retained expert categories, rehearsal, and rollback.
   The reviewer must provide their role, verdict, scope checked, and remaining
   concerns without seeing a real credential.
2. The owner must perform the offline visual steps above because browser policy blocked
   the builder's local visual inspection.
3. A mandatory fresh-context High-Stakes review must happen in a new chat after this
   stopped build. It supplements but cannot replace the qualified human.

## Limitations and remaining uncertainty

- The rehearsal and text checks prove only that the named wording and examples are
  present and internally consistent. They do not prove the security policy is sound.
- No credential was requested, read, printed, stored, transmitted, rotated, revoked,
  or used. No provider or other network request was made.
- No runtime, renderer, IPC, model engine, model tool, credential store, logging path,
  environment inheritance, or billing behavior changed. Cairn's current runtime
  remains unqualified.
- The candidate has no success commit and must not be pushed, published, released,
  deployed, adopted into this project's `AGENTS.md`, or used to justify a real
  credential path.
- Rollback was not executed because deleting, moving, reverting, or otherwise
  reversing files is excluded. The pinned baseline and additive `git revert` route
  remain available for a separately approved rollback task.

## Milestone movement

UNCLEAR — the local candidate defines the intended route toward a future real-model
Cairn run, but missing human security review and visual verification mean the policy
change cannot yet count as a completed milestone step.

Disposition: STOPPED — EXPERT_NEEDED

Additional open check: `CHECK_FAILED` — the required local visual inspection was
blocked by browser policy.
