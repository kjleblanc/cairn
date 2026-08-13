import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { types as nodeTypes } from "node:util";

export const BUILDER_RESERVATION_PLAN_VERSION = "cairn-builder-reservation-plan/v1" as const;
export const BUILDER_RESERVATION_REVISION_VERSION = "cairn-builder-reservation-revision/v1" as const;
export const BUILDER_RESERVATION_HANDLER_REVISION = "cairn-builder-reservation-fake-handler/v1" as const;
export const BUILDER_RESERVATION_POLICY_REVISION = "cairn-builder-reservation-policy/v1" as const;
export const BUILDER_RESERVATION_FAKE_RECEIPT_VERSION =
  "cairn-builder-reservation-fake-receipt/v1" as const;

export const BUILDER_RESERVATION_LIMITS = Object.freeze({
  textCharacters: 8_000,
  aggregateTextCharacters: 16_000,
  planBytes: 48 * 1024,
  recordBytes: 96 * 1024,
  revisions: 2,
  operations: 1,
} as const);

const KEY_NAME = ".cairn-builder-reservation-key-v1";
const KEY_BYTES = 32;
const OPERATIONS_NAME = "operations";
const HIGH_WATER_NAME = "high-water";
const INVENTORY_NAME = "inventory";
const ANCHORS_NAME = "anchors";
const REVISION_DOMAIN = "cairn-builder-reservation-revision-auth/v1";
const REVISION_SHA_DOMAIN = "cairn-builder-reservation-revision-sha/v1";
const HIGH_WATER_DOMAIN = "cairn-builder-reservation-high-water-auth/v1";
const HIGH_WATER_SHA_DOMAIN = "cairn-builder-reservation-high-water-sha/v1";
const INVENTORY_DOMAIN = "cairn-builder-reservation-inventory-auth/v1";
const INVENTORY_SHA_DOMAIN = "cairn-builder-reservation-inventory-sha/v1";
const ANCHOR_DOMAIN = "cairn-builder-reservation-anchor-auth/v1";
const ANCHOR_SHA_DOMAIN = "cairn-builder-reservation-anchor-sha/v1";
const PLAN_SHA_DOMAIN = "cairn-builder-reservation-plan-sha/v1";
const RECEIPT_SHA_DOMAIN = "cairn-builder-reservation-fake-receipt-sha/v1";
const ROOT_IDENTITY_DOMAIN = "cairn-builder-reservation-root-identity/v1";
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const FIXTURE_NAME = /^task227-[a-z0-9](?:[a-z0-9-]{0,94}[a-z0-9])?$/u;
const STORE_FIXTURE_NAME = "store";
const GENERATION_NAME = /^0000000([12])\.json$/u;
const FORBIDDEN_TEXT = /[\u0000\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u;
const PLAN_KEYS = Object.freeze([
  "version", "projectHash", "taskSpecSha256", "evidencePlanSha256", "consentSha256",
  "contextSha256", "responseSha256", "selectionSha256", "beforeText", "afterText",
] as const);
const REVISION_KEYS = Object.freeze([
  "version", "operationId", "revision", "previousRevisionSha256", "status", "projectHash",
  "rootIdentitySha256", "handlerRevision", "policyRevision", "planSha256", "plan", "receiptStatus", "receiptSha256", "revisionSha256",
  "authSha256",
] as const);
const HIGH_WATER_KEYS = Object.freeze([
  "version", "operationId", "revision", "revisionSha256", "previousHighWaterSha256",
  "recordSha256", "authSha256",
] as const);
const INVENTORY_KEYS = Object.freeze([
  "version", "generation", "operationId", "revision", "revisionSha256", "status",
  "previousInventorySha256", "recordSha256", "authSha256",
] as const);
const ANCHOR_KEYS = Object.freeze([
  "version", "generation", "operationId", "revision", "revisionSha256", "highWaterSha256",
  "inventorySha256", "previousAnchorSha256", "recordSha256", "authSha256",
] as const);

export type BuilderReservationPlanV1 = Readonly<{
  version: typeof BUILDER_RESERVATION_PLAN_VERSION;
  projectHash: string;
  taskSpecSha256: string;
  evidencePlanSha256: string;
  consentSha256: string;
  contextSha256: string;
  responseSha256: string;
  selectionSha256: string;
  beforeText: string;
  afterText: string;
}>;

export type BuilderReservationStatusV1 = "absent" | "reserved" | "complete" | "interrupted" | "recovery-required";

export type BuilderReservationProjectionV1 = Readonly<{
  version: "cairn-builder-reservation-projection/v1";
  status: BuilderReservationStatusV1;
  operationId: string | null;
  revision: number | null;
  reservationSha256: string | null;
  projectHash: string | null;
  planSha256: string | null;
  handlerRevision: typeof BUILDER_RESERVATION_HANDLER_REVISION | null;
  authorityAvailable: false;
  processCrashReadback: "exact-stable-readback" | "none";
  fileFsyncCompletionAfterCrash: "not-provable";
  powerLossDurability: "unproved";
}>;

export type BuilderReservationHandle = Readonly<{ readonly __builderReservationHandle: unique symbol }>;

export type BuilderReservationAuthorityBindingV1 = Readonly<{
  operationId: string;
  reservationSha256: string;
  projectHash: string;
  revision: number;
  handlerRevision: string;
  planSha256: string;
}>;

export type BuilderReservationGrant = Readonly<{ readonly __builderReservationGrant: unique symbol }>;
export type BuilderReservationGrantConsumption = Readonly<{
  readonly __builderReservationGrantConsumption: unique symbol;
}>;

export type BuilderReservationFakeReceiptV1 = Readonly<{
  version: typeof BUILDER_RESERVATION_FAKE_RECEIPT_VERSION;
  status: ReceiptStatus;
  operationId: string;
  reservationSha256: string;
  projectHash: string;
  revision: number;
  handlerRevision: typeof BUILDER_RESERVATION_HANDLER_REVISION;
  planSha256: string;
}>;

export type BuilderReservationV1 = Readonly<{
  projection: BuilderReservationProjectionV1;
  binding: BuilderReservationAuthorityBindingV1;
  handle: BuilderReservationHandle;
}>;

type RevisionNumber = 1 | 2;
type RevisionStatus = "reserved" | "complete";
type ReceiptStatus = "accepted" | "refused";

type RevisionRecord = Readonly<{
  version: typeof BUILDER_RESERVATION_REVISION_VERSION;
  operationId: string;
  revision: RevisionNumber;
  previousRevisionSha256: string | null;
  status: RevisionStatus;
  projectHash: string;
  rootIdentitySha256: string;
  handlerRevision: typeof BUILDER_RESERVATION_HANDLER_REVISION;
  policyRevision: typeof BUILDER_RESERVATION_POLICY_REVISION;
  planSha256: string;
  plan: BuilderReservationPlanV1;
  receiptStatus: ReceiptStatus | null;
  receiptSha256: string | null;
  revisionSha256: string;
  authSha256: string;
}>;

type HighWaterRecord = Readonly<{
  version: "cairn-builder-reservation-high-water/v1";
  operationId: string;
  revision: RevisionNumber;
  revisionSha256: string;
  previousHighWaterSha256: string | null;
  recordSha256: string;
  authSha256: string;
}>;

type InventoryRecord = Readonly<{
  version: "cairn-builder-reservation-inventory/v1";
  generation: RevisionNumber;
  operationId: string;
  revision: RevisionNumber;
  revisionSha256: string;
  status: RevisionStatus;
  previousInventorySha256: string | null;
  recordSha256: string;
  authSha256: string;
}>;

type AnchorRecord = Readonly<{
  version: "cairn-builder-reservation-anchor/v1";
  generation: RevisionNumber;
  operationId: string;
  revision: RevisionNumber;
  revisionSha256: string;
  highWaterSha256: string;
  inventorySha256: string;
  previousAnchorSha256: string | null;
  recordSha256: string;
  authSha256: string;
}>;

type LiveReservation = {
  root: string;
  handle: BuilderReservationHandle;
  binding: BuilderReservationAuthorityBindingV1;
  grantMinted: boolean;
  complete: boolean;
};

type ReadState = Readonly<{
  projection: BuilderReservationProjectionV1;
  key: Buffer | null;
  revisionOne: RevisionRecord | null;
  revisionTwo: RevisionRecord | null;
  highWaterOne: HighWaterRecord | null;
  highWaterTwo: HighWaterRecord | null;
  inventoryOne: InventoryRecord | null;
  inventoryTwo: InventoryRecord | null;
  anchorOne: AnchorRecord | null;
  anchorTwo: AnchorRecord | null;
}>;

const handleBindings = new WeakMap<object, LiveReservation>();
const grantBindings = new WeakMap<object, Readonly<{
  live: LiveReservation;
  expected: BuilderReservationAuthorityBindingV1;
}>>();
const spentGrants = new WeakSet<object>();
const consumptionBindings = new WeakMap<object, Readonly<{
  live: LiveReservation;
  expected: BuilderReservationAuthorityBindingV1;
}>>();
const completedConsumptions = new WeakSet<object>();
const fakeReceiptBindings = new WeakMap<object, Readonly<{
  live: LiveReservation;
  expected: BuilderReservationAuthorityBindingV1;
  status: ReceiptStatus;
}>>();
const spentFakeReceipts = new WeakSet<object>();

function wellFormedUtf16(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function quoted(value: string): string {
  if (!wellFormedUtf16(value)) throw new Error("BUILDER_RESERVATION_INVALID_UTF16");
  return JSON.stringify(value);
}

function objectJson(entries: readonly (readonly [string, string])[]): string {
  return `{${entries.map(([name, value]) => `${quoted(name)}:${value}`).join(",")}}`;
}

function stringJson(value: string): string {
  return quoted(value);
}

function nullableStringJson(value: string | null): string {
  return value === null ? "null" : quoted(value);
}

function numberJson(value: number): string {
  if (!Number.isSafeInteger(value) || Object.is(value, -0)) throw new Error("BUILDER_RESERVATION_INVALID_NUMBER");
  return String(value);
}

function sha(domain: string, value: string | Uint8Array): string {
  return createHash("sha256").update(domain, "utf8").update("\0", "utf8").update(value).digest("hex");
}

function auth(key: Buffer, domain: string, canonical: string): string {
  return createHmac("sha256", key).update(domain, "utf8").update("\0", "utf8").update(canonical, "utf8").digest("hex");
}

function equalHex(left: string, right: string): boolean {
  return SHA256.test(left) && SHA256.test(right)
    && timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function exactRecord(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || nodeTypes.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const own = Reflect.ownKeys(value);
    if (own.length !== keys.length || own.some((key) => typeof key !== "string" || !keys.includes(key))) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor?.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return null;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
}

const BINDING_KEYS = Object.freeze([
  "operationId", "reservationSha256", "projectHash", "revision", "handlerRevision", "planSha256",
] as const);

/** Strict inert parser used by the sole closed fake; it grants nothing. */
export function parseBuilderReservationBindingForFake(
  value: unknown,
): BuilderReservationAuthorityBindingV1 | null {
  const raw = exactRecord(value, BINDING_KEYS);
  if (!raw || typeof raw.operationId !== "string" || !UUID_V4.test(raw.operationId)
    || typeof raw.reservationSha256 !== "string" || !SHA256.test(raw.reservationSha256)
    || typeof raw.projectHash !== "string" || !SHA256.test(raw.projectHash)
    || !Number.isSafeInteger(raw.revision) || Object.is(raw.revision, -0) || (raw.revision as number) < 1
    || typeof raw.handlerRevision !== "string" || raw.handlerRevision !== BUILDER_RESERVATION_HANDLER_REVISION
    || typeof raw.planSha256 !== "string" || !SHA256.test(raw.planSha256)) return null;
  return Object.freeze({
    operationId: raw.operationId,
    reservationSha256: raw.reservationSha256,
    projectHash: raw.projectHash,
    revision: raw.revision as number,
    handlerRevision: BUILDER_RESERVATION_HANDLER_REVISION,
    planSha256: raw.planSha256,
  });
}

function canonicalPlan(plan: BuilderReservationPlanV1): string {
  return objectJson([
    ["version", stringJson(plan.version)],
    ["projectHash", stringJson(plan.projectHash)],
    ["taskSpecSha256", stringJson(plan.taskSpecSha256)],
    ["evidencePlanSha256", stringJson(plan.evidencePlanSha256)],
    ["consentSha256", stringJson(plan.consentSha256)],
    ["contextSha256", stringJson(plan.contextSha256)],
    ["responseSha256", stringJson(plan.responseSha256)],
    ["selectionSha256", stringJson(plan.selectionSha256)],
    ["beforeText", stringJson(plan.beforeText)],
    ["afterText", stringJson(plan.afterText)],
  ]);
}

function parsePlan(value: unknown): BuilderReservationPlanV1 | null {
  const raw = exactRecord(value, PLAN_KEYS);
  if (!raw || raw.version !== BUILDER_RESERVATION_PLAN_VERSION) return null;
  for (const key of [
    "projectHash", "taskSpecSha256", "evidencePlanSha256", "consentSha256",
    "contextSha256", "responseSha256", "selectionSha256",
  ] as const) {
    if (typeof raw[key] !== "string" || !SHA256.test(raw[key] as string)) return null;
  }
  if (typeof raw.beforeText !== "string" || typeof raw.afterText !== "string"
    || !wellFormedUtf16(raw.beforeText) || !wellFormedUtf16(raw.afterText)
    || raw.beforeText.length > BUILDER_RESERVATION_LIMITS.textCharacters
    || raw.afterText.length > BUILDER_RESERVATION_LIMITS.textCharacters
    || raw.beforeText.length + raw.afterText.length > BUILDER_RESERVATION_LIMITS.aggregateTextCharacters
    || FORBIDDEN_TEXT.test(raw.beforeText) || FORBIDDEN_TEXT.test(raw.afterText)) return null;
  const plan = Object.freeze({
    version: BUILDER_RESERVATION_PLAN_VERSION,
    projectHash: raw.projectHash as string,
    taskSpecSha256: raw.taskSpecSha256 as string,
    evidencePlanSha256: raw.evidencePlanSha256 as string,
    consentSha256: raw.consentSha256 as string,
    contextSha256: raw.contextSha256 as string,
    responseSha256: raw.responseSha256 as string,
    selectionSha256: raw.selectionSha256 as string,
    beforeText: raw.beforeText,
    afterText: raw.afterText,
  });
  return Buffer.byteLength(canonicalPlan(plan), "utf8") <= BUILDER_RESERVATION_LIMITS.planBytes ? plan : null;
}

function canonicalRevisionBody(value: Omit<RevisionRecord, "revisionSha256" | "authSha256">): string {
  return objectJson([
    ["version", stringJson(value.version)],
    ["operationId", stringJson(value.operationId)],
    ["revision", numberJson(value.revision)],
    ["previousRevisionSha256", nullableStringJson(value.previousRevisionSha256)],
    ["status", stringJson(value.status)],
    ["projectHash", stringJson(value.projectHash)],
    ["rootIdentitySha256", stringJson(value.rootIdentitySha256)],
    ["handlerRevision", stringJson(value.handlerRevision)],
    ["policyRevision", stringJson(value.policyRevision)],
    ["planSha256", stringJson(value.planSha256)],
    ["plan", canonicalPlan(value.plan)],
    ["receiptStatus", nullableStringJson(value.receiptStatus)],
    ["receiptSha256", nullableStringJson(value.receiptSha256)],
  ]);
}

function canonicalRevisionAuthenticated(value: Omit<RevisionRecord, "authSha256">): string {
  const body = canonicalRevisionBody(value);
  return `${body.slice(0, -1)},${quoted("revisionSha256")}:${quoted(value.revisionSha256)}}`;
}

function canonicalRevision(value: RevisionRecord): string {
  const authenticated = canonicalRevisionAuthenticated(value);
  return `${authenticated.slice(0, -1)},${quoted("authSha256")}:${quoted(value.authSha256)}}`;
}

function composeRevision(
  key: Buffer,
  operationId: string,
  revision: RevisionNumber,
  previousRevisionSha256: string | null,
  status: RevisionStatus,
  rootIdentitySha256: string,
  plan: BuilderReservationPlanV1,
  planSha256: string,
  receiptStatus: ReceiptStatus | null,
  receiptSha256: string | null,
): RevisionRecord {
  const body = Object.freeze({
    version: BUILDER_RESERVATION_REVISION_VERSION,
    operationId,
    revision,
    previousRevisionSha256,
    status,
    projectHash: plan.projectHash,
    rootIdentitySha256,
    handlerRevision: BUILDER_RESERVATION_HANDLER_REVISION,
    policyRevision: BUILDER_RESERVATION_POLICY_REVISION,
    planSha256,
    plan,
    receiptStatus,
    receiptSha256,
  });
  const revisionSha256 = sha(REVISION_SHA_DOMAIN, canonicalRevisionBody(body));
  const authenticated = Object.freeze({ ...body, revisionSha256 });
  return Object.freeze({ ...authenticated, authSha256: auth(key, REVISION_DOMAIN, canonicalRevisionAuthenticated(authenticated)) });
}

function parseRevision(text: string, key: Buffer): RevisionRecord | null {
  try {
    const raw = exactRecord(JSON.parse(text), REVISION_KEYS);
    if (!raw) return null;
    const plan = parsePlan(raw.plan);
    if (!plan || raw.version !== BUILDER_RESERVATION_REVISION_VERSION
      || typeof raw.operationId !== "string" || !UUID_V4.test(raw.operationId)
      || (raw.revision !== 1 && raw.revision !== 2)
      || (raw.previousRevisionSha256 !== null
        && (typeof raw.previousRevisionSha256 !== "string" || !SHA256.test(raw.previousRevisionSha256)))
      || (raw.status !== "reserved" && raw.status !== "complete")
      || typeof raw.projectHash !== "string" || raw.projectHash !== plan.projectHash
      || typeof raw.rootIdentitySha256 !== "string" || !SHA256.test(raw.rootIdentitySha256)
      || raw.handlerRevision !== BUILDER_RESERVATION_HANDLER_REVISION
      || raw.policyRevision !== BUILDER_RESERVATION_POLICY_REVISION
      || typeof raw.planSha256 !== "string" || !SHA256.test(raw.planSha256)
      || raw.planSha256 !== sha(PLAN_SHA_DOMAIN, canonicalPlan(plan))
      || (raw.receiptStatus !== null && raw.receiptStatus !== "accepted" && raw.receiptStatus !== "refused")
      || (raw.receiptSha256 !== null && (typeof raw.receiptSha256 !== "string" || !SHA256.test(raw.receiptSha256)))
      || typeof raw.revisionSha256 !== "string" || !SHA256.test(raw.revisionSha256)
      || typeof raw.authSha256 !== "string" || !SHA256.test(raw.authSha256)) return null;
    if ((raw.revision === 1 && (raw.previousRevisionSha256 !== null || raw.status !== "reserved"
        || raw.receiptStatus !== null || raw.receiptSha256 !== null))
      || (raw.revision === 2 && (raw.previousRevisionSha256 === null || raw.status !== "complete"
        || raw.receiptStatus === null || raw.receiptSha256 === null))) return null;
    const body = Object.freeze({
      version: BUILDER_RESERVATION_REVISION_VERSION,
      operationId: raw.operationId,
      revision: raw.revision as RevisionNumber,
      previousRevisionSha256: raw.previousRevisionSha256 as string | null,
      status: raw.status as RevisionStatus,
      projectHash: raw.projectHash,
      rootIdentitySha256: raw.rootIdentitySha256,
      handlerRevision: BUILDER_RESERVATION_HANDLER_REVISION,
      policyRevision: BUILDER_RESERVATION_POLICY_REVISION,
      planSha256: raw.planSha256,
      plan,
      receiptStatus: raw.receiptStatus as ReceiptStatus | null,
      receiptSha256: raw.receiptSha256 as string | null,
    });
    const expectedRevisionSha = sha(REVISION_SHA_DOMAIN, canonicalRevisionBody(body));
    if (!equalHex(raw.revisionSha256, expectedRevisionSha)) return null;
    const authenticated = Object.freeze({ ...body, revisionSha256: raw.revisionSha256 });
    const expectedAuth = auth(key, REVISION_DOMAIN, canonicalRevisionAuthenticated(authenticated));
    if (!equalHex(raw.authSha256, expectedAuth)) return null;
    const record = Object.freeze({ ...authenticated, authSha256: raw.authSha256 });
    return canonicalRevision(record) === text ? record : null;
  } catch {
    return null;
  }
}

function canonicalHighWaterBody(value: Omit<HighWaterRecord, "recordSha256" | "authSha256">): string {
  return objectJson([
    ["version", stringJson(value.version)],
    ["operationId", stringJson(value.operationId)],
    ["revision", numberJson(value.revision)],
    ["revisionSha256", stringJson(value.revisionSha256)],
    ["previousHighWaterSha256", nullableStringJson(value.previousHighWaterSha256)],
  ]);
}

function canonicalInventoryBody(value: Omit<InventoryRecord, "recordSha256" | "authSha256">): string {
  return objectJson([
    ["version", stringJson(value.version)],
    ["generation", numberJson(value.generation)],
    ["operationId", stringJson(value.operationId)],
    ["revision", numberJson(value.revision)],
    ["revisionSha256", stringJson(value.revisionSha256)],
    ["status", stringJson(value.status)],
    ["previousInventorySha256", nullableStringJson(value.previousInventorySha256)],
  ]);
}

function canonicalAnchorBody(value: Omit<AnchorRecord, "recordSha256" | "authSha256">): string {
  return objectJson([
    ["version", stringJson(value.version)],
    ["generation", numberJson(value.generation)],
    ["operationId", stringJson(value.operationId)],
    ["revision", numberJson(value.revision)],
    ["revisionSha256", stringJson(value.revisionSha256)],
    ["highWaterSha256", stringJson(value.highWaterSha256)],
    ["inventorySha256", stringJson(value.inventorySha256)],
    ["previousAnchorSha256", nullableStringJson(value.previousAnchorSha256)],
  ]);
}

function canonicalAuthenticated(body: string, recordSha256: string, authSha256?: string): string {
  const withSha = `${body.slice(0, -1)},${quoted("recordSha256")}:${quoted(recordSha256)}}`;
  return authSha256 === undefined
    ? withSha
    : `${withSha.slice(0, -1)},${quoted("authSha256")}:${quoted(authSha256)}}`;
}

function composeHighWater(
  key: Buffer,
  revision: RevisionRecord,
  previous: HighWaterRecord | null,
): HighWaterRecord {
  const body = Object.freeze({
    version: "cairn-builder-reservation-high-water/v1" as const,
    operationId: revision.operationId,
    revision: revision.revision,
    revisionSha256: revision.revisionSha256,
    previousHighWaterSha256: previous?.recordSha256 ?? null,
  });
  const recordSha256 = sha(HIGH_WATER_SHA_DOMAIN, canonicalHighWaterBody(body));
  const authenticated = canonicalAuthenticated(canonicalHighWaterBody(body), recordSha256);
  return Object.freeze({ ...body, recordSha256, authSha256: auth(key, HIGH_WATER_DOMAIN, authenticated) });
}

function composeInventory(
  key: Buffer,
  revision: RevisionRecord,
  previous: InventoryRecord | null,
): InventoryRecord {
  const body = Object.freeze({
    version: "cairn-builder-reservation-inventory/v1" as const,
    generation: revision.revision,
    operationId: revision.operationId,
    revision: revision.revision,
    revisionSha256: revision.revisionSha256,
    status: revision.status,
    previousInventorySha256: previous?.recordSha256 ?? null,
  });
  const recordSha256 = sha(INVENTORY_SHA_DOMAIN, canonicalInventoryBody(body));
  const authenticated = canonicalAuthenticated(canonicalInventoryBody(body), recordSha256);
  return Object.freeze({ ...body, recordSha256, authSha256: auth(key, INVENTORY_DOMAIN, authenticated) });
}

function composeAnchor(
  key: Buffer,
  revision: RevisionRecord,
  highWater: HighWaterRecord,
  inventory: InventoryRecord,
  previous: AnchorRecord | null,
): AnchorRecord {
  const body = Object.freeze({
    version: "cairn-builder-reservation-anchor/v1" as const,
    generation: revision.revision,
    operationId: revision.operationId,
    revision: revision.revision,
    revisionSha256: revision.revisionSha256,
    highWaterSha256: highWater.recordSha256,
    inventorySha256: inventory.recordSha256,
    previousAnchorSha256: previous?.recordSha256 ?? null,
  });
  const recordSha256 = sha(ANCHOR_SHA_DOMAIN, canonicalAnchorBody(body));
  const authenticated = canonicalAuthenticated(canonicalAnchorBody(body), recordSha256);
  return Object.freeze({ ...body, recordSha256, authSha256: auth(key, ANCHOR_DOMAIN, authenticated) });
}

function parseHighWater(text: string, key: Buffer): HighWaterRecord | null {
  try {
    const raw = exactRecord(JSON.parse(text), HIGH_WATER_KEYS);
    if (!raw || raw.version !== "cairn-builder-reservation-high-water/v1"
      || typeof raw.operationId !== "string" || !UUID_V4.test(raw.operationId)
      || (raw.revision !== 1 && raw.revision !== 2)
      || typeof raw.revisionSha256 !== "string" || !SHA256.test(raw.revisionSha256)
      || (raw.previousHighWaterSha256 !== null
        && (typeof raw.previousHighWaterSha256 !== "string" || !SHA256.test(raw.previousHighWaterSha256)))
      || typeof raw.recordSha256 !== "string" || !SHA256.test(raw.recordSha256)
      || typeof raw.authSha256 !== "string" || !SHA256.test(raw.authSha256)) return null;
    const body = Object.freeze({
      version: "cairn-builder-reservation-high-water/v1" as const,
      operationId: raw.operationId,
      revision: raw.revision as RevisionNumber,
      revisionSha256: raw.revisionSha256,
      previousHighWaterSha256: raw.previousHighWaterSha256 as string | null,
    });
    const recordSha = sha(HIGH_WATER_SHA_DOMAIN, canonicalHighWaterBody(body));
    const authenticated = canonicalAuthenticated(canonicalHighWaterBody(body), recordSha);
    if (!equalHex(raw.recordSha256, recordSha)
      || !equalHex(raw.authSha256, auth(key, HIGH_WATER_DOMAIN, authenticated))) return null;
    const record = Object.freeze({ ...body, recordSha256: raw.recordSha256, authSha256: raw.authSha256 });
    return canonicalAuthenticated(canonicalHighWaterBody(record), record.recordSha256, record.authSha256) === text ? record : null;
  } catch {
    return null;
  }
}

function parseInventory(text: string, key: Buffer): InventoryRecord | null {
  try {
    const raw = exactRecord(JSON.parse(text), INVENTORY_KEYS);
    if (!raw || raw.version !== "cairn-builder-reservation-inventory/v1"
      || (raw.generation !== 1 && raw.generation !== 2) || raw.revision !== raw.generation
      || typeof raw.operationId !== "string" || !UUID_V4.test(raw.operationId)
      || typeof raw.revisionSha256 !== "string" || !SHA256.test(raw.revisionSha256)
      || (raw.status !== "reserved" && raw.status !== "complete")
      || (raw.previousInventorySha256 !== null
        && (typeof raw.previousInventorySha256 !== "string" || !SHA256.test(raw.previousInventorySha256)))
      || typeof raw.recordSha256 !== "string" || !SHA256.test(raw.recordSha256)
      || typeof raw.authSha256 !== "string" || !SHA256.test(raw.authSha256)) return null;
    const body = Object.freeze({
      version: "cairn-builder-reservation-inventory/v1" as const,
      generation: raw.generation as RevisionNumber,
      operationId: raw.operationId,
      revision: raw.revision as RevisionNumber,
      revisionSha256: raw.revisionSha256,
      status: raw.status as RevisionStatus,
      previousInventorySha256: raw.previousInventorySha256 as string | null,
    });
    const recordSha = sha(INVENTORY_SHA_DOMAIN, canonicalInventoryBody(body));
    const authenticated = canonicalAuthenticated(canonicalInventoryBody(body), recordSha);
    if (!equalHex(raw.recordSha256, recordSha)
      || !equalHex(raw.authSha256, auth(key, INVENTORY_DOMAIN, authenticated))) return null;
    const record = Object.freeze({ ...body, recordSha256: raw.recordSha256, authSha256: raw.authSha256 });
    return canonicalAuthenticated(canonicalInventoryBody(record), record.recordSha256, record.authSha256) === text ? record : null;
  } catch {
    return null;
  }
}

function parseAnchor(text: string, key: Buffer): AnchorRecord | null {
  try {
    const raw = exactRecord(JSON.parse(text), ANCHOR_KEYS);
    if (!raw || raw.version !== "cairn-builder-reservation-anchor/v1"
      || (raw.generation !== 1 && raw.generation !== 2) || raw.revision !== raw.generation
      || typeof raw.operationId !== "string" || !UUID_V4.test(raw.operationId)
      || typeof raw.revisionSha256 !== "string" || !SHA256.test(raw.revisionSha256)
      || typeof raw.highWaterSha256 !== "string" || !SHA256.test(raw.highWaterSha256)
      || typeof raw.inventorySha256 !== "string" || !SHA256.test(raw.inventorySha256)
      || (raw.previousAnchorSha256 !== null
        && (typeof raw.previousAnchorSha256 !== "string" || !SHA256.test(raw.previousAnchorSha256)))
      || typeof raw.recordSha256 !== "string" || !SHA256.test(raw.recordSha256)
      || typeof raw.authSha256 !== "string" || !SHA256.test(raw.authSha256)) return null;
    const body = Object.freeze({
      version: "cairn-builder-reservation-anchor/v1" as const,
      generation: raw.generation as RevisionNumber,
      operationId: raw.operationId,
      revision: raw.revision as RevisionNumber,
      revisionSha256: raw.revisionSha256,
      highWaterSha256: raw.highWaterSha256,
      inventorySha256: raw.inventorySha256,
      previousAnchorSha256: raw.previousAnchorSha256 as string | null,
    });
    const recordSha = sha(ANCHOR_SHA_DOMAIN, canonicalAnchorBody(body));
    const authenticated = canonicalAuthenticated(canonicalAnchorBody(body), recordSha);
    if (!equalHex(raw.recordSha256, recordSha)
      || !equalHex(raw.authSha256, auth(key, ANCHOR_DOMAIN, authenticated))) return null;
    const record = Object.freeze({ ...body, recordSha256: raw.recordSha256, authSha256: raw.authSha256 });
    return canonicalAuthenticated(canonicalAnchorBody(record), record.recordSha256, record.authSha256) === text ? record : null;
  } catch {
    return null;
  }
}

function fixtureRoot(value: string): string | null {
  try {
    if (typeof value !== "string") return null;
    const appRoot = resolve(process.cwd());
    if (basename(appRoot).toLowerCase() !== "app") return null;
    const root = resolve(value);
    const testResults = resolve(appRoot, "test-results");
    const claimRoot = dirname(root);
    const rel = relative(testResults, claimRoot);
    if (basename(root) !== STORE_FIXTURE_NAME || dirname(claimRoot) !== testResults
      || rel === "" || rel.startsWith("..") || !FIXTURE_NAME.test(basename(claimRoot))
      || !directoryNoLink(claimRoot)) return null;
    return root;
  } catch {
    return null;
  }
}

function directoryNoLink(path: string): boolean {
  try {
    const stat = lstatSync(path, { bigint: true });
    return stat.isDirectory() && !stat.isSymbolicLink() && stat.nlink >= 1n
      && realpathSync.native(path) === resolve(path);
  } catch {
    return false;
  }
}

function rootIdentity(root: string): string | null {
  try {
    const lexical = resolve(root);
    const before = lstatSync(lexical, { bigint: true });
    const real = realpathSync.native(lexical);
    const after = lstatSync(real, { bigint: true });
    if (!before.isDirectory() || before.isSymbolicLink() || !after.isDirectory() || after.isSymbolicLink()
      || before.dev <= 0n || before.ino <= 0n || before.dev !== after.dev || before.ino !== after.ino
      || real !== lexical) return null;
    return sha(ROOT_IDENTITY_DOMAIN, `${real}\0${after.dev.toString(10)}\0${after.ino.toString(10)}`);
  } catch {
    return null;
  }
}

function stableRead(path: string, maximumBytes: number, exactBytes?: number): Buffer | null {
  let descriptor: number | null = null;
  try {
    const before = lstatSync(path, { bigint: true });
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n || before.size < 1n
      || before.size > BigInt(maximumBytes) || (exactBytes !== undefined && before.size !== BigInt(exactBytes))) return null;
    descriptor = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || opened.dev !== before.dev || opened.ino !== before.ino
      || opened.size !== before.size || opened.mtimeNs !== before.mtimeNs || opened.ctimeNs !== before.ctimeNs) return null;
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    const named = lstatSync(path, { bigint: true });
    if (after.dev !== opened.dev || after.ino !== opened.ino || named.dev !== opened.dev || named.ino !== opened.ino
      || after.nlink !== 1n || named.nlink !== 1n || after.size !== opened.size || named.size !== opened.size
      || after.mtimeNs !== opened.mtimeNs || after.ctimeNs !== opened.ctimeNs
      || named.mtimeNs !== opened.mtimeNs || named.ctimeNs !== opened.ctimeNs
      || bytes.byteLength !== Number(opened.size)) return null;
    return bytes;
  } catch {
    return null;
  } finally {
    if (descriptor !== null) {
      try { closeSync(descriptor); } catch { /* read-only close */ }
    }
  }
}

function stableText(path: string): string | null {
  const bytes = stableRead(path, BUILDER_RESERVATION_LIMITS.recordBytes);
  if (!bytes) return null;
  const text = bytes.toString("utf8");
  return Buffer.from(text, "utf8").equals(bytes) && wellFormedUtf16(text) ? text : null;
}

function writeNew(path: string, textOrBytes: string | Buffer): void {
  const bytes = typeof textOrBytes === "string" ? Buffer.from(textOrBytes, "utf8") : textOrBytes;
  if (bytes.byteLength < 1 || bytes.byteLength > BUILDER_RESERVATION_LIMITS.recordBytes) {
    throw new Error("BUILDER_RESERVATION_RECORD_SIZE_INVALID");
  }
  let descriptor: number | null = null;
  try {
    descriptor = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | (constants.O_NOFOLLOW ?? 0), 0o600);
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || opened.size !== BigInt(bytes.byteLength)) {
      throw new Error("BUILDER_RESERVATION_WRITE_TOPOLOGY_INVALID");
    }
    closeSync(descriptor);
    descriptor = null;
    if (stableRead(path, bytes.byteLength, bytes.byteLength)?.equals(bytes) !== true) {
      throw new Error("BUILDER_RESERVATION_READBACK_FAILED");
    }
  } finally {
    if (descriptor !== null) {
      try { closeSync(descriptor); } catch { /* write close */ }
    }
  }
}

function generationName(revision: RevisionNumber): string {
  return `${revision.toString().padStart(8, "0")}.json`;
}

function generationCount(path: string): number | null {
  try {
    const names = readdirSync(path).sort();
    if (names.some((name) => !GENERATION_NAME.test(name)) || names.length > BUILDER_RESERVATION_LIMITS.revisions) return null;
    if (names.length >= 1 && names[0] !== generationName(1)) return null;
    if (names.length === 2 && names[1] !== generationName(2)) return null;
    return names.length;
  } catch {
    return null;
  }
}

function emptyState(status: BuilderReservationStatusV1): ReadState {
  return Object.freeze({
    projection: projection(status),
    key: null,
    revisionOne: null,
    revisionTwo: null,
    highWaterOne: null,
    highWaterTwo: null,
    inventoryOne: null,
    inventoryTwo: null,
    anchorOne: null,
    anchorTwo: null,
  });
}

function projection(
  status: BuilderReservationStatusV1,
  record: RevisionRecord | null = null,
): BuilderReservationProjectionV1 {
  return Object.freeze({
    version: "cairn-builder-reservation-projection/v1",
    status,
    operationId: record?.operationId ?? null,
    revision: record?.revision ?? null,
    reservationSha256: record?.revisionSha256 ?? null,
    projectHash: record?.projectHash ?? null,
    planSha256: record?.planSha256 ?? null,
    handlerRevision: record?.handlerRevision ?? null,
    authorityAvailable: false,
    processCrashReadback: status === "reserved" || status === "complete"
      ? "exact-stable-readback"
      : "none",
    fileFsyncCompletionAfterCrash: "not-provable",
    powerLossDurability: "unproved",
  });
}

function exactTopLevel(root: string): boolean {
  try {
    const expected = [ANCHORS_NAME, HIGH_WATER_NAME, INVENTORY_NAME, KEY_NAME, OPERATIONS_NAME].sort();
    return readdirSync(root).sort().join("\0") === expected.join("\0");
  } catch {
    return false;
  }
}

function chainMatches(
  revision: RevisionRecord,
  highWater: HighWaterRecord,
  inventory: InventoryRecord,
  anchor: AnchorRecord,
  previousHighWater: HighWaterRecord | null,
  previousInventory: InventoryRecord | null,
  previousAnchor: AnchorRecord | null,
): boolean {
  return highWater.operationId === revision.operationId
    && highWater.revision === revision.revision
    && highWater.revisionSha256 === revision.revisionSha256
    && highWater.previousHighWaterSha256 === (previousHighWater?.recordSha256 ?? null)
    && inventory.operationId === revision.operationId
    && inventory.generation === revision.revision
    && inventory.revision === revision.revision
    && inventory.revisionSha256 === revision.revisionSha256
    && inventory.status === revision.status
    && inventory.previousInventorySha256 === (previousInventory?.recordSha256 ?? null)
    && anchor.operationId === revision.operationId
    && anchor.generation === revision.revision
    && anchor.revision === revision.revision
    && anchor.revisionSha256 === revision.revisionSha256
    && anchor.highWaterSha256 === highWater.recordSha256
    && anchor.inventorySha256 === inventory.recordSha256
    && anchor.previousAnchorSha256 === (previousAnchor?.recordSha256 ?? null);
}

function highWaterMatches(
  revision: RevisionRecord,
  highWater: HighWaterRecord,
  previous: HighWaterRecord | null,
): boolean {
  return highWater.operationId === revision.operationId
    && highWater.revision === revision.revision
    && highWater.revisionSha256 === revision.revisionSha256
    && highWater.previousHighWaterSha256 === (previous?.recordSha256 ?? null);
}

function inventoryMatches(
  revision: RevisionRecord,
  inventory: InventoryRecord,
  previous: InventoryRecord | null,
): boolean {
  return inventory.operationId === revision.operationId
    && inventory.generation === revision.revision
    && inventory.revision === revision.revision
    && inventory.revisionSha256 === revision.revisionSha256
    && inventory.status === revision.status
    && inventory.previousInventorySha256 === (previous?.recordSha256 ?? null);
}

function anchorMatches(
  revision: RevisionRecord,
  anchor: AnchorRecord,
  highWater: HighWaterRecord,
  inventory: InventoryRecord,
  previous: AnchorRecord | null,
): boolean {
  return anchor.operationId === revision.operationId
    && anchor.generation === revision.revision
    && anchor.revision === revision.revision
    && anchor.revisionSha256 === revision.revisionSha256
    && anchor.highWaterSha256 === highWater.recordSha256
    && anchor.inventorySha256 === inventory.recordSha256
    && anchor.previousAnchorSha256 === (previous?.recordSha256 ?? null);
}

function readState(rootValue: string): ReadState {
  const root = fixtureRoot(rootValue);
  if (!root || !existsSync(root)) return emptyState("absent");
  if (!directoryNoLink(root) || !exactTopLevel(root)) return emptyState("recovery-required");
  const operationsRoot = resolve(root, OPERATIONS_NAME);
  const highWaterRoot = resolve(root, HIGH_WATER_NAME);
  const inventoryRoot = resolve(root, INVENTORY_NAME);
  const anchorsRoot = resolve(root, ANCHORS_NAME);
  if (![operationsRoot, highWaterRoot, inventoryRoot, anchorsRoot].every(directoryNoLink)) {
    return emptyState("recovery-required");
  }
  const key = stableRead(resolve(root, KEY_NAME), KEY_BYTES, KEY_BYTES);
  if (!key) return emptyState("recovery-required");
  try {
    const operationNames = readdirSync(operationsRoot).sort();
    const highWaterCount = generationCount(highWaterRoot);
    const inventoryCount = generationCount(inventoryRoot);
    const anchorCount = generationCount(anchorsRoot);
    if (highWaterCount === null || inventoryCount === null || anchorCount === null
      || operationNames.length > BUILDER_RESERVATION_LIMITS.operations
      || operationNames.some((name) => !UUID_V4.test(name))) return emptyState("recovery-required");
    if (operationNames.length === 0) {
      return highWaterCount === 0 && inventoryCount === 0 && anchorCount === 0
        ? Object.freeze({ ...emptyState("interrupted"), key })
        : emptyState("recovery-required");
    }
    const operationId = operationNames[0]!;
    const operationRoot = resolve(operationsRoot, operationId);
    const revisionsRoot = resolve(operationRoot, "revisions");
    if (!directoryNoLink(operationRoot) || readdirSync(operationRoot).join("\0") !== "revisions"
      || !directoryNoLink(revisionsRoot)) return emptyState("recovery-required");
    const revisionCount = generationCount(revisionsRoot);
    if (revisionCount === null) return emptyState("recovery-required");
    if (revisionCount === 0) {
      return highWaterCount === 0 && inventoryCount === 0 && anchorCount === 0
        ? Object.freeze({ ...emptyState("interrupted"), key })
        : emptyState("recovery-required");
    }
    const revisionOneText = stableText(resolve(revisionsRoot, generationName(1)));
    const revisionOne = revisionOneText ? parseRevision(revisionOneText, key) : null;
    const currentRootIdentity = rootIdentity(root);
    if (!revisionOne || revisionOne.operationId !== operationId || revisionOne.revision !== 1
      || currentRootIdentity === null || revisionOne.rootIdentitySha256 !== currentRootIdentity) {
      return emptyState("recovery-required");
    }
    const revisionTwo = revisionCount === 2
      ? (() => {
          const text = stableText(resolve(revisionsRoot, generationName(2)));
          return text ? parseRevision(text, key) : null;
        })()
      : null;
    if (revisionCount === 2 && (!revisionTwo || revisionTwo.operationId !== operationId
      || revisionTwo.revision !== 2 || revisionTwo.previousRevisionSha256 !== revisionOne.revisionSha256
      || canonicalPlan(revisionTwo.plan) !== canonicalPlan(revisionOne.plan)
      || revisionTwo.planSha256 !== revisionOne.planSha256 || revisionTwo.projectHash !== revisionOne.projectHash
      || revisionTwo.rootIdentitySha256 !== revisionOne.rootIdentitySha256)) {
      return emptyState("recovery-required");
    }
    const readHighWater = (number: RevisionNumber): HighWaterRecord | null => {
      const text = stableText(resolve(highWaterRoot, generationName(number)));
      return text ? parseHighWater(text, key) : null;
    };
    const readInventory = (number: RevisionNumber): InventoryRecord | null => {
      const text = stableText(resolve(inventoryRoot, generationName(number)));
      return text ? parseInventory(text, key) : null;
    };
    const readAnchor = (number: RevisionNumber): AnchorRecord | null => {
      const text = stableText(resolve(anchorsRoot, generationName(number)));
      return text ? parseAnchor(text, key) : null;
    };
    const highWaterOne = highWaterCount >= 1 ? readHighWater(1) : null;
    const inventoryOne = inventoryCount >= 1 ? readInventory(1) : null;
    const anchorOne = anchorCount >= 1 ? readAnchor(1) : null;
    const highWaterTwo = highWaterCount === 2 ? readHighWater(2) : null;
    const inventoryTwo = inventoryCount === 2 ? readInventory(2) : null;
    const anchorTwo = anchorCount === 2 ? readAnchor(2) : null;
    if ((highWaterCount >= 1 && !highWaterOne) || (inventoryCount >= 1 && !inventoryOne)
      || (anchorCount >= 1 && !anchorOne) || (highWaterCount === 2 && !highWaterTwo)
      || (inventoryCount === 2 && !inventoryTwo) || (anchorCount === 2 && !anchorTwo)) {
      return emptyState("recovery-required");
    }
    const exactPrefix = (revisionCount === 1 && (
      (highWaterCount === 0 && inventoryCount === 0 && anchorCount === 0)
      || (highWaterCount === 1 && inventoryCount === 0 && anchorCount === 0)
      || (highWaterCount === 1 && inventoryCount === 1 && anchorCount === 0)
      || (highWaterCount === 1 && inventoryCount === 1 && anchorCount === 1)
    )) || (revisionCount === 2 && highWaterCount >= 1 && inventoryCount >= 1 && anchorCount >= 1 && (
      (highWaterCount === 1 && inventoryCount === 1 && anchorCount === 1)
      || (highWaterCount === 2 && inventoryCount === 1 && anchorCount === 1)
      || (highWaterCount === 2 && inventoryCount === 2 && anchorCount === 1)
      || (highWaterCount === 2 && inventoryCount === 2 && anchorCount === 2)
    ));
    if (!exactPrefix) return emptyState("recovery-required");
    if (highWaterOne && !highWaterMatches(revisionOne, highWaterOne, null)) {
      return emptyState("recovery-required");
    }
    if (inventoryOne && !inventoryMatches(revisionOne, inventoryOne, null)) {
      return emptyState("recovery-required");
    }
    if (anchorOne && (!highWaterOne || !inventoryOne
      || !anchorMatches(revisionOne, anchorOne, highWaterOne, inventoryOne, null))) {
      return emptyState("recovery-required");
    }
    if (revisionTwo?.receiptStatus && revisionTwo.receiptSha256 !== sha(
      RECEIPT_SHA_DOMAIN,
      canonicalReceipt(bindingFromRevision(revisionOne), revisionTwo.receiptStatus),
    )) {
      return emptyState("recovery-required");
    }
    if (highWaterTwo && !highWaterMatches(revisionTwo!, highWaterTwo, highWaterOne)) {
      return emptyState("recovery-required");
    }
    if (inventoryTwo && !inventoryMatches(revisionTwo!, inventoryTwo, inventoryOne)) {
      return emptyState("recovery-required");
    }
    if (anchorTwo && (!highWaterTwo || !inventoryTwo
      || !anchorMatches(revisionTwo!, anchorTwo, highWaterTwo, inventoryTwo, anchorOne))) {
      return emptyState("recovery-required");
    }
    if (highWaterOne && inventoryOne && anchorOne
      && !chainMatches(revisionOne, highWaterOne, inventoryOne, anchorOne, null, null, null)) {
      return emptyState("recovery-required");
    }
    if (revisionTwo && highWaterTwo && inventoryTwo && anchorTwo
      && !chainMatches(revisionTwo, highWaterTwo, inventoryTwo, anchorTwo, highWaterOne, inventoryOne, anchorOne)) {
      return emptyState("recovery-required");
    }
    const completeOne = revisionCount === 1 && highWaterCount === 1 && inventoryCount === 1 && anchorCount === 1;
    const completeTwo = revisionCount === 2 && highWaterCount === 2 && inventoryCount === 2 && anchorCount === 2;
    // Once revision 2 exists, an incomplete suffix is indistinguishable from
    // deletion of a formerly complete suffix without an external monotonic
    // witness. Fail closed as recovery-required; never call it resumable.
    const status: BuilderReservationStatusV1 = completeTwo
      ? "complete"
      : completeOne && revisionCount === 1
        ? "reserved"
        : revisionCount === 2
          ? "recovery-required"
          : "interrupted";
    const current = revisionTwo ?? revisionOne;
    return Object.freeze({
      projection: projection(status, current),
      key,
      revisionOne,
      revisionTwo,
      highWaterOne,
      highWaterTwo,
      inventoryOne,
      inventoryTwo,
      anchorOne,
      anchorTwo,
    });
  } catch {
    return emptyState("recovery-required");
  }
}

function bindingFromRevision(record: RevisionRecord): BuilderReservationAuthorityBindingV1 {
  return Object.freeze({
    operationId: record.operationId,
    reservationSha256: record.revisionSha256,
    projectHash: record.projectHash,
    revision: record.revision,
    handlerRevision: record.handlerRevision,
    planSha256: record.planSha256,
  });
}

function sameBinding(left: BuilderReservationAuthorityBindingV1, right: BuilderReservationAuthorityBindingV1): boolean {
  return left.operationId === right.operationId
    && left.reservationSha256 === right.reservationSha256
    && left.projectHash === right.projectHash
    && left.revision === right.revision
    && left.handlerRevision === right.handlerRevision
    && left.planSha256 === right.planSha256;
}

function canonicalReceipt(binding: BuilderReservationAuthorityBindingV1, status: ReceiptStatus): string {
  return objectJson([
    ["version", stringJson(BUILDER_RESERVATION_FAKE_RECEIPT_VERSION)],
    ["status", stringJson(status)],
    ["operationId", stringJson(binding.operationId)],
    ["reservationSha256", stringJson(binding.reservationSha256)],
    ["projectHash", stringJson(binding.projectHash)],
    ["revision", numberJson(binding.revision)],
    ["handlerRevision", stringJson(binding.handlerRevision)],
    ["planSha256", stringJson(binding.planSha256)],
  ]);
}

function createFixtureRoot(root: string): void {
  const testResults = dirname(root);
  if (!existsSync(testResults)) mkdirSync(testResults, { recursive: true });
  if (!directoryNoLink(testResults)) throw new Error("BUILDER_RESERVATION_FIXTURE_PARENT_INVALID");
  mkdirSync(root, { recursive: false, mode: 0o700 });
  for (const child of [OPERATIONS_NAME, HIGH_WATER_NAME, INVENTORY_NAME, ANCHORS_NAME]) {
    mkdirSync(resolve(root, child), { recursive: false, mode: 0o700 });
  }
  if (!directoryNoLink(root) || !exactTopLevelBeforeKey(root)) {
    throw new Error("BUILDER_RESERVATION_FIXTURE_TOPOLOGY_INVALID");
  }
}

function exactTopLevelBeforeKey(root: string): boolean {
  try {
    const expected = [ANCHORS_NAME, HIGH_WATER_NAME, INVENTORY_NAME, OPERATIONS_NAME].sort();
    return readdirSync(root).sort().join("\0") === expected.join("\0");
  } catch {
    return false;
  }
}

export function reserveBuilderReservation(rootValue: string, planValue: unknown): BuilderReservationV1 | null {
  const root = fixtureRoot(rootValue);
  const plan = parsePlan(planValue);
  if (!root || !plan || existsSync(root)) return null;
  try {
    createFixtureRoot(root);
    const key = randomBytes(KEY_BYTES);
    writeNew(resolve(root, KEY_NAME), key);
    const operationId = randomUUID();
    const operationRoot = resolve(root, OPERATIONS_NAME, operationId);
    const revisionsRoot = resolve(operationRoot, "revisions");
    mkdirSync(operationRoot, { recursive: false, mode: 0o700 });
    mkdirSync(revisionsRoot, { recursive: false, mode: 0o700 });
    const planSha256 = sha(PLAN_SHA_DOMAIN, canonicalPlan(plan));
    const identitySha256 = rootIdentity(root);
    if (identitySha256 === null) return null;
    const revision = composeRevision(key, operationId, 1, null, "reserved", identitySha256, plan, planSha256, null, null);
    writeNew(resolve(revisionsRoot, generationName(1)), canonicalRevision(revision));
    const highWater = composeHighWater(key, revision, null);
    writeNew(resolve(root, HIGH_WATER_NAME, generationName(1)), canonicalAuthenticated(
      canonicalHighWaterBody(highWater), highWater.recordSha256, highWater.authSha256,
    ));
    const inventory = composeInventory(key, revision, null);
    writeNew(resolve(root, INVENTORY_NAME, generationName(1)), canonicalAuthenticated(
      canonicalInventoryBody(inventory), inventory.recordSha256, inventory.authSha256,
    ));
    const anchor = composeAnchor(key, revision, highWater, inventory, null);
    writeNew(resolve(root, ANCHORS_NAME, generationName(1)), canonicalAuthenticated(
      canonicalAnchorBody(anchor), anchor.recordSha256, anchor.authSha256,
    ));
    const state = readState(root);
    if (state.projection.status !== "reserved" || !state.revisionOne) return null;
    const binding = bindingFromRevision(state.revisionOne);
    const handle = Object.freeze(Object.create(null)) as BuilderReservationHandle;
    const live: LiveReservation = { root, handle, binding, grantMinted: false, complete: false };
    handleBindings.set(handle, live);
    return Object.freeze({ projection: state.projection, binding, handle });
  } catch {
    return null;
  }
}

export function inspectBuilderReservation(rootValue: string): BuilderReservationProjectionV1 {
  return readState(rootValue).projection;
}

export function mintBuilderReservationGrant(
  handle: unknown,
  bindingValue: unknown,
): BuilderReservationGrant | null {
  if (handle === null || typeof handle !== "object") return null;
  const live = handleBindings.get(handle);
  const binding = parseBuilderReservationBindingForFake(bindingValue);
  if (!live || !binding || live.complete || live.grantMinted || !sameBinding(live.binding, binding)) return null;
  const state = readState(live.root);
  if (state.projection.status !== "reserved" || !state.revisionOne
    || !sameBinding(bindingFromRevision(state.revisionOne), binding)) return null;
  const grant = Object.freeze(Object.create(null)) as BuilderReservationGrant;
  grantBindings.set(grant, Object.freeze({ live, expected: binding }));
  live.grantMinted = true;
  return grant;
}

function liveBindingIsCurrent(
  live: LiveReservation,
  expected: BuilderReservationAuthorityBindingV1,
): boolean {
  if (live.complete || !sameBinding(live.binding, expected)) return false;
  const state = readState(live.root);
  return state.projection.status === "reserved" && state.revisionOne !== null
    && sameBinding(bindingFromRevision(state.revisionOne), expected);
}

/** Sole narrow grant consumer for the compile-time-closed effect-free fake. */
export function consumeBuilderReservationGrantForFake(
  value: unknown,
  bindingValue: unknown,
): BuilderReservationGrantConsumption | null {
  if (value === null || typeof value !== "object" || spentGrants.has(value)) return null;
  const expected = parseBuilderReservationBindingForFake(bindingValue);
  const stored = grantBindings.get(value);
  if (!expected || !stored || !sameBinding(stored.expected, expected)
    || !liveBindingIsCurrent(stored.live, stored.expected)) return null;
  spentGrants.add(value);
  const consumption = Object.freeze(Object.create(null)) as BuilderReservationGrantConsumption;
  consumptionBindings.set(consumption, stored);
  return consumption;
}

/** Convert one genuine post-spend token into the fake's branded receipt. */
export function composeBuilderReservationFakeReceiptForTest(
  value: unknown,
  status: ReceiptStatus,
): BuilderReservationFakeReceiptV1 | null {
  if (value === null || typeof value !== "object" || completedConsumptions.has(value)
    || (status !== "accepted" && status !== "refused")) return null;
  const stored = consumptionBindings.get(value);
  if (!stored) return null;
  completedConsumptions.add(value);
  const receipt = Object.freeze({
    version: BUILDER_RESERVATION_FAKE_RECEIPT_VERSION,
    status,
    operationId: stored.expected.operationId,
    reservationSha256: stored.expected.reservationSha256,
    projectHash: stored.expected.projectHash,
    revision: stored.expected.revision,
    handlerRevision: BUILDER_RESERVATION_HANDLER_REVISION,
    planSha256: stored.expected.planSha256,
  });
  fakeReceiptBindings.set(receipt, Object.freeze({ ...stored, status }));
  return receipt;
}

function consumeBuilderReservationFakeReceipt(
  value: unknown,
  bindingValue: unknown,
): ReceiptStatus | null {
  if (value === null || typeof value !== "object" || spentFakeReceipts.has(value)) return null;
  const expected = parseBuilderReservationBindingForFake(bindingValue);
  const stored = fakeReceiptBindings.get(value);
  if (!expected || !stored || !sameBinding(stored.expected, expected)
    || !liveBindingIsCurrent(stored.live, stored.expected)) return null;
  spentFakeReceipts.add(value);
  return stored.status;
}

export function completeBuilderReservation(
  handle: unknown,
  bindingValue: unknown,
  receipt: unknown,
): BuilderReservationProjectionV1 | null {
  if (handle === null || typeof handle !== "object") return null;
  const live = handleBindings.get(handle);
  const binding = parseBuilderReservationBindingForFake(bindingValue);
  if (!live || !binding || live.complete || !sameBinding(live.binding, binding)) return null;
  // Preflight exact current custody before spending the receipt. The receipt
  // consumer performs another fresh verifier pass immediately before spend.
  const state = readState(live.root);
  if (state.projection.status !== "reserved" || !state.key || !state.revisionOne
    || !state.highWaterOne || !state.inventoryOne || !state.anchorOne) return null;
  try {
    const receiptStatus = consumeBuilderReservationFakeReceipt(receipt, binding);
    if (receiptStatus === null) return null;
    const receiptSha256 = sha(RECEIPT_SHA_DOMAIN, canonicalReceipt(binding, receiptStatus));
    const revision = composeRevision(
      state.key,
      binding.operationId,
      2,
      state.revisionOne.revisionSha256,
      "complete",
      state.revisionOne.rootIdentitySha256,
      state.revisionOne.plan,
      state.revisionOne.planSha256,
      receiptStatus,
      receiptSha256,
    );
    const revisionsRoot = resolve(live.root, OPERATIONS_NAME, binding.operationId, "revisions");
    writeNew(resolve(revisionsRoot, generationName(2)), canonicalRevision(revision));
    const highWater = composeHighWater(state.key, revision, state.highWaterOne);
    writeNew(resolve(live.root, HIGH_WATER_NAME, generationName(2)), canonicalAuthenticated(
      canonicalHighWaterBody(highWater), highWater.recordSha256, highWater.authSha256,
    ));
    const inventory = composeInventory(state.key, revision, state.inventoryOne);
    writeNew(resolve(live.root, INVENTORY_NAME, generationName(2)), canonicalAuthenticated(
      canonicalInventoryBody(inventory), inventory.recordSha256, inventory.authSha256,
    ));
    const anchor = composeAnchor(state.key, revision, highWater, inventory, state.anchorOne);
    writeNew(resolve(live.root, ANCHORS_NAME, generationName(2)), canonicalAuthenticated(
      canonicalAnchorBody(anchor), anchor.recordSha256, anchor.authSha256,
    ));
    const completed = readState(live.root).projection;
    if (completed.status !== "complete" || completed.operationId !== binding.operationId) return null;
    live.complete = true;
    return completed;
  } catch {
    return null;
  }
}
