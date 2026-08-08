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

test("every version cairn.html states matches the canonical template", () => {
  // cairn.html carries the version TWICE: the page's own eyebrow line, and the
  // embedded contract. The mirror check above compares only the embedded copy,
  // so before this test the public page could advertise one version while the
  // contract it ships stated another, with every test green.
  const repository = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const canonical = normalizeLineEndings(
    readFileSync(join(repository, "CONTRACT-TEMPLATE.md"), "utf8"),
  );
  const companion = normalizeLineEndings(readFileSync(join(repository, "cairn.html"), "utf8"));

  const expected = /Cairn Contract v([0-9][0-9.]*)/.exec(canonical);
  assert.ok(expected, "CONTRACT-TEMPLATE.md states no contract version");

  const stated = [...companion.matchAll(/Cairn Contract v([0-9][0-9.]*)/g)].map((m) => m[1]);
  assert.ok(stated.length >= 2, `cairn.html should state the version at least twice, found ${stated.length}`);
  for (const version of stated) {
    assert.equal(
      version,
      expected[1],
      `cairn.html states Cairn Contract v${version}; the template states v${expected[1]}`,
    );
  }
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
