import { useState } from "react";
import type { ProjectStatus } from "@cairn/core";
import type { ConvertInspection } from "../../shared/ipc";
import { Card, ErrorCard, Pill } from "./Ui";
import { cairn } from "../api";

/**
 * Task 161: the conversion panel. Cairn has already looked at the folder
 * (read-only) — this screen shows what it found and what it would add, asks
 * the same four questions a new project asks, and converts only on the
 * owner's click. Nothing on this screen can overwrite: core's convertProject
 * only creates new paths, and the refusal cases render without a button.
 */
export function ConvertPanel({ dir, inspection, onConverted, onBack }: {
  dir: string;
  inspection: ConvertInspection;
  onConverted: (dir: string, status: ProjectStatus) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(inspection.suggestedName);
  const [what, setWhat] = useState("");
  const [who, setWho] = useState("");
  const [milestone, setMilestone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function convert() {
    if (!name.trim() || !what.trim() || !who.trim() || !milestone.trim()) {
      setError("Fill in all four answers — they're what Cairn writes into the rulebook.");
      return;
    }
    setBusy(true);
    const r = await cairn.projectConvert({ dir, name, what, who, milestone });
    setBusy(false);
    if (r.ok) onConverted(dir, r.value.status);
    else setError(r.message);
  }

  if (inspection.alreadyCairn) {
    return (
      <div style={{ maxWidth: 560, margin: "24px auto" }}>
        <h1>Already a Cairn project</h1>
        <Card>
          <p className="small">That folder already has a Cairn rulebook — there's nothing to convert. Open it directly instead.</p>
          <p className="small muted mono">{dir}</p>
        </Card>
        <div className="row">
          <Pill kind="quiet" onClick={onBack}>Back</Pill>
        </div>
      </div>
    );
  }

  if (inspection.agentsConflict) {
    return (
      <div style={{ maxWidth: 560, margin: "24px auto" }}>
        <h1>This folder has its own rules</h1>
        <Card>
          <p className="small">There's already an <span className="mono">AGENTS.md</span> in this folder, and Cairn never overwrites existing rules. The guided Project Conversion flow in the guides reads the conflict with you and decides together which rules govern.</p>
          <p className="small muted mono">{dir}</p>
        </Card>
        <div className="row">
          <Pill kind="quiet" onClick={onBack}>Back</Pill>
        </div>
      </div>
    );
  }

  const found: string[] = [];
  if (inspection.git.isRepo) {
    found.push(
      `a git repository${inspection.git.branch ? ` on branch ${inspection.git.branch}` : ""}` +
      (inspection.git.dirty > 0 || inspection.git.untracked > 0
        ? ` — ${inspection.git.dirty} changed and ${inspection.git.untracked} untracked path(s), all left exactly as they are`
        : ""),
    );
  } else {
    found.push("no git repository yet — Cairn will start one, because tasks need it to protect your work");
  }
  for (const rel of inspection.kept) found.push(`${rel} already exists — kept as found, not overwritten`);
  for (const rel of inspection.otherRules) found.push(`${rel} — another tool's rules, left in place and still governing that tool`);

  return (
    <div style={{ maxWidth: 560, margin: "24px auto" }}>
      <h1>Convert an existing project</h1>
      <p className="muted">Cairn looked first. Conversion only adds — nothing you have is overwritten, moved, or deleted.</p>
      {error ? <ErrorCard message={error} /> : null}
      <Card title="what cairn found">
        <p className="small mono muted">{dir}</p>
        <ul className="small" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          {found.map((line) => <li key={line}>{line}</li>)}
        </ul>
        {inspection.legacyState ? (
          <p className="small" style={{ marginTop: 8 }}>
            This folder also has legacy Cairn runtime state (<span className="mono">.git/cairn</span>). It stays untouched —
            but new tasks will wait until it's migrated in a separate, reviewed step.
          </p>
        ) : null}
      </Card>
      <Card title="what cairn will add">
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li><span className="mono">AGENTS.md</span> — the rulebook, filled with your four answers below</li>
          <li><span className="mono">docs/ai-work/</span> — the project records, plus a conversion report listing what was added and what stayed untouched</li>
          <li>
            {inspection.git.identitySet
              ? "one git commit containing only those new files — your existing work is never swept in"
              : "the files are written but not committed — git has no name and email set on this machine yet"}
          </li>
        </ul>
      </Card>
      <Card>
        <p>What's the project called?</p>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipe Box" />
        <p style={{ marginTop: 10 }}>What do you want to build?</p>
        <input type="text" value={what} onChange={(e) => setWhat(e.target.value)} placeholder="A simple app where I can save and search my recipes" />
        <p style={{ marginTop: 10 }}>Who will use it?</p>
        <input type="text" value={who} onChange={(e) => setWho(e.target.value)} placeholder="Just me, maybe my family later" />
        <p style={{ marginTop: 10 }}>What's the first thing you want to SEE working?</p>
        <input type="text" value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="A page that lists three of my recipes" />
      </Card>
      <div className="row">
        <Pill kind="primary" onClick={() => void convert()} disabled={busy}>{busy ? "Converting…" : "Convert this project"}</Pill>
        <Pill kind="quiet" onClick={onBack}>Back</Pill>
      </div>
    </div>
  );
}
