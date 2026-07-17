import pc from "picocolors";
import { checkDirectionGate, isCairnProject, parseFacts, parseLog } from "@cairn/core";
import { banner, label, stack } from "../ui.js";

export function statusFlow(root: string): void {
  console.log(banner());
  if (!isCairnProject(root)) {
    console.log(pc.yellow("No Cairn contract in this folder. Run `cairn init` (empty folder) or see PROJECT-CONVERSION.md."));
    process.exitCode = 1;
    return;
  }
  const facts = parseFacts(root);
  const log = parseLog(root);
  const done = log.filter((r) => /DONE/i.test(r.outcome)).length;
  const stopped = log.filter((r) => /STOP/i.test(r.outcome)).length;

  console.log(`${pc.bold(facts.name || "Unnamed project")}  ${pc.dim(`(Contract v${facts.contractVersion || "?"}, ${facts.status || "?"})`)}`);
  console.log(`Milestone: ${facts.milestone || pc.dim("not set")}`);
  console.log("");
  if (done > 0) console.log(stack(done) + "\n");
  console.log(`Tasks closed: ${log.length}   ${pc.green(`DONE: ${done}`)}   ${pc.yellow(`STOPPED: ${stopped}`)}`);

  const recent = log.slice(-5).reverse();
  if (recent.length) {
    console.log("\nRecent work:");
    for (const r of recent) {
      const mark = /DONE/i.test(r.outcome) ? pc.green("●") : pc.yellow("◐");
      console.log(`  ${mark} #${r.task} ${r.summary || r.decision} ${pc.dim(`(${r.outcome}, ${r.date})`)}`);
    }
  } else {
    console.log(pc.dim("\nNo tasks closed yet — run `cairn task` to place the first stone."));
  }

  const gate = checkDirectionGate(log);
  if (gate.tripped) console.log(`\n${label.gate} ${gate.reason}\nRun \`cairn task\` — it will hold the line and walk you through the options.`);
}
