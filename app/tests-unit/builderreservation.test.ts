import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import {
  closeSync,
  constants,
  cpSync,
  existsSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  BUILDER_RESERVATION_PLAN_VERSION,
  completeBuilderReservation,
  inspectBuilderReservation,
  mintBuilderReservationGrant,
  reserveBuilderReservation,
} from "../src/main/builderreservation.js";
import {
  BUILDER_RESERVATION_FAKE_HANDLER_REVISION,
  invokeBuilderReservationFake,
} from "./support/builderreservation-fake.js";

const APP_ROOT = resolve(process.cwd());
const TEST_RESULTS = join(APP_ROOT, "test-results");

type FileIdentity = Readonly<{ dev: bigint; ino: bigint; nlink: bigint }>;
type FixtureClaim = {
  claimRoot: string;
  root: string;
  marker: string;
  markerBytes: Buffer;
  markerIdentity: FileIdentity;
  testResultsIdentity: FileIdentity;
  claimIdentity: FileIdentity;
  rootIdentity: FileIdentity | null;
  transferred: boolean;
};

const fixtureClaims = new Map<string, FixtureClaim>();

function identity(path: string, expected: "file" | "directory"): FileIdentity | null {
  try {
    const stat = lstatSync(path, { bigint: true });
    if (stat.isSymbolicLink() || (expected === "file" ? !stat.isFile() : !stat.isDirectory())) return null;
    return Object.freeze({ dev: stat.dev, ino: stat.ino, nlink: stat.nlink });
  } catch {
    return null;
  }
}

function sameIdentity(left: FileIdentity | null, right: FileIdentity | null): boolean {
  return left !== null && right !== null && left.dev === right.dev && left.ino === right.ino && left.nlink === right.nlink;
}

function sameDirectoryIdentity(left: FileIdentity | null, right: FileIdentity | null): boolean {
  return left !== null && right !== null && left.dev === right.dev && left.ino === right.ino;
}

function createFixtureClaim(label: string): FixtureClaim {
  assert.match(label, /^[a-z0-9-]+$/u);
  mkdirSync(TEST_RESULTS, { recursive: true });
  const canonicalParent = realpathSync.native(TEST_RESULTS);
  assert.equal(canonicalParent, resolve(TEST_RESULTS));
  const testResultsIdentity = identity(canonicalParent, "directory");
  assert.ok(testResultsIdentity);
  const id = randomUUID();
  const claimRoot = join(canonicalParent, `task227-${label}-${id}`);
  mkdirSync(claimRoot, { recursive: false, mode: 0o700 });
  const claimIdentity = identity(claimRoot, "directory");
  assert.ok(claimIdentity);
  assert.equal(realpathSync.native(claimRoot), claimRoot);
  const root = join(claimRoot, "store");
  const marker = join(claimRoot, "owner.json");
  const markerBytes = Buffer.from(JSON.stringify({
    version: "cairn-task227-test-owner/v1",
    nonce: randomBytes(32).toString("hex"),
    root,
  }), "utf8");
  let descriptor: number | null = null;
  try {
    descriptor = openSync(
      marker,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | (constants.O_NOFOLLOW ?? 0),
      0o600,
    );
    writeFileSync(descriptor, markerBytes);
    fsyncSync(descriptor);
    const opened = fstatSync(descriptor, { bigint: true });
    assert.equal(opened.isFile(), true);
    assert.equal(opened.nlink, 1n);
    assert.equal(opened.size, BigInt(markerBytes.byteLength));
    closeSync(descriptor);
    descriptor = null;
    const markerIdentity = identity(marker, "file");
    assert.ok(markerIdentity);
    assert.equal(markerIdentity.nlink, 1n);
    assert.equal(readFileSync(marker).equals(markerBytes), true);
    if (existsSync(root)) throw new Error(`TASK227_FIXTURE_ROOT_PREEXISTED: ${root}`);
    const claim: FixtureClaim = {
      claimRoot,
      root,
      marker,
      markerBytes,
      markerIdentity,
      testResultsIdentity,
      claimIdentity,
      rootIdentity: null,
      transferred: false,
    };
    fixtureClaims.set(root, claim);
    return claim;
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
}

function markFixtureCreated(root: string): void {
  const claim = fixtureClaims.get(resolve(root));
  assert.ok(claim, `missing fixture claim for ${root}`);
  assert.equal(claim.rootIdentity, null, `fixture already marked created: ${root}`);
  assert.equal(realpathSync.native(root), resolve(root));
  const rootIdentity = identity(root, "directory");
  assert.ok(rootIdentity, `fixture root was not a direct directory: ${root}`);
  claim.rootIdentity = rootIdentity;
}

function reserveAt(root: string, value: unknown): ReturnType<typeof reserveBuilderReservation> {
  const reserved = reserveBuilderReservation(root, value);
  if (reserved !== null) markFixtureCreated(root);
  return reserved;
}

function copyOwnedFixture(source: string, destination: string): void {
  assert.ok(fixtureClaims.get(source)?.rootIdentity);
  assert.equal(fixtureClaims.get(destination)?.rootIdentity, null);
  cpSync(source, destination, { recursive: true, errorOnExist: true });
  markFixtureCreated(destination);
}

function moveOwnedFixture(source: string, destination: string): void {
  const sourceClaim = fixtureClaims.get(source);
  assert.ok(sourceClaim?.rootIdentity);
  assert.equal(fixtureClaims.get(destination)?.rootIdentity, null);
  assert.equal(sameIdentity(sourceClaim.rootIdentity, identity(source, "directory")), true);
  renameSync(source, destination);
  sourceClaim.rootIdentity = null;
  sourceClaim.transferred = true;
  markFixtureCreated(destination);
}

function cleanupFixtureClaim(claim: FixtureClaim): void {
  const parent = realpathSync.native(TEST_RESULTS);
  if (parent !== resolve(TEST_RESULTS) || !sameDirectoryIdentity(claim.testResultsIdentity, identity(parent, "directory"))) {
    throw new Error(`TASK227_FIXTURE_PARENT_CHANGED: ${claim.root}`);
  }
  if (realpathSync.native(claim.claimRoot) !== claim.claimRoot
    || !sameDirectoryIdentity(claim.claimIdentity, identity(claim.claimRoot, "directory"))) {
    throw new Error(`TASK227_FIXTURE_CLAIM_CHANGED: ${claim.claimRoot}`);
  }
  if (!sameIdentity(claim.markerIdentity, identity(claim.marker, "file"))
    || !readFileSync(claim.marker).equals(claim.markerBytes)) {
    throw new Error(`TASK227_FIXTURE_MARKER_CHANGED: ${claim.marker}`);
  }
  if (claim.rootIdentity !== null) {
    if (realpathSync.native(claim.root) !== claim.root
      || !sameIdentity(claim.rootIdentity, identity(claim.root, "directory"))) {
      throw new Error(`TASK227_FIXTURE_ROOT_CHANGED: ${claim.root}`);
    }
    rmSync(claim.root, { recursive: true, force: false });
    if (existsSync(claim.root)) throw new Error(`TASK227_FIXTURE_ROOT_REMAINS: ${claim.root}`);
  } else if (existsSync(claim.root)) {
    throw new Error(`TASK227_UNOWNED_FIXTURE_ROOT_REMAINS: ${claim.root}`);
  } else if (claim.transferred) {
    // The exact root identity was deliberately transferred to another claimed
    // fixture path. Only the source's unchanged claim/marker remains here.
  }
  if (!sameIdentity(claim.markerIdentity, identity(claim.marker, "file"))
    || !readFileSync(claim.marker).equals(claim.markerBytes)) {
    throw new Error(`TASK227_FIXTURE_MARKER_CHANGED_BEFORE_UNLINK: ${claim.marker}`);
  }
  rmSync(claim.claimRoot, { recursive: true, force: false });
  if (existsSync(claim.claimRoot)) throw new Error(`TASK227_FIXTURE_CLAIM_REMAINS: ${claim.claimRoot}`);
  fixtureClaims.delete(claim.root);
}

function sha(character: string): string {
  return character.repeat(64);
}

function plan(overrides: Record<string, unknown> = {}) {
  return {
    version: BUILDER_RESERVATION_PLAN_VERSION,
    projectHash: sha("1"),
    taskSpecSha256: sha("2"),
    evidencePlanSha256: sha("3"),
    consentSha256: sha("4"),
    contextSha256: sha("5"),
    responseSha256: sha("6"),
    selectionSha256: sha("7"),
    beforeText: "synthetic before\n",
    afterText: "synthetic after\n",
    ...overrides,
  };
}

function withFixture(label: string, run: (root: string) => void): void {
  const claim = createFixtureClaim(label);
  try {
    run(claim.root);
  } finally {
    cleanupFixtureClaim(claim);
  }
}

function coldInspect(root: string): ReturnType<typeof inspectBuilderReservation> {
  const compiledModule = join(APP_ROOT, "dist-unit", "src", "main", "builderreservation.js");
  const script = [
    "const { pathToFileURL } = await import('node:url');",
    "const module = await import(pathToFileURL(process.argv[1]).href);",
    "process.stdout.write(JSON.stringify(module.inspectBuilderReservation(process.argv[2])));",
  ].join("\n");
  const child = spawnSync(process.execPath, ["--input-type=module", "--eval", script, compiledModule, root], {
    cwd: APP_ROOT,
    encoding: "utf8",
  });
  assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout) as ReturnType<typeof inspectBuilderReservation>;
}

function coldAuthorityAttempt(root: string): Readonly<{
  mint: boolean;
  consume: boolean;
  receipt: boolean;
  complete: boolean;
}> {
  const compiledModule = join(APP_ROOT, "dist-unit", "src", "main", "builderreservation.js");
  const script = [
    "const { pathToFileURL } = await import('node:url');",
    "const store = await import(pathToFileURL(process.argv[1]).href);",
    "const p = store.inspectBuilderReservation(process.argv[2]);",
    "const binding = { operationId:p.operationId, reservationSha256:p.reservationSha256, projectHash:p.projectHash, revision:p.revision, handlerRevision:p.handlerRevision, planSha256:p.planSha256 };",
    "const result = { mint: store.mintBuilderReservationGrant({}, binding) !== null, consume: store.consumeBuilderReservationGrantForFake({}, binding) !== null, receipt: store.composeBuilderReservationFakeReceiptForTest({}, 'accepted') !== null, complete: store.completeBuilderReservation({}, binding, {}) !== null };",
    "process.stdout.write(JSON.stringify(result));",
  ].join("\n");
  const child = spawnSync(process.execPath, ["--input-type=module", "--eval", script, compiledModule, root], {
    cwd: APP_ROOT,
    encoding: "utf8",
  });
  assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout) as Readonly<{ mint: boolean; consume: boolean; receipt: boolean; complete: boolean }>;
}

function operationRevision(root: string, operationId: string, revision: 1 | 2): string {
  return join(root, "operations", operationId, "revisions", `0000000${revision}.json`);
}

type CrashMode =
  | "reserve"
  | "complete"
  | "before-readback"
  | "after-stable-readback-reserve"
  | "after-stable-readback-complete"
  | "after-mint"
  | "after-throw"
  | "after-fake"
  | "after-receipt-spend";

type MutantMode =
  | "write-partial-high-water"
  | "inspect-without-partial-high-water"
  | "write-wrong-receipt"
  | "inspect-without-receipt-digest"
  | "write-wrong-revision-auth"
  | "inspect-without-revision-auth"
  | "inspect-without-root-identity"
  | "inspect-without-canonical-revision"
  | "inspect-without-stable-nlink"
  | "exercise-without-path-confinement"
  | "exercise-without-exact-keys"
  | "exercise-without-text-bound"
  | "exercise-without-handle-brand"
  | "exercise-without-grant-brand"
  | "exercise-without-receipt-brand"
  | "exercise-without-single-mint"
  | "exercise-without-grant-spend"
  | "exercise-without-consumption-spend"
  | "exercise-with-receipt-spend"
  | "exercise-without-receipt-spend"
  | "exercise-without-freshness";

function crashAt(root: string, mode: CrashMode, cutCount: number): void {
  const child = spawnSync(process.execPath, [
    join(APP_ROOT, "tests-unit", "support", "builderreservation-crash.mjs"),
    mode,
    String(cutCount),
    root,
  ], { cwd: APP_ROOT, encoding: "utf8" });
  assert.equal(child.status, 77, `stdout=${child.stdout}\nstderr=${child.stderr}`);
  markFixtureCreated(root);
}

function runMutant(root: string, mode: MutantMode, createsRoot = false): unknown {
  const child = spawnSync(process.execPath, [
    join(APP_ROOT, "tests-unit", "support", "builderreservation-mutant.mjs"),
    mode,
    root,
  ], { cwd: APP_ROOT, encoding: "utf8" });
  assert.equal(child.status, 0, `mode=${mode}\nstdout=${child.stdout}\nstderr=${child.stderr}`);
  if (createsRoot) markFixtureCreated(root);
  return JSON.parse(child.stdout) as unknown;
}

test("reserve writes only the canonical Task-227 fixture and re-reads as reserved", () => {
  withFixture("happy", (root) => {
    const reserved = reserveAt(root, plan());
    assert.ok(reserved);
    assert.equal(reserved.projection.status, "reserved");
    assert.equal(reserved.binding.handlerRevision, BUILDER_RESERVATION_FAKE_HANDLER_REVISION);
    assert.equal(inspectBuilderReservation(root).status, "reserved");

    const grant = mintBuilderReservationGrant(reserved.handle, reserved.binding);
    assert.ok(grant);
    const receipt = invokeBuilderReservationFake(grant, reserved.binding, "accept");
    assert.equal(receipt.status, "accepted");
    assert.deepEqual(invokeBuilderReservationFake(grant, reserved.binding, "accept"), {
      status: "not-consumed",
      code: "BUILDER_RESERVATION_GRANT_INVALID",
    });
  });
});

test("plain handles, bindings, grants and receipt clones never carry authority", () => {
  withFixture("clones", (root) => {
    const reserved = reserveAt(root, plan());
    assert.ok(reserved);
    assert.equal(mintBuilderReservationGrant(structuredClone(reserved.handle), reserved.binding), null);
    assert.equal(mintBuilderReservationGrant(reserved.handle, { ...reserved.binding, projectHash: sha("a") }), null);
    const grant = mintBuilderReservationGrant(reserved.handle, structuredClone(reserved.binding));
    assert.ok(grant, "inert binding data may identify the current opaque handle");
    assert.deepEqual(invokeBuilderReservationFake(structuredClone(grant), reserved.binding, "accept"), {
      status: "not-consumed",
      code: "BUILDER_RESERVATION_GRANT_INVALID",
    });
    const receipt = invokeBuilderReservationFake(grant, reserved.binding, "refuse");
    assert.equal(receipt.status, "refused");
    assert.equal(inspectBuilderReservation(root).status, "reserved", "a receipt is evidence until the store closes it");
    assert.deepEqual(JSON.parse(JSON.stringify(receipt)), receipt);
  });
});

test("only the live fake receipt completes revision two once", () => {
  withFixture("complete", (root) => {
    const reserved = reserveAt(root, plan());
    assert.ok(reserved);
    const grant = mintBuilderReservationGrant(reserved.handle, reserved.binding);
    assert.ok(grant);
    const receipt = invokeBuilderReservationFake(grant, reserved.binding, "accept");
    assert.equal(receipt.status, "accepted");

    assert.equal(
      completeBuilderReservation(reserved.handle, reserved.binding, structuredClone(receipt)),
      null,
      "a structural clone cannot close and must not spend the live receipt",
    );
    assert.equal(
      completeBuilderReservation(reserved.handle, reserved.binding, JSON.parse(JSON.stringify(receipt))),
      null,
      "serialized receipt bytes cannot close",
    );
    const completed = completeBuilderReservation(reserved.handle, reserved.binding, receipt);
    assert.ok(completed);
    assert.equal(completed.status, "complete");
    assert.equal(completed.revision, 2);
    assert.equal(inspectBuilderReservation(root).status, "complete");
    assert.equal(completeBuilderReservation(reserved.handle, reserved.binding, receipt), null);
    assert.equal(mintBuilderReservationGrant(reserved.handle, reserved.binding), null);
  });
});

test("one current reservation mints only one exact grant", () => {
  withFixture("single-mint", (root) => {
    const reserved = reserveAt(root, plan());
    assert.ok(reserved);
    assert.ok(mintBuilderReservationGrant(reserved.handle, reserved.binding));
    assert.equal(mintBuilderReservationGrant(reserved.handle, reserved.binding), null);
  });
});

test("cold restart projects reserved and complete evidence without authority", () => {
  withFixture("cold", (root) => {
    const reserved = reserveAt(root, plan());
    assert.ok(reserved);
    const coldReserved = coldInspect(root);
    assert.equal(coldReserved.status, "reserved");
    assert.equal(coldReserved.authorityAvailable, false);
    assert.equal(coldReserved.powerLossDurability, "unproved");
    assert.deepEqual(coldAuthorityAttempt(root), {
      mint: false,
      consume: false,
      receipt: false,
      complete: false,
    });
    const grant = mintBuilderReservationGrant(reserved.handle, reserved.binding);
    assert.ok(grant);
    const receipt = invokeBuilderReservationFake(grant, reserved.binding, "refuse");
    assert.equal(receipt.status, "refused");
    assert.equal(completeBuilderReservation(reserved.handle, reserved.binding, receipt)?.status, "complete");
    const coldComplete = coldInspect(root);
    assert.equal(coldComplete.status, "complete");
    assert.equal(coldComplete.authorityAvailable, false);
    assert.equal(coldComplete.processCrashReadback, "exact-stable-readback");
    assert.equal(coldComplete.fileFsyncCompletionAfterCrash, "not-provable");
    assert.equal(coldComplete.powerLossDurability, "unproved");
    assert.deepEqual(coldAuthorityAttempt(root), {
      mint: false,
      consume: false,
      receipt: false,
      complete: false,
    });
  });
});

test("invalid behavior and hostile proxy/getter binding refuse without spending", () => {
  withFixture("hostile", (root) => {
    const reserved = reserveAt(root, plan());
    assert.ok(reserved);
    const grant = mintBuilderReservationGrant(reserved.handle, reserved.binding);
    assert.ok(grant);
    let reads = 0;
    const getter = Object.defineProperty({}, "handlerRevision", { enumerable: true, get() { reads += 1; return BUILDER_RESERVATION_FAKE_HANDLER_REVISION; } });
    assert.deepEqual(invokeBuilderReservationFake(grant, getter, "accept"), {
      status: "not-consumed", code: "BUILDER_RESERVATION_GRANT_INVALID",
    });
    assert.equal(reads, 0);
    const proxy = new Proxy(reserved.binding, { get() { throw new Error("must not execute"); } });
    assert.deepEqual(invokeBuilderReservationFake(grant, proxy, "accept"), {
      status: "not-consumed", code: "BUILDER_RESERVATION_GRANT_INVALID",
    });
    assert.deepEqual(invokeBuilderReservationFake(grant, reserved.binding, "invalid" as never), {
      status: "not-consumed", code: "BUILDER_RESERVATION_FAKE_BEHAVIOR_INVALID",
    });
    assert.equal(invokeBuilderReservationFake(grant, reserved.binding, "accept").status, "accepted");
  });
});

test("refusal and throw spend the exact grant before returning", () => {
  for (const behavior of ["refuse", "throw"] as const) {
    withFixture(`spend-${behavior}`, (root) => {
      const reserved = reserveAt(root, plan());
      assert.ok(reserved);
      const grant = mintBuilderReservationGrant(reserved.handle, reserved.binding);
      assert.ok(grant);
      if (behavior === "throw") {
        assert.throws(() => invokeBuilderReservationFake(grant, reserved.binding, behavior), /BUILDER_RESERVATION_FAKE_THROW/u);
      } else {
        assert.equal(invokeBuilderReservationFake(grant, reserved.binding, behavior).status, "refused");
      }
      assert.deepEqual(invokeBuilderReservationFake(grant, reserved.binding, "accept"), {
        status: "not-consumed", code: "BUILDER_RESERVATION_GRANT_INVALID",
      });
    });
  }
});

test("strict plan schema and bounds refuse before creating custody", () => {
  const invalid = [
    plan({ extra: true }),
    plan({ projectHash: "A".repeat(64) }),
    plan({ beforeText: "x".repeat(8_001) }),
    plan({ afterText: "unsafe\u0000text" }),
    Object.defineProperty(plan(), "beforeText", { enumerable: true, get() { throw new Error("must not execute"); } }),
    new Proxy(plan(), { ownKeys() { throw new Error("must not execute"); } }),
  ];
  invalid.forEach((value, index) => withFixture(`invalid-${index}`, (root) => {
    assert.equal(reserveAt(root, value), null);
    assert.equal(inspectBuilderReservation(root).status, "absent");
  }));
  withFixture("exact-bounds", (root) => {
    assert.ok(reserveAt(root, plan({ beforeText: "b".repeat(8_000), afterText: "a".repeat(8_000) })));
  });
});

test("tampered key, revision, and extra artifacts classify recovery-required", () => {
  for (const target of ["key", "revision", "extra"] as const) {
    withFixture(`tamper-${target}`, (root) => {
      const reserved = reserveAt(root, plan());
      assert.ok(reserved);
      if (target === "key") {
        writeFileSync(join(root, ".cairn-builder-reservation-key-v1"), Buffer.alloc(32, 9));
      } else if (target === "revision") {
        const revision = join(root, "operations", reserved.binding.operationId, "revisions", "00000001.json");
        const bytes = readFileSync(revision, "utf8");
        writeFileSync(revision, bytes.replace("synthetic before", "tampered before"), "utf8");
      } else {
        writeFileSync(join(root, "unexpected.json"), "{}", "utf8");
      }
      assert.equal(inspectBuilderReservation(root).status, "recovery-required");
      assert.equal(mintBuilderReservationGrant(reserved.handle, reserved.binding), null);
    });
  }
});

test("high-water, inventory, anchor, and linked custody corruption fail closed", () => {
  for (const target of ["high-water", "inventory", "anchors", "hard-link"] as const) {
    withFixture(`chain-${target}`, (root) => {
      const reserved = reserveAt(root, plan());
      assert.ok(reserved);
      if (target === "hard-link") {
        const original = operationRevision(root, reserved.binding.operationId, 1);
        linkSync(original, operationRevision(root, reserved.binding.operationId, 2));
      } else {
        const path = join(root, target, "00000001.json");
        const bytes = readFileSync(path, "utf8");
        writeFileSync(path, bytes.replace(reserved.binding.operationId, "00000000-0000-4000-8000-000000000000"), "utf8");
      }
      assert.equal(inspectBuilderReservation(root).status, "recovery-required");
      assert.equal(mintBuilderReservationGrant(reserved.handle, reserved.binding), null);
    });
  }
});

test("canonical bytes, truncation, policy revision, and partial-chain joins fail closed", () => {
  for (const target of ["canonical", "truncated", "policy", "partial-join"] as const) {
    withFixture(`canonical-${target}`, (root) => {
      const reserved = reserveAt(root, plan());
      assert.ok(reserved);
      const revision = operationRevision(root, reserved.binding.operationId, 1);
      if (target === "canonical") {
        const parsed = JSON.parse(readFileSync(revision, "utf8")) as Record<string, unknown>;
        writeFileSync(revision, JSON.stringify({ authSha256: parsed.authSha256, ...parsed }), "utf8");
      } else if (target === "truncated") {
        const bytes = readFileSync(revision);
        writeFileSync(revision, bytes.subarray(0, Math.max(1, bytes.byteLength - 17)));
      } else if (target === "policy") {
        const bytes = readFileSync(revision, "utf8");
        writeFileSync(revision, bytes.replace("cairn-builder-reservation-policy/v1", "cairn-builder-reservation-policy/v2"), "utf8");
      } else {
        const anchor = join(root, "anchors", "00000001.json");
        rmSync(anchor);
        const highWater = join(root, "high-water", "00000001.json");
        const bytes = readFileSync(highWater, "utf8");
        writeFileSync(highWater, bytes.replace(reserved.binding.reservationSha256, sha("f")), "utf8");
      }
      assert.equal(inspectBuilderReservation(root).status, "recovery-required");
      assert.equal(mintBuilderReservationGrant(reserved.handle, reserved.binding), null);
    });
  }
});

test("causal writer and reader mutants expose every critical guard family", () => {
  withFixture("mutant-partial", (root) => {
    assert.equal(
      (runMutant(root, "write-partial-high-water", true) as { status: string }).status,
      "recovery-required",
    );
    assert.equal(inspectBuilderReservation(root).status, "recovery-required");
    assert.equal(
      (runMutant(root, "inspect-without-partial-high-water") as { status: string }).status,
      "interrupted",
      "removing the authenticated partial-prefix join admits the same bad prefix",
    );
  });

  withFixture("mutant-receipt", (root) => {
    assert.equal(
      (runMutant(root, "write-wrong-receipt", true) as { status: string }).status,
      "recovery-required",
    );
    assert.equal(inspectBuilderReservation(root).status, "recovery-required");
    assert.equal(
      (runMutant(root, "inspect-without-receipt-digest") as { status: string }).status,
      "complete",
      "removing deterministic receipt recomputation admits a signed wrong receipt",
    );
  });

  withFixture("mutant-auth", (root) => {
    assert.equal(
      (runMutant(root, "write-wrong-revision-auth", true) as { status: string }).status,
      "recovery-required",
    );
    assert.equal(inspectBuilderReservation(root).status, "recovery-required");
    assert.equal(
      (runMutant(root, "inspect-without-revision-auth") as { status: string }).status,
      "reserved",
      "removing revision HMAC verification admits the same forged revision",
    );
  });

  withFixture("mutant-canonical", (root) => {
    const reserved = reserveAt(root, plan());
    assert.ok(reserved);
    const revision = operationRevision(root, reserved.binding.operationId, 1);
    const parsed = JSON.parse(readFileSync(revision, "utf8")) as Record<string, unknown>;
    writeFileSync(revision, JSON.stringify({ authSha256: parsed.authSha256, ...parsed }), "utf8");
    assert.equal(inspectBuilderReservation(root).status, "recovery-required");
    assert.equal(
      (runMutant(root, "inspect-without-canonical-revision") as { status: string }).status,
      "reserved",
      "removing canonical-byte equality admits reordered authenticated bytes",
    );
  });

  withFixture("mutant-stable-link", (root) => {
    const reserved = reserveAt(root, plan());
    assert.ok(reserved);
    const link = join(resolve(root, ".."), "linked-revision.json");
    linkSync(operationRevision(root, reserved.binding.operationId, 1), link);
    assert.equal(inspectBuilderReservation(root).status, "recovery-required");
    assert.equal(
      (runMutant(root, "inspect-without-stable-nlink") as { status: string }).status,
      "reserved",
      "removing stable-read link-count custody admits a linked record",
    );
  });

  withFixture("mutant-confinement", (root) => {
    const nestedParent = join(resolve(root, ".."), "nested");
    const nestedRoot = join(nestedParent, "store");
    mkdirSync(nestedParent, { recursive: false });
    assert.equal(reserveBuilderReservation(nestedRoot, plan()), null);
    assert.deepEqual(readdirSync(nestedParent), []);
    rmSync(nestedParent, { recursive: true, force: false });
    assert.deepEqual(runMutant(root, "exercise-without-path-confinement"), {
      status: "reserved",
      nestedRoot: true,
    });
  });

  withFixture("mutant-exact-keys", (root) => {
    assert.deepEqual(runMutant(root, "exercise-without-exact-keys", true), { status: "reserved" });
  });

  withFixture("mutant-text-bound", (root) => {
    assert.deepEqual(runMutant(root, "exercise-without-text-bound", true), { status: "reserved" });
  });

  withFixture("mutant-handle-brand", (root) => {
    assert.deepEqual(runMutant(root, "exercise-without-handle-brand", true), { minted: true });
  });

  withFixture("mutant-grant-brand", (root) => {
    assert.deepEqual(runMutant(root, "exercise-without-grant-brand", true), { status: "accepted" });
  });

  withFixture("mutant-receipt-brand", (root) => {
    assert.deepEqual(runMutant(root, "exercise-without-receipt-brand", true), { status: "complete" });
  });

  withFixture("mutant-root-source", (source) => withFixture("mutant-root-copy", (copy) => {
    assert.ok(reserveAt(source, plan()));
    copyOwnedFixture(source, copy);
    assert.equal(inspectBuilderReservation(copy).status, "recovery-required");
    assert.equal(
      (runMutant(copy, "inspect-without-root-identity") as { status: string }).status,
      "reserved",
      "removing canonical root identity admits a coherent copied store",
    );
  }));

  withFixture("mutant-spend", (root) => {
    assert.deepEqual(runMutant(root, "exercise-without-grant-spend", true), {
      first: "accepted",
      second: "accepted",
    });
  });

  withFixture("mutant-mint", (root) => {
    assert.deepEqual(runMutant(root, "exercise-without-single-mint", true), {
      first: true,
      second: true,
    });
  });

  withFixture("mutant-consumption-spend", (root) => {
    assert.deepEqual(runMutant(root, "exercise-without-consumption-spend", true), {
      first: true,
      second: true,
    });
  });

  withFixture("mutant-receipt-spend", (root) => {
    assert.deepEqual(runMutant(root, "exercise-with-receipt-spend", true), {
      first: null,
      second: null,
    });
  });

  withFixture("mutant-no-receipt-spend", (root) => {
    assert.deepEqual(runMutant(root, "exercise-without-receipt-spend", true), {
      first: null,
      second: "complete",
    });
  });

  withFixture("mutant-freshness", (root) => {
    assert.deepEqual(runMutant(root, "exercise-without-freshness", true), { status: "accepted" });
  });
});

test("a genuine grant becomes inert when current custody changes", () => {
  withFixture("stale-grant", (root) => {
    const reserved = reserveAt(root, plan());
    assert.ok(reserved);
    const grant = mintBuilderReservationGrant(reserved.handle, reserved.binding);
    assert.ok(grant);
    const inventory = join(root, "inventory", "00000001.json");
    const bytes = readFileSync(inventory, "utf8");
    writeFileSync(inventory, bytes.replace(reserved.binding.operationId, "00000000-0000-4000-8000-000000000000"), "utf8");
    assert.equal(inspectBuilderReservation(root).status, "recovery-required");
    assert.deepEqual(invokeBuilderReservationFake(grant, reserved.binding, "accept"), {
      status: "not-consumed", code: "BUILDER_RESERVATION_GRANT_INVALID",
    });
  });
});

test("deleted revision-two monotonic evidence is rollback, not an older reservation", () => {
  for (const target of ["high-water", "inventory", "anchors"] as const) {
    withFixture(`rollback-${target}`, (root) => {
      const reserved = reserveAt(root, plan());
      assert.ok(reserved);
      const grant = mintBuilderReservationGrant(reserved.handle, reserved.binding);
      assert.ok(grant);
      const receipt = invokeBuilderReservationFake(grant, reserved.binding, "accept");
      assert.equal(receipt.status, "accepted");
      assert.equal(completeBuilderReservation(reserved.handle, reserved.binding, receipt)?.status, "complete");
      rmSync(join(root, target, "00000002.json"));
      assert.equal(inspectBuilderReservation(root).status, "recovery-required");
    });
  }
});

test("real child-process reserve cuts classify only exact fsynced prefixes", () => {
  const expected = new Map<number, "interrupted" | "reserved">([
    [1, "interrupted"],
    [2, "interrupted"],
    [3, "interrupted"],
    [4, "interrupted"],
    [5, "reserved"],
  ]);
  for (const [fsyncCount, status] of expected) {
    withFixture(`reserve-cut-${fsyncCount}`, (root) => {
      crashAt(root, "reserve", fsyncCount);
      assert.equal(inspectBuilderReservation(root).status, status);
      assert.equal(coldInspect(root).status, status);
    });
  }
});

test("real child-process completion cuts classify without resuming or retrying", () => {
  const expected = new Map<number, "recovery-required" | "complete">([
    [6, "recovery-required"],
    [7, "recovery-required"],
    [8, "recovery-required"],
    [9, "complete"],
  ]);
  for (const [fsyncCount, status] of expected) {
    withFixture(`complete-cut-${fsyncCount}`, (root) => {
      crashAt(root, "complete", fsyncCount);
      assert.equal(inspectBuilderReservation(root).status, status);
      assert.equal(coldInspect(root).status, status);
    });
  }
});

test("real child-process cuts cover before and after stable record readback", () => {
  withFixture("before-readback", (root) => {
    crashAt(root, "before-readback", 0);
    assert.equal(coldInspect(root).status, "interrupted");
  });

  const reserveExpected = new Map<number, "interrupted" | "reserved">([
    [1, "interrupted"],
    [2, "interrupted"],
    [3, "interrupted"],
    [4, "interrupted"],
    [5, "reserved"],
  ]);
  for (const [readbackCount, status] of reserveExpected) {
    withFixture(`reserve-readback-${readbackCount}`, (root) => {
      crashAt(root, "after-stable-readback-reserve", readbackCount);
      assert.equal(coldInspect(root).status, status);
    });
  }

  const completeExpected = new Map<number, "recovery-required" | "complete">([
    [11, "recovery-required"],
    [12, "recovery-required"],
    [13, "recovery-required"],
    [14, "complete"],
  ]);
  for (const [readbackCount, status] of completeExpected) {
    withFixture(`complete-readback-${readbackCount}`, (root) => {
      crashAt(root, "after-stable-readback-complete", readbackCount);
      assert.equal(coldInspect(root).status, status);
    });
  }
});

test("cold cuts after mint, spend, fake receipt, and receipt spend expose no restart authority", () => {
  for (const mode of ["after-mint", "after-throw", "after-fake", "after-receipt-spend"] as const) {
    withFixture(`attempt-cut-${mode}`, (root) => {
      crashAt(root, mode, 0);
      const cold = coldInspect(root);
      assert.equal(cold.status, "reserved");
      assert.equal(cold.authorityAvailable, false);
      assert.equal(cold.fileFsyncCompletionAfterCrash, "not-provable");
    });
  }
});

test("copying or moving a coherent whole root cannot replay its custody identity", () => {
  for (const action of ["copy", "move"] as const) {
    withFixture(`root-${action}-source`, (source) => withFixture(`root-${action}-destination`, (destination) => {
      const reserved = reserveAt(source, plan());
      assert.ok(reserved);
      if (action === "copy") copyOwnedFixture(source, destination);
      else moveOwnedFixture(source, destination);
      assert.equal(inspectBuilderReservation(destination).status, "recovery-required");
      assert.equal(coldInspect(destination).status, "recovery-required");
      if (action === "move") assert.equal(mintBuilderReservationGrant(reserved.handle, reserved.binding), null);
    }));
  }
});

test("one operation cannot cross roots, plans, or current bindings", () => {
  withFixture("cross-a", (rootA) => withFixture("cross-b", (rootB) => {
    const a = reserveAt(rootA, plan());
    const b = reserveAt(rootB, plan({ projectHash: sha("8") }));
    assert.ok(a);
    assert.ok(b);
    const grant = mintBuilderReservationGrant(a.handle, a.binding);
    assert.ok(grant);
    assert.deepEqual(invokeBuilderReservationFake(grant, b.binding, "accept"), {
      status: "not-consumed", code: "BUILDER_RESERVATION_GRANT_INVALID",
    });
    assert.equal(invokeBuilderReservationFake(grant, a.binding, "accept").status, "accepted");
    assert.equal(mintBuilderReservationGrant(a.handle, b.binding), null);
  }));
});

test("path confinement and preexisting sentinels remain untouched", () => {
  withFixture("sentinel", (root) => {
    const sentinel = join(resolve(root, ".."), "sentinel.txt");
    const sentinelBytes = Buffer.from(randomBytes(32));
    let sentinelIdentity: FileIdentity | null = null;
    let descriptor: number | null = null;
    try {
      descriptor = openSync(
        sentinel,
        constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | (constants.O_NOFOLLOW ?? 0),
        0o600,
      );
      writeFileSync(descriptor, sentinelBytes);
      closeSync(descriptor);
      descriptor = null;
      sentinelIdentity = identity(sentinel, "file");
      assert.ok(sentinelIdentity);
      assert.equal(sentinelIdentity.nlink, 1n);
      assert.equal(reserveBuilderReservation(join(APP_ROOT, "task227-outside", "store"), plan()), null);
      assert.equal(reserveBuilderReservation(join(TEST_RESULTS, "wrong-prefix", "store"), plan()), null);
      assert.equal(reserveBuilderReservation(sentinel, plan()), null);
      assert.equal(readFileSync(sentinel).equals(sentinelBytes), true);
    } finally {
      if (descriptor !== null) closeSync(descriptor);
      assert.equal(sameIdentity(sentinelIdentity, identity(sentinel, "file")), true);
      assert.equal(readFileSync(sentinel).equals(sentinelBytes), true);
      unlinkSync(sentinel);
    }
  });
});

test("an exact preexisting store root is never adopted or overwritten", () => {
  withFixture("preexisting-store", (root) => {
    mkdirSync(root, { recursive: false, mode: 0o700 });
    markFixtureCreated(root);
    const sentinel = join(root, "valuable.txt");
    const bytes = Buffer.from("valuable preexisting fixture bytes\n", "utf8");
    let descriptor: number | null = null;
    try {
      descriptor = openSync(sentinel, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
      writeFileSync(descriptor, bytes);
      closeSync(descriptor);
      descriptor = null;
      assert.equal(reserveBuilderReservation(root, plan()), null);
      assert.equal(readFileSync(sentinel).equals(bytes), true);
      assert.deepEqual(readdirSync(root), ["valuable.txt"]);
    } finally {
      if (descriptor !== null) closeSync(descriptor);
    }
  });
});

test("an exact store symlink or junction is refused without following it", (t) => {
  withFixture("linked-store", (root) => {
    const target = join(resolve(root, ".."), "linked-target");
    mkdirSync(target, { recursive: false, mode: 0o700 });
    try {
      symlinkSync(target, root, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EPERM" || code === "EACCES" || code === "ENOSYS") {
        t.skip(`host cannot create a disposable directory link: ${code}`);
        return;
      }
      throw error;
    }
    try {
      const linked = lstatSync(root, { bigint: true });
      assert.equal(linked.isSymbolicLink(), true);
      assert.equal(reserveBuilderReservation(root, plan()), null);
      assert.deepEqual(readdirSync(target), []);
    } finally {
      const linked = lstatSync(root, { bigint: true });
      assert.equal(linked.isSymbolicLink(), true);
      unlinkSync(root);
    }
  });
});

test("store stays dark with one exact fake consumer and a closed runtime surface", async () => {
  const main = readFileSync(join(APP_ROOT, "src", "main", "main.ts"), "utf8");
  const ipc = readFileSync(join(APP_ROOT, "src", "main", "ipc.ts"), "utf8");
  const preload = readFileSync(join(APP_ROOT, "src", "preload.ts"), "utf8");
  const packageJson = readFileSync(join(APP_ROOT, "package.json"), "utf8");
  for (const source of [main, ipc, preload, packageJson]) {
    assert.equal(/builderreservation/iu.test(source), false);
  }

  const productFiles: string[] = [];
  const visit = (directory: string): void => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) visit(path);
      else if (resolve(path) !== resolve(APP_ROOT, "src", "main", "builderreservation.ts")
        && /\.(?:ts|tsx|js|mjs)$/u.test(name)) productFiles.push(path);
    }
  };
  visit(join(APP_ROOT, "src"));
  const reservationProductSources = productFiles.filter((path) => /builderreservation/iu.test(path));
  assert.deepEqual(reservationProductSources, []);
  for (const path of productFiles) {
    assert.equal(/builderreservation/iu.test(readFileSync(path, "utf8")), false, path);
  }

  const storeSource = readFileSync(join(APP_ROOT, "src", "main", "builderreservation.ts"), "utf8");
  const fakeSource = readFileSync(join(APP_ROOT, "tests-unit", "support", "builderreservation-fake.ts"), "utf8");
  const importSources = (source: string): string[] => [
    ...new Set([...source.matchAll(/\bfrom\s+["']([^"']+)["']/gu)].map((match) => match[1]!)),
  ].sort();
  assert.deepEqual(importSources(storeSource), ["node:crypto", "node:fs", "node:path", "node:util"]);
  assert.deepEqual(importSources(fakeSource), ["../../src/main/builderreservation.js"]);
  assert.equal(/\bimport\s*\(|\brequire\s*\(/u.test(storeSource), false);
  assert.equal(/\bimport\s*\(|\brequire\s*\(/u.test(fakeSource), false);
  assert.equal(/from ["']node:(?:child_process|net|http|https|tls|vm|worker_threads)["']/u.test(storeSource), false);
  assert.equal(/process\.env|fetch\s*\(|spawn\s*\(|exec\s*\(/u.test(storeSource), false);
  for (const source of [fakeSource]) {
    assert.equal(/from ["']node:(?:fs|child_process|net|http|https|tls|vm|worker_threads)["']/u.test(source), false);
    assert.equal(/process\.env|fetch\s*\(|spawn\s*\(|exec\s*\(|writeFile|rmSync|unlinkSync/u.test(source), false);
  }
  const runtimeRequire = createRequire(join(APP_ROOT, "package.json"));
  const storeModule = runtimeRequire(
    join(APP_ROOT, "dist-unit", "src", "main", "builderreservation.js"),
  ) as Record<string, unknown>;
  assert.deepEqual(Object.keys(storeModule).sort(), [
    "BUILDER_RESERVATION_FAKE_RECEIPT_VERSION",
    "BUILDER_RESERVATION_HANDLER_REVISION",
    "BUILDER_RESERVATION_LIMITS",
    "BUILDER_RESERVATION_PLAN_VERSION",
    "BUILDER_RESERVATION_POLICY_REVISION",
    "BUILDER_RESERVATION_REVISION_VERSION",
    "completeBuilderReservation",
    "composeBuilderReservationFakeReceiptForTest",
    "consumeBuilderReservationGrantForFake",
    "inspectBuilderReservation",
    "mintBuilderReservationGrant",
    "parseBuilderReservationBindingForFake",
    "reserveBuilderReservation",
  ].sort());
  const fakeModule = runtimeRequire(
    join(APP_ROOT, "dist-unit", "tests-unit", "support", "builderreservation-fake.js"),
  ) as Record<string, unknown>;
  assert.deepEqual(Object.keys(fakeModule).sort(), [
    "BUILDER_RESERVATION_FAKE_HANDLER_REVISION",
    "invokeBuilderReservationFake",
  ]);
  for (const lowLevelName of [
    "consumeBuilderReservationGrantForFake",
    "composeBuilderReservationFakeReceiptForTest",
  ]) {
    assert.equal(fakeSource.includes(lowLevelName), true);
    assert.equal(productFiles.some((path) => readFileSync(path, "utf8").includes(lowLevelName)), false);
  }
  assert.equal(/registerBuilderReservationAuthorityVerifier/u.test(storeSource + fakeSource), false);
  assert.equal(existsSync(join(APP_ROOT, "src", "main", "builderreservation-authority-internal.ts")), false);
  assert.equal(existsSync(join(APP_ROOT, "dist-unit", "src", "main", "builderreservation-authority-internal.js")), false);
  assert.equal(/builderreservation/iu.test(packageJson), false);
});
