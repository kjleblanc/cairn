import pc from "picocolors";
import { projectStatus } from "@cairn/core";
import { banner, label, stack } from "../ui.js";

export function statusFlow(root: string): void {
  console.log(banner());
  let status;
  try { status = projectStatus(root); }
  catch {
    console.log(pc.yellow("No Cairn contract in this folder. Run `cairn init` in an empty folder or see Project Conversion."));
    process.exitCode = 1;
    return;
  }
  const stopped = status.log.filter((row) => /STOP/i.test(row.outcome)).length;
  console.log(`${pc.bold(status.facts.name || "Unnamed project")}  ${pc.dim(`(Contract v${status.facts.contractVersion || "?"}, ${status.facts.status || "?"})`)}`);
  console.log(`Milestone: ${status.facts.milestone || pc.dim("not set")}`);
  if (status.stones > 0) console.log(`\n${stack(status.stones)}`);
  console.log(`\nRecords closed: ${status.log.length}   ${pc.green(`milestone stones: ${status.stones}`)}   ${pc.yellow(`STOPPED: ${stopped}`)}`);
  if (status.legacyState) console.log(`\n${pc.yellow("Legacy runtime state is preserved. New task mutation is blocked until a reviewed migration exists.")}`);
  const recent = status.log.slice(-5).reverse();
  if (recent.length) {
    console.log("\nRecent records:");
    for (const row of recent) {
      const mark = /^DONE$/i.test(row.outcome) ? pc.green("●") : pc.yellow("◐");
      console.log(`  ${mark} #${row.task} ${row.summary || row.decision} ${pc.dim(`(${row.outcome}, moved ${row.moved})`)}`);
    }
  } else console.log(pc.dim("\nNo task records yet — run `cairn task`."));
  if (status.unfinished) console.log(`\n${pc.yellow("○")} Task ${String(status.unfinished.taskNumber).padStart(3, "0")} has retained records and no closing log row.`);
  if (status.gate.tripped) console.log(`\n${label.gate} ${status.gate.reason}`);
}
