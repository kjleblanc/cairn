# Task 028 — Final-review fixes for the connected conductor, 0.1.1

Requested visible outcome: four review findings against the connected
conductor (Tasks 018–027) are corrected, honestly and in the smallest form
that closes each gap, with the version bumped 0.1.0 → 0.1.1 as a patch (no
new capability).

1. **Chat must never dirty the project's worktree.** `ensureCairnIgnored`
   (`app/src/main/conductor/store.ts`) writes `/.cairn/` into the project's
   own `.gitignore` on every send, which is a tracked-file change — the same
   class of poisoned-start problem Tasks 010/011 hit from a different cause.
   Replaced with `ensureCairnExcluded(root)`, which writes the same line into
   `.git/info/exclude` (resolved via `git rev-parse --git-common-dir`, so
   worktrees share the main repo's exclude file) instead of a tracked file.
   No git repo → return false, do nothing, never create `.gitignore`.
2. **The disclosure must name everything that flows.** The briefing already
   sends a git summary (branch, clean/dirty, last five commit subjects) that
   neither the consent card's `data` string nor the contract's "The connected
   conductor" section names. Both gain one clause naming it.
3. **Oversized conversations must fail honestly.** No context budget exists
   today; a long conversation eventually hits a provider 400 that maps to
   "trying again usually works," which is false for that case. A pure
   `promptTooLarge` helper in `client.ts` (200000 total content chars) gates
   `service.send`'s stream: over the limit, emit one honest `{kind:"error"}`
   delta and never call the provider.
4. **A corrupted `conductor.json` must read as not connected.** `keystore
   .readConnection` gains a `new URL(baseUrl)` validity check so a malformed
   stored `baseUrl` returns `null` instead of surfacing later as an unhandled
   throw in `status()`, which would otherwise reject `conductor:status` and
   hang the home screen instead of showing the connect card.

Boundary of intent: no change to the constitution, task-block parsing, the
proposed-task card, dispatch, or the serial/offline/Codex adapters. No new
dependency. Version and contract-mirror mechanics follow MAINTAINERS' six-step
contract-change procedure exactly, same as Task 027.

Checks that will show the outcome holds:

- Root `npm test` — core 51/51 (mirror equality now at 0.1.1) + cli 9/9.
- `cd app && npm run typecheck && npm run test:unit` — new/rewritten store
  tests (append-once, created-when-missing, no-git no-op, worktree-untouched
  regression) plus a new `promptTooLarge` boundary test, all green.
- `cd app && npm run build:vite && npm run test:smoke` — every Playwright
  test green, including `conductor.spec.ts` scenario 3 rewritten to check
  `.git/info/exclude` (not `.gitignore`) and to assert `git status
  --porcelain` is completely empty after a chat exchange.

DONE means every fix lands, every check above is green, and the disclosure,
changelog, and version declarations are consistent and honest. STOPPED means
a check fails or a fix cannot be made without losing a spec's substance.
Milestone movement: NO — this is a correction pass on an already-built
capability, not the milestone itself.
