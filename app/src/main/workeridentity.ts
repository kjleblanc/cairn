/**
 * Runtime identity comes from the adapter that actually won main's route, not
 * from renderer-owned request booleans. In Cairn's adapter contract, a
 * disclosure seam marks a real model-backed worker; the offline demonstration
 * intentionally has none.
 */
export function runtimeWorkerIdentity(adapter: {
  descriptor: { id: string };
  disclosure?: unknown;
} | undefined): { adapterId: string | null; worker: boolean } {
  return {
    adapterId: adapter?.descriptor.id ?? null,
    worker: typeof adapter?.disclosure === "function",
  };
}
