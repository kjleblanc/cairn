/**
 * Task 143: the "something the phone can see just changed" signal.
 *
 * The conductor service is a pure function surface with no event channel of
 * its own: today the IPC handlers and the envelope forward each delta to the
 * desktop window and nowhere else. The bridge needs the same visibility, so
 * those same call sites emit here too — one added line each, the service
 * layer untouched. The bridge subscribes once and pushes a fresh snapshot
 * to every connected phone (debounced there, so a fast token stream costs
 * one push per slice of time, not one per chunk).
 *
 * Electron-free so the unit suite can drive the bridge's live behavior
 * without booting the app.
 */

const listeners = new Set<() => void>();

/** Subscribe to visible-change signals. Returns the unsubscribe. */
export function onBridgeSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Emitted by the delta-forwarding and connection-changing call sites. A
 * listener's fault must never reach the app's own code path — a broken
 * bridge may go quiet, it may not break the desktop. */
export function emitBridgeSync(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      // Swallowed on purpose: see above.
    }
  }
}
