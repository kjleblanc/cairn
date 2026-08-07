import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  eraseModelConnectionsForRecovery,
  forgetModelConnections,
  loadOrMigrateLegacyConnection,
  renewCompatibleConnection,
  replaceCompatibleConnection,
  replaceInlineCompatibleConnection,
  replaceLegacyCredentialAtomically,
  type ConnectionMigrationIds,
} from "../src/main/connections/migrate.js";
import {
  inspectProjectRoot,
  type ProjectAuthorityInspectionDeps,
} from "../src/main/connections/project-authority.js";
import {
  createLegacyConductorSecretReference,
  LEGACY_CONDUCTOR_RECOVERY_MARKER,
  parseLegacyConductorConnection,
  readLegacyConductorConnection,
  verifyAndDecryptLegacyConductorSecret,
  type LegacyConductorFileReader,
} from "../src/main/connections/secrets.js";
import {
  createInlineEncryptedCredential,
  createModelConnectionsStore,
} from "../src/main/connections/store.js";

const OLD_SCOPE = "The owner's messages and the exact legacy project context.";
const NEW_SCOPE = "The owner's messages and a reviewed bounded file snapshot.";

class FakeLegacyFile implements LegacyConductorFileReader {
  failRemoval = false;
  failMarkerReplacement = false;
  constructor(public text: string | null) {}
  readConductorFile(maximumBytes: number): string | null {
    if (this.text !== null && Buffer.byteLength(this.text) > maximumBytes) throw new Error("too large");
    return this.text;
  }
  conductorFileExists(): boolean {
    return this.text !== null;
  }
  removeConductorFile(): void {
    if (this.failRemoval) throw new Error("injected secret deletion failure");
    this.text = null;
  }
  replaceConductorFileWithRecoveryMarker(marker: string): void {
    if (this.failRemoval || this.failMarkerReplacement) {
      throw new Error("injected secret replacement failure");
    }
    this.text = marker;
  }
}

function legacy(
  scope: string | null = OLD_SCOPE,
  key = "encrypted-credential-one",
  baseUrl = "https://unknown-compatible.example/v1",
): string {
  const value: Record<string, unknown> = {
    baseUrl,
    model: "provider/exact-model",
    keyB64: Buffer.from(key).toString("base64"),
  };
  if (scope !== null) value.authorizedDataScope = scope;
  return JSON.stringify(value);
}

function deterministicIds(): ConnectionMigrationIds {
  let next = 1;
  return {
    uuid: () => `00000000-0000-4000-8000-${String(next++).padStart(12, "0")}`,
    now: () => "2026-08-06T12:00:00.000Z",
  };
}

function inspection(root: string, deviceId = 17n, fileId = 71n): ProjectAuthorityInspectionDeps {
  const canonicalRoot = resolve(root);
  return { observe: () => ({ canonicalRoot, deviceId, fileId }) };
}

function fixture(t: test.TestContext) {
  const root = mkdtempSync(join(tmpdir(), "cairn-model-migrate-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const storePath = join(root, "model-connections.json");
  let revision = 0;
  const store = createModelConnectionsStore(storePath, { newRevision: () => `store-r${++revision}` });
  return { root, storePath, store };
}

test("valid legacy data migrates losslessly to one project-bound pinned bridge without copying the credential", (t) => {
  const { root, storePath, store } = fixture(t);
  const source = legacy();
  const file = new FakeLegacyFile(source);
  const ids = deterministicIds();
  const result = loadOrMigrateLegacyConnection({
    store,
    legacy: file,
    currentProjectRoot: root,
    projectInspection: inspection(root),
    ids,
  });
  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") return;
  assert.equal(result.value.baseUrl, "https://unknown-compatible.example/v1");
  assert.equal(result.value.model, "provider/exact-model");
  assert.equal(result.value.authenticationOrigin, "legacy-unknown");
  assert.equal(result.value.authorizedDataScope, OLD_SCOPE);
  assert.equal(result.value.projectAuthorized, true);

  const bytes = readFileSync(storePath, "utf8");
  assert.equal(file.text, source, "migration never rewrites the one legacy credential copy");
  assert.equal(bytes.includes("keyB64"), false);
  assert.equal(bytes.includes(Buffer.from("encrypted-credential-one").toString("base64")), false);
  const parsed = store.read();
  assert.equal(parsed.kind, "ready");
  if (parsed.kind !== "ready") return;
  assert.equal(parsed.value.connections.length, 1);
  assert.equal(parsed.value.connections[0]?.driverId, "openai-compatible");
  assert.equal(parsed.value.connections[0]?.legacyAuthorizedDataScope, OLD_SCOPE);
  assert.deepEqual(parsed.value.conductorAssignment, {
    role: "conductor",
    mode: "pinned",
    connectionId: result.value.connectionId,
    modelId: "provider/exact-model",
    assignmentRevision: parsed.value.conductorAssignment?.assignmentRevision,
  });
  assert.deepEqual(parsed.value.linkGrants[0]?.metadataScope, []);
  assert.equal(parsed.value.linkGrants[0]?.authorizationBasis, "legacy-pinned-bridge");
  assert.equal(parsed.value.conductorGrants[0]?.authorizationBasis, "legacy-pinned-bridge");
  assert.equal(parsed.value.conductorGrants[0]?.billingKind, "unknown");

  const before = readFileSync(storePath);
  const again = loadOrMigrateLegacyConnection({
    store,
    legacy: file,
    currentProjectRoot: root,
    projectInspection: inspection(root),
    ids,
  });
  assert.equal(again.kind, "ready");
  assert.deepEqual(readFileSync(storePath), before, "ordinary reads are idempotent and perform no rewrite");
});

test("migration without a current project waits, then materializes exactly one narrow bridge", (t) => {
  const { root, storePath, store } = fixture(t);
  const file = new FakeLegacyFile(legacy());
  const ids = deterministicIds();
  const waiting = loadOrMigrateLegacyConnection({ store, legacy: file, ids });
  assert.equal(waiting.kind, "ready");
  assert.equal(waiting.kind === "ready" ? waiting.value.projectAuthorityId : "bad", null);
  const firstBytes = readFileSync(storePath);
  const firstStore = store.read();
  assert.equal(firstStore.kind, "ready");
  if (firstStore.kind !== "ready") return;
  assert.equal(firstStore.value.projectAuthorities.length, 0);
  assert.equal(firstStore.value.linkGrants.length, 0, "the legacy bridge waits for a canonical project");
  assert.equal(firstStore.value.conductorGrants.length, 0);

  const bridged = loadOrMigrateLegacyConnection({
    store,
    legacy: file,
    currentProjectRoot: root,
    projectInspection: inspection(root),
    ids,
  });
  assert.equal(bridged.kind, "ready");
  assert.equal(bridged.kind === "ready" && bridged.value.projectAuthorized, true);
  assert.notDeepEqual(readFileSync(storePath), firstBytes);
  const bridgedStore = store.read();
  assert.equal(bridgedStore.kind === "ready" ? bridgedStore.value.linkGrants.length : -1, 1);
  const secondBytes = readFileSync(storePath);
  assert.equal(loadOrMigrateLegacyConnection({
    store, legacy: file, currentProjectRoot: root, projectInspection: inspection(root), ids,
  }).kind, "ready");
  assert.deepEqual(readFileSync(storePath), secondBytes);
});

test("legacy migration cannot register a project replaced after main selected it", (t) => {
  const { root, storePath, store } = fixture(t);
  const reviewed = inspectProjectRoot(root, inspection(root, 51n, 151n));
  assert.notEqual(reviewed, null);
  if (!reviewed) return;
  const result = loadOrMigrateLegacyConnection({
    store,
    legacy: new FakeLegacyFile(legacy()),
    currentProjectRoot: root,
    projectInspection: inspection(root, 52n, 152n),
    expectedProject: {
      canonicalRootDigest: reviewed.canonicalRootDigest,
      filesystemIdentityDigest: reviewed.filesystemIdentityDigest,
    },
    ids: deterministicIds(),
  });
  assert.deepEqual(result, { kind: "project-reauthorization-required", reason: "unavailable" });
  assert.equal(existsSync(storePath), false, "a changed renderer-visible path cannot create authority");
});

test("three-key legacy records preserve null scope and cannot invent a project data grant", (t) => {
  const { root, store } = fixture(t);
  const result = loadOrMigrateLegacyConnection({
    store,
    legacy: new FakeLegacyFile(legacy(null)),
    currentProjectRoot: root,
    projectInspection: inspection(root),
    ids: deterministicIds(),
  });
  assert.equal(result.kind, "ready");
  assert.equal(result.kind === "ready" ? result.value.authorizedDataScope : "bad", null);
  const loaded = store.read();
  assert.equal(loaded.kind, "ready");
  assert.equal(loaded.kind === "ready" ? loaded.value.conductorGrants.length : -1, 0);
});

test("an unknown legacy scope is preserved as evidence, never normalized or widened", (t) => {
  const { root, store } = fixture(t);
  const unknownScope = "unknown-future-sharing-scope";
  const result = loadOrMigrateLegacyConnection({
    store,
    legacy: new FakeLegacyFile(legacy(unknownScope)),
    currentProjectRoot: root,
    projectInspection: inspection(root),
    ids: deterministicIds(),
  });
  assert.equal(result.kind, "ready");
  assert.equal(result.kind === "ready" ? result.value.authorizedDataScope : null, unknownScope);
  const persisted = store.read();
  assert.equal(persisted.kind, "ready");
  assert.equal(
    persisted.kind === "ready" ? persisted.value.conductorGrants[0]?.authorizedDataScope : null,
    unknownScope,
  );
});

test("malformed legacy, corrupt new authority, both-present corruption, and changed ciphertext all recover without secrets", (t) => {
  const { root, storePath, store } = fixture(t);
  const canary = "fake-secret-material-must-not-escape";
  const malformed = new FakeLegacyFile(`{"baseUrl":"https://example.test/v1","keyB64":"${canary}"}`);
  const malformedResult = loadOrMigrateLegacyConnection({ store, legacy: malformed, ids: deterministicIds() });
  assert.deepEqual(malformedResult, { kind: "recovery-required", code: "MODEL_CONNECTIONS_RECOVERY_REQUIRED" });
  assert.equal(JSON.stringify(malformedResult).includes(canary), false);

  writeFileSync(storePath, "{\"version\":\"cairn-model-connections/v99\"}\n", "utf8");
  const bothPresent = loadOrMigrateLegacyConnection({ store, legacy: new FakeLegacyFile(legacy()), ids: deterministicIds() });
  assert.equal(bothPresent.kind, "recovery-required", "a valid legacy file cannot override corrupt new authority");

  rmSync(storePath, { force: true });
  const source = new FakeLegacyFile(legacy());
  assert.equal(loadOrMigrateLegacyConnection({ store, legacy: source, ids: deterministicIds() }).kind, "ready");
  source.text = legacy(OLD_SCOPE, "changed-encrypted-credential");
  const changed = loadOrMigrateLegacyConnection({ store, legacy: source, ids: deterministicIds() });
  assert.equal(changed.kind, "recovery-required");
  assert.equal(JSON.stringify(changed).includes("changed-encrypted-credential"), false);
});

test("an existing canonical authority with no compatibility assignment is recovery, not absence", (t) => {
  const { store } = fixture(t);
  assert.equal(store.write(null, {
    recovery: { kind: "none" },
    connections: [],
    conductorAssignment: null,
    workerAssignment: null,
    linkGrants: [],
    conductorGrants: [],
    projectAuthorities: [],
  }).kind, "written");
  assert.equal(loadOrMigrateLegacyConnection({
    store,
    legacy: new FakeLegacyFile(null),
    ids: deterministicIds(),
  }).kind, "recovery-required");
});

test("legacy shape and digest checks always finish before the fake decrypt adapter runs", () => {
  const validFile = new FakeLegacyFile(legacy());
  const parsed = readLegacyConductorConnection(validFile);
  assert.equal(parsed.kind, "valid");
  if (parsed.kind !== "valid") return;
  const reference = createLegacyConductorSecretReference(parsed.value);
  assert.notEqual(reference, null);
  if (!reference) return;
  const facts = {
    baseUrl: parsed.value.baseUrl,
    model: parsed.value.model,
    authorizedDataScope: parsed.value.authorizedDataScope,
  };
  let decryptions = 0;
  const decryptor = {
    decryptLegacyCiphertext() {
      decryptions += 1;
      return "fake-decrypted-secret";
    },
  };
  const malformed = verifyAndDecryptLegacyConductorSecret(
    reference,
    facts,
    new FakeLegacyFile("{malformed-fake-secret-canary"),
    decryptor,
  );
  assert.equal(malformed.ok, false);
  const mismatched = verifyAndDecryptLegacyConductorSecret(
    { ...reference, ciphertextSha256: "0".repeat(64) },
    facts,
    validFile,
    decryptor,
  );
  assert.equal(mismatched.ok, false);
  assert.equal(decryptions, 0);
  assert.equal(JSON.stringify([malformed, mismatched]).includes("fake-secret-canary"), false);
  assert.equal(verifyAndDecryptLegacyConductorSecret(reference, facts, validFile, decryptor).ok, true);
  assert.equal(decryptions, 1);

  for (const unsafeModel of ["file:/etc/passwd", "javascript:alert", "C:/secret", "provider//model"]) {
    assert.equal(parseLegacyConductorConnection(legacy(OLD_SCOPE, "encrypted", "https://example.test/v1")
      .replace("provider/exact-model", unsafeModel)).kind, "malformed");
  }
});

test("renewal keeps the stable project authority while rotating grants and preserving legacy evidence", (t) => {
  const { root, store } = fixture(t);
  const file = new FakeLegacyFile(legacy());
  const ids = deterministicIds();
  const migrated = loadOrMigrateLegacyConnection({
    store, legacy: file, currentProjectRoot: root, projectInspection: inspection(root), ids,
  });
  assert.equal(migrated.kind, "ready");
  if (migrated.kind !== "ready") return;
  const sourceBytes = file.text;
  const previousProject = migrated.value.projectAuthorityId;
  const renewed = renewCompatibleConnection({
    store,
    legacy: file,
    currentProjectRoot: root,
    projectInspection: inspection(root),
    authorizedDataScope: NEW_SCOPE,
    expectedStoreRevision: migrated.value.storeRevision,
    ids,
  });
  assert.equal(renewed.kind, "ready");
  if (renewed.kind !== "ready") return;
  assert.equal(renewed.value.projectAuthorityId, previousProject);
  assert.equal(renewed.value.authorizedDataScope, NEW_SCOPE);
  assert.equal(renewed.value.legacyAuthorizedDataScope, OLD_SCOPE);
  assert.equal(file.text, sourceBytes);
  const persisted = store.read();
  assert.equal(persisted.kind, "ready");
  if (persisted.kind !== "ready") return;
  assert.equal(persisted.value.linkGrants[0]?.authorizationBasis, "explicit");
  assert.equal(persisted.value.conductorGrants[0]?.authorizationBasis, "explicit");
  assert.equal(persisted.value.conductorGrants[0]?.authorizedDataScope, NEW_SCOPE);
  assert.equal(loadOrMigrateLegacyConnection({
    store, legacy: file, currentProjectRoot: root, projectInspection: inspection(root), ids,
  }).kind, "ready", "renewed authority still verifies against unchanged legacy credential facts");
});

test("renewal cannot mint a grant when project identity changes between probes", (t) => {
  const { root, storePath, store } = fixture(t);
  const file = new FakeLegacyFile(legacy());
  const ids = deterministicIds();
  const migrated = loadOrMigrateLegacyConnection({
    store, legacy: file, currentProjectRoot: root, projectInspection: inspection(root, 41n, 141n), ids,
  });
  assert.equal(migrated.kind, "ready");
  if (migrated.kind !== "ready") return;
  const before = readFileSync(storePath);
  let observation = 0;
  const changingIdentity: ProjectAuthorityInspectionDeps = {
    observe: () => {
      observation += 1;
      return {
        canonicalRoot: resolve(root),
        deviceId: observation <= 2 ? 41n : 42n,
        fileId: observation <= 2 ? 141n : 142n,
      };
    },
  };

  const renewed = renewCompatibleConnection({
    store,
    legacy: file,
    currentProjectRoot: root,
    projectInspection: changingIdentity,
    authorizedDataScope: NEW_SCOPE,
    expectedStoreRevision: migrated.value.storeRevision,
    ids,
  });

  assert.deepEqual(renewed, { kind: "project-reauthorization-required", reason: "unavailable" });
  assert.deepEqual(readFileSync(storePath), before);
});

test("reconnect creates a fresh authentication revision and stale completion cannot overwrite authority", (t) => {
  const { root, store } = fixture(t);
  const file = new FakeLegacyFile(legacy());
  const ids = deterministicIds();
  const initial = loadOrMigrateLegacyConnection({
    store, legacy: file, currentProjectRoot: root, projectInspection: inspection(root), ids,
  });
  assert.equal(initial.kind, "ready");
  if (initial.kind !== "ready") return;
  const capturedRevision = initial.value.storeRevision;
  file.text = legacy(OLD_SCOPE, "replacement-encrypted-credential");
  const replacement = replaceCompatibleConnection({
    store,
    legacy: file,
    currentProjectRoot: root,
    projectInspection: inspection(root),
    authenticationOrigin: "openrouter-oauth",
    expectedStoreRevision: capturedRevision,
    ids,
  });
  assert.equal(replacement.kind, "ready");
  if (replacement.kind !== "ready") return;
  assert.notEqual(replacement.value.authenticationRevision, initial.value.authenticationRevision);
  assert.equal(replacement.value.projectAuthorityId, initial.value.projectAuthorityId);
  assert.equal(replacement.value.authenticationOrigin, "openrouter-oauth");

  const stale = replaceCompatibleConnection({
    store,
    legacy: file,
    currentProjectRoot: root,
    projectInspection: inspection(root),
    authenticationOrigin: "pasted-api-key",
    expectedStoreRevision: capturedRevision,
    ids,
  });
  assert.deepEqual(stale, { kind: "stale", code: "MODEL_CONNECTIONS_STORE_STALE" });
  const final = store.read();
  assert.equal(final.kind, "ready");
  assert.equal(final.kind === "ready" ? final.value.storeRevision : null, replacement.value.storeRevision);
});

test("legacy reconnect authority-write failure restores credential and store byte-for-byte", (t) => {
  const { root, storePath, store } = fixture(t);
  const originalLegacy = legacy(OLD_SCOPE, "original-encrypted-credential");
  const file = new FakeLegacyFile(originalLegacy);
  const ids = deterministicIds();
  const migrated = loadOrMigrateLegacyConnection({
    store, legacy: file, currentProjectRoot: root, projectInspection: inspection(root), ids,
  });
  assert.equal(migrated.kind, "ready");
  if (migrated.kind !== "ready") return;
  const originalStore = readFileSync(storePath);
  const failingStore = createModelConnectionsStore(storePath, {
    newRevision: () => "store-write-must-not-land",
    atomicWrite() { throw new Error("injected authority replacement failure"); },
  });

  const result = replaceLegacyCredentialAtomically({
    readPreviousCredential: () => Buffer.from(file.text ?? "", "utf8"),
    writeReplacementCredential: () => { file.text = legacy(OLD_SCOPE, "replacement-encrypted-credential"); },
    restorePreviousCredential: (previous) => {
      file.text = previous.toString("utf8");
      return file.text === originalLegacy;
    },
    replaceAuthority: () => replaceCompatibleConnection({
      store: failingStore,
      legacy: file,
      currentProjectRoot: root,
      projectInspection: inspection(root),
      authenticationOrigin: "openrouter-oauth",
      expectedStoreRevision: migrated.value.storeRevision,
      ids,
    }),
    authorityUnchanged: () => readFileSync(storePath).equals(originalStore),
  });

  assert.deepEqual(result, { kind: "write-failed", code: "MODEL_CONNECTIONS_STORE_WRITE_FAILED" });
  assert.equal(file.text, originalLegacy);
  assert.deepEqual(readFileSync(storePath), originalStore);
});

test("fresh and replacement connections use one inline credential with stable project identity and stale safety", (t) => {
  const { root, storePath, store } = fixture(t);
  const file = new FakeLegacyFile(null);
  const ids = deterministicIds();
  const firstCredential = createInlineEncryptedCredential(Buffer.from("os-encrypted-one"));
  assert.notEqual(firstCredential, null);
  if (!firstCredential) return;
  const created = replaceInlineCompatibleConnection({
    store,
    legacy: file,
    currentProjectRoot: root,
    projectInspection: inspection(root),
    authenticationOrigin: "pasted-api-key",
    expectedStoreRevision: null,
    baseUrl: "https://unknown-compatible.example/v1",
    model: "provider/exact-model",
    authorizedDataScope: NEW_SCOPE,
    credential: firstCredential,
    ids,
  });
  assert.equal(created.kind, "ready");
  if (created.kind !== "ready") return;
  assert.equal(created.value.credential.kind, "inline-encrypted");
  assert.equal(created.value.legacyAuthorizedDataScope, null);
  assert.equal(file.text, null);
  const firstProject = created.value.projectAuthorityId;
  const oldCiphertext = firstCredential.ciphertextB64;

  const secondCredential = createInlineEncryptedCredential(Buffer.from("os-encrypted-two"));
  assert.notEqual(secondCredential, null);
  if (!secondCredential) return;
  const replaced = replaceInlineCompatibleConnection({
    store,
    legacy: file,
    currentProjectRoot: root,
    projectInspection: inspection(root),
    authenticationOrigin: "openrouter-oauth",
    expectedStoreRevision: created.value.storeRevision,
    baseUrl: "https://unknown-compatible.example/v1",
    model: "provider/exact-model",
    authorizedDataScope: NEW_SCOPE,
    credential: secondCredential,
    ids,
  });
  assert.equal(replaced.kind, "ready");
  if (replaced.kind !== "ready") return;
  assert.equal(replaced.value.projectAuthorityId, firstProject);
  assert.notEqual(replaced.value.authenticationRevision, created.value.authenticationRevision);
  assert.equal(readFileSync(storePath, "utf8").includes(oldCiphertext), false);

  const beforeStale = readFileSync(storePath);
  const stale = replaceInlineCompatibleConnection({
    store,
    legacy: file,
    currentProjectRoot: root,
    projectInspection: inspection(root),
    authenticationOrigin: "pasted-api-key",
    expectedStoreRevision: created.value.storeRevision,
    baseUrl: "https://stale.example/v1",
    model: "provider/stale-model",
    authorizedDataScope: NEW_SCOPE,
    credential: firstCredential,
    ids,
  });
  assert.deepEqual(stale, { kind: "stale", code: "MODEL_CONNECTIONS_STORE_STALE" });
  assert.deepEqual(readFileSync(storePath), beforeStale);

  file.text = legacy();
  assert.equal(loadOrMigrateLegacyConnection({
    store, legacy: file, currentProjectRoot: root, projectInspection: inspection(root), ids,
  }).kind, "recovery-required", "an inline credential and residual legacy file cannot both be active");
});

test("an inline connection atomic-write failure leaves store absence and legacy absence unchanged", (t) => {
  const root = mkdtempSync(join(tmpdir(), "cairn-inline-failure-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const storePath = join(root, "model-connections.json");
  const store = createModelConnectionsStore(storePath, {
    newRevision: () => "store-r1",
    atomicWrite() { throw new Error("injected write failure with fake-secret-canary"); },
  });
  const file = new FakeLegacyFile(null);
  const credential = createInlineEncryptedCredential(Buffer.from("os-encrypted-failure"));
  assert.notEqual(credential, null);
  if (!credential) return;
  const result = replaceInlineCompatibleConnection({
    store,
    legacy: file,
    currentProjectRoot: root,
    projectInspection: inspection(root),
    authenticationOrigin: "pasted-api-key",
    expectedStoreRevision: null,
    baseUrl: "https://unknown-compatible.example/v1",
    model: "provider/exact-model",
    authorizedDataScope: NEW_SCOPE,
    credential,
    ids: deterministicIds(),
  });
  assert.deepEqual(result, { kind: "write-failed", code: "MODEL_CONNECTIONS_STORE_WRITE_FAILED" });
  assert.equal(existsSync(storePath), false);
  assert.equal(file.text, null);
  assert.equal(JSON.stringify(result).includes("fake-secret-canary"), false);
});

test("async connection completion cannot authorize a replaced project identity", (t) => {
  const { root, storePath, store } = fixture(t);
  const file = new FakeLegacyFile(null);
  const reviewed = inspectProjectRoot(root, inspection(root, 31n, 131n));
  assert.notEqual(reviewed, null);
  if (!reviewed) return;
  const credential = createInlineEncryptedCredential(Buffer.from("os-encrypted-race"));
  assert.notEqual(credential, null);
  if (!credential) return;

  const result = replaceInlineCompatibleConnection({
    store,
    legacy: file,
    currentProjectRoot: root,
    projectInspection: inspection(root, 32n, 132n),
    expectedProject: {
      canonicalRootDigest: reviewed.canonicalRootDigest,
      filesystemIdentityDigest: reviewed.filesystemIdentityDigest,
    },
    authenticationOrigin: "openrouter-oauth",
    expectedStoreRevision: null,
    baseUrl: "https://unknown-compatible.example/v1",
    model: "provider/exact-model",
    authorizedDataScope: NEW_SCOPE,
    credential,
    ids: deterministicIds(),
  });

  assert.deepEqual(result, { kind: "project-reauthorization-required", reason: "unavailable" });
  assert.equal(existsSync(storePath), false, "the raced completion writes no credential or authority");
  assert.equal(file.text, null);
});

test("a second project cannot borrow the first project's bridge", (t) => {
  const { root, store } = fixture(t);
  const file = new FakeLegacyFile(legacy());
  const ids = deterministicIds();
  assert.equal(loadOrMigrateLegacyConnection({
    store, legacy: file, currentProjectRoot: root, projectInspection: inspection(root, 11n, 111n), ids,
  }).kind, "ready");
  const other = resolve(root, "other-project");
  const crossed = loadOrMigrateLegacyConnection({
    store, legacy: file, currentProjectRoot: other, projectInspection: inspection(other, 12n, 112n), ids,
  });
  assert.deepEqual(crossed, { kind: "project-reauthorization-required", reason: "unrecognized" });
});

test("explicit project authorization preserves unrelated registry entries and reuses each stable ID", (t) => {
  const { root, store } = fixture(t);
  const file = new FakeLegacyFile(legacy());
  const ids = deterministicIds();
  const first = loadOrMigrateLegacyConnection({
    store, legacy: file, currentProjectRoot: root, projectInspection: inspection(root, 21n, 121n), ids,
  });
  assert.equal(first.kind, "ready");
  if (first.kind !== "ready") return;
  const firstId = first.value.projectAuthorityId;
  const otherRoot = resolve(root, "other-project");
  const second = renewCompatibleConnection({
    store,
    legacy: file,
    currentProjectRoot: otherRoot,
    projectInspection: inspection(otherRoot, 22n, 122n),
    authorizedDataScope: NEW_SCOPE,
    expectedStoreRevision: first.value.storeRevision,
    ids,
  });
  assert.equal(second.kind, "ready");
  if (second.kind !== "ready") return;
  assert.notEqual(second.value.projectAuthorityId, firstId);
  const secondId = second.value.projectAuthorityId;
  const afterSecond = store.read();
  assert.equal(afterSecond.kind === "ready" ? afterSecond.value.projectAuthorities.length : -1, 2);
  const stableLinkGrantRevision = afterSecond.kind === "ready"
    ? afterSecond.value.linkGrants[0]?.grantRevision
    : undefined;

  const returned = renewCompatibleConnection({
    store,
    legacy: file,
    currentProjectRoot: root,
    projectInspection: inspection(root, 21n, 121n),
    authorizedDataScope: NEW_SCOPE,
    expectedStoreRevision: second.value.storeRevision,
    ids,
  });
  assert.equal(returned.kind, "ready");
  if (returned.kind !== "ready") return;
  assert.equal(returned.value.projectAuthorityId, firstId);
  const final = store.read();
  assert.equal(final.kind === "ready" ? final.value.projectAuthorities.length : -1, 2);
  assert.equal(final.kind === "ready" ? final.value.conductorGrants.length : -1, 2);
  if (final.kind !== "ready") return;
  assert.equal(final.value.linkGrants[0]?.grantRevision, stableLinkGrantRevision);
  assert.deepEqual(
    new Set(final.value.conductorGrants.map((grant) => grant.projectAuthorityId)),
    new Set([firstId, secondId]),
  );
  const secondStillAuthorized = loadOrMigrateLegacyConnection({
    store,
    legacy: file,
    currentProjectRoot: otherRoot,
    projectInspection: inspection(otherRoot, 22n, 122n),
    ids,
  });
  assert.equal(secondStillAuthorized.kind, "ready");
  assert.equal(secondStillAuthorized.kind === "ready" ? secondStillAuthorized.value.projectAuthorized : false, true);
  assert.equal(secondStillAuthorized.kind === "ready" ? secondStillAuthorized.value.projectAuthorityId : null, secondId);
});

test("Forget is secret-first and every irreversible-boundary failure restarts fail-closed", async (t) => {
  for (const point of [
    "after-credential-delete",
    "after-forget-pending",
    "after-cache-delete",
    "after-authority-delete",
  ] as const) {
    await t.test(point, (st) => {
      const { root, storePath, store } = fixture(st);
      const file = new FakeLegacyFile(legacy());
      const ids = deterministicIds();
      assert.equal(loadOrMigrateLegacyConnection({ store, legacy: file, ids }).kind, "ready");
      const cachePath = join(root, "model-catalogs.json");
      writeFileSync(cachePath, "inert-cache", "utf8");
      const result = forgetModelConnections({
        store,
        legacy: file,
        removeCache: () => { rmSync(cachePath, { force: true }); return !existsSync(cachePath); },
        removeAuthority: () => { rmSync(storePath, { force: true }); return !existsSync(storePath); },
        failpoint: (candidate) => {
          if (candidate === point) throw new Error("fake-secret-canary-must-not-escape");
        },
      });
      assert.equal(result.kind, "failed");
      assert.equal(JSON.stringify(result).includes("fake-secret-canary"), false);
      assert.equal(file.text, null, "once Forget starts, an old reader cannot recover the credential");

      if (point === "after-credential-delete") {
        assert.equal(existsSync(cachePath), true);
        assert.equal(store.read().kind, "ready", "authority was not deleted before pending state");
        assert.equal(loadOrMigrateLegacyConnection({ store, legacy: file, ids }).kind, "recovery-required");
      } else if (point === "after-forget-pending") {
        assert.equal(existsSync(cachePath), true);
        const pending = store.read();
        assert.equal(pending.kind, "ready");
        assert.equal(pending.kind === "ready" ? pending.value.recovery.kind : "bad", "forget-pending");
      } else if (point === "after-cache-delete") {
        assert.equal(existsSync(cachePath), false);
        assert.equal(store.read().kind, "ready");
      } else {
        assert.equal(existsSync(cachePath), false);
        assert.equal(store.read().kind, "absent", "the final deletion is complete even if post-boundary reporting stops");
      }
    });
  }
});

test("inline Forget removes ciphertext before every later failpoint and restarts fail-closed", async (t) => {
  for (const point of [
    "after-credential-delete",
    "after-forget-pending",
    "after-cache-delete",
    "after-authority-delete",
  ] as const) {
    await t.test(point, (st) => {
      const { root, storePath, store } = fixture(st);
      const file = new FakeLegacyFile(null);
      const credential = createInlineEncryptedCredential(Buffer.from("os-encrypted-inline-forget-canary"));
      assert.notEqual(credential, null);
      if (!credential) return;
      const connected = replaceInlineCompatibleConnection({
        store,
        legacy: file,
        currentProjectRoot: root,
        projectInspection: inspection(root),
        authenticationOrigin: "pasted-api-key",
        expectedStoreRevision: null,
        baseUrl: "https://unknown-compatible.example/v1",
        model: "provider/exact-model",
        authorizedDataScope: NEW_SCOPE,
        credential,
        ids: deterministicIds(),
      });
      assert.equal(connected.kind, "ready");
      const cachePath = join(root, "model-catalogs.json");
      writeFileSync(cachePath, "inert-cache", "utf8");

      const result = forgetModelConnections({
        store,
        legacy: file,
        removeCache: () => { rmSync(cachePath, { force: true }); return !existsSync(cachePath); },
        removeAuthority: () => { rmSync(storePath, { force: true }); return !existsSync(storePath); },
        failpoint: (candidate) => {
          if (candidate === point) throw new Error("injected inline Forget stop");
        },
      });

      assert.equal(result.kind, "failed");
      assert.equal(file.text, null);
      if (point === "after-authority-delete") {
        assert.equal(existsSync(storePath), false);
      } else {
        const pending = store.read();
        assert.equal(pending.kind, "ready");
        assert.equal(pending.kind === "ready" ? pending.value.recovery.kind : "bad", "forget-pending");
        assert.equal(readFileSync(storePath, "utf8").includes(credential.ciphertextB64), false);
        assert.equal(loadOrMigrateLegacyConnection({ store, legacy: file, ids: deterministicIds() }).kind, "recovery-required");
      }
      assert.equal(existsSync(cachePath), point === "after-credential-delete" || point === "after-forget-pending");
    });
  }
});

test("inline Forget distinguishes verified unchanged write failure from uncertain recovery", async (t) => {
  await t.test("verified unchanged", (st) => {
    const { root, storePath, store } = fixture(st);
    const file = new FakeLegacyFile(null);
    const credential = createInlineEncryptedCredential(Buffer.from("os-encrypted-inline-unchanged"));
    assert.notEqual(credential, null);
    if (!credential) return;
    assert.equal(replaceInlineCompatibleConnection({
      store, legacy: file, currentProjectRoot: root, projectInspection: inspection(root),
      authenticationOrigin: "pasted-api-key", expectedStoreRevision: null,
      baseUrl: "https://unknown-compatible.example/v1", model: "provider/exact-model",
      authorizedDataScope: NEW_SCOPE, credential, ids: deterministicIds(),
    }).kind, "ready");
    const before = readFileSync(storePath);
    const failingStore = createModelConnectionsStore(storePath, {
      atomicWrite() { throw new Error("injected verified write failure"); },
    });
    const result = forgetModelConnections({
      store: failingStore,
      legacy: file,
      removeCache: () => { throw new Error("must not run"); },
      removeAuthority: () => { throw new Error("must not run"); },
    });
    assert.equal(result.kind, "failed");
    assert.equal(result.kind === "failed" ? result.stage : "bad", "credential");
    assert.match(result.kind === "failed" ? result.message : "", /saved connection is unchanged/);
    assert.deepEqual(readFileSync(storePath), before);
    assert.equal(loadOrMigrateLegacyConnection({
      store, legacy: file, currentProjectRoot: root, projectInspection: inspection(root), ids: deterministicIds(),
    }).kind, "ready");
  });

  await t.test("uncertain replacement", (st) => {
    const { root, storePath, store } = fixture(st);
    const file = new FakeLegacyFile(null);
    const credential = createInlineEncryptedCredential(Buffer.from("os-encrypted-inline-uncertain"));
    assert.notEqual(credential, null);
    if (!credential) return;
    assert.equal(replaceInlineCompatibleConnection({
      store, legacy: file, currentProjectRoot: root, projectInspection: inspection(root),
      authenticationOrigin: "pasted-api-key", expectedStoreRevision: null,
      baseUrl: "https://unknown-compatible.example/v1", model: "provider/exact-model",
      authorizedDataScope: NEW_SCOPE, credential, ids: deterministicIds(),
    }).kind, "ready");
    const uncertainStore = createModelConnectionsStore(storePath, {
      atomicWrite(filePath) {
        writeFileSync(filePath, "{uncertain-authority-replacement", "utf8");
        throw new Error("injected uncertain write failure");
      },
    });
    const result = forgetModelConnections({
      store: uncertainStore,
      legacy: file,
      removeCache: () => { throw new Error("must not run"); },
      removeAuthority: () => { throw new Error("must not run"); },
    });
    assert.equal(result.kind, "failed");
    assert.equal(result.kind === "failed" ? result.stage : "bad", "forget-pending");
    assert.equal(loadOrMigrateLegacyConnection({ store: uncertainStore, legacy: file }).kind, "recovery-required");
  });
});

test("failed credential deletion changes no authority and successful Forget removes secret, cache, then authority", (t) => {
  const { root, storePath, store } = fixture(t);
  const file = new FakeLegacyFile(legacy());
  assert.equal(loadOrMigrateLegacyConnection({ store, legacy: file, ids: deterministicIds() }).kind, "ready");
  const before = readFileSync(storePath);
  const cachePath = join(root, "model-catalogs.json");
  writeFileSync(cachePath, "cache", "utf8");
  file.failRemoval = true;
  const refused = forgetModelConnections({
    store,
    legacy: file,
    removeCache: () => { throw new Error("must not run"); },
    removeAuthority: () => { throw new Error("must not run"); },
  });
  assert.equal(refused.kind, "failed");
  assert.equal(refused.kind === "failed" ? refused.stage : "bad", "credential");
  assert.deepEqual(readFileSync(storePath), before);
  assert.equal(existsSync(cachePath), true);

  file.failRemoval = false;
  const completed = forgetModelConnections({
    store,
    legacy: file,
    removeCache: () => { rmSync(cachePath, { force: true }); return !existsSync(cachePath); },
    removeAuthority: () => { rmSync(storePath, { force: true }); return !existsSync(storePath); },
  });
  assert.deepEqual(completed, { kind: "deleted" });
  assert.equal(file.text, null);
  assert.equal(existsSync(cachePath), false);
  assert.equal(existsSync(storePath), false);
});

test("corrupt recovery erases credential first, preserves authority on credential failure, and ends disconnected", (t) => {
  const { root, storePath, store } = fixture(t);
  const cachePath = join(root, "model-catalogs.json");
  writeFileSync(storePath, "{truncated", "utf8");
  writeFileSync(cachePath, "cache", "utf8");
  const file = new FakeLegacyFile("{malformed-secret-canary");
  file.failRemoval = true;
  const refused = eraseModelConnectionsForRecovery({
    store,
    legacy: file,
    removeCache: () => { throw new Error("must not run"); },
    removeAuthority: () => { throw new Error("must not run"); },
  });
  assert.equal(refused.kind, "failed");
  assert.equal(refused.kind === "failed" ? refused.stage : "bad", "credential");
  assert.equal(existsSync(storePath), true);
  assert.equal(existsSync(cachePath), true);
  assert.equal(JSON.stringify(refused).includes("malformed-secret-canary"), false);

  file.failRemoval = false;
  const erased = eraseModelConnectionsForRecovery({
    store,
    legacy: file,
    removeCache: () => { rmSync(cachePath, { force: true }); return !existsSync(cachePath); },
    removeAuthority: () => { rmSync(storePath, { force: true }); return !existsSync(storePath); },
  });
  assert.deepEqual(erased, { kind: "deleted" });
  assert.equal(file.text, null);
  assert.equal(existsSync(cachePath), false);
  assert.equal(existsSync(storePath), false);
});

test("recovery marker keeps malformed legacy-only state fail-closed until cache cleanup", async (t) => {
  for (const point of ["after-credential-delete", "after-cache-delete"] as const) {
    await t.test(point, (st) => {
      const { root, storePath, store } = fixture(st);
      const cachePath = join(root, "model-catalogs.json");
      writeFileSync(cachePath, "cache", "utf8");
      const file = new FakeLegacyFile("{malformed-secret-canary");
      const result = eraseModelConnectionsForRecovery({
        store,
        legacy: file,
        removeCache: () => { rmSync(cachePath, { force: true }); return !existsSync(cachePath); },
        removeAuthority: () => { rmSync(storePath, { force: true }); return !existsSync(storePath); },
        failpoint: (candidate) => {
          if (candidate === point) throw new Error("injected recovery stop");
        },
      });
      assert.equal(result.kind, "failed");
      assert.equal(file.text, LEGACY_CONDUCTOR_RECOVERY_MARKER);
      assert.equal(file.text.includes("secret-canary"), false);
      assert.equal(loadOrMigrateLegacyConnection({
        store, legacy: file, currentProjectRoot: root, projectInspection: inspection(root), ids: deterministicIds(),
      }).kind, "recovery-required");
      assert.equal(existsSync(cachePath), point === "after-credential-delete");
    });
  }
});

test("inline collision stays recovery-required across pending-write failure and retry", (t) => {
  const { root, storePath, store } = fixture(t);
  const file = new FakeLegacyFile(null);
  const credential = createInlineEncryptedCredential(Buffer.from("os-encrypted-inline-collision"));
  assert.notEqual(credential, null);
  if (!credential) return;
  const connected = replaceInlineCompatibleConnection({
    store,
    legacy: file,
    currentProjectRoot: root,
    projectInspection: inspection(root),
    authenticationOrigin: "pasted-api-key",
    expectedStoreRevision: null,
    baseUrl: "https://unknown-compatible.example/v1",
    model: "provider/exact-model",
    authorizedDataScope: NEW_SCOPE,
    credential,
    ids: deterministicIds(),
  });
  assert.equal(connected.kind, "ready");
  file.text = "{unexpected-legacy-secret-canary";
  const cachePath = join(root, "model-catalogs.json");
  writeFileSync(cachePath, "cache", "utf8");
  const failingStore = createModelConnectionsStore(storePath, {
    newRevision: () => "store-failed-revision",
    atomicWrite() { throw new Error("injected pending write failure"); },
  });

  const failed = eraseModelConnectionsForRecovery({
    store: failingStore,
    legacy: file,
    removeCache: () => { throw new Error("cache must remain"); },
    removeAuthority: () => { throw new Error("authority must remain"); },
  });
  assert.equal(failed.kind, "failed");
  assert.equal(failed.kind === "failed" ? failed.stage : "bad", "forget-pending");
  assert.equal(file.text, LEGACY_CONDUCTOR_RECOVERY_MARKER);
  assert.equal(file.text.includes("secret-canary"), false);
  assert.equal(existsSync(cachePath), true);
  assert.equal(loadOrMigrateLegacyConnection({
    store, legacy: file, currentProjectRoot: root, projectInspection: inspection(root), ids: deterministicIds(),
  }).kind, "recovery-required");

  const retried = eraseModelConnectionsForRecovery({
    store,
    legacy: file,
    removeCache: () => { rmSync(cachePath, { force: true }); return !existsSync(cachePath); },
    removeAuthority: () => { rmSync(storePath, { force: true }); return !existsSync(storePath); },
  });
  assert.deepEqual(retried, { kind: "deleted" });
  assert.equal(file.text, null);
  assert.equal(existsSync(cachePath), false);
  assert.equal(existsSync(storePath), false);
});

test("inline collision retains marker after verified pending rewrite until retry completes", (t) => {
  const { root, storePath, store } = fixture(t);
  const file = new FakeLegacyFile(null);
  const credential = createInlineEncryptedCredential(Buffer.from("os-encrypted-inline-pending"));
  assert.notEqual(credential, null);
  if (!credential) return;
  const connected = replaceInlineCompatibleConnection({
    store,
    legacy: file,
    currentProjectRoot: root,
    projectInspection: inspection(root),
    authenticationOrigin: "pasted-api-key",
    expectedStoreRevision: null,
    baseUrl: "https://unknown-compatible.example/v1",
    model: "provider/exact-model",
    authorizedDataScope: NEW_SCOPE,
    credential,
    ids: deterministicIds(),
  });
  assert.equal(connected.kind, "ready");
  file.text = "{unexpected-legacy-secret-canary";
  const cachePath = join(root, "model-catalogs.json");
  writeFileSync(cachePath, "cache", "utf8");

  const stopped = eraseModelConnectionsForRecovery({
    store,
    legacy: file,
    removeCache: () => { throw new Error("cache must remain"); },
    removeAuthority: () => { throw new Error("authority must remain"); },
    failpoint: (point) => {
      if (point === "after-forget-pending") throw new Error("injected recovery stop");
    },
  });
  assert.equal(stopped.kind, "failed");
  assert.equal(file.text, LEGACY_CONDUCTOR_RECOVERY_MARKER);
  const pending = store.read();
  assert.equal(pending.kind, "ready");
  assert.equal(pending.kind === "ready" ? pending.value.recovery.kind : "bad", "forget-pending");
  assert.equal(loadOrMigrateLegacyConnection({ store, legacy: file, ids: deterministicIds() }).kind, "recovery-required");

  const retried = eraseModelConnectionsForRecovery({
    store,
    legacy: file,
    removeCache: () => { rmSync(cachePath, { force: true }); return !existsSync(cachePath); },
    removeAuthority: () => { rmSync(storePath, { force: true }); return !existsSync(storePath); },
  });
  assert.deepEqual(retried, { kind: "deleted" });
});
