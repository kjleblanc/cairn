import { useState } from "react";
import type { ConductorChatTurn, ConductorStatus } from "../../shared/ipc";
import { cairn } from "../api";
import { Pill } from "./Ui";

// Only a Cairn REPLY has a token count or a cost. An envelope turn is Cairn's
// runtime speaking, not the provider, and it carries neither — so it is not a
// "last reply" this line can describe.
function replyLine(turn: ConductorChatTurn & { role: "cairn" }): string | null {
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
  lastReply: (ConductorChatTurn & { role: "cairn" }) | null;
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
      {/* Task 260 (Slice 5): the panel's spacing and its refusal colour were
        * four inline styles, which is presentation policy living in TypeScript
        * where no stylesheet test can see it — and `var(--stop)` in particular
        * is one of the paired tokens the conversation re-points, so it was
        * quietly deciding a semantic colour from here. They are classes now.
        * Nothing about what this panel does has changed. */}
      {open ? (
        <div className="body-pill-panel">
          {error ? <p className="small body-pill-error">{error}</p> : null}
          <label className="small muted body-pill-field-label">Model</label>
          <input type="text" value={model} onChange={(e) => setModel(e.target.value)} />
          <div className="row body-pill-actions">
            <Pill onClick={() => void save()} disabled={saving || !model.trim()}>{saving ? "Saving…" : "Save"}</Pill>
            <Pill kind="danger" onClick={() => void disconnect()} disabled={disconnecting}>Disconnect</Pill>
          </div>
          {line ? <p className="small muted body-pill-usage">Last reply: {line}</p> : null}
        </div>
      ) : null}
    </span>
  );
}
