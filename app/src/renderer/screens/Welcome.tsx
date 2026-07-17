import type { Preflight } from "../../shared/ipc";

export function Welcome(_props: {
  preflight: Preflight; hasRecent: boolean;
  onRecheck: () => void; onOpenFolder: () => void; onNew: () => void; onBrowseRecent: () => void;
}) {
  return <p className="muted">Welcome screen coming in Task 9.</p>;
}
