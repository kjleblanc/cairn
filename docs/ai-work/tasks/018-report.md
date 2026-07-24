# Task 018: Conductor task-block parser with strict validation — Report

## What Changed

### New Files
- `app/src/main/conductor/taskblock.ts`: Strict parser for fenced JSON task blocks; exports `extractTaskBlock(reply: string): TaskBlockResult`
- `app/tests-unit/taskblock.test.ts`: 14 unit tests covering valid blocks, concerns, rejections, fence handling, and edge cases
- `app/tsconfig.unit.json`: Dedicated TypeScript config for unit tests (ES2022, NodeNext, strict)

### Modified Files
- `app/src/shared/ipc.ts`: Added `TaskBlockConcern`, `TaskBlock`, `ConductorTurn` interfaces
- `app/package.json`: Added `test:unit` npm script: `tsc -p tsconfig.unit.json && node --test dist-unit/tests-unit/*.test.js`
- `.gitignore` (root): Added `app/dist-unit/` to ignore compiled test artifacts

## Test Evidence

### RED (Expected Failure)
```
npm run test:unit
> error TS2307: Cannot find module '../src/main/conductor/taskblock.js'
```
Expected: module does not exist yet — ✓

### GREEN (All Passing)
```
✔ a valid block parses and the fence leaves the text (0.8918ms)
✔ concerns parse with kinds and bounded shape (0.1295ms)
✔ no fence means no block and untouched text (0.0699ms)
✔ invalid block is rejected: malformed json (0.0802ms)
✔ invalid block is rejected: extra key (0.0979ms)
✔ invalid block is rejected: missing outcome (0.061ms)
✔ invalid block is rejected: empty outcome (0.0529ms)
✔ invalid block is rejected: oversized outcome (0.0431ms)
✔ invalid block is rejected: bad concern kind (0.0533ms)
✔ invalid block is rejected: concern extra key (0.0928ms)
✔ invalid block is rejected: too many concerns (0.0483ms)
✔ invalid block is rejected: array payload (0.0383ms)
✔ invalid block is rejected: oversized notes (0.0542ms)
✔ only the first fence is honored (0.0968ms)
ℹ tests 14
ℹ suites 0
ℹ pass 14
ℹ fail 0
```

### Typecheck Clean
```
npm run typecheck
> (no output — success)
```

## Implementation Details

The parser (`extractTaskBlock`):
1. Extracts the first `````cairn-task` fence from reply text
2. Removes fence, trims surrounding text
3. Validates JSON shape: exactly { outcome, concerns?, notes? }
4. Enforces strict bounds:
   - `outcome`: required, non-empty, ≤300 chars (trimmed)
   - `concerns`: array of ≤3 items, each with `kind` ("question"|"risk") and `text` (≤300 chars, trimmed)
   - `notes`: optional, ≤1000 chars (trimmed)
5. Returns { block: TaskBlock|null, text: string } — conversation text always survives

Invalid blocks return `{ block: null, text: original_reply }` so conversation flows uninterrupted.

## How to Try It

```bash
cd app
npm run test:unit    # Compile and run unit tests
npm run typecheck    # Verify type safety
```

Add tests to the `tsconfig.unit.json` include list as new modules are created.

## Limitations & Notes

- No new dependencies; uses node:test and node:assert built-ins
- Tests run on every CI build (part of npm test)
- Parser is strict by design: any deviation (extra keys, wrong kind, oversized text) drops the block silently
- The fence regex matches only the first block; later fences are treated as conversation text

Milestone movement: NO
Disposition: DONE
