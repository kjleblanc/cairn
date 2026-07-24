import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendTurn, ensureCairnIgnored, listConversations, newConversationId, readTurns } from "../src/main/conductor/store.js";

const turn = (role: "owner" | "cairn", text: string) => ({ role, text, ts: "2026-07-23T12:00:00.000Z" });

test("turns round-trip and ids increment", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-store-"));
  const first = newConversationId(root);
  assert.equal(first, "001");
  appendTurn(root, first, turn("owner", "hello"));
  appendTurn(root, first, turn("cairn", "hello back"));
  assert.deepEqual(readTurns(root, first).map((item) => item.text), ["hello", "hello back"]);
  assert.equal(newConversationId(root), "002");
  const list = listConversations(root);
  assert.equal(list.length, 1);
  assert.equal(list[0].preview, "hello");
});

test("a corrupt line is skipped, not fatal", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-store-"));
  const id = newConversationId(root);
  appendTurn(root, id, turn("owner", "good"));
  writeFileSync(join(root, ".cairn", "conversations", `${id}.jsonl`), `${JSON.stringify(turn("owner", "good"))}\n{broken\n`, "utf8");
  assert.deepEqual(readTurns(root, id).map((item) => item.text), ["good"]);
});

test("gitignore gains /.cairn/ exactly once", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-store-"));
  writeFileSync(join(root, ".gitignore"), "node_modules\n", "utf8");
  assert.equal(ensureCairnIgnored(root), true);
  assert.equal(ensureCairnIgnored(root), false);
  const lines = readFileSync(join(root, ".gitignore"), "utf8").split(/\r?\n/);
  assert.equal(lines.filter((line) => line === "/.cairn/").length, 1);
});

test("gitignore is created when missing", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-store-"));
  assert.equal(ensureCairnIgnored(root), true);
  assert.ok(existsSync(join(root, ".gitignore")));
});
