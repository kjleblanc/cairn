import type { ProjectStatus, RouteResult, SerialActivity, SerialRunResult, WorkerDisclosure } from "@cairn/core";

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
export type UpdateInfo = { current: string; latest: string | null; newer: boolean };
export type TaskActivityEvent = { dir: string; activity: SerialActivity };
export type TaskRoutePreview = { route: RouteResult; disclosure?: WorkerDisclosure };
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
/**
 * One dispatch request, whole. It travels as a single object because every
 * part of it is load-bearing at the gate: the outcome and the owner's own
 * `details` are BOTH re-derived into the expected disclosure card, so a
 * positional signature that quietly drops one would dispatch something the
 * owner never read. `conversationId` names the conversation the request came
 * from (null when it was typed on the task screen instead).
 */
export type TaskRunRequest = {
  dir: string;
  outcome: string;
  details: string;
  adapterId?: string;
  realCallConfirmed?: boolean;
  disclosure?: WorkerDisclosure;
  conversationId?: string | null;
};
export type RunSessionSnapshot = {
  dir: string;
  outcome: string;
  adapterId: string | null;
  conversationId: string | null;
  // true when this run is a real confirmed worker call, not the offline demo; Task 10 re-keys lane wording off adapter capabilities
  worker: boolean;
  startedAt: string;
  activities: SerialActivity[];
  phase: "running" | "closed";
  result: SerialRunResult | null;
  error: string | null;
};
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
}

export interface ConductorStatus {
  connected: boolean;
  baseUrl: string;
  model: string;
  provider: string;
  encryptionAvailable: boolean;
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
}

export interface ConductorConnectRequest {
  card: ConductorConsentCard;
  apiKey: string;
  consentConfirmed: boolean;
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
}

export interface ConductorDelta {
  dir: string;
  conversationId: string;
  /**
   * "envelope" is not part of the reply stream at all: it carries a result
   * card the envelope authored after a run settled, so a screen showing that
   * conversation can post it without a reload. It never touches the streaming
   * reply, and it never adopts a conversation id.
   */
  kind: "delta" | "done" | "error" | "envelope";
  text?: string;
  turn?: ConductorTurn;
  taskBlock?: TaskBlock | null;
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
  projectStatus(dir: string): Promise<Result<ProjectStatus>>;
  projectForget(dir: string): Promise<Result<null>>;
  townLoad(dir: string): Promise<Result<TownPresentationState>>;
  townSave(dir: string, state: TownPresentationState): Promise<Result<TownPresentationState>>;
  taskRoute(dir: string, outcome: string, details: string, adapterId?: string): Promise<Result<TaskRoutePreview>>;
  taskRun(request: TaskRunRequest): Promise<Result<SerialRunResult>>;
  taskCancel(dir: string): Promise<Result<null>>;
  taskCurrent(dir: string): Promise<RunSessionSnapshot | null>;
  taskAcknowledge(dir: string): Promise<Result<null>>;
  updateCheck(): Promise<UpdateInfo>;
  openExternal(url: string): Promise<void>;
  onTaskActivity(cb: (event: TaskActivityEvent) => void): () => void;
  conductorStatus(): Promise<ConductorStatus>;
  conductorConsentCard(baseUrl: string, model: string): Promise<Result<ConductorConsentCard>>;
  conductorConnect(request: ConductorConnectRequest): Promise<Result<null>>;
  conductorOAuthBegin(request: ConductorOAuthRequest): Promise<Result<{ authUrl: string }>>;
  conductorOAuthCancel(): Promise<Result<null>>;
  onConductorOAuth(cb: (event: ConductorOAuthEvent) => void): () => void;
  conductorDisconnect(): Promise<Result<null>>;
  conductorSetModel(model: string): Promise<Result<null>>;
  conductorSend(request: ConductorSendRequest): Promise<Result<{ conversationId: string }>>;
  conductorStop(dir: string): Promise<Result<null>>;
  conductorCurrent(dir: string): Promise<ConductorStreamSnapshot | null>;
  conductorConversations(dir: string): Promise<ConductorConversationSummary[]>;
  conductorTurns(dir: string, id: string): Promise<ConductorTurn[]>;
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

/**
 * The envelope's own account of one terminal run, built deterministically from
 * the structured record input Cairn composed its report from — never from the
 * conversation model, and never scraped from rendered Markdown.
 *
 * Every field here is either Cairn's own verification (Git-derived
 * `filesChanged`, the real `protectedIntact` finding, the real commit result)
 * or a fixed code. The one exception is `claims`, which is the WORKER's own
 * account and must be rendered as a claim wherever it appears — never as
 * verified fact.
 *
 * `disposition` carries a third state the runtime knows and the record files
 * do not: ERROR, for a run that threw instead of closing. That arm has no task
 * number, no route, and no verified facts to report — only `errorCode`.
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
  claims: { summary: string; milestone: string } | null;
  route: { adapterLabel: string; provider: string; model: string } | null;
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
