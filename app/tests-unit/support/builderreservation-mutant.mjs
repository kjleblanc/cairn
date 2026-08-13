import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MODES = new Set([
  "write-partial-high-water",
  "inspect-without-partial-high-water",
  "write-wrong-receipt",
  "inspect-without-receipt-digest",
  "write-wrong-revision-auth",
  "inspect-without-revision-auth",
  "inspect-without-root-identity",
  "inspect-without-canonical-revision",
  "inspect-without-stable-nlink",
  "exercise-without-path-confinement",
  "exercise-without-exact-keys",
  "exercise-without-text-bound",
  "exercise-without-handle-brand",
  "exercise-without-grant-brand",
  "exercise-without-receipt-brand",
  "exercise-without-single-mint",
  "exercise-without-grant-spend",
  "exercise-without-consumption-spend",
  "exercise-with-receipt-spend",
  "exercise-without-receipt-spend",
  "exercise-without-freshness",
]);
const [mode, rootValue] = process.argv.slice(2);
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourcePath = join(appRoot, "dist-unit", "src", "main", "builderreservation.js");
const fakeSourcePath = join(appRoot, "dist-unit", "tests-unit", "support", "builderreservation-fake.js");
const testResults = join(appRoot, "test-results");
const fixtureName = /^task227-[a-z0-9](?:[a-z0-9-]{0,94}[a-z0-9])?$/u;
const root = resolve(rootValue ?? "");
const claimRoot = dirname(root);

function directClaimIsValid() {
  try {
    const stat = lstatSync(claimRoot, { bigint: true });
    return typeof mode === "string" && MODES.has(mode)
      && typeof rootValue === "string" && basename(root) === "store"
      && dirname(claimRoot) === testResults && fixtureName.test(basename(claimRoot))
      && stat.isDirectory() && !stat.isSymbolicLink() && stat.nlink >= 1n
      && realpathSync.native(claimRoot) === claimRoot;
  } catch {
    return false;
  }
}

function replaceExactly(source, needle, replacement) {
  const first = source.indexOf(needle);
  if (first < 0 || source.lastIndexOf(needle) !== first) {
    throw new Error(`TASK227_MUTANT_NEEDLE_COUNT: ${needle.slice(0, 80)}`);
  }
  return `${source.slice(0, first)}${replacement}${source.slice(first + needle.length)}`;
}

function replaceWithin(source, startNeedle, endNeedle, needle, replacement) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  if (start < 0 || end < 0) throw new Error(`TASK227_MUTANT_SCOPE_MISSING: ${startNeedle}`);
  const segment = source.slice(start, end);
  const changed = replaceExactly(segment, needle, replacement);
  return `${source.slice(0, start)}${changed}${source.slice(end)}`;
}

function syntheticPlan(store) {
  const hash = (character) => character.repeat(64);
  return Object.freeze({
    version: store.BUILDER_RESERVATION_PLAN_VERSION,
    projectHash: hash("1"),
    taskSpecSha256: hash("2"),
    evidencePlanSha256: hash("3"),
    consentSha256: hash("4"),
    contextSha256: hash("5"),
    responseSha256: hash("6"),
    selectionSha256: hash("7"),
    beforeText: "synthetic before\n",
    afterText: "synthetic after\n",
  });
}

async function runMutant() {
  const codeRoot = join(claimRoot, `mutant-${randomUUID()}`);
  mkdirSync(codeRoot, { recursive: false });
  const codeIdentity = lstatSync(codeRoot, { bigint: true });
  try {
    let source = readFileSync(sourcePath, "utf8");
    if (mode === "write-partial-high-water") {
      source = replaceWithin(
        source,
        "function composeHighWater(",
        "function composeInventory(",
        "revisionSha256: revision.revisionSha256,",
        "revisionSha256: \"f\".repeat(64),",
      );
      source = replaceExactly(
        source,
        "        const inventory = composeInventory(key, revision, null);",
        "        return null;\n        const inventory = composeInventory(key, revision, null);",
      );
    } else if (mode === "inspect-without-partial-high-water") {
      source = replaceExactly(
        source,
        "        if (highWaterOne && !highWaterMatches(revisionOne, highWaterOne, null)) {",
        "        if (false && highWaterOne && !highWaterMatches(revisionOne, highWaterOne, null)) {",
      );
    } else if (mode === "write-wrong-receipt") {
      source = replaceExactly(
        source,
        "        const receiptSha256 = sha(RECEIPT_SHA_DOMAIN, canonicalReceipt(binding, receiptStatus));",
        "        const receiptSha256 = \"f\".repeat(64);",
      );
    } else if (mode === "inspect-without-receipt-digest") {
      source = replaceExactly(
        source,
        "        if (revisionTwo?.receiptStatus && revisionTwo.receiptSha256 !== sha(RECEIPT_SHA_DOMAIN, canonicalReceipt(bindingFromRevision(revisionOne), revisionTwo.receiptStatus))) {",
        "        if (false && revisionTwo?.receiptStatus && revisionTwo.receiptSha256 !== sha(RECEIPT_SHA_DOMAIN, canonicalReceipt(bindingFromRevision(revisionOne), revisionTwo.receiptStatus))) {",
      );
    } else if (mode === "inspect-without-revision-auth") {
      source = replaceWithin(
        source,
        "function parseRevision(",
        "function canonicalHighWaterBody(",
        "        if (!equalHex(raw.authSha256, expectedAuth))",
        "        if (false && !equalHex(raw.authSha256, expectedAuth))",
      );
    } else if (mode === "inspect-without-root-identity") {
      source = replaceExactly(
        source,
        "            || currentRootIdentity === null || revisionOne.rootIdentitySha256 !== currentRootIdentity) {",
        "            || false) {",
      );
    } else if (mode === "inspect-without-canonical-revision") {
      source = replaceWithin(
        source,
        "function parseRevision(",
        "function canonicalHighWaterBody(",
        "        return canonicalRevision(record) === text ? record : null;",
        "        return record;",
      );
    } else if (mode === "inspect-without-stable-nlink") {
      source = replaceWithin(
        source,
        "function stableRead(",
        "function stableText(",
        "before.isSymbolicLink() || before.nlink !== 1n || before.size",
        "before.isSymbolicLink() || before.size",
      );
      source = replaceWithin(
        source,
        "function stableRead(",
        "function stableText(",
        "!opened.isFile() || opened.nlink !== 1n || opened.dev",
        "!opened.isFile() || opened.dev",
      );
      source = replaceWithin(
        source,
        "function stableRead(",
        "function stableText(",
        "after.nlink !== 1n || named.nlink !== 1n || after.size",
        "after.size",
      );
    } else if (mode === "exercise-without-path-confinement") {
      source = replaceWithin(
        source,
        "function fixtureRoot(",
        "function directoryNoLink(",
        "(0, node_path_1.dirname)(claimRoot) !== testResults",
        "false",
      );
      source = replaceWithin(
        source,
        "function fixtureRoot(",
        "function directoryNoLink(",
        "!FIXTURE_NAME.test((0, node_path_1.basename)(claimRoot))",
        "false",
      );
    } else if (mode === "exercise-without-exact-keys") {
      source = replaceWithin(
        source,
        "function exactRecord(",
        "const BINDING_KEYS",
        "        if (own.length !== keys.length || own.some((key) => typeof key !== \"string\" || !keys.includes(key)))",
        "        if (own.some((key) => typeof key !== \"string\"))",
      );
    } else if (mode === "exercise-without-text-bound") {
      source = replaceWithin(
        source,
        "function parsePlan(",
        "function canonicalRevisionBody(",
        "        || raw.beforeText.length > exports.BUILDER_RESERVATION_LIMITS.textCharacters",
        "        || false",
      );
    } else if (mode === "exercise-without-handle-brand") {
      source = replaceExactly(
        source,
        "const handleBindings = new WeakMap();",
        "const handleBindings = new WeakMap();\nconst task227MutantLiveReservations = [];",
      );
      source = replaceExactly(
        source,
        "        handleBindings.set(handle, live);",
        "        handleBindings.set(handle, live);\n        task227MutantLiveReservations.push(live);",
      );
      source = replaceWithin(
        source,
        "function mintBuilderReservationGrant(",
        "function liveBindingIsCurrent(",
        "    const live = handleBindings.get(handle);",
        "    const live = handleBindings.get(handle) ?? task227MutantLiveReservations[0];",
      );
    } else if (mode === "exercise-without-grant-brand") {
      source = replaceExactly(
        source,
        "const grantBindings = new WeakMap();",
        "const grantBindings = new WeakMap();\nlet task227MutantGrantStored = null;",
      );
      source = replaceExactly(
        source,
        "    grantBindings.set(grant, Object.freeze({ live, expected: binding }));",
        "    task227MutantGrantStored = Object.freeze({ live, expected: binding });\n    grantBindings.set(grant, task227MutantGrantStored);",
      );
      source = replaceWithin(
        source,
        "function consumeBuilderReservationGrantForFake(",
        "function composeBuilderReservationFakeReceiptForTest(",
        "    const stored = grantBindings.get(value);",
        "    const stored = grantBindings.get(value) ?? task227MutantGrantStored;",
      );
    } else if (mode === "exercise-without-receipt-brand") {
      source = replaceExactly(
        source,
        "const fakeReceiptBindings = new WeakMap();",
        "const fakeReceiptBindings = new WeakMap();\nlet task227MutantReceiptStored = null;",
      );
      source = replaceExactly(
        source,
        "    fakeReceiptBindings.set(receipt, Object.freeze({ ...stored, status }));",
        "    task227MutantReceiptStored = Object.freeze({ ...stored, status });\n    fakeReceiptBindings.set(receipt, task227MutantReceiptStored);",
      );
      source = replaceWithin(
        source,
        "function consumeBuilderReservationFakeReceipt(",
        "function completeBuilderReservation(",
        "    const stored = fakeReceiptBindings.get(value);",
        "    const stored = fakeReceiptBindings.get(value) ?? task227MutantReceiptStored;",
      );
    } else if (mode === "exercise-without-single-mint") {
      source = replaceWithin(
        source,
        "function mintBuilderReservationGrant(",
        "function liveBindingIsCurrent(",
        " || live.grantMinted",
        "",
      );
    } else if (mode === "exercise-without-grant-spend") {
      source = replaceWithin(
        source,
        "function consumeBuilderReservationGrantForFake(",
        "function composeBuilderReservationFakeReceiptForTest(",
        " || spentGrants.has(value)",
        "",
      );
      source = replaceWithin(
        source,
        "function consumeBuilderReservationGrantForFake(",
        "function composeBuilderReservationFakeReceiptForTest(",
        "    spentGrants.add(value);",
        "    // Task-227 causal mutant: spend guard removed.",
      );
    } else if (mode === "exercise-without-consumption-spend") {
      source = replaceWithin(
        source,
        "function composeBuilderReservationFakeReceiptForTest(",
        "function consumeBuilderReservationFakeReceipt(",
        " || completedConsumptions.has(value)",
        "",
      );
      source = replaceWithin(
        source,
        "function composeBuilderReservationFakeReceiptForTest(",
        "function consumeBuilderReservationFakeReceipt(",
        "    completedConsumptions.add(value);",
        "    // Task-227 causal mutant: consumption spend removed.",
      );
    } else if (mode === "exercise-with-receipt-spend" || mode === "exercise-without-receipt-spend") {
      source = replaceExactly(
        source,
        "const spentFakeReceipts = new WeakSet();",
        "const spentFakeReceipts = new WeakSet();\nlet task227MutantFailRevisionTwoOnce = true;",
      );
      source = replaceWithin(
        source,
        "function writeNew(",
        "function generationName(",
        "    const bytes = typeof textOrBytes === \"string\"",
        "    if (task227MutantFailRevisionTwoOnce && /[\\\\/]revisions[\\\\/]00000002\\.json$/u.test(path)) {\n        task227MutantFailRevisionTwoOnce = false;\n        throw new Error(\"TASK227_MUTANT_REVISION_TWO_CUT\");\n    }\n    const bytes = typeof textOrBytes === \"string\"",
      );
      if (mode === "exercise-without-receipt-spend") {
        source = replaceWithin(
          source,
          "function consumeBuilderReservationFakeReceipt(",
          "function completeBuilderReservation(",
          " || spentFakeReceipts.has(value)",
          "",
        );
        source = replaceWithin(
          source,
          "function consumeBuilderReservationFakeReceipt(",
          "function completeBuilderReservation(",
          "    spentFakeReceipts.add(value);",
          "    // Task-227 causal mutant: receipt spend removed.",
        );
      }
    } else if (mode === "exercise-without-freshness") {
      source = replaceWithin(
        source,
        "function consumeBuilderReservationGrantForFake(",
        "function composeBuilderReservationFakeReceiptForTest(",
        "        || !liveBindingIsCurrent(stored.live, stored.expected))",
        "        || false)",
      );
    }

    const modulePath = join(codeRoot, "builderreservation.js");
    writeFileSync(modulePath, source, { encoding: "utf8", flag: "wx" });
    const store = await import(`${pathToFileURL(modulePath).href}?${randomUUID()}`);
    let fake = null;
    if (mode === "write-wrong-receipt" || mode === "exercise-without-grant-brand"
      || mode === "exercise-without-receipt-brand" || mode === "exercise-without-grant-spend"
      || mode === "exercise-with-receipt-spend" || mode === "exercise-without-receipt-spend"
      || mode === "exercise-without-freshness") {
      const fakeSource = replaceExactly(
        readFileSync(fakeSourcePath, "utf8"),
        'require("../../src/main/builderreservation.js")',
        'require("./builderreservation.js")',
      );
      const fakePath = join(codeRoot, "builderreservation-fake.js");
      writeFileSync(fakePath, fakeSource, { encoding: "utf8", flag: "wx" });
      fake = await import(`${pathToFileURL(fakePath).href}?${randomUUID()}`);
    }
    let result;
    if (mode === "write-partial-high-water") {
      if (existsSync(root) || store.reserveBuilderReservation(root, syntheticPlan(store)) !== null) {
        throw new Error("TASK227_PARTIAL_WRITER_DID_NOT_CUT");
      }
      result = store.inspectBuilderReservation(root);
    } else if (mode === "write-wrong-receipt") {
      if (existsSync(root)) throw new Error("TASK227_WRONG_RECEIPT_ROOT_PREEXISTED");
      const reserved = store.reserveBuilderReservation(root, syntheticPlan(store));
      const grant = reserved && store.mintBuilderReservationGrant(reserved.handle, reserved.binding);
      const receipt = grant && fake?.invokeBuilderReservationFake(grant, reserved.binding, "accept");
      if (!reserved || !grant || receipt?.status !== "accepted") throw new Error("TASK227_WRONG_RECEIPT_SETUP_FAILED");
      if (store.completeBuilderReservation(reserved.handle, reserved.binding, receipt) !== null) {
        throw new Error("TASK227_WRONG_RECEIPT_WRITER_WAS_ACCEPTED");
      }
      result = store.inspectBuilderReservation(root);
    } else if (mode === "write-wrong-revision-auth") {
      if (existsSync(root)) throw new Error("TASK227_WRONG_AUTH_ROOT_PREEXISTED");
      const reserved = store.reserveBuilderReservation(root, syntheticPlan(store));
      if (!reserved) throw new Error("TASK227_WRONG_AUTH_RESERVE_FAILED");
      const revisionPath = join(
        root,
        "operations",
        reserved.binding.operationId,
        "revisions",
        "00000001.json",
      );
      const revision = JSON.parse(readFileSync(revisionPath, "utf8"));
      revision.authSha256 = "f".repeat(64);
      writeFileSync(revisionPath, JSON.stringify(revision), "utf8");
      result = store.inspectBuilderReservation(root);
    } else if (mode === "exercise-without-single-mint") {
      if (existsSync(root)) throw new Error("TASK227_MINT_MUTANT_ROOT_PREEXISTED");
      const reserved = store.reserveBuilderReservation(root, syntheticPlan(store));
      const first = reserved && store.mintBuilderReservationGrant(reserved.handle, reserved.binding);
      const second = reserved && store.mintBuilderReservationGrant(reserved.handle, reserved.binding);
      result = { first: first !== null, second: second !== null };
    } else if (mode === "exercise-without-path-confinement") {
      const nestedParent = join(claimRoot, "nested");
      mkdirSync(nestedParent, { recursive: false });
      const nestedRoot = join(nestedParent, "store");
      const reserved = store.reserveBuilderReservation(nestedRoot, syntheticPlan(store));
      result = { status: reserved?.projection.status ?? null, nestedRoot: existsSync(nestedRoot) };
    } else if (mode === "exercise-without-exact-keys") {
      if (existsSync(root)) throw new Error("TASK227_EXACT_KEYS_MUTANT_ROOT_PREEXISTED");
      const reserved = store.reserveBuilderReservation(root, { ...syntheticPlan(store), extra: true });
      result = { status: reserved?.projection.status ?? null };
    } else if (mode === "exercise-without-text-bound") {
      if (existsSync(root)) throw new Error("TASK227_TEXT_BOUND_MUTANT_ROOT_PREEXISTED");
      const reserved = store.reserveBuilderReservation(root, {
        ...syntheticPlan(store),
        beforeText: "x".repeat(8_001),
      });
      result = { status: reserved?.projection.status ?? null };
    } else if (mode === "exercise-without-handle-brand") {
      if (existsSync(root)) throw new Error("TASK227_HANDLE_MUTANT_ROOT_PREEXISTED");
      const reserved = store.reserveBuilderReservation(root, syntheticPlan(store));
      const clone = reserved && structuredClone(reserved.handle);
      result = { minted: Boolean(reserved && store.mintBuilderReservationGrant(clone, reserved.binding)) };
    } else if (mode === "exercise-without-grant-brand") {
      if (existsSync(root)) throw new Error("TASK227_GRANT_BRAND_MUTANT_ROOT_PREEXISTED");
      const reserved = store.reserveBuilderReservation(root, syntheticPlan(store));
      const grant = reserved && store.mintBuilderReservationGrant(reserved.handle, reserved.binding);
      const clone = grant && structuredClone(grant);
      result = { status: clone && fake?.invokeBuilderReservationFake(clone, reserved.binding, "accept")?.status };
    } else if (mode === "exercise-without-receipt-brand") {
      if (existsSync(root)) throw new Error("TASK227_RECEIPT_BRAND_MUTANT_ROOT_PREEXISTED");
      const reserved = store.reserveBuilderReservation(root, syntheticPlan(store));
      const grant = reserved && store.mintBuilderReservationGrant(reserved.handle, reserved.binding);
      const receipt = grant && fake?.invokeBuilderReservationFake(grant, reserved.binding, "accept");
      const clone = receipt && structuredClone(receipt);
      result = { status: clone && store.completeBuilderReservation(reserved.handle, reserved.binding, clone)?.status };
    } else if (mode === "exercise-without-grant-spend") {
      if (existsSync(root)) throw new Error("TASK227_GRANT_MUTANT_ROOT_PREEXISTED");
      const reserved = store.reserveBuilderReservation(root, syntheticPlan(store));
      const grant = reserved && store.mintBuilderReservationGrant(reserved.handle, reserved.binding);
      const first = grant && fake?.invokeBuilderReservationFake(grant, reserved.binding, "accept");
      const second = grant && fake?.invokeBuilderReservationFake(grant, reserved.binding, "accept");
      result = { first: first?.status ?? null, second: second?.status ?? null };
    } else if (mode === "exercise-without-consumption-spend") {
      if (existsSync(root)) throw new Error("TASK227_CONSUMPTION_MUTANT_ROOT_PREEXISTED");
      const reserved = store.reserveBuilderReservation(root, syntheticPlan(store));
      const grant = reserved && store.mintBuilderReservationGrant(reserved.handle, reserved.binding);
      const consumed = grant && store.consumeBuilderReservationGrantForFake(grant, reserved.binding);
      const first = consumed && store.composeBuilderReservationFakeReceiptForTest(consumed, "accepted");
      const second = consumed && store.composeBuilderReservationFakeReceiptForTest(consumed, "accepted");
      result = { first: first !== null, second: second !== null };
    } else if (mode === "exercise-with-receipt-spend" || mode === "exercise-without-receipt-spend") {
      if (existsSync(root)) throw new Error("TASK227_RECEIPT_SPEND_MUTANT_ROOT_PREEXISTED");
      const reserved = store.reserveBuilderReservation(root, syntheticPlan(store));
      const grant = reserved && store.mintBuilderReservationGrant(reserved.handle, reserved.binding);
      const receipt = grant && fake?.invokeBuilderReservationFake(grant, reserved.binding, "accept");
      if (!reserved || receipt?.status !== "accepted") throw new Error("TASK227_RECEIPT_SPEND_SETUP_FAILED");
      const first = store.completeBuilderReservation(reserved.handle, reserved.binding, receipt);
      const second = store.completeBuilderReservation(reserved.handle, reserved.binding, receipt);
      result = { first: first?.status ?? null, second: second?.status ?? null };
    } else if (mode === "exercise-without-freshness") {
      if (existsSync(root)) throw new Error("TASK227_FRESHNESS_MUTANT_ROOT_PREEXISTED");
      const reserved = store.reserveBuilderReservation(root, syntheticPlan(store));
      const grant = reserved && store.mintBuilderReservationGrant(reserved.handle, reserved.binding);
      if (!reserved || !grant) throw new Error("TASK227_FRESHNESS_MUTANT_SETUP_FAILED");
      const inventoryPath = join(root, "inventory", "00000001.json");
      const bytes = readFileSync(inventoryPath, "utf8");
      writeFileSync(inventoryPath, bytes.replace(reserved.binding.operationId, "00000000-0000-4000-8000-000000000000"), "utf8");
      result = { status: fake?.invokeBuilderReservationFake(grant, reserved.binding, "accept")?.status ?? null };
    } else {
      result = store.inspectBuilderReservation(root);
    }
    process.stdout.write(JSON.stringify(result));
  } finally {
    const current = lstatSync(codeRoot, { bigint: true });
    if (!current.isDirectory() || current.isSymbolicLink()
      || current.dev !== codeIdentity.dev || current.ino !== codeIdentity.ino
      || realpathSync.native(codeRoot) !== codeRoot
      || readdirSync(codeRoot).some((name) => name !== "builderreservation.js"
        && name !== "builderreservation-fake.js")) {
      throw new Error("TASK227_MUTANT_CODE_CUSTODY_CHANGED");
    }
    rmSync(codeRoot, { recursive: true, force: false });
  }
}

if (!directClaimIsValid()) {
  process.stderr.write("TASK227_MUTANT_ARGUMENTS_INVALID\n");
  process.exitCode = 64;
} else {
  try {
    await runMutant();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 65;
  }
}
