# Task 218 report - the owner sees the exact critic call before it is approved

**Lane:** A (the main checkout). **Base commit:** `dd622da`; the brief was
claimed alone in `53c51e4`.

Prerequisite Q, Task Q8, **stage 3 of 4**. Stage 1 said which call is approved,
stage 2 bound the send to it, and this stage adds the only thing that can ask
the owner. Stage 4's calibration-only orchestrator is what will drive it. Q9,
Q10 and owner-verdict Plan 2 remain unstarted. Tasks 215, 216 and 217 are part
of this base and behave exactly as before. Task 212 remains unmerged on
`lane/g` and was not touched.

## What actually changed

Fifteen Task 218 paths across the brief-only claim and this final commit:

- `docs/ai-work/tasks/218-brief.md` - the committed claim and six checks
  (already committed as `53c51e4`).
- `app/src/shared/critic-call.ts` (new) - the output-only card, its constants,
  and its canonical form. **No node import**, because the renderer imports its
  constants as values.
- `app/src/shared/critic-call-parse.ts` (new) - the main-only parsers, which
  need Node's proxy detection.
- `app/src/main/criticapproval.ts` (new) - the composer, the one-use approval,
  and the grant.
- `app/src/renderer/components/CriticCall.tsx` (new) - the card the owner reads.
- `app/tests-unit/criticapproval.test.ts` (new) - 15 tests.
- `app/tests-unit/criticcallpaper.test.ts` (new) - 8 presentation tests.
- `app/src/main/tasks.ts` - one IPC channel, the pending-run gate, and the
  approval's lifecycle binding.
- `app/src/shared/ipc.ts`, `app/src/preload.ts` - one API entry, one key, and
  the output-only card field on the preview and the run snapshot.
- `app/src/renderer/screens/Chat.tsx`, `TaskRun.tsx` - both run surfaces.
- `app/src/renderer/app.css` - the card's styles.
- `app/lab/mock-cairn.ts` - a dev-only fixture so the card can be looked at.
- `app/tests-unit/critic-call-fixture.ts` - an optional hostile-path override.
- `docs/ai-work/tasks/218-report.md`, `docs/ai-work/LOG.md`.

No Core change. No dependency. No provider or network call.

It follows the dispatch approval already in the product — a one-use opaque id,
a Main-composed disclosure, and a check before the call — rather than inventing
a second approval mechanism.

## The independent review, and what it changed

Three independent adversarial reviews ran against the diff, with distinct
lenses. **All three found real defects, and the first draft was not fit to
land.** Every finding below was verified by reading the named line before
acting; the load-bearing ones were then re-proven by mutation.

**CRITICAL - the card understated what would be sent.** It presented a closed
inventory: "Sends N of at most 8 tracked text files" plus a "Not sent" list. But
`criticCallRequestBody` transmits the whole canonical packet, which also carries
the task-spec projection — every promise, failure condition, evidence standard,
preference, reference title and anti-copy boundary — plus the artifact registry,
check evidence, prior findings and comparison trials. With an empty selection
the card read "No file contents are included in this call" while the request
carried the owner's entire frozen promise set to a third party. The design
spec's own required wording, "plus the path-free plan/check metadata", had been
dropped. That is this brief's STOPPED clause. **Fixed:** the composer now takes
the branded request, and the card states the plan and check metadata counts and
the exact total size of the whole request. A test compares all seven numbers
against the packet Core would actually send.

**MAJOR - the card said the provider key is not sent. It is.** The key is the
Authorization header on this exact request. It is never in the packet the critic
reads, never logged and never recorded — but "your saved provider key" in a flat
"Not sent" list is an untruth on an approval screen. **Fixed:** removed from
that list and replaced with its own accurate sentence.

**MAJOR - the re-derivation was theatre.** `rederiveDisclosure` re-read a
Core-frozen authorization, so it could never disagree with what it had stored;
the only comparison that could fire was the renderer's echo. My own mutation had
missed it because it removed both clauses at once. **Fixed by deletion:** the
card is composed from a frozen approval and a frozen request and cannot drift,
so the code now says that plainly and checks the one thing that can differ.

**MAJOR - a renderer could destroy the owner's approval.** A well-formed echo
differing in one field consumed the pending card, so one altered byte from a
buggy or hostile renderer permanently denied the owner their own approval — and
in `required` mode left them unable to approve *or* stop. My test asserted that
destruction as desired behaviour. **Fixed:** no refusal spends an approval. Only
a decision that succeeds does, and only `clearCriticCallApproval` drops one
unspent.

**MAJOR - a spent call could ask to be approved again.** The Core brand
deliberately survives a send so custody can still be recorded, and the brand was
the only admission test, so an already-billed call composed a card reading "paid
call 1 of at most 3". **Fixed:** composing the body is the test for "not yet
sent".

**MAJOR - a refused open left the previous card standing**, contradicting the
module's own stated invariant exactly when it mattered. **Fixed:** the earlier
card is dropped first, on every path out.

**MAJOR - the busy flag could latch on forever.** Its only reset sat inside a
generation guard, and a session refresh bumps that generation — so a refresh
arriving mid-decision disabled both controls permanently. **Fixed:** the reset
is unconditional in both screens.

**MAJOR - the two most consequential buttons had no styles.** `.primary` and
`.secondary` do not exist in this app; its buttons are pills. "Stop this task"
rendered identically to "Approve this critic call", both unstyled. **Fixed:**
`pill-primary`, `pill-danger` and `pill-quiet`, with a test that asserts rule
bodies rather than selector substrings.

**MAJOR - Chat could never show the card.** It rendered only in the pre-start
branch, fed from the route preview, while a critic call happens mid-run and the
run-time card rides on the session — which Chat never read. **Fixed:** Chat now
renders the live card during a run.

**MAJOR - the channel ignored Task 215's gate.** It was the only new task
authority that did not consult `pendingTaskStartRefusal`, so a project gated for
pending-run recovery could still have a paid call approved against it. **Fixed**,
along with the project check its neighbours make.

**MAJOR - a pending approval outlived its run.** `clearCriticCallApproval` had
no production caller, so a cancelled or replaced run left an approvable card
pinning its request. **Fixed:** `nextGeneration` clears it, and the map is
bounded.

Also repaired: locale-dependent numbers in a security disclosure (the
neighbouring component pins `en-US` for the same reason); a rounded duration
that could state a limit the call could not run under; a 12-character hash the
owner could not check against `sha256sum`; the card rendering after a run
finished; parser bounds copied from Core as bare literals, now named constants a
test binds; a comment cut in half by an insertion; and one authorization able to
mint two grants.

**A build failure my own fix caused, caught before landing.** Adding the
credential sentence made the card import a *value* from the shared module, which
dragged `node:util` into the renderer bundle and broke the Vite build. The
module is now split: types and constants with no node import, parsers separately.

## Checks run and real results

- **`c1` - the card says exactly what would be sent, and no more. PASSED.**
  Composed only from a branded, unspent authorization paired with its own
  request; a copy, clone, lookalike, another request, or a spent call composes
  nothing. Every route fact, cap, limit and selected file matches the approval;
  the plan metadata and the total request size match the packet; the totals
  equal the rows shown. No absolute path, project hash, packet content or
  credential appears. A card that could not survive its own parser is refused
  rather than shown, proven with a zero-width-character path that Core accepts
  and the App's stricter rules do not.
- **`c2` - one approval, one decision. PASSED.** The id is opaque and one-use; a
  replay, a stale card, a cross-project id and a replaced card all refuse. Every
  one of the four closed refusals leaves the approval standing and the owner's
  own press still works. A granted call composes no second card.
- **`c3` - the frozen mode decides the controls. PASSED.** `required` offers
  approve or stop, `optional` approve or continue, `off` composes nothing. A
  card echoed with a swapped mode — internally consistent, so it parses —
  still cannot press an action the approval's own mode does not offer.
- **`c4` - approving sends nothing. PASSED.** No production caller of the
  composer, the grant, or `sendCriticCall`; nothing writes the card field;
  `packet-only-critic` is advertised nowhere; the activation registry is empty.
  The grant yields its call exactly once.
- **`c5` - the renderer cannot forge, widen, or replay. PASSED.** The parser
  refuses extra and missing keys, clones, proxies, accessors, prototype tricks,
  a rewritten purpose, a shortened not-sent list, invented actions, a ninth
  file, absolute paths, traversals, reserved areas, understated totals, a
  request smaller than its own files, and out-of-range values. The reply carries
  a decision and never the grant.
- **`c6` - verified isolation and regression safety. PASSED, with findings.**
  Core 384 (374 pass, 10 platform skips, 0 fail) — unchanged, and no Core file
  was touched. App unit 694 → **739 (737 pass, 2 platform skips, 0 fail)**. Both
  typechecks clean, three Vite bundles built, `git diff --check` clean, and
  `node:util` absent from the renderer bundle. Three independent adversarial
  reviews ran; their decisive findings are repaired and re-proven above, and
  what cannot be met at this layer is recorded below.

**Mutation testing: 22 mutations, 22 caught** (2 by the compiler). Neutering the
brand or unspent check, the request pairing, the decidability round trip, the
echo comparison, the mode gate, the clear-first rule, the grant's single use,
the totals-match rule, the metadata counts, the purpose pinning, the pending-run
gate, the lifecycle clearing, the button styles, the full hash, the pinned
locale, or the unconditional busy reset each fail a test. Making a refusal spend
the approval, or making a refusal clear the card, each fail too.

Two of those started as **not caught** and are worth naming: the assertion that
a refusal keeps the card was satisfied by an identical line in a *different*
function, and the tamper loop derived its expected code from whether the echo
parsed, so it adapted to a removed guard instead of failing. Both are now
scoped and explicit.

```powershell
cd app
npm.cmd run typecheck                           # pass
npm.cmd exec -- tsc -p tsconfig.unit.json       # pass
npm.cmd run test:unit                           # 739 total, 737 passed, 2 skips, 0 failed
npm.cmd run build:vite                          # exit 0; three bundles
cd ..\core
npm.cmd test                                    # 384 total, 374 passed, 10 skips, 0 failed
```

## How to try it

There is no production change: nothing composes a card until stage 4. The card
can be seen with `npm run lab` in `app/` — the visual lab is a dev-only Vite
entry that ships in no build, and its running scenario now carries a stand-in
Independent-critic card. That fixture is also what would have caught the
unstyled buttons, and it puts no test-only seam in shipped code.

## Limitations and remaining human judgment

- **Four of the five "not sent" claims are promises, not verified facts.**
  "Images or other binary files", "untracked or ignored files", "links" and
  "generated or dependency areas" rest on provenance booleans a caller supplies;
  Core asserts their shape, not their truth, and the selector that would make
  them true does not exist yet. Harmless while the surface is dark. **Stage 4
  must not drive this card with a selector that is not itself verified** — that
  is the point where these sentences become an honesty defect.
- **This surface has never been rendered in Electron.** Deferred to stage 4 by
  owner decision, recorded in the brief. The lab now shows the card in a
  browser, which is not the same as the real window, and no Playwright journey
  exercises approve, decline, stale or restart.
- Renderer coverage is source-text based, the house pattern here. It pins call
  ordering, wiring and styles; it cannot catch a guard wrapped in an
  always-false condition.
- The composer's consent-cap re-check is unreachable through the public API and
  is recorded as depth, not counted as coverage.
- `sessions` is keyed by the raw directory while the approval is keyed by the
  canonical project key — an inherited split, shared with `task:review-action`.
  A differently-spelled path could decide the approval and miss the snapshot.
  Latent while nothing writes the snapshot field; stage 4 owns it.
- The card shows counts of the plan and check metadata, not its text. An owner
  who wants to read exactly what those promises say still has the Task Spec
  review; the card states the size and the shape.
- Verification was fake/unit/build only. No provider or network call, no
  credential, no dependency, no Electron run, no real app profile, nothing
  pushed.

**Disposition: DONE**
