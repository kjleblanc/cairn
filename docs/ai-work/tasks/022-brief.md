# Task 022 — record Contract v2.1 and accepted historical evidence

Lane: **Standard**

## Visible outcome and milestone movement

The active Contract v2.1 amendment, the accumulated Task 005–020 history already
present in the modified work log, and five previously untracked historical evidence
files are preserved in one exact-name local Git commit. The main working tree
finishes clean without deleting, hiding, moving, or rewriting any starting evidence.

This does not itself complete the real-model milestone. It removes the dirty-main
precondition that currently prevents later coordinator and concurrency work.

Expected milestone movement: **NO**.

## Why this is Standard

The owner explicitly asked to preserve and record these local files. The work is
inside this repository, additive, Git-recoverable, and uses no dependency, network,
credential, external service, valuable-data deletion, or destructive operation.
Every starting evidence file is inspected before staging and staged by exact name.

## Files and state that may change

The following existing bytes may become tracked in the Task 022 commit without being
rewritten:

- `AGENTS.md` — active project Contract v2.1;
- `CHANGELOG.md`;
- `CONTRACT-TEMPLATE.md`;
- `EVERYDAY-WORKFLOW.md`;
- `GETTING-READY.md`;
- `HIGH-STAKES.md`;
- `MAINTAINERS.md`;
- `README.md`;
- `cairn.html`;
- `docs/ai-work/LOG.md` — already contains accumulated Task 005–020 history,
  including the accepted Task 020 row, and may receive only Task 022's new
  Applied/completed row;
- `docs/ai-work/tasks/007-approval.json`;
- `docs/ai-work/tasks/008-approval.json`;
- `docs/ai-work/tasks/009-approval.json`;
- `docs/ai-work/tasks/011-report.md`;
- `docs/ai-work/tasks/014-report.md`;
- this brief; and
- `docs/ai-work/tasks/022-report.md`.

The ignored generated mirror `core/assets/contract.md` may be refreshed from
`CONTRACT-TEMPLATE.md`; it remains ignored and must match the canonical template.

## Starting bytes to preserve

Planning began at HEAD `8868fd571ac590aa6d7cc9e630b73649212c115a` on
`main`, 25 commits ahead of `origin/main`, with an empty index.

The exact starting SHA-256 values are:

- `AGENTS.md` — `18E81F3AC1FF8741997C5D1CE2DD58FB047E0A728D61BA1525D9B317AF2BA77D`;
- `CHANGELOG.md` — `80F6C2077D1F7060A5AD4F36267A8AA8B2C42E935203955B7AF953A83C33FA37`;
- `CONTRACT-TEMPLATE.md` — `399C2E1C19A794E51C5A02CC2338D30C2348861612BE9A1CF9A0B6E15F3F765B`;
- `EVERYDAY-WORKFLOW.md` — `688662CD8C2F2DF7BF9002E945BE059E76AAAFCBBADB25965637AA0CEEC7DE9A`;
- `GETTING-READY.md` — `EF169CE278C2654F13F3C5DB1E3DF3CBE3746F89C71EDB804F72E2ADAEC053F8`;
- `HIGH-STAKES.md` — `9583FB17D2EF6BDF887644980E8154FB580929ED97D49FF711B5A7829D672869`;
- `MAINTAINERS.md` — `C855478DE6572B38A90FF45624BB1E9C9B8DDBD33334F178A18CAEDA365B0843`;
- `README.md` — `3C931D039C6F18B61CB9972E9CA0713D48B38B144E32823C2DD8516C0C430B25`;
- `cairn.html` — `D75A933537EC554F02B3DC8DCFD48DC17E85206FF42243EADBA49B4C05E56D7D`;
- `docs/ai-work/LOG.md` — `0E51EAC1EEAEB13899D1DF8655BD8037AF6EF6E2957DE77ADCA1C0B2E75BBB9D`;
- `docs/ai-work/tasks/007-approval.json` — `1204556CD1F51DF44D0EA2069643FE71CAA9BCFC08413E30CC35C6BDA07F2691`;
- `docs/ai-work/tasks/008-approval.json` — `2CB40F65212506ED3037AB1B174A769C7307D1C8D071DA6A7B42B9EDE145344E`;
- `docs/ai-work/tasks/009-approval.json` — `78933AC2EB2A00B6F6C40F92C6EDD2D5EBAF37D98F96C77FCF64F017A366D822`;
- `docs/ai-work/tasks/011-report.md` — `C70BABB41335C4F2D8C39FB44430A915C14F389A86D254524BFDE3E24FADF5F8`;
- `docs/ai-work/tasks/014-report.md` — `A67C8E09DFABDAF9B600B692FD31551B456DA50DFC4D452FB1F4D891CF6C3795`.

The three approval records and two reports were scanned before editing. No API-key,
authentication-token, private-key, or email-shaped content was detected. Their bytes
must remain unchanged through the commit.

## What must stay untouched

- Task 021's pinned brief, its disposable directory, and every Task 021 outcome or
  decision remain untouched. Task 021 is not resumed.
- All product, runtime, test, package, lockfile, dependency, provider, coordinator,
  CLI, and Desktop source stays untouched.
- No file is deleted, moved, ignored, stashed, reset, overwritten, or broadly staged.
- No branch, worktree, network call, credential use, install, deployment, push, or
  external write is allowed.

## First visible checkpoint

This brief exists with the complete exact-name commit set, starting hashes, and
non-exposure scan recorded before any staging. The index remains empty.

## Checks

1. Recheck every starting hash except `docs/ai-work/LOG.md`, whose only permitted byte
   change is one appended Task 022 row.
2. Verify Contract v2.1 is ACTIVE, the embedded and generated contract mirrors match
   the template, the app script parses, and no retired v2.0 safety-loop wording
   remains in current public rules.
3. Parse all three approval JSON files and confirm their task numbers, brief paths,
   hashes, and timestamps are structurally valid.
4. Confirm the Task 011 and Task 014 reports contain their honest STOPPED
   dispositions and agree with the existing work-log rows.
5. Confirm Task 021 and every product/runtime path have no diff.
6. Run `git diff --check` on every named file.
7. Write the Task 022 report, append one accurate `Applied / completed` log row, and
   inspect the complete diff.
8. Stage only the exact named files in this brief, inspect the staged path list and
   staged diff, and make one local Task 022 commit.
9. Verify the final Git status is clean and the commit contains no other path.

## Uncertainty and assumptions

The approval JSON files preserve old absolute local paths. They contain no detected
secret or email, and the owner explicitly asked to record the historical evidence
without rewriting it. This task therefore preserves those bytes as history rather
than normalizing the paths.

Any discovered secret-shaped value, unexpected byte change, Task 021 change,
product-code change, extra staged path, or unclear Git recovery stops the task.

## DONE and STOPPED

`Disposition: DONE` means the exact Contract v2.1 and historical evidence set, plus
Task 022's brief/report/log row, is committed locally by exact path; all checks pass;
Task 021 and product code remain untouched; and `git status --short` is empty.

`Disposition: STOPPED — [stable blocker]` means the evidence cannot be safely
recorded without exposing a secret, changing protected bytes, touching Task 021 or
product code, staging an extra path, or leaving the intended clean-main result
unproved.
