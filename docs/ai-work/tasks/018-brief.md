# Task 018: Conductor task-block parser + unit-test harness

## Visible outcome
Conductor can extract and validate task-block commands from model replies (fenced JSON with outcome, concerns, notes); strict shape validation ensures only valid blocks become cards. The app gains a unit-test harness (tsc + node --test) for pure modules, with a passing test suite for the parser.

## Boundary of intent
- Implement strict task-block parser with exact shape validation (outcome, concerns, notes)
- Create app unit-test infrastructure (tsconfig.unit.json, test:unit script)
- Add shared types (TaskBlock, TaskBlockConcern, ConductorTurn) to ipc.ts
- All tests must pass; no TDD shortcuts
- No new dependencies; use node:test built-in
- Do not modify core/, cli/, or existing app source beyond specified files

## Checks run
1. RED: `npm run test:unit` fails with "Cannot find module" (implementation not yet written)
2. GREEN: `npm run test:unit` passes all 16 tests (valid blocks, concerns, rejections, fence handling)
3. Typecheck: `npm run typecheck` passes clean
4. No stray files after commit

## DONE / STOPPED
- DONE: All tests pass, typecheck clean, commit applied, protocol records written
- STOPPED: Implementation blocked by missing requirements or test failures unexplained
