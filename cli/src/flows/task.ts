import * as p from "@clack/prompts";
import {
  authorizeCodexExec,
  codexExecDisclosure,
  codexExecConnectionReason,
  codexExecStatusText,
  createCodexExecAdapter,
  createOfflineDemoAdapter,
  detectCodexExecStatus,
  isCairnProject,
  parseFacts,
  previewSerialRoute,
  runSerialTask,
  type CodexExecStatus,
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

export function adaptersForMode(mock: boolean, root?: string, codexStatus?: CodexExecStatus): TaskAdapter[] {
  if (mock) return [createOfflineDemoAdapter()];
  return root && codexStatus ? [createCodexExecAdapter(root, codexStatus)] : [];
}

export function routeSummaryLines(route: RouteResult): string[] {
  if (route.status === "connection-required") {
    return [
      route.reason,
      "Cairn reads no credential file or login output. Install and connect Codex yourself through official Codex controls.",
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
  const codexStatus = options.mock ? undefined : await detectCodexExecStatus(root);
  if (codexStatus) p.log.info(codexExecStatusText(codexStatus));
  const adapters = adaptersForMode(options.mock, root, codexStatus);
  const preview = previewSerialRoute(outcome, adapters);
  const route: RouteResult = preview.status === "connection-required" && codexStatus
    ? { ...preview, reason: codexExecConnectionReason(codexStatus) }
    : preview;
  for (const line of routeSummaryLines(route)) p.log.info(line);
  if (route.status === "connection-required") {
    p.outro("No task records were created. Cairn did not install Codex, open login, or inspect credentials.");
    return;
  }
  if (!options.mock) {
    const disclosure = codexExecDisclosure(root, outcome);
    p.log.warn("Real model call confirmation");
    p.log.info(`Provider: ${disclosure.provider}`);
    p.log.info(`Model: ${disclosure.model}`);
    p.log.info(`Target project: ${disclosure.project}`);
    p.log.info(`Task instructions: ${disclosure.task}`);
    p.log.info(`Data sent or readable: ${disclosure.data}`);
    p.log.info(`Cost/quota boundary: ${disclosure.quota}`);
  }
  const proceed = await p.confirm({
    message: options.mock
      ? "Run the offline demonstration? It verifies the serial flow but will not implement your requested change."
      : "Start this one real Codex Exec call with the provider, model, project, data scope, and quota shown above?",
    initialValue: options.mock,
  });
  if (p.isCancel(proceed) || !proceed) { p.cancel("Nothing was changed."); return; }
  const runAdapters = options.mock
    ? adapters
    : [createCodexExecAdapter(root, codexStatus!, authorizeCodexExec(root, outcome))];
  const spin = p.spinner();
  spin.start("Route → run → check → result");
  const result = await runSerialTask(root, outcome, {
    adapters: runAdapters,
    events: { onActivity: (activity) => spin.message(`${activity.stage}: ${activity.detail}`) },
  });
  if (result.status === "connection-required") { spin.stop("Connection required."); return; }
  spin.stop(result.status === "done"
    ? options.mock ? "Verified offline result." : "Verified one real Codex Exec task."
    : `Stopped safely: ${result.reason}.`);
  p.log.info(options.mock
    ? `Routing demonstration: ${result.status === "done" ? "verified" : "stopped"}`
    : `Codex Exec task: ${result.status === "done" ? "verified" : "stopped"}`);
  if (options.mock) p.log.info("Requested product change: not attempted");
  p.log.info(`Records: ${result.briefPath} · ${result.reportPath}`);
  p.outro(result.status === "done" ? label.done : label.stopped);
  if (result.status === "stopped") process.exitCode = 1;
}
