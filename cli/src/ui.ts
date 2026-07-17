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
