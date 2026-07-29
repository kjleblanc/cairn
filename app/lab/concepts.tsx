import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/600.css";
import "../src/renderer/tokens.css";
import "./concepts.css";
import React, { type ComponentType, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

type PoseId = "ready" | "thinking" | "working" | "done" | "stopped";
type ConceptId = "lopsided" | "ed" | "spirit";

const POSES: { id: PoseId; label: string; note: string }[] = [
  { id: "ready", label: "ready", note: "baseline presence" },
  { id: "thinking", label: "thinking", note: "curiosity in motion" },
  { id: "working", label: "working", note: "focused attention" },
  { id: "done", label: "DONE", note: "brief delight, then calm" },
  { id: "stopped", label: "STOPPED", note: "serious, not sad" },
];

const CONCEPTS: {
  id: ConceptId;
  title: string;
  essence: string;
  keep: string;
  watch: string;
}[] = [
  {
    id: "lopsided",
    title: "Lopsided hologram",
    essence: "Unequal eyes and one confident mouth mark: warm, restrained, and a little mischievous.",
    keep: "The asymmetry makes it feel chosen rather than generic.",
    watch: "Needs enough expression range to avoid becoming a static logo.",
  },
  {
    id: "ed",
    title: "Grown-up Ed",
    essence: "Elastic brows and mouth shapes borrow the hacker energy without yellow cheeks or blush.",
    keep: "The most expressive and playful direction.",
    watch: "Can become cartoonish if the mouth gets too broad or the head too round.",
  },
  {
    id: "spirit",
    title: "Interface spirit",
    essence: "Sparse interface marks almost form a face; the ring and waveform carry the emotion.",
    keep: "The most mature, digital, and native to the night garden.",
    watch: "May feel too distant if Cairn's warmth disappears.",
  },
];

function LopsidedFace({ pose }: { pose: PoseId }) {
  const features: Record<PoseId, ReactNode> = {
    ready: (
      <>
        <ellipse className="concept-fill" cx="45" cy="48" rx="9" ry="14" />
        <ellipse className="concept-fill" cx="76" cy="44" rx="5" ry="9" />
        <path className="concept-stroke concept-thick" d="M 36 75 Q 61 91 88 66" />
      </>
    ),
    thinking: (
      <>
        <ellipse className="concept-fill" cx="43" cy="41" rx="7" ry="10" />
        <ellipse className="concept-fill" cx="78" cy="35" rx="4" ry="7" />
        <path className="concept-stroke" d="M 43 77 L 53 77 M 60 81 L 70 81 M 77 74 L 85 74" />
        <circle className="concept-spark" cx="91" cy="24" r="2" />
        <circle className="concept-spark concept-spark-dim" cx="99" cy="15" r="1.5" />
      </>
    ),
    working: (
      <>
        <path className="concept-stroke concept-thick" d="M 35 43 L 53 49" />
        <path className="concept-stroke concept-thick" d="M 82 40 L 67 47" />
        <ellipse className="concept-fill" cx="46" cy="54" rx="5" ry="8" />
        <ellipse className="concept-fill" cx="70" cy="53" rx="4" ry="7" />
        <path className="concept-stroke concept-thick" d="M 47 78 L 76 73" />
      </>
    ),
    done: (
      <>
        <path className="concept-stroke concept-thick" d="M 35 47 Q 45 37 55 47" />
        <path className="concept-stroke" d="M 69 42 Q 77 35 85 42" />
        <path className="concept-stroke concept-thick" d="M 31 68 Q 59 97 92 59" />
      </>
    ),
    stopped: (
      <>
        <ellipse className="concept-fill" cx="44" cy="46" rx="6" ry="9" />
        <ellipse className="concept-fill" cx="74" cy="46" rx="4" ry="7" />
        <path className="concept-stroke concept-thick" d="M 43 76 L 80 76" />
      </>
    ),
  };
  return (
    <svg className="face-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <ellipse className="concept-mask" cx="60" cy="61" rx="42" ry="47" />
      {features[pose]}
    </svg>
  );
}

function EdFace({ pose }: { pose: PoseId }) {
  const features: Record<PoseId, ReactNode> = {
    ready: (
      <>
        <path className="ed-brow" d="M 35 43 Q 45 34 55 43" />
        <path className="ed-brow" d="M 67 42 Q 78 35 88 45" />
        <ellipse className="ed-eye" cx="46" cy="51" rx="5" ry="7" />
        <ellipse className="ed-eye" cx="77" cy="51" rx="5" ry="7" />
        <path className="ed-mouth" d="M 49 74 Q 66 82 82 67" />
      </>
    ),
    thinking: (
      <>
        <path className="ed-brow" d="M 34 40 Q 45 31 57 38" />
        <path className="ed-brow" d="M 68 36 Q 80 31 89 39" />
        <ellipse className="ed-eye" cx="49" cy="48" rx="4.5" ry="6" />
        <ellipse className="ed-eye" cx="80" cy="45" rx="4.5" ry="6" />
        <path className="ed-mouth" d="M 54 76 Q 62 71 70 76" />
        <path className="ed-thought" d="M 91 27 L 96 22 M 99 17 L 103 13" />
      </>
    ),
    working: (
      <>
        <path className="ed-brow ed-brow-heavy" d="M 32 39 L 56 47" />
        <path className="ed-brow ed-brow-heavy" d="M 89 38 L 65 47" />
        <ellipse className="ed-eye" cx="47" cy="55" rx="5" ry="6" />
        <ellipse className="ed-eye" cx="73" cy="55" rx="5" ry="6" />
        <path className="ed-mouth ed-mouth-heavy" d="M 43 76 L 78 76 M 49 76 L 49 82 M 59 76 L 59 83 M 69 76 L 69 82" />
      </>
    ),
    done: (
      <>
        <path className="ed-brow" d="M 32 43 Q 44 31 57 41" />
        <path className="ed-brow" d="M 65 41 Q 79 30 91 44" />
        <path className="ed-mouth ed-grin" d="M 35 64 Q 61 93 90 61 L 86 78 Q 62 95 39 76 Z" />
        <path className="ed-teeth" d="M 47 72 L 48 84 M 60 76 L 60 89 M 73 73 L 72 84" />
      </>
    ),
    stopped: (
      <>
        <path className="ed-brow ed-brow-heavy" d="M 35 42 L 55 42" />
        <path className="ed-brow ed-brow-heavy" d="M 67 42 L 87 42" />
        <ellipse className="ed-eye" cx="46" cy="52" rx="4.5" ry="6" />
        <ellipse className="ed-eye" cx="76" cy="52" rx="4.5" ry="6" />
        <path className="ed-mouth ed-mouth-heavy" d="M 50 78 Q 62 73 74 78" />
      </>
    ),
  };
  return (
    <svg className="face-svg ed-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <path className="ed-head" d="M 60 18 C 82 18 96 38 94 61 C 92 86 78 101 58 100 C 36 99 24 82 26 58 C 28 35 41 18 60 18 Z" />
      {features[pose]}
    </svg>
  );
}

function SpiritFace({ pose }: { pose: PoseId }) {
  const features: Record<PoseId, ReactNode> = {
    ready: (
      <>
        <path className="spirit-eye" d="M 42 43 L 42 57" />
        <path className="spirit-eye spirit-eye-small" d="M 77 46 L 77 55" />
        <path className="spirit-wave" d="M 39 76 Q 49 70 59 76 T 79 76 T 99 76" />
      </>
    ),
    thinking: (
      <>
        <path className="spirit-eye" d="M 39 39 L 47 47" />
        <path className="spirit-eye spirit-eye-small" d="M 78 37 L 78 49" />
        <path className="spirit-wave" d="M 42 77 L 50 77 M 58 72 L 66 82 M 74 77 L 82 77" />
        <circle className="spirit-particle" cx="90" cy="28" r="2" />
        <circle className="spirit-particle" cx="100" cy="18" r="1.4" />
      </>
    ),
    working: (
      <>
        <path className="spirit-eye spirit-eye-heavy" d="M 34 44 L 52 50" />
        <path className="spirit-eye spirit-eye-heavy" d="M 85 43 L 68 50" />
        <path className="spirit-wave spirit-wave-heavy" d="M 42 76 L 50 68 L 59 82 L 68 69 L 78 76" />
      </>
    ),
    done: (
      <>
        <path className="spirit-eye" d="M 36 48 Q 44 39 52 48" />
        <path className="spirit-eye spirit-eye-small" d="M 70 45 Q 78 38 86 45" />
        <path className="spirit-wave spirit-wave-heavy" d="M 34 69 Q 59 94 89 61" />
        <path className="spirit-echo" d="M 42 78 Q 60 96 82 72" />
      </>
    ),
    stopped: (
      <>
        <path className="spirit-eye spirit-eye-heavy" d="M 38 47 L 52 47" />
        <path className="spirit-eye spirit-eye-heavy" d="M 70 47 L 84 47" />
        <path className="spirit-wave spirit-wave-heavy" d="M 45 76 L 78 76" />
      </>
    ),
  };
  return (
    <svg className="face-svg spirit-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <circle className="spirit-field" cx="60" cy="60" r="43" />
      <circle className="spirit-field spirit-field-inner" cx="60" cy="60" r="31" />
      {features[pose]}
    </svg>
  );
}

const FACES: Record<ConceptId, ComponentType<{ pose: PoseId }>> = {
  lopsided: LopsidedFace,
  ed: EdFace,
  spirit: SpiritFace,
};

function ConceptBoard() {
  return (
    <main className="concept-page">
      <header className="concept-header">
        <a className="concept-back" href="/lab/index.html">← Back to the live visual lab</a>
        <p className="concept-kicker">avatar concept board · visual poses only</p>
        <h1>Three ways Cairn could speak with a face</h1>
        <p>
          These are lab-only concepts, not runtime claims. Compare how each language handles
          restraint, mischief, focus, delight, and the serious STOPPED moment.
        </p>
      </header>

      <section className="concept-grid" aria-label="Avatar concept comparison">
        {CONCEPTS.map((concept) => {
          const Face = FACES[concept.id];
          return (
            <article className="concept-column" data-concept={concept.id} key={concept.id}>
              <header className="concept-title">
                <p className="concept-number">concept {concept.id === "lopsided" ? "01" : concept.id === "ed" ? "02" : "03"}</p>
                <h2>{concept.title}</h2>
                <p>{concept.essence}</p>
              </header>

              <div className="pose-list">
                {POSES.map((pose) => (
                  <section className="pose-card" data-pose={pose.id} key={pose.id}>
                    <div className="face-frame"><Face pose={pose.id} /></div>
                    <div>
                      <h3>{pose.label}</h3>
                      <p>{pose.note}</p>
                    </div>
                  </section>
                ))}
              </div>

              <footer className="concept-judgment">
                <p><strong>Keep:</strong> {concept.keep}</p>
                <p><strong>Watch:</strong> {concept.watch}</p>
              </footer>
            </article>
          );
        })}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConceptBoard />
  </React.StrictMode>,
);
