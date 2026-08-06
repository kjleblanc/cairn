import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractFollowups,
  followupSafeStreamingText,
  sanitizeFollowups,
} from "../src/main/conductor/followups.js";

const fence = (body: string) => "The card says this task finished DONE.\n\n```cairn-followups\n" + body + "\n```\n";

test("a valid block parses and the fence leaves the text", () => {
  const { followups, text } = extractFollowups(fence('["Retry with a narrower outcome", "Update PROJECT.md"]'));
  assert.deepEqual(followups, ["Retry with a narrower outcome", "Update PROJECT.md"]);
  assert.equal(text.includes("cairn-followups"), false);
  assert.ok(text.startsWith("The card says"));
});

test("one suggestion is a valid list; three is the most", () => {
  assert.deepEqual(extractFollowups(fence('["One step"]')).followups, ["One step"]);
  assert.deepEqual(extractFollowups(fence('["a", "b", "c"]')).followups, ["a", "b", "c"]);
  assert.equal(extractFollowups(fence('["a", "b", "c", "d"]')).followups, null);
  assert.equal(extractFollowups(fence("[]")).followups, null);
});

test("no fence means no suggestions and untouched text", () => {
  const { followups, text } = extractFollowups("Just a comment.");
  assert.equal(followups, null);
  assert.equal(text, "Just a comment.");
});

for (const [name, body] of [
  ["malformed json", "[not json"],
  ["object payload", '{"suggestion": "x"}'],
  ["non-string item", '["ok", 7]'],
  ["empty item", '["ok", "   "]'],
  ["oversized item", `["${"x".repeat(141)}"]`],
  ["item with a newline", '["line one\\nline two"]'],
  ["oversized block", `["${"x".repeat(1001)}"]`],
] as const) {
  test(`invalid block is rejected: ${name}`, () => {
    const { followups, text } = extractFollowups(fence(body));
    assert.equal(followups, null);
    assert.ok(text.length > 0, "the comment's text is preserved even when the block is invalid");
    assert.equal(text.includes("cairn-followups"), false);
  });
}

test("items are trimmed and exact duplicates dropped, not fatal", () => {
  assert.deepEqual(sanitizeFollowups(["  Padded  ", "Padded", "Other"]), ["Padded", "Other"]);
  assert.deepEqual(sanitizeFollowups(["Same", "Same"]), ["Same"]);
});

test("sanitizeFollowups fails closed on non-arrays and bad shapes", () => {
  assert.equal(sanitizeFollowups(undefined), null);
  assert.equal(sanitizeFollowups(null), null);
  assert.equal(sanitizeFollowups("one"), null);
  assert.equal(sanitizeFollowups([]), null);
  assert.equal(sanitizeFollowups(["a", "b", "c", "d"]), null);
  assert.equal(sanitizeFollowups(["multi\nline"]), null);
});

test("streaming hides every partial form of the exact private opener", () => {
  const visible = "The report confirms DONE.\n";
  const opener = "```cairn-followups";
  for (let length = 1; length <= opener.length; length += 1) {
    assert.equal(
      followupSafeStreamingText(visible + opener.slice(0, length)),
      visible,
      `private opener prefix of length ${length} became public`,
    );
  }
  assert.equal(followupSafeStreamingText(`${visible}${opener}   \r`), visible);
  assert.equal(followupSafeStreamingText(`${visible}${opener}\n["Secret next step"]`), visible);
  assert.equal(followupSafeStreamingText(`${visible}${opener}\r\n["Secret next step"]\r\n`), visible);
});

test("streaming strips a complete private block and resumes with later prose", () => {
  assert.equal(
    followupSafeStreamingText(
      'The report confirms DONE.\n```cairn-followups\n["Retry narrowly"]\n```\nThe choice stays yours.',
    ),
    "The report confirms DONE.\n\nThe choice stays yours.",
  );
});

test("streaming leaves ordinary Markdown, unrelated fences, and lookalike labels intact", () => {
  for (const ordinary of [
    "Use `cairn-followups` only as documentation.",
    "```json\n[\"ordinary code\"]\n```",
    "```cairn-followup\nnot the exact label\n```",
    "```cairn-followups-extra\nnot the exact label\n```",
    "Before ```cairn-followups\ninline text stays ordinary",
    "````text\n```cairn-followups\n[\"an inert example\"]\n```\n````",
    "~~~md\n```cairn-followups\n[\"an inert example\"]\n```\n~~~",
  ]) {
    assert.equal(followupSafeStreamingText(ordinary), ordinary);
  }
});

test("the public streaming projection grows monotonically without private fragments", () => {
  const reply = 'The report confirms DONE.\n```cairn-followups\n["Retry narrowly", "Review the records"]\n```\nThe choice stays yours.';
  let prior = "";
  for (let length = 1; length <= reply.length; length += 1) {
    const projected = followupSafeStreamingText(reply.slice(0, length));
    assert.ok(projected.startsWith(prior), `projection rewound at provider byte ${length}`);
    assert.doesNotMatch(projected, /```cairn-followups|Retry narrowly|Review the records|\["Retry/);
    prior = projected;
  }
  assert.equal(prior, "The report confirms DONE.\n\nThe choice stays yours.");
});

test("settlement strips every duplicate recognized block and grants no suggestions", () => {
  const reply = [
    "The report confirms DONE.",
    '```cairn-followups\n["First"]\n```',
    "The owner still decides.",
    '```cairn-followups\n["Second"]\n```',
    "Nothing was dispatched.",
  ].join("\n");
  const result = extractFollowups(reply);
  assert.equal(result.followups, null);
  assert.equal(result.text, "The report confirms DONE.\n\nThe owner still decides.\n\nNothing was dispatched.");
  assert.doesNotMatch(result.text, /cairn-followups|\["First"|\["Second"/);
});

test("settlement strips malformed and unterminated recognized blocks without controls", () => {
  const malformed = extractFollowups("Readable before.\n```cairn-followups\n{broken\n```\nReadable after.");
  assert.equal(malformed.followups, null);
  assert.equal(malformed.text, "Readable before.\n\nReadable after.");

  const unterminated = extractFollowups('Readable before.\n```cairn-followups\n["Never public"]');
  assert.equal(unterminated.followups, null);
  assert.equal(unterminated.text, "Readable before.");
  assert.doesNotMatch(unterminated.text, /cairn-followups|Never public/);

  const validThenUnterminated = extractFollowups([
    "Readable before.",
    '```cairn-followups\n["Would otherwise validate"]\n```',
    "Readable middle.",
    '```cairn-followups\n["Still private"]',
  ].join("\n"));
  assert.equal(validThenUnterminated.followups, null);
  assert.equal(validThenUnterminated.text, "Readable before.\n\nReadable middle.");
});

test("settlement parses one exact valid block while inert examples remain ordinary prose", () => {
  const example = '````text\n```cairn-followups\n["Example only"]\n```\n````';
  const reply = `${example}\nCommentary.\n${fence('["Take the real next step"]')}`;
  const result = extractFollowups(reply);
  assert.deepEqual(result.followups, ["Take the real next step"]);
  assert.match(result.text, /Example only/);
  assert.match(result.text, /Commentary/);
  assert.doesNotMatch(result.text, /Take the real next step/);

  const crlf = extractFollowups("CRLF comment.\r\n```cairn-followups\r\n[\"One step\"]\r\n```\r\nAfter.");
  assert.deepEqual(crlf.followups, ["One step"]);
  assert.equal(crlf.text, "CRLF comment.\r\n\r\nAfter.");
});

test("a four-backtick pseudo-close cannot expose follow-ups nested in a reserved task block", () => {
  const reply = [
    "```cairn-task",
    "{broken",
    "````",
    "```cairn-followups",
    '["Must stay inert"]',
    "```",
    "```",
  ].join("\n");
  const result = extractFollowups(reply);
  assert.equal(result.followups, null);
  assert.equal(result.text, reply,
    "the follow-up scanner must leave the other reserved protocol for its owner to strip");
});

test("an indented pseudo-close cannot expose follow-ups nested in a reserved task block", () => {
  const reply = [
    "```cairn-task",
    "{broken",
    " ```",
    "```cairn-followups",
    '["Must stay inert"]',
    "```",
    "```",
  ].join("\n");
  const result = extractFollowups(reply);
  assert.equal(result.followups, null);
  assert.equal(result.text, reply,
    "reserved protocol closes must use the same column-zero grammar in both scanners");
});

test("main derives every public live snapshot from the follow-up-safe projection", () => {
  const service = readFileSync(join(__dirname, "..", "..", "src", "main", "conductor", "service.ts"), "utf8");
  assert.match(service, /followupSafeStreamingText\(controlSafeStreamingText\(full\)\)/);
  assert.match(service, /if \(live\?\.controller === controller\) live\.text = publicFull/);
  assert.match(service, /export function current[\s\S]*?text: live\.text/,
    "renderer reattachment must receive only the controller's sanitized text");
  assert.match(service, /extractFollowups\(full\)/,
    "settled suggestions must be parsed from the untouched provider response");
});
