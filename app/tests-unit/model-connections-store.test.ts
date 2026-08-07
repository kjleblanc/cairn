import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MODEL_CONNECTIONS_SCHEMA_VERSION, type ProjectAuthorityId } from "../src/shared/model-connections.js";
import type { ProjectAuthorityEntry } from "../src/main/connections/project-authority.js";
import {
  MODEL_CONNECTIONS_STORE_LIMITS,
  createInlineEncryptedCredential,
  createModelConnectionsStore,
  decodeInlineEncryptedCredential,
  modelConnectionsStoreContent,
  parseModelConnectionsStore,
  serializeModelConnectionsStore,
  type ModelConnectionsStoreContent,
  type ModelConnectionsStoreDependencies,
  type ModelConnectionsStoreV1,
  type StoredCompatibleConnection,
} from "../src/main/connections/store.js";
import {
  CONNECTION_SECRET_LIMITS,
  decryptBoundedConnectionSecret,
  encryptBoundedConnectionSecret,
} from "../src/main/connections/secrets.js";

const CONNECTION_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222" as ProjectAuthorityId;
const SCOPE = "Your messages and this project's bounded task context. Never credentials.";
const LEGACY_DIGEST = "a".repeat(64);

const PROJECT: ProjectAuthorityEntry = Object.freeze({
  projectAuthorityId: PROJECT_ID,
  canonicalRootDigest: "b".repeat(64),
  filesystemIdentityDigest: "c".repeat(64),
  authorityRevision: "33333333-3333-4333-8333-333333333333",
});

const LEGACY_CONNECTION: StoredCompatibleConnection = Object.freeze({
  kind: "openai-compatible",
  connectionId: CONNECTION_ID,
  driverId: "openai-compatible",
  baseUrl: "https://openrouter.ai/api/v1",
  authenticationOrigin: "legacy-unknown",
  authenticationRevision: "auth-r1",
  credential: Object.freeze({
    kind: "legacy-conductor-file",
    file: "conductor.json",
    ciphertextSha256: LEGACY_DIGEST,
  }),
  legacyAuthorizedDataScope: SCOPE,
  authorizedDataScope: SCOPE,
  billingRevision: "billing-r1",
  capabilityRevision: "capability-r1",
  routingPolicyRevision: "routing-r1",
});

function legacyContent(): ModelConnectionsStoreContent {
  return {
    recovery: { kind: "none" },
    connections: [LEGACY_CONNECTION],
    conductorAssignment: {
      role: "conductor",
      mode: "pinned",
      connectionId: CONNECTION_ID,
      modelId: "moonshotai/kimi-k2",
      assignmentRevision: "assignment-r1",
    },
    workerAssignment: null,
    linkGrants: [{
      grantRevision: "link-r1",
      connectionId: CONNECTION_ID,
      authenticationRevision: "auth-r1",
      authorizationBasis: "legacy-pinned-bridge",
      metadataScope: [],
      metadataCostCertainty: "unknown",
      routingPolicyRevision: "routing-r1",
      grantedAt: "2026-08-06T12:00:00.000Z",
    }],
    conductorGrants: [{
      grantRevision: "conductor-r1",
      projectAuthorityId: PROJECT_ID,
      connectionId: CONNECTION_ID,
      authenticationRevision: "auth-r1",
      authorizationBasis: "legacy-pinned-bridge",
      authorizedDataScope: SCOPE,
      billingKind: "unknown",
      billingRevision: "billing-r1",
      routingPolicyRevision: "routing-r1",
      modelAuthorization: { mode: "pinned", modelId: "moonshotai/kimi-k2" },
      grantedAt: "2026-08-06T12:00:00.000Z",
    }],
    projectAuthorities: [PROJECT],
  };
}

function value(content: ModelConnectionsStoreContent, storeRevision = "store-r1"): ModelConnectionsStoreV1 {
  return {
    version: MODEL_CONNECTIONS_SCHEMA_VERSION,
    storeRevision,
    ...content,
  };
}

function revisions(...items: string[]): () => string {
  let index = 0;
  return () => items[index++] ?? `store-r${index + 1}`;
}

function fixture(
  t: test.TestContext,
  dependencies: ModelConnectionsStoreDependencies = {},
): { root: string; path: string; store: ReturnType<typeof createModelConnectionsStore> } {
  const root = mkdtempSync(join(tmpdir(), "cairn-model-store-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const path = join(root, "model-connections.json");
  return { root, path, store: createModelConnectionsStore(path, dependencies) };
}

test("a strict v1 authority store lands once in canonical bytes and reads back detached", (t) => {
  const { path, store } = fixture(t, { newRevision: revisions("store-r1") });
  assert.deepEqual(store.read(), { kind: "absent" });

  const result = store.write(null, legacyContent());
  assert.equal(result.kind, "written");
  if (result.kind !== "written") return;
  const raw = readFileSync(path, "utf8");
  assert.equal(raw, serializeModelConnectionsStore(result.value));
  assert.equal(raw.endsWith("\n"), true);
  assert.equal(raw.includes("keyB64"), false);
  assert.equal(raw.includes(LEGACY_DIGEST), true, "only the expected ciphertext digest is stored");
  assert.equal(raw.indexOf('"conductorAssignment"'), 1, "root keys use one sorted canonical order");

  const loaded = store.read();
  assert.equal(loaded.kind, "ready");
  if (loaded.kind !== "ready") return;
  assert.deepEqual(loaded.value, result.value);
  assert.equal(Object.isFrozen(loaded.value), true);
  assert.equal(Object.isFrozen(loaded.value.connections), true);
  assert.equal(Object.isFrozen(loaded.value.connections[0]?.credential), true);
});

test("the exact parser rejects unknown keys, Auto, broken cross-authority, duplicates, and caps", () => {
  const good = value(legacyContent());
  assert.equal(parseModelConnectionsStore(good).kind, "valid");
  assert.equal(parseModelConnectionsStore({ ...good, future: true }).kind, "malformed");
  const missing = { ...good } as Record<string, unknown>;
  delete missing.recovery;
  assert.equal(parseModelConnectionsStore(missing).kind, "malformed");
  assert.equal(parseModelConnectionsStore({
    ...good,
    conductorAssignment: {
      role: "conductor",
      mode: "auto",
      connectionId: CONNECTION_ID,
      policyVersion: "auto-v1",
      assignmentRevision: "assignment-r1",
    },
  }).kind, "malformed");
  assert.equal(parseModelConnectionsStore({
    ...good,
    connections: [{ ...LEGACY_CONNECTION, hiddenAuthority: true }],
  }).kind, "malformed");
  assert.equal(parseModelConnectionsStore({
    ...good,
    conductorGrants: [{ ...legacyContent().conductorGrants[0], billingRevision: "other-billing" }],
  }).kind, "malformed");
  assert.equal(parseModelConnectionsStore({
    ...good,
    connections: [LEGACY_CONNECTION, { ...LEGACY_CONNECTION }],
  }).kind, "malformed");
  assert.equal(parseModelConnectionsStore({
    ...good,
    connections: new Array(MODEL_CONNECTIONS_STORE_LIMITS.connections + 1).fill(LEGACY_CONNECTION),
  }).kind, "malformed");
  assert.equal(parseModelConnectionsStore({
    ...good,
    connections: [{ ...LEGACY_CONNECTION, authorizedDataScope: "A widened scope" }],
    conductorGrants: [{ ...legacyContent().conductorGrants[0], authorizedDataScope: "A widened scope" }],
  }).kind, "malformed", "legacy bridge authority cannot exceed preserved legacy scope");
});

test("disk reads reject alternate JSON spelling, duplicate keys, unknown versions, and oversized files", (t) => {
  const { path, store } = fixture(t, { newRevision: revisions("store-r1") });
  const written = store.write(null, legacyContent());
  assert.equal(written.kind, "written");
  const raw = readFileSync(path, "utf8");

  writeFileSync(path, JSON.stringify(JSON.parse(raw), null, 2), "utf8");
  assert.deepEqual(store.read(), {
    kind: "recovery-required",
    code: "MODEL_CONNECTIONS_RECOVERY_REQUIRED",
  });

  writeFileSync(path, raw.replace("{", `{"version":"${MODEL_CONNECTIONS_SCHEMA_VERSION}",`), "utf8");
  assert.equal(store.read().kind, "recovery-required", "duplicate JSON keys are never last-one-wins authority");

  const unknown = raw.replace(MODEL_CONNECTIONS_SCHEMA_VERSION, "cairn-model-connections/v99");
  writeFileSync(path, unknown, "utf8");
  assert.equal(store.read().kind, "recovery-required");

  writeFileSync(path, Buffer.alloc(MODEL_CONNECTIONS_STORE_LIMITS.bytes + 1, 0x20));
  assert.equal(store.read().kind, "recovery-required");
});

test("only ENOENT is absence; an unreadable authority path requires recovery", (t) => {
  const { path } = fixture(t);
  const unreadable = createModelConnectionsStore(path, {
    exists() { throw Object.assign(new Error("injected access failure"), { code: "EACCES" }); },
  });
  assert.deepEqual(unreadable.read(), {
    kind: "recovery-required",
    code: "MODEL_CONNECTIONS_RECOVERY_REQUIRED",
  });
});

test("stale writers lose and a reentrant synchronous mutation reports busy", (t) => {
  const { store } = fixture(t, { newRevision: revisions("store-r1", "store-r2") });
  const initial = store.write(null, legacyContent());
  assert.equal(initial.kind, "written");
  if (initial.kind !== "written") return;

  assert.deepEqual(store.mutate("stale-r0", () => legacyContent()), {
    kind: "stale",
    code: "MODEL_CONNECTIONS_STORE_STALE",
  });
  let nested: ReturnType<typeof store.mutate> | null = null;
  const outer = store.mutate(initial.value.storeRevision, (current) => {
    nested = store.mutate(current.storeRevision, () => modelConnectionsStoreContent(current));
    return modelConnectionsStoreContent(current);
  });
  assert.deepEqual(nested, { kind: "busy", code: "MODEL_CONNECTIONS_STORE_BUSY" });
  assert.equal(outer.kind, "written");
  assert.equal(outer.kind === "written" ? outer.value.storeRevision : null, "store-r2");
  assert.equal(store.mutate(initial.value.storeRevision, () => legacyContent()).kind, "stale");
});

test("forget-pending blocks every ordinary store write without changing bytes", (t) => {
  const { path, store } = fixture(t, { newRevision: revisions("store-r1", "store-r2", "store-r3") });
  const initial = store.write(null, legacyContent());
  assert.equal(initial.kind, "written");
  if (initial.kind !== "written") return;
  const pending = store.mutate(initial.value.storeRevision, (current) => ({
    ...modelConnectionsStoreContent(current),
    recovery: {
      kind: "forget-pending",
      connectionId: CONNECTION_ID,
      credentialKind: "legacy-conductor-file",
    },
  }));
  assert.equal(pending.kind, "written");
  if (pending.kind !== "written") return;
  const before = readFileSync(path);
  assert.deepEqual(store.write(pending.value.storeRevision, legacyContent()), {
    kind: "recovery-required",
    code: "MODEL_CONNECTIONS_RECOVERY_REQUIRED",
  });
  assert.deepEqual(readFileSync(path), before);
});

test("an atomic replacement failure preserves the previous canonical bytes", (t) => {
  const { path, store } = fixture(t, { newRevision: revisions("store-r1") });
  const initial = store.write(null, legacyContent());
  assert.equal(initial.kind, "written");
  if (initial.kind !== "written") return;
  const before = readFileSync(path);
  const failing = createModelConnectionsStore(path, {
    newRevision: revisions("store-r2"),
    atomicWrite() {
      throw new Error("inert injected atomic failure");
    },
  });
  assert.deepEqual(failing.write(initial.value.storeRevision, legacyContent()), {
    kind: "write-failed",
    code: "MODEL_CONNECTIONS_STORE_WRITE_FAILED",
  });
  assert.deepEqual(readFileSync(path), before);
});

test("failpoints report fixed outcomes without leaking thrown secret text", (t) => {
  const { path, store } = fixture(t, { newRevision: revisions("store-r1") });
  const initial = store.write(null, legacyContent());
  assert.equal(initial.kind, "written");
  if (initial.kind !== "written") return;
  const canary = "do-not-echo-this-inert-secret";

  const beforeWrite = createModelConnectionsStore(path, {
    newRevision: revisions("store-r2"),
    failpoint(point) {
      if (point === "before-atomic-write") throw new Error(canary);
    },
  });
  const rejected = beforeWrite.mutate(
    initial.value.storeRevision,
    (current) => modelConnectionsStoreContent(current),
  );
  assert.deepEqual(rejected, {
    kind: "write-failed",
    code: "MODEL_CONNECTIONS_STORE_WRITE_FAILED",
  });
  assert.equal(JSON.stringify(rejected).includes(canary), false);

  const afterWrite = createModelConnectionsStore(path, {
    newRevision: revisions("store-r2"),
    failpoint(point) {
      if (point === "after-atomic-write") throw new Error(canary);
    },
  });
  const uncertain = afterWrite.mutate(
    initial.value.storeRevision,
    (current) => modelConnectionsStoreContent(current),
  );
  assert.deepEqual(uncertain, {
    kind: "recovery-required",
    code: "MODEL_CONNECTIONS_RECOVERY_REQUIRED",
  });
  assert.equal(JSON.stringify(uncertain).includes(canary), false);
  const recovered = createModelConnectionsStore(path).read();
  assert.equal(recovered.kind, "ready");
  assert.equal(recovered.kind === "ready" ? recovered.value.storeRevision : null, "store-r2");
});

test("a mismatched verified readback fails closed even when the actual replacement is valid", (t) => {
  const { path, store } = fixture(t, { newRevision: revisions("store-r1") });
  const initial = store.write(null, legacyContent());
  assert.equal(initial.kind, "written");
  if (initial.kind !== "written") return;
  let reads = 0;
  const mismatched = createModelConnectionsStore(path, {
    newRevision: revisions("store-r2"),
    readBytes(filePath) {
      reads += 1;
      return reads === 2 ? Buffer.from("{}", "utf8") : readFileSync(filePath);
    },
  });
  assert.deepEqual(mismatched.mutate(
    initial.value.storeRevision,
    (current) => modelConnectionsStoreContent(current),
  ), {
    kind: "recovery-required",
    code: "MODEL_CONNECTIONS_RECOVERY_REQUIRED",
  });
  const restarted = createModelConnectionsStore(path);
  const loaded = restarted.read();
  assert.equal(loaded.kind, "ready", "a fresh strict read can prove the actual bytes after restart");
  assert.equal(loaded.kind === "ready" ? loaded.value.storeRevision : null, "store-r2");
});

test("inline encrypted credentials are canonical, digest-bound, bounded, and main-only", () => {
  const ciphertextB64 = Buffer.from("inert encrypted credential canary", "utf8").toString("base64");
  const digest = createHash("sha256").update(Buffer.from(ciphertextB64, "base64")).digest("hex");
  assert.deepEqual(createInlineEncryptedCredential(Buffer.from(ciphertextB64, "base64")), {
    kind: "inline-encrypted",
    ciphertextB64,
    ciphertextSha256: digest,
  });
  assert.equal(createInlineEncryptedCredential(Buffer.alloc(0)), null);
  const content = legacyContent();
  const inlineConnection: StoredCompatibleConnection = {
    ...LEGACY_CONNECTION,
    authenticationOrigin: "pasted-api-key",
    credential: { kind: "inline-encrypted", ciphertextB64, ciphertextSha256: digest },
    legacyAuthorizedDataScope: null,
  };
  const explicit: ModelConnectionsStoreContent = {
    ...content,
    connections: [inlineConnection],
    linkGrants: content.linkGrants.map((grant) => ({ ...grant, authorizationBasis: "explicit" as const })),
    conductorGrants: content.conductorGrants.map((grant) => ({ ...grant, authorizationBasis: "explicit" as const })),
  };
  assert.equal(parseModelConnectionsStore(value(explicit)).kind, "valid");

  const badDigest = value({
    ...explicit,
    connections: [{
      ...inlineConnection,
      credential: { kind: "inline-encrypted", ciphertextB64, ciphertextSha256: "d".repeat(64) },
    }],
  });
  const malformed = parseModelConnectionsStore(badDigest);
  assert.deepEqual(malformed, { kind: "malformed" });
  assert.equal(JSON.stringify(malformed).includes(ciphertextB64), false, "fixed parser results never echo ciphertext");

  assert.equal(parseModelConnectionsStore(value({
    ...explicit,
    connections: [{
      ...inlineConnection,
      credential: { kind: "inline-encrypted", ciphertextB64: `${ciphertextB64}=`, ciphertextSha256: digest },
    }],
  })).kind, "malformed");

  const oversizedCiphertextB64 = "A".repeat(MODEL_CONNECTIONS_STORE_LIMITS.inlineCiphertextBase64 + 4);
  const oversizedDigest = createHash("sha256")
    .update(Buffer.from(oversizedCiphertextB64, "base64"))
    .digest("hex");
  assert.equal(parseModelConnectionsStore(value({
    ...explicit,
    connections: [{
      ...inlineConnection,
      credential: {
        kind: "inline-encrypted",
        ciphertextB64: oversizedCiphertextB64,
        ciphertextSha256: oversizedDigest,
      },
    }],
  })).kind, "malformed");
});

test("forget-pending can preserve authority references after an inline secret-first rewrite", () => {
  const content = legacyContent();
  const pending: ModelConnectionsStoreContent = {
    ...content,
    recovery: {
      kind: "forget-pending",
      connectionId: CONNECTION_ID,
      credentialKind: "inline-encrypted",
    },
    connections: [],
  };
  assert.equal(parseModelConnectionsStore(value(pending)).kind, "valid");
  assert.equal(parseModelConnectionsStore(value({
    ...pending,
    connections: [{
      ...LEGACY_CONNECTION,
      authenticationOrigin: "pasted-api-key",
      credential: createInlineEncryptedCredential(Buffer.from("still-present"))!,
      legacyAuthorizedDataScope: null,
    }],
  })).kind, "malformed", "pending inline recovery cannot retain ciphertext");
  assert.equal(parseModelConnectionsStore(value({
    ...pending,
    conductorAssignment: null,
    linkGrants: [],
    conductorGrants: [],
  })).kind, "malformed", "a pending recovery target must still be evidenced by metadata");
});

test("plaintext and ciphertext caps run before fake OS credential adapters", () => {
  let encryptions = 0;
  const oversizedPlaintext = "x".repeat(CONNECTION_SECRET_LIMITS.plaintextBytes + 1);
  assert.equal(encryptBoundedConnectionSecret(oversizedPlaintext, {
    encrypt: () => { encryptions += 1; return Buffer.from("must-not-run"); },
  }), null);
  assert.equal(encryptions, 0);

  const encrypted = encryptBoundedConnectionSecret("inert-test-key", {
    encrypt: () => { encryptions += 1; return Buffer.from("os-encrypted-inert-key"); },
  });
  assert.notEqual(encrypted, null);
  assert.equal(encryptions, 1);
  encrypted?.fill(0);

  let decryptions = 0;
  assert.equal(decryptBoundedConnectionSecret(
    Buffer.alloc(CONNECTION_SECRET_LIMITS.ciphertextBytes + 1),
    { decrypt: () => { decryptions += 1; return "must-not-run"; } },
  ), null);
  assert.equal(decryptions, 0);
  assert.equal(decryptBoundedConnectionSecret(Buffer.from("bounded-ciphertext"), {
    decrypt: () => { decryptions += 1; return oversizedPlaintext; },
  }), null, "oversized decrypted plaintext is never accepted as a provider key");
  assert.equal(decryptions, 1);

  assert.equal(decodeInlineEncryptedCredential({
    kind: "inline-encrypted",
    ciphertextB64: "A".repeat(MODEL_CONNECTIONS_STORE_LIMITS.inlineCiphertextBase64 + 4),
    ciphertextSha256: "a".repeat(64),
  }), null);
});
