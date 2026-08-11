/** Owns the one-running-task-per-project set and the quit-drain flag. This
 * module exists to break an import cycle: both `tasks.ts` (the run itself)
 * and `conductor/service.ts` (the send gate) need to read/write the same
 * running-set, and neither should import from the other. */

import { pendingRunRefusal } from "./pendingrun.js";
import { canonicalProjectKey } from "./conductor/turnauth.js";

const running = new Set<string>();
let quitDraining = false;

export function markRunning(dir: string): void {
  running.add(canonicalProjectKey(dir));
}

export function clearRunning(dir: string): void {
  running.delete(canonicalProjectKey(dir));
}

export function isTaskRunning(dir: string): boolean {
  return running.has(canonicalProjectKey(dir));
}

export function runningDirs(): string[] {
  return [...running];
}

/** Set once quit has been confirmed and the grace window has begun. Never
 * cleared back to false in a live process — quitting is a one-way door. */
export function beginQuitDrain(): void {
  quitDraining = true;
}

export function isQuitDraining(): boolean {
  return quitDraining;
}

/** `task:run`'s refusal decision, and its only caller's (`tasks.ts`): quitting
 * wins over serial-run-active when both are true, since a new run session
 * started this shows only to be cancelled a moment later by the grace window
 * would just add noise before the owner relaunches.
 *
 * The conductor's send gate does NOT come through here. `service.send` reads
 * `isTaskRunning` and `isQuitDraining` itself and refuses in its own words,
 * because a refusal about MESSAGING has to speak about messaging — "start the
 * next task after relaunch" is the wrong sentence for a chat composer. Both
 * gates read the same two flags from this module; only the wording differs. */
export function runRefusal(alreadyRunning: boolean, quitDraining: boolean): string | null {
  if (quitDraining) return "QUIT_IN_PROGRESS: Cairn is stopping the current task and quitting. Start the next task after relaunch.";
  if (alreadyRunning) return "SERIAL_RUN_ACTIVE: One task is already running for this project.";
  return null;
}

/** Main's read-only pending-result gate for both route preview and task start.
 * The pending-run module alone decides whether the project is blocked and
 * owns the fixed refusal bytes; this seam deliberately cannot create, alter,
 * or clear that authority. */
export function pendingTaskStartRefusal(projectRoot: string): string | null {
  return pendingRunRefusal(projectRoot);
}

/** Main-only seam for the two filesystem boundaries that will eventually
 * copy an owner-resolved verdict into task records. Both the write and its
 * commit must ask independently, so a pending result appearing between them
 * cannot be published. This is intentionally not exposed over IPC. */
export function pendingVerdictCopyRefusal(
  projectRoot: string,
  _boundary: "write" | "commit",
): string | null {
  return pendingRunRefusal(projectRoot);
}

export function _resetForTests(): void {
  running.clear();
  quitDraining = false;
}
