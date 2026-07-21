import { useCallback, useEffect, useState } from "react";
import type { ProjectStatus } from "@cairn/core";
import type { Preflight } from "../shared/ipc";
import { cairn } from "./api";
import { ErrorCard } from "./components/Ui";
import { Dashboard } from "./screens/Dashboard";
import { Picker } from "./screens/Picker";
import { Settings } from "./screens/Settings";
import { TaskRun } from "./screens/TaskRun";
import { Welcome } from "./screens/Welcome";

type View =
  | { name: "loading" }
  | { name: "welcome"; preflight: Preflight; hasRecent: boolean }
  | { name: "picker"; startNew: boolean; note?: string }
  | { name: "dashboard"; dir: string; status: ProjectStatus }
  | { name: "task"; dir: string }
  | { name: "settings"; dir: string | null };

export function App() {
  const [view, setView] = useState<View>({ name: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [mock, setMock] = useState(false);

  const openProject = useCallback(async (dir: string) => {
    const response = await cairn.projectOpen(dir);
    if (response.ok) { setError(null); setView({ name: "dashboard", dir, status: response.value }); }
    else setError(response.message);
  }, []);

  const boot = useCallback(async () => {
    const preflight = await cairn.preflight();
    setMock(preflight.mock);
    const list = await cairn.projectList();
    if (list.autoOpen) { await openProject(list.autoOpen); return; }
    const last = list.recent[0];
    if (last) {
      const response = await cairn.projectOpen(last.dir);
      if (response.ok) { setView({ name: "dashboard", dir: last.dir, status: response.value }); return; }
      setView({ name: "picker", startNew: false, note: `Cairn couldn't reopen ${last.name || "your last project"} — the folder may have moved or lost its rulebook.` });
      return;
    }
    setView({ name: "welcome", preflight, hasRecent: false });
  }, [openProject]);

  useEffect(() => { void boot(); }, [boot]);

  const pickAndOpen = useCallback(async () => {
    const dir = await cairn.projectPickFolder();
    if (dir) await openProject(dir);
  }, [openProject]);

  const body = (() => {
    switch (view.name) {
      case "loading": return <p className="muted">Getting ready…</p>;
      case "welcome": return <Welcome preflight={view.preflight} hasRecent={view.hasRecent}
        onOpenFolder={() => void pickAndOpen()}
        onNew={() => setView({ name: "picker", startNew: true })}
        onBrowseRecent={() => setView({ name: "picker", startNew: false })} />;
      case "picker": return <Picker startNew={view.startNew} note={view.note ?? null}
        onOpen={(dir) => void openProject(dir)}
        onOpenFolder={() => void pickAndOpen()}
        onCreated={(dir, status) => setView({ name: "dashboard", dir, status })}
        onSettings={() => setView({ name: "settings", dir: null })} />;
      case "dashboard": return <Dashboard dir={view.dir} status={view.status}
        onStartTask={() => setView({ name: "task", dir: view.dir })}
        onSwitch={() => setView({ name: "picker", startNew: false })}
        onOpenProject={(dir) => void openProject(dir)}
        onSettings={() => setView({ name: "settings", dir: view.dir })} />;
      case "task": return <TaskRun dir={view.dir} demoAvailable={mock} onBack={() => void openProject(view.dir)} />;
      case "settings": return <Settings onBack={() => view.dir ? void openProject(view.dir) : setView({ name: "picker", startNew: false })} />;
    }
  })();

  return <main className="shell">{error ? <ErrorCard message={error} /> : null}{body}</main>;
}
