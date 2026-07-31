import { app } from "electron";
import os from "node:os";
import path from "node:path";
import { projectStatus } from "@cairn/core";
import type { PairingOffer, PhoneBridgeState, Result } from "../../shared/ipc.js";
import * as conductorService from "../conductor/service.js";
import { logError } from "../log.js";
import { recentEntries } from "../registry.js";
import { createDeviceStore, type DeviceStore } from "./devices.js";
import { PHONE_PAGE } from "./phonepage.js";
import { BRIDGE_DEFAULT_PORT, startBridge, type Bridge } from "./server.js";

/**
 * Task 143: the Electron half of the phone bridge — the part that knows
 * about the app. Everything testable lives in the Electron-free modules
 * (server.ts, devices.ts, hub.ts, phonepage.ts); this file only wires real
 * dependencies into them and owns the start/stop lifecycle:
 *
 * - started from main.ts once the app is ready, stopped on will-quit;
 * - bound to the machine's one private-range LAN address, or not at all —
 *   a machine with no home-network address gets no listener (fail closed),
 *   and the settings surface says so honestly;
 * - the device list lives in the profile beside conductor.json.
 *
 * It also never logs a device token or a pairing code: the only strings
 * that reach the log are the fixed refusal reasons below.
 */

let bridge: Bridge | null = null;
let devices: DeviceStore | null = null;
let notRunningReason: string | null = null;

/** The machine's private-range IPv4 LAN address — 10/8, 172.16/12, or
 * 192.168/16 — or null when there isn't one. Binding anything wider (or a
 * publicly routable address) would put the bridge somewhere the v1 design
 * never agreed to expose it, so null here means no bridge. */
export function lanAddress(): string | null {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const iface of list ?? []) {
      if (iface.family !== "IPv4" || iface.internal) continue;
      const a = iface.address;
      const secondOctet = Number(a.split(".")[1]);
      if (a.startsWith("10.") || a.startsWith("192.168.") || (a.startsWith("172.") && secondOctet >= 16 && secondOctet <= 31)) {
        return a;
      }
    }
  }
  return null;
}

/** "The current conversation" belongs to a project; the phone follows the
 * project the desktop most recently opened — the registry's front entry. */
function currentProject(): { dir: string; name: string } | null {
  const first = recentEntries()[0];
  if (!first) return null;
  try {
    return { dir: first.dir, name: projectStatus(first.dir).facts.name };
  } catch {
    return { dir: first.dir, name: path.basename(first.dir) };
  }
}

export async function startPhoneBridge(): Promise<void> {
  devices = createDeviceStore(path.join(app.getPath("userData"), "devices.json"));
  const host = lanAddress();
  if (host === null) {
    notRunningReason = "No home-network address was found on this computer, so the phone bridge didn't start.";
    return;
  }
  try {
    bridge = await startBridge({
      host,
      port: BRIDGE_DEFAULT_PORT,
      devices,
      service: conductorService,
      currentProject,
      page: PHONE_PAGE,
      log: logError,
    });
  } catch (err) {
    logError("bridge:start", err);
    notRunningReason = `The phone bridge couldn't start — its ports (${BRIDGE_DEFAULT_PORT} upward) are already in use.`;
    bridge = null;
  }
}

export async function stopPhoneBridge(): Promise<void> {
  const live = bridge;
  bridge = null;
  if (live) await live.close();
}

export function phoneBridgeState(): PhoneBridgeState {
  return {
    running: bridge !== null,
    reason: bridge === null ? notRunningReason : null,
    url: bridge?.url ?? null,
    devices: devices?.list() ?? [],
  };
}

export function phoneBridgePairBegin(): Result<PairingOffer> {
  if (bridge === null) {
    return { ok: false, message: notRunningReason ?? "The phone bridge isn't running." };
  }
  const offer = bridge.beginPairing();
  return { ok: true, value: { code: offer.code, url: bridge.url, expiresAt: offer.expiresAt } };
}

export function phoneBridgeRevokeDevice(id: string): Result<null> {
  // Revocation goes through the STORE, not only the live listener: taking
  // access away must work even while the bridge itself is down. When the
  // bridge IS up its own path also cuts the device's live streams.
  if (bridge !== null) {
    if (!bridge.revokeDevice(id)) return { ok: false, message: "That device isn't paired." };
    return { ok: true, value: null };
  }
  if (devices === null || !devices.revoke(id)) {
    return { ok: false, message: "That device isn't paired." };
  }
  return { ok: true, value: null };
}
