import { useCallback, useEffect, useState } from "react";
import type { ProjectStatus, UnfinishedTask } from "@cairn/core";
import type { Preflight } from "../shared/ipc";
import { cairn } from "./api";
import { ErrorCard } from "./components/Ui";
import { Welcome } from "./screens/Welcome";
import { Picker } from "./screens/Picker";
import { Dashboard } from "./screens/Dashboard";
import { Wizard } from "./screens/Wizard";
import { Direction } from "./screens/Direction";
import { Settings } from "./screens/Settings";

type View =
  | { name: "loading" }
  | { name: "welcome"; preflight: Preflight; hasRecent: boolean }
  | { name: "picker"; startNew: boolean }
  | { name: "dashboard"; dir: string; status: ProjectStatus; justAdded: boolean }
  | { name: "wizard"; dir: string; resume: UnfinishedTask | null }
  | { name: "direction"; dir: string; reason: string }
  | { name: "settings"; dir: string | null };

export function App() {
  const [view, setView] = useState<View>({ name: "loading" });
  const [error, setError] = useState<string | null>(null);

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
    if (list.recent.length > 0) setView({ name: "picker", startNew: false });
    else setView({ name: "welcome", preflight: pf, hasRecent: false });
  }, [openProject]);

  useEffect(() => { void boot(); }, [boot]);

  const pickAndOpen = useCallback(async () => {
    const dir = await cairn.projectPickFolder();
    if (dir) await openProject(dir);
  }, [openProject]);

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
        return <Picker startNew={view.startNew}
          onOpen={(dir) => void openProject(dir)}
          onOpenFolder={() => void pickAndOpen()}
          onCreated={(dir, status) => setView({ name: "dashboard", dir, status, justAdded: false })}
          onSettings={() => setView({ name: "settings", dir: null })} />;
      case "dashboard":
        return <Dashboard dir={view.dir} status={view.status} justAdded={view.justAdded}
          onStartTask={() => setView({ name: "wizard", dir: view.dir, resume: null })}
          onResume={() => setView({ name: "wizard", dir: view.dir, resume: view.status.unfinished })}
          onDirection={(reason) => setView({ name: "direction", dir: view.dir, reason })}
          onSwitch={() => setView({ name: "picker", startNew: false })}
          onSettings={() => setView({ name: "settings", dir: view.dir })} />;
      case "wizard":
        return <Wizard dir={view.dir} resume={view.resume}
          onDone={(stoneAdded) => void openProject(view.dir, stoneAdded)} />;
      case "direction":
        return <Direction dir={view.dir} reason={view.reason} onBack={() => void openProject(view.dir)} />;
      case "settings":
        return <Settings onBack={() => (view.dir ? void openProject(view.dir) : setView({ name: "picker", startNew: false }))} />;
    }
  })();

  return (
    <main className="shell">
      {error ? <ErrorCard message={error} /> : null}
      {body}
    </main>
  );
}
