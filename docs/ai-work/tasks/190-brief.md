# Task 190 brief - connection-first model selection plan

**Lane:** C

**Base commit:** `18a7a6e968e919783e824a7b44c1eb5daf6388bb`

## Requested visible outcome

Record a superseding product design and an implementation-ready, serial plan
that make model selection in Cairn connection-first and close to one click for
complete beginners:

- an owner can connect a supported account by provider-owned subscription
  sign-in or by API credential, without pasting a secret into Cairn's chat;
- Cairn can discover the modern models that connection actually permits,
  instead of relying on a small hard-coded picker;
- the owner can assign one connection to Cairn and one to the Builder, with an
  honest **Auto** default and an optional exact model choice;
- Auto never silently crosses providers, accounts, billing sources, or roles;
- every conversation turn and every worker dispatch records the exact resolved
  provider, connection, model, billing basis, and authentication revision; and
- API model access is not presented as a coding worker unless a trusted agent
  runtime supplies the worker protocol Cairn requires.

The durable design will be written at
`docs/superpowers/specs/2026-08-06-cairn-model-connections-design.md`. The
implementation sequence will be written at
`docs/superpowers/plans/2026-08-06-cairn-model-connections.md`.

## Boundary of intent - what must not change

- **Planning only.** No application, Core, CLI, runtime, schema, prompt, test,
  dependency, credential, or provider configuration changes in this task.
- **No external action.** No sign-in, OAuth registration, secret access, model
  call, paid call, data-bearing provider request, install, publish, push, or
  deployment is authorized or needed.
- **Current safety contract remains live.** The connected-conductor consent,
  selected-file limits, per-dispatch approval, paid-call disclosure, risk
  pauses, serial envelope, and envelope-authored result card remain unchanged.
  A later implementation task may amend the contract only when matching
  behavior lands with owner approval.
- **Connection-first, not catalog-first.** The plan may use provider catalogs,
  but must never imply that seeing a model name proves the current account can
  use it. Availability comes from the authenticated connection and its
  capabilities.
- **Provider-owned authorization only.** The plan must not piggyback another
  product's consumer credentials or promise subscription access that its owner
  does not expose for third-party use. Unsupported subscription routes remain
  absent or visibly gated.
- **No secret in renderer state, logs, records, tests, or chat.** Credentials
  stay in the main process and operating-system credential storage; persisted
  records contain identifiers and redacted metadata only.
- **History stays history.** Existing Phase 4, second-body, Kimi, and worker
  chooser documents are preserved. The new design names exactly which old
  decisions it supersedes or defers rather than rewriting them.
- **Protected work stays untouched.** Main's Task 182/183 paths, Lane B's Task
  180 commits, and Lane E's uncommitted Task 189 paths are not read into this
  task's commits or changed. Lane C contains only Task 190 work after its clean
  fast-forward.

## Plan for this planning task (AI decisions)

1. Reconfirm the current static catalog, conductor credential slot and client,
   worker-routing seam, adapter registry, dispatch override path, IPC boundary,
   and model-specific assumptions in the current source.
2. Reconcile current official provider rules and supported first-party
   integration surfaces for API keys, ChatGPT/Codex, GitHub Copilot, Claude,
   and Gemini. Record uncertain or experimental surfaces as gates, not
   promises.
3. Specify the smallest durable connection, catalog, role-assignment, and
   resolved-route types; secret custody; authenticated catalog refresh;
   deterministic Auto rules; legacy migration; offline/cache behavior; and
   per-turn/per-dispatch attribution.
4. Write serial vertical slices that preserve a working Cairn after each task:
   transport seam, multi-connection storage, catalog/Auto resolution, first
   visible API route, worker override wiring, subscription connectors, native
   provider drivers, and final hardening/contract alignment.
5. Give every slice exact current files, red-first tests, compatibility rules,
   approval boundaries, rollback behavior, and decisive verification commands.
6. Ask independent reviewers to challenge product simplicity, provider-policy
   accuracy, trust/custody, migrations, worker semantics, sequencing, and test
   sufficiency. Correct every concrete finding before closeout.

## Checks that will show the outcome holds

1. The design defines one simple owner journey and a capability matrix that
   distinguishes API access, supported subscription access, conductor use,
   worker use, catalog discovery, billing truth, and gated/unsupported routes.
2. The data model supports multiple saved connections but exactly one active
   Cairn assignment; Auto is scoped to one connection and resolves to an exact
   route before any paid or data-bearing call.
3. The plan maps every implementation slice to observed current files and
   executable fake-only tests, including legacy migration, revoked/expired
   credentials, catalog outages, removed models, role incompatibility, stale
   caches, tampered renderer input, and dispatch-time revalidation.
4. Provider-policy claims link to current official primary documentation.
   Experimental surfaces have explicit go/no-go spikes and fail-closed exits.
5. The plan preserves the existing consent and risk boundaries, identifies the
   exact later contract amendment, and never turns a raw chat model into a
   worker by label alone.
6. At least two independent reviews report no remaining concrete blocker after
   corrections. `git diff --check` is clean, and final Lane C status contains
   only the disclosed Task 190 design, plan, brief, report, and LOG row.

## DONE and STOPPED

- **DONE:** the superseding design and serial implementation plan are
  source-grounded, provider-policy-grounded, independently reviewed, recorded
  with one report and one log row, and committed in Lane C without product or
  external changes.
- **STOPPED:** a required route depends on an unsupported provider policy, an
  unmade owner product decision, an unproven trust boundary, or work that
  cannot be isolated from protected paths. The record names the smallest
  decision or spike needed next.
