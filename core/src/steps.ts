import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import {
  isCairnProject,
  nextTaskNumber,
  pad,
  parseFacts,
  parseLog,
  paths,
  scaffoldProject,
  type LogRow,
  type ProjectFacts,
} from "./files.js";
import { checkDirectionGate, type DirectionGateResult } from "./gates.js";

export type Disposition = "DONE" | "STOPPED" | "UNKNOWN";

export interface UnfinishedTask {
  taskNumber: number;
  hasBrief: boolean;
  hasReport: boolean;
  disposition: Disposition;
  briefText: string;
  reportText: string;
}

export interface ProjectStatus {
  facts: ProjectFacts;
  log: LogRow[];
  stones: number;
  gate: DirectionGateResult;
  unfinished: UnfinishedTask | null;
  legacyState: boolean;
}

function disposition(text: string): Disposition {
  const matches = [...text.matchAll(/^Disposition:\s*\*\*(DONE|STOPPED)\*\*\s*$/gim)];
  if (matches.length !== 1) return "UNKNOWN";
  return matches[0][1].toUpperCase() as "DONE" | "STOPPED";
}

function hasLegacyState(root: string): boolean {
  try {
    const raw = execFileSync("git", ["rev-parse", "--git-dir"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    const gitDir = isAbsolute(raw) ? resolve(raw) : resolve(root, raw);
    return existsSync(join(gitDir, "cairn"));
  } catch {
    return false;
  }
}

export function projectStatus(root: string): ProjectStatus {
  if (!isCairnProject(root)) throw new Error("No Cairn contract in this folder.");
  const facts = parseFacts(root);
  const log = parseLog(root);
  const stones = log.filter((row) => /^DONE$/i.test(row.outcome.trim()) && /^YES$/i.test(row.moved.trim())).length;
  const gate = checkDirectionGate(log);
  const last = nextTaskNumber(root) - 1;
  let unfinished: UnfinishedTask | null = null;
  if (last >= 1 && !log.some((row) => row.task === pad(last))) {
    const briefPath = paths.brief(root, last);
    const reportPath = paths.report(root, last);
    const hasBrief = existsSync(briefPath);
    const hasReport = existsSync(reportPath);
    const reportText = hasReport ? readFileSync(reportPath, "utf8") : "";
    unfinished = {
      taskNumber: last,
      hasBrief,
      hasReport,
      disposition: disposition(reportText),
      briefText: hasBrief ? readFileSync(briefPath, "utf8") : "",
      reportText,
    };
  }
  return { facts, log, stones, gate, unfinished, legacyState: hasLegacyState(root) };
}

/** Provider-free Direction Gate guidance. It reads records and changes nothing. */
export function localDirectionCheck(root: string, reason: string): { text: string } {
  const status = projectStatus(root);
  const recent = status.log.slice(-2)
    .map((row) => `- Task ${row.task}: ${row.outcome}; milestone moved ${row.moved}. ${row.summary}`)
    .join("\n");
  return {
    text: `# Direction check

## Why Cairn paused

${reason}

Current milestone: ${status.facts.milestone || "not set"}

Recent evidence:

${recent || "- No closed task evidence is available yet."}

## Genuinely different options

1. **Reduce the milestone.** Choose the smallest visible behavior that tests the riskiest assumption.
2. **Change architecture.** Replace the component or workflow causing the repeated blocker before patching it again.
3. **Get experienced help.** Ask someone familiar with the failing technology to review the evidence and proposed boundary.
4. **Defer or abandon the work.** Preserve the records and spend no more time until the value or constraints change.

This guidance was generated locally from the project log. No model was called and nothing was changed.
`,
  };
}

export function initProject(root: string, facts: { name: string; what: string; who: string; milestone: string; timebox: string }): { created: string[]; gitReady: boolean } {
  const created = scaffoldProject(root, facts);
  let gitReady = false;
  try {
    const git = (args: string[]) => execFileSync("git", args, {
      cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    git(["--version"]);
    try { git(["rev-parse", "--git-dir"]); } catch { git(["init"]); }
    if (!git(["config", "user.name"])) throw new Error("no identity");
    git(["add", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", "docs/ai-work/PILOT.md"]);
    git(["commit", "-m", "Cairn setup: contract, project, log, pilot"]);
    gitReady = true;
  } catch {
    // The scaffold remains intact; the caller explains that Git setup is incomplete.
  }
  return { created, gitReady };
}
