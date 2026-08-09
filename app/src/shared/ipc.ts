import type { ConvertInspection, ConvertOutcome, ProjectStatus, RouteResult, SerialActivity, SerialRunResult, TaskRequestView, WorkerDisclosure } from "@cairn/core";
import type { TaskSpecProposalPreviewV1 } from "./quality-preview.js";
import type { TaskReviewActionRequest, TaskReviewProjectionV1 } from "./task-review.js";
import type { CriticCallDecisionRequest, CriticCallDecisionV1, CriticCallDisclosureV1 } from "./critic-call.js";

export type { TaskSpecProposalPreviewV1 } from "./quality-preview.js";
export type { TaskReviewActionRequest, TaskReviewProjectionV1 } from "./task-review.js";
export type {
  CriticCallActionV1,
  CriticCallDecisionRequest,
  CriticCallDecisionV1,
  CriticCallDisclosureV1,
  CriticCallModeV1,
  CriticCallSelectedFileViewV1,
} from "./critic-call.js";

export type {
  AccountLabelProvenance,
  AuthKind,
  AvailabilityEvidence,
  BillingKind,
  CairnRole,
  CatalogSnapshot,
  CatalogSource,
  ConnectionStatus,
  ConnectionSummary,
  ModelLifecycle,
  ModelModality,
  ModelOption,
  NormalizedModelPrice,
} from "./model-connections.js";

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };
export type Preflight = { mock: boolean; mode: "offline-demo" | "connection-required" };
export type ProjectActivity = "idle" | "thinking" | "working" | "complete";
export type ProjectTaskState = "running" | "unfinished" | "done" | "stopped";
export type ProjectTaskSummary = {
  id: string;
  label: string;
  summary: string;
  state: ProjectTaskState;
};
export type RecentProject = {
  dir: string;
  ok: boolean;
  name: string;
  milestone: string;
  stones: number;
  lastOpened: string;
  activity: ProjectActivity;
  tasks: ProjectTaskSummary[];
};
export type ProjectList = { recent: RecentProject[]; autoOpen: string | null };
export type TownPoint = { x: number; y: number };
export type TownPresentationState = {
  version: 1;
  positions: Record<string, TownPoint>;
  dividerWidth: number;
};
export type InitInput = { dir: string; name: string; what: string; who: string; milestone: string };
/** Task 161: conversion's two-step result — the converted project's ordinary
 * status (so the app can open it like any project) plus conversion's own
 * account of what it added, kept, committed, and caveated. */
export type ConvertResult = { status: ProjectStatus; outcome: ConvertOutcome };
export type { ConvertInspection, ConvertOutcome };
export type UpdateInfo = { current: string; latest: string | null; newer: boolean };
export type TaskActivityEvent = { dir: string; activity: SerialActivity };
/** The only two authorities from which main may build a dispatch preview. */
export type TaskRouteSource =
  | { kind: "proposal"; proposalId: string; conversationId: string }
  | { kind: "manual"; rawOutcome: string };

export type TaskRouteRequest = {
  dir: string;
  source: TaskRouteSource;
  adapterId?: string;
};

/** A renderer-safe projection of main's one pending frozen intent. The UUID is
 * opaque and one-use; `request` and `context` are display output, never input
 * authority for `task:run`. */
export type TaskRoutePreview = {
  previewId: string;
  request: TaskRequestView;
  context: readonly string[];
  route: RouteResult;
  disclosure?: WorkerDisclosure;
  /** Optional output-only Quality Plan review. Main remains the sole owner of
   * the branded Task Spec; `task:run` accepts only `previewId`. */
  taskSpecPreview?: TaskSpecProposalPreviewV1;
  /** Optional output-only pre-seal evidence state for that exact Task Spec. */
  taskReview?: TaskReviewProjectionV1;
  /** Optional output-only Independent-critic card for one approved call. Main
   * composes it from the approval alone; it is absent until an orchestrator
   * exists to ask, and it is never authority for a call. */
  criticCall?: CriticCallDisclosureV1;
};
/** `pushPreview`'s local-only, network-free look at what a push would do:
 * null when the current branch has no upstream configured (there is
 * nothing to preview and nothing to push).
 *
 * `head` is the exact commit the preview describes. It rides along so the
 * push can pin its SOURCE as well as its destination: without it, a HEAD that
 * moved — or a different branch checked out — between the confirmation being
 * read and approved would publish commits the panel never listed. */
export type PushPreview = { remote: string; url: string; branch: string; ahead: number; subjects: string[]; head: string };
/**
 * `pushExecute`'s outcome from the ONE plain `git push` it ever runs — no
 * retry, no force. `kind` on failure is fail-closed: `other` is whatever a
 * real git error did not match one of the named cases.
 *
 * `refused` means Cairn declined BEFORE running git at all, so it is the one
 * failure whose words are entirely Cairn's own and which carries no git output
 * to label as such. The design spec enumerated the honest outcomes it knew
 * about — success, no remote, auth refused, remote ahead — and never
 * contemplated a pre-flight refusal, which only became possible once the
 * refspec was pinned from caller-supplied values (repo tasks 075-077). Adding
 * the case is completing the spec's honesty rule rather than departing from
 * it: `other` would lie through its "ends with git's own words" label, and
 * `no-remote` is simply the wrong statement about a malformed refspec.
 */
export type PushResult =
  | { ok: true; summary: string }
  | { ok: false; kind: "no-remote" | "auth" | "remote-ahead" | "other" | "refused"; message: string };
/** The final acceptance press carries no task text or adapter choice. Main
 * looks up those authorities from its one-time preview and re-derives the
 * disclosure before consuming it. */
export type TaskRunRequest = {
  dir: string;
  previewId: string;
  realCallConfirmed?: boolean;
  disclosure?: WorkerDisclosure;
};
export type RunSessionSnapshot = {
  dir: string;
  outcome: string;
  /** The one-time preview this session actually consumed. It is output-only:
   * renderers use it to distinguish a new accepted ERROR from an older
   * retained error session after a pre-acceptance refusal. */
  acceptedPreviewId?: string;
  /** Main's output-only view of the accepted frozen request. It remains on an
   * accepted ERROR session even when Core throws before returning a result. */
  request?: TaskRequestView;
  adapterId: string | null;
  conversationId: string | null;
  // true when this run is a real confirmed worker call, not the offline demo; Task 10 re-keys lane wording off adapter capabilities
  worker: boolean;
  startedAt: string;
  activities: SerialActivity[];
  phase: "running" | "closed";
  result: SerialRunResult | null;
  error: string | null;
  /** Opaque main-owned identity used only to bind local captures to this run. */
  evidenceRunId?: string | null;
  /** Output-only accepted Task Spec and pre-seal evidence state. */
  taskReview?: TaskReviewProjectionV1;
  /** Output-only Independent-critic card for the one call awaiting a decision. */
  criticCall?: CriticCallDisclosureV1;
};

/** Main creates evidence run IDs with `randomUUID()`. Keep the runtime check in
 * the shared contract so card composition and persisted-card reads enforce the
 * same boundary. The optional card/session property remains the compatibility
 * seam for data written before local evidence existed. */
const EVIDENCE_RUN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isEvidenceRunId(value: unknown): value is string {
  return typeof value === "string" && EVIDENCE_RUN_ID.test(value);
}

export type EvidenceImageRole = "before" | "after" | "moment";
export type EvidenceImage = {
  id: string;
  role: EvidenceImageRole;
  label: string;
  mime: "image/png";
  width: number;
  height: number;
  trusted: boolean;
};
export type EvidenceAlbumEntry = {
  runId: string | null;
  taskNumber: number | null;
  title: string;
  caption: string;
  disposition: "DONE" | "STOPPED" | "ERROR" | null;
  trusted: boolean;
  images: EvidenceImage[];
  pair: { beforeId: string; afterId: string } | null;
};
export type EvidenceAlbum = {
  selectedRunId: string | null;
  entries: EvidenceAlbumEntry[];
  /** Opaque keyset cursor for older trusted runs; null means history is exhausted. */
  nextCursor: string | null;
};
export type EvidenceImageData = { id: string; dataUrl: string };
export type ConductorConversationSummary = { id: string; startedTs: string; preview: string };
export type ConductorStreamKind = "reply" | "commentary";
export interface ConductorStreamSnapshot {
  dir: string;
  conversationId: string;
  kind: ConductorStreamKind;
  startedAt: string;
  /** Visible assistant text accumulated so far; bounded by the conductor
   * client's existing prompt and output limits. */
  text: string;
  /** Main-authored, output-only accessibility provenance for a live targeted
   * reply. No action/risk ID or resend authority crosses this snapshot. */
  settlementKind?: ConductorActionReply["kind"];
}

export interface ConductorStatus {
  connected: boolean;
  /** A saved credential exists, but its recorded sharing permission does not
   * exactly match the disclosure Cairn would show today. */
  consentRequired: boolean;
  baseUrl: string;
  model: string;
  provider: string;
  encryptionAvailable: boolean;
  /** True when the saved credential is healthy but this canonical project
   * has no current grant (or its filesystem binding changed). */
  projectAuthorizationRequired?: boolean;
  /** Task 3 keeps the compatibility route pinned until Connections ships. */
  modelChangeAllowed?: boolean;
  /** Present only when main has blocked ordinary connection activity because
   * local model-connection custody is malformed or deletion is incomplete. */
  recovery?: ConductorRecoveryCard | null;
}

/** Main-authored destructive-recovery disclosure. The fixed filenames inside
 * Cairn's private profile are output-only facts; raw profile paths never enter
 * the renderer, and it must return this whole card unchanged. */
export interface ConductorRecoveryCard {
  kind: "erase-model-connections";
  recoveryId: string;
  title: "Erase Cairn model connections";
  targets: readonly string[];
  effect: string;
  exposure: string;
  recovery: string;
  confirmation: string;
}

export interface ConductorRecoveryEraseRequest {
  kind: "erase-model-connections";
  card: ConductorRecoveryCard;
  confirmed: true;
}

export interface ConductorConsentCard {
  provider: string;
  baseUrl: string;
  model: string;
  data: string;
  cost: string;
  /** The consent checkbox label, derived in main alongside the rest of the
   * card so a plan-based body never sits under a label that claims per-turn
   * billing. The renderer renders this string; it never writes one. */
  checkbox: string;
  /** A second, explicit confirmation for the newly shared file-content
   * snapshot. Main derives and verifies this text with the whole card. */
  fileContentsCheckbox: string;
}

export interface ConductorConnectRequest {
  card: ConductorConsentCard;
  apiKey: string;
  consentConfirmed: boolean;
  /** Main requires the value to be exactly true before it stores a connection. */
  fileContentsConfirmed: boolean;
}

/**
 * "Sign in with OpenRouter" (task 131): the renderer's half of the PKCE
 * dance. It carries NO key — that is the point. The card + consentConfirmed
 * pass the exact same re-derivation gate as a pasted-key connect before any
 * browser opens, and the key OpenRouter mints never crosses IPC: main stores
 * it through the same encrypted keystore path and reports only the outcome.
 */
export interface ConductorOAuthRequest {
  card: ConductorConsentCard;
  consentConfirmed: boolean;
  /** See ConductorConnectRequest.fileContentsConfirmed. */
  fileContentsConfirmed: boolean;
}

/** Re-authorize an already saved connection after Cairn's data scope changes.
 * No key crosses IPC and no provider request is made. */
export interface ConductorRenewConsentRequest {
  card: ConductorConsentCard;
  consentConfirmed: boolean;
  fileContentsConfirmed: boolean;
}

/**
 * The terminal state of one sign-in attempt, emitted from main over the
 * conductor:oauth channel. `done` means the key is already in the encrypted
 * keystore. `failed` carries one of the fixed refusal strings (listener,
 * timeout, exchange). A renderer-initiated cancel emits NOTHING — the card
 * that cancelled already knows.
 */
export type ConductorOAuthEvent = { kind: "done" } | { kind: "failed"; message: string };

export interface ConductorSendRequest {
  dir: string;
  conversationId: string | null;
  text: string;
  /** Main validates this one-time target before writing the owner turn. The
   * renderer never sends question, risk, request, source, or context content. */
  actionReply?: ConductorActionReply;
}

export type ConductorActionReply =
  | { kind: "answer"; actionId: string }
  | { kind: "defer"; actionId: string }
  | { kind: "correction"; actionId: string }
  | { kind: "set-risk-aside"; actionId: string; riskId: string };

export type ConductorAction =
  | {
      kind: "question";
      actionId: string;
      conversationId: string;
      question: string;
    }
  | {
      kind: "task";
      actionId: string;
      conversationId: string;
      request: TaskRequestView;
      context: readonly string[];
      risks: readonly { riskId: string; text: string }[];
      /** Optional output-only projection. It is never accepted back as task
       * or dispatch authority. */
      taskSpecPreview?: TaskSpecProposalPreviewV1;
    };

export interface ConductorDelta {
  dir: string;
  conversationId: string;
  /**
   * "envelope" is not part of the reply stream at all: it carries a result
   * card the envelope authored after a run settled, so a screen showing that
   * conversation can post it without a reload. It never touches the streaming
   * reply, and it never adopts a conversation id.
   */
  /** "replace" resets a live reply to main's canonical proposal
   * acknowledgement once main can validate that the stream carries a task. */
  kind: "delta" | "replace" | "done" | "error" | "envelope";
  text?: string;
  turn?: ConductorTurn;
  taskBlock?: TaskBlock | null;
  /** Trusted main-owned projection. Null on a settled ordinary reply; omitted
   * on streaming deltas/replacements, errors, envelope cards, and commentary. */
  action?: ConductorAction | null;
  message?: string;
  /** Which of Cairn's two voices is streaming: the reply the owner asked
   * for, or the envelope's one short comment on a result card (Task 153).
   * The renderer needs the difference: a commentary is shown as a labeled
   * bubble with no Stop control, and its failure is released quietly — no
   * error bubble, no phantom partial turn — matching main's silent drop. */
  turnKind?: ConductorStreamKind;
  /** Task 157: the commentary's up-to-three next-step suggestions, on the
   * done delta only. Null for a reply (a reply never carries them) and when
   * the model's block failed validation — never a coerced list. */
  followups?: string[] | null;
}

/**
 * Task 160's checkup report. Built deterministically in main from the
 * project's own records and local git — no model call, no network, and
 * strictly read-only: a finding's `suggestion` is plain text the owner may
 * send as their own message, never something the checkup does itself.
 */
export type CheckupGroup = "risk" | "attention" | "healthy";
export type CheckupTrailState = "done" | "stopped" | "inflight" | "unlogged";
/** One cell of the records strip: the task number is kept so the card's
 * per-cell label can tell the truth (numbers with no records are skipped,
 * not renumbered). */
export type CheckupTrailEntry = { n: number; state: CheckupTrailState };
export interface CheckupFinding {
  group: CheckupGroup;
  title: string;
  detail: string;
  suggestionLabel?: string;
  suggestion?: string;
}
export interface CheckupReport {
  dir: string;
  name: string;
  generatedAt: string;
  verdict: "Healthy" | "Mostly healthy" | "Needs a decision";
  verdictNote: string;
  counts: { done: number; stopped: number; inFlight: number; unlogged: number; total: number };
  trail: CheckupTrailEntry[];
  findings: CheckupFinding[];
}

export interface CairnApi {
  preflight(): Promise<Preflight>;
  projectList(): Promise<ProjectList>;
  projectCheckup(dir: string): Promise<Result<CheckupReport>>;
  projectPickFolder(): Promise<string | null>;
  projectOpen(dir: string): Promise<Result<ProjectStatus>>;
  projectInit(input: InitInput): Promise<Result<ProjectStatus>>;
  projectConvertInspect(dir: string): Promise<Result<ConvertInspection>>;
  projectConvert(input: InitInput): Promise<Result<ConvertResult>>;
  projectStatus(dir: string): Promise<Result<ProjectStatus>>;
  projectForget(dir: string): Promise<Result<null>>;
  townLoad(dir: string): Promise<Result<TownPresentationState>>;
  townSave(dir: string, state: TownPresentationState): Promise<Result<TownPresentationState>>;
  taskRoute(request: TaskRouteRequest): Promise<Result<TaskRoutePreview>>;
  taskPreviewDiscard(dir: string, previewId?: string): Promise<Result<null>>;
  taskRun(request: TaskRunRequest): Promise<Result<SerialRunResult>>;
  taskReviewAction(request: TaskReviewActionRequest): Promise<Result<TaskReviewProjectionV1>>;
  /** Decide the one pending critic call. Output only: the reply says what was
   * decided, never anything a renderer could use as authority for a call. */
  criticCallDecide(request: CriticCallDecisionRequest): Promise<Result<CriticCallDecisionV1>>;
  taskCancel(dir: string): Promise<Result<null>>;
  taskCurrent(dir: string): Promise<RunSessionSnapshot | null>;
  taskAcknowledge(dir: string): Promise<Result<null>>;
  evidenceAlbum(dir: string, selectedRunId?: string | null, cursor?: string | null): Promise<Result<EvidenceAlbum>>;
  evidenceImage(dir: string, imageId: string): Promise<Result<EvidenceImageData>>;
  updateCheck(): Promise<UpdateInfo>;
  openExternal(url: string): Promise<void>;
  onTaskActivity(cb: (event: TaskActivityEvent) => void): () => void;
  conductorStatus(): Promise<ConductorStatus>;
  conductorConsentCard(baseUrl: string, model: string): Promise<Result<ConductorConsentCard>>;
  conductorConnect(request: ConductorConnectRequest): Promise<Result<null>>;
  conductorRenewConsent(request: ConductorRenewConsentRequest): Promise<Result<null>>;
  conductorOAuthBegin(request: ConductorOAuthRequest): Promise<Result<{ authUrl: string }>>;
  conductorOAuthCancel(): Promise<Result<null>>;
  onConductorOAuth(cb: (event: ConductorOAuthEvent) => void): () => void;
  conductorDisconnect(request?: ConductorRecoveryEraseRequest): Promise<Result<null>>;
  conductorSetModel(model: string): Promise<Result<null>>;
  conductorSend(request: ConductorSendRequest): Promise<Result<{ conversationId: string }>>;
  conductorStop(dir: string): Promise<Result<null>>;
  conductorCurrent(dir: string): Promise<ConductorStreamSnapshot | null>;
  conductorConversations(dir: string): Promise<ConductorConversationSummary[]>;
  conductorTurns(dir: string, id: string): Promise<ConductorTurn[]>;
  conductorProposal(dir: string, id: string): Promise<TaskBlock | null>;
  conductorAction(dir: string, id: string): Promise<ConductorAction | null>;
  onConductorDelta(cb: (event: ConductorDelta) => void): () => void;
  pushPreview(dir: string): Promise<PushPreview | null>;
  /** Takes the whole preview the owner approved — not values picked out of it
   * — so the push is pinned at both ends to exactly what was disclosed: its
   * destination (`remote`, `branch`) rather than the machine's `push.default`,
   * and its source (`head`) rather than wherever HEAD has since moved. Main
   * refuses outright if `remote` is not a remote this project has configured. */
  pushExecute(dir: string, preview: PushPreview): Promise<PushResult>;
  phoneBridgeState(): Promise<PhoneBridgeState>;
  phoneBridgePairBegin(): Promise<Result<PairingOffer>>;
  phoneBridgeRevokeDevice(id: string): Promise<Result<null>>;
}

export interface TaskBlockConcern {
  kind: "question" | "risk";
  text: string;
}

export interface TaskBlock {
  outcome: string;
  concerns: TaskBlockConcern[];
  notes: string;
  details: string;
}

export const TASK_SPEC_RESULT_PROJECTION_VERSION = "cairn-task-spec-result-projection/v1" as const;

/**
 * Durable, data-only projection of Core's branded Task-Spec run record.
 *
 * The projection deliberately keeps four speakers/fact classes apart:
 * required promises and advisory preferences come from the frozen Task Spec;
 * adapter attestations carry command-hash/exit custody only; `workerClaims`
 * remains the worker's unverified account; and `envelopeResult` is Main's
 * separately verified terminal fact. Q4 has no critic/candidate custody, so
 * `criticReady` is fixed false and no critic/verdict field exists.
 */
export interface TaskSpecResultProjectionV1 {
  version: typeof TASK_SPEC_RESULT_PROJECTION_VERSION;
  requestSha256: string;
  taskSpecSha256: string;
  evidencePlanSha256: string;
  requiredPromises: Array<{ id: `c${number}`; promise: string }>;
  /** Advisory guidance only; these rows never gate DONE. */
  advisoryPreferences: Array<{
    id: `p${number}`;
    dimension: string;
    desiredDirection: string;
  }>;
  /** Main-derived command identity/exit facts; never CriterionResultV1. */
  adapterAttestations: Array<{
    version: "cairn-adapter-command-attestation/v1";
    taskSpecSha256: string;
    evidencePlanSha256: string;
    criterionId: `c${number}`;
    sequence: number;
    commandSha256: string;
    exitCode: number;
  }>;
  /** Worker assertions only, even when the hash and every id match. */
  workerClaims: {
    version: "cairn-task-spec-worker-claims/v1";
    taskSpecSha256: string;
    disposition: "DONE" | "STOPPED";
    summary: string;
    changes: string[];
    criteria: Array<{ id: `c${number}`; result: string }>;
    preferences: Array<{ id: `p${number}`; result: string }>;
    howToTry: string;
    limitations: string;
    milestone: "YES" | "NO" | "UNCLEAR";
  } | null;
  /** Main's terminal envelope fact, separate from worker claims and events. */
  envelopeResult: {
    version: "cairn-envelope-result/v1";
    taskNumber: number;
    requestSha256: string;
    taskSpecSha256: string;
    disposition: "DONE" | "STOPPED";
    stopReason: string | null;
  };
  criticReady: false;
}

/**
 * The envelope's own account of one terminal run, built deterministically from
 * the structured record input Cairn composed its report from — never from the
 * conversation model, and never scraped from rendered Markdown.
 *
 * Result fields here are either Cairn's own verification (Git-derived
 * `filesChanged`, the real `protectedIntact` finding, the real commit result)
 * or a fixed code. `claims` is the WORKER's own account and must be rendered
 * as a claim wherever it appears. `acceptedRequest` is separately labelled
 * source-marked context. Neither is a verified result fact.
 *
 * `disposition` carries a third state the runtime knows and the record files
 * do not: ERROR, for a run that threw instead of closing. That arm has no task
 * number, no route, and no verified facts to report. It retains only the fixed
 * `errorCode`, any atomically accepted request context, and — when the throw
 * followed an accepted run — its opaque local evidence link.
 */
export interface ResultCard {
  kind: "result";
  disposition: "DONE" | "STOPPED" | "ERROR";
  taskNumber: number | null;
  stopReason: string | null;
  errorCode: string | null;
  filesChanged: string[];
  protectedIntact: boolean | null;
  commit: string | null;
  evidenceSummary: string | null;
  /**
   * Task 052's owned-record recovery disclosure: Cairn had to restore its own
   * append-only log, or overwrite a report path the worker pre-wrote. It says
   * a worker tampered with Cairn's own records, so it must reach the owner —
   * the record renders it under "Verified by Cairn" and so does the card.
   */
  recordRecovery: string | null;
  /** The worker process's own failure code and the retained local debug path
   * (null when the debug directory could not be created). */
  processFailure: { code: string; debugPath: string | null } | null;
  claims: {
    summary: string;
    changes: string[];
    checks: { name: string; result: string }[];
    howToTry: string;
    limitations: string;
    milestone: string;
  } | null;
  route: { adapterLabel: string; provider: string; model: string } | null;
  /**
   * Output-only view of the request atomically accepted for this run.
   *
   * - absent: a legacy card whose original authenticated shape predates
   *   request attribution;
   * - null: a new card for which no task request was accepted; and
   * - present: the ID/offset/context-free view derived from the accepted
   *   intent. It is result context, never dispatch authority.
   */
  acceptedRequest?: TaskRequestView | null;
  /**
   * Opaque main-owned UUID linking local pictures to this exact accepted run.
   * Old cards do not carry it; blank/non-run cards use null. It is never a
   * path, never image data, and never included in conductor context.
   */
  evidenceRunId?: string | null;
  /**
   * Present only for the staged Task-Spec-bound v4 path. Absence keeps every
   * legacy/live empty-registry card byte and meaning unchanged.
   */
  taskSpecResult?: TaskSpecResultProjectionV1;
  /** Q5's source-marked Task Spec and pre-seal owner/critic evidence state. */
  taskReview?: TaskReviewProjectionV1;
}

/** The two turns owner and Cairn take in the conversation itself. */
export interface ConductorChatTurn {
  role: "owner" | "cairn";
  text: string;
  ts: string;
  tokens?: number;
  costUsd?: number;
  /** Task 157: present only on a cairn commentary turn — the next-step
   * suggestions the model offered alongside its comment, validated before
   * persist and re-validated on read (the conversation file lives inside the
   * project a worker can write to). */
  followups?: string[];
}

/** A turn the ENVELOPE wrote. It has no text: everything it says is rendered
 * from the card's structured fields, so no wording can drift and no model can
 * author one. */
export interface ConductorEnvelopeTurn {
  role: "envelope";
  card: ResultCard;
  ts: string;
}

export type ConductorTurn = ConductorChatTurn | ConductorEnvelopeTurn;

/**
 * Task 143: the phone bridge ("pair and read" — decisions 1, 2, and 5 of
 * the accepted mobile groundwork design).
 *
 * The disclosure sentence below is the exact one the spec fixes for the
 * desktop pairing screen — the honest v1 trade-off, in the open. It is a
 * shared constant so the renderer shows this and only this wording.
 */
export const BRIDGE_PAIRING_DISCLOSURE =
  "Traffic stays inside your home Wi-Fi and is not encrypted in v1; don't pair on a network you don't control.";

export interface BridgeDeviceInfo {
  id: string;
  name: string;
  firstPaired: string;
  lastSeen: string;
}

/** What the desktop settings surface shows: whether the LAN listener is
 * up, why not when it isn't (a plain sentence, never a stack), the address
 * the phone should open, and the paired-device list. Tokens never appear. */
export interface PhoneBridgeState {
  running: boolean;
  reason: string | null;
  url: string | null;
  devices: BridgeDeviceInfo[];
}

/** The desktop's half of pairing: a short-lived single-use code and the
 * address to type it at. */
export interface PairingOffer {
  code: string;
  url: string;
  expiresAt: string;
}
