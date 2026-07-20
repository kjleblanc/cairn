import pc from "picocolors";
import {
  concurrentRunStatus,
  inspectConcurrentCleanup,
  loadConcurrentManifest,
  recoverConcurrentRun,
  runConcurrentFake,
  type ConcurrentRunResult,
} from "@cairn/core";

function option(args: string[], name: string): string | undefined {
  const direct = args.indexOf(name);
  if (direct >= 0) return args[direct + 1];
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  return inline?.slice(name.length + 1);
}

export function concurrentResultLines(result: ConcurrentRunResult): string[] {
  const lines = [
    `Bounded run ${result.runId} finished.`,
    `Provider calls: ${result.providerCalls}; bounded cost: $${result.providerCostUsd.toFixed(2)}.`,
  ];
  for (const task of result.tasks) {
    lines.push(`Task ${String(task.taskNumber).padStart(3, "0")}: ${task.disposition}${task.blocker ? ` — ${task.blocker}` : ""}; call ${task.callConsumed ? "consumed" : "not used"}; checks ${task.checksPassed ? "passed" : "not run"}.`);
  }
  lines.push(`Integration order: ${result.integrationOrder.map((task) => String(task).padStart(3, "0")).join(" → ") || "none"}.`);
  lines.push(result.cleanedUp ? "Cleanup: complete — one clean main worktree remains." : "Cleanup: incomplete — run the exact recovery command.");
  return lines;
}

export function concurrentStatusLines(root: string): string[] {
  const state = concurrentRunStatus(root);
  if (!state) return [];
  const lines = [`Bounded Final run ${state.runId} — ${state.phase}:`];
  for (const task of state.tasks) {
    lines.push(`  Task ${String(task.taskNumber).padStart(3, "0")} · ${task.phase} · call ${task.callConsumed ? "consumed" : "unused"}${task.blocker ? ` · STOPPED: ${task.blocker}` : ""}`);
  }
  lines.push(`Recovery: cairn concurrent recover --run ${state.runId}`);
  return lines;
}

export async function concurrentFlow(root: string, args: string[]): Promise<void> {
  const action = args[1] ?? "";
  if (action === "run") {
    const manifestPath = option(args, "--manifest");
    if (!manifestPath) throw new Error("Use: cairn concurrent run --manifest <exact-repository-relative-manifest-path>");
    const manifest = loadConcurrentManifest(root, manifestPath);
    if (manifest.mode !== "offline-proof") {
      throw new Error("LIVE_APPROVAL_REQUIRED: live provider use needs the four separate Task 024 approvals immediately before execution.");
    }
    console.log(pc.bold(`Closed batch ${manifest.runId}: ${manifest.tasks.length} independently useful Standard task${manifest.tasks.length === 1 ? "" : "s"}.`));
    for (const task of manifest.tasks) {
      console.log(`  Task ${String(task.taskNumber).padStart(3, "0")} · write ${task.writablePaths.join(", ")} · test ${task.testPaths.join(", ")} · ${task.provider.model} · one call ≤ $${task.provider.maxCostUsd.toFixed(2)}`);
    }
    console.log(pc.dim("Offline fake provider only; no credential, network request, or activation."));
    const result = await runConcurrentFake(root, manifest);
    console.log(concurrentResultLines(result).join("\n"));
    return;
  }
  if (action === "recover") {
    const runId = option(args, "--run");
    if (!runId) throw new Error("Use: cairn concurrent recover --run <exact-run-id>");
    console.log("Recovery makes no provider call and touches only the recorded disposable run.");
    const result = recoverConcurrentRun(root, runId);
    console.log(concurrentResultLines(result).join("\n"));
    const cleanup = inspectConcurrentCleanup(root);
    if (!cleanup.cleanMain || cleanup.worktreeCount !== 1 || cleanup.taskBranches.length || cleanup.statePresent || cleanup.lockPresent) {
      throw new Error("RECOVERY_FAILED: owned cleanup did not reach the one-clean-main invariant.");
    }
    return;
  }
  throw new Error("Use `cairn concurrent run --manifest <path>` or `cairn concurrent recover --run <id>`.");
}
