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
import {
  advanceTownCue,
  hydrateTownPresentation,
  observeTownPresentation,
  settleTownPresentation,
} from "../town/presentation";
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
  composerSeed = null,
  demoAvailable,
  onOpenProjects,
  onCreateProject,
  onSettings,
}: {
  initialDir: string;
  initialStatus: ProjectStatus;
  composerSeed?: string | null;
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
  const [runtimePresentation, setRuntimePresentation] = useState(() => hydrateTownPresentation(null, null));
  const [centerView, setCenterView] = useState<CenterView>("chat");
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
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
  const centerViewRef = useRef(centerView);
  const reducedMotionRef = useRef(reducedMotion);
  const runtimeDirRef = useRef<string | null>(null);
  const runtimeRequestRef = useRef(0);
  const runtimeAppliedRef = useRef(0);
  const runtimePresentationRef = useRef(runtimePresentation);
  const statusRequestRef = useRef(0);
  const statusAppliedRef = useRef(0);
  activeDirRef.current = activeDir;
  townPresentationRef.current = townPresentation;
  centerViewRef.current = centerView;
  reducedMotionRef.current = reducedMotion;
  runtimePresentationRef.current = runtimePresentation;
  // Task 160: a checkup suggestion rides in exactly once — consumed by the
  // first Chat mount, then cleared so an internal project switch (which
  // remounts Chat by key) can never re-seed the composer's words.
  const composerSeedRef = useRef(composerSeed);
  useEffect(() => { composerSeedRef.current = null; }, []);

  const refreshProjects = useCallback(async () => {
    const list = await cairn.projectList();
    setProjects(list.recent);
  }, []);

  const refreshActiveStatus = useCallback(async () => {
    const dir = activeDirRef.current;
    const request = ++statusRequestRef.current;
    const response = await cairn.projectStatus(dir);
    if (activeDirRef.current !== dir || request < statusAppliedRef.current) return;
    statusAppliedRef.current = request;
    if (response.ok) setProjectStatus(response.value);
  }, []);

  const refreshActiveRuntime = useCallback(async (dir = activeDirRef.current) => {
    const request = ++runtimeRequestRef.current;
    const [task, stream] = await Promise.all([cairn.taskCurrent(dir), cairn.conductorCurrent(dir)]);
    if (activeDirRef.current !== dir || request < runtimeAppliedRef.current) return;
    const hydrate = runtimeDirRef.current !== dir;
    const current = runtimePresentationRef.current;
    const next = hydrate
      ? hydrateTownPresentation(task, stream)
      : observeTownPresentation(
        current,
        task,
        stream,
        centerViewRef.current === "chat" && !reducedMotionRef.current,
      );
    // The reducer returns the same object when an older prefix or regressed
    // terminal snapshot loses the monotonicity check. Accept task, stream, and
    // presentation as one unit so stale data cannot repopulate a worker while
    // the pond correctly remains terminal.
    if (!hydrate && next === current) return;
    runtimeAppliedRef.current = request;
    runtimeDirRef.current = dir;
    runtimePresentationRef.current = next;
    setTownTask(task);
    setTownStream(stream);
    setRuntimePresentation(next);
  }, []);

  useEffect(() => {
    void refreshProjects();
    void cairn.conductorStatus().then(setConductor);
  }, [refreshProjects]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    // A new active project is a new context: a stale error card from the old
    // one never follows the owner across it.
    setError(null);
    setTownTask(null);
    setTownStream(null);
    runtimeDirRef.current = null;
    const reset = hydrateTownPresentation(null, null);
    runtimePresentationRef.current = reset;
    setRuntimePresentation(reset);
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

  // Motion never gates truth. A keyed timer advances the one cue on screen;
  // switching away or asking for reduced motion drains the reducer directly to
  // its stable semantic state. The key makes Strict Mode and stale timers inert.
  useEffect(() => {
    const cue = runtimePresentation.activeCue;
    if (!cue) return;
    const duration = cue.kind === "dispatch" || cue.kind === "return"
      ? cue.phase === "flight" ? 950 : 720
      : 1_150;
    const timer = window.setTimeout(() => {
      setRuntimePresentation((current) => {
        const next = advanceTownCue(current, cue.key);
        runtimePresentationRef.current = next;
        return next;
      });
    }, duration);
    return () => window.clearTimeout(timer);
  }, [runtimePresentation.activeCue?.key, runtimePresentation.activeCue?.phase]);

  useEffect(() => {
    if (centerView === "chat" && !reducedMotion) return;
    setRuntimePresentation((current) => {
      const next = settleTownPresentation(current);
      runtimePresentationRef.current = next;
      return next;
    });
  }, [centerView, reducedMotion]);

  useEffect(() => {
    const refresh = () => {
      void refreshProjects();
      void refreshActiveStatus();
      void refreshActiveRuntime();
      void cairn.conductorStatus().then(setConductor);
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
    // Invalidate every old-project request before React commits the new
    // selection. An event or poll already in flight can no longer paint the
    // previous Town or overwrite the new project's name.
    activeDirRef.current = dir;
    runtimeAppliedRef.current = ++runtimeRequestRef.current;
    statusAppliedRef.current = ++statusRequestRef.current;
    setError(null);
    // Project name, Town truth, and motion anchor change as one visible batch;
    // the new project never paints for a frame with the old project's run.
    setTownTask(null);
    setTownStream(null);
    runtimeDirRef.current = null;
    const reset = hydrateTownPresentation(null, null);
    runtimePresentationRef.current = reset;
    setRuntimePresentation(reset);
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
        consentRequired={conductor?.consentRequired ?? false}
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
            <TownSquare key={`town:${activeDir}`} projectName={projectStatus.facts.name || "Project"}
              task={townTask} stream={townStream}
              presentation={runtimePresentation}
              positions={townPresentation.positions}
              onPositionsChange={(positions: Record<string, TownPoint>) => {
                const state = { ...townPresentationRef.current, positions };
                persistTownPresentation(activeDirRef.current, state);
              }}
              onFocusChat={focusChat}
              onOpenRun={() => setCenterView("task")} />
            <Chat key={`chat:${activeDir}`} dir={activeDir} embedded focusSignal={chatFocusSignal}
              initialComposer={composerSeedRef.current ?? undefined}
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
