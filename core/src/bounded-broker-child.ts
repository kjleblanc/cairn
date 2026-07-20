import { readFileSync } from "node:fs";
import { proofProviderRequest, validateBoundedProviderResult, BoundedProviderError } from "./bounded-provider.js";
import { parseBrokerRequest, type BrokerFailure, type BrokerSuccess } from "./bounded-broker-protocol.js";

function allowedEnvironment(proxyUrl: string): Record<string, string | undefined> {
  const names = ["PATH", "SystemRoot", "WINDIR", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "TEMP", "TMP", "ComSpec", "PATHEXT"];
  return {
    ...Object.fromEntries(names.map((name) => [name, process.env[name]])),
    HTTPS_PROXY: proxyUrl,
    HTTP_PROXY: proxyUrl,
    ALL_PROXY: proxyUrl,
    NO_PROXY: "",
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    DISABLE_TELEMETRY: "1",
    DISABLE_ERROR_REPORTING: "1",
    NO_COLOR: "1",
  };
}

const input = readFileSync(0, "utf8").trim();
let taskNumber: 1 | 2 = 1;
let queryCount: 0 | 1 = 0;
try {
  const requestEnvelope = parseBrokerRequest(input);
  taskNumber = requestEnvelope.taskNumber;
  const request = proofProviderRequest(taskNumber);
  const { query } = await import("@anthropic-ai/claude-agent-sdk");
  queryCount = 1;
  const stream = query({
    prompt: request.user,
    options: {
      cwd: process.cwd(), model: request.model, systemPrompt: request.system,
      tools: [], allowedTools: [],
      disallowedTools: ["Bash", "Edit", "Write", "Read", "Glob", "Grep", "WebFetch", "WebSearch", "Task", "Skill"],
      canUseTool: (async () => ({ behavior: "deny", message: "CAIRN_TOOL_DENIED" })) as never,
      maxTurns: 1, maxBudgetUsd: request.maxCostUsd,
      outputFormat: { type: "json_schema", schema: { type: "object", additionalProperties: false, required: ["replacement"], properties: { replacement: { type: "string" } } } },
      settingSources: [], skills: [], mcpServers: {}, strictMcpConfig: true, agents: {}, plugins: [], hooks: {},
      persistSession: false, enableFileCheckpointing: false, permissionMode: "dontAsk",
      env: allowedEnvironment(requestEnvelope.proxyUrl), debug: false, stderr: () => {},
    } as never,
  });
  let result: { type?: string; subtype?: string; total_cost_usd?: number; structured_output?: unknown; num_turns?: number } | null = null;
  for await (const raw of stream as AsyncIterable<unknown>) {
    const item = raw as { type?: string; subtype?: string; total_cost_usd?: number; structured_output?: unknown; num_turns?: number };
    if (item?.type === "result") result = item;
  }
  if (!result || result.subtype !== "success" || result.num_turns !== 1) throw new BoundedProviderError("PROVIDER_CALL_FAILED");
  const validated = validateBoundedProviderResult(taskNumber, result.structured_output, result.total_cost_usd ?? Number.NaN);
  const response: BrokerSuccess = { schemaVersion: 1, ok: true, taskNumber, replacement: validated.replacement, model: validated.model,
    costUsd: validated.costUsd, queryCount: 1, pid: process.pid, cwd: process.cwd() };
  process.stdout.write(JSON.stringify(response) + "\n");
} catch (error) {
  const response: BrokerFailure = { schemaVersion: 1, ok: false, taskNumber,
    code: error instanceof BoundedProviderError ? error.code : "CALL_OUTCOME_UNKNOWN",
    queryCount, pid: process.pid, cwd: process.cwd() };
  process.stdout.write(JSON.stringify(response) + "\n");
  process.exitCode = 1;
}
