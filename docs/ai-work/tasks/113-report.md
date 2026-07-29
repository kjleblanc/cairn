# Task 113 report — Level 3a plan, Task 1: Kimi detection in core

## What actually changed

- `core/src/kimi.ts` — NEW (detection half). `detectKimiExecStatus`
  composes three injectable probes into `KimiExecStatus { installed,
  connected, billing }`:
  - installed: `kimi --version`, exit status only, in the
    `CodexStatusProbe` idiom;
  - connected: the system ACP probe — spawn `kimi acp`, send
    `initialize` then `authenticate` with camelCase `methodId: "login"`
    (the spike's recorded docs correction), map `result` → authenticated,
    `-32000` → auth-required, everything else → failed; 5-second cap;
    only the outcome ever leaves the probe;
  - billing: `kimi provider list`, probed only when connected; the regex
    reads only the `source=` token — `oauth` → `"oauth"`, any other
    source → `"other"`, unparseable/failed → `"unknown"`.
  Command resolution mirrors the codex idiom (absolute PATH entries,
  workspace-contained binaries refused via `canonicalPath`, `.cmd` shim
  and special-char rules) and adds the `~/.kimi-code/bin` fallback the
  spike showed is needed (install-script PATH edits don't reach running
  processes). The fail-closed test-lane guard (`CAIRN_TEST_LANE=1`
  without `CAIRN_FAKE_KIMI` → every command resolves not-found) lives in
  the resolution function itself, load-bearing now that a signed-in real
  CLI exists on this machine. `kimiExecStatusText` /
  `kimiExecConnectionReason` mirror the codex prose.
- `core/test/kimi.test.ts` — NEW, 9 tests: FakeProbe both directions
  with a secret sentinel, auth-failure and non-oauth billing paths, prose
  pins, the ACP handshake **pinned at the wire** (a fake peer records the
  exact JSON-RPC it receives, asserting `protocolVersion: 1` and
  `{ methodId: "login" }`), -32000 mapping, provider-line parse for
  oauth / api-key / garbage, workspace-planted binary refusal, the
  home-bin fallback, and the test-lane guard in both directions.
- `core/src/index.ts` — one export line.
- `core/package.json` — the test script lists the new compiled suite.
- Records: this report, `113-brief.md` (committed at task start), one
  LOG.md row.

## Checks run and their real results

- Red first: the suite failed to compile (`Cannot find module
  '../src/kimi.js'`) before implementation.
- `npm --prefix core test`: **115/115 pass** (106 existing + 9 new).
- Root `npm.cmd test` (core + cli): **115/115 and 9/9 pass**.
- Final status: exactly the four named files; the parallel lane's work
  untouched (its Task 111 renderer files committed mid-task; `design/`
  remains its own).

One in-task repair, disclosed: the first green run failed 6 tests on two
harness mistakes of mine — (1) the system-probe tests passed a
non-existent directory as the spawn cwd, which Windows refuses with
ENOENT (diagnosed by instrumenting the compiled probe, then rebuilding
clean); (2) the workspace-containment test didn't isolate the home
fallback, so it found the machine's real CLI — the test now points
USERPROFILE at an empty temp home, and the fallback test covers that path
deliberately. Only test files were touched by the repairs; the
implementation was correct as written.

## How to try it

`npm --prefix core test` — the kimi suite runs with everything else.
Against the real machine: nothing here is user-facing yet; detection is
wired into the app in plan Task 4.

## Limitations and remaining human judgment

- The provider-line parse keys on `source=` anywhere in bounded stdout;
  the API-key-mode line was never observed (no second account), so any
  non-`oauth` token maps to `"other"` — the wording derived from it stays
  honest either way.
- The ACP probe's `clientCapabilities` declares no fs support; that's a
  handshake-shape choice matching the spike probe, pinned at the wire.
- Detection shells out to the real CLI only outside test lanes; the
  guard's refusal is itself tested.

Disposition: DONE
