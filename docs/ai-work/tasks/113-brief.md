# Task 113 brief — Level 3a plan, Task 1: Kimi detection (installed / connected / billing)

## Requested visible outcome

The detection half of `core/src/kimi.ts` exists and is unit-tested:
`detectKimiExecStatus` composes three injectable probes — installed
(`kimi --version`, exit status only), connected (the ACP
`initialize` + `authenticate {methodId:"login"}` handshake, `-32000` =
signed out, per the Task 106 spike), and billing (`kimi provider list`'s
`source=oauth` line) — behind command resolution in the codex idiom
(PATH-only, workspace-contained binaries refused, `.cmd` shim rules, the
`~/.kimi-code/bin` fallback), with the fail-closed test-lane guard
(`CAIRN_TEST_LANE=1` without `CAIRN_FAKE_KIMI` → not-found) so no suite
can ever reach the real signed-in CLI now installed on this machine.
`kimiExecStatusText` / `kimiExecConnectionReason` mirror the codex prose.

## Boundary of intent — what must not change

- Files that may change: NEW `core/src/kimi.ts`, NEW
  `core/test/kimi.test.ts`, `core/src/index.ts` (exports only),
  `core/package.json` (test script lists the new compiled test), this
  task's records, one LOG.md row.
- No codex, routing, serial, app, cli, or contract changes. The parallel
  lane's in-flight renderer files (`app/src/renderer/app.css`,
  `TownSquare.tsx`, `tokens.css`, `app/tests/conductor.spec.ts`) and
  `design/` are untouched.
- Red-first: the tests are written and seen failing before the
  implementation. No real CLI invocation at any point — all probes faked
  or injected.
- The spike's observed facts only: camelCase `methodId`, `-32000`
  signed-out, `source=oauth` billing line. API-key-mode output was not
  observed: anything not exactly `source=oauth` maps to `"other"`/`"unknown"`.

## Checks that will show the outcome holds

1. `npm --prefix core test` passes, including the new kimi suite:
   FakeProbe both directions, signed-out, probe failure, planted-binary
   refusal, fallback-directory rule, billing parse (oauth / api-key /
   garbage), the test-lane guard refusal, and a wire pin asserting the
   exact JSON-RPC bytes the fake ACP peer received.
2. `git diff --stat` and status contain only the named files.

## What DONE and STOPPED mean here

- DONE: detection works against fakes with the guard in place, the full
  core suite is green, and the diff is scoped.
- STOPPED: a check fails without an in-scope correction, or isolation
  from the parallel lane cannot be maintained.
