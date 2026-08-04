import { randomUUID } from "node:crypto";
import * as p from "@clack/prompts";
import {
  authorizeCodexExec,
  codexExecDisclosure,
  codexExecConnectionReason,
  codexExecStatusText,
  createCodexExecAdapter,
  createDirectTaskIntent,
  createOfflineDemoAdapter,
  detectCodexExecStatus,
  isCairnProject,
  parseFacts,
  previewSerialRoute,
  runSerialTask,
  type CodexExecStatus,
  type RouteResult,
  type TaskAdapter,
  type TaskIntent,
} from "@cairn/core";
import { banner, label } from "../ui.js";

export interface TaskArguments { mock: boolean; outcome?: string }

type PromptResult<T> = T | symbol;

export interface TaskFlowPrompts {
  log: {
    error(message: string): void;
    info(message: string): void;
    warn(message: string): void;
  };
  intro(message: string): void;
  text(options: {
    message: string;
    placeholder: string;
    validate(value: string): string | undefined;
  }): Promise<PromptResult<string>>;
  isCancel(value: unknown): boolean;
  cancel(message: string): void;
  confirm(options: { message: string; initialValue: boolean }): Promise<PromptResult<boolean>>;
  spinner(): {
    start(message: string): void;
    message(message: string): void;
    stop(message: string): void;
  };
  outro(message: string): void;
}

/** A deliberately narrow seam for fake-only CLI tests. Production supplies
 * the real Core functions below; no caller can use it from the command line. */
export interface TaskFlowDependencies {
  prompts: TaskFlowPrompts;
  newInputId: () => string;
  createDirectTaskIntent: typeof createDirectTaskIntent;
  detectCodexExecStatus: typeof detectCodexExecStatus;
  previewSerialRoute: typeof previewSerialRoute;
  codexExecDisclosure: typeof codexExecDisclosure;
  authorizeCodexExec: typeof authorizeCodexExec;
  runSerialTask: typeof runSerialTask;
}

const defaultPrompts: TaskFlowPrompts = {
  log: {
    error: (message) => p.log.error(message),
    info: (message) => p.log.info(message),
    warn: (message) => p.log.warn(message),
  },
  intro: (message) => p.intro(message),
  text: async (options) => p.text(options),
  isCancel: (value) => p.isCancel(value),
  cancel: (message) => p.cancel(message),
  confirm: async (options) => p.confirm(options),
  spinner: () => p.spinner(),
  outro: (message) => p.outro(message),
};

const defaultDependencies: TaskFlowDependencies = {
  prompts: defaultPrompts,
  newInputId: randomUUID,
  createDirectTaskIntent,
  detectCodexExecStatus,
  previewSerialRoute,
  codexExecDisclosure,
  authorizeCodexExec,
  runSerialTask,
};

function nonWhitespaceCharacters(value: string): number {
  let count = 0;
  for (const character of value) if (!/\s/u.test(character)) count += 1;
  return count;
}

function directOutcomeValidation(value: string): string | undefined {
  if (value.length > 2_000) return "Keep the outcome to 2,000 characters or fewer.";
  return nonWhitespaceCharacters(value) >= 5
    ? undefined
    : "Please use at least five non-whitespace characters.";
}

export function parseTaskArguments(args: string[]): TaskArguments {
  const commandIndex = args.indexOf("task");
  const tail = commandIndex >= 0 ? args.slice(commandIndex + 1) : args;
  const outcome = tail.filter((value) => value !== "--mock").join(" ");
  return { mock: tail.includes("--mock"), outcome: outcome.length > 0 ? outcome : undefined };
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

export async function taskFlow(
  root: string,
  options: TaskArguments,
  dependencies: TaskFlowDependencies = defaultDependencies,
): Promise<void> {
  const prompts = dependencies.prompts;
  console.log(banner());
  if (!isCairnProject(root)) {
    prompts.log.error("No Cairn contract here. Run `cairn init` in an empty folder, or use Project Conversion for existing work.");
    process.exitCode = 1;
    return;
  }
  const facts = parseFacts(root);
  prompts.intro(`${facts.name || "Your project"} — milestone: ${facts.milestone || "not set"}`);
  const entered = options.outcome ?? await prompts.text({
    message: "What one visible outcome do you want?",
    placeholder: "Describe one visible outcome",
    validate: directOutcomeValidation,
  });
  if (prompts.isCancel(entered)) { prompts.cancel("Nothing was changed."); return; }
  const rawOutcome = String(entered);
  const intent: TaskIntent | null = dependencies.createDirectTaskIntent(rawOutcome, dependencies.newInputId());
  if (!intent) {
    prompts.log.error(directOutcomeValidation(rawOutcome) ?? "That outcome cannot be represented safely.");
    process.exitCode = 1;
    return;
  }
  const codexStatus = options.mock ? undefined : await dependencies.detectCodexExecStatus(root);
  if (codexStatus) prompts.log.info(codexExecStatusText(codexStatus));
  const adapters = adaptersForMode(options.mock, root, codexStatus);
  const preview = dependencies.previewSerialRoute(intent, adapters);
  const route: RouteResult = preview.status === "connection-required" && codexStatus
    ? { ...preview, reason: codexExecConnectionReason(codexStatus) }
    : preview;
  for (const line of routeSummaryLines(route)) prompts.log.info(line);
  if (route.status === "connection-required") {
    prompts.outro("No task records were created. Cairn did not install Codex, open login, or inspect credentials.");
    return;
  }
  if (!options.mock) {
    const disclosure = dependencies.codexExecDisclosure(root, intent);
    prompts.log.warn("Real model call confirmation");
    prompts.log.info(`Provider: ${disclosure.provider}`);
    prompts.log.info(`Model: ${disclosure.model}`);
    prompts.log.info(`Target project: ${disclosure.project}`);
    prompts.log.info(`Task instructions: ${disclosure.task}`);
    prompts.log.info(`Data sent or readable: ${disclosure.data}`);
    prompts.log.info(`Cost/quota boundary: ${disclosure.quota}`);
  }
  const proceed = await prompts.confirm({
    message: options.mock
      ? "Run the offline demonstration? It verifies the serial flow but will not implement your requested change."
      : "Start this one real Codex Exec call with the provider, model, project, data scope, and quota shown above?",
    initialValue: options.mock,
  });
  if (prompts.isCancel(proceed) || !proceed) { prompts.cancel("Nothing was changed."); return; }
  const runAdapters = options.mock
    ? adapters
    : [createCodexExecAdapter(root, codexStatus!, dependencies.authorizeCodexExec(root, intent))];
  const spin = prompts.spinner();
  spin.start("Route → run → check → result");
  const result = await dependencies.runSerialTask(root, intent, {
    adapters: runAdapters,
    events: { onActivity: (activity) => spin.message(`${activity.stage}: ${activity.detail}`) },
  });
  if (result.status === "connection-required") { spin.stop("Connection required."); return; }
  spin.stop(result.status === "done"
    ? options.mock ? "Verified offline result." : "Verified one real Codex Exec task."
    : `Stopped safely: ${result.reason}.`);
  prompts.log.info(options.mock
    ? `Routing demonstration: ${result.status === "done" ? "verified" : "stopped"}`
    : `Codex Exec task: ${result.status === "done" ? "verified" : "stopped"}`);
  if (options.mock) prompts.log.info("Requested product change: not attempted");
  prompts.log.info(`Records: ${result.briefPath} · ${result.reportPath}`);
  prompts.outro(result.status === "done" ? label.done : label.stopped);
  if (result.status === "stopped") process.exitCode = 1;
}
