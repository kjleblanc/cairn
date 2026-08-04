/**
 * The visual lab's mock bridge: a complete, in-memory `CairnApi`
 * (`shared/ipc.ts`) installed as `window.cairn` BEFORE the real renderer
 * loads. It exists so the real App, Workspace, Chat, and town square can be
 * designed and exercised in a plain browser — no Electron, no provider, no
 * credential, no Git, and no access to anything on the owner's disk.
 *
 * Everything here is canned and honest about it: the project is named
 * "Garden Lab (mock)", the page carries a mock badge, and capabilities the
 * lab does not simulate (routing, running, pushing, folder picking) return
 * plain refusals rather than pretending. State scenarios are switched
 * through `window.__lab`, driven by the lab's own control panel.
 */
import type {
  CairnApi,
  ConductorConversationSummary,
  ConductorDelta,
  ConductorStatus,
  ConductorStreamSnapshot,
  ConductorTurn,
  InitInput,
  PairingOffer,
  PhoneBridgeState,
  Preflight,
  ProjectList,
  PushPreview,
  PushResult,
  Result,
  ResultCard,
  RunSessionSnapshot,
  TaskActivityEvent,
  TaskRoutePreview,
  TaskRunRequest,
  TownPresentationState,
  UpdateInfo,
} from "../src/shared/ipc";
import type { ProjectStatus, SerialActivity, SerialRunResult } from "@cairn/core";

export type LabScenario = "idle" | "thinking" | "running" | "done" | "stopped";

const DIR = "C:\\lab\\garden-lab";
const CONVERSATION_ID = "lab-conversation";
const STARTED = new Date("2026-07-28T09:00:00").toISOString();

const ok = <T,>(value: T): Result<T> => ({ ok: true, value });
const nope = <T,>(message: string): Result<T> => ({ ok: false, message });
/** Small async delay so React effects and spinners behave the way they do
 * against the real bridge. */
const soon = <T,>(value: T, ms = 40): Promise<T> => new Promise((resolve) => setTimeout(() => resolve(value), ms));

const projectStatus: ProjectStatus = {
  facts: {
    status: "ACTIVE",
    name: "Garden Lab (mock)",
    what: "A design playground for the new digital-garden workspace",
    who: "the designer at the keyboard",
    milestone: "a workspace that feels alive without ever lying",
    contractVersion: "0.3.0",
  },
  log: [
    { task: "001", date: "2026-07-27", lane: "Standard", mode: "Applied", outcome: "DONE", decision: "completed", summary: "Sketched the first garden pads", moved: "NO" },
    { task: "002", date: "2026-07-28", lane: "Standard", mode: "Applied", outcome: "DONE", decision: "completed", summary: "Gave the avatars their faces", moved: "NO" },
  ],
  stones: 2,
  unfinished: null,
  legacyState: false,
};

function doneCard(disposition: "DONE" | "STOPPED"): ResultCard {
  return {
    kind: "result",
    disposition,
    taskNumber: 3,
    stopReason: disposition === "STOPPED" ? "PROTECTED_WORK_CHANGED" : null,
    errorCode: null,
    filesChanged: disposition === "DONE" ? ["src/garden/pads.ts", "src/garden/faces.ts"] : [],
    protectedIntact: disposition !== "STOPPED",
    commit: disposition === "DONE"
      ? "committed as Task 003: the pads glow and the faces blink"
      : null,
    evidenceSummary: disposition === "STOPPED"
      ? "The run stopped because protected starting work changed; the evidence was kept."
      : "2 files changed, one snapshot saved, all checks passed.",
    recordRecovery: null,
    processFailure: null,
    claims: {
      summary: disposition === "DONE"
        ? "Claimed: pads and faces are in and the suite was green."
        : "Claimed: partial progress before the stop.",
      changes: disposition === "DONE"
        ? ["Made the garden pads glow.", "Added blinking faces."]
        : ["Started the garden update before Cairn stopped the run."],
      checks: disposition === "DONE"
        ? [{ name: "Garden tests", result: "All passed." }]
        : [],
      howToTry: "Open the garden and watch the pads and faces.",
      limitations: disposition === "DONE" ? "The final look still needs your judgment." : "The update is incomplete.",
      milestone: "NO",
    },
    route: { adapterLabel: "Lab Worker", provider: "Lab Provider", model: "lab-face-1" },
  };
}

/** The mock's whole mutable world. Scenarios mutate this, then nudge the
 * renderer through the same events the real main process would send. */
const world = {
  turns: [
    { role: "owner", text: "Can the workspace feel calmer? More like a garden than a dashboard.", ts: STARTED },
    { role: "cairn", text: "It can — and I'd keep one rule while we play: pretty about the journey, plain about the truth. Want me to try the pads first?", ts: STARTED },
  ] as ConductorTurn[],
  stream: null as ConductorStreamSnapshot | null,
  session: null as RunSessionSnapshot | null,
  town: { version: 1, positions: {}, dividerWidth: 420 } as TownPresentationState,
};

const conductorStatus: ConductorStatus = {
  connected: true,
  consentRequired: false,
  baseUrl: "https://lab.invalid",
  model: "lab-face-1",
  provider: "lab.invalid",
  encryptionAvailable: false,
};

const listeners = {
  conductor: new Set<(event: ConductorDelta) => void>(),
  task: new Set<(event: TaskActivityEvent) => void>(),
};

function emitConductor(event: ConductorDelta): void {
  for (const cb of listeners.conductor) cb(event);
}
function emitTask(event: TaskActivityEvent): void {
  for (const cb of listeners.task) cb(event);
}

let streamTimers: ReturnType<typeof setTimeout>[] = [];
function clearStreamTimers(): void {
  for (const t of streamTimers) clearTimeout(t);
  streamTimers = [];
}

/** A short canned reply, streamed the way the real conductor streams, so
 * the chat's streaming bubble and Stop button can be designed too. */
function simulateReply(conversationId: string): void {
  clearStreamTimers();
  const parts = ["Let me think about that", " — pads, faces, and one honest rule.", " I'd start with the pads."];
  world.stream = { dir: DIR, conversationId, kind: "reply", startedAt: new Date().toISOString(), text: "" };
  let text = "";
  parts.forEach((part, i) => {
    streamTimers.push(setTimeout(() => {
      text += part;
      if (world.stream) world.stream.text = text;
      emitConductor({ dir: DIR, conversationId, kind: "delta", text: part });
    }, 350 * (i + 1)));
  });
  streamTimers.push(setTimeout(() => {
    world.turns = [...world.turns, { role: "cairn", text, ts: new Date().toISOString() }];
    world.stream = null;
    emitConductor({ dir: DIR, conversationId, kind: "done" });
  }, 350 * (parts.length + 1) + 400));
}

function postCard(disposition: "DONE" | "STOPPED"): void {
  clearStreamTimers();
  world.stream = null;
  world.session = null;
  const turn: ConductorTurn = { role: "envelope", card: doneCard(disposition), ts: new Date().toISOString() };
  world.turns = [...world.turns, turn];
  emitConductor({ dir: DIR, conversationId: CONVERSATION_ID, kind: "envelope", turn });
}

function setScenario(next: LabScenario): void {
  clearStreamTimers();
  if (next === "idle") {
    world.stream = null;
    world.session = null;
  } else if (next === "thinking") {
    simulateReply(CONVERSATION_ID);
    return;
  } else if (next === "running") {
    world.stream = null;
    const activity: SerialActivity = { stage: "Run", state: "working", detail: "the worker is sketching the pads" };
    world.session = {
      dir: DIR,
      outcome: "make the workspace feel like a calm digital garden",
      // The lab's stand-in worker wears the Codex face (Task 156) so the lab
      // town shows the real cast treatment.
      adapterId: "codex-exec",
      conversationId: CONVERSATION_ID,
      worker: true,
      startedAt: new Date().toISOString(),
      activities: [activity],
      phase: "running",
      result: null,
      error: null,
    };
    emitTask({ dir: DIR, activity });
  } else {
    postCard(next === "done" ? "DONE" : "STOPPED");
    return;
  }
  // Poke the screens that poll: the town refreshes off task activity.
  emitTask({ dir: DIR, activity: { stage: "Result", state: "done", detail: `lab scenario: ${next}` } });
}

declare global {
  interface Window {
    __lab?: { setScenario: (next: LabScenario) => void };
  }
}

const mock: CairnApi = {
  preflight: (): Promise<Preflight> => soon({ mock: true, mode: "offline-demo" }),
  projectList: (): Promise<ProjectList> => soon({
    recent: [{
      dir: DIR,
      ok: true,
      name: "Garden Lab (mock)",
      milestone: projectStatus.facts.milestone,
      stones: 2,
      lastOpened: new Date().toISOString(),
      activity: world.session ? "working" : world.stream ? "thinking" : "idle",
      tasks: [],
    }],
    autoOpen: null,
  }),
  projectPickFolder: () => soon(null),
  projectOpen: (dir: string) => dir === DIR ? soon(ok(projectStatus)) : soon(nope("the lab has exactly one mock project")),
  projectInit: (_input: InitInput) => soon(nope("the lab never creates projects")),
  // Task 161: the lab never converts either — the picker card's button gets
  // the same honest "not in the lab" refusal as project creation.
  projectConvertInspect: (_dir: string) => soon(nope("the lab never converts projects")),
  projectConvert: (_input: InitInput) => soon(nope("the lab never converts projects")),
  projectStatus: (dir: string) => dir === DIR ? soon(ok(projectStatus)) : soon(nope("the lab has exactly one mock project")),
  projectForget: (_dir: string) => soon(nope("the lab never forgets its one project")),
  // Task 160: a small plainly-mock sample report, shaped exactly like the
  // real one, so the lab picker can show the checkup card.
  projectCheckup: (dir: string) => dir === DIR ? soon(ok({
    dir: DIR,
    name: "Garden Lab (mock)",
    generatedAt: new Date().toISOString(),
    verdict: "Mostly healthy",
    verdictNote: "Nothing on fire — a few things are worth a look.",
    counts: { done: 2, stopped: 1, inFlight: 1, unlogged: 0, total: 4 },
    trail: [
      { n: 1, state: "done" },
      { n: 2, state: "stopped" },
      { n: 3, state: "done" },
      { n: 4, state: "inflight" },
    ],
    findings: [
      { group: "attention", title: "3 commits not pushed", detail: "Recent work exists only on this machine until it is pushed.", suggestionLabel: "Make the push decision", suggestion: "Work on: review the remote and make the push decision (3 unpushed commits)" },
      { group: "attention", title: "Task 004 is in flight", detail: "Its brief is committed but no report yet — work is still underway." },
      { group: "healthy", title: "Records intact — 3 brief/report pairs", detail: "Numbering runs continuously from 001 to 003, and every report has its log row." },
      { group: "healthy", title: "1 stopped run filed honestly", detail: "Stopped tasks kept their records as evidence instead of being hidden." },
    ],
  })) : soon(nope("the lab has exactly one mock project")),
  townLoad: (_dir: string) => soon(ok(world.town)),
  townSave: (_dir: string, state: TownPresentationState) => { world.town = state; return soon(ok(world.town)); },
  taskRoute: (_dir: string, _outcome: string, _details: string): Promise<Result<TaskRoutePreview>> =>
    soon(nope("the lab does not simulate routing — pose runs from the lab panel instead")),
  taskRun: (_request: TaskRunRequest): Promise<Result<SerialRunResult>> =>
    soon(nope("the lab never runs tasks — pose DONE or STOPPED from the lab panel")),
  taskCancel: (_dir: string) => soon(ok(null)),
  taskCurrent: (_dir: string) => soon(world.session),
  taskAcknowledge: (_dir: string) => soon(ok(null)),
  evidenceAlbum: (_dir: string, selectedRunId?: string | null, _cursor?: string | null) => soon(ok({
    selectedRunId: selectedRunId ?? null,
    entries: [],
    nextCursor: null,
  })),
  evidenceImage: (_dir: string, _imageId: string) => soon(nope("the lab has no local evidence image")),
  updateCheck: (): Promise<UpdateInfo> => soon({ current: "lab", latest: null, newer: false }),
  openExternal: (_url: string) => soon(undefined),
  onTaskActivity: (cb: (event: TaskActivityEvent) => void) => {
    listeners.task.add(cb);
    return () => listeners.task.delete(cb);
  },
  conductorStatus: () => soon(conductorStatus),
  conductorConsentCard: (baseUrl: string, model: string) => soon(ok({
    provider: "lab.invalid",
    baseUrl,
    model,
    data: "Nothing. The lab sends nothing anywhere — it is a design playground with canned data.",
    cost: "Free, always: the lab makes no model calls.",
    checkbox: "I understand the lab never connects to anything.",
    fileContentsCheckbox: "I understand the lab never shares project-file contents.",
  })),
  conductorConnect: () => soon(ok(null)),
  conductorRenewConsent: () => soon(ok(null)),
  // The lab never completes a sign-in: begin shows the waiting panel (so the
  // state is previewable) and no event ever arrives — Cancel is the way back.
  conductorOAuthBegin: () => soon(ok({ authUrl: "https://openrouter.ai/auth?callback_url=lab-demo" })),
  conductorOAuthCancel: () => soon(ok(null)),
  onConductorOAuth: () => () => {},
  conductorDisconnect: () => soon(ok(null)),
  conductorSetModel: () => soon(ok(null)),
  conductorSend: (request) => {
    world.turns = [...world.turns, { role: "owner", text: request.text, ts: new Date().toISOString() }];
    const id = request.conversationId ?? CONVERSATION_ID;
    simulateReply(id);
    return soon(ok({ conversationId: id }));
  },
  conductorStop: (_dir: string) => {
    clearStreamTimers();
    world.stream = null;
    return soon(ok(null));
  },
  conductorCurrent: (_dir: string) => soon(world.stream),
  conductorConversations: (_dir: string): Promise<ConductorConversationSummary[]> =>
    soon([{ id: CONVERSATION_ID, startedTs: STARTED, preview: "Can the workspace feel calmer?" }]),
  conductorTurns: (_dir: string, id: string) => soon(id === CONVERSATION_ID ? world.turns : []),
  // The lab's canned reply emits no task block, so it has no actionable
  // proposal for a remounted Chat to restore.
  conductorProposal: (_dir: string, _id: string) => soon(null),
  onConductorDelta: (cb: (event: ConductorDelta) => void) => {
    listeners.conductor.add(cb);
    return () => listeners.conductor.delete(cb);
  },
  pushPreview: (_dir: string): Promise<PushPreview | null> => soon(null),
  pushExecute: (_dir: string, _preview: PushPreview): Promise<PushResult> =>
    soon({ ok: false, kind: "refused", message: "the lab never pushes — it is a design playground." }),
  // The lab runs no main process, so the honest mock answer is the bridge's
  // not-running state — the settings card then shows its plain reason line.
  phoneBridgeState: () => soon({ running: false, reason: "The lab is a design playground — there is no computer side to pair with.", url: null, devices: [] }),
  phoneBridgePairBegin: () => soon({ ok: false, message: "The lab is a design playground — there is no computer side to pair with." }),
  phoneBridgeRevokeDevice: (_id: string) => soon({ ok: false, message: "No devices are paired in the lab." }),
};

/** Installs the mock bridge and the lab's scenario switch. Call BEFORE the
 * real renderer module loads, so `api.ts` binds this object. */
export function installMockCairn(): void {
  window.cairn = mock;
  window.__lab = { setScenario };
}
