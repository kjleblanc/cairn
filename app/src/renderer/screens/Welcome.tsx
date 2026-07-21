import type { Preflight } from "../../shared/ipc";
import { Card, Pill } from "../components/Ui";

export function Welcome({ preflight, hasRecent, onOpenFolder, onNew, onBrowseRecent }: {
  preflight: Preflight; hasRecent: boolean; onOpenFolder: () => void; onNew: () => void; onBrowseRecent: () => void;
}) {
  return (
    <div style={{ maxWidth: 620, margin: "42px auto" }}>
      <p className="eyebrow">welcome to Cairn</p>
      <h1>One project. One task. One honest result.</h1>
      <p className="muted">Cairn helps beginners keep AI-assisted work understandable and recoverable. This reset begins with one serial path.</p>
      <Card title="how it works">
        <ol className="welcome-steps">
          <li>Create a project, open one that already uses Cairn, or follow Project Conversion for existing work.</li>
          <li>Describe one visible outcome in plain language.</li>
          <li>Cairn recommends only a connected compatible route, runs one task, checks it, and records the real result.</li>
        </ol>
      </Card>
      <Card title={preflight.mock ? "offline demonstration is available" : "model connection comes next"}>
        <p>{preflight.mock
          ? "This local session can demonstrate route → run → check → result without a model. It will clearly say that your requested product change was not attempted."
          : "No model is connected by this foundation. You can manage projects and enter a task; Cairn will stop at the connection-required step without creating task records."}</p>
      </Card>
      <div className="row">
        <Pill kind="primary" onClick={onNew}>Start a new project</Pill>
        <Pill onClick={onOpenFolder}>Open a project folder</Pill>
        {hasRecent ? <Pill kind="quiet" onClick={onBrowseRecent}>Recent projects</Pill> : null}
      </div>
    </div>
  );
}
