import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

interface WorkerRequest { schemaVersion: 1; worktree: string; path: string; replacement: string }

function fail(): never { throw new Error("WORKER_PROTOCOL_INVALID"); }

function parse(raw: string): WorkerRequest {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail(); }
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return fail();
  const v = value as Record<string, unknown>;
  if (JSON.stringify(Object.keys(v).sort()) !== JSON.stringify(["path", "replacement", "schemaVersion", "worktree"]) ||
      v.schemaVersion !== 1 || typeof v.worktree !== "string" || typeof v.path !== "string" || typeof v.replacement !== "string" ||
      isAbsolute(v.path) || v.path.includes("..") || v.path.includes("\\") || /[\r\n\0]/.test(v.replacement)) return fail();
  return v as unknown as WorkerRequest;
}

const raw = readFileSync(0, "utf8");
const request = parse(raw);
const root = resolve(request.worktree);
const target = resolve(join(root, request.path));
const rel = relative(root, target);
if (!rel || rel.startsWith("..") || isAbsolute(rel)) fail();
writeFileSync(target, request.replacement + "\n", "utf8");
process.stdout.write(JSON.stringify({ schemaVersion: 1, ok: true, pid: process.pid }) + "\n");
