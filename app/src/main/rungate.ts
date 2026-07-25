/** Owns the one-running-task-per-project set and the quit-drain flag. This
 * module exists to break an import cycle: both `tasks.ts` (the run itself)
 * and `conductor/service.ts` (the send gate) need to read/write the same
 * running-set, and neither should import from the other. */

const running = new Set<string>();
let quitDraining = false;

export function markRunning(dir: string): void {
  running.add(dir);
}

export function clearRunning(dir: string): void {
  running.delete(dir);
}

export function isTaskRunning(dir: string): boolean {
  return running.has(dir);
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

/** The one refusal decision `task:run` and the conductor's send gate both
 * need: quitting wins over serial-run-active when both are true, since a
 * new run session started this shows only to be cancelled a moment later
 * by the grace window would just add noise before the owner relaunches. */
export function runRefusal(alreadyRunning: boolean, quitDraining: boolean): string | null {
  if (quitDraining) return "QUIT_IN_PROGRESS: Cairn is stopping the current task and quitting. Start the next task after relaunch.";
  if (alreadyRunning) return "SERIAL_RUN_ACTIVE: One task is already running for this project.";
  return null;
}

export function _resetForTests(): void {
  running.clear();
  quitDraining = false;
}
