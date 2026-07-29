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
} from "@cairn/core";

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

/**
 * `authorized` names the WHOLE request the owner confirmed — outcome and
 * details together. Each adapter's authorization gate re-derives its expected
 * card from both (kimi's also from its observed billing), so passing only the
 * outcome here would refuse every details-bearing dispatch.
 *
 * Each adapter is constructed only when its own detection says connected;
 * disconnected adapters would be filtered by `routeTask` anyway, and the
 * mock lane stays exactly the demo adapter with no status, as today.
 */
export async function detectedAdapters(
  mock: boolean,
  dir: string,
  authorized?: { outcome: string; details: string },
  probes?: DetectionProbes,
): Promise<DetectedAdapters> {
  if (mock) return { adapters: [createOfflineDemoAdapter()] };
  const codex = await detectCodexExecStatus(dir, probes?.codex);
  const kimi = await detectKimiExecStatus(dir, probes?.kimi);
  const adapters: TaskAdapter[] = [];
  if (codex.installed && codex.connected) {
    adapters.push(createCodexExecAdapter(dir, codex, authorized ? authorizeCodexExec(dir, authorized.outcome, authorized.details) : undefined));
  }
  if (kimi.installed && kimi.connected) {
    adapters.push(createKimiExecAdapter(dir, kimi, authorized ? authorizeKimiExec(dir, kimi.billing, authorized.outcome, authorized.details) : undefined));
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
