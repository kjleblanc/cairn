import type { CheckupFinding, CheckupGroup, CheckupReport } from "../../shared/ipc";
import { Pill } from "./Ui";

/**
 * Task 160: the checkup report card. It only ever REPORTS — every finding
 * is read-only text built in main, and a suggestion chip hands its words to
 * the owner (pre-filled in the composer after the project opens), never to
 * a dispatch and never sent on its own.
 */

const GROUP_ORDER: Array<{ key: CheckupGroup; label: string; mark: string }> = [
  { key: "risk", label: "Risk", mark: "checkup-mark checkup-mark-risk" },
  { key: "attention", label: "Needs attention", mark: "checkup-mark checkup-mark-attention" },
  { key: "healthy", label: "Healthy", mark: "checkup-mark checkup-mark-healthy" },
];

const STATE_LABEL: Record<string, string> = {
  done: "DONE",
  stopped: "STOPPED",
  inflight: "unfinished",
  unlogged: "not in the log",
};

function Finding({ finding, onSuggestion }: { finding: CheckupFinding; onSuggestion: (text: string) => void }) {
  return (
    <div className="checkup-finding">
      <p><strong>{finding.title}</strong></p>
      <p className="small muted">{finding.detail}</p>
      {finding.suggestion && finding.suggestionLabel ? (
        <Pill kind="quiet" onClick={() => onSuggestion(finding.suggestion ?? "")}>→ {finding.suggestionLabel}</Pill>
      ) : null}
    </div>
  );
}

export function CheckupCard({ report, onClose, onSuggestion }: {
  report: CheckupReport;
  onClose: () => void;
  onSuggestion: (text: string) => void;
}) {
  const countsLine = [
    report.counts.done > 0 ? `${report.counts.done} done` : null,
    report.counts.stopped > 0 ? `${report.counts.stopped} stopped` : null,
    report.counts.inFlight > 0 ? `${report.counts.inFlight} unfinished` : null,
    report.counts.unlogged > 0 ? `${report.counts.unlogged} not in the log` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="checkup-scrim" role="dialog" aria-modal="true"
      aria-label={`Checkup report for ${report.name}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card checkup-card">
        <div className="row spread">
          <h2 className="checkup-heading">{report.name} — checkup</h2>
          <Pill kind="quiet" onClick={onClose}>Close</Pill>
        </div>
        <p className="checkup-verdict">{report.verdict}</p>
        <p className="small muted">{report.verdictNote}</p>

        {report.counts.total > 0 ? (
          <>
            <div className="checkup-trail" role="img"
              aria-label={`Task record trail: ${countsLine}, across ${report.counts.total} tasks.`}>
              {report.trail.map((t) => (
                <i key={t.n} className={`checkup-cell checkup-cell-${t.state}`}
                  title={`Task ${String(t.n).padStart(3, "0")} — ${STATE_LABEL[t.state] ?? t.state}`} />
              ))}
            </div>
            <p className="small muted">One cell per task, oldest first · {countsLine}</p>
          </>
        ) : (
          <p className="small muted">No tasks yet — the trail starts with the first brief.</p>
        )}

        {GROUP_ORDER.map(({ key, label, mark }) => {
          const items = report.findings.filter((f) => f.group === key);
          if (items.length === 0) return null;
          return (
            <section key={key} className="checkup-group">
              <p className="checkup-group-title"><span className={mark} aria-hidden="true" />{label}<span className="muted">{items.length}</span></p>
              {items.map((f, i) => <Finding key={i} finding={f} onSuggestion={onSuggestion} />)}
            </section>
          );
        })}

        <p className="small muted checkup-basis">Checked just now · this report only reads — nothing was changed.</p>
      </div>
    </div>
  );
}
