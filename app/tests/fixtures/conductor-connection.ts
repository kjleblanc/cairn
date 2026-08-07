import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Every conductor E2E test must run inside the throwaway profile installed by
 * `isolated-profile.ts`. There is deliberately no owner-profile fallback: a
 * direct or misconfigured launch fails before it can inspect, detach, or erase
 * a real Cairn credential.
 */
function testUserData(): string {
  const root = process.env.CAIRN_TEST_USER_DATA;
  if (process.env.CAIRN_E2E !== "1" || !root) {
    throw new Error("CAIRN_E2E_PROFILE_REQUIRED: conductor tests require the isolated test profile.");
  }
  return root;
}

export const MODEL_CONNECTION_FILENAMES = Object.freeze([
  "conductor.json",
  "model-catalogs.json",
  "model-connections.json",
] as const);

type ModelConnectionFilename = typeof MODEL_CONNECTION_FILENAMES[number];

function connectionFile(name: ModelConnectionFilename): string {
  return join(testUserData(), name);
}

export function conductorFile(): string {
  return connectionFile("conductor.json");
}

export function modelCatalogsFile(): string {
  return connectionFile("model-catalogs.json");
}

export function modelConnectionsFile(): string {
  return connectionFile("model-connections.json");
}

let saved: ReadonlyMap<ModelConnectionFilename, Buffer | null> | null = null;

/** Snapshot and remove all three Cairn model-connection files as one set. */
export function detachStoredConnection(): void {
  if (saved !== null) {
    throw new Error("CONDUCTOR_CONNECTION_ALREADY_DETACHED: restore the stored connection before detaching it again.");
  }
  const snapshot = new Map<ModelConnectionFilename, Buffer | null>();
  for (const name of MODEL_CONNECTION_FILENAMES) {
    const file = connectionFile(name);
    snapshot.set(name, existsSync(file) ? readFileSync(file) : null);
  }
  saved = snapshot;
  clearStoredConnectionFiles();
}

/** Remove only test-profile model connection state between scenarios. */
export function clearStoredConnectionFiles(): void {
  for (const name of MODEL_CONNECTION_FILENAMES) {
    rmSync(connectionFile(name), { force: true });
  }
}

/** Restore exactly the three-file snapshot, including prior absence. */
export function restoreStoredConnection(): void {
  if (saved === null) return;
  const snapshot = saved;
  saved = null;
  for (const name of MODEL_CONNECTION_FILENAMES) {
    const file = connectionFile(name);
    const contents = snapshot.get(name) ?? null;
    if (contents === null) {
      rmSync(file, { force: true });
    } else {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, contents);
    }
  }
}
