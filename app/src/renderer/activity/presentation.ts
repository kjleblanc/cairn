import type { ConductorStreamSnapshot, RunSessionSnapshot } from "../../shared/ipc.js";

/**
 * The single truthful projection of one runtime snapshot: what is happening,
 * to whom, and how it ended. Task 257 (Slice 2 of the resident-program visual
 * overhaul) moved this out of `renderer/town/presentation.ts` unchanged, so
 * that Cairn and the written status can be driven without a Town, a pond, or
 * any worker scenery.
 *
 * Nothing here knows about geometry, layout, faces, components or CSS. Its one
 * import is the runtime snapshot contract it projects.
 *
 * Task 259 (Slice 4) removed the last of the Pond's vocabulary from this file.
 * What remains that still speaks in the old world's words is `activityStatus`,
 * whose "Town is quiet." is read by `TownSquare` alone — a component the
 * running app no longer mounts and Slice 10 deletes. The desk's own words come
 * from `activity/presence.ts` instead, so nothing an owner can see says
 * "Town", and no sentence here is written twice.
 */

/** What is actually happening. No motion, no scenery, no position. */
export type ActivityTruth = "quiet" | "thinking" | "starting" | "working" | "checking" | "done" | "stopped" | "error";
export type ActivityTerminalOutcome = "done" | "stopped" | "error";
export type ActivityEventKind = "dispatch" | "return" | ActivityTerminalOutcome;

/**
 * One thing that happened, once. `key` is its identity: activities are
 * identified by their index inside a stable run key, so polling and React
 * Strict Mode cannot replay an event.
 */
export type ActivityEvent = {
  kind: ActivityEventKind;
  key: string;
  workerId: string | null;
  adapterId: string | null;
};

/**
 * Motion staging for a surface that chooses to animate an event. Truth is
 * never decided from it — every guard below reads kinds and outcomes, never a
 * phase — so a surface with no motion can ignore this half entirely.
 */
export type ActivityCuePhase = "flight" | "landing";
export type ActivityCue = ActivityEvent & { phase: ActivityCuePhase };

export type ActivityPresentation = {
  runKey: string | null;
  nextActivityIndex: number;
  truth: ActivityTruth;
  activeCue: ActivityCue | null;
  queuedCues: ActivityCue[];
  settledOutcome: ActivityTerminalOutcome | null;
  workerId: string | null;
  workerName: string | null;
  adapterId: string | null;
  outcome: string | null;
};

function adapterName(adapterId: string): string {
  if (adapterId === "codex-exec") return "Codex Exec worker";
  return `${adapterId.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())} worker`;
}

/**
 * ASCII unit separator (31). It cannot appear in a directory path, an ISO
 * timestamp, an adapter id, a conversation id or a task title, so no run key
 * can be forged by concatenating two fields.
 *
 * Built from its code point rather than written inline. The old module spelled
 * it as a unit-separator escape inside a string literal, and more than one
 * tool in this repository's editing path silently turns that escape into the
 * raw control byte, which then sits invisible in the source and survives every
 * review. This form cannot be mangled that way and reads the same to a person.
 */
const RUN_KEY_SEPARATOR = String.fromCharCode(31);

export function activityRunKey(task: RunSessionSnapshot | null): string | null {
  if (!task) return null;
  return [task.dir, task.startedAt, task.adapterId ?? "none", task.conversationId ?? "none", task.outcome].join(RUN_KEY_SEPARATOR);
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

function terminalOutcome(task: RunSessionSnapshot | null): ActivityTerminalOutcome | null {
  if (!task) return null;
  if (task.error) return "error";
  if (task.phase === "closed" && task.result?.status === "connection-required") return null;
  if (stoppedByRuntime(task)) return "stopped";
  const result = latestResultState(task);
  // The offline demonstration has no worker handoff and does not present
  // itself as if a model-backed worker completed product work. An honest
  // stopped demo can still use the stopped state.
  if (result === "done" && !realWorker(task)) return null;
  return result;
}

function truthFromRuntime(task: RunSessionSnapshot | null, stream: ConductorStreamSnapshot | null): ActivityTruth {
  if (!task) return stream ? "thinking" : "quiet";
  // A retained result remains the semantic backdrop, but a real live Cairn
  // turn owns Cairn's face and spoken status while that turn is active.
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

function metadata(task: RunSessionSnapshot | null): Pick<ActivityPresentation, "workerId" | "workerName" | "adapterId" | "outcome"> {
  const adapterId = realWorker(task) ? task!.adapterId : null;
  return {
    workerId: adapterId ? `worker:${adapterId}` : null,
    workerName: adapterId ? adapterName(adapterId) : null,
    adapterId,
    outcome: task?.outcome ?? null,
  };
}

export function hydrateActivityPresentation(
  task: RunSessionSnapshot | null,
  stream: ConductorStreamSnapshot | null,
): ActivityPresentation {
  return {
    runKey: activityRunKey(task),
    nextActivityIndex: task?.activities.length ?? 0,
    truth: truthFromRuntime(task, stream),
    activeCue: null,
    queuedCues: [],
    settledOutcome: terminalOutcome(task),
    ...metadata(task),
  };
}

function cueFor(
  kind: ActivityEventKind,
  key: string,
  task: RunSessionSnapshot,
): ActivityCue {
  const adapterId = realWorker(task) ? task.adapterId : null;
  return {
    kind,
    phase: kind === "dispatch" || kind === "return" ? "flight" : "landing",
    key,
    workerId: adapterId ? `worker:${adapterId}` : null,
    adapterId,
  };
}

function activateFirst(state: ActivityPresentation): ActivityPresentation {
  if (state.activeCue || state.queuedCues.length === 0) return state;
  const [activeCue, ...queuedCues] = state.queuedCues;
  const settledOutcome = activeCue && (activeCue.kind === "done" || activeCue.kind === "stopped" || activeCue.kind === "error")
    ? activeCue.kind
    : state.settledOutcome;
  return { ...state, activeCue: activeCue ?? null, queuedCues, settledOutcome };
}

function finalOutcomeIn(state: ActivityPresentation): ActivityTerminalOutcome | null {
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
 * an event. `animate=false` consumes the same truth directly into its stable
 * state; it is used while the animating surface is off-screen and for reduced
 * motion.
 */
export function observeActivityPresentation(
  previous: ActivityPresentation,
  task: RunSessionSnapshot | null,
  stream: ConductorStreamSnapshot | null,
  animate: boolean,
): ActivityPresentation {
  if (!task) return hydrateActivityPresentation(null, stream);
  const runKey = activityRunKey(task)!;

  if (previous.runKey === runKey) {
    // Overlapping event-driven and two-second refreshes can resolve out of
    // order. An older prefix or terminal-less snapshot must never erase newer
    // truth. Look at retained/queued terminal evidence rather than `truth`:
    // live conductor commentary intentionally presents a terminal run as
    // `thinking` while preserving its DONE/STOPPED/ERROR outcome.
    //
    // Returning `previous` ITSELF is load-bearing. `Workspace` accepts task,
    // stream and presentation as one unit only when the reducer returns a new
    // object, so an equal-but-fresh copy here would let a stale snapshot
    // repopulate a worker while the outcome correctly stayed terminal.
    if (task.activities.length < previous.nextActivityIndex) return previous;
    const previousOutcome = finalOutcomeIn(previous);
    const incomingOutcome = terminalOutcome(task);
    // ERROR is a monotonic escalation: a run can truthfully emit STOPPED and
    // then fail while writing or verifying its stop evidence. Never freeze on
    // the earlier, safer-looking disposition in that case. Every other
    // terminal change is a stale or contradictory snapshot and stays rejected.
    if (previousOutcome && incomingOutcome !== previousOutcome && incomingOutcome !== "error") return previous;
  }

  // Reduced motion and an off-screen surface settle accepted evidence
  // directly, but they obey the same monotonic snapshot guard above.
  if (!animate) return hydrateActivityPresentation(task, stream);

  let state: ActivityPresentation = previous.runKey === runKey
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

  const additions: ActivityCue[] = [];
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
export function advanceActivityCue(state: ActivityPresentation, key: string): ActivityPresentation {
  const cue = state.activeCue;
  if (!cue || cue.key !== key) return state;
  if ((cue.kind === "dispatch" || cue.kind === "return") && cue.phase === "flight") {
    return { ...state, activeCue: { ...cue, phase: "landing" } };
  }
  return activateFirst({ ...state, activeCue: null });
}

export function settleActivityPresentation(state: ActivityPresentation): ActivityPresentation {
  return {
    ...state,
    activeCue: null,
    queuedCues: [],
    settledOutcome: finalOutcomeIn(state),
  };
}

/**
 * The one sentence that says what is happening. State is never colour-,
 * face-, position- or motion-only, so every surface can speak from this.
 *
 * The wording is Task 257's inheritance, not its choice: Slice 2 must not
 * change a visible word. "Town is quiet." and the two handoff sentences are
 * retired with the Town itself in Slice 4/5.
 */
export function activityStatus(state: ActivityPresentation): string {
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

/*
 * `pondLineTone`, `pondLineLabel` and `PondLineTone` stood here until Task 259
 * (Slice 4) retired the surface they were named for. Their job — resolving a
 * waiting decision against what the runtime is doing, and saying so in words —
 * moved to `activity/presence.ts`, which now answers it for Cairn's face as
 * well as for the line. The rule they encoded survived them: the needs-owner
 * signal is still computed once in Chat and passed in, never recomputed.
 */
