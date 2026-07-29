import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

/** The fake-kimi lane, in the fake-codex idiom (Level 3a plan Task 4). A PATH
 * shim that answers as the official Kimi Code CLI does, so a test can drive
 * the whole real-call path (CAIRN_MOCK=0) without touching the REAL signed-in
 * CLI on this machine: the returned env is spread into an Electron launch,
 * `marker` records that the exec really started, and `argv`/`prompt` capture
 * exactly what the worker was handed.
 *
 * Two differences from the codex fake matter (both spike-observed):
 *
 *   1. The prompt arrives as ONE `-p` argv element, never on stdin — so the
 *      shim records `process.argv` and writes its started-marker at spawn,
 *      not on stdin end.
 *   2. The env must set BOTH `CAIRN_TEST_LANE=1` and `CAIRN_FAKE_KIMI=1`:
 *      core's fail-closed guard resolves every kimi command to not-found when
 *      the test marker is present without the explicit fake opt-in.
 *
 * The `.cmd` shim ceiling (measured, Task 119): cmd.exe truncates a multi-line
 * argv element at the first newline, so on Windows the fake receives only the
 * composed prompt's first line. The real CLI is a NATIVE kimi.exe — the same
 * probe shows a native binary's argv carries embedded newlines intact — so
 * this ceiling is the fixture's, not the wire's. The full composed prompt
 * (print-mode honesty line, owner details verbatim) is pinned at the request
 * level in core/test/kimi.test.ts; the E2E here pins the spawn shape.
 *
 * The shim answers `--version` (exit 0), `acp` (a minimal JSON-RPC peer:
 * initialize result, then authenticate result — or -32000 when `connected`
 * is false), `provider list` (the spike-observed `source=oauth` line), and
 * `-p` (the spike-observed success transcript: one assistant message with a
 * cairn-claims fence, writing visible.txt into cwd, plus a trailing
 * role:"meta" line). `behavior` adds "invalid-jsonl", "missing-claims", and
 * "slow" (eight seconds, the only lane long enough to watch or stop).
 */
export function fakeKimiEnvironment(_project: string, connected: boolean, behavior: "success" | "invalid-jsonl" | "missing-claims" | "slow" = "success"): { env: NodeJS.ProcessEnv; marker: string; argv: string; prompt: string } {
  const bin = mkdtempSync(join(tmpdir(), "cairn-fake-kimi-"));
  const marker = join(bin, "real-kimi-started.txt");
  const argvFile = join(bin, "real-kimi-argv.json");
  // What the worker was actually handed. The prompt arrives as one argv
  // element, so the shim keeps every byte of it: a test can then assert on
  // what Cairn really sent, not on what the app believed it sent.
  const prompt = join(bin, "real-kimi-prompt.txt");
  const dispatcher = join(bin, "fake-kimi.cjs");
  const dispatcherSource = `
const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
if (args.includes("--version")) process.exit(0);
if (args[0] === "provider" && args[1] === "list") {
  process.stdout.write("managed:kimi-code type=kimi models=4 source=oauth\\n");
  process.exit(0);
}
if (args[0] === "acp") {
  // A minimal JSON-RPC peer: the probe sends initialize (id 1) then
  // authenticate (id 2) on stdin and reads one reply per line on stdout.
  let buffer = "";
  process.stdin.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    let newline;
    while ((newline = buffer.indexOf("\\n")) >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (!line.trim()) continue;
      let message;
      try { message = JSON.parse(line); } catch { continue; }
      if (message.method === "initialize") {
        process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: { protocolVersion: 1, agentCapabilities: {} } }) + "\\n");
      } else if (message.method === "authenticate") {
        if (${JSON.stringify(connected)}) {
          process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: {} }) + "\\n");
        } else {
          process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: message.id, error: { code: -32000, message: "Authentication required" } }) + "\\n");
        }
      }
    }
  });
  process.stdin.resume();
  return;
}
// The worker run: the prompt is the argv element after "-p" (never stdin), so
// the started-marker lands at spawn, not on stdin end.
const pIndex = args.indexOf("-p");
if (pIndex < 0) process.exit(2);
fs.writeFileSync(process.env.CAIRN_FAKE_KIMI_MARKER, "started\\n");
fs.writeFileSync(process.env.CAIRN_FAKE_KIMI_ARGV, JSON.stringify(args));
fs.writeFileSync(process.env.CAIRN_FAKE_KIMI_PROMPT, args[pIndex + 1] ?? "");
const finish = () => {
  if (${JSON.stringify(behavior)} === "invalid-jsonl") {
    process.stdout.write("secret-looking malformed provider output\\n");
    return;
  }
  if (${JSON.stringify(behavior)} === "missing-claims") {
    // A secret-bearing assistant message, but no cairn-claims fence, so Cairn
    // parses no readable claims and stops WORKER_CLAIMS_MISSING.
    process.stdout.write(JSON.stringify({ role: "assistant", content: "sk-secret-kimi-payload" }) + "\\n");
    process.stdout.write(JSON.stringify({ role: "meta", type: "session.resume_hint", session_id: "fake-session" }) + "\\n");
    return;
  }
  // The worker does product work and speaks its account through one
  // cairn-claims fence. It writes no report or log row.
  const root = process.cwd();
  fs.writeFileSync(path.join(root, "visible.txt"), "model-authored result\\n");
  process.stdout.write(JSON.stringify({ role: "assistant", content: "Done.\\n\\n\`\`\`cairn-claims\\n" + JSON.stringify({ disposition: "DONE", summary: "Added the visible result.", changes: ["visible.txt — created"], checks: [{ name: "read back", result: "matches" }], howToTry: "Open visible.txt.", limitations: "None.", milestone: "NO" }) + "\\n\`\`\`" }) + "\\n");
  process.stdout.write(JSON.stringify({ role: "meta", type: "session.resume_hint", session_id: "fake-session" }) + "\\n");
};
setTimeout(finish, ${JSON.stringify(behavior === "slow" ? 8000 : 0)});
`;
  writeFileSync(dispatcher, dispatcherSource);
  if (process.platform === "win32") {
    writeFileSync(join(bin, "kimi.cmd"), `@"${process.execPath}" "${dispatcher}" %*\r\n`);
  } else {
    const executable = join(bin, "kimi");
    writeFileSync(executable, `#!${process.execPath}\n${dispatcherSource}`);
    chmodSync(executable, 0o755);
  }
  // LOCALAPPDATA points at an empty root, and the fake bin is PREPENDED to an
  // otherwise whole PATH — Windows `.cmd` shim launches resolve `cmd.exe`
  // through System32, so stripping PATH would break the very lane this fakes
  // (the Task 115 repair).
  const emptyLocalAppData = mkdtempSync(join(tmpdir(), "cairn-fake-kimi-localappdata-"));
  const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  return {
    marker,
    argv: argvFile,
    prompt,
    env: {
      [pathKey]: `${bin}${delimiter}${process.env[pathKey] ?? ""}`,
      CAIRN_FAKE_KIMI_MARKER: marker,
      CAIRN_FAKE_KIMI_ARGV: argvFile,
      CAIRN_FAKE_KIMI_PROMPT: prompt,
      LOCALAPPDATA: emptyLocalAppData,
      // Both, always: the positive test marker without the fake opt-in makes
      // core's fail-closed guard resolve every kimi command to not-found.
      CAIRN_TEST_LANE: "1",
      CAIRN_FAKE_KIMI: "1",
    },
  };
}
