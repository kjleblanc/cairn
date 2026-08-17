import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProjectStatus } from "@cairn/core";
import type {
  ConductorStatus,
  ConductorStreamSnapshot,
  RecentProject,
  RunSessionSnapshot,
} from "../../shared/ipc";
import { cairn } from "../api";
import { ActivityCapsule } from "../components/ActivityCapsule";
import { ProjectRail } from "../components/ProjectRail";
import { ErrorCard } from "../components/Ui";
import {
  advanceActivityCue,
  hydrateActivityPresentation,
  observeActivityPresentation,
  settleActivityPresentation,
} from "../activity/presentation";
import { resolveCairnPresence } from "../activity/presence";
import { Chat } from "./Chat";
import { Dashboard } from "./Dashboard";
import { TaskRun } from "./TaskRun";

type CenterView = "chat" | "dashboard" | "task";

/**
 * Task 259 (Slice 4 of the resident-program visual overhaul) replaced the town
 * square and the pond with the chat-first desk: a slim rail, a quiet header, a
 * written activity capsule, and the warm paper that holds the exchange.
 *
 * WHAT DID NOT CHANGE is the load-bearing half of this file. The active
 * project, the polling and its stale guards, the capture identity attributes,
 * the project-generation counter, view routing and the Chat focus signal are
 * behaviour rather than scenery, and Slice 2's suites exist to catch a slip in
 * any of them.
 *
 * TownSquare, PondLine and the saved-position persistence are gone from this
 * screen but still exist on disk. Slice 10 deletes them, and an owner's
 * `.cairn/town-square.json` is never deleted or transformed — an obsolete file
 * may safely remain unread.
 */
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
  // The raw task and stream snapshots are no longer held in state. They fed the
  // Town's worker nodes; the capsule reads the projection alone, and keeping a
  // second copy of a runtime snapshot that nothing renders is how two sources
  // of the same truth start.
  const [runtimePresentation, setRuntimePresentation] = useState(() => hydrateActivityPresentation(null, null));
  const [centerView, setCenterView] = useState<CenterView>("chat");
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const [chatNeedsYou, setChatNeedsYou] = useState(false);
  // Task 186: projects are a shelf at the edge of the world, not the first
  // thing that claims the room. It opens on demand and remains fully named in
  // ProjectRail even while only the monograms are visible.
  const [railCollapsed, setRailCollapsed] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([initialDir]));
  const [manualExpansion, setManualExpansion] = useState<Set<string>>(() => new Set());
  // Bumped on every explicit "talk" intent (rail action, the dashboard's Talk
  // button); Chat focuses its composer on the change.
  const [chatFocusSignal, setChatFocusSignal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const activeDirRef = useRef(activeDir);
  const centerViewRef = useRef(centerView);
  const reducedMotionRef = useRef(reducedMotion);
  const runtimeDirRef = useRef<string | null>(null);
  const runtimeRequestRef = useRef(0);
  const runtimeAppliedRef = useRef(0);
  const runtimePresentationRef = useRef(runtimePresentation);
  const statusRequestRef = useRef(0);
  const statusAppliedRef = useRef(0);
  const captureProjectRef = useRef({ dir: activeDir, generation: 0 });
  if (captureProjectRef.current.dir !== activeDir) {
    captureProjectRef.current = {
      dir: activeDir,
      generation: captureProjectRef.current.generation + 1,
    };
  }
  activeDirRef.current = activeDir;
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
      ? hydrateActivityPresentation(task, stream)
      : observeActivityPresentation(
        current,
        task,
        stream,
        centerViewRef.current === "chat" && !reducedMotionRef.current,
      );
    // The reducer returns the same object when an older prefix or regressed
    // terminal snapshot loses the monotonicity check. Rejecting the whole
    // observation there is what stops a stale snapshot from walking the capsule
    // back off a terminal outcome it has already reported.
    if (!hydrate && next === current) return;
    runtimeAppliedRef.current = request;
    runtimeDirRef.current = dir;
    runtimePresentationRef.current = next;
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
    // one never follows the owner across it, and neither does a waiting
    // decision or a run the previous project was in the middle of.
    setError(null);
    setChatNeedsYou(false);
    runtimeDirRef.current = null;
    const reset = hydrateActivityPresentation(null, null);
    runtimePresentationRef.current = reset;
    setRuntimePresentation(reset);
    void refreshActiveRuntime(activeDir);
    // The connection is resolved against the current project, so it is asked
    // again immediately rather than waiting out the two-second poll. Without
    // this the header and the capsule spend up to two seconds reporting the
    // PREVIOUS project's connection — visible before Task 259 only in the
    // rail's small label, and unmissable now that the desk says it in words.
    void cairn.conductorStatus().then(setConductor);
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
        const next = advanceActivityCue(current, cue.key);
        runtimePresentationRef.current = next;
        return next;
      });
    }, duration);
    return () => window.clearTimeout(timer);
  }, [runtimePresentation.activeCue?.key, runtimePresentation.activeCue?.phase]);

  useEffect(() => {
    if (centerView === "chat" && !reducedMotion) return;
    setRuntimePresentation((current) => {
      const next = settleActivityPresentation(current);
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
    // A Builder review is an append-only display turn. It must not provoke
    // project, task, runtime, or connection reads merely by arriving.
    const offConductor = cairn.onConductorDelta((event) => {
      const payloadTurn = (event as { turn?: { role?: unknown } }).turn;
      if (event.kind === "turn" || payloadTurn?.role === "builder-review") return;
      refresh();
    });
    const timer = window.setInterval(refresh, 2_000);
    return () => {
      offTask();
      offConductor();
      window.clearInterval(timer);
    };
  }, [refreshActiveRuntime, refreshActiveStatus, refreshProjects]);

  // Main dispatches this only after a worker has settled and before taking the
  // terminal picture. Chat/TaskRun apply the closed session synchronously;
  // Workspace also refreshes the activity projection so the capsule follows.
  useEffect(() => {
    const onRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{ dir?: unknown; session?: unknown }>).detail;
      if (!detail || detail.dir !== activeDirRef.current) return;
      const session = detail.session as RunSessionSnapshot | null;
      if (!session || session.dir !== detail.dir || session.phase !== "closed" || !Array.isArray(session.activities)) return;
      const current = runtimePresentationRef.current;
      const next = observeActivityPresentation(
        current,
        session,
        null,
        centerViewRef.current === "chat" && !reducedMotionRef.current,
      );
      runtimeDirRef.current = session.dir;
      runtimePresentationRef.current = next;
      setRuntimePresentation(next);
    };
    window.addEventListener("cairn:task-session-refresh", onRefresh);
    return () => window.removeEventListener("cairn:task-session-refresh", onRefresh);
  }, []);

  const orderedProjects = useMemo(() => {
    const active = projects.find((project) => project.dir === activeDir);
    const rest = projects.filter((project) => project.dir !== activeDir);
    return active ? [active, ...rest] : rest;
  }, [activeDir, projects]);

  const connected = conductor?.connected ?? false;
  const consentRequired = conductor?.consentRequired ?? false;

  // ONE resolved value behind the written line and Cairn's face. Two
  // independent answers to "is something waiting?" would eventually disagree,
  // and the line would be the one that lied.
  const presence = useMemo(
    () => resolveCairnPresence({ activity: runtimePresentation, needsOwner: chatNeedsYou, connected }),
    [runtimePresentation, chatNeedsYou, connected],
  );

  const connectionState = consentRequired ? "consent" : connected ? "connected" : "none";
  const connectionLabel = consentRequired
    ? "Permission needed"
    : connected ? "Connected" : "Not connected";

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
    // previous project's run or overwrite the new project's name.
    activeDirRef.current = dir;
    runtimeAppliedRef.current = ++runtimeRequestRef.current;
    statusAppliedRef.current = ++statusRequestRef.current;
    setError(null);
    // Project name, activity truth, and the capsule change as one visible
    // batch; the new project never paints for a frame with the old project's
    // run.
    runtimeDirRef.current = null;
    const reset = hydrateActivityPresentation(null, null);
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

  const projectName = projectStatus.facts.name || "Project";

  return (
    <div className="rp-desk">
      {error ? <div className="app-error-overlay"><ErrorCard message={error} onDismiss={() => setError(null)} /></div> : null}
      <ProjectRail activeDir={activeDir} projects={orderedProjects}
        collapsed={railCollapsed} expanded={expanded}
        connected={connected}
        consentRequired={consentRequired}
        bodyLabel={conductor?.connected ? `${conductor.provider} · ${conductor.model}` : ""}
        onToggleCollapsed={() => setRailCollapsed((value) => !value)}
        onToggleProject={toggleProject}
        onSelectProject={(dir) => void selectProject(dir)}
        onOpenProjects={onOpenProjects}
        onCreateProject={onCreateProject}
        onSettings={onSettings} />

      {/* Main compares this trusted renderer value with the accepted run root
          before capture, so switching projects cannot mislabel another
          project's stage as evidence for the run that just settled.

          `workspace-stage` IS THE CAPTURE SELECTOR. `src/main/evidencecapture.ts`
          exports it as WORKSPACE_STAGE_SELECTOR and reads both attributes below
          off the element carrying it. The class stays whatever the composition
          around it becomes; `tests-unit/deskcomposition.test.ts` pins the two
          together so a rename here cannot silently blind the capture. */}
      <section className="workspace-stage rp-desk-stage" data-project-dir={activeDir}
        data-project-generation={captureProjectRef.current.generation}>
        {/* The quiet header: a long project name shortens, and whether you are
            connected never does. */}
        <header className="rp-desk-header">
          <span className="rp-desk-title" title={projectName}>{projectName}</span>
          <span className="rp-desk-connection" data-rp-connection={connectionState}>{connectionLabel}</span>
        </header>

        <ActivityCapsule presence={presence} />

        <main className="rp-desk-view">
          {centerView === "chat" ? (
            <Chat key={`chat:${activeDir}`} dir={activeDir} embedded focusSignal={chatFocusSignal}
              initialComposer={composerSeedRef.current ?? undefined}
              onNeedsYouChange={setChatNeedsYou}
              onBack={openDashboard}
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
          )}
        </main>
      </section>
    </div>
  );
}
