import type { TaskBlock, TaskBlockConcern } from "../../shared/ipc.js";

const FENCE = /```cairn-task\s*\n([\s\S]*?)\n```/;

export interface TaskBlockResult {
  block: TaskBlock | null;
  text: string;
}

/** Cairn's code, not the model, decides what becomes a card. Anything that
 * fails the exact shape is dropped; the conversation text always survives. */
export function extractTaskBlock(reply: string): TaskBlockResult {
  const match = FENCE.exec(reply);
  if (!match) return { block: null, text: reply };
  const text = (reply.slice(0, match.index) + reply.slice(match.index + match[0].length)).trim();
  return { block: parseBlock(match[1]), text };
}

function parseBlock(raw: string): TaskBlock | null {
  if (raw.length > 4000) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const allowed = new Set(["outcome", "concerns", "notes"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.outcome !== "string") return null;
  const outcome = record.outcome.trim();
  if (!outcome || outcome.length > 300) return null;
  const concernsRaw = record.concerns ?? [];
  if (!Array.isArray(concernsRaw) || concernsRaw.length > 3) return null;
  const concerns: TaskBlockConcern[] = [];
  for (const item of concernsRaw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    if (Object.keys(item).sort().join(",") !== "kind,text") return null;
    const kind = (item as Record<string, unknown>).kind;
    const text = (item as Record<string, unknown>).text;
    if (kind !== "question" && kind !== "risk") return null;
    if (typeof text !== "string" || !text.trim() || text.length > 300) return null;
    concerns.push({ kind, text: text.trim() });
  }
  const notesRaw = record.notes ?? "";
  if (typeof notesRaw !== "string" || notesRaw.length > 1000) return null;
  return { outcome, concerns, notes: notesRaw.trim() };
}
