import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { isCairnProject, nextTaskNumber, pad, parseFacts, parseLog, paths } from "@cairn/core";
import type { CheckupFinding, CheckupReport, CheckupTrailEntry } from "../shared/ipc.js";

/**
 * Task 160: the project checkup. One read-only audit of a governed project —
 * records integrity, git safety net, contract/doc drift, stray files — that
 * returns a typed report for the picker's Checkup card.
 *
 * The module's law, mirroring the brief's boundary of intent:
 * - READ-ONLY. Nothing here writes to the checked project, and nothing ever
 *   will: a finding may carry a SUGGESTION (plain text the owner can send as
 *   their own message), never an action this module performs.
 * - LOCAL and DETERMINISTIC. No model call, no network. Git is read through
 *   the same local-only, `GIT_TERMINAL_PROMPT=0` idiom as push.ts, behind an
 *   injectable exec seam so the unit tests never touch a real repository.
 * - HONEST. A healthy finding is asserted only when the check actually ran
 *   and passed; anything unverifiable is left out rather than rounded up.
 */

export type ExecResult = { status: number; stdout: string; stderr: string };
export type ExecFn = (args: string[]) => ExecResult;

/** Same local-only git invocation shape as push.ts — duplicated deliberately
 * so this module's seam stays its own and push's tests stay untouched. */
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

const VERSION_RE = /Contract v([0-9][0-9.]*)/;
/** PROJECT.md cites the contract in prose ("…(contract v0.5.0)"), so its
 * citation is matched case-insensitively — unlike the contract files, whose
 * own version line is always capitalized. */
const CITED_VERSION_RE = /[Cc]ontract v([0-9][0-9.]*)/;
/** Unpushed commits at or above this count read as a risk, not a note. */
const UNPUSHED_RISK_THRESHOLD = 20;

function versionOf(text: string): string {
  const m = VERSION_RE.exec(text);
  return m ? m[1] : "";
}

function risk(title: string, detail: string, suggestionLabel?: string, suggestion?: string): CheckupFinding {
  return { group: "risk", title, detail, suggestionLabel, suggestion };
}
function attention(title: string, detail: string, suggestionLabel?: string, suggestion?: string): CheckupFinding {
  return { group: "attention", title, detail, suggestionLabel, suggestion };
}
function healthy(title: string, detail: string): CheckupFinding {
  return { group: "healthy", title, detail };
}

function list(numbers: number[], cap = 4): string {
  const shown = numbers.slice(0, cap).map((n) => pad(n)).join(", ");
  return numbers.length > cap ? `${shown}, +${numbers.length - cap} more` : shown;
}

export function runCheckup(dir: string, exec: ExecFn = realExec(dir)): CheckupReport {
  if (!isCairnProject(dir)) {
    throw new Error("That folder has no Cairn contract, so there is nothing to check up on.");
  }
  const facts = parseFacts(dir);
  const rows = parseLog(dir);
  const findings: CheckupFinding[] = [];

  // ---- Records: pair every brief with its report, and the log with both. ----
  const taskFiles = existsSync(paths.tasks(dir)) ? readdirSync(paths.tasks(dir)) : [];
  const briefs = new Set<number>();
  const reports = new Set<number>();
  for (const f of taskFiles) {
    const m = /^(\d{3})-(brief|report)\.md$/.exec(f);
    if (!m) continue;
    (m[2] === "brief" ? briefs : reports).add(Number.parseInt(m[1], 10));
  }
  const max = nextTaskNumber(dir) - 1;
  const rowByTask = new Map<number, string>();
  for (const row of rows) {
    const n = Number.parseInt(row.task, 10);
    if (Number.isFinite(n)) rowByTask.set(n, row.outcome.trim().toUpperCase());
  }

  const gaps: number[] = [];
  const reportNoBrief: number[] = [];
  const staleBriefs: number[] = [];
  const reportNoRow: number[] = [];
  const rowNoFiles: number[] = [];
  let inFlight: number | null = null;
  const trail: CheckupTrailEntry[] = [];
  let stoppedCount = 0;

  for (let n = 1; n <= max; n++) {
    const hasBrief = briefs.has(n);
    const hasReport = reports.has(n);
    const outcome = rowByTask.get(n);
    if (!hasBrief && !hasReport) {
      // A log row naming a task whose files are both gone is not a "gap" —
      // the history says the task existed.
      if (outcome !== undefined) rowNoFiles.push(n);
      else if (n < max) gaps.push(n); // a hole in the middle; the next number is simply unstarted
      continue;
    }
    if (outcome === "STOPPED") { trail.push({ n, state: "stopped" }); stoppedCount++; }
    else if (outcome !== undefined) trail.push({ n, state: "done" });
    else if (hasBrief && !hasReport) trail.push({ n, state: "inflight" });
    else trail.push({ n, state: "unlogged" });

    if (hasReport && !hasBrief) reportNoBrief.push(n);
    if (hasBrief && !hasReport) {
      if (n === max && outcome === undefined) inFlight = n;
      else staleBriefs.push(n);
    }
    if (hasReport && outcome === undefined) reportNoRow.push(n);
  }

  if (gaps.length > 0) {
    findings.push(attention(
      `Missing records for ${gaps.length === 1 ? `task ${list(gaps)}` : `tasks ${list(gaps)}`}`,
      "These task numbers have neither a brief nor a report — the record trail has a hole in it.",
      "Fill the record gap",
      `Work on: investigate the missing task records (${list(gaps)}) and either reconstruct them or record why they are gone`,
    ));
  }
  for (const n of reportNoBrief.slice(0, 3)) {
    findings.push(attention(
      `Task ${pad(n)} has a report but no brief`,
      "The report exists without its brief — unusual; it may have been written by an automated run.",
    ));
  }
  for (const n of staleBriefs.slice(0, 3)) {
    findings.push(attention(
      `Task ${pad(n)} has a brief but no report`,
      "This task looks unfinished, but it is not the latest — its outcome was never recorded.",
      `Close out task ${pad(n)}`,
      `Work on: find out what happened with task ${pad(n)} and write its report, or record why it was abandoned`,
    ));
  }
  for (const n of reportNoRow.slice(0, 3)) {
    findings.push(attention(
      `Task ${pad(n)}'s report is not in the log`,
      "The report file exists but LOG.md has no row for it — the history undersells what happened.",
      `Add the log row`,
      `Work on: add the missing LOG.md row for task ${pad(n)}, matching its report`,
    ));
  }
  for (const n of rowNoFiles.slice(0, 3)) {
    findings.push(attention(
      `Log row ${pad(n)} has no task files`,
      "The log names a task whose brief and report are both missing.",
    ));
  }
  if (inFlight !== null) {
    findings.push(attention(
      `Task ${pad(inFlight)} is in flight`,
      "Its brief is committed but no report yet — work is still underway. Nothing to fix; the checkup flags it if it goes stale.",
    ));
  }
  const lastRow = rows[rows.length - 1];
  if (lastRow && lastRow.outcome.trim().toUpperCase() === "STOPPED") {
    findings.push(attention(
      "The latest logged task stopped",
      `Task ${lastRow.task} ended STOPPED — it may be waiting on a decision.`,
      "Review the stopped task",
      `Work on: review stopped task ${lastRow.task} and decide whether to retry, adjust, or drop it`,
    ));
  }

  const recordsClean = gaps.length === 0 && reportNoBrief.length === 0 && staleBriefs.length === 0
    && reportNoRow.length === 0 && rowNoFiles.length === 0;
  if (recordsClean && max > 0) {
    const pairs = [...briefs].filter((n) => reports.has(n)).length;
    findings.push(healthy(
      `Records intact — ${pairs} brief/report ${pairs === 1 ? "pair" : "pairs"}`,
      `Numbering runs continuously from 001 to ${pad(max)}, and every report has its log row.`,
    ));
  }
  if (stoppedCount > 0 && !(lastRow && lastRow.outcome.trim().toUpperCase() === "STOPPED")) {
    findings.push(healthy(
      `${stoppedCount} stopped ${stoppedCount === 1 ? "run" : "runs"} filed honestly`,
      "Stopped tasks kept their records as evidence instead of being hidden.",
    ));
  }

  // ---- Git: the safety net. Everything local; nothing contacts a remote. ----
  if (exec(["rev-parse", "--git-dir"]).status === 0) {
    const upstream = exec(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
    if (upstream.status !== 0) {
      findings.push(attention(
        "No backup remote",
        "This project exists only on this machine — nothing is pushed anywhere.",
        "Set up a backup",
        "Work on: set up a remote for this project and make the first push decision",
      ));
    } else {
      const aheadRaw = exec(["rev-list", "--count", "@{u}..HEAD"]);
      const ahead = Number.parseInt(aheadRaw.stdout.trim(), 10);
      if (Number.isFinite(ahead) && ahead >= UNPUSHED_RISK_THRESHOLD) {
        findings.push(risk(
          `${ahead} commits not pushed`,
          "That much work — effectively the project's memory — exists only on this machine. If it stops working, it is gone.",
          "Make the push decision",
          `Work on: review the remote and make the push decision (${ahead} unpushed commits)`,
        ));
      } else if (Number.isFinite(ahead) && ahead > 0) {
        findings.push(attention(
          `${ahead} ${ahead === 1 ? "commit" : "commits"} not pushed`,
          "Recent work exists only on this machine until it is pushed.",
          "Make the push decision",
          `Work on: review the remote and make the push decision (${ahead} unpushed ${ahead === 1 ? "commit" : "commits"})`,
        ));
      } else if (Number.isFinite(ahead)) {
        findings.push(healthy("Everything committed is also pushed", "The branch is level with its upstream."));
      }
    }
    const status = exec(["status", "--porcelain"]);
    if (status.status === 0) {
      const lines = status.stdout.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const modified = lines.filter((l) => !l.startsWith("??"));
      const untracked = lines.filter((l) => l.startsWith("??")).map((l) => l.slice(3).trim());
      if (modified.length > 0) {
        findings.push(attention(
          `Uncommitted changes in ${modified.length} ${modified.length === 1 ? "file" : "files"}`,
          "Work exists that no commit protects yet.",
          "Review uncommitted work",
          "Work on: review the uncommitted changes and commit what belongs together",
        ));
      }
      if (untracked.length > 0) {
        const shown = untracked.slice(0, 3).join(", ");
        const more = untracked.length > 3 ? `, +${untracked.length - 3} more` : "";
        findings.push(attention(
          `${untracked.length} untracked ${untracked.length === 1 ? "file" : "files"} (${shown}${more})`,
          "Untracked files are easy to lose and clutter the tree.",
          "Tidy untracked files",
          "Work on: decide keep-or-ignore for the untracked files, then commit them or add them to .gitignore",
        ));
      }
      if (modified.length === 0 && untracked.length === 0) {
        findings.push(healthy("Working tree clean", "Everything in the project is committed."));
      }
    }
  }

  // ---- Contract and doc drift. ----
  const contractVersion = facts.contractVersion;
  const templatePath = join(dir, "CONTRACT-TEMPLATE.md");
  if (contractVersion && existsSync(templatePath)) {
    const templateVersion = versionOf(readFileSync(templatePath, "utf8"));
    if (templateVersion && templateVersion === contractVersion) {
      findings.push(healthy(
        `Contract in sync — v${contractVersion}`,
        "AGENTS.md and CONTRACT-TEMPLATE.md carry the same version.",
      ));
    } else if (templateVersion) {
      findings.push(attention(
        "Contract drift",
        `AGENTS.md is v${contractVersion}; the template is v${templateVersion}. A project's own contract is law even when older — adopting a newer one is an explicit task.`,
        "Review the drift",
        `Work on: review the contract drift between AGENTS.md (v${contractVersion}) and the template (v${templateVersion}), and decide which version this project adopts`,
      ));
    }
  }
  if (contractVersion && existsSync(paths.project(dir))) {
    const citedText = readFileSync(paths.project(dir), "utf8");
    const citedMatch = CITED_VERSION_RE.exec(citedText);
    const cited = citedMatch ? citedMatch[1] : "";
    if (cited && cited !== contractVersion) {
      findings.push(attention(
        "Doc drift",
        `PROJECT.md cites contract v${cited}; the contract is v${contractVersion}.`,
        "Refresh PROJECT.md",
        `Work on: refresh PROJECT.md's facts so they match the current contract (v${contractVersion})`,
      ));
    }
  }

  // ---- Verdict: honest, never rounded up. ----
  const riskCount = findings.filter((f) => f.group === "risk").length;
  const attentionCount = findings.filter((f) => f.group === "attention").length;
  const verdict = riskCount > 0 ? "Needs a decision" : attentionCount > 0 ? "Mostly healthy" : "Healthy";
  const verdictNote = riskCount > 0
    ? `${riskCount === 1 ? "One risk is" : `${riskCount} risks are`} worth a decision — start there; the rest can wait.`
    : attentionCount > 0
      ? "Nothing on fire — a few things are worth a look."
      : "Nothing needs you — the records are clean.";

  const counts = {
    done: trail.filter((t) => t.state === "done").length,
    stopped: trail.filter((t) => t.state === "stopped").length,
    inFlight: trail.filter((t) => t.state === "inflight").length,
    unlogged: trail.filter((t) => t.state === "unlogged").length,
    total: trail.length,
  };

  return {
    dir,
    name: facts.name || basename(dir),
    generatedAt: new Date().toISOString(),
    verdict,
    verdictNote,
    counts,
    trail,
    findings,
  };
}
