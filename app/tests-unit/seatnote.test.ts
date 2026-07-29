import test from "node:test";
import assert from "node:assert/strict";
import { connectionNoteFor } from "../src/main/conductor/seatnote.js";
import { BODIES, bodyBaseUrl } from "../src/shared/bodies.js";

// Task 127: a custom (non-curated) seat earns one code-assembled note in the
// conductor's prompt offering the add-a-model task; a curated seat adds
// nothing. The note may carry only the model id and host — data the provider
// already receives as the API call's own model field and endpoint.

test("every curated seat produces no note", () => {
  for (const body of BODIES) {
    assert.equal(connectionNoteFor(bodyBaseUrl(body), body.id), null, `curated seat ${body.name} produced a note`);
  }
});

test("a custom seat's note names the model id and host", () => {
  const note = connectionNoteFor("http://127.0.0.1:8787/v1", "fixture-model");
  assert.ok(note !== null);
  assert.ok(note.includes("fixture-model"));
  assert.ok(note.includes("127.0.0.1:8787"));
  assert.ok(note.includes("assembled by Cairn's code, not by a model"));
});

test("a curated model id reached through the WRONG host is still custom", () => {
  // The picker's Kimi K3 id typed into a custom provider URL is not the
  // curated seat — the note must appear rather than vouch for an unknown host.
  assert.ok(connectionNoteFor("https://example.com/v1", "moonshotai/kimi-k3") !== null);
});

test("the note offers the add-a-model task once and carries no secret shape", () => {
  const note = connectionNoteFor("https://openrouter.ai/api/v1", "someone/new-model") as string;
  assert.ok(note.includes("add it to the picker as a Cairn task"));
  assert.ok(/once|one offer|do not offer again/i.test(note));
  assert.ok(!/sk-|keyb64|api[_-]?key/i.test(note));
});
