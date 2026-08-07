# Task 201 report - main-only model connection authority and lossless migration

**Lane:** E

**Base commit:** `4dcdc7333afc432839b85d70c6c2822992ae808a`

**Brief commit:** `8df3390dd7e19ce8d1d51c695c6c20b4db8c1da0`

**Milestone moved:** NO

## Outcome

Cairn now has one strict main-process `cairn-model-connections/v1` authority
beside the existing `conductor.json`. A valid existing connection migrates to
one project-bound, pinned compatibility assignment without credential re-entry:
the encrypted credential remains only in `conductor.json`, while the new store
holds its expected ciphertext digest and file reference. The endpoint, exact
model, billing-unknown state, authentication evidence, and current authorized
data scope remain unchanged.

Fresh pasted-key and OAuth connections use the same authority model with one
OS-encrypted inline credential, serialized expected-revision mutations, and a
new random authentication revision. A random project authority is resolved in
main from the canonical root and filesystem identity; renderer paths, project
IDs, conversation numbers, and route claims cannot select or cross that
authority.

Malformed, unknown-version, truncated, mismatched, moved, partially forgotten,
or partially erased state fails closed. It blocks calls and ordinary mutation
and exposes only the minimal **Erase Cairn model connections** recovery card.
That exact-file action requires the existing destructive-risk confirmation,
supports cancel, performs secret-first/cache-second/authority-last cleanup, and
keeps partial failure recovery-required without exposing a credential.

The current OpenRouter/custom compatible route, connection consent, payload,
stream event order, cancellation, OAuth callback, provider-visible behavior,
and exact pinned model are preserved. No normal connection hub, catalog, Auto
resolver, model picker, role assignment, route receipt, provider request, or
worker routing change was added.

## What changed

- `docs/ai-work/tasks/201-brief.md` claimed Task 201 from landed main before
  implementation.
- `app/src/main/connections/store.ts` adds the bounded exact v1 authority
  parser, canonical serialization, serialized expected-revision mutation,
  atomic replacement, strict readback, and fail-closed recovery outcomes.
- `app/src/main/connections/secrets.ts` parses legacy custody before decrypting,
  bounds inline OS-encrypted credentials, verifies legacy ciphertext by digest,
  and implements verified secret deletion and the legacy recovery marker.
- `app/src/main/connections/project-authority.ts` creates and verifies random
  project authority IDs bound to canonical-root and filesystem-identity
  digests, including moved, replaced, ambiguous, and unavailable outcomes.
- `app/src/main/connections/migrate.ts` materializes the narrow legacy-pinned
  assignment and grants, handles fresh/reconnected authority, rejects stale
  mutations, and implements Forget and recovery ordering with deterministic
  failpoints.
- `app/src/main/conductor/keystore.ts` makes the new authority the main-owned
  connection source while retaining one compatible legacy credential location,
  the current consent surface, OAuth lifecycle, and redacted status behavior.
- `app/src/main/conductor/service.ts` pins selected-project authority in main,
  revalidates it before credential use, preserves the injected transport seam,
  and fails closed when connection or project authority changes.
- `app/src/shared/ipc.ts`, `app/src/preload.ts`, and `app/src/main/ipc.ts` add
  only the redacted recovery status and exact recovery approval/cancel action;
  no secret, raw path authority, provider object, or selectable route crosses
  IPC.
- `app/src/renderer/components/ConnectCard.tsx` and
  `app/src/renderer/app.css` add only the minimal exact-file recovery card and
  its existing-paper presentation. The ordinary connection UI remains the
  current single pinned conductor surface.
- `app/src/renderer/screens/Chat.tsx` immediately refreshes redacted connection
  status after a refused send or terminal stream failure so newly detected
  corruption shows recovery without an app reload. This was the smallest
  adjacent repair needed for the required visible recovery outcome.
- `app/tests-unit/model-connections-store.test.ts`,
  `app/tests-unit/model-connections-migrate.test.ts`, and
  `app/tests-unit/project-authority.test.ts` cover exact parsing, bounds,
  readback, stale revisions, migration, project isolation, reconnect, Forget,
  destructive ordering, failpoints, recovery, and secret-free outcomes with
  inert temporary files and fake canaries only.
- `app/tests-unit/conductor-transport.test.ts` mechanically follows Task 196's
  renamed internal event-directory variable while retaining the same transport
  seam source-shape assertion.
- `app/tests/fixtures/conductor-connection.ts` hard-gates fixture use to
  `CAIRN_E2E` plus an isolated test profile and detaches/restores
  `conductor.json`, `model-connections.json`, and `model-catalogs.json`
  together.
- `app/tests/conductor.spec.ts` adds fake-only migration, project-binding,
  corruption, exact recovery approval/cancel/tamper/replay, and OAuth race
  coverage. It also updates inherited current-main action selectors/expectations
  and makes load-sensitive existing journeys deterministic without removing
  their behavioral assertions.
- `app/tsconfig.unit.json` includes the new connection modules and tests in the
  existing isolated unit compilation.
- `docs/ai-work/tasks/201-report.md` is this report.
- `docs/ai-work/LOG.md` receives the append-only Task 201 row.

No dependency, lockfile, package, real profile, real credential, provider
account, metadata request, model call, external service, push, publication,
deployment, production system, or production data changed.

## AI decisions and review record

- The store owns its verified-readback transaction locally; the existing
  general atomic-write helper did not need to change.
- A migrated credential is never copied into the new authority. Its legacy
  file reference and ciphertext digest are evidence; decryption happens only
  after exact parse, project revalidation, digest verification, and bounds.
- Fresh credentials use one inline OS-encrypted blob. An inline connection and
  residual legacy credential cannot both become active.
- The legacy bridge grants only the current project's exact pinned route and
  exact old data scope. Its metadata scope is empty, billing stays unknown,
  and model changing remains refused until a later reviewed connection task.
- Store mutation, OAuth completion, reconnect, assignment, Forget, and recovery
  use serialized revision/generation guards so a stale completion cannot
  recreate or overwrite newer custody.
- Verified credential deletion is the first irreversible boundary. A recovery
  marker prevents restart or an older reader from reviving a credential after
  that boundary; cache and authority are removed only afterward.
- Three independent read-only reviews examined project/path binding, store and
  secret custody, OAuth generations, destructive ordering, diff scope, and the
  final test-harness repairs. No concrete implementation blocker remained.
- Full-suite load exposed inherited timing assumptions rather than product
  failures: one test could observe "Stop absent" before a reply started, one
  relied on a fixed slow-stream window, and one waited for navigation after an
  in-app action. Each repair adds a positive held/start observation or disables
  only Playwright's navigation waiter; all original result, ID, queue, Git, and
  recovery assertions remain. Failure paths now close Electron in `finally`.
  Current-main label/action drift and one long remount timeout were likewise
  repaired without weakening coverage.

## Checks run and real results

All output was observed in Lane E's task terminal and was not saved into the
repository.

1. Exact unit command from `app`: `npm.cmd run test:unit`.
   - Final result: **558 total, 556 passed, 0 failed, 2 Windows host-specific
     skips**.
2. Exact type command from `app`: `npm.cmd run typecheck`.
   - Passed with no TypeScript errors.
3. Exact build command from `app`: `npm.cmd run build:vite`.
   - The first final invocation was denied before config load by the workspace
     sandbox's parent-directory read boundary. The identical local command was
     rerun with filesystem access allowed and passed: main, preload, and
     renderer bundles built. Only Vite's existing CJS API deprecation warnings
     appeared.
4. Exact app-token command from `app`: `npx.cmd playwright test
   tests/conductor.spec.ts --workers=1`.
   - Final result: **52 passed, 0 failed** in 13.9 minutes under Lane E's paired
     app/global locks and isolated fake profile. Both locks were removed and no
     Cairn/Electron process remained afterward.
   - Focused repair proofs also passed: the targeted-risk case **1/1**, the
     reply-queue case **1/1**, and the final refused-push/stopped-run/follow-up
     tail **3/3**.
   - Earlier full attempts stopped honestly on current harness defects after
     34, 44, and 49 passing cases respectively; another earlier long remount
     journey exceeded its generic timeout. The deterministic repairs described
     above were applied, focused, reviewed, and then included in the final
     all-green exact run.
5. `git diff --check`, complete exact-path diff inspection, staged diff
   inspection, and final status inspection:
   - Passed. Only the files disclosed above, this report, and the append-only
     LOG row belong to Task 201. Generated Vite output, screenshots, isolated
     profiles, fake project files, and app-token directories are not tracked.

Every executable check was local and fake-only. The Electron fixture was
hard-gated to its isolated profile and all three connection files; no real
provider login, credential, profile, network provider, metadata request, or
model call was used.

## How to try it

The decisive safe checks are:

```powershell
cd "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\.lanes\e\app"
npm.cmd run test:unit
npm.cmd run typecheck
npm.cmd run build:vite
npx.cmd playwright test tests/conductor.spec.ts --workers=1
```

Run the Electron command only while the Cairn app is closed and while holding
the project's app-token protocol. The fixture creates a temporary profile and
uses only local fake HTTP servers; manually editing or erasing a real Cairn
profile is neither needed nor authorized.

## Limitations

This task deliberately preserves one exact pinned conductor. It does not yet
make model switching or picking easier on screen. Task 4 still owns provider
catalog drivers, cache, and reviewed/versioned conversation-sticky Auto; later
tasks own route receipts, the visible connection hub, role assignments,
Builder defaults/one-task overrides, and worker-route materialization.

The referenced legacy `conductor.json` remains the one rollback-compatible
credential location until Forget verifies its deletion. A moved, replaced, or
unavailable project identity requires reauthorization rather than guessing.

While Task 201 was in progress, clean `main` advanced independently through
Task 203. Lane E did not absorb that protected work mid-task; it will sync the
landed main commit only after Task 201's exact-path commit and before serial
landing.

Disposition: **DONE**
