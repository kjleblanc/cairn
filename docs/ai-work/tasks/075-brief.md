# Task 075 — Brief

Requested visible outcome: review fixes on Task 074 (Phase 3 Task 11, the push
chip and the contract's pause). The review approved the design on contract
satisfaction — the reviewer read `CONTRACT-TEMPLATE.md:101-123` directly,
confirmed all four required elements render, traced every path from chip press
to `pushExecute` (double press, keyboard, re-render mid-flow, reload) and found
none that publishes without the pause — and let all three of Task 074's
judgement calls stand. It raised two Important findings and three cheap Minors.

## IMPORTANT 1 — pin the push to what the panel disclosed

`push.ts` ran a bare `git push`, whose behaviour is governed by the machine's
`push.default`, while the confirmation's target and commit list come from
`@{u}..HEAD`. Under `push.default=matching` git publishes every same-named
branch — commits the panel never listed. Under `current` it can push to a
remote branch that is not the `@{u}` branch the panel named. The default
`simple` matches the disclosure, and this machine sets no `push.default`, so
the shipped behaviour was correct — but the contract's "exact target and
effect" then held by ambient configuration rather than by construction, on the
one surface in Cairn that writes to the outside world.

Details (verbatim from the review):

> Fix: pin it — `git push <remote> HEAD:<branch>` using the previewed values,
> so what executes is what was approved regardless of machine config. This
> needs `pushExecute` to take the remote and branch (widen the IPC signature
> accordingly) and `Chat.tsx` to pass the values from the SAME fresh preview
> the panel rendered — do not re-derive them at execute time, or you
> reintroduce the gap you are closing.

## IMPORTANT 2 — the pause is neither announced nor focused

Pressing the chip removed the focused button from the DOM and replaced it with
the panel, so focus dropped to `<body>` and a keyboard owner had to tab from
the top of the document to reach Push or Not now. Neither the panel's arrival
nor the settled outcome of the one irreversible action sat in a live region.
`Chat.tsx` already sets the standard for this: one persistent `role="status"`
element, added by the repo task 065 review fix for exactly this reason, proven
by an imperative `data-live-region-probe` marker. On a surface whose entire
purpose is that the pause is PERCEIVED before the write, both halves must be
fixed.

## Minors to fix

- **MINOR 5** — when the press-time re-read returns null because the upstream
  is gone, the panel said "no longer ahead of {remote}" using the stale
  preview: true that nothing pushed, false as to why. Say what is known.
- **MINOR 6** — `pushPreview` filters empty lines out of `git log --format=%s`,
  so a commit with an empty message makes `subjects.length < ahead` and the
  disclosed effect silently understates what publishes. Show `ahead` too.
- **MINOR 7** — both failure messages ended "then try the push again," but the
  settled state carries no control. Keep the no-retry stance; fix the sentence
  so it does not imply a button that is not there.

Ledgered, deliberately NOT fixed: MINOR 3 (the write is gated on the render
closure rather than a phase-mirroring ref), MINOR 4 (silent dead Push button if
a new card lands mid-push), MINOR 8 (`advanceUpstream`'s ambient-branch
dependence — the reviewer confirmed it fails loudly, not vacuously), MINOR 9
(plural chip copy untested).

## Checks that will show the fixes hold

- The argv of the one push is exactly `["push", remote, "HEAD:branch"]`,
  asserted on an injected exec's recorded args.
- A real `push.default=matching` repo with a second same-named branch ahead
  publishes only the branch that was named; the other branch's ref on the
  origin is byte-identical afterward.
- Pressing the chip focuses the confirmation panel.
- The outcome arrives as a content change inside a live region that was already
  in the DOM during the chip phase, proven by an attribute React never writes.
- Neither failure message contains "try the push again", and the settled
  outcome contains no button.
- `npm run typecheck`, `npm run test:unit` (app), `npx playwright test` (app),
  `cd core && npm test` — all green. No `core/` changes.

DONE means: what executes is what was disclosed, by construction rather than by
the machine's git configuration, and the pause can be perceived and reached by
someone who is not looking at a mouse. STOPPED means a push can still publish
more than the panel listed, or the one irreversible action can complete
unannounced.
