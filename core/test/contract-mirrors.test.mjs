import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function normalizeLineEndings(value) {
  return value.replace(/\r\n?/g, "\n");
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
