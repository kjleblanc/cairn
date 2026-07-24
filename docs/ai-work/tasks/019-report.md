# Task 019 Report: Cairn's constitution with invariant tests

## Implementation Summary

Created Cairn's character definition as a versioned TypeScript constant with comprehensive unit tests ensuring its honesty is preserved.

## Files Changed

1. **app/src/main/conductor/constitution.ts** (new)
   - Exports `CONSTITUTION` string containing the full character definition verbatim from spec
   - Exports `CONSTITUTION_VERSION = "conductor-v1"`
   - 54 lines including template literal with escaped backticks for nested ```cairn-task fence

2. **app/tests-unit/constitution.test.ts** (new)
   - 30 lines including version pin test, 9 load-bearing line assertions, and format validation
   - Uses whitespace normalization for load-bearing assertions (spec source is hard-wrapped)
   - Tests: no emoji, no exclamation marks

3. **app/tsconfig.unit.json** (modified)
   - Added `"src/main/conductor/constitution.ts"` to include list

## TDD Evidence

**RED phase:**
```
$ cd app && npm run test:unit
tests-unit/constitution.test.ts(3,52): error TS2307: Cannot find module '../src/main/conductor/constitution.js'
```
Module correctly not found before implementation.

**GREEN phase:**
```
$ npm run test:unit
✔ constitution version is pinned
✔ constitution keeps: "You are Cairn, this project's conductor.…"
✔ constitution keeps: "Say only what the records show…"
✔ constitution keeps: "Never claim work happened unless a recor…"
✔ constitution keeps: "Raise, then defer.…"
✔ constitution keeps: "do not use, repeat, or store it…"
✔ constitution keeps: "never yours to perform or approve…"
✔ constitution keeps: "emit exactly one block…"
✔ constitution keeps: "If the records show the outcome already …"
✔ constitution keeps: "You cannot read file contents…"
✔ constitution has no emoji and no exclamation marks
✔ [11 existing taskblock tests still pass]
ℹ tests 25
ℹ pass 25
ℹ fail 0
```

Typecheck: clean (no errors)

## Verification

- All 11 new constitution tests pass (version, 9 load-bearing lines, format)
- All 14 existing taskblock tests remain green
- Constitution text copied verbatim from spec including hard line wraps
- Nested ```cairn-task fence properly escaped with backticks within template literal
- No TypeScript errors

## Limitations

Tests assert whitespace-normalized content for load-bearing lines because the specification source file is hard-wrapped at natural line breaks; the semantic content is preserved and verifiable.

Milestone movement: NO
Disposition: DONE
