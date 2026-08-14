# Task 231 report - authenticated inert Builder review turn

**Lane:** A (main checkout). **Base commit:** `c2885dd`. **Brief-only
commit:** `f50ab2f`. **Disposition:** DONE.

## Outcome

One fixed, genuine synthetic Task 224 context/response identity pair now enters
one Main-only append boundary, is composed there into Task 229's existing
`BuilderProposalReviewV1`, receives separate external custody, and appears as
one distinct nonterminal `builder-review` turn in real desktop Chat. The same
exact public turn survives a cold application relaunch and renders once.

The card remains plainly **Builder proposal — not applied**. It says that
nothing changed, no command ran, and Cairn has not checked currentness,
correctness, or safe applicability. It contains literal React text and no
control, link, form, handler, focus target, Markdown/HTML interpretation,
navigation, storage, network, popup, or render-time IPC effect.

This still does **not** generate a real Builder proposal. The only producer is
a fully guarded, no-argument, one-shot Electron evidence hook using fixed fake
paths and text. The next separate task is safe Git-tracked text selection plus
tool-free transport plumbing, initially fake and without a live model call.

## What changed

### Runtime, custody, and data boundaries

- `app/src/main/conductor/builderreviewauth.ts` adds the closed V1 parser,
  project/filesystem binding, canonical projection/turn digest, and separate
  Main-owned external marker domain.
- `app/src/main/conductor/store.ts` adds the sole exact-pair append boundary,
  rejects raw Builder turns at the generic append, pins the destination through
  fsync, consumes one live response once, authenticates strict physical/order
  evidence on read, and gives Builder-only conversations a fixed nonterminal
  preview.
- `app/src/main/conductor/turnauth.ts` admits a strict Builder event in the
  shared ordering ledger while keeping its destination pinned to the captured
  canonical project key. A malformed or globally duplicated ledger refuses
  before project JSONL.
- `app/src/main/builderproposalreviewfixture.ts` builds only the fixed genuine
  fake Task 224 pair and invokes the dedicated append boundary.
- `app/src/main/main.ts` configures custody and exposes that fixture only under
  the complete positive E2E guard; the guarded boot suppresses update lookup
  and the phone listener and sends the existing generic conversation delta.
- `app/src/shared/ipc.ts` adds a distinct authority-free public turn and a
  role-closed `ConductorDelta` union.
- `app/src/main/conductor/service.ts` positively projects only legacy roles
  into provider history. `app/src/main/bridge/server.ts` and
  `app/src/main/bridge/phonepage.ts` positively allow only legacy phone roles.
  `app/src/main/conductor/relay.ts` narrows the result-card producer to its
  exact envelope type.

### Desktop presentation

- `app/src/renderer/screens/Chat.tsx` restores and renders authenticated
  Builder evidence in connected and disconnected Chat, merges live/read races
  by opaque display id, uses a neutral delta branch, preserves Cairn follow-ups,
  and keeps action/stream/composer restoration independent.
- `app/src/renderer/screens/Workspace.tsx` ignores the append-only delta instead
  of fanning it out into status/task/project reads.
- `app/src/renderer/components/BuilderProposalReview.tsx` keeps untrusted text
  out of React keys and dynamic accessible attributes. It otherwise remains
  Task 229's literal, actionless component.
- `app/src/renderer/components/BodyPill.tsx` accepts only an exact Cairn reply.
  `app/src/renderer/app.css` adds the real Chat card styling and one compact
  820px collapse.
- `app/lab/builderproposal.css` retains the standalone lab treatment with a
  truthful comment. `app/lab/mock-cairn.ts` emits the now-required exact Cairn
  terminal turn in its mock delta.

### Tests and configuration

- New: `app/tests-unit/builderproposalturn.test.ts`,
  `app/tests/builder-proposal-conversation.spec.ts`, and
  `app/playwright.builderconversation.config.ts`.
- Expanded: `app/tests-unit/builderproposalreview.test.ts`,
  `app/tests-unit/bridge.test.ts`, `app/tests-unit/store.test.ts`, and
  `app/tests-qualification/builder-proposal-bundle-dark.test.mjs`.
- Historical production-dark assertions were changed to the exact Task 231
  allowlist in `app/tests-unit/evidencepresentation.test.ts`,
  `app/tests-unit/pendingboot.test.ts`, `app/tests-unit/pondline.test.ts`,
  `app/tests-unit/qualitypreviewpaper.test.ts`, and
  `app/tests-unit/runpaper.test.ts`.
- `app/tsconfig.json` and `app/tsconfig.unit.json` include the new guarded
  fixture, custody tests, and dedicated Playwright configuration.
- `docs/ai-work/tasks/231-brief.md` was committed alone before implementation.
  This report and the one Task 231 row in `docs/ai-work/LOG.md` complete the
  records.

## Checks

### c1 - only exact live Task 224 custody can append: PASS

The append boundary itself calls `composeBuilderProposalReview`. Tests prove
that a genuine exact pair succeeds once, while a byte-identical second context,
cross-context response, raw object, structural clone, Proxy, accessor, wrong
project, wrong identity, replay, and generic raw-turn append persist nothing.
The identity-join mutant fails when Task 224's WeakMap join is removed.

### c2 - external custody authenticates one exact nonterminal turn: PASS

The marker digest binds the V1 domains, canonical-root digest, filesystem
identity digest, conversation, opaque display-turn id, timestamp, canonical
projection digest, and every projection field. Custody and strict ordering are
recorded before JSONL. Tests reject marker-only residue, unmarked forgery,
truncation, malformed/extra-key data, semantic hash/path/order errors,
cross-project/conversation/id/time data, same-path project replacement,
project/destination swaps, duplicate markers/events/physical lines, malformed
same-id claims, incomplete tails, global legacy-event ambiguity, and physical
event reordering. The marker-removal mutant fails.

### c3 - real desktop Chat renders complete literal inert review data: PASS

Unit/SSR tests cover replacement reviews and all five capability categories,
every field, exact honesty copy, deep freezing, hostile angle brackets,
Markdown-looking text, and closed DOM/module surfaces. Role-to-terminal,
action, handler, focus, navigation, dynamic attribute, network, storage, and
hidden module-import mutants fail. The real Electron run found one card, no
focusable descendant, and unchanged task, action, proposal, composer, dispatch,
result, session, stream, URL, storage, focus, page, popup, and request state.

### c4 - existing delta/read/restore route is exact and leak-free: PASS

The guarded Main hook sent the ordinary `conductor:delta` channel after an
empty restore had settled; removing that live send fails the source guard and
cannot be masked by persistence. A second hook call refused. Cold relaunch
returned a public turn deeply equal to the live IPC turn with the same opaque
id, left the one physical JSONL line unchanged, and rendered one card. Provider
history returned no Builder message. Phone HTTP state, SSE, and phone DOM omit
the role and every canary. Logs contain no selected/proposed canary. Preload,
task, dispatch, reservation, activation, worker, verifier, Git-candidate, and
transport routes remain dark.

### c5 - focused causal and visual evidence: PASS

Commands and real results:

- `core: npm.cmd run build` followed by
  `node --test dist\test\builder-intercom.test.js` — PASS, 10/10.
- `app: .\node_modules\.bin\tsc.cmd -p tsconfig.unit.json --pretty false`
  followed by the five focused Builder/turnauth/store/bridge files — PASS,
  68/68.
- `app: npm.cmd run typecheck` — PASS.
- `app: npm.cmd run build:lab` — PASS, 107 modules. The first sandboxed
  attempt was denied local build-file access; the same already-installed build
  was retried under the authorized local build permission and passed. No
  dependency or network access was used.
- `app: npm.cmd run build:vite` — PASS on the final source: Main 108 modules,
  preload 1, renderer 79.
- `app: node --test tests-qualification\builder-proposal-bundle-dark.test.mjs`
  — PASS, 1/1 against the fresh bundles.
- `app: npm.cmd run test:unit` — final PASS: 872 tests, 870 passed, 0 failed,
  2 skipped, 331.1 seconds. The skips are the literal POSIX-backslash case and
  file-symlink escape case unavailable on this Windows host.
- Earlier full-suite attempts were retained honestly: the first 240-second run
  timed out without a terminal summary or printed failure; an extended pass
  exposed four stale production-dark assertions; the next pass was 869 pass,
  1 stale breakpoint assertion fail, 2 skips. Those five historical assertions
  were updated to the exact Task 231 allowlist; focused repairs and the final
  full pass are green.
- Under an atomic `%TEMP%\cairn-app-token` plus `app\.app-token` wrapper with
  zero Cairn/Electron preflight processes:
  `node .\node_modules\@playwright\test\cli.js test --config
  playwright.builderconversation.config.ts --workers=1 --reporter=line` —
  PASS, 1/1. The first functional pass also passed, but visual inspection found
  the saved-evidence scroller had framed only the card's final line. The test
  was tightened to require the whole card in a tall off-screen wide/compact
  viewport and passed again in 3.3 seconds.
- Three independent final read-only audits returned CLEAR after their custody,
  consumer, and evidence findings were repaired.

The retained ignored visual evidence is:

- `app/test-results/task231-builder-conversation/task231-builder-conversation-normal.png`
  — 3,044,296 bytes, SHA-256
  `4fb39a43581fa101012344a7801f4c2c53ccdd3277dfb21dbf434dc6ac159e13`.
- `app/test-results/task231-builder-conversation/task231-builder-conversation-compact.png`
  — 658,265 bytes, SHA-256
  `977d43620e3696a2c9a9a3b3499261cbd3391c7b872e2585e9072794dcd85f8f`.

The Task 229 Edge lab spec was not rerun because its historical configuration
clears the default result directory and overwrites Task 229's protected
screenshot. Its lab build, component/DOM tests, fixed fixtures, and production
integration allowlist all passed; Task 231's decisive browser evidence is the
real isolated Electron Chat run above.

After the final run: zero Cairn/Electron processes, zero app-token directories,
zero owned `cairn-task231-*` temp directories. Existing ambiguous Task 228/229
temp candidates were neither enumerated broadly nor changed. The suites emitted
only the known Windows Git global-ignore permission and disposable-fixture
line-ending warnings.

### c6 - records and Git isolation are exact: PASS

`git diff --check` passes. The main worktree contains only the 31 exact Task
231 implementation/test paths plus this report and the one LOG edit; the brief
is isolated in `f50ab2f`. No pre-existing staged path was present. The cached
exact-path manifest and cached whitespace check are reviewed immediately before
the single local completion commit (this commit). Other worktrees and lane
branches remain untouched. Nothing is pushed.

## How to try it

The guarded synthetic route is evidence-only and deliberately has no normal UI
entrance. The safest reproducible trial is the dual-token Playwright command
recorded under c5 after confirming Cairn/Electron are closed. It creates its own
fixed disposable project/profile, shows the real Chat card live, closes the
app, relaunches cold, verifies the same single turn, and removes only its
identity-owned temporary directories after confirmed process exit.

## Limits and next task

No real selected file was read or persisted, no real Builder proposal was
transported, no provider/model/credential/paid/network call occurred, and no
proposal was applied, verified, approved, dispatched, published, reserved, or
promoted into Task 227/228 machinery. Task 223's worker/verifier STOP, Task
225's live-file application STOP, and Task 228's Git durability STOP remain in
force.

The next separate task is safe Git-tracked text selection plus tool-free
transport plumbing, initially fake and with no live model call.

Disposition: DONE
