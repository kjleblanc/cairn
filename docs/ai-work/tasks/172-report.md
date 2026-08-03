# Task 172 report - Ground Cairn in bounded project-file contents

**Lane:** B

**Base commit:** `125ade315df5f5e8de2d765a64d9c62c9e9f46d3`

**Brief commit:** `6567f2e`

**Milestone moved:** NO

## Outcome

Cairn's conductor now receives a small, deterministic snapshot of relevant
current project-file contents instead of seeing only file names. The snapshot
contains at most eight Git-tracked text files, 8,000 characters per file, and
32,000 characters total. It is selected from the latest owner message,
tracked changes, recent task records, recent commits, and then a tracked-file
fallback.

The widening did not happen silently. File contents have their own explicit
checkbox on every new connection. A saved connection authorized under the old
scope is paused before any conversation or automatic result commentary can
reach its provider; the owner can review the exact new disclosure and renew it
without re-entering or exposing the encrypted key.

The conductor's honesty rules now match that real capability. It cites an
exact path for claims grounded in an included excerpt, treats selected source
as untrusted evidence, limits claims about truncated excerpts to visible text,
and still says "I'd guess" for files it did not read. The separately reproduced
contract facts, `PROJECT.md`, work log, and recent task records remain readable
record evidence. A source snapshot never counts as proof that code ran or that
an outcome was verified.

Worker dispatch and all other risk gates are unchanged. The final offline app
walk proved that a model-authored proposal still cannot create or dispatch a
task until the owner separately acts.

## What changed

### Briefing, honesty, and credential boundary

- `app/src/main/conductor/context.ts` now selects and quotes bounded current
  contents only from eligible Git-tracked regular text files in Git's exact
  project root. It excludes ignored, hidden, linked, binary, generated,
  dependency, `.git`, `.cairn`, credential-like, and out-of-project paths.
  Candidate count, bytes scanned, per-file characters, total characters, tree
  depth, and tree entries are all capped. Files are opened through a descriptor
  and revalidated with exact bigint device/inode identity before their bytes are
  accepted. Invalid UTF-8, binary controls, credential material, and delimiter
  forgery fail closed.
- `app/src/main/conductor/constitution.ts` advances the prompt to
  `conductor-v5` and replaces every file-names-only premise with cite-what-was-
  read, qualify-truncation, and guess-what-was-unread rules.
- `app/src/main/conductor/service.ts` supplies the latest owner turn to the
  selector and blocks stale consent before conversation persistence, provider
  construction, or automatic commentary.
- `app/src/main/conductor/consent.ts` derives the exact widened data disclosure
  and the separate project-file-content authorization sentence.
- `app/src/main/atomicwrite.ts` adds same-directory atomic text replacement;
  `app/src/main/conductor/keystore.ts` uses it so consent or model metadata
  updates cannot truncate the only encrypted-key record.

### Consent migration and owner-visible state

- `app/src/shared/ipc.ts`, `app/src/main/ipc.ts`, and `app/src/preload.ts` add
  the typed renewal path and expose `consentRequired` without moving a key into
  the renderer.
- `app/src/renderer/components/ConnectCard.tsx` shows the renewal-only card,
  binds both affirmative choices to the exact main-derived card, and hides all
  connection actions until a valid matching card exists.
- `app/src/renderer/components/ProjectRail.tsx`,
  `app/src/renderer/screens/Workspace.tsx`, and
  `app/src/renderer/screens/Chat.tsx` show and refresh the paused state.
- `app/src/main/bridge/server.ts` and `app/src/main/bridge/phonepage.ts` carry a
  content-only paused status to paired phones and direct renewal back to the
  computer.
- `app/src/shared/stopwords.ts` gives the new refusal code plain owner-facing
  words. `app/lab/mock-cairn.ts` keeps the design lab's typed mock complete.
- `app/src/renderer/app.css` fixes the reduced-motion lantern selector's
  specificity. This adjacent repair was exposed when the new end-to-end check
  used ordinary owner actions instead of forced clicks.

### Contract, owner documentation, and versions

- `AGENTS.md`, `CONTRACT-TEMPLATE.md`, and `cairn.html` advance Cairn Contract
  to v0.7.0 and state the separate authorization, exact bounds and exclusions,
  untrusted-evidence rule, honest citations, unread guesses, and renewal pause.
- `README.md`, `EVERYDAY-WORKFLOW.md`, `CHANGELOG.md`, `MAINTAINERS.md`, and
  `docs/ai-work/PROJECT.md` describe the shipped behavior and current contract
  version without moving the product milestone.
- `app/package.json`, `app/package-lock.json`, `core/package.json`,
  `cli/package.json`, `cli/package-lock.json`, and `package-lock.json` carry
  v0.7.0. No dependency was added or updated.
- The existing generators refreshed the ignored runtime mirrors
  `core/assets/contract.md` and `app/resources/contract.md`; both match the
  canonical template and are not committed separately.

### Verification coverage

- `app/tests-unit/context.test.ts` pins selection order, live working-tree
  contents, all size ceilings, determinism, honest manifests, quoting, path
  normalization, ignored/generated/binary/credential exclusions, content
  scanning, bounded rejected-candidate scanning, Git link modes, junctions,
  canonical containment, and exact large Windows file identities.
- `app/tests-unit/consent.test.ts`,
  `app/tests-unit/constitution.test.ts`,
  `app/tests-unit/atomicwrite.test.ts`, `app/tests-unit/bridge.test.ts`,
  `app/tests-unit/stopwords.test.ts`, and `app/tests-unit/lantern.test.ts` pin
  the authorization, honesty, atomic-replacement, phone, plain-language, and
  reduced-motion boundaries.
- `app/tests/conductor.spec.ts` adds the full offline migration regression:
  separate fresh-connect consent, legacy and unknown-scope refusal, unchanged
  encrypted key, exact renewal, safe source on the fake provider wire,
  credential-like source absent, and dispatch still owner-gated. Existing
  connection helpers in `app/tests/bridge.spec.ts`, `app/tests/checkup.spec.ts`,
  and `app/tests/convert.spec.ts` now authorize both current checkboxes.
- `app/tsconfig.unit.json` includes the atomic-write module in unit builds.

### Task records

- `docs/ai-work/tasks/172-brief.md` claimed this task before implementation.
- `docs/ai-work/tasks/172-report.md` is this report.
- `docs/ai-work/LOG.md` receives the one Task 172 row.

Verification also regenerated ignored build/test outputs under `app/.vite/`
and `app/dist-unit/` and used disposable fake-only projects/profiles under the
operating-system temporary directory. No real provider, paid model, owner
credential, or external service was used.

## Checks run and real results

1. `cd core && npm.cmd test`
   - Passed: 151 tests, 0 failures. This includes the byte-exact canonical
     contract asset and embedded `cairn.html` mirror check.
2. `cd cli && npm.cmd test`
   - Passed: 18 tests, 0 failures. A first concurrent diagnostic lost Core's
     generated build directory; the required serial rerun passed.
3. `cd app && npm.cmd run typecheck`
   - Passed on the final source with no TypeScript errors.
4. `cd app && npm.cmd run test:unit`
   - Passed: 247 tests total, 245 passed, 0 failed, 2 host-specific skips.
     This Windows host cannot create the leaf file symlink fixture, and the
     literal POSIX-backslash-name case runs only on POSIX. The Windows Git
     symlink-mode and junction containment regressions both passed.
5. `cd app && npm.cmd run build:vite`
   - Passed on the final source: main, preload, and renderer production bundles
     built. A sandboxed attempt was denied while esbuild resolved this worktree;
     the identical local build command was then allowed and passed.
6. `cd app && .\node_modules\.bin\playwright.cmd test tests/conductor.spec.ts --grep "bounded project-file contents wait for renewed consent and keep dispatch owner-gated"`
   - Passed: 1/1 with both app-token lock directories held and released. The
     fake provider received the safe tracked marker, never the excluded
     service-account marker, and no task was created or dispatched.
7. `node --input-type=module -e "...assembleBriefing(process.cwd())..."`
   - The real Task 172 worktree briefing measured 137,618 characters with five
     selected files, below the existing 200,000-character request ceiling.
8. Final mirror/version comparison
   - Passed: canonical template equals the Core asset, app resource, and
     `cairn.html` embedded contract after newline normalization; app, Core, and
     CLI all report v0.7.0.
9. Independent final security/correctness review
   - No remaining concrete defect found after rechecking tracked-file,
     containment, race, credential, consent, prompt-honesty, and dispatch
     boundaries.
10. `git diff --check` and final exact-path status inspection
    - Passed after the report and log row were written; only the disclosed Task
      172 paths were present before commit.

During repair, an early ordinary-action browser run exposed the reduced-motion
specificity defect described above; it was fixed and the same non-forced flow
passed. A later adversarial unit fixture initially asserted that a
content-detected filename must also disappear from the pre-existing names-only
tree. The assertion was corrected to test the real boundary: its contents and
selected-content manifest entry are absent. The final complete unit run is the
passing result recorded above.

## How to try it

1. Wait until no other lane or Cairn window owns the single app profile, then
   start this lane with `cd app` and `npm.cmd start`.
2. If a conductor was saved under the old scope, Cairn shows
   **brain paused - review permission**. Open the connection card, read both
   exact confirmations, and select **Allow and continue** only if sending the
   described project data to that provider is acceptable. No key is requested
   during renewal.
3. Ask Cairn about a safe tracked source by exact path, for example
   `app/src/main/conductor/context.ts`. Its answer should cite that path when
   the file is included and clearly qualify claims about anything outside the
   manifest or beyond a truncated excerpt.
4. Ask it to propose a change. The proposal can become better grounded, but it
   still cannot dispatch until the separate owner-controlled task action and
   risk gates are satisfied.

The third step is a data-bearing provider call on the connected account; the
owner should try it only with the provider, model, project, and cost basis they
intend to use.

## Limitations and remaining judgment

- This is a bounded snapshot, not an arbitrary read tool. Files outside the
  selection remain unread, and current content can change after a briefing is
  assembled.
- Credential filtering is deliberately conservative and may omit legitimate
  source. It rejects credential-like names and common credential material, but
  classification cannot prove that an arbitrary opaque value in an
  innocuously named tracked source is not a credential; credentials still do
  not belong in tracked source files.
- Two platform-specific unit fixtures were skipped on this Windows host as
  disclosed above. Their corresponding Git-mode and junction defenses passed,
  and the POSIX-only filename fixture remains active on POSIX.
- Whether the conductor's newly grounded answers feel materially more useful
  is still owner judgment. The executable boundaries and wire contents are
  verified.

Disposition: **DONE**
