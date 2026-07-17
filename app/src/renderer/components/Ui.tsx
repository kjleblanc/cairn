import type { ReactNode } from "react";

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="card">
      {title ? <p className="card-title">{title}</p> : null}
      {children}
    </section>
  );
}

export function Pill({ children, onClick, kind = "soft", disabled }: {
  children: ReactNode; onClick?: () => void; kind?: "primary" | "soft" | "quiet" | "danger"; disabled?: boolean;
}) {
  const cls = { primary: "pill pill-primary", soft: "pill", quiet: "pill pill-quiet", danger: "pill pill-danger" }[kind];
  return <button type="button" className={cls} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function Badge({ kind }: { kind: "DONE" | "STOPPED" | "UNKNOWN" }) {
  if (kind === "DONE") return <span className="badge badge-done">done</span>;
  return <span className="badge badge-stopped">{kind === "STOPPED" ? "stopped" : "unclear"}</span>;
}

export function ErrorCard({ message }: { message: string }) {
  return (
    <div className="error-card">
      <p>{message}</p>
      <p className="small">The technical details were saved to the app's log file.</p>
    </div>
  );
}
