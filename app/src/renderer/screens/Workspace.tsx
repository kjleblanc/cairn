import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProjectStatus } from "@cairn/core";
import type {
  ConductorStatus,
  ConductorStreamSnapshot,
  RecentProject,
  RunSessionSnapshot,
  TownPoint,
  TownPresentationState,
} from "../../shared/ipc";
import { cairn } from "../api";
import { ProjectRail } from "../components/ProjectRail";
import { TownSquare } from "../components/TownSquare";
import { ErrorCard } from "../components/Ui";
import { Chat } from "./Chat";
import { Dashboard } from "./Dashboard";
import { TaskRun } from "./TaskRun";

type CenterView = "chat" | "dashboard" | "task";

function defaultTownPresentation(): TownPresentationState {
  // dividerWidth is kept in the saved shape for compatibility with files
  // written before the villager bubble (Task 146); it is no longer rendered.
  return { version: 1, positions: {}, dividerWidth: 620 };
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
  const [townTask, setTownTask] = useState<RunSessionSnapshot | null>(null);
  const [townStream, setTownStream] = useState<ConductorStreamSnapshot | null>(null);
  const [centerView, setCenterView] = useState<CenterView>("chat");
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([initialDir]));
  const [manualExpansion, setManualExpansion] = useState<Set<string>>(() => new Set());
  const [townPresentation, setTownPresentation] = useState<TownPresentationState>(defaultTownPresentation);
  // Bumped on every explicit "talk" intent (rail action, Cairn's node, the
  // dashboard's Talk button); Chat untucks and focuses on the change.
  const [chatFocusSignal, setChatFocusSignal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const activeDirRef = useRef(activeDir);
  const townPresentationRef = useRef(townPresentation);
  activeDirRef.current = activeDir;
  townPresentationRef.current = townPresentation;

  const refreshProjects = useCallback(async () => {
    const list = await cairn.projectList();
    setProjects(list.recent);
  }, []);

  const refreshActiveStatus = useCallback(async () => {
    const response = await cairn.projectStatus(activeDirRef.current);
    if (response.ok) setProjectStatus(response.value);
  }, []);

  const refreshActiveRuntime = useCallback(async (dir = activeDirRef.current) => {
    const [task, stream] = await Promise.all([cairn.taskCurrent(dir), cairn.conductorCurrent(dir)]);
    if (activeDirRef.current !== dir) return;
    setTownTask(task);
    setTownStream(stream);
  }, []);

  useEffect(() => {
    void refreshProjects();
    void cairn.conductorStatus().then(setConductor);
  }, [refreshProjects]);

  useEffect(() => {
    // A new active project is a new context: a stale error card from the old
    // one never follows the owner across it.
    setError(null);
    setTownTask(null);
    setTownStream(null);
    setTownPresentation(defaultTownPresentation());
    void refreshActiveRuntime(activeDir);
    void cairn.townLoad(activeDir).then((response) => {
      if (activeDirRef.current !== activeDir) return;
      if (!response.ok) {
        setError(response.message);
        return;
      }
      setTownPresentation(response.value);
    });
  }, [activeDir, refreshActiveRuntime]);

  useEffect(() => {
    const refresh = () => {
      void refreshProjects();
      void refreshActiveStatus();
      void refreshActiveRuntime();
    };
    const offTask = cairn.onTaskActivity(refresh);
    const offConductor = cairn.onConductorDelta(refresh);
    const timer = window.setInterval(refresh, 2_000);
    return () => {
      offTask();
      offConductor();
      window.clearInterval(timer);
    };
  }, [refreshActiveRuntime, refreshActiveStatus, refreshProjects]);

  const orderedProjects = useMemo(() => {
    const active = projects.find((project) => project.dir === activeDir);
    const rest = projects.filter((project) => project.dir !== activeDir);
    return active ? [active, ...rest] : rest;
  }, [activeDir, projects]);

  async function selectProject(dir: string): Promise<void> {
    if (dir === activeDir) {
      setCenterView("chat");
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
    void refreshActiveStatus();
  }

  function focusChat(): void {
    setCenterView("chat");
    setChatFocusSignal((n) => n + 1);
  }

  function persistTownPresentation(dir: string, state: TownPresentationState): void {
    setTownPresentation(state);
    townPresentationRef.current = state;
    void cairn.townSave(dir, state).then((response) => {
      if (activeDirRef.current === dir && !response.ok) setError(response.message);
    });
  }

  return (
    <div className={`workspace-shell${railCollapsed ? " workspace-rail-collapsed" : ""}`}>
      {error ? <div className="app-error-overlay"><ErrorCard message={error} onDismiss={() => setError(null)} /></div> : null}
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
        {centerView === "chat" ? (
          /* One world: the town fills the stage and the conversation lives
             inside it as the villager bubble anchored to Cairn. */
          <section className="workspace-town-pane" aria-label="Town square">
            <TownSquare projectName={projectStatus.facts.name || "Project"}
              task={townTask} stream={townStream}
              positions={townPresentation.positions}
              onPositionsChange={(positions: Record<string, TownPoint>) => {
                const state = { ...townPresentationRef.current, positions };
                persistTownPresentation(activeDirRef.current, state);
              }}
              onFocusChat={focusChat}
              onOpenRun={() => setCenterView("task")} />
            <Chat key={activeDir} dir={activeDir} embedded focusSignal={chatFocusSignal}
              onBack={openDashboard}
              onOpenRun={() => setCenterView("task")} />
          </section>
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
        )}
      </section>
    </div>
  );
}
