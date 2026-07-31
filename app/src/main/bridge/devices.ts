import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

/**
 * Task 143: the paired-device list — the bridge's whole authority model.
 *
 * A phone pairs once (a short-lived code, see server.ts) and receives a
 * durable bearer token. What is STORED here is only the token's SHA-256
 * hash: the raw token crosses exactly once, in the pairing response's
 * cookie, and is never written to disk and never logged. A stolen
 * devices.json yields hashes, not tokens — the same discipline the
 * keystore's encrypted-at-rest connection follows, achievable here without
 * Electron so the unit suite can pin it.
 *
 * The file lives in the app's per-user profile folder beside
 * conductor.json and projects.json. Like them it is plain JSON, rewritten
 * whole on change; the list is the owner's own phone (v1 policy), so
 * whole-file writes are the right size of machinery.
 */

export interface PairedDevice {
  /** Short random id, safe to show and to log (unlike the token). */
  id: string;
  name: string;
  /** SHA-256 hex of the bearer token. The raw token is never stored. */
  tokenHash: string;
  firstPaired: string;
  lastSeen: string;
}

/** The view the desktop UI and the IPC layer may see: no tokenHash. */
export interface DeviceInfo {
  id: string;
  name: string;
  firstPaired: string;
  lastSeen: string;
}

export interface DeviceStore {
  list(): DeviceInfo[];
  /** Mints the token, stores only its hash. The raw token is returned once
   * — for the pairing response's cookie — and exists nowhere else. */
  add(name: string, now?: string): { device: DeviceInfo; token: string };
  /** The one question every bridge request asks. Answers only yes (the
   * device) or no (null) — unknown and revoked are the same answer. */
  authenticate(token: string, now?: string): DeviceInfo | null;
  revoke(id: string): boolean;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

const MAX_NAME_LENGTH = 60;
/** lastSeen writes throttle to one per minute per device: a streaming phone
 * would otherwise rewrite the file on every poll. */
const LAST_SEEN_WRITE_INTERVAL_MS = 60_000;

export function createDeviceStore(filePath: string): DeviceStore {
  function read(): PairedDevice[] {
    try {
      if (!existsSync(filePath)) return [];
      const data = JSON.parse(readFileSync(filePath, "utf8")) as { devices?: unknown };
      if (!Array.isArray(data.devices)) return [];
      return data.devices.filter((d): d is PairedDevice =>
        typeof (d as PairedDevice | null)?.id === "string"
        && typeof (d as PairedDevice).name === "string"
        && typeof (d as PairedDevice).tokenHash === "string"
        && typeof (d as PairedDevice).firstPaired === "string"
        && typeof (d as PairedDevice).lastSeen === "string");
    } catch {
      // A corrupt or unreadable file reads as "no devices" — fail closed:
      // every token then authenticates as unknown and gets the one refusal.
      return [];
    }
  }

  function write(devices: PairedDevice[]): void {
    writeFileSync(filePath, JSON.stringify({ devices }, null, 2), "utf8");
  }

  function info(d: PairedDevice): DeviceInfo {
    return { id: d.id, name: d.name, firstPaired: d.firstPaired, lastSeen: d.lastSeen };
  }

  return {
    list(): DeviceInfo[] {
      return read().map(info);
    },

    add(name: string, now?: string): { device: DeviceInfo; token: string } {
      const ts = now ?? new Date().toISOString();
      const token = randomBytes(32).toString("base64url");
      const device: PairedDevice = {
        id: randomBytes(6).toString("hex"),
        name: name.trim().slice(0, MAX_NAME_LENGTH) || "Phone",
        tokenHash: hashToken(token),
        firstPaired: ts,
        lastSeen: ts,
      };
      write([...read(), device]);
      return { device: info(device), token };
    },

    authenticate(token: string, now?: string): DeviceInfo | null {
      if (typeof token !== "string" || token.length === 0 || token.length > 256) return null;
      const presented = Buffer.from(hashToken(token), "utf8");
      const devices = read();
      const found = devices.find((d) => {
        const stored = Buffer.from(d.tokenHash, "utf8");
        return stored.length === presented.length && timingSafeEqual(stored, presented);
      });
      if (!found) return null;
      const ts = now ?? new Date().toISOString();
      if (Date.parse(ts) - Date.parse(found.lastSeen) > LAST_SEEN_WRITE_INTERVAL_MS) {
        found.lastSeen = ts;
        write(devices);
      }
      return info(found);
    },

    revoke(id: string): boolean {
      const devices = read();
      const rest = devices.filter((d) => d.id !== id);
      if (rest.length === devices.length) return false;
      write(rest);
      return true;
    },
  };
}
