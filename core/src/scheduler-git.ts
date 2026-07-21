import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, lstatSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

export class SchedulerGitError extends Error {
  constructor(public readonly code: string, message: string) {
    super(`${code}: ${message}`);
  }
}

export function schedulerGit(root: string, args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    const detail = error as { stderr?: string | Buffer; message?: string };
    const stderr = typeof detail.stderr === "string" ? detail.stderr : detail.stderr?.toString("utf8");
    throw new SchedulerGitError("GIT_COMMAND_FAILED", (stderr || detail.message || args.join(" ")).trim());
  }
}

export function schedulerGitDir(root: string): string {
  return resolve(root, schedulerGit(root, ["rev-parse", "--git-common-dir"]));
}

export function pathInside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function assertCleanMain(root: string): string {
  if (schedulerGit(root, ["rev-parse", "--show-toplevel"]).replace(/\\/g, "/").toLocaleLowerCase("en-US") !==
      resolve(root).replace(/\\/g, "/").toLocaleLowerCase("en-US")) {
    throw new SchedulerGitError("PROJECT_ROOT_MISMATCH", "The selected folder is not the main Git worktree root.");
  }
  if (schedulerGit(root, ["branch", "--show-current"]) !== "main") {
    throw new SchedulerGitError("MAIN_REQUIRED", "The scheduler supports only a clean main branch.");
  }
  if (schedulerGit(root, ["status", "--porcelain=v1", "--untracked-files=all"])) {
    throw new SchedulerGitError("PROTECTED_WORK_PRESENT", "Commit or otherwise finish the existing modified and untracked work first; Cairn will not hide it.");
  }
  const gitDir = schedulerGitDir(root);
  for (const marker of ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-apply", "rebase-merge"]) {
    if (existsSync(resolve(gitDir, marker))) {
      throw new SchedulerGitError("GIT_OPERATION_ACTIVE", `An unfinished Git operation is present (${marker}).`);
    }
  }
  return schedulerGit(root, ["rev-parse", "refs/heads/main"]);
}

export function assertNoReparsePath(root: string, relPath: string): void {
  let current = resolve(root);
  for (const part of relPath.split("/").slice(0, -1)) {
    current = resolve(current, part);
    if (!existsSync(current)) continue;
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || (!stat.isDirectory() && current !== resolve(root, relPath))) {
      throw new SchedulerGitError("UNSAFE_PATH", `A declared path crosses a symlink or non-directory parent: ${relPath}`);
    }
  }
}

export function changedPaths(worktree: string, baseCommit: string): { paths: string[]; destructive: string[] } {
  const committed = schedulerGit(worktree, ["diff", "--name-only", `${baseCommit}..HEAD`])
    .split(/\r?\n/).filter(Boolean).map((path) => path.replace(/\\/g, "/"));
  const raw = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
    cwd: worktree, encoding: "utf8",
  }).split("\0").filter(Boolean);
  const working: string[] = [];
  const destructive: string[] = [];
  const summaries = [
    schedulerGit(worktree, ["diff", "--summary", `${baseCommit}..HEAD`]),
    schedulerGit(worktree, ["diff", "--summary"]),
  ].flatMap((value) => value.split(/\r?\n/).filter(Boolean));
  destructive.push(...summaries.filter((line) => /delete mode|rename |copy |mode change/i.test(line)));
  for (let index = 0; index < raw.length; index += 1) {
    const entry = raw[index];
    const code = entry.slice(0, 2);
    const path = entry.slice(3).replace(/\\/g, "/");
    working.push(path);
    if (/[DRC]/.test(code)) destructive.push(path);
    if (/[RC]/.test(code) && raw[index + 1]) index += 1;
  }
  return { paths: [...new Set([...committed, ...working])].sort(), destructive: [...new Set(destructive)].sort() };
}

export function commitExact(worktree: string, paths: string[], message: string): string {
  if (paths.length === 0) throw new SchedulerGitError("EMPTY_COMMIT", "No exact paths were supplied for the task commit.");
  schedulerGit(worktree, ["add", "--", ...paths]);
  schedulerGit(worktree, ["commit", "-m", message]);
  return schedulerGit(worktree, ["rev-parse", "HEAD"]);
}

function filteredEnvironment(): NodeJS.ProcessEnv {
  const filtered = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
    name !== "NODE_TEST_CONTEXT" &&
    !/(?:TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL|AUTH|COOKIE|SESSION)/i.test(name)));
  // A Node test worker marks its process through this internal variable. An
  // inherited worker value can make a nested declared check report through the
  // parent harness instead of its own exit code, so declared checks never
  // inherit it.
  return filtered;
}

export interface ShellFreeCheck { executable: string; args: string[] }

export function validateShellFreeCheck(check: ShellFreeCheck): ShellFreeCheck {
  const executable = check.executable.trim().toLocaleLowerCase("en-US");
  if (!["node", "node.exe", "npm", "npm.cmd"].includes(executable)) {
    throw new SchedulerGitError("CHECK_EXECUTION_UNSAFE", `Executable is outside the scheduler allowlist: ${check.executable}`);
  }
  if (!Array.isArray(check.args) || check.args.length === 0 || check.args.some((arg) =>
    typeof arg !== "string" || !arg || /[\r\n\0]/.test(arg))) {
    throw new SchedulerGitError("CHECK_EXECUTION_UNSAFE", "Every check argument must be one nonblank literal value.");
  }
  if (executable.startsWith("node")) {
    if (check.args[0] !== "--test" || check.args.slice(1).some((arg) => arg.startsWith("-") || /[*?{}$`|;&<>]/.test(arg))) {
      throw new SchedulerGitError("CHECK_EXECUTION_UNSAFE", "Node checks must use --test followed only by exact test paths.");
    }
  } else {
    const first = check.args[0];
    if (!(first === "test" || first === "run") || check.args.some((arg) => /[*?{}$`|;&<>]/.test(arg))) {
      throw new SchedulerGitError("CHECK_EXECUTION_UNSAFE", "npm checks may use only test or run with literal arguments.");
    }
    if (check.args.some((arg) => /^(?:install|i|ci|publish|exec)$/i.test(arg))) {
      throw new SchedulerGitError("CHECK_EXECUTION_UNSAFE", "Package installation, execution, and publishing are not scheduler checks.");
    }
  }
  return { executable: check.executable, args: [...check.args] };
}

export function runShellFreeChecks(worktree: string, checks: ShellFreeCheck[]): void {
  for (const raw of checks) {
    const check = validateShellFreeCheck(raw);
    const result = spawnSync(check.executable, check.args, {
      cwd: worktree,
      shell: false,
      encoding: "utf8",
      env: filteredEnvironment(),
      windowsHide: true,
    });
    if (result.error || result.status !== 0) {
      const detail = (result.stderr || result.stdout || result.error?.message || "").trim();
      throw new SchedulerGitError("CHECK_FAILED", `${check.executable} ${check.args.join(" ")} failed: ${detail}`);
    }
  }
}
