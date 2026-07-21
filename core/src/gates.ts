import type { LogRow } from "./files.js";

export interface DirectionGateResult {
  tripped: boolean;
  reason: string;
}

/**
 * Stop a third narrow attempt after two STOPPED outcomes or two consecutive
 * closed tasks with no visible milestone movement.
 */
export function checkDirectionGate(log: LogRow[]): DirectionGateResult {
  const closed = log.filter((row) => row.outcome);
  if (closed.length < 2) return { tripped: false, reason: "" };
  const [a, b] = closed.slice(-2);
  const stopped = (row: LogRow) => /STOP/i.test(row.outcome);
  const noMove = (row: LogRow) => /^NO$/i.test(row.moved.trim());
  if (stopped(a) && stopped(b)) {
    return { tripped: true, reason: `The last two tasks (${a.task} and ${b.task}) both ended STOPPED.` };
  }
  if (noMove(a) && noMove(b)) {
    return { tripped: true, reason: `The last two tasks (${a.task} and ${b.task}) closed with no visible milestone movement.` };
  }
  return { tripped: false, reason: "" };
}

/** Commands Cairn must never treat as ordinary local task work. */
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
