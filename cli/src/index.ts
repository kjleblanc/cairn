#!/usr/bin/env node
import pc from "picocolors";
import { initFlow } from "./flows/init.js";
import { taskFlow, parseTaskArguments } from "./flows/task.js";
import { statusFlow } from "./flows/status.js";
import { banner } from "./ui.js";

const args = process.argv.slice(2);
const command = args[0] ?? "";
const root = process.cwd();

async function main(): Promise<void> {
  switch (command) {
    case "init": await initFlow(root); break;
    case "task": await taskFlow(root, parseTaskArguments(args)); break;
    case "status": statusFlow(root); break;
    case "":
    case "help":
    default:
      console.log(banner());
      console.log(`${pc.bold("cairn init")}     create a Cairn project in an empty folder`);
      console.log(`${pc.bold("cairn task")}     route one task, run it serially, check it, and show the result`);
      console.log(`${pc.bold("cairn status")}   show the milestone and honest records`);
      console.log("");
      console.log(pc.dim("Offline demonstration: cairn task --mock \"Describe one visible outcome\""));
      console.log(pc.dim("Without --mock, Cairn checks the official Codex CLI and stops before any real model call."));
      if (command && command !== "help") process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(pc.red(`\n${error instanceof Error ? error.message : String(error)}`));
  process.exitCode = 1;
});
