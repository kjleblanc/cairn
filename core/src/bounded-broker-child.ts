import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BoundedProviderError, PROOF_MAX_COST_USD, PROOF_MAX_OUTPUT_TOKENS, PROOF_MODEL, proofProviderRequest,
  validateBoundedProviderResult } from "./bounded-provider.js";
import { ANTHROPIC_MESSAGES_URL, createOneRequestMessagesFetch } from "./bounded-messages-fetch.js";
import { parseBrokerRequest, type BrokerFailure, type BrokerRequest, type BrokerResponse, type BrokerSuccess } from "./bounded-broker-protocol.js";

const NOOP_LOGGER = { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} };
const BROKER_TIMEOUT_MS = 45_000;

export interface BrokerExecutionOptions {
  delegate?: typeof globalThis.fetch;
  /** Offline test seam only. The live child omits this and uses official installed auth. */
  testApiKey?: string;
}

function noUsage(value: number | null): boolean { return value === null || value === 0; }

/** Run the one fixed SDK Messages operation without exposing raw SDK data. */
export async function executeBrokerRequest(
  envelope: BrokerRequest,
  options: BrokerExecutionOptions = {},
): Promise<BrokerResponse> {
  const request = proofProviderRequest(envelope.taskNumber);
  const boundary = createOneRequestMessagesFetch(options.delegate);
  try {
    const client = new Anthropic({
      baseURL: "https://api.anthropic.com",
      fetch: boundary.fetch,
      maxRetries: 0,
      timeout: BROKER_TIMEOUT_MS,
      fetchOptions: { redirect: "error" },
      logger: NOOP_LOGGER,
      logLevel: "error",
      ...(options.testApiKey ? { apiKey: options.testApiKey } : {}),
    });
    const message = await client.messages.create({
      model: PROOF_MODEL,
      max_tokens: PROOF_MAX_OUTPUT_TOKENS,
      service_tier: "standard_only",
      system: request.system,
      messages: [{ role: "user", content: request.user }],
    });
    const snapshot = boundary.snapshot();
    const block = message.content[0];
    const serverUse = message.usage.server_tool_use;
    if (snapshot.invocationCount !== 1 || snapshot.delegatedCount !== 1 || snapshot.destination !== ANTHROPIC_MESSAGES_URL ||
        message.type !== "message" || message.role !== "assistant" || message.model !== PROOF_MODEL ||
        message.stop_reason !== "end_turn" || message.stop_sequence !== null || message.stop_details !== null ||
        message.container !== null || message.content.length !== 1 || !block || block.type !== "text" ||
        !noUsage(message.usage.cache_creation_input_tokens) || !noUsage(message.usage.cache_read_input_tokens) ||
        message.usage.cache_creation !== null || message.usage.service_tier !== "standard" ||
        (serverUse !== null && (serverUse.web_fetch_requests !== 0 || serverUse.web_search_requests !== 0))) {
      throw new BoundedProviderError("PROVIDER_RESPONSE_INVALID");
    }
    const inputTokens = message.usage.input_tokens;
    const outputTokens = message.usage.output_tokens;
    if (!Number.isSafeInteger(inputTokens) || inputTokens < 0 || inputTokens > envelope.pricing.maxInputTokens ||
        !Number.isSafeInteger(outputTokens) || outputTokens < 0 || outputTokens > PROOF_MAX_OUTPUT_TOKENS) {
      throw new BoundedProviderError("PROVIDER_USAGE_INVALID");
    }
    const costUsd = (inputTokens * envelope.pricing.inputUsdPerMillion +
      outputTokens * envelope.pricing.outputUsdPerMillion) / 1_000_000;
    if (!Number.isFinite(costUsd) || costUsd < 0 || costUsd > PROOF_MAX_COST_USD) {
      throw new BoundedProviderError("PROVIDER_COST_LIMIT");
    }
    const validated = validateBoundedProviderResult(envelope.taskNumber, block.text, costUsd,
      { inputTokens, outputTokens, destination: ANTHROPIC_MESSAGES_URL });
    const success: BrokerSuccess = {
      schemaVersion: 2, ok: true, taskNumber: envelope.taskNumber, replacement: validated.replacement,
      model: validated.model, costUsd: validated.costUsd, inputTokens, outputTokens, requestCount: 1,
      destination: ANTHROPIC_MESSAGES_URL, pid: process.pid, cwd: process.cwd(),
    };
    return success;
  } catch (error) {
    const snapshot = boundary.snapshot();
    let code = "CALL_OUTCOME_UNKNOWN";
    if (error instanceof BoundedProviderError) code = error.code;
    else if (snapshot.invocationCount === 0) code = "AUTHENTICATION_UNAVAILABLE";
    else if (snapshot.delegatedCount === 0) code = "PROVIDER_BOUNDARY_REFUSED";
    const failure: BrokerFailure = {
      schemaVersion: 2, ok: false, taskNumber: envelope.taskNumber, code,
      requestCount: snapshot.invocationCount, destination: snapshot.destination,
      pid: process.pid, cwd: process.cwd(),
    };
    return failure;
  }
}

async function main(): Promise<void> {
  let taskNumber: 1 | 2 = 1;
  let response: BrokerResponse;
  try {
    const envelope = parseBrokerRequest(readFileSync(0, "utf8").trim());
    taskNumber = envelope.taskNumber;
    response = await executeBrokerRequest(envelope);
  } catch {
    response = { schemaVersion: 2, ok: false, taskNumber, code: "BROKER_PROTOCOL_INVALID", requestCount: 0,
      destination: null, pid: process.pid, cwd: process.cwd() };
  }
  process.stdout.write(JSON.stringify(response) + "\n");
  if (!response.ok) process.exitCode = 1;
}

const isMain = !!process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) await main();
