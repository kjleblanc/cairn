import { app, safeStorage } from "electron";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

/** The provider connection, at rest: the key is always encrypted-then-base64,
 * never held anywhere else. Only `decryptedKey` turns it back into a secret,
 * and only for the moment a service call needs it. */
export interface StoredConnection {
  baseUrl: string;
  model: string;
  keyB64: string;
}

function filePath(): string {
  return path.join(app.getPath("userData"), "conductor.json");
}

export function encryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

function isParsableUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** The saved connection, or null if never connected (or the file is unreadable
 * or malformed — a corrupt file reads the same as "not connected"). A
 * `baseUrl` that does not even parse as a URL counts as malformed too, so a
 * hand-edited or corrupted `conductor.json` never reaches `status()` (which
 * calls `new URL(conn.baseUrl)` unguarded) and turns an IPC call that must
 * never reject into one that does, hanging the home screen instead of
 * showing the connect card. */
export function readConnection(): StoredConnection | null {
  try {
    if (!existsSync(filePath())) return null;
    const data = JSON.parse(readFileSync(filePath(), "utf8")) as Partial<StoredConnection>;
    if (typeof data.baseUrl !== "string" || typeof data.model !== "string" || typeof data.keyB64 !== "string") return null;
    if (!isParsableUrl(data.baseUrl)) return null;
    return { baseUrl: data.baseUrl, model: data.model, keyB64: data.keyB64 };
  } catch {
    return null;
  }
}

function writeConnection(conn: StoredConnection): void {
  writeFileSync(filePath(), JSON.stringify(conn), "utf8");
}

/** Encrypts `apiKey` with the OS key store and persists it alongside the
 * plain-text base URL and model. Throws if the platform cannot encrypt —
 * callers must check `encryptionAvailable()` first. */
export function saveKey(baseUrl: string, model: string, apiKey: string): void {
  const keyB64 = safeStorage.encryptString(apiKey).toString("base64");
  writeConnection({ baseUrl, model, keyB64 });
}

/** Updates the model on an existing connection without touching the stored
 * key. Returns false when there is nothing to update. */
export function updateModel(model: string): boolean {
  const conn = readConnection();
  if (!conn) return false;
  writeConnection({ ...conn, model });
  return true;
}

/** Deletes the stored connection, including the encrypted key. A missing
 * file is not an error. */
export function clearConnection(): void {
  try {
    rmSync(filePath(), { force: true });
  } catch {
    // Best-effort: a locked or already-gone file must not crash disconnect.
  }
}

/** Decrypts the key held in `conn`. Never logged, never returned over IPC. */
export function decryptedKey(conn: StoredConnection): string {
  return safeStorage.decryptString(Buffer.from(conn.keyB64, "base64"));
}
