import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
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
type NarrowTab = "chat" | "town";

function defaultTownPresentation(): TownPresentationState {
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
  const [narrowTab, setNarrowTab] = useState<NarrowTab>("chat");
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([initialDir]));
  const [manualExpansion, setManualExpansion] = useState<Set<string>>(() => new Set());
  const [townPresentation, setTownPresentation] = useState<TownPresentationState>(defaultTownPresentation);
  const [chatWidth, setChatWidth] = useState(620);
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
    setTownTask(null);
    setTownStream(null);
    const empty = defaultTownPresentation();
    setTownPresentation(empty);
    setChatWidth(empty.dividerWidth);
    void refreshActiveRuntime(activeDir);
    void cairn.townLoad(activeDir).then((response) => {
      if (activeDirRef.current !== activeDir) return;
      if (!response.ok) {
        setError(response.message);
        return;
      }
      setTownPresentation(response.value);
      setChatWidth(response.value.dividerWidth);
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

  function persistTownPresentation(dir: string, state: TownPresentationState): void {
    setTownPresentation(state);
    townPresentationRef.current = state;
    void cairn.townSave(dir, state).then((response) => {
      if (activeDirRef.current === dir && !response.ok) setError(response.message);
    });
  }

  function maxChatWidth(): number {
    const width = document.querySelector<HTMLElement>(".workspace-content")?.getBoundingClientRect().width ?? 1188;
    return Math.max(420, Math.min(860, width - 328));
  }

  function saveChatWidth(width: number, dir = activeDirRef.current): void {
    const bounded = Math.max(420, Math.min(maxChatWidth(), width));
    setChatWidth(bounded);
    persistTownPresentation(dir, { ...townPresentationRef.current, dividerWidth: bounded });
  }

  function beginResize(event: ReactPointerEvent<HTMLDivElement>): void {
    event.preventDefault();
    const resizeDir = activeDirRef.current;
    const startX = event.clientX;
    const startWidth = chatWidth;
    const maximum = maxChatWidth();
    const move = (next: PointerEvent) => {
      const width = Math.min(maximum, Math.max(420, startWidth + next.clientX - startX));
      setChatWidth(width);
    };
    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      if (activeDirRef.current === resizeDir) setChatWidth((width) => {
        persistTownPresentation(resizeDir, { ...townPresentationRef.current, dividerWidth: width });
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
            aria-orientation="vertical" aria-valuemin={420} aria-valuemax={maxChatWidth()}
            aria-valuenow={Math.round(chatWidth)} tabIndex={0}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              saveChatWidth(chatWidth + (event.key === "ArrowRight" ? 24 : -24));
            }}
            onPointerDown={beginResize} />
          <section className="workspace-town-pane" aria-label="Town square">
            <TownSquare projectName={projectStatus.facts.name || "Project"}
              task={townTask} stream={townStream}
              positions={townPresentation.positions}
              onPositionsChange={(positions: Record<string, TownPoint>) => {
                const state = { ...townPresentationRef.current, positions };
                persistTownPresentation(activeDirRef.current, state);
              }}
              onFocusChat={focusChat}
              onOpenRun={() => {
                setCenterView("task");
                setNarrowTab("chat");
              }} />
          </section>
        </div>
      </section>
    </div>
  );
}
