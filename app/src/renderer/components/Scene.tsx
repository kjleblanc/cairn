/** The log made visible: one stone per closed task on a faded hillside, a dotted trace winding up.
 * `fill` renders full-bleed (100% height, cropped to cover) instead of the Dashboard's
 * fixed-aspect strip — used by the chat screen so the scene fills the whole window. */
export function Scene({ stones, justAdded, fill }: { stones: number; justAdded: boolean; fill?: boolean }) {
  const visible = Math.min(stones, 7);
  const rows: { cx: number; cy: number; rx: number; ry: number }[] = [];
  let cy = 112, rx = 27, ry = 7.5;
  for (let i = 0; i < visible; i++) {
    rows.push({ cx: 382, cy, rx, ry });
    cy -= ry + 5;
    rx *= 0.8; ry *= 0.93;
  }
  return (
    <svg viewBox="0 0 640 140" width="100%" height={fill ? "100%" : undefined}
      preserveAspectRatio={fill ? "xMidYMid slice" : undefined}
      role="img" aria-label={`Your cairn: ${stones} ${stones === 1 ? "stone" : "stones"}`}>
      <ellipse cx="100" cy="30" rx="36" ry="11" fill="var(--cloud)" />
      <ellipse cx="530" cy="22" rx="44" ry="12" fill="var(--cloud)" />
      <ellipse cx="300" cy="185" rx="430" ry="85" fill="var(--hill-back)" />
      <ellipse cx="580" cy="195" rx="320" ry="75" fill="var(--hill-front)" />
      <path d="M60 132 C 150 128, 200 122, 250 116 S 330 104, 352 96"
        fill="none" stroke="var(--trail)" strokeWidth="1.5" strokeDasharray="1 6" strokeLinecap="round" />
      <circle cx="120" cy="129" r="2.5" fill="var(--trail)" />
      <circle cx="250" cy="116" r="2.5" fill="var(--trail)" />
      <circle cx="352" cy="96" r="2.5" fill="var(--green)" />
      {rows.map((r, i) => {
        const top = i === visible - 1;
        return (
          <ellipse key={i} cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry}
            fill={top ? "var(--green)" : i % 2 ? "var(--stone-a)" : "var(--stone-b)"}
            className={top ? (justAdded ? "stone-top stone-drop" : "stone-top") : undefined} />
        );
      })}
      {stones > 7 ? (
        <text x="440" y="70" fontSize="12" fill="var(--muted)" fontFamily="var(--mono)">{stones} stones</text>
      ) : null}
    </svg>
  );
}
