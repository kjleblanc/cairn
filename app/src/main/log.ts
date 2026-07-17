import { app } from "electron";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

/** Raw errors go here, never to the screen. The UI shows plain words only. */
export function logError(context: string, err: unknown): void {
  try {
    const dir = path.join(app.getPath("userData"), "logs");
    mkdirSync(dir, { recursive: true });
    const line = `${new Date().toISOString()} [${context}] ${err instanceof Error ? err.stack || err.message : String(err)}\n`;
    appendFileSync(path.join(dir, "cairn.log"), line);
  } catch {
    // Logging must never take the app down.
  }
}

export function plainMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
