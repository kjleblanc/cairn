import { useCallback, useEffect, useState } from "react";
import type { ProjectStatus } from "@cairn/core";
import type { Preflight } from "../shared/ipc";
import { cairn } from "./api";
import { ErrorCard } from "./components/Ui";
import { Picker } from "./screens/Picker";
import { Settings } from "./screens/Settings";
import { Welcome } from "./screens/Welcome";
import { Workspace } from "./screens/Workspace";

type View =
  | { name: "loading" }
  | { name: "welcome"; preflight: Preflight; hasRecent: boolean }
  | { name: "picker"; startNew: boolean; note?: string }
  | { name: "workspace"; dir: string; status: ProjectStatus }
  | { name: "settings"; dir: string | null };

export function App() {
  const [view, setView] = useState<View>({ name: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [mock, setMock] = useState(false);

  const openProject = useCallback(async (dir: string) => {
    const response = await cairn.projectOpen(dir);
    if (response.ok) { setError(null); setView({ name: "workspace", dir, status: response.value }); }
    else setError(response.message);
  }, []);

  // A governed project boots into the persistent workspace with Chat selected.
  // The dashboard stays inside that workspace behind chat's own back control. On
  // failure, autoOpen (an explicit CAIRN_OPEN target) surfaces the error
  // overlay, while a stale last-recent entry falls back to the picker with
  // a plain note instead of a dead end.
  const boot = useCallback(async () => {
    const preflight = await cairn.preflight();
    setMock(preflight.mock);
    const list = await cairn.projectList();
    if (list.autoOpen) {
      const response = await cairn.projectOpen(list.autoOpen);
      if (response.ok) { setError(null); setView({ name: "workspace", dir: list.autoOpen, status: response.value }); }
      else setError(response.message);
      return;
    }
    const last = list.recent[0];
    if (last) {
      const response = await cairn.projectOpen(last.dir);
      if (response.ok) { setView({ name: "workspace", dir: last.dir, status: response.value }); return; }
      setView({ name: "picker", startNew: false, note: `Cairn couldn't reopen ${last.name || "your last project"} — the folder may have moved or lost its rulebook.` });
      return;
    }
    setView({ name: "welcome", preflight, hasRecent: false });
  }, []);

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
        onCreated={(dir, status) => setView({ name: "workspace", dir, status })}
        onSettings={() => setView({ name: "settings", dir: null })} />;
      case "workspace": return <Workspace initialDir={view.dir} initialStatus={view.status}
        demoAvailable={mock}
        onOpenProjects={() => setView({ name: "picker", startNew: false })}
        onCreateProject={() => setView({ name: "picker", startNew: true })}
        onSettings={() => setView({ name: "settings", dir: view.dir })} />;
      case "settings": return <Settings onBack={() => view.dir ? void openProject(view.dir) : setView({ name: "picker", startNew: false })} />;
    }
  })();

  return (
    <main className="shell">
      {error ? <div className="app-error-overlay"><ErrorCard message={error} /></div> : null}
      {body}
    </main>
  );
}
