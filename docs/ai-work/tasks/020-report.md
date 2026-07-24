# Task 020 report

## What changed

1. **app/tests-unit/context.test.ts** — new test file with 3 tests:
   - "briefing carries facts, project, log, records, git, and tree"
   - "tree entries and record sizes respect caps"
   - "a briefing is deterministic for an unchanged project"

2. **app/src/main/conductor/context.ts** — new implementation:
   - `BriefingCaps` interface with `maxDepth`, `maxTreeEntries`, `maxRecordChars`
   - `DEFAULT_CAPS` constant with defaults (3, 400, 6000)
   - `assembleBriefing(root: string, caps?: BriefingCaps): string`
   - Integrates: facts, logs, task records, git history, file tree
   - File tree walker respects depth and entry limits, skips blacklisted dirs and dotfiles
   - Records clipped to `maxRecordChars` with truncation marker
   - Deterministic output for unchanged projects

3. **app/tsconfig.unit.json** — modified:
   - Added `"src/main/conductor/context.ts"` to include list

## TDD evidence

### RED (test failure)
```
error TS2307: Cannot find module '../src/main/conductor/context.js'
```

### GREEN (all tests pass)
```
✔ briefing carries facts, project, log, records, git, and tree (232.2871ms)
✔ tree entries and record sizes respect caps (223.6529ms)
✔ a briefing is deterministic for an unchanged project (301.6723ms)

ℹ tests 28
ℹ pass 28
ℹ fail 0
```

### Typecheck
```
npm run typecheck — clean, no errors
```

## How to try it

```bash
cd app
npm run test:unit          # Runs all 28 tests including the 3 new context tests
npm run typecheck          # Verifies types
```

Or directly:
```bash
npm test --workspace app   # From repo root
```

## Implementation notes

- Uses `@cairn/core` utilities: `parseFacts`, `parseLog`, `paths` (already a dependency)
- Tests spawn real git repos in temp directories (safe on this machine)
- Fixture project has the standard shape: AGENTS.md, PROJECT.md, LOG.md, tasks/, src/, node_modules/
- Briefing format is human-readable markdown with sections: contract facts, PROJECT.md excerpt, work log, recent records, git status, file tree
- Truncation happens both at record level (`maxRecordChars`) and tree level (`maxTreeEntries`)

## Limitations

None known. Implementation is complete and tested.

Milestone movement: NO

Disposition: DONE
