import test from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RouteResult, SerialRunResult } from "@cairn/core";
import { cardBriefing, composeErrorCard, composeResultCard } from "../src/main/conductor/relay.js";
import { appendTurn, conversationsDir, listConversations, newConversationId, readTurns } from "../src/main/conductor/store.js";

// The card is authored from `result.composed` — the very record input Cairn
// rendered its own report from — so the card and the report can never
// disagree. These fixtures are shaped exactly as core's close arms return
// them; nothing here is scraped from rendered Markdown.

const READY_ROUTE: Extract<RouteResult, { status: "ready" }> = {
  status: "ready",
  recommended: {
    id: "codex-exec",
    label: "Codex Exec",
    provider: "OpenAI",
    model: "gpt-5-codex",
    connected: true,
    capabilities: ["worker"],
    priority: 1,
  },
  candidates: [],
  reason: "Codex Exec is installed, connected, and supports this serial task.",
};

const CONTRACT_ROUTE = {
  adapterId: "codex-exec",
  adapterLabel: "Codex Exec",
  provider: "OpenAI",
  model: "gpt-5-codex",
  reason: "Codex Exec is installed, connected, and supports this serial task.",
};

const ROW = {
  task: "004", date: "2026-07-25", lane: "Standard", mode: "Applied",
  outcome: "DONE", decision: "completed", summary: "s", moved: "YES",
};

function doneResult(): SerialRunResult {
  return {
    status: "done",
    disposition: "DONE",
    taskNumber: 4,
    briefPath: "docs/ai-work/tasks/004-brief.md",
    reportPath: "docs/ai-work/tasks/004-report.md",
    reportText: "# Task 004\n",
    row: ROW,
    route: READY_ROUTE,
    activities: [],
    commit: { status: "created", reason: "One exact-path commit contains the product changes and these records.", hash: "0f1e2d3" },
    composed: {
      taskNumber: 4,
      route: CONTRACT_ROUTE,
      disposition: "DONE",
      stopReason: null,
      claims: {
        disposition: "DONE",
        summary: "Added the visible result.",
        changes: ["visible.txt — created"],
        checks: [{ name: "read back", result: "matches" }],
        howToTry: "Open visible.txt.",
        limitations: "None.",
        milestone: "YES",
      },
      filesChanged: ["docs/ai-work/LOG.md", "visible.txt"],
      protectedIntact: true,
      commit: { status: "created", reason: "One exact-path commit contains the product changes and these records." },
      evidenceSummary: "Bounded worker evidence: files_changed=1.",
      processFailure: null,
      paidCallStarted: true,
    },
  };
}

function stoppedResult(): SerialRunResult {
  return {
    status: "stopped",
    reason: "PROTECTED_WORK_CHANGED",
    disposition: "STOPPED",
    taskNumber: 5,
    briefPath: "docs/ai-work/tasks/005-brief.md",
    reportPath: "docs/ai-work/tasks/005-report.md",
    reportText: "# Task 005\n",
    row: { ...ROW, task: "005", outcome: "STOPPED", decision: "stopped", moved: "NO" },
    route: READY_ROUTE,
    activities: [],
    commit: { status: "skipped", reason: "Stopped evidence was retained for inspection." },
    composed: {
      taskNumber: 5,
      route: CONTRACT_ROUTE,
      disposition: "STOPPED",
      stopReason: "PROTECTED_WORK_CHANGED",
      claims: null,
      filesChanged: ["src/protected.ts"],
      protectedIntact: false,
      commit: null,
      evidenceSummary: null,
      // Task 052's disclosure and the worker process's own failure. Both are
      // Cairn's own account, and a card that dropped either would be a quieter
      // record than the report it accompanies.
      recordRecovery: "The worker modified the append-only work log; Cairn restored it from the task-start snapshot and recorded this stop.",
      processFailure: { code: "CODEX_EXEC_SPAWN_FAILED", debugPath: "C:/Users/owner/.cairn-debug/005" },
      paidCallStarted: true,
    },
  };
}

test("a done run composes a DONE card whose files changed come from composed, never from claims", () => {
  const result = doneResult();
  const card = composeResultCard(result);
  assert.equal(card.kind, "result");
  assert.equal(card.disposition, "DONE");
  assert.equal(card.taskNumber, 4);
  assert.equal(card.stopReason, null);
  assert.equal(card.errorCode, null);
  assert.deepEqual(card.filesChanged, ["docs/ai-work/LOG.md", "visible.txt"]);
  assert.equal(card.protectedIntact, true);
  assert.equal(card.commit, "One exact-path commit contains the product changes and these records.");
  assert.equal(card.evidenceSummary, "Bounded worker evidence: files_changed=1.");
  assert.deepEqual(card.claims, { summary: "Added the visible result.", milestone: "YES" });
  assert.deepEqual(card.route, { adapterLabel: "Codex Exec", provider: "OpenAI", model: "gpt-5-codex" });
  assert.equal(card.recordRecovery, null);
  assert.equal(card.processFailure, null);
  // The card owns its own array: mutating it can never reach back into the
  // record input the report was composed from.
  assert.notEqual(card.filesChanged as unknown, result.status === "done" ? result.composed.filesChanged : null);
});

test("a stopped run carries its fixed stop reason, the real protected-work finding, and no commit", () => {
  const card = composeResultCard(stoppedResult());
  assert.equal(card.disposition, "STOPPED");
  assert.equal(card.stopReason, "PROTECTED_WORK_CHANGED");
  assert.equal(card.taskNumber, 5);
  assert.equal(card.protectedIntact, false);
  assert.equal(card.commit, null);
  assert.equal(card.errorCode, null);
  assert.equal(card.claims, null);
  assert.deepEqual(card.filesChanged, ["src/protected.ts"]);
  // Cairn's own two disclosures reach the card, not just the report: a worker
  // that edited Cairn's own owned records, and the process failure with the
  // retained local debug path.
  assert.match(card.recordRecovery ?? "", /restored it from the task-start snapshot/);
  assert.deepEqual(card.processFailure, { code: "CODEX_EXEC_SPAWN_FAILED", debugPath: "C:/Users/owner/.cairn-debug/005" });
});

test("a connection-required close maps to a STOPPED card that claims no task, no files, and no records", () => {
  const card = composeResultCard({
    status: "connection-required",
    route: { status: "connection-required", candidates: [], reason: "Codex Exec is not installed, so no model route is available." },
    activities: [],
  });
  assert.equal(card.disposition, "STOPPED");
  assert.equal(card.stopReason, "CONNECTION_REQUIRED");
  assert.equal(card.taskNumber, null);
  assert.deepEqual(card.filesChanged, []);
  assert.equal(card.protectedIntact, null);
  assert.equal(card.claims, null);
  assert.equal(card.commit, null);
  assert.equal(card.route, null);
  assert.equal(card.evidenceSummary, "Codex Exec is not installed, so no model route is available.");
});

test("an error card carries the fixed code and none of the raw message", () => {
  const card = composeErrorCard("RECORD_VERIFICATION_FAILED: Task records were retained for inspection.");
  assert.equal(card.kind, "result");
  assert.equal(card.disposition, "ERROR");
  assert.equal(card.errorCode, "RECORD_VERIFICATION_FAILED");
  assert.equal(card.taskNumber, null);
  assert.equal(card.stopReason, null);
  assert.deepEqual(card.filesChanged, []);
  assert.equal(card.protectedIntact, null);
  assert.equal(card.commit, null);
  assert.equal(card.claims, null);
  assert.equal(card.route, null);
  assert.equal(card.evidenceSummary, null);
  assert.ok(!JSON.stringify(card).includes("retained for inspection"), "the raw message must never ride the card");

  // No fixed code, no claimed code. A raw runtime error's prefix is not a
  // Cairn code and must not be dressed as one.
  assert.equal(composeErrorCard("Cairn could not read this project.").errorCode, null);
  assert.equal(composeErrorCard("ENOENT: no such file or directory, open 'C:/secret/path'").errorCode, null);
});

test("the store round-trips a valid envelope turn and drops every envelope line whose card is not a result card", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-resultcard-"));
  const id = newConversationId(root);
  const card = composeResultCard(doneResult());
  appendTurn(root, id, { role: "envelope", card, ts: "2026-07-25T10:00:00.000Z" });

  // Every bad line below carries a VALID ts, so the card guard is the only
  // thing that can drop it — otherwise these pass for the ts-check's reason
  // and the guard itself is never exercised. One line per clause of the guard.
  const ts = "2026-07-25T10:00:00.500Z";
  const bad = [
    { role: "envelope", card: { kind: "nope" }, ts },
    { role: "envelope", card: { ...card, disposition: "FINE" }, ts },
    { role: "envelope", card: { ...card, filesChanged: "docs/ai-work/LOG.md" }, ts },
    { role: "envelope", card: "a result card, honestly", ts },
    { role: "envelope", card: null, ts },
    { role: "envelope", ts },
  ];
  for (const line of bad) {
    appendFileSync(join(conversationsDir(root), `${id}.jsonl`), `${JSON.stringify(line)}\n`, "utf8");
  }
  appendTurn(root, id, { role: "owner", text: "and after the card", ts: "2026-07-25T10:00:01.000Z" });

  const turns = readTurns(root, id);
  assert.equal(turns.length, 2, "only the real card and the owner turn survive");
  const first = turns[0];
  assert.equal(first.role, "envelope");
  if (first.role !== "envelope") return;
  assert.equal(first.card.kind, "result");
  assert.equal(first.card.disposition, "DONE");
  assert.deepEqual(first.card.filesChanged, ["docs/ai-work/LOG.md", "visible.txt"]);
  assert.equal(turns[1].role, "owner");
});

test("the conductor reads a card as two separated parts: what Cairn verified, and what the worker claims", () => {
  const briefing = cardBriefing(composeResultCard(doneResult()));
  const [verified, claimed] = briefing.split("\n\n");

  assert.match(verified, /^Envelope result card \(verified by Cairn's runtime, not by the conversation model\):\n/);
  assert.match(claimed, /^The worker's account \(claims, not verified by Cairn\):\n/);

  // The guarantee, stated as a test: the worker's own sentence appears ONLY
  // under the claims label. A single JSON blob under the "verified" heading
  // would hand the model the worker's account under Cairn's guarantee.
  assert.ok(!verified.includes("Added the visible result."), "a claim must never sit under the verified label");
  assert.ok(!verified.includes("claims"), "the verified part carries no claims key at all");
  assert.ok(claimed.includes("Added the visible result."));
  assert.ok(claimed.includes("YES"));
  // Cairn's own verified facts stay on the verified side.
  assert.ok(verified.includes("docs/ai-work/LOG.md"));
  assert.ok(verified.includes("Codex Exec"));

  // No claims: the record's own sentence, not an empty object.
  const empty = cardBriefing(composeResultCard(stoppedResult()));
  assert.ok(empty.includes("The worker returned no readable claims block."));
});

test("a conversation whose first turn is a result card previews as Result card", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-resultcard-preview-"));
  const id = newConversationId(root);
  appendTurn(root, id, { role: "envelope", card: composeResultCard(doneResult()), ts: "2026-07-25T10:00:00.000Z" });
  const listed = listConversations(root);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].preview, "Result card");
  assert.equal(listed[0].startedTs, "2026-07-25T10:00:00.000Z");

  // A card followed by talk previews the talk — the first owner or cairn turn,
  // not the first turn of any kind.
  appendTurn(root, id, { role: "owner", text: "what happened there", ts: "2026-07-25T10:00:01.000Z" });
  assert.equal(listConversations(root)[0].preview, "what happened there");
});
