import { useCallback, useEffect, useState } from "react";
import type { ProjectStatus, UnfinishedTask } from "@cairn/core";
import type { Preflight } from "../shared/ipc";
import { cairn } from "./api";
import { ErrorCard } from "./components/Ui";
import { RunReminder } from "./components/RunReminder";
import { Welcome } from "./screens/Welcome";
import { Picker } from "./screens/Picker";
import { Dashboard } from "./screens/Dashboard";
import { Wizard, type WizardStatus } from "./screens/Wizard";
import { Direction } from "./screens/Direction";
import { Settings } from "./screens/Settings";

type View =
  | { name: "loading" }
  | { name: "welcome"; preflight: Preflight; hasRecent: boolean }
  | { name: "picker"; startNew: boolean; note?: string }
  | { name: "dashboard"; dir: string; status: ProjectStatus; justAdded: boolean }
  | { name: "wizard" }
  | { name: "direction"; dir: string; reason: string }
  | { name: "settings"; dir: string | null };

/**
 * Task 009: one open walk through the five steps. The running agent lives in
 * the app's engine room and survives any screen change on its own; keeping the
 * task screen mounted — hidden, never unmounted — preserves the live view and
 * any waiting question card while the owner looks at other screens.
 */
type Session = { id: number; dir: string; resume: UnfinishedTask | null };

const IN_FLIGHT: ReadonlyArray<WizardStatus["phase"]> = ["defining", "building", "reviewing"];
const folderName = (dir: string): string => dir.split(/[\\/]/).filter(Boolean).pop() ?? dir;

export function App() {
  const [view, setView] = useState<View>({ name: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [wstat, setWstat] = useState<WizardStatus | null>(null);

  const openProject = useCallback(async (dir: string, justAdded = false) => {
    const r = await cairn.projectOpen(dir);
    if (r.ok) { setError(null); setView({ name: "dashboard", dir, status: r.value, justAdded }); }
    else setError(r.message);
  }, []);

  const boot = useCallback(async () => {
    const pf = await cairn.preflight();
    const list = await cairn.projectList();
    if (!pf.claudeReady) { setView({ name: "welcome", preflight: pf, hasRecent: list.recent.length > 0 }); return; }
    if (list.autoOpen) { await openProject(list.autoOpen); return; }
    const last = list.recent[0];
    if (last) {
      // Reopen where the owner left off; if that project can't load, fall back
      // to the projects screen with a plain note — never an error dead-end.
      const r = await cairn.projectOpen(last.dir);
      if (r.ok) { setError(null); setView({ name: "dashboard", dir: last.dir, status: r.value, justAdded: false }); }
      else setView({ name: "picker", startNew: false, note: `Cairn couldn't reopen ${last.name || "your last project"} — the folder may have moved or lost its rulebook.` });
      return;
    }
    setView({ name: "welcome", preflight: pf, hasRecent: false });
  }, [openProject]);

  useEffect(() => { void boot(); }, [boot]);

  // Apply the owner's saved model choice (if any) so the first run uses it.
  useEffect(() => { void cairn.taskSetModel(localStorage.getItem("cairn-model") ?? ""); }, []);

  const pickAndOpen = useCallback(async () => {
    const dir = await cairn.projectPickFolder();
    if (dir) await openProject(dir);
  }, [openProject]);

  const runLive = wstat !== null && (IN_FLIGHT.includes(wstat.phase) || wstat.waiting);

  /**
   * Enter the task walk. One walk at a time: while an agent is live, a second
   * start is refused with the engine room's own words; a walk parked at a
   * quiet step is returned to (same project) or pointed at (another project).
   */
  const enterTask = useCallback((dir: string, resume: UnfinishedTask | null) => {
    if (session) {
      if (runLive) { setError("One step at a time — an agent is already running."); return; }
      if (session.dir === dir) { setError(null); setView({ name: "wizard" }); return; }
      const open = wstat && wstat.taskNumber > 0 ? `Task ${String(wstat.taskNumber).padStart(3, "0")}` : "A task";
      setError(`${open} in "${folderName(session.dir)}" is still open — use the reminder to return and finish it first.`);
      return;
    }
    setError(null);
    setSession({ id: Date.now(), dir, resume });
    setView({ name: "wizard" });
  }, [session, runLive, wstat]);

  /**
   * Leave the task walk without disturbing it. The untouched first screen has
   * nothing worth keeping, so it simply closes; every later step stays alive
   * behind the home screen, run and all.
   */
  const goHome = useCallback(() => {
    if (!session) return;
    if (wstat && wstat.phase === "outcome" && !wstat.waiting) { setSession(null); setWstat(null); }
    void openProject(session.dir);
  }, [session, wstat, openProject]);

  /** The walk ended the ordinary way (closed, or left from a quiet step). */
  const endSession = useCallback((stoneAdded: boolean) => {
    const dir = session?.dir;
    setSession(null);
    setWstat(null);
    if (dir) void openProject(dir, stoneAdded);
  }, [session, openProject]);

  const returnToTask = useCallback(() => { setError(null); setView({ name: "wizard" }); }, []);

  const body = (() => {
    switch (view.name) {
      case "loading":
        return <p className="muted">Getting ready…</p>;
      case "welcome":
        return <Welcome preflight={view.preflight} hasRecent={view.hasRecent}
          onRecheck={() => void boot()}
          onOpenFolder={() => void pickAndOpen()}
          onNew={() => setView({ name: "picker", startNew: true })}
          onBrowseRecent={() => setView({ name: "picker", startNew: false })} />;
      case "picker":
        return <Picker startNew={view.startNew} note={view.note ?? null}
          onOpen={(dir) => void openProject(dir)}
          onOpenFolder={() => void pickAndOpen()}
          onCreated={(dir, status) => setView({ name: "dashboard", dir, status, justAdded: false })}
          onSettings={() => setView({ name: "settings", dir: null })} />;
      case "dashboard":
        return <Dashboard dir={view.dir} status={view.status} justAdded={view.justAdded}
          onStartTask={() => enterTask(view.dir, null)}
          onResume={() => enterTask(view.dir, view.status.unfinished)}
          onDirection={(reason) => setView({ name: "direction", dir: view.dir, reason })}
          onSwitch={() => setView({ name: "picker", startNew: false })}
          onOpenProject={(dir) => void openProject(dir)}
          onSettings={() => setView({ name: "settings", dir: view.dir })} />;
      case "wizard":
        return null; // the task walk renders below, so it can live behind other screens
      case "direction":
        return <Direction dir={view.dir} reason={view.reason} onBack={() => void openProject(view.dir)} />;
      case "settings":
        return <Settings onBack={() => (view.dir ? void openProject(view.dir) : setView({ name: "picker", startNew: false }))} />;
    }
  })();

  const showWizard = view.name === "wizard";

  return (
    <main className="shell">
      {error ? <ErrorCard message={error} /> : null}
      {session && wstat && (view.name === "dashboard" || view.name === "picker") ? (
        <RunReminder status={wstat}
          projectNote={view.name === "picker" || view.dir !== session.dir ? folderName(session.dir) : null}
          onReturn={returnToTask} />
      ) : null}
      {body}
      {session ? (
        <div style={showWizard ? undefined : { display: "none" }}>
          <Wizard key={session.id} dir={session.dir} resume={session.resume}
            onDone={endSession} onHome={goHome} onStatus={setWstat} />
        </div>
      ) : null}
    </main>
  );
}
