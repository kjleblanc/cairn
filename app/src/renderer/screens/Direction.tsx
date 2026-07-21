import { useState } from "react";
import { cairn } from "../api";
import { Card, ErrorCard, Pill } from "../components/Ui";
import { Md } from "../components/Md";

export function Direction({ dir, reason, onBack }: { dir: string; reason: string; onBack: () => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function run() {
    const response = await cairn.taskDirection(dir, reason);
    if (response.ok) { setText(response.value.text); setError(null); }
    else setError(response.message);
  }
  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1>A direction check</h1>
      {error ? <ErrorCard message={error} /> : null}
      <div className="gate-banner"><p>{reason} Cairn will compare genuinely different options before another patch.</p></div>
      {!text ? <div className="row"><Pill kind="primary" onClick={() => void run()}>Show local direction options</Pill><Pill kind="quiet" onClick={onBack}>Back</Pill></div> : null}
      {text ? <><Card title="your options"><Md text={text} /></Card><Pill kind="primary" onClick={onBack}>Back to your project</Pill></> : null}
      <p className="small muted" style={{ marginTop: 12 }}>This reads the local project log only. No model is called and nothing is changed.</p>
    </div>
  );
}
