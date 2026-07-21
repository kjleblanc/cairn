import * as p from "@clack/prompts";
import {
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
  const proceed = await p.confirm({
    message: options.mock
      ? "Run the offline demonstration? It verifies the serial flow but will not implement your requested change."
      : "Prepare the Codex Exec route? Cairn will stop before starting the real process or model call.",
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
  const realCallBoundary = result.status === "stopped" && result.reason === "REAL_MODEL_CALL_NOT_AUTHORIZED";
  spin.stop(result.status === "done"
    ? "Verified offline result."
    : realCallBoundary
      ? "Stopped before the real Codex Exec process."
      : `Stopped safely: ${result.reason}.`);
  p.log.info(realCallBoundary
    ? "Real Codex Exec process: not started"
    : `Routing demonstration: ${result.status === "done" ? "verified" : "stopped"}`);
  p.log.info("Requested product change: not attempted");
  p.log.info("Milestone movement: NO");
  p.log.info(`Records: ${result.briefPath} · ${result.reportPath}`);
  p.outro(result.status === "done" ? label.done : label.stopped);
  if (result.status === "stopped") process.exitCode = 1;
}
