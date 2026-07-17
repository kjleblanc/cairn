import type { Preflight } from "../../shared/ipc";
import { Card, Pill } from "../components/Ui";
import { cairn } from "../api";

export function Welcome({ preflight, hasRecent, onRecheck, onOpenFolder, onNew, onBrowseRecent }: {
  preflight: Preflight; hasRecent: boolean;
  onRecheck: () => void; onOpenFolder: () => void; onNew: () => void; onBrowseRecent: () => void;
}) {
  if (!preflight.claudeReady) {
    return (
      <div style={{ maxWidth: 560, margin: "48px auto" }}>
        <h1>Almost ready</h1>
        {preflight.reason === "no-sdk" ? (
          <Card>
            <p>A piece of Cairn didn't come along properly. Reinstalling the app usually fixes it.</p>
            <p className="small muted">If it keeps happening, the app's log file has the details for anyone helping you.</p>
          </Card>
        ) : (
          <Card>
            <p>Cairn builds with Claude, and Claude isn't signed in on this computer yet. One-time setup:</p>
            <p>1. Install Claude Code from <button className="pill pill-quiet" onClick={() => void cairn.openExternal("https://claude.com/claude-code")}>claude.com/claude-code</button></p>
            <p>2. Open it once and sign in with your Claude account.</p>
            <p>3. Come back here and check again.</p>
          </Card>
        )}
        <div className="row" style={{ marginTop: 16 }}>
          <Pill kind="primary" onClick={onRecheck}>Check again</Pill>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "48px auto", textAlign: "center" }}>
      <h1>Welcome to Cairn</h1>
      <p className="muted">Build software with AI, one safe step at a time. Every task ends with something you can see.</p>
      <div className="row" style={{ justifyContent: "center", marginTop: 24 }}>
        <Pill kind="primary" onClick={onNew}>Start a new project</Pill>
        <Pill onClick={onOpenFolder}>Open a project folder</Pill>
      </div>
      {hasRecent ? (
        <p style={{ marginTop: 16 }}>
          <button className="pill pill-quiet" onClick={onBrowseRecent}>Your recent projects</button>
        </p>
      ) : null}
    </div>
  );
}
