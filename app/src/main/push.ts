import { spawnSync } from "node:child_process";
import type { PushPreview, PushResult } from "../shared/ipc.js";

/**
 * One raw git invocation's result — the seam Task 10's unit tests inject to
 * prove stderr classification and no-retry without touching a real remote.
 * Everything in this module that talks to git goes through this shape;
 * `realExec` is the only implementation that actually spawns a process.
 */
export type ExecResult = { status: number; stdout: string; stderr: string };
export type ExecFn = (args: string[]) => ExecResult;

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

  return { remote, url, branch, ahead, subjects };
}

const AUTH_PATTERN = /Authentication failed|could not read (Username|Password)|Permission denied/;
const REMOTE_AHEAD_PATTERN = /fetch first|non-fast-forward|\[rejected\]/;
// Not part of the plan's named stderr regexes: a plain `git init` directory
// (no remote at all) is a DIFFERENT git error than auth or remote-ahead, and
// the fixture recipe requires it read as "no-remote" rather than falling
// into the "other" catch-all. Checked after auth/remote-ahead, before the
// final "other" fallback, so it never shadows either named case.
const NO_REMOTE_PATTERN = /No configured push destination|has no upstream branch/;

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
 */
export function pushExecute(dir: string, exec: ExecFn = realExec(dir)): PushResult {
  const result = exec(["push"]);

  if (result.status === 0) {
    return { ok: true, summary: summarizeSuccess(result.stderr) };
  }
  if (AUTH_PATTERN.test(result.stderr)) {
    return {
      ok: false,
      kind: "auth",
      message: "Cairn could not sign in to the remote to push. Sign in again — refresh your saved credentials or SSH key — then try the push again.",
    };
  }
  if (REMOTE_AHEAD_PATTERN.test(result.stderr)) {
    return {
      ok: false,
      kind: "remote-ahead",
      message: "The remote has commits this project does not have yet. Fetch and merge or rebase locally, then try the push again.",
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
