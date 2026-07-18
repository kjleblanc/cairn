import { relative, resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { checkBashCommand } from "./gates.js";
import { pad, paths } from "./files.js";
import { metadataBlock, parallelDraftEnabled, taskArtifactPaths } from "./coordinator.js";

export type Role = "definer" | "builder" | "reviewer" | "direction";

/** At most this many owner questions per run — enforced in code, not prose. */
export const OWNER_QUESTION_LIMIT = 3;

/** What the asking agent is told when no answer arrives (skip, cancel, or any failure). */
export const NO_ANSWER_FALLBACK =
  "No answer — use your best judgment and write the assumption into the brief.";

/** The definer-only ask tool's full name inside the Agent SDK (server "cairn", tool "ask_owner"). */
export const ASK_OWNER_TOOL = "mcp__cairn__ask_owner";

/** One question from the AI to the owner, with its place in the per-run cap. */
export interface OwnerQuestion {
  question: string;
  asked: number; // 1-based: this is question N…
  limit: number; // …of at most this many.
}

export interface RunEvents {
  onText?: (text: string) => void;
  onTool?: (name: string, detail: string) => void;
  onDenied?: (name: string, why: string) => void;
  /**
   * Optional two-way channel: show the owner one question, wait, and resolve with
   * their words — or null for "no answer". Only definer runs ever ask. A skin that
   * wires nothing behaves exactly as before this channel existed.
   */
  onAsk?: (q: OwnerQuestion) => Promise<string | null>;
}

export interface RunResult {
  text: string;
  costUsd?: number;
}

export interface RunSpec {
  role: Role;
  root: string;
  taskNumber?: number;
  system: string;
  user: string;
  /** "refine" marks a follow-up definer turn on a not-yet-approved brief. Absent = a normal run. */
  intent?: "refine";
  /** The owner's question or change request, carried alongside a refine turn. */
  ownerMessage?: string;
  /** Frozen exact paths for a coordinated builder. Absent keeps the legacy path unchanged. */
  allowedPaths?: string[];
}

export interface Engine {
  run(spec: RunSpec, events: RunEvents): Promise<RunResult>;
}

/**
 * The one gatekeeper for owner questions, shared by the real and mock engines.
 * Returns an asking function only for a definer run with a wired channel —
 * every other role gets null and simply cannot ask. The function itself:
 *  - stops at OWNER_QUESTION_LIMIT questions (the cap is counted here, in code);
 *  - turns a skipped, blank, cancelled, or failed answer into NO_ANSWER_FALLBACK;
 *  - never throws and never re-asks — so an unanswered question can never
 *    hang or kill the run from core's side.
 */
export function makeAskOwner(spec: RunSpec, events: RunEvents): ((question: string) => Promise<string>) | null {
  const channel = events.onAsk;
  if (!channel || spec.role !== "definer") return null;
  let asked = 0;
  return async (question: string) => {
    const q = (question ?? "").trim();
    if (!q) return NO_ANSWER_FALLBACK;
    if (asked >= OWNER_QUESTION_LIMIT) {
      return `Question limit reached (${OWNER_QUESTION_LIMIT} per run). ${NO_ANSWER_FALLBACK}`;
    }
    asked++;
    try {
      const answer = await channel({ question: q, asked, limit: OWNER_QUESTION_LIMIT });
      const clean = (answer ?? "").trim();
      return clean ? `The owner answered: ${clean}` : NO_ANSWER_FALLBACK;
    } catch {
      return NO_ANSWER_FALLBACK;
    }
  };
}

/** The built-in default model, used only when nothing else is chosen. Kept verbatim. */
export const DEFAULT_MODEL = "claude-opus-4-8";

/**
 * Decide which model a run should use. An explicit choice (a CLI flag or an app
 * setting) wins; otherwise the CAIRN_MODEL environment variable; otherwise the
 * built-in default. A blank or whitespace-only choice counts as "no choice", so
 * clearing a selection returns to exactly today's behaviour.
 */
export function resolveModel(explicit?: string): string {
  const chosen = (explicit ?? "").trim();
  if (chosen) return chosen;
  return process.env.CAIRN_MODEL || DEFAULT_MODEL;
}

/** The named effort levels the Claude Agent SDK accepts. */
export const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;

/**
 * Decide which effort level a run should use, mirroring resolveModel. An
 * explicit choice (a CLI flag or an app setting) wins; otherwise the
 * CAIRN_EFFORT environment variable; otherwise undefined — meaning no effort
 * option is sent to the SDK at all, so Cairn behaves exactly as it does today.
 * A blank or whitespace-only choice counts as "no choice".
 */
export function resolveEffort(explicit?: string): string | undefined {
  const chosen = (explicit ?? "").trim();
  if (chosen) return chosen;
  return process.env.CAIRN_EFFORT?.trim() || undefined;
}

function norm(root: string, p: string): string {
  return relative(resolve(root), resolve(root, p)).replace(/\\/g, "/");
}

/**
 * Per-role tool policy, enforced through the Agent SDK's canUseTool callback.
 * This is where prose becomes physics:
 *  - the definer can only write its own brief file;
 *  - the builder cannot push, install, deploy, or reach the network;
 *  - the reviewer cannot read the builder's report until it has stated a
 *    provisional verdict (anti-anchoring, enforced);
 *  - the direction check cannot write at all.
 */
function makeToolGate(spec: RunSpec, state: { reportUnlocked: boolean }, events: RunEvents) {
  const briefRel = spec.taskNumber ? norm(spec.root, paths.brief(spec.root, spec.taskNumber)) : "";
  const reportRel = spec.taskNumber ? norm(spec.root, paths.report(spec.root, spec.taskNumber)) : "";
  const coordinatedBuilderPaths = spec.role === "builder" && spec.allowedPaths
    ? new Set(spec.allowedPaths.map((path) => path.replace(/\\/g, "/")))
    : null;

  return async (request: unknown): Promise<{ approved: true } | { approved: false; reason: string }> => {
    const req = request as { tool_name?: string; name?: string; input?: Record<string, unknown> };
    const tool = req.tool_name ?? req.name ?? "";
    const input = req.input ?? {};
    const deny = (reason: string) => {
      events.onDenied?.(tool, reason);
      return { approved: false as const, reason };
    };

    // Only the definer may ask the owner anything. The ask tool is mounted for
    // definer runs alone, but this stands even if that ever changes.
    if (/ask_owner/i.test(tool) && spec.role !== "definer") {
      return deny("Only the definer may ask the owner a question.");
    }

    if (/^Bash/i.test(tool)) {
      if (spec.role === "definer" || spec.role === "direction" || spec.role === "reviewer") {
        const cmd = String(input.command ?? "");
        if (!/^\s*git\s+(status|log|diff|show|branch)\b/.test(cmd)) {
          return deny("This role may only run read-only git commands (status, log, diff, show, branch).");
        }
        return { approved: true };
      }
      const verdict = checkBashCommand(String(input.command ?? ""));
      if (!verdict.allowed) return deny(verdict.why);
      return { approved: true };
    }

    if (/^(Write|Edit|NotebookEdit)/i.test(tool)) {
      const target = norm(spec.root, String(input.file_path ?? input.path ?? ""));
      if (spec.role === "direction") return deny("The direction check changes nothing.");
      if (spec.role === "reviewer") return deny("The reviewer repairs nothing and writes nothing.");
      if (spec.role === "definer" && target !== briefRel) {
        return deny(`The definer may only write the brief file (${briefRel}).`);
      }
      if (spec.role === "builder" && target === briefRel) {
        return deny("The approved brief is frozen. A change of scope needs a new brief.");
      }
      if (spec.role === "builder" && coordinatedBuilderPaths && !coordinatedBuilderPaths.has(target)) {
        return deny(`The coordinated builder may write only its frozen exact paths; ${target || "that path"} is outside them.`);
      }
      return { approved: true };
    }

    if (/^Read/i.test(tool) && spec.role === "reviewer" && !state.reportUnlocked) {
      const target = norm(spec.root, String(input.file_path ?? input.path ?? ""));
      if (target === reportRel) {
        return deny('The report is locked until you state a line beginning "PROVISIONAL VERDICT:".');
      }
    }

    if (/^(WebFetch|WebSearch)/i.test(tool)) {
      return deny("Network access needs the owner's explicit approval outside this task.");
    }

    return { approved: true };
  };
}

function extractText(message: unknown): string {
  const m = message as { type?: string; message?: { content?: Array<{ type?: string; text?: string }> } };
  if (m.type !== "assistant" || !m.message?.content) return "";
  return m.message.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n");
}

export class SdkEngine implements Engine {
  private readonly model: string;
  private readonly effort?: string;

  /** An explicit model/effort wins over the environment and defaults (see resolveModel/resolveEffort). */
  constructor(model?: string, effort?: string) {
    this.model = resolveModel(model);
    this.effort = resolveEffort(effort);
  }

  async run(spec: RunSpec, events: RunEvents): Promise<RunResult> {
    const { query, createSdkMcpServer, tool } = await import("@anthropic-ai/claude-agent-sdk");
    const state = { reportUnlocked: false };
    const gate = makeToolGate(spec, state, events);

    // The definer-only ask tool: an in-process tool whose handler waits for the
    // skin to deliver the owner's answer (or a skip). Mounted only for a definer
    // run with a wired channel. If mounting fails for any reason, the run
    // proceeds exactly as today — without the ability to ask.
    const askOwner = makeAskOwner(spec, events);
    let askServer: unknown;
    if (askOwner) {
      try {
        // zod ships with the Agent SDK's own MCP dependency — nothing new is installed.
        const { z } = await import("zod");
        askServer = createSdkMcpServer({
          name: "cairn",
          version: "1.0.0",
          tools: [
            tool(
              "ask_owner",
              `Ask the owner ONE short plain-language question and wait for their answer. ` +
                `At most ${OWNER_QUESTION_LIMIT} questions per run. Never ask for a password, key, or any secret.`,
              { question: z.string().describe("One short plain-language question for the owner.") },
              async (args) => ({
                content: [{ type: "text" as const, text: await askOwner(String((args as { question?: unknown }).question ?? "")) }],
              }),
            ),
          ],
        });
      } catch {
        askServer = undefined; // No ask tool — the definer still writes the brief on its own judgment.
      }
    }

    const q = query({
      prompt: spec.user,
      options: {
        cwd: spec.root,
        model: this.model,
        // Only sent when chosen — with no choice the SDK behaves exactly as today.
        ...(this.effort ? { effort: this.effort } : {}),
        systemPrompt: spec.system,
        allowedTools: ["Read", "Glob", "Grep", "Write", "Edit", "Bash", ...(askServer ? [ASK_OWNER_TOOL] : [])],
        disallowedTools: ["WebFetch", "WebSearch"],
        ...(askServer ? { mcpServers: { cairn: askServer } } : {}),
        canUseTool: gate as never,
        maxTurns: spec.role === "builder" ? 80 : 30,
      } as never,
    });

    let text = "";
    let costUsd: number | undefined;
    for await (const message of q as AsyncIterable<unknown>) {
      const chunk = extractText(message);
      if (chunk) {
        text += (text ? "\n" : "") + chunk;
        if (/PROVISIONAL VERDICT:/.test(chunk)) state.reportUnlocked = true;
        events.onText?.(chunk);
      }
      const anyMsg = message as { type?: string; result?: { total_cost_usd?: number }; total_cost_usd?: number };
      if (anyMsg.type === "result") {
        costUsd = anyMsg.result?.total_cost_usd ?? anyMsg.total_cost_usd;
      }
    }
    return { text, costUsd };
  }
}

/**
 * Offline engine for tests and demos (CAIRN_MOCK=1 or --mock). It exercises the
 * exact same gates and flows without any model call.
 */
export class MockEngine implements Engine {
  private readonly model: string;
  private readonly effort?: string;

  constructor(model?: string, effort?: string) {
    this.model = resolveModel(model);
    this.effort = resolveEffort(effort);
  }

  async run(spec: RunSpec, events: RunEvents): Promise<RunResult> {
    const say = (t: string) => {
      events.onText?.(t);
      return t;
    };
    // Echo the active model (and effort, when chosen) so a selection is visible with no paid call.
    events.onText?.(`Using model: ${this.model}${this.effort ? ` · effort: ${this.effort}` : ""} (mock)`);
    if (spec.role === "definer" && spec.taskNumber) {
      const briefPath = paths.brief(spec.root, spec.taskNumber);
      if (spec.intent === "refine") {
        // A follow-up turn on the not-yet-approved brief: a question gets a plain
        // answer and changes nothing; a change request revises the brief file.
        const message = (spec.ownerMessage ?? "").trim();
        const current = existsSync(briefPath) ? readFileSync(briefPath, "utf8") : "";
        if (/\?\s*$/.test(message)) {
          return { text: say(`Answer (mock): about "${message}" — the brief already covers that; nothing was changed.`) };
        }
        writeFileSync(
          briefPath,
          current + `\n## Revision (mock)\n\nThe owner asked: ${message}\nThe brief was revised to honor that.\n`,
        );
        return { text: say("Brief revised (mock). Read it again before approving.") };
      }
      // The mock definer asks exactly one question when a channel is wired, so the
      // whole two-way flow is visible at $0. With nothing wired it behaves as before.
      const askOwner = makeAskOwner(spec, events);
      const ownerLine = askOwner
        ? `Owner Q&A: ${await askOwner("Before I write the brief: is there anything this task must be careful not to touch? (mock)")}\n`
        : "";
      const parallel = parallelDraftEnabled();
      const taskFile = `demo-${pad(spec.taskNumber)}.txt`;
      const metadata = parallel
        ? `\n\n## Coordinator metadata\n\n${metadataBlock({
            schemaVersion: 1,
            lane: "Standard",
            mode: "Draft",
            allowedPaths: [taskFile],
            dependencies: [],
            checks: ['node -e "process.exit(0)"'],
            externalActions: [],
          })}\n`
        : "";
      mkdirSync(dirname(briefPath), { recursive: true });
      writeFileSync(
        briefPath,
        `# Task ${pad(spec.taskNumber)} — brief (mock)\n\nMode: Draft\nLane: Standard\n\n` +
          `Outcome: ${spec.user.slice(spec.user.indexOf("outcome:") + 8, spec.user.indexOf("outcome:") + 120).trim() || "mock outcome"}\n\n` +
          `Allowed: ${parallel ? taskFile : "demo.txt"}\nForbidden: everything else\nOwner will see: ${parallel ? taskFile : "demo.txt"} contains a greeting\n` +
          ownerLine +
          `Checks: file exists\nDONE when: file written\nSTOPPED if: cannot write\n` + metadata,
      );
      return { text: say(`Brief saved (mock). Lane: Standard, Mode: Draft.`) };
    }
    if (spec.role === "builder" && spec.taskNumber) {
      const taskFile = spec.allowedPaths?.find((path) => !taskArtifactPaths(spec.taskNumber!).includes(path)) ?? "demo.txt";
      writeFileSync(resolve(spec.root, taskFile), "hello from the mock builder\n");
      writeFileSync(
        paths.report(spec.root, spec.taskNumber),
        `# Task ${pad(spec.taskNumber)} — report (mock)\n\nResult: ${taskFile} written.\nFiles changed: ${taskFile}\n` +
          `Commands: none\nHow to try it: open ${taskFile}\nHuman checks: read the file\nLimitations: mock\n` +
          `Milestone movement: YES\n\nDisposition: DONE\n`,
      );
      return { text: say("Built (mock). Report written. Disposition: DONE.") };
    }
    if (spec.role === "reviewer") {
      const provisional = say("PROVISIONAL VERDICT: PASS — the diff matches the brief (mock).");
      const final = say("FINAL VERDICT: PASS — builder claims held up (mock).");
      return { text: `${provisional}\n${final}` };
    }
    return { text: say("Direction check (mock): reduce the milestone, try a Draft, or get help.") };
  }
}

export function pickEngine(mock: boolean, model?: string, effort?: string): Engine {
  return mock || process.env.CAIRN_MOCK === "1" ? new MockEngine(model, effort) : new SdkEngine(model, effort);
}
