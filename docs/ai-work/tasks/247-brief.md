# Task 247 brief - say something true when Git refuses the project folder

**Lane:** A (the main checkout). **Base commit:** `d10805f`.

The first blocker found by actually trying to use Cairn on Cairn, which is what
Slice 5 of `docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`
exists to do. The plan's rule for this is explicit: record the first normal-path
blocker for **one bounded follow-up**, and rerun the trial. This is that task.

## What the owner saw

Opening Cairn on this repository and running a task produced, on screen:

```text
Command failed: git -c core.fsmonitor=false -c trace2.normalTarget=0 -c
trace2.eventTarget=0 -c trace2.perfTarget=0 rev-parse --git-common-dir fatal:
detected dubious ownership in repository at 'C:/Users/KenJL/Desktop/WebApp
Projects/AI Coding Workflow Framework' ... is owned by:
Obelisk/CodexSandboxOffline (S-1-5-21-...-1004) but the current user is:
OBELISK/KenJL (S-1-5-21-...-1002) To add an exception for this directory, call:
git config --global --add safe.directory '...'
```

## The diagnosis, reproduced before this brief was written

The repository's **root folder** was owned by `Obelisk\CodexSandboxOffline`
while `.git` and every subdirectory were owned by `OBELISK\KenJL`. Git's
ownership check therefore refused the worktree.

The owner already had the correct exception in `C:/Users/KenJL/.gitconfig`, and
it did nothing. Cairn scrubs `GIT_CONFIG_GLOBAL` to the null device on every Git
call (`core/src/lock.ts:64`, `core/src/candidate.ts:708`,
`core/src/serial.ts:2812`, `app/src/main/buildertrackedtext.ts:252`), so the
file holding the exception is never read.

Proved by running Cairn's exact argv twice in the same directory:

| Invocation | Result |
|---|---|
| with `GIT_CONFIG_GLOBAL=NUL`, as Cairn runs it | `fatal: detected dubious ownership` |
| identical, global config left alone | `.git`, exit 0 |

**The scrub is deliberate and is not this task's to undo.**
`serialCandidateGitEnvironmentSafe` (`core/src/candidate.ts:672`) already
permits exactly one `safe.directory` triplet to exist in Cairn's own process,
and `candidateGitEnvironment` still strips it from every child, with the stated
reason: "so even `*` cannot grant or redirect authority". A `.git/config` in a
folder owned by another account can carry `core.pager`, aliases and hooks, which
is the code-execution risk the ownership check exists to stop. Relaxing it is a
security decision, not a bug fix, and it belongs to the owner.

**So the defect is the sentence, not the check.** Cairn refuses correctly and
then prints Git's standard advice - advice Cairn's own hardening guarantees can
never work. A beginner follows it, watches it fail again, and has nowhere left
to go. That is the whole of what this task fixes.

## Requested visible outcome

When Git refuses the project folder on ownership grounds, Cairn says so in its
own words: which account owns the folder, which account the owner is, that a
global `safe.directory` entry **will not be read because Cairn does not read
global Git configuration**, and the one action that does work - making the
folder theirs again - with the exact command for their platform.

Every other Git failure keeps the message it has today.

## Boundary of intent

- **The hardening does not change.** `GIT_CONFIG_NOSYSTEM`, `GIT_CONFIG_SYSTEM`,
  `GIT_CONFIG_GLOBAL`, `serialCandidateGitEnvironmentNameDenied` and
  `serialCandidateGitEnvironmentSafe` keep their current behaviour exactly. No
  `safe.directory` is passed to any child. No `-c` is added to any invocation.
- **No new refusal.** Cairn refuses in exactly the cases it refuses today; only
  the text of one refusal changes.
- Only `core/src/lock.ts` and one new pure helper are touched, plus their tests.
  `candidate.ts`, `serial.ts` and `buildertrackedtext.ts` keep the raw message;
  the report names them so a later task can decide, and states why they are not
  the observed failure.
- No provider, model, credential, network call, dependency install, external
  write, push, or deployment.
- Not this task's: the nine Builder unit failures, `conductor.spec.ts:3314`, the
  full-suite worker-teardown EPERM.

## Why `lock.ts` is the right and sufficient place

`acquireRunLock` runs `rev-parse --git-common-dir` before any other Git call in
a run (`core/src/serial.ts:7118`), so it is where this failure actually lands -
and it is the call that produced the message above. If that `rev-parse`
succeeds, the ownership check has passed and no later call in the run can fail
this way. It is a genuine chokepoint for this specific refusal, not a convenient
one.

`buildertrackedtext.ts` is the one path that runs Git outside a run lock. Its
`runProcess` returns `null` on failure rather than throwing, so it degrades
quietly instead of showing the raw text; that is a different fault and is
recorded, not fixed here.

## Checks

1. **`c1` - red first.** A test asserting Cairn's own explanation against the
   real captured stderr fails before the change, because today the text is
   Node's `Command failed: ...` with Git's inert advice. Recorded with its
   actual failure output.
2. **`c2` - the refusal is recognised from Git's real words.** Given the exact
   stderr captured from this machine, the helper reports a match and extracts
   the repository path, the owning account, and the current account.
3. **`c3` - it does not fire on anything else.** `not a git repository`,
   a permission error, an empty string, unrelated prose, and a message merely
   containing the words "owned by" all return no match. No false positive turns
   an ordinary Git failure into ownership advice.
4. **`c4` - the message says the true thing.** It names both accounts, states
   that a global `safe.directory` entry will not be read **and why**, and gives
   the working remedy: the `Set-Acl` form on Windows, `chown` elsewhere. It
   never tells the owner to run `git config --global --add safe.directory`.
5. **`c5` - the wiring is real.** `lockFilePath` surfaces the composed message
   for an ownership refusal, and leaves every other Git failure's message
   untouched - proved by calling it against a directory that is not a
   repository and asserting the original text still arrives.
6. **`c6` - the hardening is unmoved.** A guard asserts the scrubbed
   environment still sets `GIT_CONFIG_NOSYSTEM=1` and both null config paths,
   still denies every `GIT_CONFIG_*` name, and that no invocation gained a
   `safe.directory` argument. Mutation-tested: reintroducing the global config
   must fail this guard.
7. **`c7` - nothing else regressed.** Core suite, root `typecheck` and `build`,
   and the app unit suite, each named with its exact command and real result
   against the baselines in the handoff.
8. **`c8` - the owner's own attempt.** The owner opens Cairn on this repository
   and gets past the point where it failed. This also answers Task 242's `c9`,
   which was blocked behind this and is the reason the blocker was found.

## DONE and STOPPED

**DONE** means `c1`-`c7` pass with their real output recorded, and `c8` carries
the owner's own confirmation. A passing test is not DONE for `c8`.

**STOPPED** means the honest message cannot be produced without passing
`safe.directory` to a child, relaxing the environment scrub, or adding a new
refusal - in which case say which, and stop, because that is the owner's
security decision and not this task's.

The milestone does not move here. This is the bounded repair the plan allows
after an observed blocker; the Slice 5 trial is rerun after it, not by it.
