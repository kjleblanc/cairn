# Cairn maintainer instructions

These content standards apply to Cairn's public framework. The project contract
in `AGENTS.md` governs the work itself.

## Product promise

Cairn is for complete beginners. It helps one person move one project through
one task to one honest result, in plain language, with safety pauses only at
real risk.

The active product path is:

`project -> task -> route -> run -> check -> result`

## Versioning

The app and the contract share one version number (currently 0.0.1), declared
in:

- `CONTRACT-TEMPLATE.md` — the "Cairn Contract vX.Y.Z" line;
- `app/package.json`, `core/package.json`, `cli/package.json`.

Bump the patch number for fixes and doc corrections, the minor number for new
capability. Bump every declaration together and add a changelog entry.
Pre-reset "Contract vN.N" numbers are a retired scheme; see
`docs/legacy/README.md`.

Git tags matching `v*` trigger the release workflow, which builds installers
and uploads them to a draft GitHub release. Tag `v*` only to cut a release.

## Canonical public files

- `README.md` — front door: what Cairn is, setup, launch, glossary;
- `CONTRACT-TEMPLATE.md` — portable project contract with empty project facts;
- `PROJECT-KICKOFF.md` — setup for an empty folder;
- `PROJECT-CONVERSION.md` — preservation-first setup for existing work;
- `EVERYDAY-WORKFLOW.md` — the normal workflow, risk approvals, provider
  access, and expert boundaries;
- `cairn.html` — self-contained browser companion and contract download; and
- `CHANGELOG.md` — plain-language version history from 0.0.1 onward.

Contract mirrors:

- `AGENTS.md` — this repository's live contract: the template text with
  Cairn's project facts filled in;
- `core/assets/contract.md` — generated from the template by
  `core/scripts/sync-contract.mjs` during the core build;
- `app/resources/contract.md` — generated from the core asset by
  `app/scripts/copy-assets.mjs` before app start and build; and
- the `src-contract` block in `cairn.html` — maintained by hand; keep it
  byte-identical to the template.

`docs/legacy/` is the non-canonical tier: pre-reset docs, records, and history,
preserved unmodified. The pre-reset repository state is pinned at git tag
`legacy-v3.0`.

## Writing rules

1. Lead with the beginner's next visible action.
2. Use plain language and define unfamiliar terms once, in README's glossary.
3. Keep one name per active concept: project contract, task brief, report,
   owner, route, DONE, STOPPED, milestone.
4. Describe what Cairn does; history belongs in the changelog and the legacy
   archive.
5. Describe task records as memory. Reviews are optional advice and never
   reopen a completed task.
6. Preserve existing tracked, modified, staged, and untracked work.
7. Keep real safety boundaries explicit: secrets, valuable data, credentials,
   permissions, paid calls, external writes, deployment, production,
   destructive actions, and missing qualified expertise.
8. Do not imply that the offline demonstration adapter is a model or that a
   lifecycle demonstration implemented the requested product change.
9. Keep the browser companion self-contained: no CDN, analytics, or automatic
   network requests.
10. Canonical docs describe every user's repository: never cite machine-local,
    gitignored, or build-output paths as instructions.

## Contract changes

When the contract meaning changes:

1. update `CONTRACT-TEMPLATE.md` first;
2. update `AGENTS.md` without changing its project facts;
3. update the public guides and the `cairn.html` embed;
4. rebuild core so both generated contract assets regenerate;
5. bump the shared version and add a changelog entry; and
6. verify mirror equality (template ↔ core asset ↔ cairn.html embed), the
   actual diff, and Git status.

Use the smallest control that addresses a real risk.
