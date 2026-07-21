import { useEffect, useRef } from "react";
import type { SerialActivity } from "@cairn/core";

export function ActivityFeed({ activities }: { activities: SerialActivity[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [activities.length]);
  if (activities.length === 0) return null;
  return (
    <div className="feed" ref={ref} role="log" aria-label="Task activity" aria-live="polite">
      {activities.map((activity, index) => (
        <div className={`activity activity-${activity.state}`} key={`${activity.stage}-${index}`}>
          <strong>{activity.stage}</strong>
          <span>{activity.detail}</span>
        </div>
      ))}
    </div>
  );
}
