import { useEffect, useState } from "react";
import type { RecentProject } from "../../shared/ipc";
import { cairn } from "../api";

/**
 * The dashboard's "Switch project" control (task 007): a small in-place list of
 * the other remembered projects that can load, most recent first, with name and
 * stone count — one click lands on that project's dashboard. The "All projects"
 * entry still reaches the full projects screen, where broken entries are shown.
 */
export function ProjectSwitcher({ currentDir, onOpenProject, onAllProjects }: {
  currentDir: string; onOpenProject: (dir: string) => void; onAllProjects: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [others, setOthers] = useState<RecentProject[]>([]);

  useEffect(() => {
    if (!open) return;
    void cairn.projectList().then((l) => setOthers(l.recent.filter((r) => r.ok && r.dir !== currentDir)));
  }, [open, currentDir]);

  return (
    <span className="switcher">
      <button type="button" className="pill pill-quiet" onClick={() => setOpen((o) => !o)}>Switch project</button>
      {open ? (
        <div className="switcher-list">
          {others.map((r) => (
            <button key={r.dir} type="button" className="switcher-item"
              onClick={() => { setOpen(false); onOpenProject(r.dir); }}>
              <span>{r.name || "Unnamed project"}</span>
              <span className="small muted">{r.stones} {r.stones === 1 ? "stone" : "stones"}</span>
            </button>
          ))}
          {others.length === 0 ? <p className="small muted" style={{ margin: "6px 10px" }}>No other projects yet.</p> : null}
          <button type="button" className="switcher-item" onClick={() => { setOpen(false); onAllProjects(); }}>All projects</button>
        </div>
      ) : null}
    </span>
  );
}
