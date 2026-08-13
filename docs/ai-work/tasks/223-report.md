# Task 223 report - prove the Windows-only production Builder sandbox

**Lane:** A (the main checkout). **Base commit:** `030e78d`.
**Brief claim commit:** `880dbe9`.

## Outcome

Task 223 stopped at its decisive, owner-approved causal check. The selected
Codex 0.145.0 elevated Windows sandbox enforced every instantiated filesystem
target in the probe: one write beneath the disposable project
succeeded, while writes beneath the project's `.git`, `.agents`, and `.codex`,
Electron `userData`, a sibling, another outside root, the shared
`%TEMP%`/`%TMP%` path, and `C:\Windows\Temp` were each denied. The fixed child
then opened a raw TCP
connection to Cairn's preregistered `127.0.0.1:43821` control listener despite
both `network.enabled=false` in the permission profile and
`--sandbox-state-disable-network` on the sandbox command.

That is a real failure, not a harness timeout or an ambiguous result. The
control connection reached the listener before the sandbox ran; the sandboxed
connection increased the listener's count from one to two. Loopback is still a
network boundary: localhost may expose privileged developer services. Cairn
therefore did not weaken “no network” to “no Internet.” Codex 0.145.0 exposes
no stronger permission-profile switch for arbitrary outbound loopback sockets.
Proxy or domain settings would affect only cooperative clients; closing a raw
socket requires a separately reviewed host firewall/WFP, AppContainer,
container, broker, or other OS boundary.

The transient confinement module, its focused tests, and the causal probe were
removed rather than leaving a dormant authority whose network claim had been
disproved. A clean Core rebuild removed their ignored generated output. The
activation registry remains empty, Codex still advertises only `serial-task`,
normal tasks still use the legacy route, and Q9 remains synthetic and guarded.
No model, provider, credential, Internet request, paid call, dependency,
production change, push, publication, or deployment occurred.

## Files touched

- `docs/ai-work/tasks/223-brief.md` was created and committed alone at
  `880dbe9` to claim Task 223.
- `core/src/codex-confinement.ts` was created for the non-barrel opaque policy
  prototype and then deleted after the network check failed.
- `core/test/codex-confinement.test.ts` was created for focused structural and
  live-root tests and then deleted with the failed prototype.
- `core/scripts/task223-causal-probe.mjs` was created for the fixed approved
  probe and deleted after it recorded the decisive result and cleaned up.
- `docs/superpowers/plans/2026-08-07-cairn-quality-intent-and-critic-prerequisite.md`
  records this precursor's STOP and keeps Q10 blocked.
- This report records the result.
- `docs/ai-work/LOG.md` receives one truthful Task 223 row.

The build regenerated ignored `core/assets/contract.md` and `core/dist/**`;
the final rebuild contains no Task 223 confinement module or test. The approved
probe created and removed only
`C:\Users\KenJL\Desktop\WebApp Projects\.cairn-task223-sandbox-proof` and
its exact disposable children. All proposed denied files were absent after the
probe. Codex may have updated routine sandbox setup/log state beneath
`C:\Users\KenJL\.codex\.sandbox`; Cairn did not inspect secret-bearing state or
try to undo the owner's existing sandbox installation.

## Check results

### `c1` - the policy is exact, app-owned, and Windows-only: PARTIAL

The installed CLI accepted one atomic named permission profile with default
deny, minimal reads, one absolute project write root, explicit read-only
project controls, explicit `userData` and temp denials, and network disabled.
The prototype bound the canonical project/userData roots, pinned Codex 0.145.0
executable and helper hashes, filtered environment, and different front-end
arguments into one opaque process-local digest. It was not exported by the Core
barrel or package subpaths; clones and test brands could not act as live
authority. Four focused checks passed before the prototype was removed.

This check did not pass overall because an exact authority with a false
complete-network claim is not safe to retain.

### `c2` - project and `userData` topology is closed: PASSED IN THE PROTOTYPE

Focused tests rejected missing, overlapping, descendant, case-alias, junction,
wrong-layout, wrong-hash, wrong-version, and drifted roots. Live read-only
mint/revalidation succeeded for the real repository and existing Cairn
`userData`; a disposable live-root test retired authority permanently after a
root rename. The real causal probe then proved that the filesystem policy saw
the intended disjoint project and userData roots.

The code was intentionally not retained after `c3` failed.

### `c3` - the causal Windows sandbox permits only the project write: FAILED

Filesystem portion:

- project: `written`, file existed;
- `.git`, `.agents`, `.codex`, `userData`, sibling, outside, the canonical
  `%TEMP%`/`%TMP%` target, and `C:\Windows\Temp`: each reported `denied`, and
  no file existed.

On this machine `%TEMP%` and `%TMP%` both resolved to
`C:\Users\KenJL\AppData\Local\Temp`, so one canonical attempt covered both
aliases. `TMPDIR` was unset and therefore had no path to attempt. The brief
asked for distinct attempts for all three variables, so that finer-grained
subcheck was not reached independently of the decisive network failure.

Network portion:

- loopback control before sandbox: one successful connection;
- sandboxed raw `TcpClient`: `connected`;
- loopback count after sandbox: two.

The child exited 0 without a timeout because it honestly reported the denied
filesystem writes and successful network connection. The probe then removed
the allowed project file and every disposable directory. This is the brief's
explicit STOP condition: complete network denial did not hold.

### `c4` - production and test consume the same policy: PARTIAL; NOT SAFE

Static projections shared one exact permission payload and policy digest.
Production added its own supported `--strict-config`, `--ignore-user-config`,
and `--ignore-rules`; the standalone sandbox front end does not accept those
exec-only flags, so it used the same atomic profile plus `-P` and the explicit
network-disable switch. Neither projection used legacy `--sandbox
workspace-write` or `--add-dir`.

The filesystem behavior matched that payload, but the causal network behavior
did not. A shared digest cannot turn an unenforced promise into authority, so
the implementation was removed.

### `c5` - current routes remain dark and compatible: PASSED

Final source still has an empty calibrated activation literal array, both
quality-preview identities are literal `null`, and Codex still advertises only
`["serial-task"]`. No `serial-task-candidate` capability, production critic
dependency, normal Evidence Plan, packet selector, IPC, preload, renderer,
environment activation, or Q9 authority changed. A final Core build passed
after all transient source and generated output were removed.

### `c6` - regression and records are complete: STOPPED AT THE DECISIVE CHECK

The focused prototype tests passed 4/4, the final clean Core build passed, and
three independent read-only reviews challenged executable/root pinning,
profile semantics, public rebrand seams, and the failed network result. Both
independent final adjudications agreed that no profile-only repair exists and
that Task 223 must stop. Full Core/App suites, App typechecks, Vite/lab builds,
and Electron were not run: no product source remains, and those checks cannot
repair a causally open socket boundary.

## Exact commands and observed results

`codex --version`

Result: `codex-cli 0.145.0`.

`codex exec --help` and `codex help sandbox`

Result: `exec` exposes `--strict-config`, `--ignore-user-config`, and
`--ignore-rules`; `sandbox` exposes `-P/--permission-profile`, `-c`, and
`--sandbox-state-disable-network`. Neither exposes a stronger arbitrary-socket
deny control.

The installed executable and helpers were hashed with:

`Get-FileHash -Algorithm SHA256 -LiteralPath "C:\Users\KenJL\.codex\packages\standalone\releases\0.145.0-x86_64-pc-windows-msvc\bin\codex.exe"`

`Get-FileHash -Algorithm SHA256 -LiteralPath "C:\Users\KenJL\.codex\packages\standalone\releases\0.145.0-x86_64-pc-windows-msvc\codex-resources\codex-windows-sandbox-setup.exe"`

`Get-FileHash -Algorithm SHA256 -LiteralPath "C:\Users\KenJL\.codex\packages\standalone\releases\0.145.0-x86_64-pc-windows-msvc\codex-resources\codex-command-runner.exe"`

Result:

- `codex.exe`: `83751F15CB6A0A7B97DF67752C001E3FE1C20E18FFBFEC3FF63567296205EB6C`;
- `codex-windows-sandbox-setup.exe`: `C981B438D0959E33F90F6B8B1A9656C4F803A1B82EBDD97E2150D2B8543A0C31`;
- `codex-command-runner.exe`: `09531442D178AEFB4C849745E95A000F52D5910A13944638269D9991CB08319B`.

A local parser-only check ran:

`$task223Exe=(Get-Command codex).Source; $task223Root=(Resolve-Path .).Path.Replace('\\','/'); $task223Fs="{':root'='deny',':minimal'='read','$task223Root'='write',':tmpdir'='deny',':slash_tmp'='deny'}"; $task223Args=@('-c',"default_permissions='cairn_project_only'",'-c',"permissions.cairn_project_only.description='Cairn project-only Windows sandbox'",'-c',"permissions.cairn_project_only.extends=':workspace'",'-c',"permissions.cairn_project_only.filesystem=$task223Fs",'-c','permissions.cairn_project_only.network.enabled=false','features','list'); & $task223Exe @task223Args`

Result: exit 0 with the profile accepted. No sandbox child, model, credential,
or network ran.

`npm.cmd --prefix core run build; node --test core\dist\test\codex-confinement.test.js`

Result before the prototype was removed: Core build passed; 4 tests passed, 0
failed. They covered shared policy bytes, fail-closed platform/topology/pins,
package darkness, and live Windows root drift.

`node core\scripts\task223-causal-probe.mjs`

Result under the owner's exact approval: exit 1 with a bounded JSON result.
The child exited 0 and did not time out; the project file was written; all
eight denied files were absent; network was `connected`; loopback connections
were `1` before and `2` after; cleanup was `complete`.
The diagnostic script was deliberately removed after it recorded this STOP
result, so this historical command is not presented as a current rerunnable
product check.

`$targets=@('C:\Users\KenJL\Desktop\WebApp Projects\.cairn-task223-sandbox-proof', "$env:APPDATA\Cairn\cairn-task223-proof-v1.txt", "$env:TEMP\cairn-task223-proof-v1.txt", 'C:\Windows\Temp\cairn-task223-proof-v1.txt'); $targets | ForEach-Object { [pscustomobject]@{Path=$_; Exists=Test-Path -LiteralPath $_} } | Format-Table -AutoSize`

Result after the probe: every value was `False`.

`npm.cmd --prefix core run build`

Result after removal: exit 0. The build cleaned `core/dist` and recreated only
tracked-source outputs.

`rg -n "CALIBRATED_ACTIVATION_LITERALS|QUALITY_PREVIEW_ACTIVATION_IDENTITY|QUALITY_PROPOSAL_ACTIVATION_IDENTITY" app/src/main/criticactivation.ts app/src/main/tasks.ts app/src/main/conductor/service.ts`

Result: the activation array is still `Object.freeze([])` and both identities
are `null`.

`rg -n "capabilities" core/src/codex.ts | Select-Object -Last 8`

Result: Codex still declares `capabilities: ["serial-task"]`.

## Smallest safe continuation

Do not add more Codex profile flags or proxy variables: the strongest relevant
profile and sandbox switches already failed against a direct socket. The next
possible precursor is a separately briefed, qualified Windows security design
for an OS-enforced network boundary around the Builder process tree. It must
show the owner the exact firewall/WFP/AppContainer/container or broker change,
system permissions, affected processes, recovery, and platform support before
touching production settings. Only after that boundary passes the same raw
socket test should the project recreate the filesystem policy. The trusted
pre-dispatch verifier vocabulary remains a separate prerequisite after writer
confinement.

Q10 live calibration remains blocked. Every eventual model request still needs
its own just-in-time approval.

## How to try it

There is intentionally no new product control. Maintainers can inspect this
report and the plan status. The only safe runtime behavior remains the existing
legacy/no-critic route.

## Limitations and owner judgment

The filesystem result is useful evidence, but it is not sufficient writer
confinement while the child can reach localhost. No claim is made about
non-loopback Internet reachability because the safer requirement already
failed. The project milestone did not move.

**Disposition: STOPPED - the pinned Codex 0.145.0 elevated Windows sandbox allowed a raw loopback TCP connection despite both available network-denial controls.**
