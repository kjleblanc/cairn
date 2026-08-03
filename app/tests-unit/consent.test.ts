import { test } from "node:test";
import assert from "node:assert/strict";
import { consentCardFor } from "../src/main/conductor/consent.js";

// Task 098: the consent card is the truth the owner consents to, so its
// sentences are pinned exactly. The API-seat strings must stay byte-identical
// to what shipped before the Kimi subscription seat existed — that is the
// proof the OpenRouter flow did not move — and the Kimi seat must say the
// subscription truth instead of borrowing "pay-as-you-go".

const API_COST =
  "Pay-as-you-go on your provider account. Conversation runs without per-message approval while connected. After a task Cairn dispatches from chat finishes, Cairn takes one short comment turn on the result; it bills like any other turn. Disconnect at any time to delete the stored key.";
const API_CHECKBOX =
  "I understand what will be shared and that conversation costs money on my account";
const DATA_SCOPE =
  "Your messages; the task records, recent saved-change summary, and file names for whichever project you are discussing; and a bounded snapshot of selected Git-tracked text-file contents (at most 8 files, 8,000 characters per file, and 32,000 characters total). Cairn excludes .env files, service-account keys, token stores, private keys, other credential-like files, Git-ignored files, dependencies, generated areas, binaries, links, the .git and .cairn areas, and anything outside the project. Never credentials. Cairn keeps conversation memory in the project's .cairn area, kept out of Git.";
const FILE_CONTENTS_CHECKBOX =
  "I separately allow Cairn to share the bounded project-file contents described above with this provider";

test("an API seat keeps the exact pre-098 cost and checkbox sentences", () => {
  const card = consentCardFor("https://openrouter.ai/api/v1", "moonshotai/kimi-k2");
  assert.equal(card.provider, "openrouter.ai");
  assert.equal(card.cost, API_COST);
  assert.equal(card.checkbox, API_CHECKBOX);
});

test("a custom or local seat gets the same API wording, not the subscription one", () => {
  const card = consentCardFor("http://localhost:8080/v1", "local-model");
  assert.equal(card.provider, "localhost:8080");
  assert.equal(card.cost, API_COST);
  assert.equal(card.checkbox, API_CHECKBOX);
});

test("the Kimi subscription seat states the quota truth and never claims per-turn billing", () => {
  const card = consentCardFor("https://api.kimi.com/coding/v1", "kimi-for-coding");
  assert.equal(card.provider, "api.kimi.com");
  assert.equal(card.baseUrl, "https://api.kimi.com/coding/v1");
  assert.equal(card.model, "kimi-for-coding");

  // The subscription truth: membership quota, already paid for, invisible to Cairn.
  assert.match(card.cost, /Kimi membership's included coding quota/);
  assert.match(card.cost, /already pay for, not per-token billing/);
  assert.match(card.cost, /Cairn cannot see how much quota/);
  assert.doesNotMatch(card.cost, /Pay-as-you-go/);
  assert.doesNotMatch(card.checkbox, /costs money/);
  assert.match(card.checkbox, /Kimi membership's quota, which Cairn cannot see/);
});

test("the data-scope sentence is identical for every seat", () => {
  const api = consentCardFor("https://openrouter.ai/api/v1", "moonshotai/kimi-k2");
  const kimi = consentCardFor("https://api.kimi.com/coding/v1", "kimi-for-coding");
  assert.equal(kimi.data, api.data);
  assert.equal(kimi.data, DATA_SCOPE);
  assert.equal(kimi.fileContentsCheckbox, FILE_CONTENTS_CHECKBOX);
  assert.equal(api.fileContentsCheckbox, FILE_CONTENTS_CHECKBOX);
  assert.match(kimi.data, /at most 8 files, 8,000 characters per file, and 32,000 characters total/);
  assert.match(kimi.data, /\.env files, service-account keys, token stores, private keys/);
  assert.match(kimi.data, /Git-ignored files, dependencies, generated areas, binaries, links, the \.git and \.cairn areas/);
  assert.match(kimi.data, /Never credentials\./);
  assert.doesNotMatch(kimi.data, /Never file contents/);
});
