import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

/** The fake-codex lane, shared. A PATH shim that answers as the official
 * Codex CLI does, so a test can drive the whole real-call path (CAIRN_MOCK=0)
 * without a paid call: the returned env is spread into an Electron launch,
 * `marker` records that the exec really started, `prompt` captures every byte
 * the worker was handed on stdin, and `release` deterministically completes
 * the focus/return lane. `behavior: "town"` stays alive until Stop kills it.
 *
 * Ported VERBATIM from app/tests/routing.spec.ts:20-82 (Phase 3 Task 6); the
 * only edit is the `export` keyword. routing.spec.ts imports it unchanged.
 */
export function fakeCodexEnvironment(_project: string, connected: boolean, behavior: "success" | "invalid-jsonl" | "missing-claims" | "slow" | "town" | "town-return" = "success"): { env: NodeJS.ProcessEnv; marker: string; prompt: string; release: string } {
  const bin = mkdtempSync(join(tmpdir(), "cairn-fake-codex-"));
  const marker = join(bin, "real-exec-started.txt");
  // What the worker was actually handed. The prompt arrives on stdin, so the
  // shim keeps every byte of it: a test can then assert on what Cairn really
  // sent, not on what the app believed it sent.
  const prompt = join(bin, "real-exec-prompt.txt");
  const release = join(bin, "release-real-exec.txt");
  const dispatcher = join(bin, "fake-codex.cjs");
  const dispatcherSource = `
const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
if (args.includes("--version")) process.exit(0);
if (args[0] === "login" && args[1] === "status") process.exit(${connected ? 0 : 1});
if (!args.includes("exec")) process.exit(2);
const received = [];
process.stdin.on("data", (chunk) => received.push(chunk));
process.stdin.resume();
process.stdin.on("end", () => {
  // Append one line per actual worker spawn. Most tests need only existence;
  // the simultaneous-start gate additionally proves there was exactly one.
  fs.appendFileSync(process.env.CAIRN_FAKE_CODEX_MARKER, "started\\n");
  fs.writeFileSync(process.env.CAIRN_FAKE_CODEX_PROMPT, Buffer.concat(received));
  const finish = () => {
    if (${JSON.stringify(behavior)} === "invalid-jsonl") {
      process.stdout.write("secret-looking malformed provider output\\n");
      return;
    }
    if (${JSON.stringify(behavior)} === "missing-claims") {
      // The same secret-bearing event stream, but no cairn-claims fence, so
      // Cairn parses no readable claims and stops WORKER_CLAIMS_MISSING.
      process.stdout.write(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "sk-secret-event-payload" } }) + "\\n");
      process.stdout.write(JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: "sk-secret-event-payload", status: "completed", exit_code: 0 } }) + "\\n");
      process.stdout.write(JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: "sk-secret-event-payload", status: "failed", exit_code: 1 } }) + "\\n");
      process.stdout.write(JSON.stringify({ type: "item.completed", item: { type: "file_change", path: "sk-secret-event-payload", status: "completed" } }) + "\\n");
      process.stdout.write(JSON.stringify({ type: "item.completed", item: { type: "file_change", path: "sk-secret-event-payload", status: "failed" } }) + "\\n");
      process.stdout.write(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 20, cached_input_tokens: 4, output_tokens: 6, reasoning_output_tokens: 2 } }) + "\\n");
      return;
    }
    // Task 048 (the inversion): the worker does product work and speaks its
    // account through one cairn-claims fence. It writes no report or log row.
    const root = process.cwd();
    fs.writeFileSync(path.join(root, "visible.txt"), "model-authored result\\n");
    process.stdout.write(JSON.stringify({ type: "item.completed", item: { id: "m", type: "agent_message", text: "Done.\\n\\n\`\`\`cairn-claims\\n" + JSON.stringify({ disposition: "DONE", summary: "Added the visible result.", changes: ["visible.txt — created"], checks: [{ name: "read back", result: "matches" }], howToTry: "Open visible.txt.", limitations: "None.", milestone: "YES" }) + "\\n\`\`\`" } }) + "\\n");
    process.stdout.write(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 200, cached_input_tokens: 50, output_tokens: 80, reasoning_output_tokens: 20 } }) + "\\n");
  };
  if (${JSON.stringify(behavior)} === "town") {
    setInterval(() => {}, 1000);
    return;
  }
  if (${JSON.stringify(behavior)} === "town-return") {
    const gate = setInterval(() => {
      if (!fs.existsSync(process.env.CAIRN_FAKE_CODEX_RELEASE)) return;
      clearInterval(gate);
      finish();
    }, 20);
    return;
  }
  setTimeout(finish, ${JSON.stringify(behavior === "slow" ? 8000 : 0)});
});
`;
  writeFileSync(dispatcher, dispatcherSource);
  if (process.platform === "win32") {
    writeFileSync(join(bin, "codex.cmd"), `@"${process.execPath}" "${dispatcher}" %*\r\n`);
  } else {
    const executable = join(bin, "codex");
    writeFileSync(executable, `#!${process.execPath}\n${dispatcherSource}`);
    chmodSync(executable, 0o755);
  }
  // The fake install carries its own sandbox helper so command resolution
  // accepts it as-is, and LOCALAPPDATA points at an empty root so no test can
  // ever escape to a real versioned Codex install and start a real paid call.
  writeFileSync(join(bin, "codex-windows-sandbox-setup.exe"), "");
  const emptyLocalAppData = mkdtempSync(join(tmpdir(), "cairn-fake-localappdata-"));
  const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  return {
    marker,
    prompt,
    release,
    env: {
      [pathKey]: `${bin}${delimiter}${process.env[pathKey] ?? ""}`,
      CAIRN_FAKE_CODEX_MARKER: marker,
      CAIRN_FAKE_CODEX_PROMPT: prompt,
      CAIRN_FAKE_CODEX_RELEASE: release,
      LOCALAPPDATA: emptyLocalAppData,
      // Task 119: with kimi detection now part of every real lane, the codex
      // lane sets the positive test marker WITHOUT the fake-kimi opt-in, so
      // core's fail-closed guard resolves every kimi command to not-found and
      // the REAL signed-in Kimi CLI on this machine can never turn a codex
      // spec two-candidate.
      CAIRN_TEST_LANE: "1",
    },
  };
}
