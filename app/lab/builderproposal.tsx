import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/600.css";
import "../src/renderer/tokens.css";
import "../src/renderer/app.css";
import "./builderproposal.css";

import React from "react";
import { createRoot } from "react-dom/client";

import { BuilderProposalReview } from "../src/renderer/components/BuilderProposalReview";
import type { BuilderProposalReviewV1 } from "../src/shared/builder-proposal-review";
import {
  BUILDER_PROPOSAL_LAB_CAPABILITY,
  BUILDER_PROPOSAL_LAB_REPLACEMENT,
} from "./builderproposal-fixtures";

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

// These fixtures deliberately begin as ordinary structural data, cross a
// structural-clone boundary, and are then deeply frozen. They carry no Task
// 224 protocol brand and cannot be mistaken for Main-owned effect authority.
const replacementReview: BuilderProposalReviewV1 = deepFreeze(
  structuredClone(BUILDER_PROPOSAL_LAB_REPLACEMENT),
);
const capabilityReview: BuilderProposalReviewV1 = deepFreeze(
  structuredClone(BUILDER_PROPOSAL_LAB_CAPABILITY),
);

function BuilderProposalLab() {
  return (
    <main className="builder-proposal-lab">
      <header className="builder-proposal-lab-intro">
        <p className="builder-proposal-lab-kicker">Synthetic review study</p>
        <h1>Two things a Builder may propose, and nothing more</h1>
        <p>
          Both examples are fixed, local display data. They do not come from a real project,
          cannot approve anything, and have no control that can apply, run, open, send, or publish.
        </p>
      </header>

      <section className="builder-proposal-scenarios" aria-label="Synthetic Builder proposal examples">
        <article className="builder-proposal-scenario">
          <header>
            <p className="builder-proposal-scenario-number">Synthetic scenario 01</p>
            <h2>Exact tracked-text replacement</h2>
            <p>One bounded before-and-after row, shown as review material only.</p>
          </header>
          <BuilderProposalReview review={replacementReview} />
        </article>

        <article className="builder-proposal-scenario">
          <header>
            <p className="builder-proposal-scenario-number">Synthetic scenario 02</p>
            <h2>Capability request</h2>
            <p>One closed Task 224 category, with its suggested target treated only as text.</p>
          </header>
          <BuilderProposalReview review={capabilityReview} />
        </article>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BuilderProposalLab />
  </React.StrictMode>,
);
