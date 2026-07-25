# Task 072 — Brief

Requested visible outcome: Phase 3 Task 10 — the push machinery. A local,
network-free preview of what a push would do, and a single honest push: one
plain `git push`, its outcome classified, never retried, never forced. This is
machinery only — Task 11 builds the chip and the owner-facing confirmation on
top of it. Nothing built here can push on its own.

Details (verbatim from `.superpowers/sdd/task-10-brief.md`):

- `pushPreview(dir, exec?)`: `{ remote: string; url: string; branch: string;
  ahead: number; subjects: string[] } | null` (null when
  `git rev-parse --abbrev-ref --symbolic-full-name @{u}` fails). Ahead:
  `rev-list --count @{u}..HEAD`; subjects: `log @{u}..HEAD --format=%s`.
  `GIT_TERMINAL_PROMPT=0`, local-only.
- `pushExecute(dir, exec?)`: `{ ok: true; summary: string } | { ok: false;
  kind: "no-remote" | "auth" | "remote-ahead" | "other"; message: string }`.
  One plain `git push`. Classify stderr in this order: auth
  (`Authentication failed|could not read (Username|Password)|Permission
  denied`), remote-ahead (`fetch first|non-fast-forward|\[rejected\]`), else
  other. Never retry, never force. `exec` injectable
  `(args: string[]) => { status: number; stdout: string; stderr: string }`.
- Fixture recipe (corrected by the plan's adversarial review — a non-bare
  origin refuses pushes to its checked-out branch): a BARE origin `O`
  (`git init --bare`), then TWO working clones A and B of `O`. Happy path:
  commit in B, `pushExecute(B)` ok, `pushPreview(B)` ahead drops to 0.
  Remote-ahead: commit in A, push A; commit in B; `pushExecute(B)` →
  `kind: "remote-ahead"`. No-remote: a plain `git init` dir → preview null,
  execute `kind: "no-remote"`. Auth: injected exec returning status 128 /
  `fatal: Authentication failed for 'https://…'` → `kind: "auth"`, message
  includes sign-in guidance, exec called exactly once.

Checks that will show the outcome holds:

- `app/tests-unit/push.test.ts`, RED first against a deliberately wrong stub
  (real assertion failures, not a missing-module compile error), then GREEN
  against the real implementation.
- `npm run typecheck`, `npm run test:unit`, `npx playwright test` in `app`
  (the IPC surface changed), and `cd core && npm test` — all green. No
  `core/` changes.

DONE means: `pushPreview` reports ahead/subjects/remote/url/branch or null
with no network call; `pushExecute` makes exactly one `git push` per call,
never retries or forces, and classifies no-remote/auth/remote-ahead/other
correctly, proven against real git fixtures plus one injected-exec unit test
with a call-count assertion. STOPPED means a retry, a force, a second git
invocation hiding inside "one push", or a misclassification that could
mislead the (future) owner-facing confirmation Task 11 builds on this.
