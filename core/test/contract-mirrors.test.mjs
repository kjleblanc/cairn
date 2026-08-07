import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function normalizeLineEndings(value) {
  return value.replace(/\r\n?/g, "\n");
}

/** The contract text with the first fenced project-facts block blanked.
 * `AGENTS.md` is the template plus this project's own facts; everything
 * outside that block must match byte for byte. */
function withoutProjectFacts(value) {
  return value.replace(/```text\n[\s\S]*?\n```/, "```text\n<facts>\n```");
}

test("contract mirrors match the canonical template", () => {
  const repository = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const canonical = normalizeLineEndings(
    readFileSync(join(repository, "CONTRACT-TEMPLATE.md"), "utf8"),
  );
  const asset = normalizeLineEndings(
    readFileSync(join(repository, "core", "assets", "contract.md"), "utf8"),
  );
  const companion = normalizeLineEndings(
    readFileSync(join(repository, "cairn.html"), "utf8"),
  );
  const embedded = companion.match(
    /<script type="text\/plain" id="src-contract">([\s\S]*?)<\/script>/,
  );

  assert.equal(asset, canonical, "core/assets/contract.md drifted from CONTRACT-TEMPLATE.md");
  assert.ok(embedded, "cairn.html is missing its src-contract script block");
  assert.equal(
    embedded[1],
    canonical,
    "cairn.html's src-contract script block drifted from CONTRACT-TEMPLATE.md",
  );
});

test("AGENTS.md matches the canonical template outside its project facts", () => {
  const repository = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const canonical = normalizeLineEndings(
    readFileSync(join(repository, "CONTRACT-TEMPLATE.md"), "utf8"),
  );
  const live = normalizeLineEndings(readFileSync(join(repository, "AGENTS.md"), "utf8"));

  assert.equal(
    withoutProjectFacts(live),
    withoutProjectFacts(canonical),
    "AGENTS.md drifted from CONTRACT-TEMPLATE.md outside the project-facts block",
  );
});
