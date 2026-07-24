# Task 041 — Report

What changed (every file touched):

- `core/src/claims.ts` (new) — `parseWorkerClaims(finalMessage: string |
  null): WorkerClaims | null`, implemented verbatim from the plan brief.
  Rejects null/empty/over-262,144-char input; requires exactly one
  ` ```cairn-claims ` fence found via
  `/^```cairn-claims[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm`; parses the
  fence body as JSON and rejects non-objects and arrays; requires exactly
  the seven expected keys (sorted-key comparison catches missing or extra
  keys in one check); validates `disposition` and `milestone` against their
  literal enums; enforces the `summary` / `howToTry` / `limitations` string
  caps and the `changes` array's per-entry cap and count cap; validates each
  `checks` entry is an object with exactly `name` and `result`, both capped
  strings; returns a freshly-built object (not the parsed object by
  reference) on success.
- `core/test/claims.test.ts` (new) — three tests, verbatim from the plan
  brief: a well-formed fence round-trips to the exact typed object; every
  listed malformed shape (no fence, two fences, non-JSON body, unknown key,
  missing key, bad `disposition`, bad `milestone`, wrong-typed `changes`, a
  check missing `result`, the `summary` cap, the `changes` count cap, the
  total-size cap) returns `null`; empty strings and empty arrays in an
  otherwise valid object parse through unchanged.
- `core/package.json` — appended ` dist/test/claims.test.js` to the
  explicitly enumerated file list in the `test` script (line 14), in the
  same step as creating the test file, per the repo's stated pitfall (a new
  core test file that isn't registered here silently never runs).

Nothing else was touched: no existing source file references `claims.ts`
yet (purely additive, no integration in this task), no new dependency, no
version bump.

RED/GREEN evidence:

**RED** — created `core/test/claims.test.ts` and registered it in
`core/package.json` in the same step, before `core/src/claims.ts` existed,
then ran `cd core && npm test`:

```
test/claims.test.ts(3,35): error TS2307: Cannot find module '../src/claims.js' or its corresponding type declarations.
npm error Lifecycle script `build` failed with error:
npm error code 2
```

Failed for exactly the stated reason: the build step (`tsc`) cannot find
the not-yet-created `../src/claims.js`, before any test even runs.

**GREEN** — implemented `core/src/claims.ts`, then `cd core && npm test`:

```
✔ a well-formed fence parses to typed claims (1.4314ms)
✔ fail-closed on every malformed shape (0.3961ms)
✔ empty strings and empty lists are honest and allowed (0.7167ms)
...
ℹ tests 63
ℹ pass 63
ℹ fail 0
```

63/63 (60 previously + 3 new claims tests), all green.

Root `npm test` (core + cli):

```
core: ℹ tests 63 / pass 63 / fail 0
cli:  ℹ tests 9 / pass 9 / fail 0
```

72/72 (69 previously + 3 new), all green.

How to try it: from `core/`, `import { parseWorkerClaims } from
"./dist/src/claims.js"` after `npm run build`, and call it with a string
such as `"I finished.\n\n```cairn-claims\n" + JSON.stringify({
disposition: "DONE", summary: "...", changes: [], checks: [], howToTry:
"...", limitations: "...", milestone: "NO" }) + "\n```\n"` — it returns the
typed object. Any deviation from the seven-key shape, the enum values, or
the size caps returns `null` instead of throwing or guessing.

Limitations and remaining human judgment:

- This task is the pure parser only. No caller in the tree invokes
  `parseWorkerClaims` yet — a later plan task wires it into the worker
  loop so Cairn authors task records from these claims instead of the
  worker writing its own brief/report files.
- The fence-count check is purely textual (a JSON string value inside a
  correctly-fenced claims block that happens to *contain* the literal text
  `` ```cairn-claims `` on its own line, at the right indentation, could in
  principle confuse the fence count). This is the same class of ambiguity
  any fenced-code-block convention has and is out of this task's stated
  scope to solve differently from the plan's verbatim spec.
- Milestone movement: NO

Self-review (asked for specifically: CRLF input, and a fence at the very
start/end of the message):

I wrote a standalone probe script against the built `dist/src/claims.js`
(outside the repo, in scratch space, not committed) and exercised nine
boundary cases beyond what the given tests cover:

- Fence as the very first characters of the message (LF) — parses OK.
- Fence as the very last characters of the message, no trailing newline
  after the closing fence (LF) — parses OK.
- The entire message *is* the fence, nothing before or after it — parses
  OK.
- Full CRLF throughout (opening fence line, body, closing fence line, and
  trailing CRLF) — parses OK.
- CRLF with the fence spanning the whole message and no trailing newline —
  parses OK.
- CRLF fence lines but a bare `\n` (no `\r`) after the closing fence —
  parses OK.
- Trailing spaces after `cairn-claims` on the opening line and after the
  closing backticks — parses OK (the `[ \t]*` tolerance in the regex).
- Ordinary trailing prose after the fence (e.g. "Thanks!") — parses OK,
  fence still recognized as bounded by `$` in multiline mode.
- Adversarial: bare-`\r`-only line endings (old-Mac style, no `\n`
  anywhere) — correctly returns `null`. This is expected and not a
  concern: JavaScript's `^`/`$` multiline anchors key off `\n`
  specifically, and no realistic worker transport (Codex Exec, the CLI, or
  the offline adapter) emits bare-CR line endings — Node, git, and every
  adapter in this repo produce either `\n` or `\r\n`.

No genuine gap found for the two cases named in the task ("does the fence
regex behave with CRLF input and with a fence at the very start/end of the
message?") — both behave correctly. The one case that fails (bare-CR-only)
is outside any realistic input this parser will ever see and is not a
concern worth expanding scope over.

Disposition: DONE
