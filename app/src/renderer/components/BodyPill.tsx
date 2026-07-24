import { useState } from "react";
import type { ConductorStatus, ConductorTurn } from "../../shared/ipc";
import { cairn } from "../api";
import { Pill } from "./Ui";

function replyLine(turn: ConductorTurn): string | null {
  if (turn.tokens === undefined && turn.costUsd === undefined) return null;
  const parts: string[] = [];
  if (turn.tokens !== undefined) parts.push(`${turn.tokens} tokens`);
  if (turn.costUsd !== undefined) parts.push(`$${turn.costUsd.toFixed(4)}`);
  return parts.join(" · ");
}

/** The always-visible body indicator (provider · model · connected). Clicking
 * opens a small panel to change the model within the same provider (no
 * re-consent needed) or disconnect (wipes the stored key). */
export function BodyPill({ status, lastReply, onModelSaved, onDisconnected }: {
  status: ConductorStatus;
  lastReply: ConductorTurn | null;
  onModelSaved: (model: string) => void;
  onDisconnected: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState(status.model);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!model.trim() || saving) return;
    setSaving(true);
    setError(null);
    const response = await cairn.conductorSetModel(model.trim());
    setSaving(false);
    if (!response.ok) { setError(response.message); return; }
    onModelSaved(model.trim());
    setOpen(false);
  }

  async function disconnect() {
    if (disconnecting) return;
    setDisconnecting(true);
    setError(null);
    const response = await cairn.conductorDisconnect();
    setDisconnecting(false);
    if (!response.ok) { setError(response.message); return; }
    onDisconnected();
  }

  const line = lastReply ? replyLine(lastReply) : null;

  return (
    <span className="body-pill-wrap">
      <button type="button" className="pill pill-quiet" onClick={() => setOpen((o) => !o)}>
        {status.provider} · {status.model}
      </button>
      {open ? (
        <div className="body-pill-panel">
          {error ? <p className="small" style={{ color: "var(--stop)" }}>{error}</p> : null}
          <label className="small muted" style={{ display: "block", marginBottom: 4 }}>Model</label>
          <input type="text" value={model} onChange={(e) => setModel(e.target.value)} />
          <div className="row" style={{ marginTop: 10 }}>
            <Pill onClick={() => void save()} disabled={saving || !model.trim()}>{saving ? "Saving…" : "Save"}</Pill>
            <Pill kind="danger" onClick={() => void disconnect()} disabled={disconnecting}>Disconnect</Pill>
          </div>
          {line ? <p className="small muted" style={{ marginTop: 10 }}>Last reply: {line}</p> : null}
        </div>
      ) : null}
    </span>
  );
}
