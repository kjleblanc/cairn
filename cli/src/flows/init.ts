import * as p from "@clack/prompts";
import pc from "picocolors";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { isCairnProject, scaffoldProject } from "../files.js";
import { banner } from "../ui.js";

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

export async function initFlow(root: string): Promise<void> {
  console.log(banner());
  p.intro("Project Kickoff — an empty folder becomes a Cairn project");

  if (isCairnProject(root)) {
    p.log.warn("This folder already has a Cairn contract. Nothing to do.");
    p.outro("Run `cairn task` to start your next task.");
    return;
  }
  const entries = existsSync(root) ? readdirSync(root).filter((e) => e !== ".git") : [];
  if (entries.length > 0) {
    p.log.error(
      "This folder isn't empty. Kickoff only runs in an empty folder — for a folder with existing work, use Project Conversion (see PROJECT-CONVERSION.md).",
    );
    p.outro("Nothing was changed.");
    process.exitCode = 1;
    return;
  }

  const answers = await p.group(
    {
      name: () => p.text({ message: "What's the project called?", placeholder: "Recipe Box" }),
      what: () => p.text({ message: "What do you want to build?", placeholder: "A simple app where I can save and search my recipes" }),
      who: () => p.text({ message: "Who will use it?", placeholder: "Just me, maybe my family later" }),
      milestone: () => p.text({ message: "What's the first thing you want to SEE working?", placeholder: "A page that lists three of my recipes" }),
      timebox: () =>
        p.text({
          message: "Timebox before rethinking the approach (Enter for default)",
          placeholder: "two Standard tasks without visible progress (default)",
          defaultValue: "two Standard tasks without visible progress (default)",
        }),
    },
    { onCancel: () => { p.cancel("Kickoff cancelled. Nothing was changed."); process.exit(1); } },
  );

  const created = scaffoldProject(root, answers as never);
  p.log.success(`Created:\n${created.map((c) => "  " + pc.dim(c)).join("\n")}`);

  try {
    git(root, ["--version"]);
    try {
      git(root, ["rev-parse", "--git-dir"]);
    } catch {
      git(root, ["init"]);
    }
    const name = git(root, ["config", "user.name"]);
    if (!name) throw new Error("no identity");
    git(root, ["add", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", "docs/ai-work/PILOT.md"]);
    git(root, ["commit", "-m", "Cairn setup: contract, project, log, pilot"]);
    p.log.success("Git initialized and the setup commit is saved.");
  } catch {
    p.log.warn(
      "Files created, but Git isn't ready (missing, or no name/email configured). See GETTING-READY.md, then commit AGENTS.md and docs/ai-work/ yourself.",
    );
  }

  p.outro(`Your project has its rulebook. Next: ${pc.bold("cairn task")} — make the first task a small Draft you can see.`);
}
