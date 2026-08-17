import type { ActivityPresentation } from "./presentation.js";
import type { CairnProgramState } from "../components/CairnProgram.js";

/**
 * Cairn's presence: ONE resolved answer to "what is happening right now".
 *
 * Task 259 (Slice 4 of the resident-program visual overhaul). The written
 * status, the secondary detail, the ground tone and Cairn's expression are all
 * read off the same field of the same object. That is the whole point of this
 * module.
 *
 * The reason is not aesthetic. Task 155's needs-you signal was computed once in
 * Chat and PASSED to the narrow-width status line rather than recomputed there,
 * because two independent answers to "is something waiting?" would eventually
 * disagree — and the line would be the one that lied. That surface is retired.
 * The reason survived it, and now covers the face as well as the words.
 *
 * Nothing here knows about geometry, layout, CSS or React. Its two imports are
 * the neutral runtime projection it reads and the set of faces it may ask for.
 * It is pure and total: same argument, same answer, no clock, no globals.
 *
 * WORDS ARE THE TRUTH. The expression reinforces; it never carries a state the
 * status does not spell out, and every state is separated from every other by
 * its words alone. Cover Cairn entirely and the product still reads.
 */

/**
 * The resolved value. This is `CairnProgramState` plus `starting`, because the
 * constitution's own table makes "Starting / working" ONE row of character
 * direction while still asking for two different sentences. Keeping the extra
 * member here — rather than collapsing early — is what lets the status and the
 * expression both derive from a single resolution instead of two.
 */
export type CairnPresenceState =
  | "ready"
  | "thinking"
  | "needs-decision"
  | "starting"
  | "working"
  | "checking"
  | "done"
  | "stopped"
  | "error"
  | "disconnected";

/** The ground a state sits on. Never the only thing separating two states. */
export type CairnPresenceTone = "quiet" | "busy" | "attention" | "done" | "stopped";

export const CAIRN_PRESENCE_STATES: readonly CairnPresenceState[] = [
  "ready", "thinking", "needs-decision", "starting", "working",
  "checking", "done", "stopped", "error", "disconnected",
];

export type CairnPresence = {
  /** The one resolved value. Everything below follows from it. */
  readonly state: CairnPresenceState;
  /** The announced truth. Sole carrier of the state. */
  readonly status: string;
  /** Secondary. Compact drops it, so it never holds a state on its own. */
  readonly detail: string | null;
  readonly tone: CairnPresenceTone;
  /** Which face to draw. Reinforcement, never a second status source. */
  readonly expression: CairnProgramState;
};

export type CairnPresenceInput = {
  /** The neutral runtime projection: what the serial runtime is doing. */
  readonly activity: ActivityPresentation;
  /** Chat's seam: a proposal, a dispatch, or a push is waiting on the owner. */
  readonly needsOwner: boolean;
  /** Whether the conductor is connected at all. */
  readonly connected: boolean;
};

/**
 * The precedence, highest first. Each rank sits where it does for a reason:
 *
 *  1. `needsOwner` — a waiting decision is the one state the owner must act on,
 *     and nothing may bury it. The approved Decision 9 rule, kept whole.
 *  2. the runtime's own truth — error, stopped, done, thinking, checking,
 *     working, starting. These never collide with each other: the projection
 *     already resolves them into a single value, including the case where a
 *     live reply speaks over a retained terminal outcome.
 *  3. `!connected` — BELOW every real run state. A reattached run and a saved
 *     result are true whether or not the conductor is connected, and the
 *     header carries the connection permanently anyway.
 *  4. a quiet desk — ready.
 */
function resolveState(input: CairnPresenceInput): CairnPresenceState {
  if (input.needsOwner) return "needs-decision";
  const truth = input.activity.truth;
  if (truth !== "quiet") return truth === "thinking" ? "thinking" : truth;
  return input.connected ? "ready" : "disconnected";
}

/**
 * Caps are reserved for the run's own disposition words. `DONE`, `STOPPED` and
 * `ERROR` mean exactly what the result card means by them, and that literal
 * meaning is product truth, not styling. Everything else speaks plainly.
 */
const STATUS: Record<CairnPresenceState, string> = {
  ready: "Ready",
  thinking: "Cairn is replying",
  "needs-decision": "Needs your decision",
  starting: "Starting the task",
  working: "Working",
  checking: "Checking",
  done: "DONE — verified by Cairn",
  stopped: "STOPPED",
  error: "ERROR",
  disconnected: "Not connected",
};

const TONE: Record<CairnPresenceState, CairnPresenceTone> = {
  ready: "quiet",
  thinking: "busy",
  "needs-decision": "attention",
  starting: "busy",
  working: "busy",
  checking: "busy",
  done: "done",
  stopped: "stopped",
  error: "stopped",
  disconnected: "quiet",
};

/**
 * `starting` and `working` deliberately share a face: the constitution gives
 * them one row of character direction, and their words already separate them.
 * Every other face is reachable from exactly one state.
 */
const EXPRESSION: Record<CairnPresenceState, CairnProgramState> = {
  ready: "ready",
  thinking: "thinking",
  "needs-decision": "needs-decision",
  starting: "working",
  working: "working",
  checking: "checking",
  done: "done",
  stopped: "stopped",
  error: "error",
  disconnected: "disconnected",
};

/**
 * The second line, where one helps. It carries a NAME or a next choice — never
 * a second opinion about the state, because compact drops it entirely.
 *
 * A worker is named only where the runtime says a real one exists. The offline
 * demonstration has no worker handoff, so nothing invents one for it.
 */
function detailFor(state: CairnPresenceState, workerName: string | null): string | null {
  switch (state) {
    case "needs-decision":
      return "Something in the conversation is waiting for you.";
    case "starting":
      return workerName ? "Cairn is confirming the dispatch." : "Cairn is preparing the task.";
    case "working":
      return workerName ? `${workerName} is working.` : "Cairn is running the offline check.";
    case "checking":
      return "Cairn is checking the result.";
    case "done":
      return workerName ? `${workerName} returned, and Cairn verified it.` : null;
    case "stopped":
      return "The result card carries the reason and the next choice.";
    case "error":
      return "The result card carries what it affected and how to recover.";
    case "disconnected":
      return "Connect Cairn to start talking.";
    default:
      return null;
  }
}

export function resolveCairnPresence(input: CairnPresenceInput): CairnPresence {
  const state = resolveState(input);
  return {
    state,
    status: STATUS[state],
    detail: detailFor(state, input.activity.workerName),
    tone: TONE[state],
    expression: EXPRESSION[state],
  };
}
