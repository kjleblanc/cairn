import { useEffect, useRef, type ReactNode } from "react";

/**
 * One layer over a living world, not a page: the scene behind stays mounted
 * (the shell dims and inerts it) while a card rises over it. Three ways out —
 * the close button, a scrim click, or Escape — all settle the card back down
 * by unmounting this layer, leaving the world underneath untouched.
 */
export function Overlay({ label, onClose, children }: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus the card itself (not a control inside it) so the owner's place in
    // the world is undisturbed when the layer closes, and so a programmatic
    // focus ring never paints — the card's :focus rule clears it.
    cardRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay-layer">
      <div className="overlay-scrim" onClick={onClose} />
      <div ref={cardRef} className="overlay-card" role="dialog" aria-modal="true"
        aria-label={label} tabIndex={-1}>
        <button type="button" className="overlay-close" aria-label={`Close ${label}`}
          onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
}
