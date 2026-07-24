import { useEffect, useState, type ReactNode } from "react";
import type { ConductorConsentCard } from "../../shared/ipc";
import { cairn } from "../api";
import { Card, ErrorCard, Pill } from "./Ui";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 10 }}>
      <label className="small muted" style={{ display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

/** The connect flow's standing-consent card: the owner sees exactly what
 * main will re-derive and check before it ever stores a key (the dispatch-gate
 * pattern from tasks.ts) — the consent strings shown here always come from
 * `conductor:consentCard`, never a renderer-side copy. */
export function ConnectCard({ onConnected }: { onConnected: () => void }) {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [checked, setChecked] = useState(false);
  const [card, setCard] = useState<ConductorConsentCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    try {
      new URL(baseUrl.trim());
    } catch {
      setCard(null);
      return;
    }
    void cairn.conductorConsentCard(baseUrl.trim(), model.trim()).then((response) => {
      if (!cancelled) setCard(response.ok ? response.value : null);
    });
    return () => { cancelled = true; };
  }, [baseUrl, model]);

  async function connect() {
    if (!card || !checked || !model.trim() || !apiKey.trim() || connecting) return;
    setConnecting(true);
    setError(null);
    try {
      const response = await cairn.conductorConnect({ card, apiKey, consentConfirmed: true });
      if (!response.ok) { setError(response.message); return; }
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApiKey(""); // the key field is cleared after a connect attempt either way, even a rejected invoke
      setConnecting(false);
    }
  }

  return (
    <Card title="connect cairn's brain">
      <p>Cairn can talk with you once a model is connected. Nothing is sent until you connect.</p>
      {error ? <ErrorCard message={error} /> : null}

      <Field label="Provider base URL">
        <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
      </Field>
      <Field label="Model">
        <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. moonshotai/kimi-k2" />
      </Field>
      <Field label="API key">
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Stored encrypted; shown never again" />
      </Field>

      {card ? (
        <div style={{ marginTop: 14 }}>
          <p className="small"><strong>What may flow:</strong> {card.data}</p>
          <p className="small"><strong>Cost:</strong> {card.cost}</p>
        </div>
      ) : (
        <p className="small muted" style={{ marginTop: 14 }}>Enter a provider base URL to see what Cairn will share.</p>
      )}

      <label className="row" style={{ marginTop: 14, alignItems: "flex-start" }}>
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>I understand what will be shared and that conversation costs money on my account</span>
      </label>

      <div className="row" style={{ marginTop: 14 }}>
        <Pill kind="primary" disabled={!card || !checked || !model.trim() || !apiKey.trim() || connecting} onClick={() => void connect()}>
          {connecting ? "Connecting…" : "Connect"}
        </Pill>
      </div>
    </Card>
  );
}
