import { useCallback, useEffect, useState } from "react";
import type { ProjectStatus, UnfinishedTask } from "@cairn/core";
import type { Preflight } from "../shared/ipc";
import { cairn } from "./api";
import { ErrorCard } from "./components/Ui";
import { RunReminder } from "./components/RunReminder";
import { TaskDeck } from "./components/TaskDeck";
import { Welcome } from "./screens/Welcome";
import { Picker } from "./screens/Picker";
import { Dashboard } from "./screens/Dashboard";
import { Wizard, type WizardStatus } from "./screens/Wizard";
import { Direction } from "./screens/Direction";
import { Settings } from "./screens/Settings";
import {
  DEFAULT_OPENAI_PREVIEW_MODEL,
  PREVIEW_EFFORT_KEY,
  PREVIEW_MODEL_KEY,
  PREVIEW_PROVIDER_KEY,
} from "./components/modelCatalog";

type View =
  | { name: "loading" }
  | { name: "welcome"; preflight: Preflight; hasRecent: boolean }
  | { name: "picker"; startNew: boolean; note?: string }
  | { name: "dashboard"; dir: string; status: ProjectStatus; justAdded: boolean }
  | { name: "wizard"; sessionId: number }
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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [wstats, setWstats] = useState<Record<number, WizardStatus>>({});
  const [mock, setMock] = useState(false);
  const [parallelDraft, setParallelDraft] = useState(false);

  const openProject = useCallback(async (dir: string, justAdded = false) => {
    const r = await cairn.projectOpen(dir);
    if (r.ok) { setError(null); setView({ name: "dashboard", dir, status: r.value, justAdded }); }
    else setError(r.message);
  }, []);

  const boot = useCallback(async () => {
    const pf = await cairn.preflight();
    setMock(pf.mock);
    setParallelDraft(pf.parallelDraft);

    // Restore one truthful engine setup before the dashboard can render. A
    // mock OpenAI preview may return only inside this renderer window; every
    // non-mock or new-window boot uses the durable Anthropic setup.
    const restorePreview = pf.mock && sessionStorage.getItem(PREVIEW_PROVIDER_KEY) === "openai";
    const durableModel = localStorage.getItem("cairn-model") ?? "";
    const model = restorePreview
      ? sessionStorage.getItem(PREVIEW_MODEL_KEY) || DEFAULT_OPENAI_PREVIEW_MODEL
      : durableModel;
    const effort = restorePreview
      ? sessionStorage.getItem(PREVIEW_EFFORT_KEY) ?? ""
      : localStorage.getItem("cairn-effort") ?? "";
    await cairn.taskSetModel(model);
    await cairn.taskSetEffort(effort);

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

  const pickAndOpen = useCallback(async () => {
    const dir = await cairn.projectPickFolder();
    if (dir) await openProject(dir);
  }, [openProject]);

  /**
   * Enter the task walk. One walk at a time: while an agent is live, a second
   * start is refused with the engine room's own words; a walk parked at a
   * quiet step is returned to (same project) or pointed at (another project).
   */
  const enterTask = useCallback((dir: string, resume: UnfinishedTask | null) => {
    const existing = resume ? sessions.find((item) => wstats[item.id]?.taskNumber === resume.taskNumber) : undefined;
    if (existing) { setError(null); setView({ name: "wizard", sessionId: existing.id }); return; }
    if (!parallelDraft && sessions.length > 0) {
      const session = sessions[0];
      const wstat = wstats[session.id];
      const runLive = Boolean(wstat && (IN_FLIGHT.includes(wstat.phase) || wstat.waiting));
      if (runLive) { setError("One step at a time — an agent is already running."); return; }
      if (session.dir === dir) { setError(null); setView({ name: "wizard", sessionId: session.id }); return; }
      const open = wstat && wstat.taskNumber > 0 ? `Task ${String(wstat.taskNumber).padStart(3, "0")}` : "A task";
      setError(`${open} in "${folderName(session.dir)}" is still open — use the reminder to return and finish it first.`);
      return;
    }
    const refusedResume = /^PARALLEL_/.test(resume?.blocker ?? "");
    const slotConsumers = sessions.filter((session) => !/^PARALLEL_/.test(wstats[session.id]?.blocker ?? ""));
    if (parallelDraft && !refusedResume && slotConsumers.length >= 2) {
      setError("Parallel Draft allows at most two non-integrated tasks. Finish or integrate one before reserving another.");
      return;
    }
    const id = Date.now() + sessions.length;
    setError(null);
    setSessions((current) => [...current, { id, dir, resume }]);
    setView({ name: "wizard", sessionId: id });
  }, [sessions, wstats, parallelDraft]);

  /**
   * Leave the task walk without disturbing it. The untouched first screen has
   * nothing worth keeping, so it simply closes; every later step stays alive
   * behind the home screen, run and all.
   */
  const goHome = useCallback((sessionId: number) => {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return;
    const wstat = wstats[sessionId];
    if (wstat && wstat.phase === "outcome" && !wstat.waiting) {
      setSessions((current) => current.filter((item) => item.id !== sessionId));
      setWstats((current) => { const next = { ...current }; delete next[sessionId]; return next; });
    }
    void openProject(session.dir);
  }, [sessions, wstats, openProject]);

  /** The walk ended the ordinary way (closed, or left from a quiet step). */
  const endSession = useCallback((sessionId: number, stoneAdded: boolean) => {
    const dir = sessions.find((item) => item.id === sessionId)?.dir;
    setSessions((current) => current.filter((item) => item.id !== sessionId));
    setWstats((current) => { const next = { ...current }; delete next[sessionId]; return next; });
    if (dir) void openProject(dir, stoneAdded);
  }, [sessions, openProject]);

  const returnToTask = useCallback((sessionId: number) => { setError(null); setView({ name: "wizard", sessionId }); }, []);

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
        return <Dashboard dir={view.dir} status={view.status} justAdded={view.justAdded} mock={mock} parallelDraft={parallelDraft}
          onStartTask={() => enterTask(view.dir, null)}
          onResume={(task) => enterTask(view.dir, task)}
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

  const activeSessionId = view.name === "wizard" ? view.sessionId : null;
  const deckItems = sessions.flatMap((session) => {
    const status = wstats[session.id];
    return status ? [{ sessionId: session.id, status, project: folderName(session.dir) }] : [];
  });
  const legacySession = sessions[0];
  const legacyStatus = legacySession ? wstats[legacySession.id] : undefined;

  return (
    <main className="shell">
      {error ? <ErrorCard message={error} /> : null}
      {parallelDraft ? (
        <TaskDeck items={deckItems} activeSessionId={activeSessionId} onReturn={returnToTask} />
      ) : legacySession && legacyStatus && (view.name === "dashboard" || view.name === "picker") ? (
        <RunReminder status={legacyStatus}
          projectNote={view.name === "picker" || view.dir !== legacySession.dir ? folderName(legacySession.dir) : null}
          onReturn={() => returnToTask(legacySession.id)} />
      ) : null}
      {body}
      {sessions.map((session) => (
        <div key={session.id} style={activeSessionId === session.id ? undefined : { display: "none" }}>
          <Wizard dir={session.dir} resume={session.resume} sessionId={session.id} parallelDraft={parallelDraft}
            onDone={(stoneAdded) => endSession(session.id, stoneAdded)}
            onHome={() => goHome(session.id)}
            onStatus={(status) => setWstats((current) => ({ ...current, [session.id]: status }))} />
        </div>
      ))}
    </main>
  );
}
