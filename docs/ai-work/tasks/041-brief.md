# Task 041 — Brief

Requested visible outcome: a pure, fail-closed parser that turns a worker's
final message into typed `WorkerClaims`, or `null` if anything about the
message's `cairn-claims` fence is not exactly as expected. This is the first
piece of the record-authorship chunk (plan Task 6): future tasks will have
Cairn author task records from these claims instead of the worker writing
its own brief/report files. Nothing in the existing tree references this
module yet — it is purely additive, no integration in this task.

Boundary of intent: new file `core/src/claims.ts` plus its test, and the
one-line registration `core/package.json` needs so the new test file
actually runs (the test script enumerates files explicitly, not a glob). No
other source file changes. No new dependency. No version bump.

The shape, verbatim from the plan:

```ts
export interface WorkerClaimCheck { name: string; result: string }
export interface WorkerClaims {
  disposition: "DONE" | "STOPPED";
  summary: string;
  changes: string[];
  checks: WorkerClaimCheck[];
  howToTry: string;
  limitations: string;
  milestone: "YES" | "NO" | "UNCLEAR";
}
export function parseWorkerClaims(finalMessage: string | null): WorkerClaims | null;
```

Fail-closed rules: null/empty input returns null; exactly one
` ```cairn-claims ` fence must exist in the message (zero or two-or-more
returns null); the fence body must be a JSON object with exactly the seven
keys above (missing, extra, or wrong-typed keys return null); string caps —
`summary` <= 300, each `changes` entry <= 500 (<= 50 entries), each check
`name` <= 200 / `result` <= 500 (<= 30 checks), `howToTry` <= 2000,
`limitations` <= 2000; total input over 262,144 characters returns null.
Empty strings and empty arrays are allowed — an honest "nothing to say" is
not malformed.

Checks that show the outcome holds:

- `core/test/claims.test.ts` (new): a well-formed fence parses to the exact
  typed object; every malformed shape in the fail-closed list above returns
  null (no fence, two fences, non-JSON body, unknown key, missing key, bad
  enum value, wrong-typed field, a check missing a required key, each of the
  four size caps); empty strings/arrays in an otherwise valid claims object
  parse through unchanged.
- `cd core && npm test` — full core suite green, including the three new
  tests.
- Root `npm test` — core + cli both green.

DONE means: `parseWorkerClaims` matches the interface and every fail-closed
rule above, the new test file is registered and actually executes as part
of `npm test` (not silently skipped), and the full core and root suites are
green with nothing else weakened. STOPPED means: the fence grammar or JSON
shape cannot be made to discriminate every listed malformed case correctly
without touching code outside this task's stated scope.
