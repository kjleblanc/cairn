import { spawnSync } from "node:child_process";
import type { PushPreview, PushResult } from "../shared/ipc.js";
import { pendingRunRefusal } from "./pendingrun.js";

/**
 * One raw git invocation's result — the seam Task 10's unit tests inject to
 * prove stderr classification and no-retry without touching a real remote.
 * Everything in this module that talks to git goes through this shape;
 * `realExec` is the only implementation that actually spawns a process.
 */
export type ExecResult = { status: number; stdout: string; stderr: string };
export type ExecFn = (args: string[]) => ExecResult;

/** Main-owned pending-result refusal in the existing PushResult envelope.
 * Callers receive no pending state, hash, or authority object. */
export function pendingPushRefusal(dir: string): PushResult | null {
  const message = pendingRunRefusal(dir);
  return message === null ? null : { ok: false, kind: "refused", message };
}

/** `GIT_TERMINAL_PROMPT=0` on every invocation so a credential prompt can
 * never hang a run — the same idiom `core/src/serial.ts`'s `git()` helper
 * uses. Bound to `dir` so callers can pass just an args array. */
function realExec(dir: string): ExecFn {
  return (args: string[]): ExecResult => {
    const res = spawnSync("git", args, {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
    return { status: res.status ?? 1, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
  };
}

/**
 * Local-only and network-free: every command here reads local refs, none of
 * them contacts the remote. Returns null when the current branch has no
 * upstream configured (`@{u}` fails) — nothing to preview, nothing to push.
 */
export function pushPreview(dir: string, exec: ExecFn = realExec(dir)): PushPreview | null {
  if (pendingPushRefusal(dir) !== null) return null;
  const upstream = exec(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  if (upstream.status !== 0) return null;

  const ref = upstream.stdout.trim();
  const slash = ref.indexOf("/");
  const remote = slash === -1 ? ref : ref.slice(0, slash);
  const branch = slash === -1 ? ref : ref.slice(slash + 1);

  const urlResult = exec(["remote", "get-url", remote]);
  const url = urlResult.status === 0 ? urlResult.stdout.trim() : "";

  const aheadResult = exec(["rev-list", "--count", "@{u}..HEAD"]);
  const parsedAhead = Number.parseInt(aheadResult.stdout.trim(), 10);
  const ahead = Number.isFinite(parsedAhead) ? parsedAhead : 0;

  const subjectsResult = exec(["log", "@{u}..HEAD", "--format=%s"]);
  const subjects = subjectsResult.stdout.split(/\r?\n/).filter((line) => line.length > 0);

  const headResult = exec(["rev-parse", "HEAD"]);
  const head = headResult.status === 0 ? headResult.stdout.trim() : "";

  return { remote, url, branch, ahead, subjects, head };
}

/**
 * Network-free: does `dir` actually have a remote by this name? The push
 * handler asks before running anything, because git accepts a URL wherever a
 * remote NAME is expected — so an unchecked string reaching argv means the
 * main process no longer bounds where a push can go (repo task 076's review
 * finding). Fail-closed: if `git remote` itself cannot be read, the answer is
 * no, and nothing is pushed.
 */
export function remoteIsConfigured(dir: string, remote: string, exec: ExecFn = realExec(dir)): boolean {
  if (remote.length === 0) return false;
  const result = exec(["remote"]);
  if (result.status !== 0) return false;
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).includes(remote);
}

/**
 * The head the panel disclosed, as git itself writes one: a hex object name
 * and nothing else. Anything else in this field is refspec SYNTAX reaching
 * argv, and two shapes were verified against real git 2.52 (repo task 077's
 * review finding):
 *
 * - `+<sha>` makes the push a FORCED update — the origin's tip was rewound in
 *   a throwaway repo — contradicting this module's own "never forced" promise
 *   and the sentence Cairn shows the owner while it runs.
 * - `""` makes the whole refspec `:refs/heads/<branch>`, which git reads as a
 *   branch DELETION. The probe was stopped only by the receiving repository's
 *   `denyDeleteCurrent`, which protects one branch of one remote and nothing
 *   else.
 *
 * The `--` terminator does not help: `+` is refspec syntax, not option syntax.
 */
const HEAD_OBJECT = /^[0-9a-f]{7,64}$/;

/**
 * A plain ref component: no refspec punctuation (`+`, `:`), no pattern or
 * revision syntax (`*`, `?`, `[`, `~`, `^`, `@{`), no whitespace, and no
 * leading `-` for argv to read as an option. Written as an allowlist rather
 * than a denylist so a character nobody thought of is refused rather than
 * waved through, and wide enough for every ordinary branch name
 * (`main`, `feature/x-y`, `release/1.2.3`).
 */
const REF_COMPONENT = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

/**
 * Is this preview safe to interpolate into a refspec? Cairn bounds not only
 * WHERE a push may go but WHAT it may send: both halves arrive over IPC, and
 * neither may be inferable from a string a caller supplied.
 *
 * Fail-closed, and defensive about the shape itself — a caller that sends
 * something other than a preview is refused rather than throwing.
 */
export function pushTargetIsWellFormed(preview: PushPreview): boolean {
  const head = typeof preview?.head === "string" ? preview.head : "";
  const branch = typeof preview?.branch === "string" ? preview.branch : "";
  if (!HEAD_OBJECT.test(head)) return false;
  if (!REF_COMPONENT.test(branch)) return false;
  // `..` is revision-range syntax and `.lock` is git's own reserved suffix;
  // both are made of characters the allowlist permits on their own.
  if (branch.includes("..") || branch.endsWith(".lock")) return false;
  if (branch.endsWith("/") || branch.endsWith(".")) return false;
  return true;
}

/** Cairn's own plain refusal, when it will not hand this target to git. */
const REFUSED_TARGET = "Cairn did not run this push. It was aimed at a target this project has no remote for, and Cairn only pushes to a remote the project itself has configured.";
// The limit is Cairn's own, and the sentence has to say so: `REF_COMPONENT` is
// stricter than git's `check-ref-format`, so a perfectly legal branch name — a
// non-ASCII one, `issue#42`, `feat+x` — reaches this refusal through no fault
// of the owner's repository. The earlier wording ("was not in the form Cairn
// sends to git") read as though their project were malformed.
const REFUSED_SHAPE = "Cairn did not run this push, so nothing was published. Cairn sends only a plain commit id and a branch name that starts with a letter or a number and is made of letters, numbers, dots, dashes, underscores, and slashes. A branch name git accepts can still be outside that: the limit is Cairn's, not a problem with this project.";

/**
 * The whole pre-flight, in one place: the reason to refuse, or null to go
 * ahead. Both refusals are `kind: "refused"` — Cairn declined before git ran,
 * so the words are entirely Cairn's own and there is no git output to label.
 * Neither names the offending value: it came from outside this process, and
 * putting it on a screen would put words there Cairn did not choose. The
 * handler logs it instead.
 *
 * Shape is checked before the remote, so a malformed target costs no git call.
 */
export function pushRefusal(dir: string, preview: PushPreview, exec: ExecFn = realExec(dir)): PushResult | null {
  if (!pushTargetIsWellFormed(preview)) return { ok: false, kind: "refused", message: REFUSED_SHAPE };
  const remote = typeof preview?.remote === "string" ? preview.remote : "";
  if (!remoteIsConfigured(dir, remote, exec)) return { ok: false, kind: "refused", message: REFUSED_TARGET };
  return null;
}

const AUTH_PATTERN = /Authentication failed|could not read (Username|Password)|Permission denied/;
const REMOTE_AHEAD_PATTERN = /fetch first|non-fast-forward|\[rejected\]/;
// Not part of the plan's named stderr regexes: a plain `git init` directory
// (no remote at all) is a DIFFERENT git error than auth or remote-ahead, and
// the fixture recipe requires it read as "no-remote" rather than falling
// into the "other" catch-all. Checked after auth/remote-ahead, before the
// final "other" fallback, so it never shadows either named case.
//
// Matches ONLY the "no remote at all" message (verified against real git:
// `fatal: No configured push destination.`) — deliberately NOT the sibling
// "fatal: ... has no upstream branch" message, which fires when a remote IS
// configured but the current branch just isn't tracking it. That is a
// different, true state and this bucket's message asserts "no remote
// configured"; conflating the two would make the message false for the
// untracked-branch case (repo task 073's review-fix finding). That case now
// falls into "other", which reports git's own real wording instead.
//
// Repo task 075 narrowed its REACH, not its wording: git only says "No
// configured push destination" for a bare `git push`, and this module now
// always names the remote, so real git no longer produces it. The pattern and
// its message are kept unchanged — the `kind` union is fixed by the plan, the
// classifier stays proven by an injected-exec test, and the sentence remains
// true whenever it does fire. A push naming a remote that does not exist says
// something different (`fatal: '<remote>' does not appear to be a git
// repository`) and now correctly reports git's own words through `other`,
// rather than being folded into a bucket that would assert more than git did.
const NO_REMOTE_PATTERN = /No configured push destination/;

function firstLine(text: string): string {
  const line = text.split(/\r?\n/).find((l) => l.trim().length > 0);
  return line ? line.trim() : "";
}

/** Built only from the one push attempt's own output — git writes its
 * ref-update line ("To <url>\n   <old>..<new>  <branch> -> <branch>") to
 * stderr on success, never to stdout. Falls back to generic wording if the
 * shape is ever unrecognized (a fresh branch with no prior remote ref, for
 * instance) rather than failing the whole call over a cosmetic mismatch. */
function summarizeSuccess(stderr: string): string {
  const urlMatch = /^To\s+(\S+)/m.exec(stderr);
  const refMatch = /(\S+)\s*->\s*(\S+)/.exec(stderr);
  const branch = refMatch ? refMatch[2] : "the branch";
  const url = urlMatch ? urlMatch[1] : "the remote";
  return `Pushed ${branch} to ${url}.`;
}

/**
 * One plain `git push` — never retried, never forced, whatever the outcome.
 * The owner asked for exactly one push and gets exactly one git invocation,
 * full stop; classification below only reads what that single call reported.
 *
 * The refspec is pinned at BOTH ends to the preview the owner approved, and
 * the preview is taken whole so no caller can assemble a target out of pieces
 * from different reads:
 *
 * - **Destination** (`remote`, `branch`), rather than a bare `git push`, whose
 *   behaviour belongs to the machine's `push.default` (repo task 075's review
 *   finding): under `matching` a bare push publishes every same-named branch —
 *   commits the panel never listed — and under `current` it can push to a
 *   remote branch other than the `@{u}` branch the panel named.
 * - **Source** (`head`), rather than `HEAD`, which is a moving target (repo
 *   task 076's review finding): a commit made, or a branch checked out,
 *   between the panel being read and approved would otherwise publish under an
 *   approval given for something else.
 *
 * What runs is therefore what was disclosed, on any machine and whatever the
 * working tree has done since.
 */
export function pushExecute(dir: string, preview: PushPreview, exec: ExecFn = realExec(dir)): PushResult {
  const pending = pendingPushRefusal(dir);
  if (pending !== null) return pending;
  const result = exec(["push", preview.remote, `${preview.head}:refs/heads/${preview.branch}`]);

  if (result.status === 0) {
    return { ok: true, summary: summarizeSuccess(result.stderr) };
  }
  if (AUTH_PATTERN.test(result.stderr)) {
    return {
      ok: false,
      kind: "auth",
      // These two sentences say what to put right and stop there. They used to
      // end "then try the push again", which pointed at a control that does not
      // exist: the settled outcome carries no button, because Cairn never
      // retries a push and a second attempt is a new decision that gets its own
      // confirmation (repo task 075's review finding).
      message: "Cairn could not sign in to the remote to push. Nothing was published. Refresh your saved credentials or SSH key before the next push.",
    };
  }
  if (REMOTE_AHEAD_PATTERN.test(result.stderr)) {
    return {
      ok: false,
      kind: "remote-ahead",
      message: "The remote has commits this project does not have yet. Nothing was published. Fetch and merge or rebase locally before the next push.",
    };
  }
  if (NO_REMOTE_PATTERN.test(result.stderr)) {
    return {
      ok: false,
      kind: "no-remote",
      message: "This project has no remote configured, so there is nothing to push to.",
    };
  }
  return {
    ok: false,
    kind: "other",
    message: `The push did not complete. ${firstLine(result.stderr) || "No further detail was available."}`,
  };
}
