# Task 076 — Brief

Requested visible outcome: the last review wave on Phase 3 Task 11's push
surface. The re-review approved Task 075 — both Importants verified closed by
construction, all three Minors closed, no regressions, and the
unreachable-`no-remote` decision upheld — and raised one further Important and
three Minors, all on the same surface.

## IMPORTANT A — main no longer constrains the push target

Task 075 pinned the refspec so a push publishes exactly what the confirmation
disclosed. That closed one hole and opened another: `remote` now arrives from
the renderer as a bare string and goes straight into git's argv, and **git
accepts a URL wherever a remote name is expected**. Before pinning, a bare
`git push` could only ever reach the configured upstream; after it, the main
process bounded nothing.

Nothing reachable exploits it — the only caller is the confirmation panel's own
preview — but that is exactly the "correct because the one caller is
well-behaved" argument that made Important 1 worth fixing, and `ipc.ts` already
holds the opposite standard ten lines above, where `app:openExternal`
allowlists URLs before opening them.

Details (verbatim from the review):

> Fix in the handler, network-free: verify `remote` appears in `git remote` for
> `dir` and refuse otherwise, with a plain refusal message. Test the refusal.

## MINOR B — pin the push's source too

`HEAD:branch` pinned the destination but not what is sent. If HEAD moves, or
the owner checks out a different branch between the panel render and the press,
more or other commits publish than the panel listed — the same window that
motivated Task 074's press-time re-read, on the other half. Fix: carry the head
sha in `PushPreview` and push `<sha>:refs/heads/<branch>`, asserting the argv
shape as Task 075 did for the destination.

## MINOR C — the in-progress line sits outside the live region

"Pushing. Cairn runs one plain git push…" rendered inside the non-live panel,
so a screen-reader owner heard nothing between pressing Push and the outcome.
Move it into the same `role="status"` region so the sequence is audible end to
end.

## MINOR D — dead space under the chip

The empty live region is a flex child, so `.push-flow`'s `gap` reserves space
under the chip before anything is announced.

Ledgered, deliberately NOT fixed: Minors 3, 4, 8, 9 as before, and the
reviewer's suite-level `globalSetup` staleness check for Playwright bundles —
a repo-wide change the coordinator is taking to the final whole-branch review.

## Checks that will show the fixes hold

- A push aimed at a bare-repo URL, and one aimed at a name this project does
  not have, are both refused; the target repository ends up with no refs at
  all, and the project's ahead count is unchanged.
- The refusal message names no target, so a string from outside the main
  process never reaches a screen as if Cairn had chosen it.
- The same handler still publishes normally for the project's own remote.
- `remoteIsConfigured` accepts only real names, rejects a URL and the empty
  string, and fails closed when `git remote` cannot be read.
- The argv of the one push is exactly `["push", remote, "<sha>:refs/heads/<branch>"]`.
- A commit made after the preview does not ride along: the origin's tip equals
  the previewed sha, not the newer commit.
- `npm run typecheck`, `npm run test:unit`, `npm run test:smoke` (which
  rebuilds before running Playwright — per Task 075's own stale-bundle
  finding), and `cd core && npm test` — all green. No `core/` changes.

DONE means: the main process decides where a push may go and what it may send,
and neither is inferable from a string a caller supplies. STOPPED means an
unchecked string can still reach git's argv as a destination.
