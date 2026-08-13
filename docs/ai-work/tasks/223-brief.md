# Task 223 brief - prove the Windows-only production Builder sandbox

**Lane:** A (the main checkout). **Base commit:** `030e78d`.

**Owner decision:** The owner delegated the two Task 222 product choices to
Cairn. Cairn chooses a Windows-first production Builder: non-Windows platforms
retain the existing legacy/no-critic route until their confinement is
separately proved. Cairn also chooses a later bounded-verifier prerequisite in
which Main—not the Builder—selects an owner-visible exact verifier before
dispatch; tasks that cannot map honestly will refuse or require explicit owner
observation. This task implements only the first choice.

## Requested visible outcome

Cairn has one app-owned, Windows-only Codex Builder sandbox policy whose exact
same permission definition is bound into the future production request and an
offline causal launcher. On supported Windows, a harmless local probe can write
inside one canonical project but cannot write Electron `userData`, system or
sibling paths, or implicit temporary roots, and cannot reach the network.
Non-Windows, unsafe-root, mutable-config, injected-runner, and unpinned-launcher
cases fail closed. The production critic route and activation remain dark.

## Boundary of intent

- Implement only the Windows Builder confinement prerequisite. Do not implement
  Evidence Plan semantics, normal candidate admission, packet selection,
  production critic dependencies, Q10 calibration, activation, Plan 2, or a
  visible task route.
- Do not call a model, retrieve a credential, use a provider, enable network,
  install/update anything, fetch references, run Electron, push, publish, or
  deploy. Causal tests use the installed local Codex sandbox helper only as a
  process boundary around fixed harmless commands; they never invoke `codex
  exec` or send a prompt.
- V1 production Builder support is Windows-only. Every non-Windows call returns
  no confinement authority and leaves the existing legacy/no-critic route
  unchanged. This does not remove existing legacy Codex support on any
  platform.
- The policy is app/Core-owned and immutable. It denies filesystem access by
  default, permits only the minimal runtime reads needed by the pinned launcher,
  permits writes only beneath the one canonical project root, explicitly denies
  temporary roots and Electron `userData`, and disables child-command network.
  Project `.git`, `.agents`, and `.codex` protections remain read-only.
- The canonical project and `userData` must both exist, resolve without link or
  reparse ambiguity, be disjoint in both directions, and remain stable through
  launch. Ancestor/descendant, alias, case, junction, symlink, reparse,
  hardlink-sensitive, missing, changed, or unsafe topology refuses.
- Ignore user and project Codex configuration and exec-policy rules. Use strict
  config parsing. No `--add-dir`, profile fallback, `workspace-write` legacy
  policy, inherited `CODEX_HOME`, TMP/TEMP/TMPDIR writable-root expansion,
  renderer input, environment flag, process-runner injection, or structural
  clone may mint production writer authority.
- Bind the exact installed Codex executable real path, file digest, reported CLI
  version, Windows sandbox implementation, canonical project/userData roots,
  policy revision, complete ordered config arguments, environment filter, and
  causal-launch recipe into one opaque process-local authority. Drift refuses
  before future dispatch. This task does not grant `serial-task-candidate` or
  make that authority publicly mintable.
- The offline probe writes only disposable fixture bytes under temporary test
  roots. It verifies denied targets without overwriting valuable data and
  removes only its own exact disposable fixtures after resolving and checking
  their roots.

## Checks

1. **`c1` - the policy is exact, app-owned, and Windows-only.** A single
   constructor accepts only the built-in system launcher and canonical safe
   Windows roots, freezes and brands the complete permission profile and
   executable identity, and returns null off Windows. Structural clones,
   injected runners, PATH substitutions, unknown/new CLI versions, different
   sandbox implementations, changed arguments/config/environment, or replayed
   authority refuse. The Core package barrel exports no mint or rebrand seam.
2. **`c2` - project and `userData` topology is closed.** Exact causal tests
   reject overlap in either direction, case/alias swaps, missing roots,
   junctions/symlinks/reparse points, unsafe writable ancestors, and state drift.
   The accepted pair is the same canonical pair bound into the production and
   probe recipes.
3. **`c3` - the causal Windows sandbox permits only the project write.** With
   no model or network, one fixed child command creates an exact disposable file
   under the project and attempts unique files under `userData`, a sibling,
   TEMP, TMP, TMPDIR, and another outside root. Only the project file exists;
   every denied attempt is reported as denied, not silently skipped. Network is
   disabled and no fallback sandbox implementation is accepted.
4. **`c4` - production and test consume the same policy.** The future
   production request projection and local `codex sandbox` probe derive from one
   canonical policy object/digest. Mutating or omitting any permission,
   executable, root, config, environment, or sandbox field changes the digest
   and refuses comparison. The production projection is inspected only; no
   `codex exec` or model request runs.
5. **`c5` - current routes remain dark and compatible.** Activation literals
   remain empty; normal tasks still use the legacy route; Codex still advertises
   no candidate capability; Q9/calibration synthetic authority is untouched;
   non-Windows legacy behavior is unchanged; no IPC/preload/renderer input can
   select the new policy.
6. **`c6` - regression and records are complete.** Red-first focused tests,
   complete Core/App unit suites, both typechecks, Vite/lab builds, exact
   diff/status inspection, and three independent adversarial reviews pass. One
   report and LOG row answer every check, and the exact Task 223 paths land in
   one local final commit.

## DONE and STOPPED

**DONE** means all six checks pass; one opaque Windows-only confinement
authority and identical offline causal recipe exist; project writes succeed
while every denied target and network path fails; the future production request
can carry but not yet use the policy; activation and all task routes remain
dark; no provider/model/credential/network action occurred; and the exact task
records and implementation land in one clean local commit.

**STOPPED** means the installed Codex CLI cannot express one project-only
permission profile without writable temp or outside roots; the production and
offline launchers cannot consume the identical policy; the stronger Windows
sandbox cannot be pinned without external setup; userData/outside/network
denial is ambiguous; safe cleanup is unclear; a public/rebrand/injected-runner
seam remains; an existing route changes; protected work changes unexpectedly;
or any external/model/credential boundary would need to be crossed.
