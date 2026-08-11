export const CRITIC_CALL_DISCLOSURE_VERSION = "cairn-critic-call-disclosure/v1" as const;
export const CRITIC_CALL_DECISION_VERSION = "cairn-critic-call-decision/v1" as const;

/**
 * Fixed owner-facing sentences. They are constants so that what the owner is
 * promised cannot vary by provider, by renderer, or by model text — the only
 * thing a caller supplies is the route it already approved.
 */
export const CRITIC_CALL_PURPOSE_TEXT =
  "Independent inspection against the promises below. It cannot read or edit the project, or declare DONE.";
export const CRITIC_CALL_SYNTHETIC_PURPOSE_TEXT =
  "Independent inspection of the preregistered synthetic fixture identified on this card. It cannot read or edit the project, or declare DONE.";
/** What the critic never receives. Every entry is about the packet the model
 * reads. The provider key is deliberately NOT in this list: it is sent, as the
 * header that signs the request, and saying otherwise on an approval screen
 * would be a plain untruth. It has its own sentence below. */
export const CRITIC_CALL_NOT_SENT = Object.freeze([
  "tools of any kind",
  "images or other binary files",
  "untracked or ignored files",
  "links",
  "generated or dependency areas",
] as const);

/** The honest statement about the credential: it signs the request, and that
 * is all it does. */
export const CRITIC_CALL_CREDENTIAL_TEXT =
  "Your saved provider key signs this one request to the provider you connected. It is never part of what the critic reads, and Cairn never records it.";

export const CRITIC_CALL_SYNTHETIC_NOT_SENT = Object.freeze([
  "tools of any kind",
  "project files or project content",
  "images or other binary files",
  "links",
  "generated or dependency areas",
] as const);

export const CRITIC_CALL_SYNTHETIC_CREDENTIAL_TEXT =
  "No saved provider key is used. This synthetic calibration call can reach only the injected in-process fake, and nothing is billed.";

export type CriticCallKindV1 = "provider" | "synthetic-calibration";

export const CRITIC_CALL_NOT_SENT_BY_KIND: Readonly<Record<CriticCallKindV1, readonly string[]>> = Object.freeze({
  provider: CRITIC_CALL_NOT_SENT,
  "synthetic-calibration": CRITIC_CALL_SYNTHETIC_NOT_SENT,
});

export const CRITIC_CALL_CREDENTIAL_TEXT_BY_KIND: Readonly<Record<CriticCallKindV1, string>> = Object.freeze({
  provider: CRITIC_CALL_CREDENTIAL_TEXT,
  "synthetic-calibration": CRITIC_CALL_SYNTHETIC_CREDENTIAL_TEXT,
});

export const CRITIC_CALL_PURPOSE_BY_KIND: Readonly<Record<CriticCallKindV1, string>> = Object.freeze({
  provider: CRITIC_CALL_PURPOSE_TEXT,
  "synthetic-calibration": CRITIC_CALL_SYNTHETIC_PURPOSE_TEXT,
});

/** The consent this call runs under, restated where the owner can see it. */
export const CRITIC_CALL_FILE_CAP = 8;
export const CRITIC_CALL_PER_FILE_CHARACTER_CAP = 8_000;
export const CRITIC_CALL_TOTAL_CHARACTER_CAP = 32_000;

export type CriticCallModeV1 = "required" | "optional";

/** The closed set of presses. `off` offers none of them and composes no card. */
export type CriticCallActionV1 = "approve" | "stop-task" | "continue-without-critic";

export const CRITIC_CALL_ACTIONS_BY_MODE: Readonly<Record<CriticCallModeV1, readonly CriticCallActionV1[]>> =
  Object.freeze({
    required: Object.freeze(["approve", "stop-task"] as const),
    optional: Object.freeze(["approve", "continue-without-critic"] as const),
  });

export type CriticCallSelectedFileViewV1 = Readonly<{
  /** Project-relative, exactly as the packet disclosed it. Never absolute. */
  path: string;
  sha256: string;
  characters: number;
}>;

/**
 * The rest of the request.
 *
 * A critic packet is not only file contents: it also carries the task's
 * path-free plan and check metadata — the promises, their failure conditions
 * and evidence standards, the preferences, the references and their anti-copy
 * boundaries, the recorded check evidence, any prior confirmed findings, and
 * the comparison trials. A card that listed only files would be true sentence
 * by sentence and false as a whole, so these counts and the real total are
 * part of what the owner approves.
 */
export type CriticCallPlanMetadataV1 = Readonly<{
  checks: number;
  preferences: number;
  references: number;
  evidenceItems: number;
  priorFindings: number;
  comparisonTrials: number;
}>;

export type CriticCallCalibrationViewV1 = Readonly<{
  manifestSha256: string;
  fixtureId: string;
  fixtureIndex: number;
  fixtureCount: number;
  fixtureSha256: string;
  packetSha256: string;
  requestSha256: string;
  requestBodySha256: string;
  text: readonly Readonly<{ path: string; sha256: string; content: string }>[];
}>;

export const PLAN_METADATA_KEYS = Object.freeze([
  "checks", "preferences", "references", "evidenceItems", "priorFindings", "comparisonTrials",
] as const);
export const PLAN_METADATA_ITEM_CAP = 64;
/** Every critic request Core can compose fits well inside this. */
export const CRITIC_CALL_REQUEST_CHARACTER_CAP = 1_000_000;

/**
 * Bounds copied from Core's frozen budget and limits.
 *
 * The renderer cannot import Core, so these are copies — and a copy that
 * drifts would make every genuine card fail to parse, leaving an owner unable
 * to approve OR stop a required critic. `criticcallpaper.test.ts` binds each
 * one to the constant it mirrors so the drift fails a test instead.
 */
export const CRITIC_CALL_ATTEMPT_CAP = 3;
export const CRITIC_CALL_TIMEOUT_MS_CAP = 600_000;
export const CRITIC_CALL_OUTPUT_CHARACTER_CAP = 262_144;

/**
 * Main's output-only statement of the one call it is asking to make.
 *
 * Every field is derived from a branded `CriticCallAuthorizationV1`; nothing
 * here is renderer input, and nothing here is authority. It names files,
 * hashes and counts — never their contents — and carries no absolute path,
 * project hash, packet content, or credential.
 */
export type CriticCallDisclosureV1 = Readonly<{
  version: typeof CRITIC_CALL_DISCLOSURE_VERSION;
  /** Opaque, one-use, main-owned. The only thing a decision may name. */
  approvalId: string;
  callKind: CriticCallKindV1;
  mode: CriticCallModeV1;
  attempt: number;
  attemptCap: number;
  provider: string;
  baseUrl: string;
  configuredModel: string;
  resolvedModel: string;
  resolvedModelRevision: string;
  connectionConsentVersion: string;
  routeRequestFingerprintSha256: string;
  purpose: string;
  notSent: readonly string[];
  credentialText: string;
  selection: readonly CriticCallSelectedFileViewV1[];
  selectedFiles: number;
  selectedCharacters: number;
  /** What the request carries besides file contents. */
  planMetadata: CriticCallPlanMetadataV1;
  /** Present only on the exact inert synthetic route. It lets the owner match
   * this card to the preregistered schedule and inspect every sent text byte. */
  calibration: CriticCallCalibrationViewV1 | null;
  /** The exact size of the whole canonical request, file contents included. */
  totalRequestCharacters: number;
  fileCap: number;
  perFileCharacterCap: number;
  totalCharacterCap: number;
  timeoutMs: number;
  maxOutputCharacters: number;
  billingBasis: string;
  actions: readonly CriticCallActionV1[];
}>;

/** The renderer chooses one closed press on one opaque id, and echoes back the
 * card it was shown. Main re-derives that card and compares before deciding. */
export type CriticCallDecisionRequest = Readonly<{
  dir: string;
  approvalId: string;
  action: CriticCallActionV1;
  disclosure: CriticCallDisclosureV1;
}>;

export type CriticCallDecisionV1 = Readonly<{
  version: typeof CRITIC_CALL_DECISION_VERSION;
  approvalId: string;
  outcome: "approved" | "continued-without-critic" | "task-stopped";
}>;

/**
 * One canonical string per card, so "is this the card the owner saw?" is a
 * byte comparison rather than a field-by-field opinion. Positional, so key
 * order cannot change the bytes a decision compares.
 */
export function canonicalCriticCallDisclosure(value: CriticCallDisclosureV1): string {
  return JSON.stringify([
    value.version, value.approvalId, value.callKind, value.mode, value.attempt, value.attemptCap, value.provider,
    value.baseUrl, value.configuredModel, value.resolvedModel, value.resolvedModelRevision,
    value.connectionConsentVersion, value.routeRequestFingerprintSha256, value.purpose,
    [...value.notSent], value.credentialText, value.selection.map((row) => [row.path, row.sha256, row.characters]),
    value.selectedFiles, value.selectedCharacters,
    PLAN_METADATA_KEYS.map((key) => value.planMetadata[key]),
    value.calibration === null ? null : [
      value.calibration.manifestSha256, value.calibration.fixtureId, value.calibration.fixtureIndex,
      value.calibration.fixtureCount, value.calibration.fixtureSha256, value.calibration.packetSha256,
      value.calibration.requestSha256, value.calibration.requestBodySha256,
      value.calibration.text.map((row) => [row.path, row.sha256, row.content]),
    ],
    value.totalRequestCharacters,
    value.fileCap, value.perFileCharacterCap,
    value.totalCharacterCap, value.timeoutMs, value.maxOutputCharacters, value.billingBasis,
    [...value.actions],
  ]);
}
