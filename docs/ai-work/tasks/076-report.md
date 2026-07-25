# Task 076 — Report

The last review wave on Phase 3 Task 11's push surface. One Important and three
Minors closed. No `core/` changes.

## IMPORTANT A — main bounds the push target again

The `push:execute` handler now asks `remoteIsConfigured(dir, preview.remote)`
before anything runs: a new network-free export in `push.ts` that reads
`git remote` for the project and answers no — fail-closed — if the name is
absent or the command cannot be read. A refusal returns
`kind: "no-remote"` with a message that names no target, because the string
that failed the check came from outside the main process and echoing it onto a
screen would put words there Cairn did not choose.

`no-remote` rather than `other` deliberately: `other`'s owner-facing label says
the sentence ends with git's own words, and here git was never run. The kind
also stays true to its name — there is no remote by that name — and Task 075's
disclosure that `no-remote` had become unreachable from real git is now
superseded: it is reachable again, through this guard, with a message that is
true whenever it fires.

The hole was real. Staged RED with the guard disabled and the test unchanged:

```
Error: expect(received).toBe(expected)
Expected: false
Received: true
      > expect(byUrl?.ok).toBe(false);
```

That is a push aimed at a bare repository this project has never heard of,
succeeding — verified beforehand against real git, where
`git push file:///…/elsewhere.git <sha>:refs/heads/main` creates the ref.

The new Playwright test goes around the screen entirely and calls the handler
through `window.cairn.pushExecute`, which is the only way to reach the case at
all: the panel's own preview can never name anything else. It asserts the
refusal for a URL and for a plain unknown name, that the other repository ends
with no refs, that the project is untouched, that the message contains no
target — and, so the bound is not merely restrictive, that the project's own
remote still publishes through the same handler.

## MINOR B — the push's source is pinned too

`PushPreview` gained `head` (from `git rev-parse HEAD`), and the refspec became
`<sha>:refs/heads/<branch>`. `pushExecute` now takes the whole preview object
rather than fields picked out of it, so no caller can assemble a target from
pieces of different reads, and `Chat.tsx` hands over the very object the panel
rendered.

Staged RED, source reverted to `HEAD:` while the tests stood:

```
actual:   [ [ 'push', 'origin', 'HEAD:main' ] ],
expected: [ [ 'push', 'origin', 'abc1234:refs/heads/main' ] ]

actual:   '9707aa1c2cfc9888a50face14bde284c995076b8',
expected: '3ece9d01efbc3104befaecb08f7f07c8b4675de2'
```

The second is the finding: a commit made after the preview was taken published
under an approval given for a different commit. Pinned, the origin's tip equals
the previewed sha and its subject is the one the panel listed.

## MINOR C — the in-progress line moved into the live region

`pushAnnouncement` is now the single source for the region's content and
returns the "Pushing." sentence during that phase; the panel no longer renders
it anywhere. The sequence a listener hears is therefore in-progress, then
outcome, from one persistent `role="status"` element.

Honest limit: the transient text itself is not asserted. A `file://` push
settles in milliseconds, so a test that waited for it would be a race. What is
asserted is the structural half — the panel carries no such text — and the
region's persistence is already proven by the `data-live-region-probe` marker
from Task 075.

## MINOR D — no dead space under a silent region

`.push-flow` spaces its children with `> * + * { margin-top }` instead of flex
`gap`, and `.push-outcome:empty` takes no margin. The region stays mounted and
displayed (never `display: none`, which would risk the announcement it exists
for) and occupies nothing until it has something to say.

## Verification

Run through `npm run test:smoke`, which rebuilds all three bundles before
running Playwright — per Task 075's own stale-bundle finding, rather than a
bare `npx playwright test` against whatever was built last.

- `npm run typecheck` (app) — clean.
- `npm run test:unit` (app) — **66 / 66** (64 before, 2 new).
- `npm run test:smoke` (app; builds, then Playwright) — **39 passed**, one
  clean run.
- `cd core && npm test` — **104 / 104**. No `core/` changes.

Files touched: `app/src/main/push.ts`, `app/src/main/ipc.ts`,
`app/src/preload.ts`, `app/src/shared/ipc.ts`,
`app/src/renderer/screens/Chat.tsx`, `app/src/renderer/app.css`,
`app/tests-unit/push.test.ts`, `app/tests/conductor.spec.ts`,
`docs/ai-work/LOG.md`, `docs/ai-work/tasks/076-brief.md`,
`docs/ai-work/tasks/076-report.md`.

## Limitations and remaining human judgment

- The in-progress announcement is verified by construction and by the negative
  assertion above, not by catching the transient text.
- `remoteIsConfigured` compares names exactly. A project whose remote name has
  surrounding whitespace in `.git/config` would be rejected; git does not allow
  that, and rejection is the safe direction regardless.
- The `gone` phase and the short-subject-list note remain unexercised by any
  Playwright fixture, as disclosed in Task 075.
- Milestone movement: NO.

Disposition: DONE
