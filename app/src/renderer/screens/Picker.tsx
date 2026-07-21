import { useEffect, useState } from "react";
import type { ProjectStatus } from "@cairn/core";
import type { RecentProject } from "../../shared/ipc";
import { Card, ErrorCard, Pill } from "../components/Ui";
import { cairn } from "../api";

type Draft = { dir: string; name: string; what: string; who: string; milestone: string; timebox: string };
const emptyDraft: Draft = { dir: "", name: "", what: "", who: "", milestone: "", timebox: "two Standard tasks without visible progress (default)" };

/** A plain phrase for when a project was last opened; empty when the time is unknown. */
function lastOpenedText(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return "last opened today";
  if (days === 1) return "last opened yesterday";
  if (days < 30) return `last opened ${days} days ago`;
  return `last opened ${new Date(t).toLocaleDateString()}`;
}

export function Picker({ startNew, note, onOpen, onOpenFolder, onCreated, onSettings }: {
  startNew: boolean; note: string | null; onOpen: (dir: string) => void; onOpenFolder: () => void;
  onCreated: (dir: string, status: ProjectStatus) => void; onSettings: () => void;
}) {
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [creating, setCreating] = useState(startNew);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void cairn.projectList().then((l) => setRecent(l.recent)); }, []);

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [k]: e.target.value });

  // Remove one entry from the app's own remembered list — never the folder itself.
  async function forget(dir: string) {
    const r = await cairn.projectForget(dir);
    if (!r.ok) { setError(r.message); return; }
    const l = await cairn.projectList();
    setRecent(l.recent);
  }

  async function create() {
    if (!draft.dir || !draft.name.trim() || !draft.milestone.trim()) {
      setError("Pick an empty folder and fill in at least the name and the first thing you want to see.");
      return;
    }
    setBusy(true);
    const r = await cairn.projectInit(draft);
    setBusy(false);
    if (r.ok) onCreated(draft.dir, r.value);
    else setError(r.message);
  }

  if (creating) {
    return (
      <div style={{ maxWidth: 560, margin: "24px auto" }}>
        <h1>A new project</h1>
        <p className="muted">Five questions, then your project gets its rulebook.</p>
        {error ? <ErrorCard message={error} /> : null}
        <Card>
          <p className="card-title">where it lives</p>
          <div className="row">
            <Pill onClick={() => void cairn.projectPickFolder().then((d) => d && setDraft({ ...draft, dir: d }))}>
              {draft.dir ? "Change folder" : "Choose an empty folder"}
            </Pill>
            {draft.dir ? <span className="mono small">{draft.dir}</span> : null}
          </div>
        </Card>
        <Card>
          <p>What's the project called?</p>
          <input type="text" value={draft.name} onChange={set("name")} placeholder="Recipe Box" />
          <p style={{ marginTop: 10 }}>What do you want to build?</p>
          <input type="text" value={draft.what} onChange={set("what")} placeholder="A simple app where I can save and search my recipes" />
          <p style={{ marginTop: 10 }}>Who will use it?</p>
          <input type="text" value={draft.who} onChange={set("who")} placeholder="Just me, maybe my family later" />
          <p style={{ marginTop: 10 }}>What's the first thing you want to SEE working?</p>
          <input type="text" value={draft.milestone} onChange={set("milestone")} placeholder="A page that lists three of my recipes" />
          <p style={{ marginTop: 10 }}>Timebox before rethinking the approach</p>
          <input type="text" value={draft.timebox} onChange={set("timebox")} />
        </Card>
        <div className="row">
          <Pill kind="primary" onClick={() => void create()} disabled={busy}>{busy ? "Setting up…" : "Create the project"}</Pill>
          <Pill kind="quiet" onClick={() => setCreating(false)}>Back</Pill>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "24px auto" }}>
      <div className="row spread">
        <h1>Your projects</h1>
        <button className="pill pill-quiet" onClick={onSettings}>Settings</button>
      </div>
      {note ? <p className="note-banner">{note}</p> : null}
      {recent.map((r) => r.ok ? (
        <button key={r.dir} className="card" style={{ width: "100%", textAlign: "left", border: "none", cursor: "pointer", font: "inherit" }}
          onClick={() => onOpen(r.dir)}>
          <div className="row spread">
            <div>
              <strong>{r.name || "Unnamed project"}</strong>
              <p className="small muted">{r.milestone || "milestone not set"}</p>
              {lastOpenedText(r.lastOpened) ? <p className="small muted">{lastOpenedText(r.lastOpened)}</p> : null}
            </div>
            <span className="badge badge-done">{r.stones} {r.stones === 1 ? "stone" : "stones"}</span>
          </div>
        </button>
      ) : (
        <div key={r.dir} className="card">
          <div className="row spread">
            <div>
              <strong>{r.name || "Unnamed project"}</strong>
              <p className="small muted mono">{r.dir}</p>
              <p className="small">Cairn can't find this project — the folder may have moved or lost its rulebook.</p>
              {lastOpenedText(r.lastOpened) ? <p className="small muted">{lastOpenedText(r.lastOpened)}</p> : null}
            </div>
            <Pill kind="quiet" onClick={() => void forget(r.dir)}>Remove from this list</Pill>
          </div>
        </div>
      ))}
      {recent.length === 0 ? <p className="muted">Nothing here yet.</p> : null}
      <div className="row" style={{ marginTop: 16 }}>
        <Pill kind="primary" onClick={() => setCreating(true)}>Start a new project</Pill>
        <Pill onClick={onOpenFolder}>Open a project folder</Pill>
      </div>
      <Card title="bring an existing project">
        <p className="small">A folder that already has a Cairn contract can be opened directly. For other existing work, follow Project Conversion in the guides.</p>
        <p className="small muted">This reset does not transform legacy <span className="mono">.git/cairn</span> task state; it preserves that state and blocks new task mutation until a reviewed migration exists.</p>
      </Card>
    </div>
  );
}
