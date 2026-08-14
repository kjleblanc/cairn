import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { taskRequestView, type RequirementSource, type TaskIntent } from "./intent.js";

export const SERIAL_TASK_PROMISES_VERSION = "cairn-serial-task-promises/v1" as const;

/**
 * How one displayed row will be answered. Either Cairn runs one check from the
 * project's own small menu, or the owner looks at it personally. There is no
 * third kind: a worker's word is never a verification, only a claim recorded
 * beside one of these.
 */
export type SerialTaskPromiseVerificationV1 =
  | Readonly<{ kind: "cairn-check"; checkId: string }>
  | Readonly<{ kind: "owner-observation" }>;

export type SerialTaskPromiseV1 = Readonly<{
  id: `c${number}`;
  text: string;
  source: RequirementSource;
  verification: SerialTaskPromiseVerificationV1;
}>;

/**
 * The run-local promises the owner accepted, in the order they were accepted.
 * Deliberately NOT the `cairn-serial-task/v4` Task Spec: that route's authority
 * rejects every evidence procedure that is not an adapter-command attestation,
 * so it cannot carry an owner-observation row at all, and its DONE path is
 * gated on process-event custody this slice does not have.
 */
export type SerialTaskPromisesV1 = Readonly<{
  version: typeof SERIAL_TASK_PROMISES_VERSION;
  rows: readonly SerialTaskPromiseV1[];
}>;

/**
 * `c1` is the accepted outcome; every accepted blocking requirement follows in
 * order. Nothing is merged, truncated, or dropped to keep the card small, and
 * no row is demoted to a preference: the caller supplies exactly one
 * verification per row or gets nothing back.
 */
export type ProjectCheckIdV1 = "typecheck" | "build" | "unit-tests";

export type ProjectCheckV1 = Readonly<{
  id: ProjectCheckIdV1;
  /** Owner-facing, plain words. */
  label: string;
  /** The npm script name Cairn will ask the project to run. */
  script: string;
  /** Exactly what Cairn will run, for display. */
  command: string;
}>;

/**
 * Cairn's whole verification vocabulary. It is a FIXED list, not a language:
 * Cairn only ever runs `npm run <one of these three names>`, so neither the
 * owner, the conductor, nor the worker can introduce a command. A project
 * decides what its own `typecheck` does — the same trust any CI places in a
 * repository's scripts — but it cannot add a fourth entry here.
 */
const KNOWN_PROJECT_CHECKS: readonly ProjectCheckV1[] = Object.freeze([
  Object.freeze({
    id: "typecheck" as const,
    label: "Check the code still compiles",
    script: "typecheck",
    command: "npm run typecheck",
  }),
  Object.freeze({
    id: "build" as const,
    label: "Build the project",
    script: "build",
    command: "npm run build",
  }),
  Object.freeze({
    id: "unit-tests" as const,
    label: "Run the project's fast unit tests",
    script: "test:unit",
    command: "npm run test:unit",
  }),
]);

/**
 * The checks this project can actually answer, in Cairn's own fixed order. A
 * project that declares none gets an empty menu, and the honest consequence is
 * that its rows fall to owner observation rather than to an invented check.
 */
export function projectCheckMenu(projectRoot: string): readonly ProjectCheckV1[] {
  let scripts: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return Object.freeze([]);
    const declared = (parsed as { scripts?: unknown }).scripts;
    if (declared === null || typeof declared !== "object" || Array.isArray(declared)) return Object.freeze([]);
    scripts = declared as Record<string, unknown>;
  } catch {
    // No package.json, unreadable, or not JSON. Offer nothing rather than guess.
    return Object.freeze([]);
  }
  return Object.freeze(KNOWN_PROJECT_CHECKS.filter((check) => {
    if (!Object.hasOwn(scripts, check.script)) return false;
    const value = scripts[check.script];
    return typeof value === "string" && value.trim().length > 0;
  }));
}

/**
 * The default bound on one check. The envelope runs checks inside the still-open
 * serial run, holding its lock, so an unbounded check is a task the owner cannot
 * get out of. Past the cap the row is `unfinished` — never `passed`, and never
 * blamed on the worker.
 */
export const PROJECT_CHECK_DEFAULT_CAP_MS = 120_000;
const ELAPSED_TICK_MS = 1_000;
/** Past this, a kill Cairn cannot confirm still returns an honest `unfinished`. */
const KILL_GRACE_MS = 5_000;

export type SerialProjectCheckResultV1 = Readonly<{
  checkId: ProjectCheckIdV1;
  label: string;
  command: string;
  status: "passed" | "failed" | "unfinished";
  /** Null exactly when the check never finished. */
  exitCode: number | null;
  durationMs: number;
}>;

/**
 * Killing only the shim would orphan the real `npm` process and its children,
 * so the whole tree goes. Same shape as the worker adapter's own tree kill.
 *
 * Resolves once the kill has been issued AND the child has been reaped, because
 * the caller resumes a still-open serial run on this promise: returning while a
 * killed check could still be writing the workspace would let Cairn verify Git
 * underneath a live writer.
 */
function killCheckProcessTree(child: ChildProcess): Promise<void> {
  if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }
  const reaped = new Promise<void>((done) => {
    if (child.exitCode !== null || child.signalCode !== null) { done(); return; }
    child.once("close", () => done());
    child.once("error", () => done());
  });
  if (process.platform === "win32") {
    const systemRoot = process.env.SystemRoot ?? process.env.windir ?? "C:\\Windows";
    const taskkill = resolve(systemRoot, "System32", "taskkill.exe");
    try {
      const killer = spawn(
        existsSync(taskkill) ? taskkill : "taskkill",
        ["/PID", String(child.pid), "/T", "/F"],
        { stdio: "ignore", windowsHide: true },
      );
      killer.once("error", () => { try { child.kill(); } catch { /* already gone */ } });
    } catch {
      try { child.kill(); } catch { /* already gone */ }
    }
  } else {
    // The child leads its own group (spawned detached below), so a negative PID
    // reaches every descendant it started.
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      try { child.kill("SIGKILL"); } catch { /* already gone */ }
    }
  }
  return reaped;
}

/**
 * Run one menu check and report what happened. Cairn runs this itself, inside
 * the open run: the result is Cairn's own finding, never the worker's claim.
 *
 * Output is deliberately discarded. Cairn keeps the exit status and the elapsed
 * time and nothing else, which is what its privacy sentence already promises
 * about commands, stdout, and stderr.
 */
export async function runProjectCheck(
  projectRoot: string,
  check: ProjectCheckV1,
  options: {
    capMs?: number;
    signal?: AbortSignal;
    onElapsed?: (elapsedMs: number) => void;
  } = {},
): Promise<SerialProjectCheckResultV1> {
  const capMs = options.capMs ?? PROJECT_CHECK_DEFAULT_CAP_MS;
  const startedAt = Date.now();
  const close = (status: SerialProjectCheckResultV1["status"], exitCode: number | null): SerialProjectCheckResultV1 =>
    Object.freeze({
      checkId: check.id,
      label: check.label,
      command: check.command,
      status,
      exitCode,
      durationMs: Date.now() - startedAt,
    });

  return await new Promise<SerialProjectCheckResultV1>((settle) => {
    let child: ChildProcess;
    try {
      // The command line is built only from Cairn's own frozen script names, so
      // nothing the owner, conductor, or worker wrote reaches it. On Windows a
      // `.cmd` shim cannot be spawned without a shell at all; naming cmd.exe
      // explicitly keeps that path as narrow as the POSIX one.
      child = process.platform === "win32"
        ? spawn(
          process.env.ComSpec ?? "cmd.exe",
          ["/d", "/s", "/c", `npm run ${check.script}`],
          { cwd: projectRoot, stdio: "ignore", windowsHide: true },
        )
        : spawn("npm", ["run", check.script], { cwd: projectRoot, stdio: "ignore", detached: true });
    } catch {
      settle(close("unfinished", null));
      return;
    }

    let settled = false;
    let stopping = false;
    const ticker = setInterval(() => options.onElapsed?.(Date.now() - startedAt), ELAPSED_TICK_MS);
    const finish = (status: SerialProjectCheckResultV1["status"], exitCode: number | null): void => {
      if (settled) return;
      settled = true;
      clearInterval(ticker);
      clearTimeout(capTimer);
      clearTimeout(graceTimer);
      options.signal?.removeEventListener("abort", onAbort);
      settle(close(status, exitCode));
    };
    // A check Cairn stopped is `unfinished`, never `failed`: the project never
    // got to answer, so its exit status is Cairn's doing and not a verdict.
    const stopEarly = (): void => {
      if (settled || stopping) return;
      stopping = true;
      graceTimer = setTimeout(() => finish("unfinished", null), KILL_GRACE_MS);
      void killCheckProcessTree(child).then(() => finish("unfinished", null));
    };
    const onAbort = (): void => stopEarly();
    let graceTimer: ReturnType<typeof setTimeout> | undefined;
    const capTimer = setTimeout(stopEarly, capMs);

    if (options.signal?.aborted) { stopEarly(); return; }
    options.signal?.addEventListener("abort", onAbort, { once: true });

    // A spawn that never starts is unfinished, not a failing check: the project
    // never got the chance to answer.
    child.once("error", () => { if (!stopping) finish("unfinished", null); });
    child.once("close", (code) => { if (!stopping) finish(code === 0 ? "passed" : "failed", code); });
  });
}

/**
 * One displayed row, answered in three separate voices. They are separate
 * fields on purpose: nothing in this shape lets a worker's sentence stand where
 * Cairn's own finding or the owner's judgment belongs.
 */
export type SerialTaskPromiseAnswerV1 = Readonly<{
  id: `c${number}`;
  text: string;
  source: RequirementSource;
  verification: SerialTaskPromiseVerificationV1;
  /** What Cairn ran and found. Null when this row is the owner's to look at. */
  cairn: SerialProjectCheckResultV1 | null;
  /** The worker's own words for this row, or null when it did not answer. */
  worker: string | null;
  /** The owner's judgment. Starts `pending` and only the owner moves it. */
  owner: "pending" | "met" | "not-met";
}>;

export type SerialTaskPromiseOwnerAnswerV1 = "met" | "not-met";

export function composeSerialTaskPromiseAnswers(
  promises: SerialTaskPromisesV1,
  input: Readonly<{
    checkResults: readonly SerialProjectCheckResultV1[];
    workerChecks: readonly Readonly<{ name: string; result: string }>[];
    ownerAnswers: Readonly<Record<string, SerialTaskPromiseOwnerAnswerV1>>;
  }>,
): readonly SerialTaskPromiseAnswerV1[] {
  return Object.freeze(promises.rows.map((row) => {
    // A local const so the narrowing survives into the `find` callback.
    const verification = row.verification;
    const cairn = verification.kind === "cairn-check"
      ? input.checkResults.find((result) => result.checkId === verification.checkId) ?? null
      : null;
    // `\b` keeps c1 from claiming c10's answer. The id is Cairn's own generated
    // `c<number>`, so there is nothing caller-supplied in this pattern.
    const idPattern = new RegExp(`^\\s*${row.id}\\b`, "i");
    const answered = input.workerChecks.find((check) =>
      typeof check.name === "string" && idPattern.test(check.name));
    const owner = Object.hasOwn(input.ownerAnswers, row.id) ? input.ownerAnswers[row.id] : undefined;
    return Object.freeze({
      id: row.id,
      text: row.text,
      source: row.source,
      verification: row.verification,
      cairn,
      worker: answered ? answered.result : null,
      owner: owner === "met" || owner === "not-met" ? owner : "pending" as const,
    });
  }));
}

/**
 * Whether every displayed promise is actually answered. A row Cairn checked is
 * satisfied only by a passing run of that check; a row the owner owns is
 * satisfied only by the owner saying so. The worker's `worker` field is never
 * consulted here — that is the whole point of the separation.
 */
export function serialTaskPromisesSatisfied(
  answers: readonly SerialTaskPromiseAnswerV1[],
): boolean {
  return answers.every((row) => row.verification.kind === "cairn-check"
    ? row.cairn !== null && row.cairn.status === "passed"
    : row.owner === "met");
}

export function composeSerialTaskPromises(
  intent: TaskIntent,
  verifications: readonly SerialTaskPromiseVerificationV1[],
): SerialTaskPromisesV1 | null {
  const view = taskRequestView(intent);
  if (view === null) return null;
  const accepted = [view.outcome, ...view.requirements];
  if (verifications.length !== accepted.length) return null;
  return Object.freeze({
    version: SERIAL_TASK_PROMISES_VERSION,
    rows: Object.freeze(accepted.map((row, index) => Object.freeze({
      id: `c${index + 1}` as `c${number}`,
      text: row.text,
      source: row.source,
      verification: verifications[index] as SerialTaskPromiseVerificationV1,
    }))),
  });
}
