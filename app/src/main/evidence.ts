import { createHash, randomUUID } from "node:crypto";
import {
  CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION,
  evidencePlanSha256,
  parseWorkerProcessEventBundle,
  taskSpecSha256,
  type CriterionResultV1,
  type EvidencePlanV1,
  type EvidenceProcedureV1,
  type TaskSpecV1,
} from "@cairn/core";
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  opendirSync,
  readSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import type {
  EvidenceAlbum,
  EvidenceAlbumEntry,
  EvidenceImage,
  EvidenceImageData,
  EvidenceImageRole,
} from "../shared/ipc.js";
import { atomicWriteText } from "./atomicwrite.js";

const RECORD_VERSION = 1 as const;
const UUID_SOURCE = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const UUID = new RegExp(`^${UUID_SOURCE}$`, "i");
const TRUSTED_IMAGE_ID = new RegExp(`^(${UUID_SOURCE})\\.(${UUID_SOURCE})$`, "i");
const SHA256 = /^[0-9a-f]{64}$/;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
const MAX_RECORD_BYTES = 128 * 1024;
const MAX_CAPTURES_PER_RUN = 8;
const ALBUM_PAGE_SIZE = 40;
const MAX_TIMELINE_MARKERS_PER_PAGE = 160;
const MAX_TIMELINE_PATH_PROBES = 4_000;
const MAX_TIMELINE_SAME_TIME_ENTRIES = 160;
const TIMELINE_TIMESTAMP_DIGITS = 17;
const MAX_LEGACY_MANIFEST_BYTES = 2 * 1024 * 1024;
const MAX_LEGACY_ENTRIES = 500;
const MAX_LEGACY_SHOTS = 20;
const MAX_LEGACY_IMAGES = 200;
const MAX_LEGACY_IMAGE_BYTES_TOTAL = 64 * 1024 * 1024;
const MAX_TRUSTED_HISTORY_IMAGE_BYTES_TOTAL = MAX_IMAGE_BYTES * MAX_CAPTURES_PER_RUN;
const TIMELINE_KEY = /^\d{17}[0-9a-f]{32}$/;

export const MAIN_ADAPTER_COMMAND_EVIDENCE_REDUCTION_VERSION =
  "cairn-main-adapter-command-evidence-reduction/v1" as const;
const ADAPTER_COMMAND_ATTESTATION_VERSION = "cairn-adapter-command-attestation/v1" as const;

/** Hash/exit custody only. This intentionally mirrors Core's record field but
 * cannot carry a status, source, verdict, disposition, or raw command. */
export type MainAdapterCommandAttestationV1 = Readonly<{
  version: typeof ADAPTER_COMMAND_ATTESTATION_VERSION;
  taskSpecSha256: string;
  evidencePlanSha256: string;
  criterionId: `c${number}`;
  sequence: number;
  commandSha256: string;
  exitCode: number;
}>;

/** One Main-owned reduction of canonical adapter process facts. */
export type MainAdapterCommandEvidenceReductionV1 = Readonly<{
  version: typeof MAIN_ADAPTER_COMMAND_EVIDENCE_REDUCTION_VERSION;
  taskSpecSha256: string;
  evidencePlanSha256: string;
  candidateSha256: string;
  adapterAttestations: readonly MainAdapterCommandAttestationV1[];
  criterionResults: readonly CriterionResultV1[];
}>;

const mainAdapterCommandEvidenceReductionBrand = new WeakSet<object>();

export function isMainAdapterCommandEvidenceReduction(
  value: unknown,
): value is MainAdapterCommandEvidenceReductionV1 {
  return value !== null && typeof value === "object" && mainAdapterCommandEvidenceReductionBrand.has(value);
}

function adapterCriterionResult(
  procedure: EvidenceProcedureV1,
  candidateSha256: string,
  evidencePlanSha256Value: string,
  status: "met" | "not-met" | "cant-tell",
): CriterionResultV1 {
  return Object.freeze({
    criterionId: procedure.criterionId,
    candidateSha256,
    status,
    source: "adapter-execution",
    evidenceRefs: status === "cant-tell"
      ? Object.freeze([])
      : Object.freeze([...procedure.artifactIds]),
    evidencePlanSha256: evidencePlanSha256Value,
    resolutionSha256: null,
  });
}

/**
 * Reduce a compatible adapter's already-captured process stream. Main obtains
 * every authority-bearing field from the exact branded Task Spec/Evidence
 * Plan. The adapter supplies only bounded command hash/exit facts.
 *
 * Invalid authority or a malformed bundle returns null. A valid bundle that
 * cannot prove a unique planned command returns an explicit `cant-tell` for
 * that adapter-attested criterion. This function never executes or copies the
 * Evidence Plan's raw command text.
 */
export function reduceAdapterCommandEvidence(
  taskSpec: unknown,
  evidencePlan: unknown,
  processEvents: unknown,
  candidateSha256: unknown,
): MainAdapterCommandEvidenceReductionV1 | null {
  try {
    const taskSha = taskSpecSha256(taskSpec);
    const planSha = evidencePlanSha256(evidencePlan);
    if (taskSha === null || planSha === null || typeof candidateSha256 !== "string"
      || !SHA256.test(candidateSha256)) return null;

    const spec = taskSpec as TaskSpecV1;
    const plan = evidencePlan as EvidencePlanV1;
    if (plan.taskSpecSha256 !== taskSha
      || plan.procedures.length !== spec.quality.acceptanceChecks.length
      || plan.procedures.some((procedure, index) =>
        procedure.criterionId !== spec.quality.acceptanceChecks[index]?.id)) return null;

    const bundle = parseWorkerProcessEventBundle(processEvents);
    if (bundle === null) return null;

    const commandProcedures = plan.procedures.filter(
      (procedure): procedure is EvidenceProcedureV1 & { command: NonNullable<EvidenceProcedureV1["command"]> } =>
        procedure.kind === "adapter-command-attestation" && procedure.command !== null,
    );
    const proceduresByHash = new Map<string, EvidenceProcedureV1[]>();
    for (const procedure of commandProcedures) {
      const peers = proceduresByHash.get(procedure.command.sha256) ?? [];
      peers.push(procedure);
      proceduresByHash.set(procedure.command.sha256, peers);
    }

    const usable = bundle.representation === CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION && bundle.complete;
    const attestations: MainAdapterCommandAttestationV1[] = [];
    const criterionResults: CriterionResultV1[] = [];
    for (const procedure of commandProcedures) {
      const command = procedure.command;
      const plannedPeers = proceduresByHash.get(command.sha256) ?? [];
      const matches = usable
        ? bundle.events.filter((event) => event.commandSha256 === command.sha256)
        : [];
      if (!usable || plannedPeers.length !== 1 || matches.length !== 1) {
        criterionResults.push(adapterCriterionResult(procedure, candidateSha256, planSha, "cant-tell"));
        continue;
      }

      const event = matches[0];
      attestations.push(Object.freeze({
        version: ADAPTER_COMMAND_ATTESTATION_VERSION,
        taskSpecSha256: taskSha,
        evidencePlanSha256: planSha,
        criterionId: procedure.criterionId,
        sequence: event.sequence,
        commandSha256: event.commandSha256,
        exitCode: event.exitCode,
      }));
      criterionResults.push(adapterCriterionResult(
        procedure,
        candidateSha256,
        planSha,
        command.expectedExitCodes.includes(event.exitCode) ? "met" : "not-met",
      ));
    }

    const reduction = Object.freeze({
      version: MAIN_ADAPTER_COMMAND_EVIDENCE_REDUCTION_VERSION,
      taskSpecSha256: taskSha,
      evidencePlanSha256: planSha,
      candidateSha256,
      adapterAttestations: Object.freeze(attestations),
      criterionResults: Object.freeze(criterionResults),
    }) as MainAdapterCommandEvidenceReductionV1;
    mainAdapterCommandEvidenceReductionBrand.add(reduction);
    return reduction;
  } catch {
    return null;
  }
}

export type EvidenceBoundary = "worker-not-started" | "done" | "stopped" | "error";

type StoredCapture = {
  id: string;
  boundary: EvidenceBoundary;
  file: string;
  sha256: string;
  bytes: number;
  width: number;
  height: number;
  createdAt: string;
  label: string;
};

type EvidenceRunRecord = {
  version: typeof RECORD_VERSION;
  projectHash: string;
  runId: string;
  taskNumber: number | null;
  title: string;
  disposition: "DONE" | "STOPPED" | "ERROR" | null;
  completedAt: string | null;
  captures: StoredCapture[];
};

export type RecordEvidenceCaptureInput = {
  root: string;
  runId: string;
  boundary: EvidenceBoundary;
  png: Buffer;
  width: number;
  height: number;
  createdAt?: string;
};

export type FinalizeEvidenceRunInput = {
  taskNumber: number | null;
  title: string;
  disposition: "DONE" | "STOPPED" | "ERROR";
  completedAt?: string;
};

let markerDir: string | null = null;

/** Points evidence custody at Electron userData. With no app-owned store, no
 * image can be recorded or presented as verified evidence. */
export function setEvidenceMarkerDir(dir: string | null): void {
  markerDir = dir;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function inside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function canonicalRoot(root: string): string {
  const value = realpathSync(resolve(root)).replace(/\\/g, "/");
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function canonicalPath(value: string): string {
  const real = realpathSync(resolve(value));
  return process.platform === "win32" ? real.toLowerCase() : real;
}

function pathsOverlap(a: string, b: string): boolean {
  return inside(a, b) || inside(b, a);
}

function projectHash(root: string): string {
  return sha256(canonicalRoot(root));
}

function evidenceBase(create: boolean): string | null {
  if (markerDir === null) {
    if (!create) return null;
    throw new Error("EVIDENCE_STORE_UNAVAILABLE: Cairn cannot vouch for local pictures.");
  }
  const parent = resolve(markerDir);
  const base = join(parent, "evidence");
  if (create) mkdirSync(base, { recursive: true });
  if (!existsSync(base)) return null;
  const stat = lstatSync(base);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("EVIDENCE_STORE_UNSAFE");
  const realParent = realpathSync(parent);
  const realBase = realpathSync(base);
  if (!inside(realParent, realBase)) throw new Error("EVIDENCE_STORE_UNSAFE");
  return realBase;
}

function projectDirectory(root: string, create: boolean): string | null {
  if (markerDir === null) {
    if (!create) return null;
    throw new Error("EVIDENCE_STORE_UNAVAILABLE: Cairn cannot vouch for local pictures.");
  }
  // `userData` is a write boundary only while it is genuinely outside the
  // selected workspace. Reject both nesting directions — including symlink
  // aliases — before creating even the evidence base directory.
  const profile = canonicalPath(markerDir);
  const projectRoot = canonicalPath(root);
  if (pathsOverlap(profile, projectRoot)) throw new Error("EVIDENCE_STORE_OVERLAPS_PROJECT");
  const base = evidenceBase(create);
  if (base === null) return null;
  const directory = join(base, projectHash(root));
  if (create) mkdirSync(directory, { recursive: true });
  if (!existsSync(directory)) return null;
  const stat = lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("EVIDENCE_STORE_UNSAFE");
  const real = realpathSync(directory);
  if (!inside(base, real)) throw new Error("EVIDENCE_STORE_UNSAFE");
  return real;
}

function runDirectory(root: string, runId: string, create: boolean): string | null {
  if (!UUID.test(runId)) throw new Error("EVIDENCE_RUN_INVALID");
  const project = projectDirectory(root, create);
  if (project === null) return null;
  const directory = join(project, runId.toLowerCase());
  if (create) mkdirSync(directory, { recursive: true });
  if (!existsSync(directory)) return null;
  const stat = lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("EVIDENCE_STORE_UNSAFE");
  const real = realpathSync(directory);
  if (!inside(project, real)) throw new Error("EVIDENCE_STORE_UNSAFE");
  return real;
}

/** Test/diagnostic seam. Computing the path does not create it. */
export function evidenceRunRecordPath(root: string, runId: string): string {
  if (markerDir === null) throw new Error("EVIDENCE_STORE_UNAVAILABLE");
  if (!UUID.test(runId)) throw new Error("EVIDENCE_RUN_INVALID");
  return join(resolve(markerDir), "evidence", projectHash(root), runId.toLowerCase(), "record.json");
}

function boundedText(value: unknown, cap: number): value is string {
  return typeof value === "string" && value.length <= cap && !/[\u0000\r\n]/.test(value);
}

function isIso(value: unknown): value is string {
  return typeof value === "string" && value.length >= 20 && value.length <= 40 && Number.isFinite(Date.parse(value));
}

function isBoundary(value: unknown): value is EvidenceBoundary {
  return value === "worker-not-started" || value === "done" || value === "stopped" || value === "error";
}

function parseRecord(value: unknown, expectedProjectHash: string, expectedRunId: string): EvidenceRunRecord {
  if (typeof value !== "object" || value === null) throw new Error("EVIDENCE_RECORD_INVALID");
  const item = value as Partial<EvidenceRunRecord>;
  if (item.version !== RECORD_VERSION || item.projectHash !== expectedProjectHash
    || item.runId !== expectedRunId.toLowerCase()
    || !Array.isArray(item.captures) || item.captures.length > MAX_CAPTURES_PER_RUN
    || (item.taskNumber !== null && (!Number.isSafeInteger(item.taskNumber) || Number(item.taskNumber) < 1))
    || !boundedText(item.title, 500)
    || (item.disposition !== null && item.disposition !== "DONE" && item.disposition !== "STOPPED" && item.disposition !== "ERROR")
    || (item.completedAt !== null && !isIso(item.completedAt))
    || ((item.disposition === null) !== (item.completedAt === null))) {
    throw new Error("EVIDENCE_RECORD_INVALID");
  }
  const ids = new Set<string>();
  const files = new Set<string>();
  const boundaries = new Set<EvidenceBoundary>();
  let terminalCount = 0;
  let terminalBoundary: EvidenceBoundary | null = null;
  for (const capture of item.captures) {
    const normalizedId = typeof capture === "object" && capture !== null && typeof capture.id === "string"
      ? capture.id.toLowerCase() : "";
    if (typeof capture !== "object" || capture === null || !UUID.test(capture.id)
      || capture.id !== normalizedId || ids.has(normalizedId)
      || !isBoundary(capture.boundary) || boundaries.has(capture.boundary)
      || capture.file !== `${normalizedId}.png` || files.has(capture.file) || !SHA256.test(capture.sha256)
      || !Number.isSafeInteger(capture.bytes) || capture.bytes < 24 || capture.bytes > MAX_IMAGE_BYTES
      || !Number.isSafeInteger(capture.width) || capture.width < 1 || capture.width > 8192
      || !Number.isSafeInteger(capture.height) || capture.height < 1 || capture.height > 8192
      || !isIso(capture.createdAt) || capture.label !== imageLabel(capture.boundary)) {
      throw new Error("EVIDENCE_RECORD_INVALID");
    }
    ids.add(normalizedId);
    files.add(capture.file);
    boundaries.add(capture.boundary);
    if (capture.boundary !== "worker-not-started") {
      terminalCount += 1;
      terminalBoundary = capture.boundary;
    }
  }
  if (terminalCount > 1) throw new Error("EVIDENCE_RECORD_INVALID");
  if (item.disposition !== null && terminalBoundary !== null) {
    const expectedTerminal = item.disposition === "DONE" ? "done"
      : item.disposition === "STOPPED" ? "stopped" : "error";
    if (terminalBoundary !== expectedTerminal) throw new Error("EVIDENCE_RECORD_INVALID");
  }
  return item as EvidenceRunRecord;
}

function emptyRecord(root: string, runId: string): EvidenceRunRecord {
  return {
    version: RECORD_VERSION,
    projectHash: projectHash(root),
    runId: runId.toLowerCase(),
    taskNumber: null,
    title: "",
    disposition: null,
    completedAt: null,
    captures: [],
  };
}

function sameFileIdentity(
  left: { dev: number | bigint; ino: number | bigint; size: number | bigint },
  right: { dev: number | bigint; ino: number | bigint; size: number | bigint },
): boolean {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size;
}

/** Reads exactly the descriptor size already admitted by the caller. Unlike
 * readFileSync(fd), this never performs a later size-based allocation that a
 * concurrent grow could push beyond the checked byte cap. */
function readDescriptorBytes(descriptor: number, size: number): Buffer | null {
  const bytes = Buffer.allocUnsafe(size);
  let offset = 0;
  while (offset < size) {
    const count = readSync(descriptor, bytes, offset, size - offset, offset);
    if (count <= 0) return null;
    offset += count;
  }
  return bytes;
}

/** Reads one bounded regular file through the descriptor that was checked.
 * Path checks are repeated after open so a pathname swap cannot substitute a
 * different file between lstat and read on hosts where O_NOFOLLOW is absent. */
function readBoundedRegularFile(parent: string, absolute: string, minimum: number, maximum: number): Buffer | null {
  let descriptor: number | null = null;
  try {
    const parentReal = realpathSync(parent);
    const linkStat = lstatSync(absolute);
    if (!linkStat.isFile() || linkStat.isSymbolicLink() || linkStat.size < minimum || linkStat.size > maximum) return null;
    if (!inside(parentReal, realpathSync(absolute))) return null;
    descriptor = openSync(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const before = fstatSync(descriptor);
    const during = lstatSync(absolute);
    if (!before.isFile() || !sameFileIdentity(linkStat, before) || !sameFileIdentity(before, during)
      || during.isSymbolicLink() || !inside(parentReal, realpathSync(absolute))
      || before.size < minimum || before.size > maximum) return null;
    const bytes = readDescriptorBytes(descriptor, before.size);
    if (bytes === null) return null;
    const after = fstatSync(descriptor);
    if (!sameFileIdentity(before, after) || bytes.length !== before.size) return null;
    return bytes;
  } catch {
    return null;
  } finally {
    if (descriptor !== null) {
      try { closeSync(descriptor); } catch { /* the read already failed closed */ }
    }
  }
}

function loadRecord(root: string, runId: string): EvidenceRunRecord | null {
  const directory = runDirectory(root, runId, false);
  if (directory === null) return null;
  const path = join(directory, "record.json");
  if (!existsSync(path)) return null;
  try {
    const bytes = readBoundedRegularFile(directory, path, 2, MAX_RECORD_BYTES);
    if (!bytes) throw new Error("invalid");
    return parseRecord(JSON.parse(bytes.toString("utf8")), projectHash(root), runId);
  } catch (error) {
    if (error instanceof Error && error.message === "EVIDENCE_RECORD_INVALID") throw error;
    throw new Error("EVIDENCE_RECORD_INVALID");
  }
}

function saveRecord(root: string, record: EvidenceRunRecord): void {
  parseRecord(record, projectHash(root), record.runId);
  const directory = runDirectory(root, record.runId, true);
  if (directory === null) throw new Error("EVIDENCE_STORE_UNAVAILABLE");
  atomicWriteText(join(directory, "record.json"), `${JSON.stringify(record, null, 2)}\n`);
}

type ReadPngResult = { bytes: Buffer; width: number; height: number; sha256: string };
type AttemptBudget = { remaining: number; exhausted: boolean };

function parsePng(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 24 || bytes.length > MAX_IMAGE_BYTES || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)
    || bytes.toString("ascii", 12, 16) !== "IHDR") return null;
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width < 1 || height < 1 || width > 8192 || height > 8192) return null;
  return { width, height };
}

function readPngFile(
  parent: string,
  absolute: string,
  expected?: Pick<StoredCapture, "sha256" | "bytes" | "width" | "height">,
  budget?: AttemptBudget,
): ReadPngResult | null {
  let descriptor: number | null = null;
  try {
    const linkStat = lstatSync(absolute);
    if (!linkStat.isFile() || linkStat.isSymbolicLink() || linkStat.size < 24 || linkStat.size > MAX_IMAGE_BYTES) return null;
    const real = realpathSync(absolute);
    if (!inside(realpathSync(parent), real)) return null;
    descriptor = openSync(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const before = fstatSync(descriptor);
    const during = lstatSync(absolute);
    if (!before.isFile() || !sameFileIdentity(linkStat, before) || !sameFileIdentity(before, during)
      || during.isSymbolicLink() || !inside(realpathSync(parent), realpathSync(absolute))
      || before.size < 24 || before.size > MAX_IMAGE_BYTES) return null;
    if (budget) {
      if (before.size > budget.remaining) {
        budget.remaining = 0;
        budget.exhausted = true;
        return null;
      }
      budget.remaining -= before.size;
    }
    const bytes = readDescriptorBytes(descriptor, before.size);
    if (bytes === null) return null;
    const after = fstatSync(descriptor);
    if (!sameFileIdentity(before, after) || bytes.length !== before.size) return null;
    const dimensions = parsePng(bytes);
    if (!dimensions) return null;
    const digest = sha256(bytes);
    if (expected && (expected.sha256 !== digest || expected.bytes !== bytes.length
      || expected.width !== dimensions.width || expected.height !== dimensions.height)) return null;
    return { bytes, width: dimensions.width, height: dimensions.height, sha256: digest };
  } catch {
    return null;
  } finally {
    if (descriptor !== null) {
      try { closeSync(descriptor); } catch { /* the read already failed closed */ }
    }
  }
}

function imageRole(boundary: EvidenceBoundary): EvidenceImageRole {
  return boundary === "worker-not-started" ? "before" : "after";
}

function imageLabel(boundary: EvidenceBoundary): string {
  if (boundary === "worker-not-started") return "Before — the worker had not started.";
  if (boundary === "done") return "After — Cairn verified the run as DONE.";
  if (boundary === "stopped") return "After — the run stopped and Cairn kept the available picture.";
  return "After — the run ended with an error and needs inspection.";
}

function publicImage(runId: string, capture: StoredCapture, trusted = true): EvidenceImage {
  return {
    id: `${runId}.${capture.id}`,
    role: imageRole(capture.boundary),
    label: capture.label,
    mime: "image/png",
    width: capture.width,
    height: capture.height,
    trusted,
  };
}

function validateCaptureInput(input: RecordEvidenceCaptureInput): void {
  if (!UUID.test(input.runId) || !isBoundary(input.boundary) || !Buffer.isBuffer(input.png)) {
    throw new Error("EVIDENCE_CAPTURE_INVALID");
  }
  const dimensions = parsePng(input.png);
  if (!dimensions || dimensions.width !== input.width || dimensions.height !== input.height
    || (input.createdAt !== undefined && !isIso(input.createdAt))) {
    throw new Error("EVIDENCE_CAPTURE_INVALID");
  }
}

/** Records bytes returned directly by Electron main. The run/boundary pair is
 * one-shot, so retries cannot replace a picture already bound to a run. */
export function recordEvidenceCapture(input: RecordEvidenceCaptureInput): EvidenceImage & { runId: string } {
  validateCaptureInput(input);
  const record = loadRecord(input.root, input.runId) ?? emptyRecord(input.root, input.runId);
  const existing = record.captures.find((capture) => capture.boundary === input.boundary);
  if (existing) return { ...publicImage(record.runId, existing), runId: record.runId };
  if (record.captures.length >= MAX_CAPTURES_PER_RUN) throw new Error("EVIDENCE_CAPTURE_LIMIT");
  if (record.completedAt !== null) throw new Error("EVIDENCE_RUN_FINALIZED");
  if (input.boundary !== "worker-not-started"
    && record.captures.some((capture) => capture.boundary !== "worker-not-started")) {
    throw new Error("EVIDENCE_TERMINAL_CONFLICT");
  }

  const directory = runDirectory(input.root, input.runId, true);
  if (directory === null) throw new Error("EVIDENCE_STORE_UNAVAILABLE");
  const id = randomUUID();
  const file = `${id}.png`;
  const absolute = join(directory, file);
  let orphan = false;
  try {
    writeFileSync(absolute, input.png, { flag: "wx", mode: 0o600 });
    orphan = true;
    const verified = readPngFile(directory, absolute);
    if (!verified) throw new Error("EVIDENCE_CAPTURE_WRITE_FAILED");
    const capture: StoredCapture = {
      id,
      boundary: input.boundary,
      file,
      sha256: verified.sha256,
      bytes: verified.bytes.length,
      width: verified.width,
      height: verified.height,
      createdAt: input.createdAt ?? new Date().toISOString(),
      label: imageLabel(input.boundary),
    };
    record.captures.push(capture);
    saveRecord(input.root, record);
    orphan = false;
    return { ...publicImage(record.runId, capture), runId: record.runId };
  } finally {
    if (orphan) {
      try { rmSync(absolute, { force: true }); } catch { /* unreferenced profile file remains untrusted */ }
    }
  }
}

function timelineKey(completedAt: string, runId: string): string {
  const timestamp = new Date(completedAt).toISOString().slice(0, 23).replace(/\D/g, "");
  const uuid = runId.toLowerCase().replace(/-/g, "");
  const key = `${timestamp}${uuid}`;
  if (!TIMELINE_KEY.test(key)) throw new Error("EVIDENCE_TIMELINE_INVALID");
  return key;
}

function timelineRunId(key: string): string | null {
  if (!TIMELINE_KEY.test(key)) return null;
  const value = key.slice(TIMELINE_TIMESTAMP_DIGITS);
  const runId = `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
  return UUID.test(runId) ? runId : null;
}

function safeDirectory(parent: string, child: string, create: boolean): string | null {
  try {
    if (create && !existsSync(child)) mkdirSync(child, { mode: 0o700 });
    const stat = lstatSync(child);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return null;
    const realParent = realpathSync(parent);
    const realChild = realpathSync(child);
    return inside(realParent, realChild) ? realChild : null;
  } catch {
    return null;
  }
}

function timelineDirectory(root: string, create: boolean): string | null {
  const project = projectDirectory(root, create);
  if (project === null) return null;
  const timeline = join(project, "_timeline");
  const safe = safeDirectory(project, timeline, create);
  if (create && safe === null) throw new Error("EVIDENCE_TIMELINE_UNSAFE");
  return safe;
}

/** Adds one immutable, app-owned history marker. The fixed-branch trie lets
 * album reads probe a bounded number of exact paths instead of enumerating an
 * ever-growing run directory or mutable registry. */
function recordTimelineMarker(root: string, key: string): void {
  if (!TIMELINE_KEY.test(key)) throw new Error("EVIDENCE_TIMELINE_INVALID");
  let directory = timelineDirectory(root, true);
  if (directory === null) throw new Error("EVIDENCE_TIMELINE_UNAVAILABLE");
  for (const character of key.slice(0, TIMELINE_TIMESTAMP_DIGITS)) {
    const child = safeDirectory(directory, join(directory, character), true);
    if (child === null) throw new Error("EVIDENCE_TIMELINE_UNSAFE");
    directory = child;
  }
  const runId = timelineRunId(key);
  if (runId === null) throw new Error("EVIDENCE_TIMELINE_INVALID");
  const marker = join(directory, `${runId}.mark`);
  if (!existsSync(marker)) writeFileSync(marker, Buffer.alloc(0), { flag: "wx", mode: 0o600 });
  if (readBoundedRegularFile(directory, marker, 0, 0) === null) throw new Error("EVIDENCE_TIMELINE_UNSAFE");
}

export function finalizeEvidenceRun(root: string, runId: string, input: FinalizeEvidenceRunInput): void {
  if (!UUID.test(runId) || (input.taskNumber !== null && (!Number.isSafeInteger(input.taskNumber) || input.taskNumber < 1))
    || !boundedText(input.title, 500)
    || (input.disposition !== "DONE" && input.disposition !== "STOPPED" && input.disposition !== "ERROR")
    || (input.completedAt !== undefined && !isIso(input.completedAt))) {
    throw new Error("EVIDENCE_RUN_INVALID");
  }
  const record = loadRecord(root, runId) ?? emptyRecord(root, runId);
  if (record.completedAt !== null) {
    if (record.taskNumber === input.taskNumber && record.title === input.title && record.disposition === input.disposition) return;
    throw new Error("EVIDENCE_RUN_FINALIZED");
  }
  const terminal = record.captures.find((capture) => capture.boundary !== "worker-not-started")?.boundary;
  const expectedTerminal = input.disposition === "DONE" ? "done"
    : input.disposition === "STOPPED" ? "stopped" : "error";
  if (terminal !== undefined && terminal !== expectedTerminal) throw new Error("EVIDENCE_DISPOSITION_MISMATCH");
  const completedAt = input.completedAt ?? new Date().toISOString();
  record.taskNumber = input.taskNumber;
  record.title = input.title;
  record.disposition = input.disposition;
  record.completedAt = completedAt;
  // Marker first: a crash can leave an invisible orphan, but can never leave a
  // finalized history record that forces a later unbounded discovery scan.
  if (record.captures.length > 0) recordTimelineMarker(root, timelineKey(completedAt, record.runId));
  saveRecord(root, record);
}

/** Removes only this run's valid, unfinalized app-owned directory. Used when
 * readiness changed after the pre-work picture but no worker ever ran. */
export function discardUnfinalizedEvidenceRun(root: string, runId: string): void {
  const record = loadRecord(root, runId);
  if (record === null) return;
  if (record.completedAt !== null) throw new Error("EVIDENCE_RUN_FINALIZED");
  const directory = runDirectory(root, runId, false);
  if (directory === null) return;
  rmSync(directory, { recursive: true, force: false });
}

type LegacyImage = EvidenceImage & { file: string };

function readProjectPng(root: string, file: string): ReadPngResult | null {
  const normalized = file.replace(/\\/g, "/");
  if (normalized !== file || normalized.startsWith("/") || normalized.split("/").includes("..")) return null;
  const rootReal = realpathSync(root);
  const absolute = resolve(root, file);
  if (!inside(rootReal, absolute)) return null;
  return readPngFile(rootReal, absolute);
}

/** Reads only the fixed PNG header needed for explicitly-untrusted legacy
 * album metadata. The whole descriptor size is charged before that small read
 * so malformed large files cannot evade the aggregate work limit. */
function readProjectPngMetadata(root: string, file: string, budget: AttemptBudget): { width: number; height: number } | null {
  const normalized = file.replace(/\\/g, "/");
  if (normalized !== file || normalized.startsWith("/") || normalized.split("/").includes("..")) return null;
  const rootReal = realpathSync(root);
  const absolute = resolve(root, file);
  if (!inside(rootReal, absolute)) return null;
  let descriptor: number | null = null;
  try {
    const linkStat = lstatSync(absolute);
    if (!linkStat.isFile() || linkStat.isSymbolicLink() || linkStat.size < 24 || linkStat.size > MAX_IMAGE_BYTES) return null;
    if (!inside(rootReal, realpathSync(absolute))) return null;
    descriptor = openSync(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const before = fstatSync(descriptor);
    const during = lstatSync(absolute);
    if (!before.isFile() || !sameFileIdentity(linkStat, before) || !sameFileIdentity(before, during)
      || during.isSymbolicLink() || !inside(rootReal, realpathSync(absolute))
      || before.size < 24 || before.size > MAX_IMAGE_BYTES) return null;
    if (before.size > budget.remaining) {
      budget.remaining = 0;
      budget.exhausted = true;
      return null;
    }
    budget.remaining -= before.size;
    const header = Buffer.allocUnsafe(24);
    if (readSync(descriptor, header, 0, header.length, 0) !== header.length) return null;
    const after = fstatSync(descriptor);
    if (!sameFileIdentity(before, after)) return null;
    return parsePng(header);
  } catch {
    return null;
  } finally {
    if (descriptor !== null) {
      try { closeSync(descriptor); } catch { /* legacy metadata already failed closed */ }
    }
  }
}

function readLegacyManifest(root: string): { entries?: unknown } | null {
  try {
    const rootReal = realpathSync(root);
    const manifest = resolve(root, "app", "shots", "manifest.json");
    if (!inside(rootReal, manifest)) return null;
    const bytes = readBoundedRegularFile(rootReal, manifest, 2, MAX_LEGACY_MANIFEST_BYTES);
    return bytes ? JSON.parse(bytes.toString("utf8")) as { entries?: unknown } : null;
  } catch {
    return null;
  }
}

function legacyEntries(root: string): Array<EvidenceAlbumEntry & { legacyImages: LegacyImage[] }> {
  try {
    const parsed = readLegacyManifest(root);
    if (!parsed) return [];
    if (!Array.isArray(parsed.entries) || parsed.entries.length > MAX_LEGACY_ENTRIES) return [];
    const entries: Array<EvidenceAlbumEntry & { legacyImages: LegacyImage[] }> = [];
    const seenFiles = new Set<string>();
    let imageCount = 0;
    const imageBudget: AttemptBudget = { remaining: MAX_LEGACY_IMAGE_BYTES_TOTAL, exhausted: false };
    legacyRows: for (const raw of parsed.entries) {
      if (typeof raw !== "object" || raw === null) continue;
      const value = raw as { task?: unknown; title?: unknown; caption?: unknown; shots?: unknown };
      if (!boundedText(value.title, 500) || typeof value.caption !== "string" || value.caption.length > 8_000
        || !Array.isArray(value.shots) || value.shots.length > MAX_LEGACY_SHOTS) continue;
      const taskText = typeof value.task === "number" ? String(value.task) : typeof value.task === "string" ? value.task : "";
      const taskMatch = /(?:Task\s*)?(\d{1,6})/i.exec(taskText);
      const taskNumber = taskMatch ? Number(taskMatch[1]) : null;
      const images: LegacyImage[] = [];
      for (const shot of value.shots) {
        if (imageCount >= MAX_LEGACY_IMAGES || imageBudget.exhausted) break legacyRows;
        if (typeof shot !== "object" || shot === null) continue;
        const candidate = shot as { file?: unknown; label?: unknown };
        if (typeof candidate.file !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}\.png$/i.test(candidate.file)
          || !boundedText(candidate.label, 500)) continue;
        const file = `app/shots/${candidate.file}`;
        if (seenFiles.has(file)) continue;
        seenFiles.add(file);
        imageCount += 1;
        const png = readProjectPngMetadata(root, file, imageBudget);
        if (!png) continue;
        images.push({
          id: `legacy-${sha256(`${projectHash(root)}\u001f${file}`)}`,
          role: "moment",
          label: `Past review shot — ${candidate.label}`,
          mime: "image/png",
          width: png.width,
          height: png.height,
          trusted: false,
          file,
        });
      }
      if (images.length === 0) continue;
      entries.push({
        runId: null,
        taskNumber,
        title: value.title,
        caption: value.caption,
        disposition: null,
        trusted: false,
        images,
        pair: null,
        legacyImages: images,
      });
    }
    return entries;
  } catch {
    return [];
  }
}

function readLegacyImage(root: string, imageId: string): ReadPngResult | null {
  if (!/^legacy-[0-9a-f]{64}$/.test(imageId)) return null;
  try {
    const parsed = readLegacyManifest(root);
    if (!parsed) return null;
    if (!Array.isArray(parsed.entries) || parsed.entries.length > MAX_LEGACY_ENTRIES) return null;
    const seen = new Set<string>();
    for (const raw of parsed.entries) {
      if (typeof raw !== "object" || raw === null) continue;
      const value = raw as { title?: unknown; caption?: unknown; shots?: unknown };
      if (!boundedText(value.title, 500) || typeof value.caption !== "string" || value.caption.length > 8_000
        || !Array.isArray(value.shots) || value.shots.length > MAX_LEGACY_SHOTS) continue;
      for (const shot of value.shots) {
        if (typeof shot !== "object" || shot === null) continue;
        const candidate = shot as { file?: unknown; label?: unknown };
        if (typeof candidate.file !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}\.png$/i.test(candidate.file)
          || !boundedText(candidate.label, 500)) continue;
        const file = `app/shots/${candidate.file}`;
        if (seen.has(file)) continue;
        seen.add(file);
        if (seen.size > MAX_LEGACY_IMAGES) return null;
        if (`legacy-${sha256(`${projectHash(root)}\u001f${file}`)}` !== imageId) continue;
        return readProjectPng(root, file);
      }
    }
  } catch {
    return null;
  }
  return null;
}

function trustedEntry(root: string, record: EvidenceRunRecord, budget?: AttemptBudget): EvidenceAlbumEntry | null {
  if (record.disposition === null || record.completedAt === null) return null;
  const directory = runDirectory(root, record.runId, false);
  if (directory === null) return null;
  const valid = record.captures
    .filter((capture) => readPngFile(directory, join(directory, capture.file), capture, budget) !== null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (valid.length === 0) return null;
  const images = valid.map((capture) => publicImage(record.runId, capture));
  const before = valid.find((capture) => capture.boundary === "worker-not-started");
  const after = [...valid].reverse().find((capture) => capture.boundary !== "worker-not-started");
  const caption = before && after
    ? "Pictures Cairn captured immediately before the worker started and after the run settled on this computer."
    : before
      ? "The pre-work picture Cairn captured before the worker started; no terminal picture survived."
      : "The terminal picture Cairn captured after the run settled; no pre-work picture survived.";
  return {
    runId: record.runId,
    taskNumber: record.taskNumber,
    title: record.title,
    caption,
    disposition: record.disposition,
    trusted: true,
    images,
    pair: before && after
      ? { beforeId: `${record.runId}.${before.id}`, afterId: `${record.runId}.${after.id}` }
      : null,
  };
}

function encodeAlbumCursor(key: string): string {
  return Buffer.from(key, "ascii").toString("base64url");
}

/** Returns the smallest cursor key strictly after one real marker key. The
 * cursor need not itself be a UUID; it is only an exclusive lexicographic
 * boundary, and the actual marker key is therefore still visited next page. */
function timelineKeySuccessor(key: string): string {
  if (!TIMELINE_KEY.test(key)) throw new Error("EVIDENCE_TIMELINE_INVALID");
  const characters = [...key];
  const hex = "0123456789abcdef";
  for (let index = characters.length - 1; index >= TIMELINE_TIMESTAMP_DIGITS; index -= 1) {
    const value = hex.indexOf(characters[index] ?? "");
    if (value < 0) throw new Error("EVIDENCE_TIMELINE_INVALID");
    if (value === hex.length - 1) continue;
    characters[index] = hex[value + 1] ?? "0";
    for (let reset = index + 1; reset < characters.length; reset += 1) characters[reset] = "0";
    return characters.join("");
  }
  throw new Error("EVIDENCE_TIMELINE_INVALID");
}

function decodeAlbumCursor(value: string | null): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length < 1 || value.length > 200 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("EVIDENCE_CURSOR_INVALID");
  }
  try {
    const key = Buffer.from(value, "base64url").toString("ascii");
    if (!TIMELINE_KEY.test(key) || encodeAlbumCursor(key) !== value) throw new Error("invalid");
    return key;
  } catch {
    throw new Error("EVIDENCE_CURSOR_INVALID");
  }
}

const TIMELINE_DIGITS_DESC = [..."9876543210"];

function timelineLeafKeys(directory: string, timestampPrefix: string): string[] {
  let handle: ReturnType<typeof opendirSync> | null = null;
  try {
    handle = opendirSync(directory);
    const keys: string[] = [];
    let seen = 0;
    for (;;) {
      const entry = handle.readSync();
      if (entry === null) break;
      seen += 1;
      if (seen > MAX_TIMELINE_SAME_TIME_ENTRIES) return [];
      const match = new RegExp(`^(${UUID_SOURCE})\\.mark$`, "i").exec(entry.name);
      if (!match || !entry.isFile() || entry.isSymbolicLink()) continue;
      const runId = match[1]?.toLowerCase();
      if (!runId) continue;
      const key = `${timestampPrefix}${runId.replace(/-/g, "")}`;
      if (!TIMELINE_KEY.test(key)) continue;
      const marker = join(directory, entry.name);
      if (readBoundedRegularFile(directory, marker, 0, 0) !== null) keys.push(key);
    }
    return keys.sort((left, right) => right.localeCompare(left));
  } catch {
    return [];
  } finally {
    if (handle !== null) {
      try { handle.closeSync(); } catch { /* the leaf already failed closed */ }
    }
  }
}

/** Walks immutable timeline keys newest-first without enumerating a directory.
 * Every level has a fixed alphabet, and a hard probe cap turns hostile profile
 * contents into missing history rather than unbounded main-process work. */
function walkTimelineKeys(
  timeline: string,
  upperExclusive: string | null,
  visit: (key: string) => boolean,
): { probeLimit: boolean; resumeBefore: string | null } {
  let probes = 0;
  let probeLimit = false;
  let resumeBefore: string | null = null;
  const walk = (directory: string, prefix: string, tight: boolean): boolean => {
    const depth = prefix.length;
    const characters = TIMELINE_DIGITS_DESC;
    const boundCharacter = tight && upperExclusive !== null ? upperExclusive[depth] : null;
    for (const character of characters) {
      if (boundCharacter !== null && character > boundCharacter) continue;
      const nextPrefix = `${prefix}${character}`;
      probes += 1;
      if (probes > MAX_TIMELINE_PATH_PROBES) {
        probeLimit = true;
        const branchCeiling = `${nextPrefix.padEnd(TIMELINE_TIMESTAMP_DIGITS, "9")}${"f".repeat(32)}`;
        resumeBefore = upperExclusive !== null && branchCeiling >= upperExclusive ? upperExclusive : branchCeiling;
        return true;
      }
      const child = safeDirectory(directory, join(directory, character), false);
      if (child === null) continue;
      const nextTight = tight && boundCharacter === character;
      if (nextPrefix.length === TIMELINE_TIMESTAMP_DIGITS) {
        for (const key of timelineLeafKeys(child, nextPrefix)) {
          if (upperExclusive !== null && key >= upperExclusive) continue;
          if (visit(key)) return true;
        }
      } else if (walk(child, nextPrefix, nextTight)) {
        return true;
      }
    }
    return false;
  };
  walk(timeline, "", upperExclusive !== null);
  return { probeLimit, resumeBefore };
}

function timelineAlbumPage(
  root: string,
  selectedRunId: string | null,
  upperExclusive: string | null,
): { entries: EvidenceAlbumEntry[]; nextCursor: string | null } {
  const timeline = timelineDirectory(root, false);
  if (timeline === null) return { entries: [], nextCursor: null };
  const found: Array<{ entry: EvidenceAlbumEntry; key: string }> = [];
  let markerAttempts = 0;
  let markerLimit = false;
  let lastAttemptedKey: string | null = null;
  let byteLimitCursor: string | null = null;
  const imageBudget: AttemptBudget = { remaining: MAX_TRUSTED_HISTORY_IMAGE_BYTES_TOTAL, exhausted: false };
  const traversal = walkTimelineKeys(timeline, upperExclusive, (key) => {
    markerAttempts += 1;
    lastAttemptedKey = key;
    const runId = timelineRunId(key);
    if (runId !== null && runId !== selectedRunId) {
      try {
        const record = loadRecord(root, runId);
        if (record?.completedAt !== null && record?.completedAt !== undefined
          && timelineKey(record.completedAt, record.runId) === key) {
          const declaredBytes = record.captures.reduce((total, capture) => total + capture.bytes, 0);
          if (declaredBytes > imageBudget.remaining) {
            byteLimitCursor = timelineKeySuccessor(key);
            return true;
          }
          const entry = trustedEntry(root, record, imageBudget);
          if (imageBudget.exhausted) {
            // A file can grow after its record was written. Do not publish a
            // partial entry or advance past it: retry this exact marker with a
            // fresh bounded page, where any surviving sibling can be checked.
            byteLimitCursor = timelineKeySuccessor(key);
            return true;
          }
          if (entry) found.push({ entry, key });
        }
      } catch {
        // One corrupt/orphan marker is skipped; its immutable key still lets
        // traversal continue to unrelated older runs.
      }
    }
    if (found.length > ALBUM_PAGE_SIZE) return true;
    if (markerAttempts >= MAX_TIMELINE_MARKERS_PER_PAGE) {
      markerLimit = true;
      return true;
    }
    return false;
  });
  const page = found.slice(0, ALBUM_PAGE_SIZE);
  const cursorKey = found.length > ALBUM_PAGE_SIZE
    ? page.at(-1)?.key ?? null
    : byteLimitCursor
      ?? (markerLimit ? lastAttemptedKey
        : traversal.probeLimit ? traversal.resumeBefore : null);
  return {
    entries: page.map(({ entry }) => entry),
    nextCursor: cursorKey ? encodeAlbumCursor(cursorKey) : null,
  };
}

export function readEvidenceAlbum(
  root: string,
  selectedRunId: string | null = null,
  cursorValue: string | null = null,
): EvidenceAlbum {
  if (selectedRunId !== null && (typeof selectedRunId !== "string" || !UUID.test(selectedRunId))) {
    throw new Error("EVIDENCE_RUN_INVALID");
  }
  const cursor = decodeAlbumCursor(cursorValue);
  let selected: EvidenceAlbumEntry | null = null;
  let selectedUpperBound: string | null = null;
  let trustedPage: { entries: EvidenceAlbumEntry[]; nextCursor: string | null } = { entries: [], nextCursor: null };
  if (cursor === null && selectedRunId !== null) {
    try {
      const selectedRecord = loadRecord(root, selectedRunId);
      if (selectedRecord?.completedAt !== null && selectedRecord?.completedAt !== undefined) {
        selected = trustedEntry(root, selectedRecord);
        selectedUpperBound = timelineKey(selectedRecord.completedAt, selectedRecord.runId);
      }
    } catch {
      // A bad selected run cannot become evidence and cannot suppress healthy,
      // unrelated checked history. Without its trusted time, the UI labels
      // that surviving list as "Other", not "Earlier".
    }
  }
  try {
    trustedPage = timelineAlbumPage(root, selectedRunId, cursor ?? selectedUpperBound);
  } catch {
    // Profile overlap or unsafe custody drops only the trusted half. Historical
    // review shots remain explicitly untrusted and may still be browsed.
  }
  const legacy = cursor === null
    ? legacyEntries(root).map(({ legacyImages: _legacyImages, ...entry }) => entry)
    : [];
  return {
    selectedRunId,
    entries: [...(selected ? [selected] : []), ...trustedPage.entries, ...legacy],
    nextCursor: trustedPage.nextCursor,
  };
}

export function readEvidenceImage(root: string, imageId: string): EvidenceImageData | null {
  if (typeof imageId !== "string" || imageId.length > 80) return null;
  const trusted = TRUSTED_IMAGE_ID.exec(imageId);
  if (trusted) {
    try {
      const runId = trusted[1];
      const captureId = trusted[2];
      if (!runId || !captureId) return null;
      const record = loadRecord(root, runId);
      const capture = record?.captures.find((candidate) => candidate.id.toLowerCase() === captureId.toLowerCase());
      const directory = record ? runDirectory(root, runId, false) : null;
      if (!record || !capture || directory === null) return null;
      const png = readPngFile(directory, join(directory, capture.file), capture);
      return png ? { id: imageId, dataUrl: `data:image/png;base64,${png.bytes.toString("base64")}` } : null;
    } catch {
      return null;
    }
  }
  const legacy = readLegacyImage(root, imageId);
  return legacy ? { id: imageId, dataUrl: `data:image/png;base64,${legacy.bytes.toString("base64")}` } : null;
}
