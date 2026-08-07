import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Line endings normalised and every whitespace run collapsed, so a
 * hard-wrapped sentence matches the same pattern as a single-line one. The
 * contract's prose wraps at 78 columns; a literal-space pattern cannot cross a
 * line break plus its indent. */
function contractText(file) {
  return readFileSync(join(REPOSITORY, file), "utf8").replace(/\s+/g, " ");
}

/** The two hand-edited sources. `cairn.html` embeds the same text and is held
 * to it by contract-mirrors.test.mjs; the generated copies are build outputs. */
for (const file of ["CONTRACT-TEMPLATE.md", "AGENTS.md"]) {
  test(`${file} requires each brief check to carry a stable id`, () => {
    assert.match(
      contractText(file),
      /each check carries a stable id of the form `cN`/,
      "the brief rule naming the check-id format is missing",
    );
  });

  test(`${file} requires the report to answer every brief check by id`, () => {
    assert.match(
      contractText(file),
      /answering every id the brief declared, and naming any check added during the work/,
      "the report rule requiring per-id answers is missing",
    );
  });

  test(`${file} declares contract version 0.8.0`, () => {
    assert.match(contractText(file), /Cairn Contract v0\.8\.0/);
  });
}
