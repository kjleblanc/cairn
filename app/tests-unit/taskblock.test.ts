import test from "node:test";
import assert from "node:assert/strict";
import { controlSafeStreamingText, extractConductorControl, extractTaskBlock } from "../src/main/conductor/taskblock.js";

const fence = (body: string) => "Here is my proposal.\n\n```cairn-task\n" + body + "\n```\nAnything else?";

test("a valid block parses and the fence leaves the text", () => {
  const reply = fence('{"outcome": "The page title says My Bookshelf", "concerns": [], "notes": ""}');
  const { block, text } = extractTaskBlock(reply);
  assert.ok(block);
  assert.equal(block.outcome, "The page title says My Bookshelf");
  assert.deepEqual(block.concerns, []);
  assert.equal(text.includes("cairn-task"), false);
  assert.ok(text.startsWith("Here is my proposal."));
});

test("concerns parse with kinds and bounded shape", () => {
  const reply = fence('{"outcome": "Save the book list locally", "concerns": [{"kind": "risk", "text": "Plain-text storage is readable by anything on this computer"}], "notes": "owner set aside the sync question"}');
  const { block } = extractTaskBlock(reply);
  assert.ok(block);
  assert.equal(block.concerns.length, 1);
  assert.equal(block.concerns[0].kind, "risk");
});

test("no fence means no block and untouched text", () => {
  const { block, text } = extractTaskBlock("Just a chat reply.");
  assert.equal(block, null);
  assert.equal(text, "Just a chat reply.");
});

for (const [name, body] of [
  ["malformed json", "{not json"],
  ["extra key", '{"outcome": "x", "concerns": [], "notes": "", "sneaky": true}'],
  ["missing outcome", '{"concerns": [], "notes": ""}'],
  ["empty outcome", '{"outcome": "  ", "concerns": [], "notes": ""}'],
  ["oversized outcome", `{"outcome": "${"x".repeat(301)}", "concerns": [], "notes": ""}`],
  ["bad concern kind", '{"outcome": "x", "concerns": [{"kind": "warning", "text": "y"}], "notes": ""}'],
  ["concern extra key", '{"outcome": "x", "concerns": [{"kind": "risk", "text": "y", "z": 1}], "notes": ""}'],
  ["too many concerns", '{"outcome": "x", "concerns": [{"kind":"risk","text":"a"},{"kind":"risk","text":"b"},{"kind":"risk","text":"c"},{"kind":"risk","text":"d"}], "notes": ""}'],
  ["array payload", '["outcome"]'],
  ["oversized notes", `{"outcome": "x", "concerns": [], "notes": "${"n".repeat(1001)}"}`],
  ["outcome contains a newline", '{"outcome": "line one\\nline two", "concerns": [], "notes": ""}'],
] as const) {
  test(`invalid block is rejected: ${name}`, () => {
    const { block, text } = extractTaskBlock(fence(body));
    assert.equal(block, null);
    assert.ok(text.length > 0, "conversation text is preserved even when the block is invalid");
  });
}

test("details parses verbatim within its cap and fails closed beyond it", () => {
  const ok = extractTaskBlock('```cairn-task\n{"outcome":"x","details":"74, 477, 256"}\n```');
  assert.equal(ok.block?.details, "74, 477, 256");
  const none = extractTaskBlock('```cairn-task\n{"outcome":"x"}\n```');
  assert.equal(none.block?.details, "");
  const big = extractTaskBlock('```cairn-task\n{"outcome":"x","details":"' + "a".repeat(2001) + '"}\n```');
  assert.equal(big.block, null);
  const wrongType = extractTaskBlock('```cairn-task\n{"outcome":"x","details":7}\n```');
  assert.equal(wrongType.block, null);
});

test("duplicate controls are all stripped and none is honored", () => {
  const reply = fence('{"outcome": "first", "concerns": [], "notes": ""}') + "\n" + fence('{"outcome": "second", "concerns": [], "notes": ""}');
  const { block, text } = extractTaskBlock(reply);
  assert.equal(block, null);
  assert.doesNotMatch(text, /cairn-task|"first"|"second"/);
});

const questionFence = (body: string, newline = "\n") =>
  ["Before.", "```cairn-question", body, "```", "After."].join(newline);

const intent = (quote = "Use 300 milliseconds") => ({
  version: "cairn-task-intent/v1",
  outcome: { source: "owner-stated", text: "Use the requested timing", ownerQuote: quote },
  requirements: [{ source: "cairn-chosen", text: "Keep the control readable", ownerQuote: null }],
  context: ["Desktop only"],
});

test("a valid question becomes a passive candidate and its control disappears", () => {
  const result = extractConductorControl(questionFence('{"question":"Which settling speed should Cairn use?"}'));
  assert.deepEqual(result.candidate, { kind: "question", question: "Which settling speed should Cairn use?" });
  assert.equal(result.block, null);
  assert.equal(result.text, "Before.\n\nAfter.");
});

test("a valid attributed task candidate carries no ids or offsets from the model", () => {
  const body = JSON.stringify({ intent: intent(), risks: [{ text: "The setting changes the animation feel." }] });
  const result = extractConductorControl(fence(body));
  assert.equal(result.candidate?.kind, "task");
  if (result.candidate?.kind !== "task") assert.fail("expected task candidate");
  assert.equal(result.candidate.intent.outcome.ownerQuote, "Use 300 milliseconds");
  assert.deepEqual(result.candidate.risks, ["The setting changes the animation feel."]);
  assert.equal(JSON.stringify(result.candidate).includes("actionId"), false);
  assert.equal(JSON.stringify(result.candidate).includes("inputId"), false);
  assert.equal(JSON.stringify(result.candidate).includes("start"), false);
});

test("question and risk visible-text boundaries are exact", () => {
  const q300 = extractConductorControl(questionFence(JSON.stringify({ question: "q".repeat(300) })));
  assert.equal(q300.candidate?.kind, "question");
  const q301 = extractConductorControl(questionFence(JSON.stringify({ question: "q".repeat(301) })));
  assert.equal(q301.candidate, null);

  const r300 = extractConductorControl(fence(JSON.stringify({ intent: intent(), risks: [{ text: "r".repeat(300) }] })));
  assert.equal(r300.candidate?.kind, "task");
  const r301 = extractConductorControl(fence(JSON.stringify({ intent: intent(), risks: [{ text: "r".repeat(301) }] })));
  assert.equal(r301.candidate, null);
  const multiline = extractConductorControl(questionFence(JSON.stringify({ question: "line one\nline two" })));
  assert.equal(multiline.candidate, null);
});

test("task candidates accept three risks, reject four, and cap the complete raw body", () => {
  const three = extractConductorControl(fence(JSON.stringify({ intent: intent(), risks: ["a", "b", "c"].map((text) => ({ text })) })));
  assert.equal(three.candidate?.kind, "task");
  const four = extractConductorControl(fence(JSON.stringify({ intent: intent(), risks: ["a", "b", "c", "d"].map((text) => ({ text })) })));
  assert.equal(four.candidate, null);

  const json = JSON.stringify({ intent: intent(), risks: [] });
  const atLimit = json + " ".repeat(12_000 - json.length);
  const overLimit = `${atLimit} `;
  assert.equal(extractConductorControl(fence(atLimit)).candidate?.kind, "task");
  assert.equal(extractConductorControl(fence(overLimit)).candidate, null);
});

test("extra model authority fields reject the whole candidate", () => {
  const extraRoot = extractConductorControl(fence(JSON.stringify({ intent: intent(), risks: [], actionId: "model-id" })));
  assert.equal(extraRoot.candidate, null);
  const extraRisk = extractConductorControl(fence(JSON.stringify({ intent: intent(), risks: [{ text: "risk", riskId: "model-id" }] })));
  assert.equal(extraRisk.candidate, null);
  const extraSpan = intent() as ReturnType<typeof intent> & { inputId?: string };
  extraSpan.inputId = "model-id";
  assert.equal(extractConductorControl(fence(JSON.stringify({ intent: extraSpan, risks: [] }))).candidate, null);
});

test("mixed, duplicate, and malformed controls are stripped fail-closed", () => {
  const validQuestion = questionFence('{"question":"Which speed?"}');
  const validTask = fence(JSON.stringify({ intent: intent(), risks: [] }));
  for (const reply of [
    `${validQuestion}\n${validTask}`,
    `${validQuestion}\n${validQuestion}`,
    `${questionFence("{broken")}\n${validTask}`,
    `${validQuestion}\n\`\`\`cairn-task\n{\"intent\":\"unterminated\"}`,
  ]) {
    const result = extractConductorControl(reply);
    assert.equal(result.candidate, null);
    assert.equal(result.block, null);
    assert.doesNotMatch(result.text, /cairn-question|cairn-task|\{"question"|\{"intent"|\{broken/);
  }
});

test("CRLF controls parse while unrelated follow-up fences remain untouched", () => {
  const reply = questionFence('{"question":"Which speed?"}', "\r\n")
    + '\r\n```cairn-followups\r\n["Try another speed"]\r\n```';
  const result = extractConductorControl(reply);
  assert.equal(result.candidate?.kind, "question");
  assert.match(result.text, /cairn-followups/);
  assert.doesNotMatch(result.text, /cairn-question/);
});

test("reserved controls inside Markdown examples stay inert", () => {
  const example = '````text\n```cairn-question\n{"question":"Example only?"}\n```\n````';
  const tripleExample = '```text\n```cairn-task\n{"intent":"example"}\n```\n```';
  const tildeExample = '~~~md\n```cairn-question\n{"question":"Example only?"}\n```\n~~~';
  for (const text of [example, tripleExample, tildeExample]) {
    const result = extractConductorControl(text);
    assert.equal(result.candidate, null);
    assert.equal(result.block, null);
    assert.equal(result.text, text);
  }
});

test("a four-backtick pseudo-close cannot expose a task nested in a reserved follow-up block", () => {
  const validTask = JSON.stringify({ intent: intent(), risks: [] });
  const reply = [
    "```cairn-followups",
    "{broken",
    "````",
    "```cairn-task",
    validTask,
    "```",
    "```",
  ].join("\n");
  const result = extractConductorControl(reply);
  assert.equal(result.candidate, null);
  assert.equal(result.block, null);
  assert.equal(result.text, reply,
    "the task scanner must leave the other reserved protocol for its owner to strip");
});

test("an indented pseudo-close cannot expose a task nested in a reserved follow-up block", () => {
  const validTask = JSON.stringify({ intent: intent(), risks: [] });
  const reply = [
    "```cairn-followups",
    "{broken",
    " ```",
    "```cairn-task",
    validTask,
    "```",
    "```",
  ].join("\n");
  const result = extractConductorControl(reply);
  assert.equal(result.candidate, null);
  assert.equal(result.block, null);
  assert.equal(result.text, reply,
    "reserved protocol closes must use the same column-zero grammar in both scanners");
});

test("the streaming view never exposes a complete, partial, or unterminated control", () => {
  assert.equal(controlSafeStreamingText("Visible.\n`"), "Visible.\n");
  assert.equal(controlSafeStreamingText("Visible.\n```cairn-q"), "Visible.\n");
  assert.equal(controlSafeStreamingText('Visible.\n```cairn-question\n{"question":"Secret control?"}'), "Visible.\n");
  assert.equal(
    controlSafeStreamingText('Visible.\n```cairn-question\n{"question":"Secret control?"}\n```\nAfter.'),
    "Visible.\n\nAfter.",
  );
  assert.equal(controlSafeStreamingText("Visible.\n```cairn-q\n"), "Visible.\n```cairn-q\n");
});
