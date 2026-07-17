import pc from "picocolors";

export const stone = pc.green("●");

export function banner(): string {
  return [
    "",
    `      ${pc.green("●")}`,
    `     ${pc.dim("●●")}      ${pc.bold("C A I R N")}`,
    `    ${pc.dim("●●●")}     ${pc.dim("build with AI, one safe step at a time")}`,
    `   ${pc.dim("●●●●")}`,
    "",
  ].join("\n");
}

export function stack(count: number): string {
  const n = Math.min(count, 5);
  const rows: string[] = [];
  for (let i = 0; i < n; i++) rows.unshift("  ".repeat(5 - i) + pc.green("●".repeat(i + 1)));
  if (count > 5) rows.unshift(pc.dim(`   (${count} stones)`));
  return rows.join("\n");
}

export const label = {
  done: pc.bgGreen(pc.black(" DONE ")),
  stopped: pc.bgYellow(pc.black(" STOPPED ")),
  gate: pc.bgRed(pc.white(" DIRECTION GATE ")),
  denied: pc.yellow("⛔ blocked"),
};

export function dispositionOf(text: string): "DONE" | "STOPPED" | "UNKNOWN" {
  if (/Disposition:\s*DONE/i.test(text)) return "DONE";
  if (/Disposition:\s*STOPPED/i.test(text)) return "STOPPED";
  return "UNKNOWN";
}

export function finalVerdictOf(text: string): string {
  const m = text.match(/FINAL VERDICT:\s*([A-Z ]+)/);
  return m ? m[1].trim() : "NO VERDICT";
}

/**
 * Turn raw agent text into a safe one-line spinner status.
 *
 * The @clack/prompts spinner redraws in place by jumping to the start of the line and
 * erasing it — which only works while the line occupies ONE physical row. It counts
 * rows by newlines and never consults the terminal width, so a message wide enough to
 * wrap defeats the redraw and every animation frame floods the console with a fresh
 * copy. We prevent that here: collapse any whitespace (including newlines) to single
 * spaces, then cut the text so the finished line — including the spinner's 3-column
 * "<char>  " prefix, plus one column of margin so it never touches the last cell and
 * triggers a deferred auto-wrap — stays strictly inside the terminal width.
 */
export function spinnerLine(raw: string, columns?: number): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  const width = Number.isFinite(columns) && (columns as number) > 0 ? (columns as number) : 80;
  const budget = Math.max(0, width - 4);
  return collapsed.length > budget ? collapsed.slice(0, budget) : collapsed;
}
