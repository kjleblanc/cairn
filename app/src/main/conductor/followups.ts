const FOLLOWUP_OPENING = "```cairn-followups";

/** One suggestion's hard bounds: a single short line the owner could tap and
 * send as-is. A multi-line suggestion could smuggle a second message's worth
 * of text into one control, so newlines fail closed, same as the task block's
 * outcome. */
const MAX_ITEMS = 3;
const MAX_LENGTH = 140;

type RawFollowupFence = {
  raw: string | null;
  start: number;
  end: number;
};

type ReplyLine = {
  start: number;
  end: number;
  after: number;
  text: string;
};

export interface FollowupsResult {
  followups: string[] | null;
  text: string;
}

/** Recognize only a standalone exact protocol fence. Markdown examples may
 * legitimately mention the protocol, so an exact-looking fence nested inside
 * any ordinary backtick or tilde fence remains inert and visible. */
function followupFences(reply: string): {
  fences: RawFollowupFence[];
  trailingInsideOuterFence: boolean;
  trailingClosesOuterFence: boolean;
} {
  const lines: ReplyLine[] = [];
  for (let start = 0; start < reply.length;) {
    const newline = reply.indexOf("\n", start);
    const end = newline === -1 ? reply.length : newline;
    lines.push({
      start,
      end,
      after: newline === -1 ? reply.length : newline + 1,
      text: reply.slice(start, end),
    });
    start = newline === -1 ? reply.length : newline + 1;
  }

  const fences: RawFollowupFence[] = [];
  let outer: { marker: "`" | "~"; length: number; line: number; exactClose: boolean } | null = null;
  let trailingClosesOuterFence = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (outer !== null) {
      const close = /^( {0,3})(`+|~+)[ \t]*\r?$/.exec(line.text);
      const closesOuter = outer.exactClose
        ? /^```[ \t]*\r?$/.test(line.text)
        : close && close[2][0] === outer.marker && close[2].length >= outer.length;
      if (closesOuter) {
        trailingClosesOuterFence = index === lines.length - 1;
        outer = null;
      }
      continue;
    }

    // Every Cairn protocol opener is reserved at top level, even though this
    // scanner creates controls only for follow-ups. Reserved controls all use
    // the same column-zero, exact three-backtick close; treating a sibling
    // protocol as ordinary Markdown would let a pseudo-close expose nested
    // authority to whichever scanner runs second.
    if (/^```(?:cairn-question|cairn-task)[ \t]*\r?$/.test(line.text)) {
      outer = { marker: "`", length: 3, line: index, exactClose: true };
      continue;
    }

    if (/^```cairn-followups[ \t]*\r?$/.test(line.text)) {
      const bodyStart = line.after;
      let closingIndex = -1;
      for (let candidate = index + 1; candidate < lines.length; candidate += 1) {
        if (/^```[ \t]*\r?$/.test(lines[candidate].text)) {
          closingIndex = candidate;
          break;
        }
      }
      if (closingIndex === -1) {
        fences.push({ raw: null, start: line.start, end: reply.length });
        break;
      }
      const closing = lines[closingIndex];
      let raw = reply.slice(bodyStart, closing.start);
      if (raw.endsWith("\r\n")) raw = raw.slice(0, -2);
      else if (raw.endsWith("\n")) raw = raw.slice(0, -1);
      // Leave the closing line's own line ending in public prose. With CRLF,
      // `end` points between CR and LF because the line slice includes CR.
      const closingEnd = closing.text.endsWith("\r") ? closing.end - 1 : closing.end;
      fences.push({ raw, start: line.start, end: closingEnd });
      index = closingIndex;
      continue;
    }

    const opening = /^( {0,3})(`{3,}|~{3,}).*\r?$/.exec(line.text);
    if (opening) {
      outer = {
        marker: opening[2][0] as "`" | "~",
        length: opening[2].length,
        line: index,
        exactClose: false,
      };
    }
  }

  return {
    fences,
    // A partial protocol opener itself looks like a new ordinary backtick
    // fence. It stays private until disambiguated, unless an outer fence began
    // on an earlier line and makes this exact-looking text an inert example.
    trailingInsideOuterFence: outer !== null && outer.line < lines.length - 1,
    trailingClosesOuterFence,
  };
}

function stripFollowupFences(reply: string, fences: readonly RawFollowupFence[], trim: boolean): string {
  let cursor = 0;
  let visible = "";
  for (const fence of fences) {
    visible += reply.slice(cursor, fence.start);
    cursor = fence.end;
  }
  visible += reply.slice(cursor);
  return trim ? visible.trim() : visible;
}

function couldBecomeFollowupOpening(line: string): boolean {
  return FOLLOWUP_OPENING.startsWith(line)
    || (line.startsWith(FOLLOWUP_OPENING) && /^[ \t]*\r?$/.test(line.slice(FOLLOWUP_OPENING.length)));
}

/** A monotonic public projection of an in-progress reply. From the first
 * possible backtick through the closing fence, private follow-up bytes are
 * held in main. A disambiguated lookalike is released as ordinary Markdown. */
export function followupSafeStreamingText(reply: string): string {
  const { fences, trailingInsideOuterFence, trailingClosesOuterFence } = followupFences(reply);
  const visible = stripFollowupFences(reply, fences, false);
  const lineStart = visible.lastIndexOf("\n") + 1;
  const trailingLine = visible.slice(lineStart);
  return !trailingInsideOuterFence && !trailingClosesOuterFence && couldBecomeFollowupOpening(trailingLine)
    ? visible.slice(0, lineStart)
    : visible;
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

/** Cairn's code, not the model, decides what becomes controls. Every exact
 * recognized fence is stripped from settled prose. Exactly one complete,
 * valid fence may create suggestions; duplicates, malformed JSON, and an
 * unterminated fence all fail closed without exposing raw protocol. */
export function extractFollowups(reply: string): FollowupsResult {
  const { fences } = followupFences(reply);
  if (fences.length === 0) return { followups: null, text: reply };
  const text = stripFollowupFences(reply, fences, true);
  if (fences.length !== 1 || fences[0].raw === null) return { followups: null, text };
  return { followups: sanitizeFollowups(parseJson(fences[0].raw)), text };
}

function parseJson(raw: string): unknown {
  if (raw.length > 1000) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
