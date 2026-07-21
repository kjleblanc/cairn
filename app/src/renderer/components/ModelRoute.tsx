import type { AdapterDescriptor } from "@cairn/core";
import { Card } from "./Ui";

export function ModelRoute({ route, reason }: { route: AdapterDescriptor; reason: string }) {
  return (
    <section aria-label="Recommended route">
      <Card title="recommended route">
        <h2>{route.label}</h2>
        <div className="route-facts">
          <p><span>Connection</span><strong>{route.connected ? "connected" : "not connected"}</strong></p>
          <p><span>Provider</span><strong>{route.provider}</strong></p>
          <p><span>Model</span><strong>{route.model}</strong></p>
        </div>
        <p className="small muted"><strong>Why this route:</strong> {reason}</p>
        {route.id === "cairn-offline-demo" ? (
          <p className="demo-note">This is a deterministic adapter demonstration, not a local model and not implementation of your requested change.</p>
        ) : null}
      </Card>
    </section>
  );
}
