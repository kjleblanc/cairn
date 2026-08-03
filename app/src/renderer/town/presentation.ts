import type { ConductorStreamSnapshot, RunSessionSnapshot } from "../../shared/ipc.js";

export type TownTruth = "quiet" | "thinking" | "starting" | "working" | "checking" | "done" | "stopped" | "error";
export type TownTerminalOutcome = "done" | "stopped" | "error";
export type TownCueKind = "dispatch" | "return" | TownTerminalOutcome;
export type TownCuePhase = "flight" | "landing";

export type TownCue = {
  kind: TownCueKind;
  phase: TownCuePhase;
  key: string;
  workerId: string | null;
  adapterId: string | null;
};

export type TownRuntimePresentation = {
  runKey: string | null;
  nextActivityIndex: number;
  truth: TownTruth;
  activeCue: TownCue | null;
  queuedCues: TownCue[];
  settledOutcome: TownTerminalOutcome | null;
  workerId: string | null;
  workerName: string | null;
  adapterId: string | null;
  outcome: string | null;
};

function adapterName(adapterId: string): string {
  if (adapterId === "codex-exec") return "Codex Exec worker";
  return `${adapterId.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())} worker`;
}

export function townRunKey(task: RunSessionSnapshot | null): string | null {
  if (!task) return null;
  return [task.dir, task.startedAt, task.adapterId ?? "none", task.conversationId ?? "none", task.outcome].join("\u001f");
}

function realWorker(task: RunSessionSnapshot | null): boolean {
  return Boolean(task?.worker && task.adapterId);
}

function latestResultState(task: RunSessionSnapshot): "done" | "stopped" | null {
  for (let index = task.activities.length - 1; index >= 0; index -= 1) {
    const activity = task.activities[index];
    if (activity?.stage === "Result" && (activity.state === "done" || activity.state === "stopped")) return activity.state;
  }
  if (task.result?.status === "done") return "done";
  if (task.result?.status === "stopped") return "stopped";
  return null;
}

function stoppedByRuntime(task: RunSessionSnapshot): boolean {
  return task.activities.some((activity) =>
    activity.state === "stopped" && (activity.stage === "Run" || activity.stage === "Check" || activity.stage === "Result"));
}

function terminalOutcome(task: RunSessionSnapshot | null): TownTerminalOutcome | null {
  if (!task) return null;
  if (task.error) return "error";
  if (task.phase === "closed" && task.result?.status === "connection-required") return null;
  if (stoppedByRuntime(task)) return "stopped";
  const result = latestResultState(task);
  // The offline demonstration has no worker handoff and does not color the
  // pond as if a model-backed worker completed product work. An honest stopped
  // demo can still use the coral stop state.
  if (result === "done" && !realWorker(task)) return null;
  return result;
}

function truthFromRuntime(task: RunSessionSnapshot | null, stream: ConductorStreamSnapshot | null): TownTruth {
  if (!task) return stream ? "thinking" : "quiet";
  // A retained result remains the pond's semantic backdrop, but a real live
  // Cairn turn owns Cairn's face and spoken status while that turn is active.
  if (task.phase === "closed" && stream) return "thinking";
  if (task.error) return "error";
  if (task.phase === "closed" && task.result?.status === "connection-required") return stream ? "thinking" : "quiet";

  if (stoppedByRuntime(task)) return "stopped";
  const terminal = latestResultState(task);
  if (terminal === "done") return realWorker(task) ? "done" : stream ? "thinking" : "quiet";
  if (terminal === "stopped") return "stopped";

  if (task.activities.some((activity) => activity.stage === "Check")) return "checking";
  if (task.activities.some((activity) => activity.stage === "Run" && activity.state === "done")) return "checking";
  if (task.activities.some((activity) => activity.stage === "Run" && activity.state === "working")) return "working";
  return "starting";
}

function metadata(task: RunSessionSnapshot | null): Pick<TownRuntimePresentation, "workerId" | "workerName" | "adapterId" | "outcome"> {
  const adapterId = realWorker(task) ? task!.adapterId : null;
  return {
    workerId: adapterId ? `worker:${adapterId}` : null,
    workerName: adapterId ? adapterName(adapterId) : null,
    adapterId,
    outcome: task?.outcome ?? null,
  };
}

export function hydrateTownPresentation(
  task: RunSessionSnapshot | null,
  stream: ConductorStreamSnapshot | null,
): TownRuntimePresentation {
  return {
    runKey: townRunKey(task),
    nextActivityIndex: task?.activities.length ?? 0,
    truth: truthFromRuntime(task, stream),
    activeCue: null,
    queuedCues: [],
    settledOutcome: terminalOutcome(task),
    ...metadata(task),
  };
}

function cueFor(
  kind: TownCueKind,
  key: string,
  task: RunSessionSnapshot,
): TownCue {
  const adapterId = realWorker(task) ? task.adapterId : null;
  return {
    kind,
    phase: kind === "dispatch" || kind === "return" ? "flight" : "landing",
    key,
    workerId: adapterId ? `worker:${adapterId}` : null,
    adapterId,
  };
}

function activateFirst(state: TownRuntimePresentation): TownRuntimePresentation {
  if (state.activeCue || state.queuedCues.length === 0) return state;
  const [activeCue, ...queuedCues] = state.queuedCues;
  const settledOutcome = activeCue && (activeCue.kind === "done" || activeCue.kind === "stopped" || activeCue.kind === "error")
    ? activeCue.kind
    : state.settledOutcome;
  return { ...state, activeCue: activeCue ?? null, queuedCues, settledOutcome };
}

function finalOutcomeIn(state: TownRuntimePresentation): TownTerminalOutcome | null {
  const cues = [state.activeCue, ...state.queuedCues];
  for (let index = cues.length - 1; index >= 0; index -= 1) {
    const kind = cues[index]?.kind;
    if (kind === "done" || kind === "stopped" || kind === "error") return kind;
  }
  return state.settledOutcome;
}

/**
 * Observe one append-only runtime snapshot. Activities are identified by their
 * index inside a stable run key, so polling and React Strict Mode cannot replay
 * a cue. `animate=false` consumes the same truth directly into its stable
 * state; it is used while the Town is off-screen and for reduced motion.
 */
export function observeTownPresentation(
  previous: TownRuntimePresentation,
  task: RunSessionSnapshot | null,
  stream: ConductorStreamSnapshot | null,
  animate: boolean,
): TownRuntimePresentation {
  if (!task) return hydrateTownPresentation(null, stream);
  const runKey = townRunKey(task)!;

  if (previous.runKey === runKey) {
    // Overlapping event-driven and two-second refreshes can resolve out of
    // order. An older prefix or terminal-less snapshot must never erase newer
    // truth. Look at retained/queued terminal evidence rather than `truth`:
    // live conductor commentary intentionally presents a terminal run as
    // `thinking` while preserving its DONE/STOPPED/ERROR pond outcome.
    if (task.activities.length < previous.nextActivityIndex) return previous;
    const previousOutcome = finalOutcomeIn(previous);
    const incomingOutcome = terminalOutcome(task);
    // ERROR is a monotonic escalation: a run can truthfully emit STOPPED and
    // then fail while writing or verifying its stop evidence. Never freeze the
    // Town on the earlier, safer-looking disposition in that case. Every other
    // terminal change is a stale or contradictory snapshot and stays rejected.
    if (previousOutcome && incomingOutcome !== previousOutcome && incomingOutcome !== "error") return previous;
  }

  // Reduced motion and an off-screen Town settle accepted evidence directly,
  // but they obey the same monotonic snapshot guard above.
  if (!animate) return hydrateTownPresentation(task, stream);

  let state: TownRuntimePresentation = previous.runKey === runKey
    ? {
      ...previous,
      truth: truthFromRuntime(task, stream),
      ...metadata(task),
    }
    : {
      runKey,
      nextActivityIndex: 0,
      truth: truthFromRuntime(task, stream),
      activeCue: null,
      queuedCues: [],
      settledOutcome: null,
      ...metadata(task),
    };

  const additions: TownCue[] = [];
  const isReal = realWorker(task);
  for (let index = state.nextActivityIndex; index < task.activities.length; index += 1) {
    const activity = task.activities[index];
    if (!activity || !isReal) continue;
    const dispatchedEarlier = task.activities.slice(0, index).some((candidate) =>
      candidate.stage === "Run" && candidate.state === "working");
    if (activity.stage === "Run" && activity.state === "working" && !dispatchedEarlier) {
      additions.push(cueFor("dispatch", `${runKey}:${index}:dispatch`, task));
    } else if (activity.stage === "Run" && activity.state === "done") {
      additions.push(cueFor("return", `${runKey}:${index}:return`, task));
    }
  }

  // If the first renderer observation already contains a later phase, do not
  // replay an obsolete dispatch before it. The result return remains useful
  // narrative evidence; a worker handoff that is already over does not.
  if (additions.some((cue) => cue.kind === "return")) {
    for (let index = additions.length - 1; index >= 0; index -= 1) {
      if (additions[index]?.kind === "dispatch") additions.splice(index, 1);
    }
  }

  const outcome = terminalOutcome(task);
  const hasTerminalAddition = additions.some((cue) => cue.kind === "done" || cue.kind === "stopped" || cue.kind === "error");
  const alreadyHasOutcome = previous.runKey === runKey && (
    previous.settledOutcome === outcome ||
    [previous.activeCue, ...previous.queuedCues].some((cue) => cue?.kind === outcome)
  );
  if (outcome && !hasTerminalAddition && !alreadyHasOutcome) {
    additions.push(cueFor(outcome, `${runKey}:terminal:${outcome}`, task));
  }

  state = {
    ...state,
    nextActivityIndex: task.activities.length,
    queuedCues: [...state.queuedCues, ...additions],
  };
  return activateFirst(state);
}

/** Advance only the cue that owns the supplied key. Stale timers are inert. */
export function advanceTownCue(state: TownRuntimePresentation, key: string): TownRuntimePresentation {
  const cue = state.activeCue;
  if (!cue || cue.key !== key) return state;
  if ((cue.kind === "dispatch" || cue.kind === "return") && cue.phase === "flight") {
    return { ...state, activeCue: { ...cue, phase: "landing" } };
  }
  return activateFirst({ ...state, activeCue: null });
}

export function settleTownPresentation(state: TownRuntimePresentation): TownRuntimePresentation {
  return {
    ...state,
    activeCue: null,
    queuedCues: [],
    settledOutcome: finalOutcomeIn(state),
  };
}

export function townPresentationStatus(state: TownRuntimePresentation): string {
  if (state.truth === "thinking") return "Cairn is replying.";
  if (state.truth === "done") return "DONE — verified by Cairn.";
  if (state.truth === "stopped") return "STOPPED — check the result card.";
  if (state.truth === "error") return "Needs inspection — check the result card.";
  const cue = state.activeCue;
  if (cue?.kind === "dispatch") {
    return cue.phase === "flight"
      ? `Task → ${state.workerName ?? "worker"}.`
      : `Task arrived with ${state.workerName ?? "the worker"}.`;
  }
  if (cue?.kind === "return") {
    return cue.phase === "flight"
      ? "Result → Cairn."
      : "Cairn is checking the result.";
  }
  if (state.truth === "starting") return state.workerName ? "Cairn is confirming the dispatch." : "Cairn is preparing the task.";
  if (state.truth === "working") return state.workerName ? `${state.workerName} is working.` : "Cairn is running the offline check.";
  if (state.truth === "checking") return "Result returned — Cairn is checking.";
  return "Town is quiet.";
}

export type PondLineTone = "quiet" | "busy" | "needs-you" | "done" | "stopped";

/**
 * The narrow window's status line (Decision 9, resolved 2026-08-03). Below
 * 1260px the conversation takes the window and the pond becomes a sentence the
 * owner can go and look at — so this line carries who is working and what
 * state the water is in, and turns amber when a decision is waiting.
 *
 * `needsYou` is Task 155's signal, computed once in Chat and passed in. Two
 * independent answers to "is something waiting?" would eventually disagree,
 * and the line would be the one that lied.
 */
export function pondLineTone(state: TownRuntimePresentation, needsYou: boolean): PondLineTone {
  if (needsYou) return "needs-you";
  if (state.truth === "done") return "done";
  if (state.truth === "stopped" || state.truth === "error") return "stopped";
  if (state.truth === "quiet") return "quiet";
  return "busy";
}

/** The line's words. Never a second notion of what the water is doing. */
export function pondLineLabel(state: TownRuntimePresentation, needsYou: boolean): string {
  if (needsYou) return "Something in the conversation is waiting for you.";
  return townPresentationStatus(state);
}
