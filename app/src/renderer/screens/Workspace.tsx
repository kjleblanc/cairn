import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { ProjectStatus } from "@cairn/core";
import type { ConductorStatus, ProjectActivity, RecentProject } from "../../shared/ipc";
import { cairn } from "../api";
import { ProjectRail } from "../components/ProjectRail";
import { TownSquarePlaceholder } from "../components/TownSquarePlaceholder";
import { ErrorCard } from "../components/Ui";
import { Chat } from "./Chat";
import { Dashboard } from "./Dashboard";
import { TaskRun } from "./TaskRun";

type CenterView = "chat" | "dashboard" | "task";
type NarrowTab = "chat" | "town";

const DIVIDER_KEY = "cairn.workspace.chatWidth";

function savedChatWidth(): number {
  const value = Number(localStorage.getItem(DIVIDER_KEY));
  return Number.isFinite(value) && value >= 420 && value <= 860 ? value : 620;
}

export function Workspace({
  initialDir,
  initialStatus,
  demoAvailable,
  onOpenProjects,
  onCreateProject,
  onSettings,
}: {
  initialDir: string;
  initialStatus: ProjectStatus;
  demoAvailable: boolean;
  onOpenProjects: () => void;
  onCreateProject: () => void;
  onSettings: () => void;
}) {
  const [activeDir, setActiveDir] = useState(initialDir);
  const [projectStatus, setProjectStatus] = useState(initialStatus);
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [conductor, setConductor] = useState<ConductorStatus | null>(null);
  const [centerView, setCenterView] = useState<CenterView>("chat");
  const [narrowTab, setNarrowTab] = useState<NarrowTab>("chat");
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([initialDir]));
  const [manualExpansion, setManualExpansion] = useState<Set<string>>(() => new Set());
  const [chatWidth, setChatWidth] = useState(savedChatWidth);
  const [error, setError] = useState<string | null>(null);
  const activeDirRef = useRef(activeDir);
  activeDirRef.current = activeDir;

  const refreshProjects = useCallback(async () => {
    const list = await cairn.projectList();
    setProjects(list.recent);
  }, []);

  const refreshActiveStatus = useCallback(async () => {
    const response = await cairn.projectStatus(activeDirRef.current);
    if (response.ok) setProjectStatus(response.value);
  }, []);

  useEffect(() => {
    void refreshProjects();
    void cairn.conductorStatus().then(setConductor);
  }, [refreshProjects]);

  useEffect(() => {
    const refresh = () => { void refreshProjects(); void refreshActiveStatus(); };
    const offTask = cairn.onTaskActivity(refresh);
    const offConductor = cairn.onConductorDelta(refresh);
    const timer = window.setInterval(refresh, 2_000);
    return () => {
      offTask();
      offConductor();
      window.clearInterval(timer);
    };
  }, [refreshActiveStatus, refreshProjects]);

  const orderedProjects = useMemo(() => {
    const active = projects.find((project) => project.dir === activeDir);
    const rest = projects.filter((project) => project.dir !== activeDir);
    return active ? [active, ...rest] : rest;
  }, [activeDir, projects]);

  const activeProject = orderedProjects.find((project) => project.dir === activeDir) ?? null;
  const activity: ProjectActivity = activeProject?.activity ?? "idle";

  async function selectProject(dir: string): Promise<void> {
    if (dir === activeDir) {
      setCenterView("chat");
      setNarrowTab("chat");
      return;
    }
    const previous = activeDir;
    const response = await cairn.projectOpen(dir);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    setError(null);
    setActiveDir(dir);
    setProjectStatus(response.value);
    setCenterView("chat");
    setNarrowTab("chat");
    setExpanded((current) => {
      const next = new Set(current);
      next.add(dir);
      if (!manualExpansion.has(previous)) next.delete(previous);
      return next;
    });
    await refreshProjects();
  }

  function toggleProject(dir: string): void {
    setManualExpansion((current) => new Set(current).add(dir));
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
  }

  function openDashboard(): void {
    setCenterView("dashboard");
    setNarrowTab("chat");
    void refreshActiveStatus();
  }

  function focusChat(): void {
    setCenterView("chat");
    setNarrowTab("chat");
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>(".chat-composer textarea")?.focus();
    });
  }

  function beginResize(event: ReactPointerEvent<HTMLDivElement>): void {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = chatWidth;
    const move = (next: PointerEvent) => {
      const width = Math.min(860, Math.max(420, startWidth + next.clientX - startX));
      setChatWidth(width);
    };
    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      setChatWidth((width) => {
        localStorage.setItem(DIVIDER_KEY, String(width));
        return width;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
  }

  const center = centerView === "chat" ? (
    <Chat key={activeDir} dir={activeDir} embedded onBack={openDashboard}
      onOpenRun={() => setCenterView("task")} />
  ) : centerView === "dashboard" ? (
    <div className="workspace-scroll">
      <Dashboard dir={activeDir} status={projectStatus}
        onStartTask={() => setCenterView("task")}
        onTalkWithCairn={focusChat}
        onSwitch={onOpenProjects}
        onOpenProject={(dir) => void selectProject(dir)}
        onSettings={onSettings} />
    </div>
  ) : (
    <div className="workspace-scroll">
      <TaskRun key={activeDir} dir={activeDir} demoAvailable={demoAvailable} onBack={openDashboard} />
    </div>
  );

  const contentStyle = { "--chat-width": `${chatWidth}px` } as CSSProperties;

  return (
    <div className={`workspace-shell${railCollapsed ? " workspace-rail-collapsed" : ""}`}>
      {error ? <div className="app-error-overlay"><ErrorCard message={error} /></div> : null}
      <ProjectRail activeDir={activeDir} projects={orderedProjects}
        collapsed={railCollapsed} expanded={expanded}
        connected={conductor?.connected ?? false}
        bodyLabel={conductor?.connected ? `${conductor.provider} · ${conductor.model}` : ""}
        onToggleCollapsed={() => setRailCollapsed((value) => !value)}
        onToggleProject={toggleProject}
        onSelectProject={(dir) => void selectProject(dir)}
        onOpenProjects={onOpenProjects}
        onCreateProject={onCreateProject}
        onSettings={onSettings} />

      <section className="workspace-stage">
        <div className="workspace-tabs" role="tablist" aria-label="Workspace pane">
          <button type="button" role="tab" aria-selected={narrowTab === "chat"}
            onClick={focusChat}>Chat</button>
          <button type="button" role="tab" aria-selected={narrowTab === "town"}
            onClick={() => setNarrowTab("town")}>Town</button>
        </div>
        <div className="workspace-content" data-narrow-tab={narrowTab} style={contentStyle}>
          <section className="workspace-chat-pane" aria-label="Chat workspace">
            {center}
          </section>
          <div className="workspace-divider" role="separator" aria-label="Resize chat and town"
            aria-orientation="vertical" onPointerDown={beginResize} />
          <section className="workspace-town-pane" aria-label="Town square">
            <TownSquarePlaceholder projectName={projectStatus.facts.name || "Project"} activity={activity} />
          </section>
        </div>
      </section>
    </div>
  );
}
