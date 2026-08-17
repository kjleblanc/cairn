import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Every hand-written source tree. Like the contract mirror checks beside this
 * file, the scan is repo-wide rather than core-only: it reads bytes and needs
 * no build, so core's suite is the cheapest place to run it for everyone. */
const SOURCE_DIRECTORIES = ["core/src", "app/src", "app/lab", "cli/src"];

const SKIPPED_DIRECTORIES = new Set(["node_modules", "dist", ".git"]);

/** `c3 a2` is UTF-8 for a-circumflex, which is byte `e2` shown through
 * Windows-1252. Every character in U+2000-U+2FFF — em and en dashes, curly
 * quotes, ellipses, arrows — encodes to UTF-8 starting with `e2`, so a file
 * that round-tripped through a CP1252 codec turns each one into a-circumflex
 * plus two more mojibake characters. Searching for this one byte pair
 * therefore catches the whole punctuation family in a single pass, and
 * a-circumflex is not a character this codebase writes on purpose.
 *
 * Task 264 added this after seven such runs reached `main` in `35e5607`:
 * `c3 a2 e2 82 ac e2 80 9d`, a double-encoded em dash. Three of them sat in
 * worker instruction text sent to the model, and nothing in the repository
 * looked for them.
 *
 * This file deliberately spells those characters out by name rather than
 * writing them, so that widening the scan to cover test directories cannot
 * make this guard fail on itself. */
const DOUBLE_ENCODING = Buffer.from([0xc3, 0xa2]);

function* sourceFiles(directory) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) yield* sourceFiles(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

/** Git's own heuristic: a NUL byte near the start means binary. Keeps an image
 * or font dropped into a source tree from failing this test on chance bytes. */
function looksBinary(buffer) {
  return buffer.subarray(0, 8000).includes(0x00);
}

function lineNumberAt(buffer, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (buffer[index] === 0x0a) line += 1;
  }
  return line;
}

/** The offending line as text, so the failure names what to look for. The bytes
 * are valid UTF-8 — they just spell the wrong characters — so decoding is safe. */
function excerptAt(buffer, offset) {
  const start = buffer.lastIndexOf(0x0a, offset) + 1;
  let end = buffer.indexOf(0x0a, offset);
  if (end === -1) end = buffer.length;
  const line = buffer.subarray(start, end).toString("utf8").trim();
  return line.length > 160 ? `${line.slice(0, 157)}...` : line;
}

function scan() {
  const hits = [];
  for (const directory of SOURCE_DIRECTORIES) {
    const absolute = join(REPOSITORY, directory);
    try {
      if (!statSync(absolute).isDirectory()) continue;
    } catch {
      assert.fail(`${directory} is missing; this guard would silently stop covering it`);
    }
    for (const file of sourceFiles(absolute)) {
      const buffer = readFileSync(file);
      if (looksBinary(buffer)) continue;
      for (
        let at = buffer.indexOf(DOUBLE_ENCODING);
        at !== -1;
        at = buffer.indexOf(DOUBLE_ENCODING, at + 1)
      ) {
        const path = relative(REPOSITORY, file).replace(/\\/g, "/");
        hits.push(`${path}:${lineNumberAt(buffer, at)}  ${excerptAt(buffer, at)}`);
      }
    }
  }
  return hits;
}

test("no source file carries a CP1252 double-encoding", () => {
  const hits = scan();
  assert.deepEqual(
    hits,
    [],
    `${hits.length} CP1252 double-encoding(s) found. Each is a punctuation `
      + `character that was read as Windows-1252 and re-encoded as UTF-8, so one `
      + `character became three: an em dash reads as a-circumflex, euro sign, right `
      + `double quote. Repair the bytes on the file buffer rather than retyping the `
      + `line, or the editor that caused it will do it again:\n`
      + hits.map((hit) => `  ${hit}`).join("\n"),
  );
});
