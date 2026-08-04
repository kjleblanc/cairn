import {
  authorizeCodexExec,
  authorizeKimiExec,
  codexExecConnectionReason,
  createCodexExecAdapter,
  createKimiExecAdapter,
  createOfflineDemoAdapter,
  detectCodexExecStatus,
  detectKimiExecStatus,
  kimiExecConnectionReason,
  type CodexExecStatus,
  type CodexStatusProbe,
  type KimiDetectionProbes,
  type KimiExecStatus,
  type TaskAdapter,
  type TaskIntent,
} from "@cairn/core";
import { existsSync, writeFileSync } from "node:fs";

/**
 * Every connected real adapter, one detection pass — extracted from tasks.ts
 * (Level 3a plan Task 4) so the unit lane can cover the wiring: this module
 * imports only `@cairn/core`, never electron. `tasks.ts` keeps the IPC
 * handlers and the run-time disclosure gate; detection and the
 * connection-required prose live here.
 */

export interface DetectedAdapterStatus {
  codex?: CodexExecStatus;
  kimi?: KimiExecStatus;
}

export interface DetectedAdapters {
  adapters: TaskAdapter[];
  status?: DetectedAdapterStatus;
}

/** Injectable detection seams so no unit test ever spawns a process — and so
 * no test can reach the real signed-in CLIs on this machine. */
export interface DetectionProbes {
  codex?: CodexStatusProbe;
  kimi?: KimiDetectionProbes;
}

/** Deterministic E2E seam for route-generation races. It is unreachable in a
 * normal app process and carries no provider or credential data: the test lane
 * releases detection by creating one named temp file. */
async function waitForTestDetectionBarrier(): Promise<void> {
  const release = process.env.CAIRN_TEST_ADAPTER_DETECTION_RELEASE;
  if (process.env.CAIRN_TEST_LANE !== "1" || !release) return;
  try {
    writeFileSync(`${release}.waiting`, "waiting\n", { encoding: "utf8", flag: "wx" });
  } catch {
    // Another detection in this test lane already announced the same barrier.
  }
  const deadline = Date.now() + 10_000;
  while (!existsSync(release)) {
    if (Date.now() >= deadline) throw new Error("TEST_ADAPTER_DETECTION_BARRIER_TIMEOUT");
    await new Promise<void>((resolve) => { setTimeout(resolve, 10); });
  }
}

/**
 * `authorized` names the WHOLE request the owner confirmed — outcome and
 * immutable intent. Each adapter's authorization gate re-derives its expected
 * card and canonical request hash from that intent (Kimi also uses its
 * observed billing).
 *
 * Each adapter is constructed only when its own detection says connected;
 * disconnected adapters would be filtered by `routeTask` anyway, and the
 * mock lane stays exactly the demo adapter with no status, as today.
 */
export async function detectedAdapters(
  mock: boolean,
  dir: string,
  authorized?: TaskIntent,
  probes?: DetectionProbes,
): Promise<DetectedAdapters> {
  await waitForTestDetectionBarrier();
  if (mock) return { adapters: [createOfflineDemoAdapter()] };
  const codex = await detectCodexExecStatus(dir, probes?.codex);
  const kimi = await detectKimiExecStatus(dir, probes?.kimi);
  const adapters: TaskAdapter[] = [];
  if (codex.installed && codex.connected) {
    adapters.push(createCodexExecAdapter(dir, codex, authorized ? authorizeCodexExec(dir, authorized) : undefined));
  }
  if (kimi.installed && kimi.connected) {
    adapters.push(createKimiExecAdapter(dir, kimi, authorized ? authorizeKimiExec(dir, kimi.billing, authorized) : undefined));
  }
  return { adapters, status: { codex, kimi } };
}

/**
 * The connection-required prose for a route with no connected candidate. The
 * byte-identical pin: a machine that has codex but no Kimi CLI reads exactly
 * today's codex-only wording. Every other case names what was actually probed
 * — the kimi prose alone when codex is the absent one, and both CLIs when
 * both were probed and neither can run.
 */
export function connectionRequiredReason(status: DetectedAdapterStatus): string {
  const codex = status.codex ?? { installed: false, connected: false };
  if (codex.installed && !status.kimi?.installed) return codexExecConnectionReason(codex);
  const kimi = status.kimi ?? { installed: false, connected: false, billing: "unknown" as const };
  if (!codex.installed && kimi.installed) return kimiExecConnectionReason(kimi);
  return `${codexExecConnectionReason(codex)} ${kimiExecConnectionReason(kimi)}`;
}
