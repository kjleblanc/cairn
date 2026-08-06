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

// Plan 4: ordinary proposal fixtures use the attributed task-intent protocol.
// chip, so one test walks the whole path — chip resolved, inline
// confirmation showing both parts, dispatch, records on disk.
const RISK_TASK_BLOCK = JSON.stringify({
  intent: {
    version: "cairn-task-intent/v1",
    outcome: { source: "owner-stated", text: "Change the page title", ownerQuote: "title" },
    requirements: [{ source: "cairn-chosen", text: "Keep the counts 74, 477, 256 exactly.", ownerQuote: null }],
    context: [],
  },
  risks: [{ text: "Renaming the title may break bookmarked links." }],
});

const RISK_FREE_TASK_BLOCK = JSON.stringify({
  intent: {
    version: "cairn-task-intent/v1",
    outcome: { source: "owner-stated", text: "Change the page title", ownerQuote: "title" },
    requirements: [{ source: "cairn-chosen", text: "Keep the counts 74, 477, 256 exactly.", ownerQuote: null }],
    context: [
      "Set aside by the owner: Renaming the title may break bookmarked links.",
      "Fixture replacement detail",
    ],
  },
  risks: [],
});

const TWO_CONCERN_TASK_BLOCK = JSON.stringify({
  intent: {
    version: "cairn-task-intent/v1",
    outcome: { source: "owner-stated", text: "Change the page title", ownerQuote: "title" },
    requirements: [],
    context: [],
  },
  risks: [
    { text: "Should the old title still redirect?" },
    { text: "Renaming the title may break bookmarked links." },
  ],
});

// This is deliberately the obsolete pre-attribution shape, so
// Cairn's own parser drops this block — the reply still shows as plain text.
const GARBLED_TASK_BLOCK = JSON.stringify({
  outcome: "Change the page title",
  concerns: [],
  extra: "not allowed",
});

// A separate fixture keeps the three counts as a Cairn-chosen requirement
// and, later, into the confirmed disclosure — never reworded by the model.
const DETAILS_TASK_BLOCK = JSON.stringify({
  intent: {
    version: "cairn-task-intent/v1",
    outcome: { source: "owner-stated", text: "Change the page title", ownerQuote: "detailtask" },
    requirements: [{ source: "cairn-chosen", text: "74, 477, 256", ownerQuote: null }],
    context: [],
  },
  risks: [],
});

// Task 176's authenticated action protocol. Owner-attributed rows cite exact
// until Task 3 migrates dispatch; these explicit fake-only triggers exercise
// the authenticated, inert main-process path without a provider call.
const ATTRIBUTED_TASK_BLOCK = JSON.stringify({
  intent: {
    version: "cairn-task-intent/v1",
    outcome: { source: "owner-stated", text: "Use the timing the owner named", ownerQuote: "Use 300 milliseconds" },
    requirements: [{ source: "cairn-chosen", text: "Keep the control readable", ownerQuote: null }],
    context: ["Desktop only"],
  },
  risks: [{ text: "The timing changes how the animation feels." }],
});

const LONG_QUESTION = "Which settling speed should Cairn use when the shoreline is already busy, the project name is long, and the owner needs the choice to stay readable without losing the exact timing?";

// Task 9 (Phase 3): the commentary turn. It is the one request that ends with
// a SYSTEM message and adds no user turn at all, so keying off the last user
// message would replay whatever the owner said before the dispatch and pass a
// stale reply off as a comment on the card.
//
// Task 071 split it into four slower chunks. The window while a comment streams
// is a real state with its own rules — main holds the project's lock and the
// renderer never started a stream — and a test can only stand in that window if
// it lasts longer than a click. Same words, more room.
//
// Task 157 added the follow-up suggestions: a well-formed cairn-followups
// fence rides the final part, so the whole loop — parse, persist, paper notes
// on screen, tap-to-send — is provable offline. The visible comment text is
// unchanged (the fence is stripped), and the usage frame is content-blind.
const COMMENTARY_SCRIPT = {
  parts: ["The card says", " this task finished DONE", ", and the report", " is in docs/ai-work.",
    "\n\n```cairn-question\n{\"question\":\"This commentary control must stay inert.\"}\n```\n\n```cairn-followups\n[\"Show me how to try this myself\", \"Pick the next small improvement and explain why it is the gentlest useful step before changing anything else\"]\n```"],
  delayMs: 400,
};
const STOPPED_COMMENTARY_SCRIPT = {
  parts: ["The card says", " this task STOPPED safely", ", and the report explains why", " in docs/ai-work."],
  delayMs: 400,
};
let commentaryDelayMs = COMMENTARY_SCRIPT.delayMs;
let proseOnlySetAside = false;

// The comment-busy test's deterministic window (task 137's flake fix): while
// held, a commentary stream pauses after its last content part until
// releaseCommentary() — the refusal window cannot elapse under load, however
// slow the machine. The gate is armed per stream, so a release that lands
// before the stream reaches the gate simply lets it pass.
let commentaryHeld = false;
let commentaryGate = null;
let commentaryReachedGate = false;
let initialProposalHeld = false;
let initialProposalGate = null;
let thirdProposalHeld = false;
let thirdProposalGate = null;
let answerHeld = false;
let answerGate = null;

function holdCommentary() {
  commentaryReachedGate = false;
  commentaryHeld = true;
}

function releaseCommentary() {
  commentaryHeld = false;
  if (commentaryGate !== null) {
    commentaryGate();
    commentaryGate = null;
  }
}

function commentaryGatePoint() {
  commentaryReachedGate = true;
  if (!commentaryHeld) return Promise.resolve();
  return new Promise((resolve) => { commentaryGate = resolve; });
}

function holdInitialProposal() {
  initialProposalHeld = true;
}

function releaseInitialProposal() {
  initialProposalHeld = false;
  if (initialProposalGate !== null) {
    initialProposalGate();
    initialProposalGate = null;
  }
}

function initialProposalGatePoint() {
  if (!initialProposalHeld) return Promise.resolve();
  return new Promise((resolve) => { initialProposalGate = resolve; });
}

function holdThirdProposal() {
  thirdProposalHeld = true;
}

function releaseThirdProposal() {
  thirdProposalHeld = false;
  if (thirdProposalGate !== null) {
    thirdProposalGate();
    thirdProposalGate = null;
  }
}

function thirdProposalGatePoint() {
  if (!thirdProposalHeld) return Promise.resolve();
  return new Promise((resolve) => { thirdProposalGate = resolve; });
}

// The sibling-chip regression needs to inspect the card while the answer turn
// is definitely still active. A fixed chunk delay can expire before React and
// Playwright get a turn on a loaded full-suite run, so hold the usage/DONE
// frames explicitly and release them from the test's finally block.
function holdAnswer() {
  answerHeld = true;
}

function releaseAnswer() {
  answerHeld = false;
  if (answerGate !== null) {
    answerGate();
    answerGate = null;
  }
}

function answerGatePoint() {
  if (!answerHeld) return Promise.resolve();
  return new Promise((resolve) => { answerGate = resolve; });
}

function scriptFor(content) {
  if (content.includes("action-malformed")) {
    return { parts: ["I could not form this.\n\n```cairn-question\n{broken\n```"], delayMs: DELAY_MS };
  }
  if (content.includes("action-question-only")) {
    return { parts: ["```cairn-question\n{\"question\":\"Which settling speed should Cairn use?\"}\n```"], delayMs: DELAY_MS };
  }
  if (content.includes("action-question-embedded")) {
    return { parts: [`I need a concrete choice before I settle the page.\n\n${LONG_QUESTION}\n\nOnce you answer, I can tune the motion around it.\n\n\`\`\`cairn-question\n${JSON.stringify({ question: LONG_QUESTION })}\n\`\`\``], delayMs: DELAY_MS };
  }
  if (content.includes("action-question-long")) {
    return { parts: [`I need one careful detail.\n\n\`\`\`cairn-question\n${JSON.stringify({ question: LONG_QUESTION })}\n\`\`\``], delayMs: DELAY_MS };
  }
  if (content.includes("action-question")) {
    return { parts: ["I need one detail.\n\n```cairn-question\n{\"question\":\"Which settling speed should Cairn use?\"}\n```"], delayMs: DELAY_MS };
  }
  if (content.includes("action-attributed")) {
    return { parts: [`I kept each source separate.\n\n\`\`\`cairn-task\n${ATTRIBUTED_TASK_BLOCK}\n\`\`\``], delayMs: DELAY_MS };
  }
  if (content.includes("explain every detail first")) {
    return {
      parts: [
        `\`\`\`cairn-task\n${RISK_TASK_BLOCK}\n\`\`\``,
        "\n\nChange the page title remains the outcome. Renaming it may break bookmarked links. Review will open the final task preview.",
      ],
      delayMs: DELAY_MS,
    };
  }
  if (content.includes("garble")) {
    return { parts: [`Here's the plan.\n\n\`\`\`cairn-task\n${GARBLED_TASK_BLOCK}\n\`\`\``], delayMs: DELAY_MS };
  }
  if (content.includes("detailtask third")) {
    return { parts: [`Sure, here's the plan.\n\n\`\`\`cairn-task\n${DETAILS_TASK_BLOCK}\n\`\`\``], delayMs: DELAY_MS };
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
  // The sibling-chip regression needs a real, observable busy interval after
  // this exact fixture answer. Keep the owner's words intact while making the
  // local fake's timing deterministic even under a loaded full-suite run.
  if (content.includes("plain redirect is enough")) {
    return { parts: ["One moment", ", checking the answer", ", done."], delayMs: 500 };
  }
  if (content.includes("set it aside and keep the task as proposed")) {
    if (proseOnlySetAside) {
      // Deliberately violate the proposal copy budget. Main must replace this
      // repeated detail with its own single acknowledgement before persisting
      // or presenting the fresh proposal.
      return { parts: ["I carried that concern forward. Change the page title remains the outcome, and renaming it may break bookmarked links. The new card is ready for Review."], delayMs: DELAY_MS };
    }
    return { parts: [`I removed that risk from the proposal.\n\n\`\`\`cairn-task\n${RISK_FREE_TASK_BLOCK}\n\`\`\``], delayMs: DELAY_MS };
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

function commentaryScriptFor(messages) {
  const prompt = messages.map((message) => typeof message?.content === "string" ? message.content : "").join("\n");
  return prompt.includes('"disposition":"STOPPED"') ? STOPPED_COMMENTARY_SCRIPT : COMMENTARY_SCRIPT;
}

// Repo task 080. What `commentaryRequested` reads is the ENVELOPE'S
// INSTRUCTION, not the card — so it says a comment was asked for and nothing
// at all about what the model was shown. Every commentary test would still
// have passed if the card had been dropped from the prompt entirely. The raw
// body of the last commentary request is kept here so a test can read what
// really arrived and assert the card is in it.
let lastCommentaryBody = null;

// Repo task 127: the same wire honesty for ordinary replies. The custom-seat
// note can only be proven by reading what the provider was actually sent, so
// the raw body of the last non-commentary request is kept too.
let lastReplyBody = null;
let replyRequestCount = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function streamReply(res, script, beforeDone, afterFirstPart) {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  const { parts, delayMs } = script;
  for (let index = 0; index < parts.length; index += 1) {
    sse(res, { choices: [{ delta: { content: parts[index] } }] });
    if (index === 0 && afterFirstPart) await afterFirstPart();
    await sleep(delayMs);
  }
  if (beforeDone) await beforeDone();
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
          void streamReply(res, { ...commentaryScriptFor(messages), delayMs: commentaryDelayMs }, commentaryGatePoint);
          return;
        }
        const content = lastUserContent(messages);
        lastReplyBody = rawBody;
        replyRequestCount += 1;
        if (content.includes("fail-key")) {
          res.writeHead(401, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { message: "invalid api key" } }));
          return;
        }
        const beforeDone = content.includes("detailtask third")
          ? thirdProposalGatePoint
          : content.includes("plain redirect is enough") || content.includes("set it aside and keep the task as proposed")
            ? answerGatePoint
            : undefined;
        const afterFirstPart = content.includes("explain every detail first") ? initialProposalGatePoint : undefined;
        void streamReply(res, scriptFor(content), beforeDone, afterFirstPart);
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
        /** The raw body of the last ordinary reply request, or null if none
         * has arrived — same wire-honesty purpose as lastCommentaryBody. */
        lastReplyBody: () => lastReplyBody,
        replyRequestCount: () => replyRequestCount,
        setCommentaryDelay: (delayMs) => { commentaryDelayMs = delayMs; },
        setProseOnlySetAside: (enabled) => { proseOnlySetAside = enabled; },
        holdCommentary,
        releaseCommentary,
        commentaryReachedGate: () => commentaryReachedGate,
        holdInitialProposal,
        releaseInitialProposal,
        holdThirdProposal,
        releaseThirdProposal,
        holdAnswer,
        releaseAnswer,
      });
    });
  });
}
