import pc from "picocolors";
import { projectStatus } from "@cairn/core";
import { banner, label, stack } from "../ui.js";

export function statusFlow(root: string): void {
  console.log(banner());
  let s;
  try {
    s = projectStatus(root);
  } catch {
    console.log(pc.yellow("No Cairn contract in this folder. Run `cairn init` (empty folder) or see PROJECT-CONVERSION.md."));
    process.exitCode = 1;
    return;
  }
  const stopped = s.log.filter((r) => /STOP/i.test(r.outcome)).length;

  console.log(`${pc.bold(s.facts.name || "Unnamed project")}  ${pc.dim(`(Contract v${s.facts.contractVersion || "?"}, ${s.facts.status || "?"})`)}`);
  console.log(`Milestone: ${s.facts.milestone || pc.dim("not set")}`);
  console.log("");
  if (s.stones > 0) console.log(stack(s.stones) + "\n");
  console.log(`Tasks closed: ${s.log.length}   ${pc.green(`DONE: ${s.stones}`)}   ${pc.yellow(`STOPPED: ${stopped}`)}`);

  const recent = s.log.slice(-5).reverse();
  if (recent.length) {
    console.log("\nRecent work:");
    for (const r of recent) {
      const mark = /DONE/i.test(r.outcome) ? pc.green("●") : pc.yellow("◐");
      console.log(`  ${mark} #${r.task} ${r.summary || r.decision} ${pc.dim(`(${r.outcome}, ${r.date})`)}`);
    }
  } else {
    console.log(pc.dim("\nNo tasks closed yet — run `cairn task` to place the first stone."));
  }

  if (s.unfinished) {
    console.log(`\n${pc.yellow("◌")} Task ${s.unfinished.taskNumber} has a brief but no logged decision — run \`cairn task\` to continue it.`);
  }
  if (s.gate.tripped) console.log(`\n${label.gate} ${s.gate.reason}\nRun \`cairn task\` — it will hold the line and walk you through the options.`);
}
