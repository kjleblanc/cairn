#!/usr/bin/env node
import pc from "picocolors";
import { initFlow } from "./flows/init.js";
import { taskFlow, parseTaskArguments } from "./flows/task.js";
import { statusFlow } from "./flows/status.js";
import { claimFlow, renumberFlow } from "./flows/claim.js";
import { banner } from "./ui.js";

const args = process.argv.slice(2);
const command = args[0] ?? "";
const root = process.cwd();

async function main(): Promise<void> {
  switch (command) {
    case "init": await initFlow(root); break;
    case "task": await taskFlow(root, parseTaskArguments(args)); break;
    case "status": statusFlow(root); break;
    case "claim": claimFlow(root, args.slice(1)); break;
    case "renumber": renumberFlow(root, args.slice(1)); break;
    case "":
    case "help":
    default:
      console.log(banner());
      console.log(`${pc.bold("cairn init")}     create a Cairn project in an empty folder`);
      console.log(`${pc.bold("cairn task")}     route one task, run it serially, check it, and show the result`);
      console.log(`${pc.bold("cairn status")}   show the milestone and honest records`);
      console.log(`${pc.bold("cairn claim")}    claim the lowest free task number — brief skeleton committed alone, sibling lanes' uncommitted briefs included`);
      console.log(`${pc.bold("cairn renumber")} move a collided task's files to a free number and fix its references`);
      console.log("");
      console.log(pc.dim("Offline demonstration: cairn task --mock \"Describe one visible outcome\""));
      console.log(pc.dim("Without --mock, Cairn checks Codex and requires an exact confirmation before one real ephemeral call."));
      if (command && command !== "help") process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(pc.red(`\n${error instanceof Error ? error.message : String(error)}`));
  process.exitCode = 1;
});
