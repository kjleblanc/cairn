import * as p from "@clack/prompts";
import {
  createOfflineDemoAdapter,
  isCairnProject,
  parseFacts,
  previewSerialRoute,
  runSerialTask,
  type RouteResult,
  type TaskAdapter,
} from "@cairn/core";
import { banner, label } from "../ui.js";

export interface TaskArguments { mock: boolean; outcome?: string }

export function parseTaskArguments(args: string[]): TaskArguments {
  const commandIndex = args.indexOf("task");
  const tail = commandIndex >= 0 ? args.slice(commandIndex + 1) : args;
  const outcome = tail.filter((value) => value !== "--mock" && !value.startsWith("--")).join(" ").trim();
  return { mock: tail.includes("--mock"), outcome: outcome || undefined };
}

export function adaptersForMode(mock: boolean): TaskAdapter[] {
  return mock ? [createOfflineDemoAdapter()] : [];
}

export function routeSummaryLines(route: RouteResult): string[] {
  if (route.status === "connection-required") {
    return [
      "No connected model can run this task.",
      route.reason,
      "Connect a provider in a later supported setup, or choose an already connected compatible model when one is available.",
    ];
  }
  return [
    `Recommended route: ${route.recommended.label}`,
    `Provider: ${route.recommended.provider}`,
    `Model: ${route.recommended.model}`,
    `Why: ${route.reason}`,
  ];
}

export async function taskFlow(root: string, options: TaskArguments): Promise<void> {
  console.log(banner());
  if (!isCairnProject(root)) {
    p.log.error("No Cairn contract here. Run `cairn init` in an empty folder, or use Project Conversion for existing work.");
    process.exitCode = 1;
    return;
  }
  const facts = parseFacts(root);
  p.intro(`${facts.name || "Your project"} — milestone: ${facts.milestone || "not set"}`);
  const entered = options.outcome ?? await p.text({
    message: "What one visible outcome do you want?",
    placeholder: "Describe one visible outcome",
    validate: (value) => value && value.trim().length >= 5 ? undefined : "Please describe the outcome in one sentence.",
  });
  if (p.isCancel(entered)) { p.cancel("Nothing was changed."); return; }
  const outcome = String(entered).trim();
  const adapters = adaptersForMode(options.mock);
  const route = previewSerialRoute(outcome, adapters);
  for (const line of routeSummaryLines(route)) p.log.info(line);
  if (route.status === "connection-required") {
    p.outro("No task records were created. Provider connection is outside this offline foundation.");
    return;
  }
  const proceed = await p.confirm({
    message: "Run the offline demonstration? It verifies the serial flow but will not implement your requested change.",
    initialValue: true,
  });
  if (p.isCancel(proceed) || !proceed) { p.cancel("Nothing was changed."); return; }
  const spin = p.spinner();
  spin.start("Route → run → check → result");
  const result = await runSerialTask(root, outcome, {
    adapters,
    events: { onActivity: (activity) => spin.message(`${activity.stage}: ${activity.detail}`) },
  });
  if (result.status === "connection-required") { spin.stop("Connection required."); return; }
  spin.stop(result.status === "done" ? "Verified offline result." : `Stopped safely: ${result.reason}.`);
  p.log.info(`Routing demonstration: ${result.status === "done" ? "verified" : "stopped"}`);
  p.log.info("Requested product change: not attempted");
  p.log.info("Milestone movement: NO");
  p.log.info(`Records: ${result.briefPath} · ${result.reportPath}`);
  p.outro(result.status === "done" ? label.done : label.stopped);
  if (result.status === "stopped") process.exitCode = 1;
}
