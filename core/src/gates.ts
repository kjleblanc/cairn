import { existsSync } from "node:fs";
import { LogRow, sha256File } from "./files.js";

/**
 * The gates are the point of this CLI: the safety rules of the Cairn contract,
 * enforced by code instead of prose. An agent cannot talk its way past them.
 */

export interface ApprovalRecord {
  taskNumber: number;
  briefPath: string;
  briefSha256: string;
  approvedAt: string;
}

/** Created only by an explicit human confirmation in the terminal. */
export function recordApproval(taskNumber: number, briefPath: string): ApprovalRecord {
  if (!existsSync(briefPath)) throw new Error(`Cannot approve: brief not found at ${briefPath}`);
  return {
    taskNumber,
    briefPath,
    briefSha256: sha256File(briefPath),
    approvedAt: new Date().toISOString(),
  };
}

/** The builder cannot start unless the approved brief is byte-identical. */
export function assertApprovalValid(record: ApprovalRecord): void {
  if (!existsSync(record.briefPath)) {
    throw new Error("GATE: the approved brief no longer exists. Build refused.");
  }
  const now = sha256File(record.briefPath);
  if (now !== record.briefSha256) {
    throw new Error(
      "GATE: the brief changed after approval. Build refused — re-read and re-approve it.",
    );
  }
}

export interface DirectionGateResult {
  tripped: boolean;
  reason: string;
}

/**
 * The Direction Gate, computed from the work log. No third narrow patch:
 * - two STOPPED outcomes in a row, or
 * - two consecutive closed tasks with no visible milestone movement.
 */
export function checkDirectionGate(log: LogRow[]): DirectionGateResult {
  const closed = log.filter((r) => r.outcome);
  if (closed.length < 2) return { tripped: false, reason: "" };
  const [a, b] = closed.slice(-2);
  const stopped = (r: LogRow) => /STOP/i.test(r.outcome);
  const noMove = (r: LogRow) => /^NO$/i.test(r.moved.trim());
  if (stopped(a) && stopped(b)) {
    return {
      tripped: true,
      reason: `The last two tasks (${a.task} and ${b.task}) both ended STOPPED.`,
    };
  }
  if (noMove(a) && noMove(b)) {
    return {
      tripped: true,
      reason: `The last two tasks (${a.task} and ${b.task}) closed with no visible milestone movement.`,
    };
  }
  return { tripped: false, reason: "" };
}

/** Bash commands no agent may run without the human being told first. */
const FORBIDDEN_BASH: Array<{ pattern: RegExp; why: string }> = [
  { pattern: /git\s+push/, why: "Pushing is never allowed inside a task. The owner pushes." },
  { pattern: /\b(npm|pnpm|yarn|pip|pip3|uv|cargo|gem|composer)\s+(i|install|add)\b/, why: "Installing dependencies needs the owner's explicit approval outside this task." },
  { pattern: /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b/i, why: "Recursive force-delete is forbidden." },
  { pattern: /git\s+(reset\s+--hard|clean|stash|checkout\s+--)/, why: "Commands that can destroy uncommitted work are forbidden." },
  { pattern: /\b(curl|wget|Invoke-WebRequest)\b/i, why: "Network access needs the owner's explicit approval." },
  { pattern: /\b(vercel|netlify|firebase|fly|heroku|wrangler)\b.*\b(deploy|publish)\b/i, why: "Deploying is never allowed inside a task." },
];

export function checkBashCommand(command: string): { allowed: boolean; why: string } {
  for (const rule of FORBIDDEN_BASH) {
    if (rule.pattern.test(command)) return { allowed: false, why: rule.why };
  }
  return { allowed: true, why: "" };
}
