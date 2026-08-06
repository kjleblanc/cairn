# Task 190 report — connection-first model selection plan

**Lane:** C

**Base commit:** `18a7a6e968e919783e824a7b44c1eb5daf6388bb`

**Brief commit:** `d35bb21`

**Milestone moved:** NO

## Outcome

Cairn now has a durable proposed product design and an implementation-ready,
serial plan for connection-first model selection. This task changed no running
product behavior.

The ordinary owner journey is two role cards — **Cairn** and **Builder** — plus
a provider connection. Models stay behind **Advanced model choice**. A
connection may fill only an empty compatible role after the applicable owner
grants; detection alone never assigns an installed agent. Auto is deterministic,
sticky inside one connection, and resolves an exact route before data or work
leaves the app.

The design separates five things the current static picker conflates:

- provider/account connection and secret custody;
- authenticated account model catalog;
- active Cairn and Builder assignments;
- conductor transport versus trusted coding-agent runtime; and
- the exact project-scoped route recorded for a call or dispatch.

The plan contains 23 separately claimable Task/Slice headings. It starts with a
transport seam and a no-follow inference-redirect repair, then adds strict
types, project identity, lossless migration/recovery, catalogs and sticky Auto,
route receipts, the first visible OpenRouter flow, exact Builder routing, gated
subscription/runtime spikes, native API connectors, and read-only release
verification. Every visible connector has its own fake-only checks, stop rule,
and supported-target package gate.

This is deliberately a proposal, not a silent product decision. Current
shipped behavior, the connected-conductor contract, and Kimi Decision 6 remain
authoritative until the owner approves the three-decision card and matching
behavior lands.

## What changed

- `docs/ai-work/tasks/190-brief.md` claimed the task in clean Lane C and fixed
  its planning, provider-policy, secret, consent, history, and protected-work
  boundaries.
- `docs/superpowers/specs/2026-08-06-cairn-model-connections-design.md` records
  the proposed owner journey, decisions, durable types, trust/custody model,
  provider capability matrix, migration/recovery behavior, consent alignment,
  and proposed supersession ledger.
- `docs/superpowers/plans/2026-08-06-cairn-model-connections.md` maps the design
  to 23 serial future tasks/slices with exact paths, red-first cases, risk
  pauses, compatibility rules, verification commands, package gates, and stop
  conditions.
- This report and the Task 190 `docs/ai-work/LOG.md` row are the closeout
  memory.

No application, Core, CLI, adapter, runtime, schema, prompt, test, dependency,
credential, provider configuration, contract, project fact, or milestone file
changed. No provider login, metadata request, model call, worker dispatch,
install, push, publish, deployment, or external write occurred.

## Source and policy grounding

The plan was checked against the shipped source rather than an imagined
architecture. The current evidence includes the static `BODIES` catalog,
single safeStorage-backed `conductor.json`, OpenAI-compatible
`chat/completions` client, Core `overrideAdapterId` seam, fixed Kimi model, and
separate executable discovery/spawn paths. The new plan names those current
files and preserves working behavior until each explicit cutover.

Current primary provider documentation was checked for OpenAI Models/Responses
and Codex app-server, GitHub Copilot OAuth/SDK/models, Anthropic API and
third-party-login policy, Gemini Developer API, Antigravity, Kimi CLI/ACP, and
OpenRouter account models/routing/BYOK. The artifacts link the exact official
pages beside each claim. Provider facts are intentionally rechecked again in
the connector task that would ship them.

The support ledger is conservative:

- native OpenRouter, OpenAI, Anthropic, Gemini Developer API, Kimi Code, and
  compatible/local API routes are Cairn-only unless a trusted worker runtime
  exists;
- existing Codex and Kimi workers remain separately linked, pinned runtimes;
- dedicated Codex, GitHub Copilot, and Antigravity capabilities remain gated
  by explicit go/no-go spikes;
- Claude consumer login stays absent under current product-builder guidance;
  and
- Gemini Developer API is key-only in this plan; OAuth, Vertex, and consumer
  subscription access require separate supported designs.

## Review and correction record

Three independent read-only reviewers challenged the artifacts from conductor
product/consent, worker/runtime, and records/migration perspectives. No
reviewer edited the files.

Their concrete findings produced several correction rounds. The final records:

- make owner approval and proposed supersession explicit;
- separate link/metadata permission from project-scoped Cairn permission;
- key grants, bindings, selections, receipts, and same-number conversations by
  a main-owned ProjectAuthorityId;
- persist full conversation route continuity and compare only a canonical
  stable route-authority digest at Builder run time;
- redeem a one-task selection into one immutable pending preview without
  consuming its own authority;
- bind the exact absolute worker executable from detection through spawn,
  without a second PATH lookup;
- give migrated exact routes complete grant custody without duplicating the
  legacy ciphertext, while forcing new project/billing/model authority through
  explicit renewal;
- delete legacy credentials before state an old binary could ignore, and
  delete all Cairn-owned credential homes before cache/authority during corrupt
  recovery;
- keep Kimi's new classification pending until membership billing receives new
  grant, billing, capability, assignment, and binding revisions;
- forbid inference redirects from replaying credentials or project bodies;
- distinguish OpenRouter access, model author, serving provider, BYOK/shared
  capacity, and billing truth;
- keep Kimi API/CLI and ambient/dedicated Codex identities separate;
- narrow Gemini v1 to the API-key surface actually planned; and
- give every visible connector an exact supported-target package gate and
  fail-closed stop condition.

Against the final fixed hashes — design
`443FD778358D2CC74E32C54B74BD9CD586EC8CBAA65802AFF7EF21B678AC8555`
and plan
`0F1F0497960204C1104D84061CAAF4FFCCEF96B4F45B6754450CEDF794577071`
— the records and conductor reviewers independently returned **NO BLOCKERS**.

## Checks run and real results

1. Current-source seam inspection
   - `rg -n "BODIES|overrideAdapterId|kimi-for-coding|gpt-5\.2-codex|conductor\.json|safeStorage|chat/completions|findExecutable" app/src core/src`
   - Passed as grounding evidence: it located the current static body catalog,
     Core override seam, fixed Kimi model, safeStorage credential file, and
     compatible chat-completions client the plan names.
2. Structural plan checker
   - Passed: **23** serial headings, **73** unique declared Create paths, zero
     duplicate Create paths, zero unresolved Modify paths after applying prior
     planned creates, **22** explicit Verify headings plus Task 17's decisive
     matrix, **23** Stop gates, **13** package-command/gate references, and zero
     wildcard file paths.
3. Supersession-ledger comparison
   - Passed: the design and plan contain the same nine rows; existing history
     is preserved and every disposition remains proposed until approval and
     matching behavior.
4. Independent reviews
   - Passed: all concrete findings were corrected; two independent final
     rereads of the fixed hashes reported no remaining blocker.
5. Untracked-file whitespace check
   - `git diff --no-index --check -- NUL <artifact>` for each design/plan file
   - Passed with no whitespace diagnostics. Exit 1 is expected from
     `--no-index` because each new file differs from NUL.
6. `git diff --check`, exact staged diff inspection, and final Lane C status
   - Passed on the complete Task 190 closeout set. Only the two artifacts, this
     report, and the one LOG row joined the already committed brief.

No application test or Electron run was needed to verify a planning-only
outcome. Running unchanged product tests would not prove the design record;
each future implementation slice names its executable fake-only checks.

## How to try it

1. Read the design's **Product decisions** section. It asks for exactly three
   owner choices: fill only empty compatible roles after explicit connection
   and grants; use one persistent Builder plus an expiring one-task selection;
   and use connection-scoped sticky Auto under a reviewed policy.
2. Read the plan's **Owner-visible finish line**, **Provider support ledger**,
   and **Serial tasks** sections.
3. Approve those three choices as written, or name the one to revise. Until
   then, do not execute Task 1/Slice 1B or treat the proposed supersession ledger
   as current authority.
4. After this Lane C task lands and main settles, claim the next free task for
   Task 1's zero-behavior transport seam.

## Limitations and remaining judgment

- The design is not implemented. Cairn still has the current static picker,
  one conductor slot, and current worker routing behavior.
- “All modern models” means the models the authenticated connection reports
  and the relevant transport/runtime can honestly support. It is not a global
  hard-coded list and does not guarantee capacity.
- Provider-supported subscription access is not interchangeable with consumer
  credentials. Gated routes remain absent until their provider, isolation,
  billing, packaging, containment, and removal proofs pass.
- Auto's first exact-ID/price-band policies remain later owner decisions within
  the approved connection-scoped rule; this task does not silently choose
  models or budgets.
- The owner still decides whether the two role cards and three recommended
  decisions are the right product feel. That decision is the safe next step,
  not an implementation guess.

**Disposition: DONE**
