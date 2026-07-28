import type { ProjectActivity } from "../../shared/ipc";

export function TownSquarePlaceholder({ projectName, activity }: {
  projectName: string;
  activity: ProjectActivity;
}) {
  const status = activity === "thinking"
    ? "thinking"
    : activity === "working"
      ? "worker task active"
      : activity === "complete"
        ? "task finished"
        : "ready";
  return (
    <section className="town-placeholder" aria-label={`${projectName} town square`}>
      <div className="town-skyglow" aria-hidden="true" />
      <div className="town-grid" aria-hidden="true" />
      <div className={`town-cairn town-cairn-${activity}`}>
        <span className="town-cairn-orbit" aria-hidden="true" />
        <span className="town-cairn-core" aria-hidden="true">C</span>
        <strong>Cairn</strong>
        <span>{status}</span>
      </div>
      <p className="town-placeholder-note">The square shows only real project activity.</p>
    </section>
  );
}
