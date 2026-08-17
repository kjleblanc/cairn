import type { ProjectActivity, RecentProject } from "../../shared/ipc";

const activityText: Record<ProjectActivity, string> = {
  idle: "idle",
  thinking: "Cairn is replying",
  working: "worker task running",
  complete: "task finished",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) || "??").toUpperCase();
}

export function ProjectRail({
  activeDir,
  projects,
  collapsed,
  expanded,
  connected,
  consentRequired,
  bodyLabel,
  onToggleCollapsed,
  onToggleProject,
  onSelectProject,
  onOpenProjects,
  onCreateProject,
  onSettings,
}: {
  activeDir: string;
  projects: RecentProject[];
  collapsed: boolean;
  expanded: ReadonlySet<string>;
  connected: boolean;
  consentRequired: boolean;
  bodyLabel: string;
  onToggleCollapsed: () => void;
  onToggleProject: (dir: string) => void;
  onSelectProject: (dir: string) => void;
  onOpenProjects: () => void;
  onCreateProject: () => void;
  onSettings: () => void;
}) {
  return (
    /* Task 259: the slim rail of the chat-first desk. `rp-desk-rail` carries
       the desk's material and re-points the paired `--rail-*` tokens every
       rule below is already written against; `project-rail` stays because
       those rules — and the existing CSS compaction — key off it. Navigation
       is subordinate furniture here, so nothing about its behaviour moved. */
    <aside className={`project-rail rp-desk-rail${collapsed ? " project-rail-collapsed rp-desk-rail-slim" : ""}`}
      aria-label="Cairn projects">
      <div className="rail-identity">
        <span className={`rail-cairn-mark${connected ? " rail-cairn-connected" : consentRequired ? " rail-cairn-paused" : ""}`} aria-hidden="true">C</span>
        {!collapsed ? (
          <span className="rail-identity-copy">
            <strong>Cairn</strong>
            <span>{consentRequired ? "brain paused · review permission" : connected ? bodyLabel : "brain disconnected"}</span>
          </span>
        ) : null}
        <button type="button" className="rail-collapse" onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand project rail" : "Collapse project rail"}>
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      <div className="rail-projects">
        {!collapsed ? <p className="rail-section-label">Projects</p> : null}
        {projects.map((project) => {
          const active = project.dir === activeDir;
          const open = expanded.has(project.dir);
          const urgent = project.tasks.some((task) => task.state === "running" || task.state === "unfinished");
          return (
            <section className={`rail-project${active ? " rail-project-active" : ""}`} key={project.dir}>
              <div className="rail-project-row">
                <button type="button" className="rail-project-select" onClick={() => onSelectProject(project.dir)}
                  aria-current={active ? "page" : undefined}
                  aria-label={collapsed
                    ? `${project.name || "Unnamed project"}, ${activityText[project.activity]}${urgent ? ", running or unfinished task" : ""}`
                    : undefined}
                  title={collapsed ? project.name || "Unnamed project" : undefined}>
                  <span className="rail-project-avatar" aria-hidden="true">{initials(project.name)}</span>
                  {!collapsed ? (
                    <span className="rail-project-copy">
                      <span>{project.name || "Unnamed project"}</span>
                      <span>{activityText[project.activity]}</span>
                    </span>
                  ) : null}
                  <span className={`rail-activity rail-activity-${project.activity}`} aria-label={activityText[project.activity]} />
                  {collapsed && urgent ? <span className="rail-urgent" aria-label="Running or unfinished task">!</span> : null}
                </button>
                {!collapsed ? (
                  <button type="button" className="rail-project-toggle" onClick={() => onToggleProject(project.dir)}
                    aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${project.name || "project"} tasks`}>
                    {open ? "−" : "+"}
                  </button>
                ) : null}
              </div>
              {!collapsed && open ? (
                <div className="rail-tasks">
                  {project.tasks.length === 0 ? <p className="rail-empty">No task records yet.</p> : null}
                  {project.tasks.map((task) => (
                    <div className={`rail-task rail-task-${task.state}`} key={task.id}>
                      <span className="rail-task-mark" aria-hidden="true" />
                      <span className="rail-task-copy">
                        <span><span className="rail-task-id">{task.label}</span>{task.summary}</span>
                        <span>{task.state}</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="rail-bottom">
        <button type="button" className="rail-action" onClick={onOpenProjects}
          aria-label="Open a project"
          title={collapsed ? "Open a project" : undefined}>
          <span aria-hidden="true">⌂</span>{!collapsed ? <span>Open project</span> : null}
        </button>
        <button type="button" className="rail-action" onClick={onCreateProject}
          aria-label="Create a project"
          title={collapsed ? "Create a project" : undefined}>
          <span aria-hidden="true">＋</span>{!collapsed ? <span>Create project</span> : null}
        </button>
        <button type="button" className="rail-action" onClick={onSettings}
          aria-label="Settings"
          title={collapsed ? "Settings" : undefined}>
          <span aria-hidden="true">⚙</span>{!collapsed ? <span>Settings</span> : null}
        </button>
      </div>
    </aside>
  );
}
