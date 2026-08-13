import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TASK229_MARKER = /builder-proposal-review|builderproposalreview|cairn-builder-proposal-review|BuilderProposalReview|builder-proposal-/iu;

function files(root) {
  const output = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...files(path));
    else if (entry.isFile() && /\.(?:js|css)$/u.test(entry.name)) output.push(path);
  }
  return output;
}

test("fresh production JS and CSS stay Task229-dark while the lab bundle carries the card", () => {
  const productionRoots = [resolve(APP_ROOT, ".vite", "build"), resolve(APP_ROOT, ".vite", "renderer")];
  for (const root of productionRoots) assert.equal(existsSync(root), true, `missing fresh production bundle root ${root}`);
  const productionMatches = productionRoots.flatMap(files)
    .filter((path) => TASK229_MARKER.test(readFileSync(path, "utf8")));
  assert.deepEqual(productionMatches, []);

  for (const relativePath of [
    "package.json",
    "forge.config.ts",
    "vite.main.config.ts",
    "vite.preload.config.ts",
    "vite.renderer.config.ts",
    "src/main/main.ts",
    "src/preload.ts",
    "src/shared/ipc.ts",
    "src/renderer/main.tsx",
    "src/renderer/screens/Chat.tsx",
    "src/renderer/app.css",
  ]) {
    const text = readFileSync(resolve(APP_ROOT, relativePath), "utf8");
    assert.doesNotMatch(text, TASK229_MARKER, relativePath);
    assert.doesNotMatch(text, /import\.meta\.glob|require\.context/u, relativePath);
  }

  const labRoot = resolve(APP_ROOT, ".vite", "lab");
  assert.equal(existsSync(labRoot), true, "missing fresh visual-lab bundle root");
  assert.equal(files(labRoot).some((path) => TASK229_MARKER.test(readFileSync(path, "utf8"))), true,
    "the lab-side positive control must prove this scan can see the proposal card");
});
