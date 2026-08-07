import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { platform, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { ProjectAuthorityId } from "../src/shared/model-connections.js";
import {
  authorizeProjectRoot,
  canonicalRootDigest,
  filesystemIdentityDigest,
  inspectProjectRoot,
  parseProjectAuthorityEntries,
  registerProjectAuthority,
  resolveProjectAuthority,
  type ProjectAuthorityEntry,
  type ProjectSnapshot,
} from "../src/main/connections/project-authority.js";

const PROJECT_A = "11111111-1111-4111-8111-111111111111" as ProjectAuthorityId;
const PROJECT_B = "22222222-2222-4222-8222-222222222222" as ProjectAuthorityId;
const REVISION_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REVISION_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function fakeSnapshot(root: string, deviceId: bigint, fileId: bigint): ProjectSnapshot {
  const observation = Object.freeze({ canonicalRoot: resolve(root), deviceId, fileId });
  const snapshot = inspectProjectRoot(root, { observe: () => observation });
  assert.ok(snapshot);
  return snapshot;
}

function entry(
  projectAuthorityId: ProjectAuthorityId,
  snapshot: ProjectSnapshot,
  authorityRevision: string,
): ProjectAuthorityEntry {
  return Object.freeze({
    projectAuthorityId,
    canonicalRootDigest: snapshot.canonicalRootDigest,
    filesystemIdentityDigest: snapshot.filesystemIdentityDigest,
    authorityRevision,
  });
}

test("canonical root digests preserve POSIX backslashes but normalize Windows separators", () => {
  const slash = canonicalRootDigest("/project/one/two");
  const backslash = canonicalRootDigest("/project/one\\two");
  if (platform() === "win32") assert.equal(backslash, slash);
  else assert.notEqual(backslash, slash);
});

test("project inspection double-probes and preserves BigInt identity exactly", () => {
  const root = resolve("project-authority-precision");
  const first = { canonicalRoot: root, deviceId: 1n, fileId: 9_007_199_254_740_992n };
  const roundedToSameNumber = { ...first, fileId: 9_007_199_254_740_993n };
  assert.equal(Number(first.fileId), Number(roundedToSameNumber.fileId));
  let calls = 0;
  assert.equal(inspectProjectRoot(root, {
    observe: () => (++calls === 1 ? first : roundedToSameNumber),
  }), null, "a root identity change between probes fails closed");
  assert.equal(calls, 2);

  assert.equal(inspectProjectRoot(root, { observe: () => null }), null);
  assert.equal(inspectProjectRoot(root, {
    observe: () => ({ canonicalRoot: root, deviceId: 1n, fileId: 0n }),
  }), null, "an unavailable file identity fails closed");
  assert.equal(inspectProjectRoot(root, {
    observe: () => ({ canonicalRoot: root, deviceId: 0n, fileId: 1n }),
  }), null, "an unavailable device identity fails closed");

  const stable = fakeSnapshot(root, first.deviceId, first.fileId);
  assert.equal(stable.fileId, first.fileId);
  assert.notEqual(
    stable.filesystemIdentityDigest,
    filesystemIdentityDigest(roundedToSameNumber.deviceId, roundedToSameNumber.fileId),
  );
});

test("the default inspector resolves a real directory without persisting its path", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-project-authority-"));
  try {
    const snapshot = inspectProjectRoot(root);
    assert.ok(snapshot);
    const registered = registerProjectAuthority([], snapshot, {
      projectAuthorityId: () => PROJECT_A,
      authorityRevision: () => REVISION_A,
    });
    assert.deepEqual(Object.keys(registered.entry).sort(), [
      "authorityRevision", "canonicalRootDigest", "filesystemIdentityDigest", "projectAuthorityId",
    ]);
    const serialized = JSON.stringify(registered.entry);
    assert.doesNotMatch(serialized, /cairn-project-authority/i);
    assert.equal(serialized.includes(root), false);
    assert.equal(serialized.includes(snapshot.canonicalRoot), false);
    assert.equal(registered.entry.canonicalRootDigest, canonicalRootDigest(snapshot.canonicalRoot));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("registry parsing is exact, detached, bounded, and rejects duplicate authority fields", () => {
  const first = fakeSnapshot(resolve("authority-a"), 3n, 31n);
  const second = fakeSnapshot(resolve("authority-b"), 4n, 41n);
  const a = entry(PROJECT_A, first, REVISION_A);
  const b = entry(PROJECT_B, second, REVISION_B);
  const parsed = parseProjectAuthorityEntries([a, b]);
  assert.equal(parsed.kind, "valid");
  if (parsed.kind === "valid") {
    assert.notEqual(parsed.value, [a, b]);
    assert.ok(Object.isFrozen(parsed.value));
    assert.ok(parsed.value.every(Object.isFrozen));
  }

  for (const malformed of [
    undefined,
    { ...a },
    [{ ...a, rawPath: "C:/must-not-persist" }],
    [{ ...a, projectAuthorityId: "not-a-uuid" }],
    [{ ...a, canonicalRootDigest: "A".repeat(64) }],
    [{ ...a, filesystemIdentityDigest: "short" }],
    [{ ...a, authorityRevision: "revision-1" }],
    [a, { ...b, projectAuthorityId: PROJECT_A }],
    [a, { ...b, authorityRevision: REVISION_A }],
    [a, { ...b, canonicalRootDigest: a.canonicalRootDigest }],
    [a, { ...b, filesystemIdentityDigest: a.filesystemIdentityDigest }],
  ]) {
    assert.deepEqual(parseProjectAuthorityEntries(malformed), { kind: "malformed" });
  }

  const sparse = new Array(1);
  assert.deepEqual(parseProjectAuthorityEntries(sparse), { kind: "malformed" });
  const accessor = Object.defineProperty({}, "projectAuthorityId", {
    enumerable: true, get: () => PROJECT_A,
  });
  Object.assign(accessor, {
    canonicalRootDigest: a.canonicalRootDigest,
    filesystemIdentityDigest: a.filesystemIdentityDigest,
    authorityRevision: REVISION_A,
  });
  assert.deepEqual(parseProjectAuthorityEntries([accessor]), { kind: "malformed" });
});

test("resolver distinguishes authorized, new, moved, replaced, and ambiguous roots", () => {
  const rootA = resolve("authority-resolve-a");
  const rootB = resolve("authority-resolve-b");
  const originalA = fakeSnapshot(rootA, 7n, 71n);
  const originalB = fakeSnapshot(rootB, 8n, 81n);
  const a = entry(PROJECT_A, originalA, REVISION_A);
  const b = entry(PROJECT_B, originalB, REVISION_B);

  assert.deepEqual(resolveProjectAuthority([a, b], originalA), {
    kind: "authorized", projectAuthorityId: PROJECT_A, authorityRevision: REVISION_A,
  });
  assert.deepEqual(resolveProjectAuthority([a, b], fakeSnapshot(resolve("new-root"), 9n, 91n)), {
    kind: "registration-required",
  });
  assert.deepEqual(resolveProjectAuthority([a, b], fakeSnapshot(resolve("moved-root"), 7n, 71n)), {
    kind: "reauthorization-required", reason: "moved",
  });
  assert.deepEqual(resolveProjectAuthority([a, b], fakeSnapshot(rootA, 10n, 101n)), {
    kind: "reauthorization-required", reason: "replaced",
  });
  assert.deepEqual(resolveProjectAuthority([a, b], fakeSnapshot(rootA, 8n, 81n)), {
    kind: "reauthorization-required", reason: "ambiguous",
  });

  const duplicateRoot = { ...b, canonicalRootDigest: a.canonicalRootDigest };
  assert.deepEqual(resolveProjectAuthority([a, duplicateRoot], originalA), {
    kind: "reauthorization-required", reason: "ambiguous",
  });
});

test("registration is explicit, collision-safe, and returns only opaque records", () => {
  const root = resolve("authority-register");
  const snapshot = fakeSnapshot(root, 12n, 121n);
  const registered = registerProjectAuthority([], snapshot, {
    projectAuthorityId: () => PROJECT_A,
    authorityRevision: () => REVISION_A,
  });
  assert.deepEqual(resolveProjectAuthority(registered.entries, snapshot), {
    kind: "authorized", projectAuthorityId: PROJECT_A, authorityRevision: REVISION_A,
  });
  assert.throws(
    () => registerProjectAuthority(registered.entries, snapshot),
    (error: unknown) => error instanceof Error
      && error.message === "PROJECT_AUTHORITY_REGISTRATION_REFUSED"
      && !error.message.includes(root),
  );
  assert.throws(
    () => registerProjectAuthority([], snapshot, { projectAuthorityId: () => "bad", authorityRevision: () => REVISION_A }),
    { message: "PROJECT_AUTHORITY_ID_GENERATION_FAILED" },
  );
  assert.throws(
    () => registerProjectAuthority([], snapshot, { projectAuthorityId: () => PROJECT_A, authorityRevision: () => "bad" }),
    { message: "PROJECT_AUTHORITY_ID_GENERATION_FAILED" },
  );
});

test("root authorization reports unavailable identity without exposing a path", () => {
  const privateRoot = resolve("owner-private-project-name");
  const result = authorizeProjectRoot(privateRoot, [], { observe: () => null });
  assert.deepEqual(result, { kind: "reauthorization-required", reason: "unavailable" });
  assert.equal(JSON.stringify(result).includes(privateRoot), false);
});
