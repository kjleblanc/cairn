#!/usr/bin/env node
import pc from "picocolors";
import { DEFAULT_MODEL, EFFORT_LEVELS } from "@cairn/core";
import { initFlow } from "./flows/init.js";
import { taskFlow, parseModel, parseEffort } from "./flows/task.js";
import { statusFlow } from "./flows/status.js";
import { banner } from "./ui.js";

/** Current Claude models offered as picks; any model id typed after --model still works. */
const MODEL_PICKS = [
  "claude-fable-5",
  "claude-opus-4-8",
  "claude-opus-4-7",
  "claude-opus-4-6",
  "claude-sonnet-5",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
];

const args = process.argv.slice(2);
const command = args.find((a) => !a.startsWith("-")) ?? "";
const mock = args.includes("--mock");
const model = parseModel(args);
const effort = parseEffort(args);
const root = process.cwd();

async function main(): Promise<void> {
  switch (command) {
    case "init":
      await initFlow(root);
      break;
    case "task":
      if (effort && !(EFFORT_LEVELS as readonly string[]).includes(effort)) {
        console.log(`"${effort}" is not an effort level. Valid choices: ${EFFORT_LEVELS.join(", ")} — or leave the flag off for the default.`);
        process.exitCode = 1;
        break;
      }
      await taskFlow(root, { mock, model, effort });
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
      console.log(pc.dim(`Flags: --mock (offline demo engine, no AI calls) · --model <id> (choose the Claude model; default: ${DEFAULT_MODEL}) · --effort <${EFFORT_LEVELS.join("|")}> (how hard the model thinks; default: the model decides)`));
      console.log(pc.dim(`Model picks: ${MODEL_PICKS.map((m) => (m === DEFAULT_MODEL ? `${m} (default)` : m)).join(" · ")} — any model id works`));
      console.log(pc.dim("A bigger model, or a higher effort, costs more per real run."));
      console.log(pc.dim("Docs and the app: https://github.com/kjleblanc/cairn"));
      if (command && command !== "help") process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(pc.red(`\n${err instanceof Error ? err.message : String(err)}`));
  process.exitCode = 1;
});
