# Task 069 — Report

Review fix on 068. Four Important findings, two Minor, all fixed.

## IMPORTANT 1 — the fail-closed store guard now discriminates

The finding was exact and the proof was better than the finding: the malformed
fixture had no `ts`, so `store.ts`'s ts-check dropped it first and
`isResultCard` never ran. A test that passes for the wrong reason is worse than
no test, because it reports a guarantee nobody is holding.

`app/tests-unit/resultcard.test.ts` now appends six malformed envelope lines,
each carrying a **valid `ts`**, so the card guard is the only thing that can
drop them — one per clause plus the shapes that would crash a renderer:

```ts
{ role: "envelope", card: { kind: "nope" }, ts }                            // wrong kind
{ role: "envelope", card: { ...card, disposition: "FINE" }, ts }            // unknown disposition
{ role: "envelope", card: { ...card, filesChanged: "docs/ai-work/LOG.md" }, ts } // not an array
{ role: "envelope", card: "a result card, honestly", ts }                   // not an object
{ role: "envelope", card: null, ts }                                        // null
{ role: "envelope", ts }                                                    // no card at all
```

### The discrimination check, run this session

Neutered the guard to `return true` as its first statement, ran the suite:

```
✖ the store round-trips a valid envelope turn and drops every envelope line
  whose card is not a result card (5.9939ms)
  AssertionError [ERR_ASSERTION]: only the real card and the owner turn survive

  8 !== 2

ℹ tests 53 / pass 52 / fail 1
```

All six bad lines survived, exactly as they must when the guard is gone.
Restored the guard; **53 / 53 pass**. The test now fails for the guard's own
reason, which is the only thing that makes it evidence.

## IMPORTANT 2 — the claims label is now exercised WITH claims

Both 068 assertions of the claims heading ran against
`composed.claims === null`: the offline demo parses no claims, and a cancelled
run never receives a claims fence. They only ever hit the fallback sentence.

A Playwright test was cheaply stageable, so this is render-level and real, not
a unit substitute: `fakeCodexEnvironment(project, true, "success")` completes a
DONE with claims (`summary: "Added the visible result."`, `milestone: "YES"`).
The new test asserts the worker's own sentence and its milestone claim appear
**inside** `.result-card-claims`, under the heading that calls them claims, and
**not** in `.result-card-facts`:

```ts
await expect(claims).toContainText("Added the visible result.");
await expect(claims).toContainText("Milestone movement, as the worker claims it: YES");
await expect(card.locator(".result-card-facts")).not.toContainText("Added the visible result.");
```

The same test pins the other side of the split: `.result-card-files` lists
`visible.txt` under the from-Git label, and the file really is on disk with the
worker's bytes. One card, two sources, visibly separated.

## IMPORTANT 3 — the prompt assembly carries the report's separation

The plan's verbatim string put the entire card JSON — `claims` included — under
"verified by Cairn's runtime, not by the conversation model". That hands the
model the worker's own sentence under Cairn's guarantee, which is precisely
what the report's two-section split exists to prevent. Spec Chunk 4 governs,
and the plan's own Global Constraints say so.

The mapping moved into `relay.ts` as `cardBriefing(card)` — a named seam the
unit tests can reach, since `service.ts` is not in the unit build. It emits two
parts, and the separation is STRUCTURAL rather than a matter of wording: the
claims are lifted out of the object, so the verified part has no `claims` key
at all.

```
Envelope result card (verified by Cairn's runtime, not by the conversation model):
{"kind":"result","disposition":"DONE",…}

The worker's account (claims, not verified by Cairn):
{"summary":"Added the visible result.","milestone":"YES"}
```

Both labels are `core/src/records.ts`'s own section wording, and the no-claims
case emits that file's own sentence — "The worker returned no readable claims
block." — so the conductor reads the same words a reader of the report reads.

Pinned by assertion:

```ts
assert.ok(!verified.includes("Added the visible result."), "a claim must never sit under the verified label");
assert.ok(!verified.includes("claims"), "the verified part carries no claims key at all");
```

Task 9 builds directly on this seam.

## IMPORTANT 4 — the card no longer drops two verified lines

`ResultCard` gains `recordRecovery: string | null` and `processFailure: {
code: string; debugPath: string | null } | null`, both mapped from `composed`
and both rendered in the verified fact list.

`recordRecovery` is Task 052's disclosure that a worker edited Cairn's own
append-only log or pre-wrote the report path, and that Cairn recovered its own
records. It is the loudest sentence a card can carry — it says a worker tampered
with the records the whole system's honesty rests on — and 068 silently dropped
it. It renders in the stop color (`.result-card-recovery`).

`processFailure` renders `core/src/records.ts`'s own sentence, including its
null-path fallback: "unavailable (the local debug directory could not be
created)".

### MINOR 6 — the record's exact sentences

Three places where the card restated a record line in its own words now use the
record's:

| Card, before | Card, now (= `records.ts`) |
|---|---|
| `none — retained evidence is never committed by Cairn` | `none — stopped evidence is retained for inspection, never committed by Cairn` |
| `The worker's account — claims, not verified by Cairn` | `The worker's account (claims, not verified by Cairn)` |
| `No worker claims were recorded for this run.` | `The worker returned no readable claims block.` |

One line is deliberately NOT the record's: the card says "Milestone movement,
as the worker claims it: YES" where the report says "Milestone movement:
**YES**". The card's version is strictly more labeled, and it sits inside the
claims container; matching the report here would move a claim toward reading as
a fact.

## MINOR 5 — the false rationale is corrected

`relay.ts` said "A DONE close is only returned after the commit actually
succeeded". False at two of the three DONE sites: the dirty-start worker DONE
returns `commit: skipped` (`core/src/serial.ts:1276-1286`) and the offline demo
returns whatever `recordCommit` produced (1416-1431).

The decision stands; the reason was wrong. The true reason, now in the comment:
the card prints `composed.commit.reason` **verbatim**, and every reason core
composes already says which of the two happened — so the sentence cannot
overstate a commit at any site, whether or not one occurred.

## Checks run (all real, this session)

- `npm run typecheck` (app) — clean.
- `npm run test:unit` (app) — **tests 53 / pass 53 / fail 0** (52 after 068,
  plus the briefing-separation test; the store test grew six cases in place).
- `npx playwright test` (app) — **32 passed** (31 after 068, plus the
  claims-bearing render test).
- `cd core && npm test` — **tests 104 / pass 104 / fail 0**. Core untouched.
- The guard-discrimination check above: RED with the guard neutered
  (`8 !== 2`), GREEN restored.

Files touched: `app/src/shared/ipc.ts`, `app/src/main/conductor/relay.ts`,
`app/src/main/conductor/service.ts`, `app/src/renderer/screens/Chat.tsx`,
`app/src/renderer/app.css`, `app/tests-unit/resultcard.test.ts`,
`app/tests/conductor.spec.ts`, `docs/ai-work/tasks/069-brief.md`,
`docs/ai-work/tasks/069-report.md`, `docs/ai-work/LOG.md`.

`app/src/main/conductor/store.ts` is byte-identical to its 068 state: the
neuter-and-restore was a check, not a change.

## Limitations and remaining human judgment

- **Ledgered, untouched by design:** the three dispatch outcomes that post no
  card (gate refusal, detection throw, unauthorized disclosure) all refuse
  before a run promise exists; the unrecognized-ERROR-code diagnostic gap (a
  code failing the shape check leaves the card with no code at all, and the raw
  message is only in the app log); and the `event.turn as ConductorTurn` cast in
  Chat's delta branch.
- **The store guard remains shape-level.** It now has four clauses with a test
  per clause, but a card whose `route` was hand-edited inside `.cairn/` would
  still render that edit.
- **`cardBriefing` is not yet consumed by a conductor that comments.** Task 9
  is what proves the separation survives into an actual reply; this task proves
  only that the prompt carries it.
- Milestone movement: NO. This is a correctness and evidence fix on Task 068;
  no new owner-visible capability.

Disposition: DONE
