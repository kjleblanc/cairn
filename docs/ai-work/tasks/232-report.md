# Task 232 report - safe tracked-text fake Builder route

**Lane:** A (main checkout). **Base commit:** `7902306`. **Brief-only
commit:** `b173540`. **Disposition:** DONE.

## Outcome

In one identity-owned disposable Git repository, Cairn Main now reads the
complete current bytes of a fixed ordinary Git-tracked text file, derives the
exact Task 224 selected-text context, sends that exact live context once
through an injected tool-free fake transport, and passes the fake's exact
identity-bound response into Task 231's existing
`appendBuilderReviewTurn` custody boundary.

Real desktop Chat showed exactly one inert **Builder proposal — not applied**
card during the live run. A cold application relaunch restored the same one
authenticated display turn without replaying the selector or transport. The
fixed HTML- and Markdown-looking canaries remained literal text. No proposal
was applied, executed, verified, approved, dispatched, published, reserved, or
promoted into Task 227/228 machinery.

The route is available only under the complete fixed Task 232 evidence guard,
with an identity-checked OS-temporary project and profile. Ordinary launch has
no hook, IPC, renderer control, or other entrance to it. No real owner-project
file, model, provider, credential, paid service, network, dependency, worker,
verifier, native helper, candidate ref/index/object, or external service was
used.

## What changed

### Core protocol boundary

- `core/src/builder-intercom.ts` exports the exact Task 224 selected-path
  predicate for the Main selector and closes additional control/host paths.
- `core/src/index.ts` exposes that predicate through the package surface.
- `core/test/builder-intercom.test.ts` proves the package surface and expanded
  unsafe-path matrix.

### Main-only selection and fake route

- `app/src/main/buildertrackedtext.ts` adds the read-only selector. It pins the
  Git executable and repository state, neutralizes ambient Git configuration,
  accepts only direct ordinary tracked/non-ignored files, reads current
  handle-bound UTF-8 bytes, applies the existing caps and secret/path gates,
  binds physical and Git identities, and repeats the complete boundary around
  context composition. Its process-local WeakMap token makes clones and saved
  records inert.
- `app/src/main/builderfaketransport.ts` adds one fixed, tool-free, process-local
  fake. It accepts only the registered live context object once, spends before
  its async boundary, exposes zero filesystem/process/network/credential/tool
  handles, and returns one fixed response parsed against that same object.
- `app/src/main/builderreviewroutefixture.ts` joins the genuine selection and
  fake answer, rechecks selection/project custody before and after the fake and
  around conversation allocation, then invokes Task 231's existing append
  boundary.
- `app/src/main/builderproposalreviewfixture.ts` adds the fixed Task 232
  authority coordinates and `examples/synthetic/greeting.ts` request without
  accepting project, Git, byte, or provenance claims from the caller. Task
  231's original fixed pair and append fixture remain intact.
- `app/src/main/main.ts` adds the exact
  `CAIRN_TEST_BUILDER_TRACKED_TEXT=task232-fixed-v1` evidence guard. It requires
  the existing E2E/mock guards plus exact real OS-temporary project/profile
  names and identities, retires the old Task 231 marker, keeps update and phone
  effects dark, spends the one-shot hook before work, and sends only the
  existing generic conversation delta after the authenticated append.

### Evidence and configuration

- `app/tests-unit/buildertrackedtext.test.ts` supplies disposable real-Git
  causal tests for positive selection, physical/Git/byte races, path and secret
  refusals, fake identity and one-use custody, route joining, serialized-record
  inertness, source allowlists, and load-bearing mutants.
- `app/tests-unit/builderproposalreview.test.ts` and
  `core/test/builder-intercom.test.ts` retain Task 231 compatibility and update
  the exact safe-path/consumer surfaces.
- `app/tests/builder-proposal-conversation.spec.ts` proves the real live/cold
  desktop path, literal inert rendering, transcript/marker minimization,
  unchanged file/Git state, no provider/log/renderer leakage, and exact
  identity-owned cleanup.
- `app/playwright.builderconversation.config.ts` gives Task 232 isolated
  retained browser evidence.
- `app/tests-qualification/builder-proposal-bundle-dark.test.mjs` proves the
  selector/fake are Main-only, raw custody is absent from preload/renderer, the
  proposal canary is not prebundled, and the source consumers are closed.
- `app/tsconfig.unit.json` includes the new Main-only modules and test.
- `docs/ai-work/tasks/232-brief.md` was committed alone before implementation.
  This report and the one Task 232 row in `docs/ai-work/LOG.md` complete the
  records.

No other tracked file changed. The two retained screenshots below are ignored
test evidence, not staged product files.

## Checks

### c1 - tracked-text selection is positive, exact and race-closed: PASS

The selector derived one exact Task 224 context from the current dirty
worktree bytes of a genuinely tracked ordinary file rather than substituting
the committed blob. It refused untracked and ignored files, local and tracked
ignore rules, filters/attributes, config includes, binary and malformed UTF-8,
credential-like/generated/control paths, outside/cross-project paths, device
names, Git symlinks, junctions, hard links, case aliases, malformed input,
accessors, Proxies, extras, duplicates, and unsorted aliases.

Changing bytes, replacing a file with byte-identical content, replacing the
Git index with byte-identical content, or changing HEAD/index/project state
invalidated the live selection. Git configuration/index/HEAD and selected-file
identities are captured and rechecked, while serialized or structurally cloned
selection records carry no authority.

### c2 - the fake transport is exact, tool-free and one-use: PASS

The fake accepted only the exact registered context object and canonical bytes
for its one turn. It became spent before awaiting, returned only its fixed
bounded parsed response, and could not be replayed with the same value, a
byte-identical context, clone, hash, or serialized record. Its receipt records
one attempt and zero tool, process, network, credential, or ambient-message
handles. Source allowlists and mutants fail if an ambient import, effect
surface, omitted identity check, altered context, or extra consumer appears.
State drift during the fake produced no append.

### c3 - Task 231 custody and cold restore stay exact: PASS

The genuine selected context and exact fake answer reached the existing Task
231 append boundary once. That boundary wrote one external marker and one
conversation event, then the existing generic delta/read route produced one
public `builder-review` turn. A second hook use and fake replay refused. Cold
restart restored the same single turn and left the one physical transcript
line unchanged.

The transcript, external marker, IPC, renderer state, and cold record contain
only Task 231's authenticated display projection. Raw Task 224 context/response
objects, selected-text authority, transport authority, live brands, project
topology, and resumable capability do not cross that boundary.

### c4 - rendering is inert and leak-free: PASS

The real card rendered the complete selected-before and fixed-proposed text
literally with no link, button, form, handler, focus target, Markdown/HTML
interpretation, popup, navigation, storage, or network effect. Task current,
stream, proposal, action, composer, result, dispatch, follow-up, activation,
and terminal state stayed unchanged. Provider history, phone/LAN projection,
process logs, ResultCard, preload, and renderer bundles omit the raw Builder
turn/custody and both canaries where required.

The normal and compact final screenshots were visually inspected and contain
the whole actionless card with its **not applied** warning:

- `app/test-results/task232-builder-conversation/task232-builder-conversation-normal.png`
  — 3,044,897 bytes, SHA-256
  `89846c9149604139a932edb63314aa3405e22408ac70926e32d44259c9a1760c`.
- `app/test-results/task232-builder-conversation/task232-builder-conversation-compact.png`
  — 658,477 bytes, SHA-256
  `e53555b6d64e2ac27082f978f0c58b2e398329414687414c1a153cb778f8ce0b`.

### c5 - causal, compatibility and browser evidence prove the visible path: PASS

Commands and observed results:

- `core: npm.cmd run build; node --test dist/test/builder-intercom.test.js`
  — final PASS, 11/11.
- `app: npm.cmd run typecheck` — PASS.
- `app: .\node_modules\.bin\tsc.cmd -p tsconfig.unit.json --pretty false`
  followed by `node --test dist-unit/tests-unit/buildertrackedtext.test.js
  dist-unit/tests-unit/builderproposalreview.test.js
  dist-unit/tests-unit/builderproposalturn.test.js` — PASS, 26/26. A final
  targeted source/component rerun after moving one-shot spend ahead of all work
  passed 2/2; the complete suite below then covered the final source.
- `app: npm.cmd run build:lab` — PASS, 107 modules. The initial sandboxed
  invocation was denied access to the already-installed local build runtime;
  the same dependency-free command was retried with local execution approval
  and passed.
- `app: npm.cmd run build:vite` — final PASS: Main 111 modules, preload 1,
  renderer 79.
- `app: node --test
  tests-qualification/builder-proposal-bundle-dark.test.mjs` — PASS, 1/1
  against those fresh bundles.
- `app: npm.cmd run test:unit` — clean final PASS: 881 tests, 879 passed, 0
  failed, 2 expected Windows skips, 372.8 seconds. One prior post-hardening run
  had a file-level `taskreview.test.js` child-runner failure with no failing
  assertion; that file immediately passed 4/4 alone, and the clean complete
  rerun passed. The suite emitted only the known Git global-ignore permission
  and disposable-fixture line-ending warnings.
- With zero Cairn/Electron processes and both
  `%TEMP%\cairn-app-token` and `app\.app-token` held atomically:
  `app: node .\node_modules\@playwright\test\cli.js test --config
  playwright.builderconversation.config.ts --workers=1 --reporter=line` —
  final PASS, 1/1 in 8.6 seconds. The first functional attempt correctly
  exposed the app-created `.cairn` directory as untracked in its disposable
  repository; the fixture was repaired by writing only `/.cairn/` to that
  repository's local `.git/info/exclude`, then passed. The final wrapper's
  first invocation used an unsupported PowerShell `New-Item -LiteralPath`
  parameter and stopped before creating a directory or starting the test; the
  corrected exact-path wrapper passed.

The Electron run created only fresh `%TEMP%\cairn-task232-project-*` and
`%TEMP%\cairn-task232-profile-*` directories. Unit fixtures used only
identity-recorded `app/test-results/task232-*` directories. Each owned
temporary directory was removed after its process exited and its exact
identity/containment was rechecked. Final postflight found zero Cairn/Electron
processes, zero app-token directories, and zero Task 232 OS-temporary
directories. Existing Task 228/229 temporary candidates were not changed.

### c6 - records and Git isolation are truthful: PASS

`git diff --check` passes. Before records, the main worktree contained only the
14 exact Task 232 implementation/test paths; there was no staged path. The
brief is isolated in `b173540` on base `7902306`. Every listed worktree and lane
branch remained untouched. The sandbox account initially triggered Git's
read-only dubious-ownership refusal for those owner-created worktrees; each was
then inspected cleanly with a command-scoped `safe.directory` value and no Git
configuration change. This report and exactly one LOG row are the only record
changes. The final exact-path cached manifest, cached whitespace check, real
diff, status, and worktree state are inspected immediately before the one local
completion commit. Nothing is pushed.

## How to try it

This evidence route deliberately has no normal product entrance. To reproduce
the safe visible proof, first close Cairn and Electron and confirm both app
tokens are absent. Then, while holding the two exact token directories for the
run, execute from `app`:

```text
node .\node_modules\@playwright\test\cli.js test --config playwright.builderconversation.config.ts --workers=1 --reporter=line
```

The spec creates its own fixed disposable Git project and profile, opens real
Chat, appends once, closes, relaunches cold, verifies the same one inert card,
and removes only its positively owned temporary directories after process
exit. It never selects the Cairn repository or another owner project.

## Limits and next separately approved step

The only Builder response is fixed synthetic data from the injected fake. This
task proves selection, identity, transport plumbing, authenticated display,
and cold restoration; it does not prove model quality, provider behavior, live
cost accounting, or proposal applicability. Task 223's worker/verifier STOP,
Task 225's live-file application STOP, and Task 228's Git durability STOP all
remain in force.

The next step requires a separate owner decision immediately before any real
call: choose the exact provider and model, the exact disposable target project
and selected tracked files/data scope, the official credential route, and a
cost or quota limit. A new task may then replace only the injected fake with a
tool-free proposal-only provider transport while retaining this selector and
Task 231 display boundary. That approval would not authorize applying,
executing, verifying, dispatching, publishing, or activating the proposal.

**Disposition: DONE.**
