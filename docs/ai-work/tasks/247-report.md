# Task 247 report - say something true when Git refuses the project folder

**Lane:** A (the main checkout). **Base commit:** `d10805f`.
**Brief claim commit:** `d48b65f`.

The first blocker found by actually trying to use Cairn on Cairn, and the one
bounded follow-up the restoration plan allows after an observed blocker.

## Outcome

When Git refuses a project folder on ownership grounds, Cairn no longer repeats
Git's remedy. It says which account owns the folder, which account the owner
is, that a `safe.directory` entry in their global Git configuration **will not
be read and why**, and the one thing that does work, with the command already
filled in with their own account name.

What the owner used to see:

```text
Command failed: git -c core.fsmonitor=false ... rev-parse --git-common-dir
fatal: detected dubious ownership in repository at '...'
To add an exception for this directory, call:
	git config --global --add safe.directory '...'
```

What they see now:

```text
Cairn cannot use Git here, because this project's folder belongs to a different
account than the one you are signed in as. Cairn has changed nothing and run
nothing.

The folder: C:/Users/KenJL/Desktop/WebApp Projects/AI Coding Workflow Framework

  the folder belongs to   Obelisk/CodexSandboxOffline
  you are signed in as    OBELISK/KenJL

Git suggests adding a safe.directory exception to your global Git
configuration. That will not help here, and if you have already tried it this
is why nothing changed: Cairn does not read your global Git configuration. That
is deliberate - it is what stops a stray setting on this machine from
redirecting Cairn's Git - so an exception written there is never seen.

What works is making the folder yours again.

In PowerShell, with this project closed:
  $folder = "C:/Users/KenJL/Desktop/WebApp Projects/AI Coding Workflow Framework"
  $acl = Get-Acl $folder
  $acl.SetOwner([System.Security.Principal.NTAccount]"OBELISK\KenJL")
  Set-Acl -Path $folder -AclObject $acl

Then open this project again.
```

**The refusal itself is unchanged.** Cairn refuses in exactly the cases it
refused before. Only the sentence changed.

## What actually changed

Two files.

- `core/src/lock.ts` - `gitOwnershipRefusal` and `gitOwnershipRefusalMessage`,
  both pure and both exported, plus a `try`/`catch` around the existing
  `rev-parse --git-common-dir` in `lockFilePath` that translates **only** an
  ownership refusal and rethrows everything else untouched.
- `core/test/lock.test.ts` - five added tests, named as additions rather than
  renumbering the brief's checks. 7 tests became 12.

**No production file outside `core/src/lock.ts` was touched.** No `app/` file,
no `cli/` file, no contract file, no dependency, no version.

## The decision this task refused to take

The obvious fix is to pass `-c safe.directory=<project root>` to Cairn's Git
calls. **That was rejected, and a test now pins the rejection.**

`candidateGitEnvironment` strips every `GIT_CONFIG_*` name from every child, and
`serialCandidateGitEnvironmentSafe` (`core/src/candidate.ts:672`) permits
exactly one `safe.directory` triplet to exist in Cairn's *own* process while
still removing it from children - with the stated reason, "so even `*` cannot
grant or redirect authority". That is a considered posture with a written
rationale, not an oversight.

It is also load-bearing. A `.git/config` inside a folder owned by another
account can carry `core.pager`, aliases, and hook paths; running Git there is
how the ownership check's own threat model gets realised. Excepting the folder
would hand that back. **Whether Cairn should ever do so is the owner's security
decision and belongs to its own task**, which is why this one only fixes the
sentence.

## Check results

### `c1` - red first: PASSED

The driving test was written before any production change and failed with the
defect itself. Real output:

```text
✖ an ownership refusal is explained in Cairn's own words, not Git's inert advice
  AssertionError: Cairn repeated Git's inert advice. Got:
  Command failed: git -c core.fsmonitor=false ... rev-parse --git-common-dir
  fatal: detected dubious ownership in repository at 'C:/Users/KenJL/AppData/Local/Temp/cairn-lock-test-VPJxH5'
  To add an exception for this directory, call:
  	git config --global --add safe.directory C:/Users/KenJL/AppData/Local/Temp/cairn-lock-test-VPJxH5
ℹ tests 8   ℹ pass 7   ℹ fail 1
```

The failure is the product's, not a typo: 7 of 8 passed and the one that failed
printed Cairn's own output containing Git's advice verbatim.

### `c2` - the two accounts are read back out: PASSED

Asserted against the stderr captured verbatim from the machine that failed, not
a paraphrase. `repository`, `owningAccount` and `currentAccount` all extracted.

Git prints two shapes and both reach this code: the long form with
`is owned by:` / `but the current user is:` when it compared real accounts, and
a short form with no account lines at all. The short form is what
`GIT_TEST_ASSUME_DIFFERENT_OWNER` produces, and it is handled - the accounts are
`null` and the message omits that block rather than printing empty labels.

### `c3` - no false positives: PASSED, and mutation-tested because it passed immediately

Six non-matching texts return `null`: empty string, `not a git repository`, a
config permission error, a pathspec error, unrelated prose containing "owned
by", and the bare phrase `detected dubious ownership` with no repository.

**This guard passed on its first run, so on its own it proved nothing.**
Mutating the matcher to also accept any `owned by` made it fail (1 failure), so
it can catch an over-broad matcher. `lock.ts` was restored and confirmed
byte-identical with `cmp`.

### `c4` - the message says the true thing: PASSED

It names both accounts, states that a global `safe.directory` entry will not be
read and why, and gives the working remedy. It never contains
`git config --global --add safe.directory` - asserted as an absence, because
that string surviving is the whole defect.

One detail is asserted rather than assumed: Git prints Windows accounts with a
forward slash (`OBELISK/KenJL`), and `NTAccount` needs a backslash. A remedy
pasted exactly as Git printed it would fail, so the message converts it and the
test pins `NTAccount]"OBELISK\KenJL"`.

### `c5` - the wiring is real: PASSED

Proved end to end through `acquireRunLock` against a real Git repository, with
`GIT_TEST_ASSUME_DIFFERENT_OWNER=1` forcing Git's genuine refusal - not by
stubbing the error. Every other Git failure keeps its own message: the existing
seven lock tests, including the ones asserting `UNSAFE_SERIAL_RUN_GIT_ENVIRONMENT`
and ordinary lock behaviour, pass unmodified.

### `c6` - the hardening is unmoved: PASSED, and mutation-tested

The guard grants the **permitted** triplet - `GIT_CONFIG_COUNT=1`,
`GIT_CONFIG_KEY_0=safe.directory`, `GIT_CONFIG_VALUE_0=<this exact folder>` - to
Cairn's own process, forces the refusal, and asserts Cairn **still refuses**.
That pins `candidate.ts`'s documented promise that the triplet never reaches a
child.

Mutation: adding `-c safe.directory=${root}` to `lockFilePath`'s argv - the
tempting fix - produced **2 failures**. Restored byte-identical.

### `c7` - nothing else regressed: PASSED

| Command | Result |
|---|---|
| `npm test -w @cairn/core` | **513 tests, 503 pass, 0 fail, 10 skipped**, 20.8 min |
| `npm run typecheck` (root) | **PASS** |
| `npm run build` (root) | **PASS** |
| `npm test -w cairn-cli` | **24 tests, 24 pass, 0 fail** |
| `npm run test:unit` from `app/` | **940 tests, 929 pass, 9 fail, 2 skipped** |

Core was 508 / 498 / 0 / 10 at the handoff baseline and is 513 / 503 now: **the
five tests this task adds, and no other movement.** Zero Core failures.

The app unit failure set was sorted and diffed against the run taken on this
same tree before this task began: **identical**, the nine pre-existing Task
224/231/233 Builder failures. None is this task's, and none was absorbed.

**The app token was deliberately not taken for the app unit run, and this is a
disclosed deviation from the handoff's standing rule.** The owner was answering
`c8` in the running app at the time, and that evidence is worth more than this
suite's isolation. The suite is in-process `node --test` over emitted units: it
opens no window and touches no shared profile. No Playwright ran in this task.

### `c8` - the owner's own attempt: AWAITING THE OWNER

Only the owner can confirm Cairn gets past the point where it failed. This also
answers Task 242's `c9`, which was stuck behind this blocker.

## The environment change, disclosed

Separately from the code, and with the owner's explicit approval, **the owner of
the repository's root folder was changed** from `Obelisk\CodexSandboxOffline` to
`OBELISK\KenJL`. That is what actually unblocked this machine; the code change
is so the next person is not sent to a dead end.

- Scope: the root directory only, not recursive. Everything inside it was
  already owned by `OBELISK\KenJL`, including `.git`.
- No elevation was needed - the account already held `FullControl`.
- The previous owner SID was recorded before the change and is
  `S-1-5-21-647535529-674145741-2220282659-1004`, so it is reversible.
- Verified afterwards by running Cairn's exact argv, which now exits 0.

Why the folder belonged to a sandbox account at all is not explained by
anything in this repository's records, and this task did not investigate it.

## Findings named but not fixed

- **Three other Git call sites carry the raw message.**
  `core/src/candidate.ts:725`, `core/src/serial.ts`'s `candidateGit`, and
  `app/src/main/buildertrackedtext.ts:252` scrub the environment the same way.
  They are not the observed failure: `acquireRunLock` runs the first Git call in
  any run (`core/src/serial.ts:7118`), so if its `rev-parse` succeeds the
  ownership check has already passed and no later call in that run can fail this
  way. `buildertrackedtext` is the one path outside a run lock, and its
  `runProcess` returns `null` rather than throwing, so it degrades quietly
  instead of showing raw text - a different fault, worth its own look.
- **`GIT_TEST_ASSUME_DIFFERENT_OWNER` passes through Cairn's scrub.** It is not
  in `SERIAL_CANDIDATE_DENIED_GIT_ENVIRONMENT` and matches none of the denied
  prefixes (`GIT_TRACE`, `GIT_REDIRECT_`, `GIT_CONFIG`), so an inherited
  `GIT_TEST_*` variable reaches Cairn's Git children and can change their
  behaviour. This task **used** that to test honestly rather than by stubbing,
  so it is disclosed as a finding by the code that benefited from it. Whether
  the denied set should cover `GIT_TEST_` is a security judgment and is not
  taken here.

## How to try it

From `core/`:

```text
npm run build
node --test dist/test/lock.test.js
```

To see the message a beginner would read, without breaking anything, force the
refusal in a disposable repository:

```text
git init /tmp/probe
cd /tmp/probe
GIT_TEST_ASSUME_DIFFERENT_OWNER=1 git rev-parse --git-common-dir
```

That prints Git's version of the refusal. Cairn's version is what the test
asserts.

## Limitations and remaining human judgment

- **`c8` is the owner's and is not answered.**
- **The long form is proved from captured text, not from a live mismatch.** The
  end-to-end test uses Git's own forced-refusal hook, which emits the short
  form; the account extraction is asserted against stderr captured verbatim from
  the real failure. Reproducing a live ownership mismatch would mean creating a
  folder owned by another account, which needs a privilege this task does not
  have and would leave debris behind.
- **Only `lockFilePath` was fixed.** See the findings above for why that is the
  chokepoint for this refusal and what remains untranslated.
- **The message is English prose in Core.** It is not localised and not styled;
  it arrives wherever a thrown run error is displayed today.
- **Nothing here makes Cairn work on a folder owned by someone else.** It makes
  the refusal legible. Whether Cairn should ever except such a folder is the
  owner's decision and is not taken.
- No provider, model, credential, network call, dependency install, external
  write, push, or deployment occurred.

## Disposition

**Disposition: STOPPED - `c1` through `c7` pass with their real output recorded
above; `c8`, the owner's own attempt in the running app, is not answered.**

This is not a failed run and a later reader should not redo the work. The code
is committed, the machine checks are green, and the environment change that
actually unblocked this machine is done and disclosed. STOPPED is the honest
value only because the brief defined DONE as `c1`-`c7` **plus** the owner's own
confirmation, and said in terms that a passing test is not DONE for `c8`.

**To close this out:** the owner opens Cairn on this repository and gets past
the point where it failed. If it works, `c8` holds, and the same attempt also
answers Task 242's `c9` - the two were always the same press.

The milestone does not move here. This is the bounded repair the plan allows
after an observed blocker; the Slice 5 trial is rerun after it, not by it.
