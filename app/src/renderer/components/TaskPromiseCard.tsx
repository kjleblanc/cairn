import type { TaskRequestView } from "@cairn/core";

/**
 * What Cairn is promising to prove, shown before the worker is ever called.
 *
 * `c1` is the outcome the owner accepted; every accepted blocking requirement
 * follows in order. Nothing is merged, shortened, or dropped to keep the card
 * small, and no row is quietly turned into a preference — every row here is a
 * promise the task must actually keep.
 *
 * Each row says who will answer it: a check Cairn runs itself from this
 * project's own short menu, or the owner's own eyes. Those are the only two
 * kinds. The worker's word is never one of them; it is recorded beside them
 * afterwards as a claim.
 */

export type TaskCardCheck = Readonly<{ id: string; label: string; command: string }>;

/** `owner` means the owner looks at it; anything else is a menu check id. */
export const OWNER_OBSERVATION = "owner" as const;

export function taskCardRows(request: TaskRequestView): readonly Readonly<{ id: string; text: string; source: string }>[] {
  // The same rule Core uses: the outcome, then every accepted requirement in
  // the order it was accepted. Ids are positional, so `c2` here and `c2` in
  // Core are the same promise without needing a hash to say so.
  return [request.outcome, ...request.requirements].map((row, index) => ({
    id: `c${index + 1}`,
    text: row.text,
    source: row.source,
  }));
}

export function TaskPromiseCard({ request, menu, selections, disabled = false, onSelect }: {
  request: TaskRequestView;
  menu: readonly TaskCardCheck[];
  selections: Readonly<Record<string, string>>;
  disabled?: boolean;
  onSelect: (rowId: string, choice: string) => void;
}) {
  const rows = taskCardRows(request);
  return (
    <section className="task-promise-card" aria-label="What this task promises">
      <h3 className="task-promise-card-title">What this task promises</h3>
      <p className="task-promise-card-lead">
        Cairn will try to prove each of these. Choose how each one gets checked.
      </p>
      {menu.length === 0 ? (
        <p className="task-promise-card-nomenu">
          This project doesn&apos;t declare any commands Cairn knows how to run, so you&apos;ll
          need to look at each of these yourself.
        </p>
      ) : null}
      <ol className="task-promise-card-rows">
        {rows.map((row) => (
          <li key={row.id} className="task-promise-card-row" data-row={row.id}>
            <p className="task-promise-card-row-text">
              <span className="task-promise-card-row-id mono">{row.id}</span> {row.text}
            </p>
            <div className="task-promise-card-row-choices" role="group" aria-label={`How ${row.id} gets checked`}>
              {menu.map((check) => (
                <button
                  key={check.id}
                  type="button"
                  className={selections[row.id] === check.id ? "pill pill-primary" : "pill pill-quiet"}
                  aria-pressed={selections[row.id] === check.id}
                  disabled={disabled}
                  title={check.command}
                  onClick={() => onSelect(row.id, check.id)}
                >
                  {check.label}
                </button>
              ))}
              <button
                type="button"
                className={selections[row.id] === OWNER_OBSERVATION ? "pill pill-primary" : "pill pill-quiet"}
                aria-pressed={selections[row.id] === OWNER_OBSERVATION}
                disabled={disabled}
                onClick={() => onSelect(row.id, OWNER_OBSERVATION)}
              >
                I&apos;ll look at this myself
              </button>
            </div>
            <p className="task-promise-card-row-answerer">
              {selections[row.id] === undefined
                ? "Not chosen yet."
                : selections[row.id] === OWNER_OBSERVATION
                  ? "You will check this yourself after the work is done."
                  : `Cairn will run ${menu.find((check) => check.id === selections[row.id])?.command ?? selections[row.id]} itself.`}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
