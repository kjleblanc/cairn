import { useCallback, useEffect, useState } from "react";
import type { ProjectStatus } from "@cairn/core";
import type { Preflight } from "../shared/ipc";
import { cairn } from "./api";
import { Overlay } from "./components/Overlay";
import { ErrorCard } from "./components/Ui";
import { Picker } from "./screens/Picker";
import { Settings } from "./screens/Settings";
import { Welcome } from "./screens/Welcome";
import { Workspace } from "./screens/Workspace";

// The shell is one world, not a page router. The base view — welcome, the
// project picker before any project is open, or the workspace — stays
// mounted while settings and the in-project picker open as overlays above
// it, so entering a menu never throws the world (sky, town, chat state)
// away. Closing the overlay reveals the exact scene the owner left.
type BaseView =
  | { name: "loading" }
  | { name: "welcome"; preflight: Preflight; hasRecent: boolean }
  | { name: "picker"; startNew: boolean; note?: string }
  | { name: "workspace"; dir: string; status: ProjectStatus };

type OverlayView = { name: "settings" } | { name: "picker"; startNew: boolean };

export function App() {
  const [view, setView] = useState<BaseView>({ name: "loading" });
  const [overlay, setOverlay] = useState<OverlayView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  // Bumped on every explicit entry into a project, so Workspace remounts
  // fresh even when the dir alone would not change the key — the workspace
  // can switch projects internally without the shell knowing, and an
  // overlay-opened project must not inherit that stale internal state.
  const [session, setSession] = useState(0);
  // Task 160: a checkup suggestion's words, carried into the workspace's
  // composer exactly once per explicit entry. Every openProject call resets
  // it, so a stale seed can never follow the owner into a later visit.
  const [composerSeed, setComposerSeed] = useState<string | null>(null);

  const enterWorkspace = useCallback((dir: string, status: ProjectStatus) => {
    setError(null);
    setOverlay(null);
    setSession((value) => value + 1);
    setView({ name: "workspace", dir, status });
  }, []);

  const openProject = useCallback(async (dir: string, composerText?: string) => {
    // A fresh attempt starts clean: the previous failure never rides along
    // while this one is in flight.
    setError(null);
    setComposerSeed(composerText ?? null);
    const response = await cairn.projectOpen(dir);
    if (response.ok) enterWorkspace(dir, response.value);
    else { setError(response.message); setComposerSeed(null); }
  }, [enterWorkspace]);

  // A governed project boots into the persistent workspace with Chat selected.
  // The dashboard stays inside that workspace behind chat's own back control. On
  // failure, autoOpen (an explicit CAIRN_OPEN target) lands on a working screen
  // — the picker, or the welcome when nothing is remembered — with the error
  // dismissible on top, while a stale last-recent entry falls back to the
  // picker with a plain note instead of a dead end.
  const boot = useCallback(async () => {
    const preflight = await cairn.preflight();
    setMock(preflight.mock);
    const list = await cairn.projectList();
    if (list.autoOpen) {
      const response = await cairn.projectOpen(list.autoOpen);
      if (response.ok) { enterWorkspace(list.autoOpen, response.value); return; }
      setError(response.message);
      setView(list.recent.length > 0
        ? { name: "picker", startNew: false }
        : { name: "welcome", preflight, hasRecent: false });
      return;
    }
    const last = list.recent[0];
    if (last) {
      const response = await cairn.projectOpen(last.dir);
      if (response.ok) { enterWorkspace(last.dir, response.value); return; }
      setView({ name: "picker", startNew: false, note: `Cairn couldn't reopen ${last.name || "your last project"} — the folder may have moved or lost its rulebook.` });
      return;
    }
    setView({ name: "welcome", preflight, hasRecent: false });
  }, [enterWorkspace]);

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
        onOpenSuggestion={(dir, text) => void openProject(dir, text)}
        onOpenFolder={() => void pickAndOpen()}
        onCreated={enterWorkspace}
        onSettings={() => setOverlay({ name: "settings" })} />;
      case "workspace": return <Workspace key={`${view.dir}:${session}`}
        initialDir={view.dir} initialStatus={view.status}
        composerSeed={composerSeed}
        demoAvailable={mock}
        onOpenProjects={() => setOverlay({ name: "picker", startNew: false })}
        onCreateProject={() => setOverlay({ name: "picker", startNew: true })}
        onSettings={() => setOverlay({ name: "settings" })} />;
    }
  })();

  return (
    <main className="shell">
      {error ? <div className="app-error-overlay"><ErrorCard message={error} onDismiss={() => setError(null)} /></div> : null}
      {/* `inert` (with aria-hidden for assistive tech) takes the world out of
          the tab order and pointer reach while an overlay is up; the scrim
          already blocks clicks, inert blocks the keyboard. */}
      <div className="shell-base" aria-hidden={overlay ? "true" : undefined}
        ref={(el) => el?.toggleAttribute("inert", overlay !== null)}>
        {body}
      </div>
      {overlay ? (
        <Overlay label={overlay.name === "settings" ? "Settings" : "Your projects"}
          onClose={() => {
            setOverlay(null);
            // A failure raised inside the overlay (a folder that wouldn't
            // open) belongs to it: closing the overlay acknowledges and
            // clears it, so it never follows the owner across screens.
            setError(null);
          }}>
          {overlay.name === "settings" ? (
            <Settings onBack={() => setOverlay(null)} />
          ) : (
            <Picker startNew={overlay.startNew} note={null}
              onOpen={(dir) => void openProject(dir)}
              onOpenSuggestion={(dir, text) => void openProject(dir, text)}
              onOpenFolder={() => void pickAndOpen()}
              onCreated={enterWorkspace}
              onSettings={() => setOverlay({ name: "settings" })} />
          )}
        </Overlay>
      ) : null}
    </main>
  );
}
