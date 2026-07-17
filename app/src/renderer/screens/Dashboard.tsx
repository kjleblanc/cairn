import type { ProjectStatus } from "@cairn/core";

export function Dashboard(_props: {
  dir: string; status: ProjectStatus; justAdded: boolean;
  onStartTask: () => void; onResume: () => void; onDirection: (reason: string) => void;
  onSwitch: () => void; onSettings: () => void;
}) {
  return <p className="muted">Dashboard coming in Task 11.</p>;
}
