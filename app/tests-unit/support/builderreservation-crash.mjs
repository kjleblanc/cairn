import { createRequire } from "node:module";
import { syncBuiltinESMExports } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const [mode, countText, root] = process.argv.slice(2);
const cutCount = Number(countText);
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const testResults = join(appRoot, "test-results");
const fixtureName = /^task227-[a-z0-9](?:[a-z0-9-]{0,94}[a-z0-9])?$/u;
const storeRoot = resolve(root ?? "");
const claimRoot = dirname(storeRoot);
const modes = new Set([
  "reserve",
  "complete",
  "before-readback",
  "after-stable-readback-reserve",
  "after-stable-readback-complete",
  "after-mint",
  "after-throw",
  "after-fake",
  "after-receipt-spend",
]);
if (!modes.has(mode)
  || !Number.isSafeInteger(cutCount) || cutCount < 0 || cutCount > 14
  || typeof root !== "string" || basename(storeRoot) !== "store"
  || dirname(claimRoot) !== testResults || !fixtureName.test(basename(claimRoot))) {
  process.exit(64);
}

const require = createRequire(import.meta.url);
const fs = require("node:fs");
const originalFsyncSync = fs.fsyncSync;
const originalOpenSync = fs.openSync;
const originalReadFileSync = fs.readFileSync;
const originalCloseSync = fs.closeSync;
let fsyncCount = 0;
let readbackArmed = false;
let stableReadbackCount = 0;
const readDescriptors = new Set();
fs.fsyncSync = function crashAfterSelectedFsync(descriptor) {
  originalFsyncSync(descriptor);
  fsyncCount += 1;
  if (mode === "before-readback" && fsyncCount === 1) readbackArmed = true;
  if (fsyncCount === cutCount) process.exit(77);
};
fs.readFileSync = function crashAtSelectedReadback(...args) {
  if (readbackArmed && mode === "before-readback") process.exit(77);
  return originalReadFileSync(...args);
};
fs.openSync = function crashAfterReceiptSpend(path, ...args) {
  if (mode === "after-receipt-spend"
    && typeof path === "string"
    && /[\\/]revisions[\\/]00000002\.json$/u.test(path)) process.exit(77);
  const descriptor = originalOpenSync(path, ...args);
  const flags = args[0];
  if (typeof flags === "number" && (flags & 3) === fs.constants.O_RDONLY) {
    readDescriptors.add(descriptor);
  }
  return descriptor;
};
fs.closeSync = function crashAfterStableReadback(descriptor) {
  const tracked = readDescriptors.delete(descriptor);
  const result = originalCloseSync(descriptor);
  if (tracked && readbackArmed
    && (mode === "after-stable-readback-reserve" || mode === "after-stable-readback-complete")) {
    stableReadbackCount += 1;
    if (stableReadbackCount === cutCount) process.exit(77);
  }
  return result;
};
syncBuiltinESMExports();

const store = await import(pathToFileURL(join(appRoot, "dist-unit", "src", "main", "builderreservation.js")).href);
const fake = await import(pathToFileURL(join(appRoot, "dist-unit", "tests-unit", "support", "builderreservation-fake.js")).href);
const hash = (character) => character.repeat(64);
const plan = Object.freeze({
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

if (mode === "after-stable-readback-reserve") readbackArmed = true;
const reserved = store.reserveBuilderReservation(root, plan);
if (reserved === null) process.exit(65);
if (mode === "after-mint") {
  const grant = store.mintBuilderReservationGrant(reserved.handle, reserved.binding);
  if (grant === null) process.exit(66);
  process.exit(77);
}
if (mode === "after-throw") {
  const grant = store.mintBuilderReservationGrant(reserved.handle, reserved.binding);
  if (grant === null) process.exit(66);
  try {
    fake.invokeBuilderReservationFake(grant, reserved.binding, "throw");
  } catch (error) {
    if (error instanceof Error && error.message === "BUILDER_RESERVATION_FAKE_THROW") process.exit(77);
  }
  process.exit(69);
}
if (mode === "complete" || mode === "after-fake" || mode === "after-receipt-spend"
  || mode === "after-stable-readback-complete") {
  const grant = store.mintBuilderReservationGrant(reserved.handle, reserved.binding);
  if (grant === null) process.exit(66);
  const receipt = fake.invokeBuilderReservationFake(grant, reserved.binding, "accept");
  if (receipt.status !== "accepted") process.exit(67);
  if (mode === "after-fake") process.exit(77);
  if (mode === "after-stable-readback-complete") {
    readbackArmed = true;
    stableReadbackCount = 0;
  }
  const complete = store.completeBuilderReservation(reserved.handle, reserved.binding, receipt);
  if (complete?.status !== "complete") process.exit(68);
}
process.exit(0);
