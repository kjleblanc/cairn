import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REVIEW_MARKER = /builder-proposal-review|builderproposalreview|cairn-builder-proposal-review|BuilderProposalReview|builder-proposal-/iu;
const BUILDER_ROLE_MARKER = /["']builder-review["']|cairn-builder-review-(?:turn|marker)/iu;
function files(root) {
  const output = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...files(path));
    else if (entry.isFile() && /\.(?:js|css)$/u.test(entry.name)) output.push(path);
  }
  return output;
}

function bundleText(root) {
  assert.equal(existsSync(root), true, `missing fresh bundle root ${root}`);
  return files(root).map((path) => readFileSync(path, "utf8")).join("\n");
}

test("fresh bundles admit exactly the authenticated desktop Builder review route", () => {
  const mainRoot = resolve(APP_ROOT, ".vite", "build");
  const rendererRoot = resolve(APP_ROOT, ".vite", "renderer");
  const labRoot = resolve(APP_ROOT, ".vite", "lab");
  const main = bundleText(mainRoot);
  const renderer = bundleText(rendererRoot);
  const lab = bundleText(labRoot);

  assert.match(main, /cairn-builder-review-marker\/v1/u,
    "Main must carry the separate versioned external custody domain");
  assert.match(main, /cairn-builder-review-turn\/v1/u);
  assert.match(main, /cairn-builder-proposal-review\/v1/u);
  assert.match(main, /BUILDER_REVIEW_APPEND_FORBIDDEN/u,
    "the generic transcript producer must retain its runtime refusal");
  assert.match(main, /syntheticBefore\(\)/u,
    "the guarded Main-only positive fixture must survive bundling");

  assert.match(renderer, /Builder proposal[^a-z]+not applied/iu,
    "real production Chat must contain the Task 229 honesty heading");
  assert.match(renderer, /builder-proposal-review/u);
  assert.match(renderer, /Nothing changed\. No command ran\./u);
  assert.doesNotMatch(renderer, /syntheticBefore\(\)|syntheticAfter\(\)/u,
    "fixed Task 224 fixture input belongs to Main, never the renderer bundle");

  const preload = files(mainRoot)
    .filter((path) => /preload/iu.test(path))
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  assert.doesNotMatch(preload, REVIEW_MARKER,
    "generic conversation IPC needs no Builder-only preload code");
  assert.doesNotMatch(preload, /syntheticBefore\(\)|syntheticAfter\(\)/u);

  assert.match(lab, REVIEW_MARKER,
    "the Task 229 visual lab remains an independent positive control");
  assert.match(lab, /builder-proposal-review/u);

  for (const relativePath of [
    "package.json",
    "forge.config.ts",
    "vite.main.config.ts",
    "vite.preload.config.ts",
    "vite.renderer.config.ts",
    "src/preload.ts",
    "src/main/tasks.ts",
    "src/main/pendingrun.ts",
    "src/main/builderreservation.ts",
    "src/main/criticactivation.ts",
    "src/main/workeridentity.ts",
    "src/main/conductor/relay.ts",
    "src/main/conductor/transports/types.ts",
    "src/main/conductor/transports/openai-compatible.ts",
  ]) {
    const text = readFileSync(resolve(APP_ROOT, relativePath), "utf8");
    assert.doesNotMatch(text, REVIEW_MARKER, relativePath);
    assert.doesNotMatch(text, /import\.meta\.glob|require\.context/u, relativePath);
  }

  const expectedSourceConsumers = new Set([
    "main/builderproposalreview.ts",
    "main/conductor/builderreviewauth.ts",
    "main/conductor/store.ts",
    "main/main.ts",
    "renderer/components/BuilderProposalReview.tsx",
    "renderer/screens/Chat.tsx",
    "shared/builder-proposal-review.ts",
    "shared/ipc.ts",
  ]);
  const srcRoot = resolve(APP_ROOT, "src");
  const sourceConsumers = [];
  const roleConsumers = [];
  const walkSource = (root) => {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      const path = join(root, entry.name);
      if (entry.isDirectory()) walkSource(path);
      else if (entry.isFile() && /\.(?:ts|tsx)$/u.test(entry.name)
        ) {
        const text = readFileSync(path, "utf8");
        const relativePath = relative(srcRoot, path).replaceAll("\\", "/");
        if (REVIEW_MARKER.test(text)) sourceConsumers.push(relativePath);
        if (BUILDER_ROLE_MARKER.test(text)) roleConsumers.push(relativePath);
      }
    }
  };
  walkSource(srcRoot);
  assert.deepEqual(new Set(sourceConsumers), expectedSourceConsumers,
    "no activation, transport or action consumer may join the production allowlist");
  assert.deepEqual(new Set(roleConsumers), new Set([
    "main/conductor/builderreviewauth.ts",
    "main/conductor/service.ts",
    "main/conductor/store.ts",
    "main/conductor/turnauth.ts",
    "renderer/screens/Chat.tsx",
    "renderer/screens/Workspace.tsx",
    "shared/ipc.ts",
  ]), "the role/domain graph must remain exact even without projection imports");

  assert.match(main, /syntheticAfter\(\)/u);
});
