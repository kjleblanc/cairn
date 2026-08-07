import { randomUUID } from "node:crypto";
import type { ConductorGrant, LinkMetadataGrant, ProjectAuthorityId } from "../../shared/model-connections.js";
import {
  inspectProjectRoot,
  registerProjectAuthority,
  resolveProjectAuthority,
  type ProjectAuthorityEntry,
  type ProjectAuthorityInspectionDeps,
  type ProjectSnapshot,
} from "./project-authority.js";
import {
  armLegacyConductorRecoveryMarker,
  createLegacyConductorSecretReference,
  deleteReferencedLegacyConductorSecret,
  eraseLegacyConductorSecretForRecovery,
  legacyCiphertextSha256,
  readLegacyConductorConnection,
  type LegacyConductorConnection,
  type LegacyConductorFileReader,
  type LegacyConductorFileAccess,
} from "./secrets.js";
import {
  modelConnectionsStoreContent,
  type CompatibleAuthenticationOrigin,
  type InlineEncryptedCredential,
  type LegacyConductorCredentialReference,
  type ModelConnectionsStore,
  type ModelConnectionsStoreContent,
  type ModelConnectionsStoreV1,
  type PinnedConductorAssignment,
  type StoredCompatibleConnection,
} from "./store.js";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type CompatibleConnectionAuthority = Readonly<{
  storeRevision: string;
  connectionId: string;
  baseUrl: string;
  model: string;
  authenticationOrigin: CompatibleAuthenticationOrigin;
  authenticationRevision: string;
  credential: StoredCompatibleConnection["credential"];
  legacyAuthorizedDataScope: string | null;
  authorizedDataScope: string | null;
  projectAuthorityId: ProjectAuthorityId | null;
  projectAuthorized: boolean;
}>;

export type ConnectionAuthorityLoadResult =
  | Readonly<{ kind: "absent" }>
  | Readonly<{ kind: "ready"; value: CompatibleConnectionAuthority }>
  | Readonly<{
      kind: "project-reauthorization-required";
      reason: "moved" | "replaced" | "ambiguous" | "unavailable" | "unrecognized";
    }>
  | Readonly<{ kind: "recovery-required"; code: "MODEL_CONNECTIONS_RECOVERY_REQUIRED" }>;

export type ConnectionAuthorityMutationResult =
  | Readonly<{ kind: "ready"; value: CompatibleConnectionAuthority }>
  | Readonly<{ kind: "stale"; code: "MODEL_CONNECTIONS_STORE_STALE" }>
  | Readonly<{ kind: "write-failed"; code: "MODEL_CONNECTIONS_STORE_WRITE_FAILED" }>
  | Readonly<{ kind: "project-reauthorization-required"; reason: "unavailable" }>
  | Readonly<{ kind: "recovery-required"; code: "MODEL_CONNECTIONS_RECOVERY_REQUIRED" }>;

export interface ConnectionMigrationIds {
  readonly uuid?: () => string;
  readonly now?: () => string;
}

/** Main-only identity captured before asynchronous authorization work. */
export type ProjectConnectionExpectation = Readonly<{
  canonicalRootDigest: string;
  filesystemIdentityDigest: string;
}>;

export interface LoadOrMigrateLegacyOptions {
  readonly store: ModelConnectionsStore;
  readonly legacy: LegacyConductorFileReader;
  readonly currentProjectRoot?: string | null;
  readonly projectInspection?: ProjectAuthorityInspectionDeps;
  readonly expectedProject?: ProjectConnectionExpectation | null;
  readonly ids?: ConnectionMigrationIds;
}

export interface ReplaceCompatibleConnectionOptions extends LoadOrMigrateLegacyOptions {
  readonly authenticationOrigin: Exclude<CompatibleAuthenticationOrigin, "legacy-unknown">;
  readonly expectedStoreRevision: string | null;
}

export interface ReplaceInlineCompatibleConnectionOptions extends LoadOrMigrateLegacyOptions {
  readonly authenticationOrigin: Exclude<CompatibleAuthenticationOrigin, "legacy-unknown">;
  readonly expectedStoreRevision: string | null;
  readonly baseUrl: string;
  readonly model: string;
  readonly authorizedDataScope: string;
  readonly credential: InlineEncryptedCredential;
}

const RECOVERY_REQUIRED = Object.freeze({
  kind: "recovery-required",
  code: "MODEL_CONNECTIONS_RECOVERY_REQUIRED",
} as const);
const WRITE_FAILED = Object.freeze({
  kind: "write-failed",
  code: "MODEL_CONNECTIONS_STORE_WRITE_FAILED",
} as const);

function generatedUuid(ids: ConnectionMigrationIds): string {
  const value = ids.uuid?.() ?? randomUUID();
  if (!UUID_V4.test(value)) throw new Error("MODEL_CONNECTIONS_ID_GENERATION_FAILED");
  return value;
}

function generatedTimestamp(ids: ConnectionMigrationIds): string {
  const value = ids.now?.() ?? new Date().toISOString();
  if (new Date(value).toISOString() !== value) throw new Error("MODEL_CONNECTIONS_TIME_GENERATION_FAILED");
  return value;
}

function storedReference(
  legacy: LegacyConductorConnection,
): LegacyConductorCredentialReference | null {
  const reference = createLegacyConductorSecretReference(legacy);
  return reference === null ? null : Object.freeze({
    kind: "legacy-conductor-file",
    file: reference.fileName,
    ciphertextSha256: reference.ciphertextSha256,
  });
}

function registerSnapshot(
  entries: readonly ProjectAuthorityEntry[],
  snapshot: ProjectSnapshot,
  ids: ConnectionMigrationIds,
): Readonly<{ entry: ProjectAuthorityEntry; entries: readonly ProjectAuthorityEntry[] }> {
  return registerProjectAuthority(entries, snapshot, {
    projectAuthorityId: () => generatedUuid(ids),
    authorityRevision: () => generatedUuid(ids),
  });
}

function assignment(connectionId: string, model: string, ids: ConnectionMigrationIds): PinnedConductorAssignment {
  return Object.freeze({
    role: "conductor",
    mode: "pinned",
    connectionId,
    modelId: model,
    assignmentRevision: generatedUuid(ids),
  });
}

function linkGrant(
  connection: StoredCompatibleConnection,
  basis: "explicit" | "legacy-pinned-bridge",
  ids: ConnectionMigrationIds,
  grantedAt: string,
): LinkMetadataGrant {
  return Object.freeze({
    grantRevision: generatedUuid(ids),
    connectionId: connection.connectionId,
    authenticationRevision: connection.authenticationRevision,
    authorizationBasis: basis,
    metadataScope: Object.freeze([]),
    metadataCostCertainty: "unknown",
    routingPolicyRevision: connection.routingPolicyRevision,
    grantedAt,
  });
}

function explicitLinkGrantStillMatches(
  grant: LinkMetadataGrant,
  connection: StoredCompatibleConnection,
): boolean {
  return grant.connectionId === connection.connectionId
    && grant.authenticationRevision === connection.authenticationRevision
    && grant.authorizationBasis === "explicit"
    && grant.metadataScope.length === 0
    && grant.metadataCostCertainty === "unknown"
    && grant.routingPolicyRevision === connection.routingPolicyRevision;
}

function conductorGrant(
  connection: StoredCompatibleConnection,
  pinned: PinnedConductorAssignment,
  projectAuthorityId: ProjectAuthorityId,
  basis: "explicit" | "legacy-pinned-bridge",
  ids: ConnectionMigrationIds,
  grantedAt: string,
): ConductorGrant | null {
  if (connection.authorizedDataScope === null) return null;
  return Object.freeze({
    grantRevision: generatedUuid(ids),
    projectAuthorityId,
    connectionId: connection.connectionId,
    authenticationRevision: connection.authenticationRevision,
    authorizationBasis: basis,
    authorizedDataScope: connection.authorizedDataScope,
    billingKind: "unknown",
    billingRevision: connection.billingRevision,
    routingPolicyRevision: connection.routingPolicyRevision,
    modelAuthorization: Object.freeze({ mode: "pinned", modelId: pinned.modelId }),
    grantedAt,
  });
}

function grantMatchesPinnedConnection(
  grant: ConductorGrant,
  connection: StoredCompatibleConnection,
  pinned: PinnedConductorAssignment,
): boolean {
  return grant.connectionId === connection.connectionId
    && grant.authenticationRevision === connection.authenticationRevision
    && grant.authorizedDataScope === connection.authorizedDataScope
    && grant.billingKind === "unknown"
    && grant.billingRevision === connection.billingRevision
    && grant.routingPolicyRevision === connection.routingPolicyRevision
    && grant.modelAuthorization.mode === "pinned"
    && grant.modelAuthorization.modelId === pinned.modelId;
}

function projectForMigration(
  root: string | null | undefined,
  inspection: ProjectAuthorityInspectionDeps | undefined,
  ids: ConnectionMigrationIds,
  expectedProject?: ProjectConnectionExpectation | null,
): Readonly<{ snapshot: ProjectSnapshot | null; entries: readonly ProjectAuthorityEntry[]; id: ProjectAuthorityId | null }>
  | null {
  if (!root) return Object.freeze({ snapshot: null, entries: Object.freeze([]), id: null });
  const snapshot = inspectProjectRoot(root, inspection);
  if (!snapshot) return null;
  if (expectedProject !== undefined
    && (expectedProject === null
      || snapshot.canonicalRootDigest !== expectedProject.canonicalRootDigest
      || snapshot.filesystemIdentityDigest !== expectedProject.filesystemIdentityDigest)) return null;
  const registered = registerSnapshot([], snapshot, ids);
  return Object.freeze({ snapshot, entries: registered.entries, id: registered.entry.projectAuthorityId });
}

function projectForExplicitAuthorization(
  entries: readonly ProjectAuthorityEntry[],
  root: string | null | undefined,
  inspection: ProjectAuthorityInspectionDeps | undefined,
  ids: ConnectionMigrationIds,
  expectedProject?: ProjectConnectionExpectation | null,
): Readonly<{ snapshot: ProjectSnapshot | null; entries: readonly ProjectAuthorityEntry[]; id: ProjectAuthorityId | null }>
  | null {
  if (!root) return Object.freeze({ snapshot: null, entries, id: null });
  const snapshot = inspectProjectRoot(root, inspection);
  if (!snapshot) return null;
  if (expectedProject !== undefined
    && (expectedProject === null
      || snapshot.canonicalRootDigest !== expectedProject.canonicalRootDigest
      || snapshot.filesystemIdentityDigest !== expectedProject.filesystemIdentityDigest)) return null;
  const resolved = resolveProjectAuthority(entries, snapshot);
  if (resolved.kind === "authorized") {
    return Object.freeze({ snapshot, entries, id: resolved.projectAuthorityId });
  }
  // An explicit current-project authorization may repair a moved/replaced
  // binding, but never by reusing its old ID: Task 199 grants carry no project
  // authority revision. Preserve every unrelated registry entry.
  const retained = resolved.kind === "registration-required"
    ? entries
    : entries.filter((entry) => entry.canonicalRootDigest !== snapshot.canonicalRootDigest
      && entry.filesystemIdentityDigest !== snapshot.filesystemIdentityDigest);
  const registered = registerSnapshot(retained, snapshot, ids);
  return Object.freeze({ snapshot, entries: registered.entries, id: registered.entry.projectAuthorityId });
}

function migrationContent(
  legacy: LegacyConductorConnection,
  project: ReturnType<typeof projectForMigration>,
  ids: ConnectionMigrationIds,
): ModelConnectionsStoreContent | null {
  if (project === null) return null;
  const credential = storedReference(legacy);
  if (!credential) return null;
  const connection: StoredCompatibleConnection = Object.freeze({
    kind: "openai-compatible",
    connectionId: generatedUuid(ids),
    driverId: "openai-compatible",
    baseUrl: legacy.baseUrl,
    authenticationOrigin: "legacy-unknown",
    authenticationRevision: generatedUuid(ids),
    credential,
    legacyAuthorizedDataScope: legacy.authorizedDataScope,
    authorizedDataScope: legacy.authorizedDataScope,
    billingRevision: generatedUuid(ids),
    capabilityRevision: generatedUuid(ids),
    routingPolicyRevision: generatedUuid(ids),
  });
  const pinned = assignment(connection.connectionId, legacy.model, ids);
  const grantedAt = generatedTimestamp(ids);
  const grant = project.id === null
    ? null
    : conductorGrant(connection, pinned, project.id, "legacy-pinned-bridge", ids, grantedAt);
  return Object.freeze({
    recovery: Object.freeze({ kind: "none" }),
    connections: Object.freeze([connection]),
    conductorAssignment: pinned,
    workerAssignment: null,
    linkGrants: Object.freeze(project.id === null
      ? []
      : [linkGrant(connection, "legacy-pinned-bridge", ids, grantedAt)]),
    conductorGrants: Object.freeze(grant === null ? [] : [grant]),
    projectAuthorities: project.entries,
  });
}

function assignedConnection(
  store: ModelConnectionsStoreV1,
): Readonly<{ connection: StoredCompatibleConnection; assignment: PinnedConductorAssignment }> | null {
  const pinned = store.conductorAssignment;
  if (!pinned) return null;
  const connection = store.connections.find((item) => item.connectionId === pinned.connectionId);
  return connection ? Object.freeze({ connection, assignment: pinned }) : null;
}

function legacyReferenceStillMatches(
  connection: StoredCompatibleConnection,
  pinned: PinnedConductorAssignment,
  reader: LegacyConductorFileReader,
): boolean {
  const parsed = readLegacyConductorConnection(reader);
  if (connection.credential.kind !== "legacy-conductor-file") return parsed.kind === "absent";
  if (parsed.kind !== "valid") return false;
  return parsed.value.baseUrl === connection.baseUrl
    && parsed.value.model === pinned.modelId
    && parsed.value.authorizedDataScope === connection.legacyAuthorizedDataScope
    && legacyCiphertextSha256(parsed.value.keyB64) === connection.credential.ciphertextSha256;
}

function projectResolution(
  store: ModelConnectionsStoreV1,
  root: string | null | undefined,
  inspection: ProjectAuthorityInspectionDeps | undefined,
  expectedProject?: ProjectConnectionExpectation | null,
): Readonly<{
  kind: "none" | "authorized" | "registration-required" | "reauthorization-required";
  snapshot?: ProjectSnapshot;
  projectAuthorityId?: ProjectAuthorityId;
  reason?: "moved" | "replaced" | "ambiguous" | "unavailable" | "unrecognized";
}> {
  if (!root) return Object.freeze({ kind: "none" });
  const snapshot = inspectProjectRoot(root, inspection);
  if (!snapshot) return Object.freeze({ kind: "reauthorization-required", reason: "unavailable" });
  if (expectedProject !== undefined
    && (expectedProject === null
      || snapshot.canonicalRootDigest !== expectedProject.canonicalRootDigest
      || snapshot.filesystemIdentityDigest !== expectedProject.filesystemIdentityDigest)) {
    return Object.freeze({ kind: "reauthorization-required", reason: "unavailable" });
  }
  const resolved = resolveProjectAuthority(store.projectAuthorities, snapshot);
  if (resolved.kind === "authorized") {
    return Object.freeze({ kind: "authorized", snapshot, projectAuthorityId: resolved.projectAuthorityId });
  }
  if (resolved.kind === "registration-required") {
    return store.projectAuthorities.length === 0
      ? Object.freeze({ kind: "registration-required", snapshot })
      : Object.freeze({ kind: "reauthorization-required", reason: "unrecognized" });
  }
  return Object.freeze({ kind: "reauthorization-required", reason: resolved.reason });
}

function readyProjection(
  store: ModelConnectionsStoreV1,
  projectAuthorityId: ProjectAuthorityId | null,
): ConnectionAuthorityLoadResult {
  if (store.recovery.kind !== "none") return RECOVERY_REQUIRED;
  const assigned = assignedConnection(store);
  if (!assigned) return RECOVERY_REQUIRED;
  const projectAuthorized = projectAuthorityId !== null && store.conductorGrants.some((grant) =>
    grant.projectAuthorityId === projectAuthorityId
    && grantMatchesPinnedConnection(grant, assigned.connection, assigned.assignment));
  return Object.freeze({
    kind: "ready",
    value: Object.freeze({
      storeRevision: store.storeRevision,
      connectionId: assigned.connection.connectionId,
      baseUrl: assigned.connection.baseUrl,
      model: assigned.assignment.modelId,
      authenticationOrigin: assigned.connection.authenticationOrigin,
      authenticationRevision: assigned.connection.authenticationRevision,
      credential: assigned.connection.credential,
      legacyAuthorizedDataScope: assigned.connection.legacyAuthorizedDataScope,
      authorizedDataScope: assigned.connection.authorizedDataScope,
      projectAuthorityId,
      projectAuthorized,
    }),
  });
}

function materializeDelayedLegacyBridge(
  storeApi: ModelConnectionsStore,
  store: ModelConnectionsStoreV1,
  snapshot: ProjectSnapshot,
  ids: ConnectionMigrationIds,
): ConnectionAuthorityLoadResult {
  const assigned = assignedConnection(store);
  if (!assigned || assigned.connection.authenticationOrigin !== "legacy-unknown"
    || store.projectAuthorities.length !== 0) {
    return Object.freeze({ kind: "project-reauthorization-required", reason: "unrecognized" });
  }
  let registered: ReturnType<typeof registerSnapshot>;
  try {
    registered = registerSnapshot([], snapshot, ids);
  } catch {
    return RECOVERY_REQUIRED;
  }
  const grantedAt = generatedTimestamp(ids);
  const grant = conductorGrant(
    assigned.connection,
    assigned.assignment,
    registered.entry.projectAuthorityId,
    "legacy-pinned-bridge",
    ids,
    grantedAt,
  );
  const mutation = storeApi.mutate(store.storeRevision, (current) => ({
    ...modelConnectionsStoreContent(current),
    projectAuthorities: registered.entries,
    linkGrants: Object.freeze([linkGrant(assigned.connection, "legacy-pinned-bridge", ids, grantedAt)]),
    conductorGrants: grant === null ? Object.freeze([]) : Object.freeze([grant]),
  }));
  return mutation.kind === "written"
    ? readyProjection(mutation.value, registered.entry.projectAuthorityId)
    : mutation.kind === "stale"
      ? RECOVERY_REQUIRED
      : RECOVERY_REQUIRED;
}

/** Idempotent startup/read bridge. It writes only for the one-time legacy
 * migration or delayed first-project materialization, never on an ordinary
 * successful read. */
export function loadOrMigrateLegacyConnection(
  options: LoadOrMigrateLegacyOptions,
): ConnectionAuthorityLoadResult {
  const ids = options.ids ?? {};
  let loaded = options.store.read();
  if (loaded.kind === "recovery-required") return RECOVERY_REQUIRED;
  if (loaded.kind === "absent") {
    const legacy = readLegacyConductorConnection(options.legacy);
    if (legacy.kind === "absent") return Object.freeze({ kind: "absent" });
    if (legacy.kind === "malformed") return RECOVERY_REQUIRED;
    try {
      const project = projectForMigration(
        options.currentProjectRoot,
        options.projectInspection,
        ids,
        options.expectedProject,
      );
      const content = migrationContent(legacy.value, project, ids);
      if (!content) return project === null
        ? Object.freeze({ kind: "project-reauthorization-required", reason: "unavailable" })
        : RECOVERY_REQUIRED;
      const written = options.store.write(null, content);
      if (written.kind !== "written") return RECOVERY_REQUIRED;
      loaded = Object.freeze({ kind: "ready", value: written.value });
    } catch {
      return RECOVERY_REQUIRED;
    }
  }
  if (loaded.kind !== "ready" || loaded.value.recovery.kind !== "none") return RECOVERY_REQUIRED;
  const assigned = assignedConnection(loaded.value);
  if (!assigned || !legacyReferenceStillMatches(assigned.connection, assigned.assignment, options.legacy)) {
    return RECOVERY_REQUIRED;
  }
  const project = projectResolution(
    loaded.value,
    options.currentProjectRoot,
    options.projectInspection,
    options.expectedProject,
  );
  if (project.kind === "reauthorization-required") {
    return Object.freeze({ kind: "project-reauthorization-required", reason: project.reason ?? "unavailable" });
  }
  if (project.kind === "registration-required" && project.snapshot) {
    try {
      return materializeDelayedLegacyBridge(options.store, loaded.value, project.snapshot, ids);
    } catch {
      return RECOVERY_REQUIRED;
    }
  }
  return readyProjection(loaded.value, project.projectAuthorityId ?? null);
}

/** Replace the compatibility slot after main has encrypted and strictly read
 * back conductor.json. The file remains the one secret location; the new
 * store records only its digest and fresh non-secret revisions. */
export function replaceCompatibleConnection(
  options: ReplaceCompatibleConnectionOptions,
): ConnectionAuthorityMutationResult {
  const ids = options.ids ?? {};
  const before = options.store.read();
  if (before.kind === "recovery-required"
    || (before.kind === "ready" && before.value.recovery.kind !== "none")) return RECOVERY_REQUIRED;
  if (options.expectedStoreRevision === null
    ? before.kind !== "absent"
    : before.kind !== "ready" || before.value.storeRevision !== options.expectedStoreRevision) {
    return Object.freeze({ kind: "stale", code: "MODEL_CONNECTIONS_STORE_STALE" });
  }
  const legacy = readLegacyConductorConnection(options.legacy);
  if (legacy.kind !== "valid") return RECOVERY_REQUIRED;
  let project: ReturnType<typeof projectForExplicitAuthorization>;
  try {
    project = projectForExplicitAuthorization(
      before.kind === "ready" ? before.value.projectAuthorities : Object.freeze([]),
      options.currentProjectRoot,
      options.projectInspection,
      ids,
      options.expectedProject,
    );
  } catch {
    return RECOVERY_REQUIRED;
  }
  if (project === null) return Object.freeze({ kind: "project-reauthorization-required", reason: "unavailable" });
  const credential = storedReference(legacy.value);
  if (!credential) return RECOVERY_REQUIRED;
  try {
    const connection: StoredCompatibleConnection = Object.freeze({
      kind: "openai-compatible",
      connectionId: generatedUuid(ids),
      driverId: "openai-compatible",
      baseUrl: legacy.value.baseUrl,
      authenticationOrigin: options.authenticationOrigin,
      authenticationRevision: generatedUuid(ids),
      credential,
      legacyAuthorizedDataScope: legacy.value.authorizedDataScope,
      authorizedDataScope: legacy.value.authorizedDataScope,
      billingRevision: generatedUuid(ids),
      capabilityRevision: generatedUuid(ids),
      routingPolicyRevision: generatedUuid(ids),
    });
    const pinned = assignment(connection.connectionId, legacy.value.model, ids);
    const grantedAt = generatedTimestamp(ids);
    const grant = project.id === null ? null
      : conductorGrant(connection, pinned, project.id, "explicit", ids, grantedAt);
    const content: ModelConnectionsStoreContent = Object.freeze({
      recovery: Object.freeze({ kind: "none" }),
      connections: Object.freeze([connection]),
      conductorAssignment: pinned,
      workerAssignment: null,
      linkGrants: Object.freeze([linkGrant(connection, "explicit", ids, grantedAt)]),
      conductorGrants: Object.freeze(grant === null ? [] : [grant]),
      projectAuthorities: project.entries,
    });
    const written = options.store.write(options.expectedStoreRevision, content);
    if (written.kind === "stale" || written.kind === "write-failed") return written;
    if (written.kind !== "written") return RECOVERY_REQUIRED;
    const projection = readyProjection(written.value, project.id);
    return projection.kind === "ready" ? projection : RECOVERY_REQUIRED;
  } catch {
    return RECOVERY_REQUIRED;
  }
}

/** Persist a newly encrypted connection wholly inside the v1 authority store.
 * This is deliberately separate from the legacy replacement path: an absent
 * conductor.json is part of inline custody, so a stale legacy copy can never
 * coexist with an active inline credential. */
export function replaceInlineCompatibleConnection(
  options: ReplaceInlineCompatibleConnectionOptions,
): ConnectionAuthorityMutationResult {
  const ids = options.ids ?? {};
  const before = options.store.read();
  if (before.kind === "recovery-required"
    || (before.kind === "ready" && before.value.recovery.kind !== "none")) return RECOVERY_REQUIRED;
  if (options.expectedStoreRevision === null
    ? before.kind !== "absent"
    : before.kind !== "ready" || before.value.storeRevision !== options.expectedStoreRevision) {
    return Object.freeze({ kind: "stale", code: "MODEL_CONNECTIONS_STORE_STALE" });
  }
  if (readLegacyConductorConnection(options.legacy).kind !== "absent") return RECOVERY_REQUIRED;
  if (before.kind === "ready") {
    const assigned = assignedConnection(before.value);
    if (!assigned || assigned.connection.credential.kind !== "inline-encrypted") return RECOVERY_REQUIRED;
  }

  let project: ReturnType<typeof projectForExplicitAuthorization>;
  try {
    project = projectForExplicitAuthorization(
      before.kind === "ready" ? before.value.projectAuthorities : Object.freeze([]),
      options.currentProjectRoot,
      options.projectInspection,
      ids,
      options.expectedProject,
    );
  } catch {
    return RECOVERY_REQUIRED;
  }
  if (project === null) return Object.freeze({ kind: "project-reauthorization-required", reason: "unavailable" });

  try {
    const connection: StoredCompatibleConnection = Object.freeze({
      kind: "openai-compatible",
      connectionId: generatedUuid(ids),
      driverId: "openai-compatible",
      baseUrl: options.baseUrl,
      authenticationOrigin: options.authenticationOrigin,
      authenticationRevision: generatedUuid(ids),
      credential: options.credential,
      legacyAuthorizedDataScope: null,
      authorizedDataScope: options.authorizedDataScope,
      billingRevision: generatedUuid(ids),
      capabilityRevision: generatedUuid(ids),
      routingPolicyRevision: generatedUuid(ids),
    });
    const pinned = assignment(connection.connectionId, options.model, ids);
    const grantedAt = generatedTimestamp(ids);
    const grant = project.id === null ? null
      : conductorGrant(connection, pinned, project.id, "explicit", ids, grantedAt);
    const content: ModelConnectionsStoreContent = Object.freeze({
      recovery: Object.freeze({ kind: "none" }),
      connections: Object.freeze([connection]),
      conductorAssignment: pinned,
      workerAssignment: null,
      linkGrants: Object.freeze([linkGrant(connection, "explicit", ids, grantedAt)]),
      conductorGrants: Object.freeze(grant === null ? [] : [grant]),
      projectAuthorities: project.entries,
    });
    const written = options.store.write(options.expectedStoreRevision, content);
    if (written.kind === "stale" || written.kind === "write-failed") return written;
    if (written.kind !== "written") return RECOVERY_REQUIRED;
    const projection = readyProjection(written.value, project.id);
    return projection.kind === "ready" ? projection : RECOVERY_REQUIRED;
  } catch {
    return RECOVERY_REQUIRED;
  }
}

export interface LegacyCredentialReplacementDependencies {
  readonly readPreviousCredential: () => Buffer | null;
  readonly writeReplacementCredential: () => void;
  readonly restorePreviousCredential: (previous: Buffer) => boolean;
  readonly replaceAuthority: () => ConnectionAuthorityMutationResult;
  readonly authorityUnchanged: () => boolean;
}

/** Coordinate the legacy compatibility file with its authority mutation.
 * The credential write happens first for old-reader compatibility, but any
 * refused/failed authority write restores and verifies the exact prior bytes.
 * The injected shape keeps this custody boundary fake-testable without
 * importing Electron or an OS credential store. */
export function replaceLegacyCredentialAtomically(
  dependencies: LegacyCredentialReplacementDependencies,
): ConnectionAuthorityMutationResult {
  let previous: Buffer | null = null;
  const restore = (): boolean => {
    if (previous === null) return false;
    try {
      return dependencies.restorePreviousCredential(previous);
    } catch {
      return false;
    }
  };
  try {
    try {
      previous = dependencies.readPreviousCredential();
    } catch {
      return RECOVERY_REQUIRED;
    }
    if (previous === null) return RECOVERY_REQUIRED;
    try {
      dependencies.writeReplacementCredential();
    } catch {
      return restore() ? WRITE_FAILED : RECOVERY_REQUIRED;
    }
    let replacement: ConnectionAuthorityMutationResult;
    try {
      replacement = dependencies.replaceAuthority();
    } catch {
      replacement = RECOVERY_REQUIRED;
    }
    if (replacement.kind === "ready") return replacement;
    if (replacement.kind === "stale" || replacement.kind === "project-reauthorization-required") {
      return restore() ? replacement : RECOVERY_REQUIRED;
    }
    let unchanged = false;
    try {
      unchanged = dependencies.authorityUnchanged();
    } catch {
      return RECOVERY_REQUIRED;
    }
    return unchanged && restore()
      ? WRITE_FAILED
      : RECOVERY_REQUIRED;
  } finally {
    previous?.fill(0);
  }
}

export interface RenewCompatibleConnectionOptions extends LoadOrMigrateLegacyOptions {
  readonly authorizedDataScope: string;
  readonly expectedStoreRevision: string;
}

/** Replace only current grants/scope. The legacy file and its preserved scope
 * evidence remain byte-identical, so no credential is decrypted or copied. */
export function renewCompatibleConnection(
  options: RenewCompatibleConnectionOptions,
): ConnectionAuthorityMutationResult {
  const ids = options.ids ?? {};
  const current = options.store.read();
  if (current.kind !== "ready" || current.value.recovery.kind !== "none"
    || current.value.storeRevision !== options.expectedStoreRevision) {
    return current.kind === "ready"
      ? Object.freeze({ kind: "stale", code: "MODEL_CONNECTIONS_STORE_STALE" })
      : RECOVERY_REQUIRED;
  }
  const assigned = assignedConnection(current.value);
  if (!assigned || !legacyReferenceStillMatches(assigned.connection, assigned.assignment, options.legacy)) {
    return RECOVERY_REQUIRED;
  }
  const snapshot = options.currentProjectRoot
    ? inspectProjectRoot(options.currentProjectRoot, options.projectInspection)
    : null;
  if (!snapshot) return Object.freeze({ kind: "project-reauthorization-required", reason: "unavailable" });
  if (options.expectedProject !== undefined
    && (options.expectedProject === null
      || snapshot.canonicalRootDigest !== options.expectedProject.canonicalRootDigest
      || snapshot.filesystemIdentityDigest !== options.expectedProject.filesystemIdentityDigest)) {
    return Object.freeze({ kind: "project-reauthorization-required", reason: "unavailable" });
  }
  let authorizedProject: ReturnType<typeof projectForExplicitAuthorization>;
  try {
    authorizedProject = projectForExplicitAuthorization(
      current.value.projectAuthorities,
      options.currentProjectRoot,
      options.projectInspection,
      ids,
      Object.freeze({
        canonicalRootDigest: snapshot.canonicalRootDigest,
        filesystemIdentityDigest: snapshot.filesystemIdentityDigest,
      }),
    );
  } catch {
    return RECOVERY_REQUIRED;
  }
  if (authorizedProject === null || authorizedProject.id === null) {
    return Object.freeze({ kind: "project-reauthorization-required", reason: "unavailable" });
  }
  try {
    const connection: StoredCompatibleConnection = Object.freeze({
      ...assigned.connection,
      authorizedDataScope: options.authorizedDataScope,
    });
    const grantedAt = generatedTimestamp(ids);
    const grant = conductorGrant(
      connection,
      assigned.assignment,
      authorizedProject.id,
      "explicit",
      ids,
      grantedAt,
    );
    if (!grant) return RECOVERY_REQUIRED;
    const retainedAuthorityIds = new Set(authorizedProject.entries.map((entry) => entry.projectAuthorityId));
    const retainedGrants = current.value.conductorGrants.filter((candidate) =>
      candidate.projectAuthorityId !== authorizedProject.id
      && candidate.authorizationBasis === "explicit"
      && retainedAuthorityIds.has(candidate.projectAuthorityId)
      && grantMatchesPinnedConnection(candidate, connection, assigned.assignment));
    const currentLinkGrant = current.value.linkGrants.find((candidate) =>
      explicitLinkGrantStillMatches(candidate, connection));
    const mutation = options.store.mutate(current.value.storeRevision, () => Object.freeze({
      recovery: Object.freeze({ kind: "none" }),
      connections: Object.freeze([connection]),
      conductorAssignment: assigned.assignment,
      workerAssignment: null,
      linkGrants: Object.freeze([
        currentLinkGrant ?? linkGrant(connection, "explicit", ids, grantedAt),
      ]),
      conductorGrants: Object.freeze([...retainedGrants, grant]),
      projectAuthorities: authorizedProject.entries,
    }));
    if (mutation.kind === "stale" || mutation.kind === "write-failed") return mutation;
    if (mutation.kind !== "written") return RECOVERY_REQUIRED;
    const projection = readyProjection(mutation.value, authorizedProject.id);
    return projection.kind === "ready" ? projection : RECOVERY_REQUIRED;
  } catch {
    return RECOVERY_REQUIRED;
  }
}

export type ModelConnectionDeletionFailpoint =
  | "after-credential-delete"
  | "after-forget-pending"
  | "after-cache-delete"
  | "after-authority-delete";

export interface ModelConnectionDeletionDependencies {
  readonly store: ModelConnectionsStore;
  readonly legacy: LegacyConductorFileAccess;
  readonly removeCache: () => boolean;
  readonly removeAuthority: () => boolean;
  readonly failpoint?: (point: ModelConnectionDeletionFailpoint) => void;
}

export type ModelConnectionDeletionResult =
  | Readonly<{ kind: "deleted" }>
  | Readonly<{
      kind: "failed";
      stage: "credential" | "forget-pending" | "cache" | "authority";
      message: string;
    }>;

function deletionFailure(
  stage: Exclude<ModelConnectionDeletionResult, { kind: "deleted" }>["stage"],
  message: string,
): ModelConnectionDeletionResult {
  return Object.freeze({ kind: "failed", stage, message });
}

function tripDeletionFailpoint(
  dependencies: ModelConnectionDeletionDependencies,
  point: ModelConnectionDeletionFailpoint,
  stage: Exclude<ModelConnectionDeletionResult, { kind: "deleted" }>["stage"],
): ModelConnectionDeletionResult | null {
  try {
    dependencies.failpoint?.(point);
    return null;
  } catch {
    return deletionFailure(stage, "Cairn stopped during local model-connection removal. Recovery is still required.");
  }
}

/** Ordinary Forget state machine. Legacy deletion is the first irreversible
 * boundary. Inline custody removes ciphertext in the verified forget-pending
 * rewrite. Cache and authority always follow, in that order. */
export function forgetModelConnections(
  dependencies: ModelConnectionDeletionDependencies,
): ModelConnectionDeletionResult {
  const loaded = dependencies.store.read();
  if (loaded.kind === "absent") {
    try {
      if (dependencies.legacy.conductorFileExists()) {
        return deletionFailure("credential", "Connection authority is missing while a local model credential remains. Recovery is required.");
      }
    } catch {
      return deletionFailure("credential", "Cairn could not verify that the local model credential is absent.");
    }
    try {
      if (!dependencies.removeCache()) return deletionFailure("cache", "Cairn could not verify model-cache deletion.");
    } catch {
      return deletionFailure("cache", "Cairn could not verify model-cache deletion.");
    }
    const afterCache = tripDeletionFailpoint(dependencies, "after-cache-delete", "authority");
    if (afterCache) return afterCache;
    try {
      if (!dependencies.removeAuthority()) {
        return deletionFailure("authority", "Cairn could not verify connection-authority deletion.");
      }
    } catch {
      return deletionFailure("authority", "Cairn could not verify connection-authority deletion.");
    }
    const afterAuthority = tripDeletionFailpoint(dependencies, "after-authority-delete", "authority");
    return afterAuthority ?? Object.freeze({ kind: "deleted" });
  }
  if (loaded.kind !== "ready" || loaded.value.recovery.kind !== "none") {
    return deletionFailure("credential", "Connection recovery is required before ordinary Forget can run.");
  }
  const assigned = assignedConnection(loaded.value);
  if (!assigned) return deletionFailure("credential", "Cairn could not verify the saved model connection.");
  const { connection, assignment: pinned } = assigned;

  if (connection.credential.kind === "legacy-conductor-file") {
    const deleted = deleteReferencedLegacyConductorSecret(
      {
        kind: "legacy-conductor-file",
        fileName: "conductor.json",
        ciphertextSha256: connection.credential.ciphertextSha256,
      },
      {
        baseUrl: connection.baseUrl,
        model: pinned.modelId,
        authorizedDataScope: connection.legacyAuthorizedDataScope,
      },
      dependencies.legacy,
    );
    if (!deleted.ok) return deletionFailure("credential", deleted.message);
    const stopped = tripDeletionFailpoint(dependencies, "after-credential-delete", "forget-pending");
    if (stopped) return stopped;
  }

  const pending = dependencies.store.mutate(loaded.value.storeRevision, (current) => ({
    ...modelConnectionsStoreContent(current),
    recovery: Object.freeze({
      kind: "forget-pending",
      connectionId: connection.connectionId,
      credentialKind: connection.credential.kind,
    }),
    connections: connection.credential.kind === "inline-encrypted"
      ? Object.freeze(current.connections.filter((item) => item.connectionId !== connection.connectionId))
      : current.connections,
  }));
  if (pending.kind !== "written") {
    if (connection.credential.kind === "inline-encrypted" && pending.kind === "write-failed") {
      return deletionFailure(
        "credential",
        "Cairn could not safely begin Forget. The saved connection is unchanged; try again.",
      );
    }
    return deletionFailure("forget-pending", "Cairn could not verify the pending Forget record. Recovery is required.");
  }
  if (connection.credential.kind === "inline-encrypted") {
    const stopped = tripDeletionFailpoint(dependencies, "after-credential-delete", "forget-pending");
    if (stopped) return stopped;
  }
  const afterPending = tripDeletionFailpoint(dependencies, "after-forget-pending", "cache");
  if (afterPending) return afterPending;
  try {
    if (!dependencies.removeCache()) return deletionFailure("cache", "Cairn could not verify model-cache deletion.");
  } catch {
    return deletionFailure("cache", "Cairn could not verify model-cache deletion.");
  }
  const afterCache = tripDeletionFailpoint(dependencies, "after-cache-delete", "authority");
  if (afterCache) return afterCache;
  try {
    if (!dependencies.removeAuthority()) {
      return deletionFailure("authority", "Cairn could not verify connection-authority deletion.");
    }
  } catch {
    return deletionFailure("authority", "Cairn could not verify connection-authority deletion.");
  }
  const afterAuthority = tripDeletionFailpoint(dependencies, "after-authority-delete", "authority");
  return afterAuthority ?? Object.freeze({ kind: "deleted" });
}

/** Corrupt-store exit. Its target manifest is static and main-owned, so it can
 * delete the known credential path even when no store bytes can be trusted. */
export function eraseModelConnectionsForRecovery(
  dependencies: ModelConnectionDeletionDependencies,
): ModelConnectionDeletionResult {
  // Replace any recovery-time conductor.json with a verified non-secret marker
  // rather than unlinking it immediately. If the process stops before cache or
  // authority cleanup, the fixed marker keeps both current and legacy readers
  // fail-closed without restoring a credential.
  const loaded = dependencies.store.read();
  let credentialMarkerArmed: boolean;
  try {
    credentialMarkerArmed = dependencies.legacy.conductorFileExists();
  } catch {
    return deletionFailure("credential", "Cairn could not verify local model-credential custody.");
  }
  const credential = credentialMarkerArmed
    ? armLegacyConductorRecoveryMarker(dependencies.legacy)
    : eraseLegacyConductorSecretForRecovery(dependencies.legacy);
  if (!credential.ok) return deletionFailure("credential", credential.message);
  const afterCredential = tripDeletionFailpoint(dependencies, "after-credential-delete", "forget-pending");
  if (afterCredential) return afterCredential;

  // A strictly readable store can still be in recovery because an unexpected
  // legacy file coexisted with inline custody, or because ordinary Forget
  // stopped partway through. Remove any inline ciphertext in a verified
  // pending rewrite before cache/authority deletion. Truly corrupt stores
  // cannot be rewritten safely and remain the final fixed recovery target.
  if (loaded.kind === "ready" && loaded.value.recovery.kind === "none") {
    const assigned = assignedConnection(loaded.value);
    if (!assigned) return deletionFailure("forget-pending", "Cairn could not verify the saved model connection.");
    const pending = dependencies.store.mutate(loaded.value.storeRevision, (current) => ({
      ...modelConnectionsStoreContent(current),
      recovery: Object.freeze({
        kind: "forget-pending",
        connectionId: assigned.connection.connectionId,
        credentialKind: assigned.connection.credential.kind,
      }),
      connections: assigned.connection.credential.kind === "inline-encrypted"
        ? Object.freeze(current.connections.filter((item) => item.connectionId !== assigned.connection.connectionId))
        : current.connections,
    }));
    if (pending.kind !== "written") {
      return deletionFailure("forget-pending", "Cairn could not verify the pending recovery record.");
    }
    const afterPending = tripDeletionFailpoint(dependencies, "after-forget-pending", "cache");
    if (afterPending) return afterPending;
  }
  try {
    if (!dependencies.removeCache()) return deletionFailure("cache", "Cairn could not verify model-cache deletion.");
  } catch {
    return deletionFailure("cache", "Cairn could not verify model-cache deletion.");
  }
  const afterCache = tripDeletionFailpoint(dependencies, "after-cache-delete", "authority");
  if (afterCache) return afterCache;
  if (credentialMarkerArmed) {
    const marker = eraseLegacyConductorSecretForRecovery(dependencies.legacy);
    if (!marker.ok) return deletionFailure("credential", marker.message);
  }
  try {
    if (!dependencies.removeAuthority()) {
      return deletionFailure("authority", "Cairn could not verify connection-authority deletion.");
    }
  } catch {
    return deletionFailure("authority", "Cairn could not verify connection-authority deletion.");
  }
  const afterAuthority = tripDeletionFailpoint(dependencies, "after-authority-delete", "authority");
  return afterAuthority ?? Object.freeze({ kind: "deleted" });
}
