# Task 079 — Brief

Requested visible outcome: Phase 3 Task 13, the last of the phase. The contract
takes its one revisit, the connect card's cost line names the comment turn, the
milestone line stops describing a design the phase rejected, and the version
closes at 0.3.0 across every declaration and mirror.

## The amendment, and its two audiences

Cairn's contract is a portable rulebook read by two different readers, and the
amendment has to serve both without contradiction.

The first is an AI working directly under `AGENTS.md` — every task in this
repository, this one included. For that reader workflow step 6 ("write an
honest report, append one log row, and make one local exact-path commit") is
the standing instruction and does not weaken.

The second is the envelope-dispatched runtime, where since repo task 048 the
worker no longer writes records at all: it ends with one `cairn-claims` fence,
and Cairn's own code authors the report and the log row from that plus its own
Git verification. The contract has never said so. It says so now, scoped by its
opening clause so the first reader's duty is untouched:

> In an envelope-dispatched run, Cairn's runtime authors the report and log row
> itself, from its own verification plus the worker's claims.

The connected-conductor section gains the two owner-visible behaviors this
phase built: the relay (the envelope writes the result card, the conductor
takes one short comment turn on it, and that turn costs like any other) and the
push affordance (Cairn may offer a push button when local commits are ahead;
every push shows the exact target, effect, and recovery plan, and runs only on
the owner's approval of that exact action). The push sentence adds no new
permission — it names an affordance and points at the concrete-risk ceremony
that already governs it.

## The milestone line was describing the rejected design

Both `AGENTS.md` and `docs/ai-work/PROJECT.md` ended the milestone with "with
the conductor relaying only what the envelope verified". That is the
conductor-narrates model the Phase 3 design explicitly rejected: the conductor
does not relay the result at all. The envelope authors the card; the conductor
comments on it. Both lines are reconciled to the designed behavior.

## Boundary of intent

No behavior change beyond one owner-facing string. The consent card's `cost`
field gains a sentence; nothing else in the connect, dispatch, relay, or push
paths is touched. No dependency added or removed. No records rewritten.

## Checks that will show it holds

- `core/test/contract-mirrors.test.mjs` RED against cairn.html after the
  template edit, GREEN after the hand update — the mirror proving itself.
- `AGENTS.md` diffed against `CONTRACT-TEMPLATE.md` directly: no test guards
  the filled instance, so the diff must show the four project-facts lines and
  nothing else.
- Every version declaration at 0.3.0: the contract header in
  `CONTRACT-TEMPLATE.md`, `AGENTS.md` and cairn.html (twice — the eyebrow and
  the embedded header), the three package files, all three lockfiles.
- `app/package.json` starts with byte `{`, not a BOM (repo task 054's
  PostCSS break).
- Full battery: core with the mirror, cli, app typecheck and unit, Playwright
  through `npm run test:smoke` so the bundle is rebuilt first, and one core run
  under a short-name TEMP (repo task 054's CI condition).

DONE means: the contract states what the runtime actually does for both of its
readers, the milestone line matches the design, the owner is told about the
comment turn before connecting, and 0.3.0 is declared consistently everywhere
with the whole battery green.

STOPPED means any mirror disagrees, cairn.html's encoding is damaged, or a
check above is not green.
