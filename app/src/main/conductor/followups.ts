const FENCE = /```cairn-followups\s*\n([\s\S]*?)\n```/;

/** One suggestion's hard bounds: a single short line the owner could tap and
 * send as-is. A multi-line suggestion could smuggle a second message's worth
 * of text into one chip, so newlines fail closed, same as the task block's
 * outcome. */
const MAX_ITEMS = 3;
const MAX_LENGTH = 140;

export interface FollowupsResult {
  followups: string[] | null;
  text: string;
}

/** The one validator, shared by the parser below (fresh model output) and by
 * `store.ts` (a persisted cairn turn read back from a file a worker could
 * write to). Both fail closed: anything off-shape becomes no suggestions at
 * all, never a coerced one. Returns null for "not a valid list"; the caller
 * treats that exactly like "no block was emitted". */
export function sanitizeFollowups(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_ITEMS) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const suggestion = item.trim();
    if (!suggestion || suggestion.length > MAX_LENGTH || /[\r\n]/.test(suggestion)) return null;
    // A duplicated suggestion is sloppy, not hostile: drop the repeat, keep
    // the list — but a list of ONLY repeats still yields its one item.
    if (!out.includes(suggestion)) out.push(suggestion);
  }
  return out.length > 0 ? out : null;
}

/** Cairn's code, not the model, decides what becomes chips. Anything that
 * fails the exact shape is dropped; the comment's visible text always
 * survives with the fence stripped — the same posture as the task block. */
export function extractFollowups(reply: string): FollowupsResult {
  const match = FENCE.exec(reply);
  if (!match) return { followups: null, text: reply };
  const text = (reply.slice(0, match.index) + reply.slice(match.index + match[0].length)).trim();
  return { followups: sanitizeFollowups(parseJson(match[1])), text };
}

function parseJson(raw: string): unknown {
  if (raw.length > 1000) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
