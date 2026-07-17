import { relative, resolve } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { checkBashCommand } from "./gates.js";
import { pad, paths } from "./files.js";

export type Role = "definer" | "builder" | "reviewer" | "direction";

export interface RunEvents {
  onText?: (text: string) => void;
  onTool?: (name: string, detail: string) => void;
  onDenied?: (name: string, why: string) => void;
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
}

export interface Engine {
  run(spec: RunSpec, events: RunEvents): Promise<RunResult>;
}

const MODEL = process.env.CAIRN_MODEL || "claude-opus-4-8";

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

  return async (request: unknown): Promise<{ approved: true } | { approved: false; reason: string }> => {
    const req = request as { tool_name?: string; name?: string; input?: Record<string, unknown> };
    const tool = req.tool_name ?? req.name ?? "";
    const input = req.input ?? {};
    const deny = (reason: string) => {
      events.onDenied?.(tool, reason);
      return { approved: false as const, reason };
    };

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
  async run(spec: RunSpec, events: RunEvents): Promise<RunResult> {
    const { query } = await import("@anthropic-ai/claude-agent-sdk");
    const state = { reportUnlocked: false };
    const gate = makeToolGate(spec, state, events);

    const q = query({
      prompt: spec.user,
      options: {
        cwd: spec.root,
        model: MODEL,
        systemPrompt: spec.system,
        allowedTools: ["Read", "Glob", "Grep", "Write", "Edit", "Bash"],
        disallowedTools: ["WebFetch", "WebSearch"],
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
  async run(spec: RunSpec, events: RunEvents): Promise<RunResult> {
    const say = (t: string) => {
      events.onText?.(t);
      return t;
    };
    if (spec.role === "definer" && spec.taskNumber) {
      const briefPath = paths.brief(spec.root, spec.taskNumber);
      mkdirSync(dirname(briefPath), { recursive: true });
      writeFileSync(
        briefPath,
        `# Task ${pad(spec.taskNumber)} — brief (mock)\n\nMode: Draft\nLane: Standard\n\n` +
          `Outcome: ${spec.user.slice(spec.user.indexOf("outcome:") + 8, spec.user.indexOf("outcome:") + 120).trim() || "mock outcome"}\n\n` +
          `Allowed: demo.txt\nForbidden: everything else\nOwner will see: demo.txt contains a greeting\n` +
          `Checks: file exists\nDONE when: file written\nSTOPPED if: cannot write\n`,
      );
      return { text: say(`Brief saved (mock). Lane: Standard, Mode: Draft.`) };
    }
    if (spec.role === "builder" && spec.taskNumber) {
      writeFileSync(resolve(spec.root, "demo.txt"), "hello from the mock builder\n");
      writeFileSync(
        paths.report(spec.root, spec.taskNumber),
        `# Task ${pad(spec.taskNumber)} — report (mock)\n\nResult: demo.txt written.\nFiles changed: demo.txt\n` +
          `Commands: none\nHow to try it: open demo.txt\nHuman checks: read the file\nLimitations: mock\n` +
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

export function pickEngine(mock: boolean): Engine {
  return mock || process.env.CAIRN_MOCK === "1" ? new MockEngine() : new SdkEngine();
}
