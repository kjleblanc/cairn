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

const RISK_TASK_BLOCK = JSON.stringify({
  outcome: "Change the page title",
  concerns: [{ kind: "risk", text: "Renaming the title may break bookmarked links." }],
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

function scriptFor(content) {
  if (content.includes("garble")) {
    return { parts: [`Here's the plan.\n\n\`\`\`cairn-task\n${GARBLED_TASK_BLOCK}\n\`\`\``], delayMs: DELAY_MS };
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

function lastUserContent(rawBody) {
  let parsed;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return "";
  }
  const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i] && messages[i].role === "user" && typeof messages[i].content === "string") return messages[i].content;
  }
  return "";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function streamReply(res, content) {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  const { parts, delayMs } = scriptFor(content);
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
        const content = lastUserContent(Buffer.concat(chunks).toString("utf8"));
        if (content.includes("fail-key")) {
          res.writeHead(401, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { message: "invalid api key" } }));
          return;
        }
        void streamReply(res, content);
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}/v1`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}
