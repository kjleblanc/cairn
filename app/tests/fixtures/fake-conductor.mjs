// Task 026's fake body: a bare node:http server that plays an OpenAI-compatible
// /v1/chat/completions SSE endpoint, scripted entirely off the last user
// message's content — no state, no randomness, so the same message always
// gets the same reply. `start()` resolves once it is listening on an
// ephemeral loopback port; `close()` tears it down.

import { createServer } from "node:http";

// Every scripted reply carries this small per-chunk delay so a test that
// waits on visible state (a partial bubble, a busy chip) always has a real
// window to observe it in — never a wall-clock sleep in the test itself.
const DELAY_MS = 300;

// Task 5 (Phase 3): the full-loop reply carries details as well as a risk
// chip, so one test walks the whole path — chip resolved, inline
// confirmation showing both parts, dispatch, records on disk.
const RISK_TASK_BLOCK = JSON.stringify({
  outcome: "Change the page title",
  concerns: [{ kind: "risk", text: "Renaming the title may break bookmarked links." }],
  details: "Keep the counts 74, 477, 256 exactly.",
});

const TWO_CONCERN_TASK_BLOCK = JSON.stringify({
  outcome: "Change the page title",
  concerns: [
    { kind: "question", text: "Should the old title still redirect?" },
    { kind: "risk", text: "Renaming the title may break bookmarked links." },
  ],
});

// "extra" is not one of the three allowed keys (outcome/concerns/notes), so
// Cairn's own parser drops this block — the reply still shows as plain text.
const GARBLED_TASK_BLOCK = JSON.stringify({
  outcome: "Change the page title",
  concerns: [],
  extra: "not allowed",
});

// Task 4 (Phase 3): the `details` channel carries data verbatim to the card
// and, later, into the confirmed disclosure — never reworded by the model.
const DETAILS_TASK_BLOCK = JSON.stringify({
  outcome: "Change the page title",
  concerns: [],
  details: "74, 477, 256",
});

// Task 9 (Phase 3): the commentary turn. It is the one request that ends with
// a SYSTEM message and adds no user turn at all, so keying off the last user
// message would replay whatever the owner said before the dispatch and pass a
// stale reply off as a comment on the card.
//
// Task 071 split it into four slower chunks. The window while a comment streams
// is a real state with its own rules — main holds the project's lock and the
// renderer never started a stream — and a test can only stand in that window if
// it lasts longer than a click. Same words, more room.
const COMMENTARY_SCRIPT = {
  parts: ["The card says", " this task finished DONE", ", and the report", " is in docs/ai-work."],
  delayMs: 400,
};

function scriptFor(content) {
  if (content.includes("garble")) {
    return { parts: [`Here's the plan.\n\n\`\`\`cairn-task\n${GARBLED_TASK_BLOCK}\n\`\`\``], delayMs: DELAY_MS };
  }
  if (content.includes("detailtask")) {
    return { parts: [`Sure, here's the plan.\n\n\`\`\`cairn-task\n${DETAILS_TASK_BLOCK}\n\`\`\``], delayMs: DELAY_MS };
  }
  if (content.includes("twoconcerns")) {
    return { parts: [`Sure, here's the plan.\n\n\`\`\`cairn-task\n${TWO_CONCERN_TASK_BLOCK}\n\`\`\``], delayMs: DELAY_MS };
  }
  if (content.includes("slowstream")) {
    return { parts: ["One moment", ", still thinking", ", almost there", ", done thinking."], delayMs: 500 };
  }
  if (content.includes("title")) {
    return { parts: [`Sure, here's the plan.\n\n\`\`\`cairn-task\n${RISK_TASK_BLOCK}\n\`\`\``], delayMs: DELAY_MS };
  }
  return { parts: ["Sure, ", "got it."], delayMs: DELAY_MS };
}

function messagesOf(rawBody) {
  let parsed;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return [];
  }
  return Array.isArray(parsed.messages) ? parsed.messages : [];
}

function lastUserContent(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i] && messages[i].role === "user" && typeof messages[i].content === "string") return messages[i].content;
  }
  return "";
}

// A commentary request is the only one whose LAST message is a system message,
// and the envelope's instruction names what it is about. Read off the last
// message, so an ordinary reply — which always ends with the owner's own user
// turn — can never be mistaken for one.
function commentaryRequested(messages) {
  const last = messages[messages.length - 1];
  return Boolean(last) && last.role === "system" && typeof last.content === "string" && last.content.includes("result card");
}

// Repo task 080. What `commentaryRequested` reads is the ENVELOPE'S
// INSTRUCTION, not the card — so it says a comment was asked for and nothing
// at all about what the model was shown. Every commentary test would still
// have passed if the card had been dropped from the prompt entirely. The raw
// body of the last commentary request is kept here so a test can read what
// really arrived and assert the card is in it.
let lastCommentaryBody = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function streamReply(res, script) {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  const { parts, delayMs } = script;
  for (const part of parts) {
    sse(res, { choices: [{ delta: { content: part } }] });
    await sleep(delayMs);
  }
  sse(res, { usage: { prompt_tokens: 20, completion_tokens: 9, cost: 0.00002 } });
  res.write("data: [DONE]\n\n");
  res.end();
}

export function start() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.method !== "POST" || req.url !== "/v1/chat/completions") {
        res.writeHead(404).end();
        return;
      }
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        const rawBody = Buffer.concat(chunks).toString("utf8");
        const messages = messagesOf(rawBody);
        if (commentaryRequested(messages)) {
          lastCommentaryBody = rawBody;
          void streamReply(res, COMMENTARY_SCRIPT);
          return;
        }
        const content = lastUserContent(messages);
        if (content.includes("fail-key")) {
          res.writeHead(401, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { message: "invalid api key" } }));
          return;
        }
        void streamReply(res, scriptFor(content));
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}/v1`,
        close: () => new Promise((r) => server.close(() => r())),
        /** The raw body of the last commentary request, or null if none has
         * arrived. Raw rather than parsed so a test reads exactly what the
         * provider would have. */
        lastCommentaryBody: () => lastCommentaryBody,
      });
    });
  });
}
