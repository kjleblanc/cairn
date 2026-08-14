import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { builderTurnContextSha256 } from "@cairn/core";
import {
  TASK233_LIVE_SPEND_MARKER,
  parseTask233LiveSpendMarker,
  reserveTask233LiveSpend,
} from "../src/main/builderliveapproval.js";
import {
  TASK233_LIVE_ENDPOINT,
  TASK233_LIVE_FIXED_INSTRUCTION,
  TASK233_LIVE_MODELS_PREFLIGHT,
  TASK233_LIVE_MODEL,
  TASK233_LIVE_PROVIDER_ENDPOINT_TAG,
  TASK233_LIVE_ZDR_PREFLIGHT,
  consumeTask233LiveBuilderAnswer,
  createTask233LiveBuilderTransport,
  sendTask233LiveBuilderTurn,
  task233LiveBuilderAnswerMatches,
  task233LiveRequestBodySha256,
  type Task233LiveBuilderCallResultV1,
} from "../src/main/builderlivetransport.js";
import { task233FixedTrackedTextRequestForTests } from "../src/main/builderproposalreviewfixture.js";
import { captureBuilderTrackedTextSelection } from "../src/main/buildertrackedtext.js";

const SELECTED_PATH = "examples/synthetic/greeting.ts";
const BEFORE = "export const greeting = '<script>syntheticBefore()</script>';\n";
const AFTER = "export const greeting = 'Hello from one inert live proposal.';\n";
const SECRET = "task233-synthetic-unit-key-not-a-credential";

type OwnedDirectory = Readonly<{ path: string; real: string; dev: bigint; ino: bigint }>;
const owned: OwnedDirectory[] = [];

function own(prefix: string): OwnedDirectory {
  const path = mkdtempSync(join(tmpdir(), prefix));
  const real = realpathSync.native(path);
  const stat = lstatSync(real, { bigint: true });
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink() && stat.dev > 0n && stat.ino > 0n);
  const result = Object.freeze({ path, real, dev: stat.dev, ino: stat.ino });
  owned.push(result);
  return result;
}

after(() => {
  const parent = realpathSync.native(tmpdir());
  const failures: string[] = [];
  for (const entry of [...owned].reverse()) {
    if (!existsSync(entry.path)) continue;
    try {
      const real = realpathSync.native(entry.path);
      const stat = lstatSync(real, { bigint: true });
      const rel = relative(parent, real);
      if (real !== entry.real || stat.dev !== entry.dev || stat.ino !== entry.ino
        || !stat.isDirectory() || stat.isSymbolicLink() || rel === "" || rel === ".."
        || rel.startsWith("../") || rel.startsWith("..\\") || isAbsolute(rel)
        || !/^cairn-task233-(?:project|profile)-/u.test(rel)) {
        failures.push(entry.path + ": identity changed; retained");
        continue;
      }
      rmSync(real, { recursive: true, force: false });
    } catch (error) {
      failures.push(entry.path + ": "
        + (error instanceof Error ? error.message : String(error)) + "; retained");
    }
  }
  assert.deepEqual(failures, [], failures.join("\n"));
});

function gitEnvironment(): NodeJS.ProcessEnv {
  const environment = Object.fromEntries(Object.entries(process.env)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  for (const key of Object.keys(environment)) if (key.toUpperCase().startsWith("GIT_")) delete environment[key];
  environment.GIT_CONFIG_NOSYSTEM = "1";
  environment.GIT_CONFIG_SYSTEM = process.platform === "win32" ? "NUL" : "/dev/null";
  environment.GIT_CONFIG_GLOBAL = process.platform === "win32" ? "NUL" : "/dev/null";
  environment.GIT_TERMINAL_PROMPT = "0";
  environment.GIT_OPTIONAL_LOCKS = "0";
  return environment;
}

function git(root: string, args: readonly string[]): string {
  const result = spawnSync("git", ["-c", "core.excludesFile=/dev/null", ...args], {
    cwd: root,
    env: gitEnvironment(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  return (result.stdout ?? "").trimEnd();
}

function repository(): OwnedDirectory {
  const root = own("cairn-task233-project-");
  mkdirSync(join(root.path, "examples", "synthetic"), { recursive: true });
  writeFileSync(join(root.path, "examples", "synthetic", "greeting.ts"), BEFORE, "utf8");
  git(root.path, ["init", "--initial-branch=main", "--object-format=sha1", "--ref-format=files"]);
  git(root.path, ["add", "--", SELECTED_PATH]);
  git(root.path, [
    "-c", "user.name=Cairn Task 233",
    "-c", "user.email=task233@example.invalid",
    "commit", "-m", "Seed Task 233 synthetic tracked text",
  ]);
  assert.equal(git(root.path, ["status", "--porcelain=v2", "--untracked-files=all"]), "");
  return root;
}

function modelCatalog(prompt = "0.00000057", completion = "0.0000023") {
  return {
    data: [{
      id: TASK233_LIVE_MODEL,
      canonical_slug: TASK233_LIVE_MODEL,
      context_length: 131_072,
      architecture: {
        modality: "text->text",
        input_modalities: ["text"],
        output_modalities: ["text"],
      },
      pricing: { prompt, completion },
      supported_parameters: ["max_tokens", "seed", "temperature"],
      top_provider: { context_length: 131_072, max_completion_tokens: 100_352 },
    }],
  };
}

function zdrCatalog(
  provider = "NovitaAI",
  prompt = "0.00000057",
  completion = "0.0000023",
) {
  return {
    data: [{
      model_id: TASK233_LIVE_MODEL,
      name: "Novita | moonshotai/kimi-k2",
      provider_name: provider,
      tag: TASK233_LIVE_PROVIDER_ENDPOINT_TAG,
      quantization: "fp8",
      status: 0,
      context_length: 131_072,
      max_prompt_tokens: null,
      max_completion_tokens: 100_352,
      pricing: { prompt, completion, discount: 0 },
      supported_parameters: ["max_tokens", "seed", "temperature"],
    }],
  };
}

function modelResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: "gen-task233-synthetic",
    object: "chat.completion",
    provider: "NovitaAI",
    model: TASK233_LIVE_MODEL,
    choices: [{
      index: 0,
      finish_reason: "stop",
      message: {
        role: "assistant",
        content: JSON.stringify({
          summary: "Proposes one synthetic greeting replacement.",
          afterText: AFTER,
        }),
      },
    }],
    usage: {
      prompt_tokens: 1_000,
      completion_tokens: 100,
      total_tokens: 1_100,
      cost: 0.001,
    },
    openrouter_metadata: {
      requested: TASK233_LIVE_MODEL,
      strategy: "direct",
      attempt: 1,
      is_byok: false,
      endpoints: {
        total: 1,
        available: [{ provider: "NovitaAI", model: TASK233_LIVE_MODEL, selected: true }],
      },
      attempts: [{ provider: "NovitaAI", model: TASK233_LIVE_MODEL, status: 200 }],
      pipeline: [],
    },
    ...overrides,
  };
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type SeenCall = Readonly<{ url: string; init: RequestInit }>;

function harness(responses: readonly (Response | Error)[]) {
  const project = repository();
  const profile = own("cairn-task233-profile-");
  const selection = captureBuilderTrackedTextSelection(
    project.path,
    task233FixedTrackedTextRequestForTests(),
  );
  assert.ok(selection);
  const seen: SeenCall[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    assert.ok(existsSync(join(profile.path, TASK233_LIVE_SPEND_MARKER)),
      "the durable spend marker must exist before every network boundary");
    const response = responses[seen.length];
    if (!response) throw new Error("unexpected request");
    seen.push(Object.freeze({ url: String(input), init: init ?? {} }));
    if (response instanceof Error) throw response;
    return response;
  };
  const transport = createTask233LiveBuilderTransport(selection.context, fetch);
  assert.ok(transport);
  const requestBodySha256 = task233LiveRequestBodySha256(transport, selection.context);
  assert.match(requestBodySha256 ?? "", /^[a-f0-9]{64}$/u);
  const spend = reserveTask233LiveSpend(profile.path, selection.context, requestBodySha256);
  assert.ok(spend);
  return { project, profile, selection, transport, spend, seen };
}

function appSource(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function sourceConsumers(symbol: string, owner: string): string[] {
  const root = resolve(process.cwd(), "src");
  const files: Array<Readonly<{ path: string; text: string }>> = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && /\.(?:ts|tsx)$/u.test(entry.name)) {
        files.push({
          path: relative(root, path).replaceAll("\\", "/"),
          text: readFileSync(path, "utf8"),
        });
      }
    }
  };
  walk(root);
  const pattern = new RegExp(`\\b${symbol}\\b`, "u");
  return files.filter((file) => file.path !== owner && pattern.test(file.text))
    .map((file) => file.path).sort();
}

test("exact live transport sends two keyless preflights and one bounded pinned POST", async () => {
  const run = harness([
    jsonResponse(modelCatalog()),
    jsonResponse(zdrCatalog("Novita")),
    jsonResponse(modelResponse()),
  ]);
  assert.equal(task233LiveRequestBodySha256({ ...run.transport }, run.selection.context), null);
  assert.equal(task233LiveRequestBodySha256(run.transport, { ...run.selection.context }), null);
  assert.equal(await sendTask233LiveBuilderTurn(
    { ...run.transport },
    run.selection.context,
    run.spend,
    SECRET,
  ), null);
  assert.equal(await sendTask233LiveBuilderTurn(
    run.transport,
    { ...run.selection.context },
    run.spend,
    SECRET,
  ), null);
  assert.equal(run.seen.length, 0, "clones must fail before spend or fetch");
  const result = await sendTask233LiveBuilderTurn(
    run.transport,
    run.selection.context,
    run.spend,
    SECRET,
  );
  assert.ok(result?.ok);
  if (!result?.ok) return;
  assert.equal(run.seen.length, 3);
  assert.deepEqual(run.seen.map((call) => call.url), [
    TASK233_LIVE_MODELS_PREFLIGHT,
    TASK233_LIVE_ZDR_PREFLIGHT,
    TASK233_LIVE_ENDPOINT,
  ]);
  for (const call of run.seen.slice(0, 2)) {
    assert.equal(call.init.method, "GET");
    assert.equal(call.init.body, undefined);
    assert.equal(JSON.stringify(call.init.headers), JSON.stringify({ Accept: "application/json" }));
    assert.doesNotMatch(JSON.stringify(call.init), /Authorization|Bearer|syntheticBefore|taskSpec/u);
  }
  const post = run.seen[2];
  assert.equal(post?.init.method, "POST");
  assert.equal((post?.init.headers as Record<string, string>).Authorization, "Bearer " + SECRET);
  assert.equal((post?.init.headers as Record<string, string>)["X-OpenRouter-Metadata"], "enabled");
  const rawBody = post?.init.body;
  assert.equal(typeof rawBody, "string");
  const body = JSON.parse(rawBody as string) as Record<string, unknown>;
  assert.deepEqual(Object.keys(body), [
    "model", "messages", "temperature", "seed", "max_tokens", "stream", "provider",
  ]);
  assert.equal(body.model, TASK233_LIVE_MODEL);
  assert.equal(body.temperature, 0);
  assert.equal(body.seed, 233);
  assert.equal(body.max_tokens, 1_024);
  assert.equal(body.stream, false);
  assert.deepEqual(body.provider, {
    only: ["novita"],
    allow_fallbacks: false,
    require_parameters: true,
    data_collection: "deny",
    zdr: true,
    max_price: { prompt: 0.57, completion: 2.3, request: 0 },
  });
  const messages = body.messages as Array<{ role: string; content: string }>;
  assert.equal(messages.length, 2);
  assert.deepEqual(messages[0], { role: "system", content: TASK233_LIVE_FIXED_INSTRUCTION });
  assert.deepEqual(JSON.parse(messages[1]?.content ?? "null"), run.selection.context);
  assert.doesNotMatch(rawBody as string, new RegExp(SECRET, "u"));
  for (const forbidden of ["tools", "plugins", "route", "models", "user", "session_id", "web_search_options"]) {
    assert.equal(Object.hasOwn(body, forbidden), false, forbidden);
  }
  assert.equal(createHash("sha256").update(rawBody as string).digest("hex"),
    result.answer.receipt.requestBodySha256);

  assert.equal(result.answer.response.kind, "replacement-proposal");
  if (result.answer.response.kind === "replacement-proposal") {
    assert.equal(result.answer.response.replacements[0]?.projectRelativePath, SELECTED_PATH);
    assert.equal(result.answer.response.replacements[0]?.afterText, AFTER);
  }
  assert.equal(result.answer.receipt.model, TASK233_LIVE_MODEL);
  assert.equal(result.answer.receipt.providerSlug, "novita");
  assert.equal(result.answer.receipt.providerName, "NovitaAI");
  assert.equal(result.answer.receipt.attempts, 1);
  assert.equal(result.answer.receipt.modelRequests, 1);
  assert.equal(result.answer.receipt.preflightRequests, 2);
  assert.equal(result.answer.receipt.toolDefinitions, 0);
  assert.equal(result.answer.receipt.ambientMessages, 0);
  assert.ok(Number(result.answer.receipt.localWorstCaseCostUsd) < 0.05);
  assert.ok(result.answer.receipt.providerCostUsd < 0.05);
  assert.equal(task233LiveBuilderAnswerMatches(
    run.transport,
    run.selection.context,
    result.answer,
  ), true);
  assert.ok(consumeTask233LiveBuilderAnswer(
    run.transport,
    run.selection.context,
    result.answer,
  ));
  assert.equal(consumeTask233LiveBuilderAnswer(
    run.transport,
    run.selection.context,
    result.answer,
  ), null);
  assert.equal(await sendTask233LiveBuilderTurn(
    run.transport,
    run.selection.context,
    run.spend,
    SECRET,
  ), null);
  assert.equal(run.seen.length, 3, "no replay or retry may reach fetch");
  assert.equal(readFileSync(join(run.project.path, SELECTED_PATH), "utf8"), BEFORE);
  assert.equal(git(run.project.path, ["status", "--porcelain=v2", "--untracked-files=all"]), "");

  const markerText = readFileSync(join(run.profile.path, TASK233_LIVE_SPEND_MARKER), "utf8");
  const marker = parseTask233LiveSpendMarker(markerText);
  assert.ok(marker);
  assert.equal(marker.contextSha256, builderTurnContextSha256(run.selection.context));
  assert.equal(marker.requestBodySha256, result.answer.receipt.requestBodySha256);
  assert.doesNotMatch(markerText, /syntheticBefore|Hello from|Bearer|sk-or|examples\/synthetic/u);
  assert.equal(reserveTask233LiveSpend(
    run.profile.path,
    run.selection.context,
    result.answer.receipt.requestBodySha256,
  ), null);
});

test("preflight drift spends once and sends no paid request", async () => {
  const run = harness([jsonResponse(modelCatalog("0.00000058"))]);
  const result = await sendTask233LiveBuilderTurn(
    run.transport,
    run.selection.context,
    run.spend,
    SECRET,
  );
  assert.ok(result && !result.ok);
  if (!result || result.ok) return;
  assert.equal(result.failure.code, "TASK233_MODEL_CATALOG_REFUSED");
  assert.equal(result.failure.preflightRequests, 1);
  assert.equal(result.failure.modelRequests, 0);
  assert.equal(run.seen.length, 1);
  assert.equal(await sendTask233LiveBuilderTurn(
    run.transport,
    run.selection.context,
    run.spend,
    SECRET,
  ), null);
  assert.equal(run.seen.length, 1);
});

test("the exact current Novita fp8 ZDR endpoint shape is required before the paid boundary", async () => {
  for (const change of ["tag", "context"] as const) {
    const zdr = zdrCatalog();
    if (change === "tag") (zdr.data[0] as { tag: string }).tag = "novita";
    else zdr.data[0].context_length = 1_024;
    const run = harness([jsonResponse(modelCatalog()), jsonResponse(zdr)]);
    const result = await sendTask233LiveBuilderTurn(
      run.transport,
      run.selection.context,
      run.spend,
      SECRET,
    );
    assert.ok(result && !result.ok, change);
    if (!result || result.ok) continue;
    assert.equal(result.failure.code, "TASK233_ZDR_CATALOG_REFUSED", change);
    assert.equal(result.failure.preflightRequests, 2, change);
    assert.equal(result.failure.modelRequests, 0, change);
    assert.equal(run.seen.length, 2, change);
  }
});

test("redirect, wrong route, tool call and noncanonical text all refuse without retry", async () => {
  const fence = "\u0060\u0060\u0060";
  const scenarios: Array<{
    name: string;
    responses: Array<Response | Error>;
    code: string;
    calls: number;
  }> = [
    {
      name: "catalog redirect",
      responses: [new Response("", { status: 302, headers: { Location: "https://invalid.example" } })],
      code: "TASK233_PREFLIGHT_REDIRECT_REFUSED",
      calls: 1,
    },
    {
      name: "wrong provider",
      responses: [
        jsonResponse(modelCatalog()),
        jsonResponse(zdrCatalog()),
        jsonResponse(modelResponse({ provider: "Other" })),
      ],
      code: "TASK233_ROUTING_EVIDENCE_REFUSED",
      calls: 3,
    },
    {
      name: "paid request network failure",
      responses: [
        jsonResponse(modelCatalog()),
        jsonResponse(zdrCatalog()),
        new Error("synthetic raw transport detail that must not escape"),
      ],
      code: "TASK233_MODEL_NETWORK_REFUSED",
      calls: 3,
    },
    {
      name: "tool call",
      responses: [
        jsonResponse(modelCatalog()),
        jsonResponse(zdrCatalog()),
        jsonResponse(modelResponse({
          choices: [{
            index: 0,
            finish_reason: "tool_calls",
            message: {
              role: "assistant",
              content: "",
              tool_calls: [{ id: "tool-1", type: "function" }],
            },
          }],
        })),
      ],
      code: "TASK233_TEXT_RESPONSE_REFUSED",
      calls: 3,
    },
    {
      name: "markdown fence",
      responses: [
        jsonResponse(modelCatalog()),
        jsonResponse(zdrCatalog()),
        jsonResponse(modelResponse({
          choices: [{
            index: 0,
            finish_reason: "stop",
            message: {
              role: "assistant",
              content: fence + "json\n"
                + JSON.stringify({ summary: "x", afterText: AFTER }) + "\n" + fence,
            },
          }],
        })),
      ],
      code: "TASK233_TEXT_RESPONSE_REFUSED",
      calls: 3,
    },
  ];
  for (const scenario of scenarios) {
    const run = harness(scenario.responses);
    const result: Task233LiveBuilderCallResultV1 | null = await sendTask233LiveBuilderTurn(
      run.transport,
      run.selection.context,
      run.spend,
      SECRET,
    );
    assert.ok(result && !result.ok, scenario.name);
    if (!result || result.ok) continue;
    assert.equal(result.failure.code, scenario.code, scenario.name);
    assert.equal(run.seen.length, scenario.calls, scenario.name);
    assert.equal(await sendTask233LiveBuilderTurn(
      run.transport,
      run.selection.context,
      run.spend,
      SECRET,
    ), null, scenario.name);
    assert.equal(run.seen.length, scenario.calls, scenario.name + " replay");
  }
});

test("source graph keeps credential, network, append and owner-UI authority in their exact Task 233 seams", () => {
  assert.deepEqual(sourceConsumers(
    "reserveTask233LiveSpend",
    "main/builderliveapproval.ts",
  ), ["main/conductor/service.ts"]);
  assert.deepEqual(sourceConsumers(
    "createTask233LiveBuilderTransport",
    "main/builderlivetransport.ts",
  ), ["main/builderlivereviewroutefixture.ts"]);
  assert.deepEqual(sourceConsumers(
    "sendTask233LiveBuilderTurn",
    "main/builderlivetransport.ts",
  ), ["main/conductor/service.ts"]);
  assert.deepEqual(sourceConsumers(
    "task233LiveRequestBodySha256",
    "main/builderlivetransport.ts",
  ), ["main/conductor/service.ts"]);
  assert.deepEqual(sourceConsumers(
    "consumeTask233LiveBuilderAnswer",
    "main/builderlivetransport.ts",
  ), ["main/builderlivereviewroutefixture.ts"]);
  assert.deepEqual(sourceConsumers(
    "task233LiveBuilderAnswerMatches",
    "main/builderlivetransport.ts",
  ), ["main/builderlivereviewroutefixture.ts"]);
  assert.deepEqual(sourceConsumers(
    "prepareTask233LiveBuilderReview",
    "main/builderlivereviewroutefixture.ts",
  ), ["main/main.ts"]);
  assert.deepEqual(sourceConsumers(
    "appendTask233LiveBuilderReview",
    "main/builderlivereviewroutefixture.ts",
  ), ["main/main.ts"]);
  assert.deepEqual(sourceConsumers(
    "sendTask233ApprovedLiveBuilderTurn",
    "main/conductor/service.ts",
  ), ["main/main.ts"]);
  assert.deepEqual(sourceConsumers(
    "task233FixedTrackedTextRequestForTests",
    "main/builderproposalreviewfixture.ts",
  ), ["main/builderlivereviewroutefixture.ts"]);

  const approval = appSource("src/main/builderliveapproval.ts");
  assert.match(approval, /O_CREAT \| constants\.O_EXCL \| constants\.O_WRONLY/u);
  assert.match(approval, /writeFileSync\(descriptor, bytes\);\s*fsyncSync\(descriptor\)/u);
  assert.match(approval, /PROFILE_NAME = \/\^cairn-task233-profile-/u);
  assert.match(approval, /writeCreateOnly\(markerPath, bytes\)[\s\S]*authorities\.set\(authority/u,
    "durable create-only evidence must precede process-local spend authority");
  assert.doesNotMatch(approval, /apiKey|Authorization|Bearer |selectedTrackedText|afterText/u);

  const transport = appSource("src/main/builderlivetransport.ts");
  assert.equal((transport.match(/state\.fetch\(/gu) ?? []).length, 3,
    "the dedicated transport has exactly two preflights and one model boundary");
  assert.equal((transport.match(/redirect: "manual"/gu) ?? []).length, 3);
  assert.equal((transport.match(/Authorization: "Bearer " \+ apiKeyValue/gu) ?? []).length, 1);
  const sendStart = transport.indexOf("export async function sendTask233LiveBuilderTurn(");
  const spend = transport.indexOf("state.spent = true;", sendStart);
  const consume = transport.indexOf("consumeTask233LiveSpend(", spend);
  const preflight = transport.indexOf("await preflight(state)", consume);
  const post = transport.indexOf("state.fetch(TASK233_LIVE_ENDPOINT", preflight);
  assert.ok(sendStart >= 0 && spend > sendStart && consume > spend && preflight > consume && post > preflight);
  assert.match(transport, /only: \[TASK233_LIVE_PROVIDER_SLUG\],[\s\S]*allow_fallbacks: false,[\s\S]*require_parameters: true,[\s\S]*data_collection: "deny",[\s\S]*zdr: true/u);
  assert.match(transport, /endpoint\.tag !== TASK233_LIVE_PROVIDER_ENDPOINT_TAG[\s\S]*endpoint\.quantization !== "fp8"[\s\S]*endpoint\.context_length !== modelPrice\.contextLength[\s\S]*endpoint\.max_prompt_tokens !== null/u);
  assert.match(transport, /max_tokens: TASK233_LIVE_MAX_TOKENS,[\s\S]*stream: false/u);
  assert.doesNotMatch(transport.slice(sendStart), /\b(?:retry|followRedirect|setInterval)\s*\(/u);

  const route = appSource("src/main/builderlivereviewroutefixture.ts");
  assert.match(route, /createTask233LiveBuilderTransport\(selection\.context\);/u,
    "the live route supplies no replaceable fetch or credential input");
  assert.equal((route.match(/builderTrackedTextSelectionStillExact\(projectRoot, selection\)/gu) ?? []).length, 5);
  assert.match(route, /consumeTask233LiveBuilderAnswer[\s\S]*newConversationId\(projectRoot\)[\s\S]*appendBuilderReviewTurn/u);
  assert.doesNotMatch(route, /\b(?:fetch|apiKey|Authorization|Bearer|ipcMain|ipcRenderer|shell)\b/u);

  const service = appSource("src/main/conductor/service.ts");
  const serviceStart = service.indexOf("export async function sendTask233ApprovedLiveBuilderTurn(");
  const serviceEnd = service.indexOf("\n/** Starts (or continues) a conversation", serviceStart);
  const body = service.slice(serviceStart, serviceEnd);
  assert.match(body, /conn\.baseUrl !== OPENROUTER_BASE_URL[\s\S]*conn\.model !== "moonshotai\/kimi-k2"[\s\S]*conn\.authenticationOrigin !== "pasted-api-key"[\s\S]*conn\.credential\.kind !== "inline-encrypted"/u);
  const reserve = body.indexOf("reserveTask233LiveSpend(");
  const decrypt = body.indexOf("keystore.decryptedKey(conn)");
  const send = body.indexOf("await sendTask233LiveBuilderTurn(");
  const after = body.indexOf("TASK233_LIVE_CONNECTION_CHANGED_AFTER_CALL", send);
  assert.ok(reserve >= 0 && decrypt > reserve && send > decrypt && after > send);
  assert.equal((body.match(/keystore\.decryptedKey\(conn\)/gu) ?? []).length, 1);
  assert.match(body, /finally \{\s*apiKey = "";\s*\}/u);
  assert.doesNotMatch(body, /return\s+apiKey|apiKey\s*:/u);

  const main = appSource("src/main/main.ts");
  assert.match(main, /CAIRN_TEST_BUILDER_LIVE === "task233-openrouter-kimi-k2-novita-v1"/u);
  assert.match(main, /process\.env\.CAIRN_MOCK !== "0"/u);
  assert.match(main, /suppressExternalOpen: builderLiveE2eRequested/u);
  assert.match(main, /registerConductorIpc\(\{ suppressOAuth: builderLiveE2eRequested \}\)/u);
  assert.match(main, /if \(builderLiveE2eRequested && task233LivePhase === "call"\)/u);
  assert.equal((main.match(/__CAIRN_TASK233_RUN_APPROVED_LIVE_BUILDER__/gu) ?? []).length, 2);

  const liveSpec = appSource("tests/builder-live-conversation.spec.ts");
  assert.match(liveSpec, /CAIRN_MOCK: "0"/u);
  assert.match(liveSpec, /launch\(project, profile, "call"\)[\s\S]*launch\(project, profile, "restore"\)/u);
  assert.match(liveSpec, /TASK233_WAITING_FOR_OWNER_PASTED_KEY_CONNECTION/u);
  assert.match(liveSpec, /TASK233_SAFE_RECEIPT " \+ JSON\.stringify\(result\.receipt\)/u);
  assert.doesNotMatch(liveSpec, /\.click\(|\.fill\(|\.type\(|\.press\(|conductorConnect|conductorOAuth|input\[type=.*password|\bapiKey\b|openExternal/iu,
    "the desktop proof must never drive, locate, or receive the owner's credential or an alternate login route");
});
