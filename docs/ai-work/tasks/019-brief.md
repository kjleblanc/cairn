# Task 019: Cairn's constitution with invariant tests

## Outcome

Cairn's character definition lives as a versioned, testable TypeScript constant. The constitution text is identical to the design spec. Load-bearing sentences are pinned by unit tests so they cannot be accidentally deleted.

## Boundary

- Implement `app/src/main/conductor/constitution.ts` exporting `CONSTITUTION` and `CONSTITUTION_VERSION`
- Write `app/tests-unit/constitution.test.ts` with tests for version, load-bearing lines, and format (no emoji, no exclamation marks)
- Add `"src/main/conductor/constitution.ts"` to `app/tsconfig.unit.json` include list
- Verify with TDD: write tests red, implement, watch pass

## DONE means

- All new unit tests pass (and existing 14 from task 1 still pass)
- Typecheck clean
- Constitution text matches spec verbatim
- All nine load-bearing lines present verbatim

## STOPPED means

- A load-bearing line in the spec conflicts with test assertion — stop and report NEEDS_CONTEXT
