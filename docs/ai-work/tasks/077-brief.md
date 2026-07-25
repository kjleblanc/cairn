# Task 077 — Brief

Requested visible outcome: the closing fix on Phase 3 Task 11's push surface.
Task 076 bounded WHERE a push may go and left WHAT it sends caller-supplied.
The re-review found the second half open, in the same handler, one wave after
the first half was closed there.

## IMPORTANT E — the refspec's own halves reach git unchecked

`preview.head` and `preview.branch` arrive over IPC and are interpolated into
the refspec untouched. Verified against real git 2.52 in throwaway
repositories:

- `head = "+<sha>"` gives `git push origin +<sha>:refs/heads/main`, which
  reports **(forced update)** and rewinds the origin's tip. That breaks
  `push.ts`'s own docstring ("never forced") and the sentence Cairn shows the
  owner while the push runs ("never a retry, never a force").
- `head = ""` gives `git push origin :refs/heads/main`, which git reads as a
  branch **deletion**. The probe was stopped only by the receiving repository's
  `denyDeleteCurrent`, which protects one branch of one remote and nothing
  else.

Not reachable from the panel — which is exactly the standing Important A had
one wave ago. Task 076's own DONE criterion reads "the main process decides
where a push may go and what it may send, and neither is inferable from a
string a caller supplies"; the first half shipped and the second did not. The
`--` terminator does not help, because `+` is refspec syntax rather than option
syntax.

Fix, beside the existing remote guard: reject unless
`/^[0-9a-f]{7,64}$/.test(preview.head)`, and require `preview.branch` to be a
plain ref component — no `+`, `:`, `..`, `?`, `*`, `[`, `~`, `^`, leading `-`,
no whitespace. Assert the argv as tasks 075 and 076 already do, plus one
real-git test that a `+`-prefixed head is refused rather than executed.

## The union ruling (the coordinator's, recorded here verbatim in substance)

The plan-fixed `PushResult` union has no honest slot for "Cairn refused before
running git": `other` would lie through its "ends with git's own words" label,
and `no-remote` is semantically wrong for a malformed refspec. A new variant
`kind: "refused"` is added, meaning Cairn declined before running git, rendered
without the git-words label and in Cairn's own plain words. Task 076's
remote-guard refusal moves onto it too, so `no-remote` goes back to meaning
only what its name says and has one producer again.

This is a deliberate, recorded extension of the plan's union: the design spec
enumerated the honest outcomes it knew about — success, no remote, auth
refused, remote ahead — and never contemplated a pre-flight refusal, which only
became possible once the refspec was pinned from caller-supplied values. Adding
the case completes the spec's honesty rule rather than departing from it.

## Record corrections owed (append-only, per repo tasks 059/069/071/075)

- **(F)** `conductor.spec.ts`'s post-settle `.push-confirm` count is presented
  as proving the panel no longer carries the in-progress line. It is taken
  after settle, when the panel is gone by construction, so it was already true
  before task 076. The judgement about not racing transient text is right and
  stands; the claim that this assertion carries it does not.
- **(G)** Task 076's "no-remote is reachable again" must distinguish the KIND
  from the classifier branch inside `pushExecute`. With `refused` added, the
  statement needs restating cleanly.

## Also (H)

The refused target is recorded nowhere. It stays off the screen — that call
stands — but it is logged through the existing `logError`, consistent with what
`ErrorCard` already promises owners about technical details.

## Checks that will show the fix holds

- A `+`-prefixed head is refused, and the origin's tip is not rewound, driven
  through the same refuse-or-run path the handler uses so a missing guard would
  really execute the push.
- An empty head is refused and the origin's branch still exists.
- `pushTargetIsWellFormed` accepts real previews and ordinary branch names and
  refuses every listed shape, including a non-preview argument.
- A malformed target costs no git call at all.
- Both refusals report `kind: "refused"` and name no target.
- `npm run typecheck`, `npm run test:unit`, `npm run test:smoke` (the
  rebuilding path), and `cd core && npm test` — all green. No `core/` changes.

DONE means: neither where a push goes nor what it sends is inferable from a
string a caller supplies, and a refusal says so in Cairn's own words without
borrowing git's. STOPPED means a caller-supplied string can still make Cairn
force or delete anything.
