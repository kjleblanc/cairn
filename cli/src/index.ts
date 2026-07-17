#!/usr/bin/env node
import pc from "picocolors";
import { initFlow } from "./flows/init.js";
import { taskFlow } from "./flows/task.js";
import { statusFlow } from "./flows/status.js";
import { banner } from "./ui.js";

const args = process.argv.slice(2);
const command = args.find((a) => !a.startsWith("-")) ?? "";
const mock = args.includes("--mock");
const root = process.cwd();

async function main(): Promise<void> {
  switch (command) {
    case "init":
      await initFlow(root);
      break;
    case "task":
      await taskFlow(root, { mock });
      break;
    case "status":
      statusFlow(root);
      break;
    case "":
    case "help":
    default:
      console.log(banner());
      console.log(`${pc.bold("cairn init")}     turn an empty folder into a Cairn project (contract, log, pilot, git)`);
      console.log(`${pc.bold("cairn task")}     run one task through the gated loop: define → approve → build → verify → decide`);
      console.log(`${pc.bold("cairn status")}   your project at a glance — facts, cairn, recent work, Direction Gate`);
      console.log("");
      console.log(pc.dim("Flags: --mock (offline demo engine, no AI calls)"));
      console.log(pc.dim("Docs and the app: https://github.com/kjleblanc/cairn"));
      if (command && command !== "help") process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(pc.red(`\n${err instanceof Error ? err.message : String(err)}`));
  process.exitCode = 1;
});
