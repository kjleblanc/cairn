import type { ProjectStatus } from "@cairn/core";

export function Picker(_props: {
  startNew: boolean; onOpen: (dir: string) => void; onOpenFolder: () => void;
  onCreated: (dir: string, status: ProjectStatus) => void; onSettings: () => void;
}) {
  return <p className="muted">Project picker coming in Task 10.</p>;
}
