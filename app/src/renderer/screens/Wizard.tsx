import type { UnfinishedTask } from "@cairn/core";

export function Wizard(_props: {
  dir: string; resume: UnfinishedTask | null; onDone: (stoneAdded: boolean) => void;
}) {
  return <p className="muted">Task wizard coming in Task 12.</p>;
}
