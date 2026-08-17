/**
 * Task 255 - the resident-program visual constitution and state board.
 *
 * LAB ONLY. This page imports the bundled Quicksand faces and its own
 * stylesheet, and from production it takes exactly one thing: the shipped
 * `CairnProgram` and the stylesheet that goes with it (Task 258, Slice 3).
 * Everything else stays out on purpose — `app.css` is the retired night-garden
 * cascade, and importing it would mean judging the new system through the old
 * one. The board keeps its own `--rp-*` palette because its side-by-side Light
 * and Dark islands need three explicit blocks, which production does not.
 *
 * The dependency runs ONE WAY: the board reaches into production, production
 * never reaches into the board.
 *
 * Everything on this page is fixed synthetic data. There is no project, no
 * connection, no store, no IPC, and no control that can apply, run, open,
 * send, publish, approve, or verify anything.
 *
 * Marker: cairn-resident-program-board/v1
 */
import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/600.css";
import "@fontsource/quicksand/700.css";
import "./resident-program.css";
import "../src/renderer/cairn-program.css";

import React from "react";
import { createRoot } from "react-dom/client";

/* ===================================================================== */
/* The resident program                                                  */
/* ===================================================================== */

/**
 * Cairn himself is no longer drawn here. Task 258 (Slice 3) promoted the
 * measured geometry to `src/renderer/components/CairnProgram.tsx`, and this
 * board now demonstrates the SHIPPED primitive rather than a private copy of
 * it - which is the whole point of a board: judging the thing that ships.
 *
 * The direction of that dependency matters and is still one-way. The board
 * reaches into production; production never reaches into the board, and
 * `resident-program-bundle-dark.test.mjs` proves after a fresh build that this
 * page is absent from every emitted production bundle.
 */
import { CairnProgram, type CairnProgramState } from "../src/renderer/components/CairnProgram";

type ProgramState = CairnProgramState;

/* ===================================================================== */
/* Board content - all synthetic                                          */
/* ===================================================================== */

type StateRow = {
  state: ProgramState;
  heading: string;
  truth: string;
  truthClass: string;
  glyph?: "stop" | "error" | "done";
  /**
   * The status word alone is not the whole written truth for every state. The
   * constitution requires STOPPED to carry its reason and next choice, and
   * ERROR to carry its plain-language effect and recovery. A board that showed
   * only the badge would be demonstrating a state Cairn is not allowed to ship.
   */
  consequence?: string;
  character: string;
  motion: string;
};

const STATE_ROWS: StateRow[] = [
  {
    state: "ready",
    heading: "Ready / idle",
    truth: "Ready",
    truthClass: "rp-truth-quiet",
    character: "Face D exactly as approved. Nothing is added at rest.",
    motion: "Static.",
  },
  {
    state: "thinking",
    heading: "Thinking / replying",
    truth: "Thinking",
    truthClass: "rp-truth-teal",
    character: "The closed eye opens to a small solid square; the smile relaxes to a short step. The rear panes separate by a hair.",
    motion: "One finite arrival, then still. Text is never held back for it.",
  },
  {
    state: "needs-decision",
    heading: "Needs owner / pushback",
    truth: "Needs decision",
    truthClass: "rp-truth-amber",
    character: "Two open outlined eyes with the right one lifted — the quizzical tilt of waiting for an answer — over a short mouth. Candid, not angry.",
    motion: "One finite amber emphasis on the front pane edge.",
  },
  {
    state: "working",
    heading: "Starting / working",
    truth: "Working · 1 approved task",
    truthClass: "rp-truth-teal",
    character: "Both eyes drop to level bars, looking down at the work. The lower data mark turns teal.",
    motion: "One dispatch pulse. No loop.",
  },
  {
    state: "checking",
    heading: "Checking",
    truth: "Checking",
    truthClass: "rp-truth-teal",
    character: "Two outlined eyes, the right one smaller, reading closely. One faint band rests low on the pane.",
    motion: "One finite scan that settles and stops.",
  },
  {
    state: "done",
    heading: "Done",
    truth: "Verified done",
    truthClass: "rp-truth-sage",
    glyph: "done",
    character: "Both eyes close into crescents; the approved stepped smile is unchanged. Contained satisfaction.",
    motion: "One settle. No confetti.",
  },
  {
    state: "stopped",
    heading: "Stopped",
    truth: "Stopped",
    truthClass: "rp-truth-coral",
    glyph: "stop",
    consequence: "I did not change anything. Work you had not saved was in the way. Save or set it aside and ask me again, or tell me to work somewhere else.",
    character: "Both eyes open and level, the mouth a full-width bar, a hollow square at the seam. Serious and attentive, never ashamed.",
    motion: "Static after one arrival.",
  },
  {
    state: "error",
    heading: "Error",
    truth: "Error",
    truthClass: "rp-truth-coral",
    glyph: "error",
    consequence: "Something broke on my side, so the task did not run and nothing was changed. Your project is exactly as you left it. Try again, and if it breaks the same way, tell me and I will stop rather than guess.",
    character: "Eyes narrow to upright bars and the stepped mouth inverts; the seam mark is a circle, not a square. Rueful, not menacing.",
    motion: "Static after one arrival.",
  },
  {
    state: "disconnected",
    heading: "Disconnected",
    truth: "Not connected",
    truthClass: "rp-truth-quiet",
    character: "Two level dashes and a short mouth on a drained pane. Dormant and available, not asleep.",
    motion: "Static.",
  },
];

const SWATCHES: { role: string; token: string; note: string; ink?: string }[] = [
  { role: "Dusty shell", token: "--rp-field", note: "one step darker than the mockup", ink: "--rp-ink" },
  { role: "Quiet chrome", token: "--rp-chrome", note: "measured #DBDCDD", ink: "--rp-ink" },
  { role: "Conversation paper", token: "--rp-paper", note: "measured #F6ECDC", ink: "--rp-ink" },
  { role: "Raised paper", token: "--rp-paper-raised", note: "measured #FBF4E7", ink: "--rp-ink" },
  { role: "Ink", token: "--rp-ink", note: "approved seed #15384B", ink: "--rp-paper" },
  { role: "Muted ink", token: "--rp-ink-muted", note: "derived for 4.5:1", ink: "--rp-paper" },
  // Each chip's specimen uses the SAME ink the system puts on that ground, not
  // a nearby paper token. Pointing them anywhere else made the teal chip
  // 4.31:1 in Light and the amber chip 1.48:1 in Dark - cream on light amber.
  { role: "Teal action", token: "--rp-teal", note: "approved seed #177F8C", ink: "--rp-on-teal" },
  { role: "Cairn amber", token: "--rp-amber", note: "approved seed #F0C65A", ink: "--rp-on-amber" },
  { role: "Owner apricot", token: "--rp-apricot", note: "measured #F7DBB9", ink: "--rp-apricot-ink" },
  { role: "Activity blue", token: "--rp-activity", note: "approved seed #D2E2E9", ink: "--rp-activity-ink" },
  { role: "Success sage", token: "--rp-sage", note: "approved seed #D9E4C9", ink: "--rp-sage-ink" },
  // The rule is #BF5F56, NOT the plan's seed #C86F67: the seed measured 3.03:1
  // and was replaced. Printing the rejected value here would show the owner a
  // colour the design does not use.
  { role: "Risk coral", token: "--rp-coral", note: "ink #9A453E, rule #BF5F56", ink: "--rp-coral-ink" },
];

function Swatch({ role, token, note, ink }: { role: string; token: string; note: string; ink?: string }) {
  return (
    <div className="rp-swatch">
      <div className="rp-swatch-chip" style={{ background: `var(${token})`, color: ink ? `var(${ink})` : undefined }}>
        Aa
      </div>
      <div className="rp-swatch-body">
        <div className="rp-swatch-role">{role}</div>
        <div className="rp-swatch-meta">{token}</div>
        <div className="rp-swatch-meta">{note}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------- synthetic shell --- */

function ActivityCapsule({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rp-capsule">
      <span className="rp-capsule-mark" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" focusable="false" aria-hidden="true">
          <path d="M1 8h3l2-5 3 10 2-5h4" fill="none" stroke="var(--rp-teal-ink)" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
      <span className="rp-capsule-label">Working · 1 approved task</span>
      {compact ? null : <span className="rp-capsule-detail">Started 2 minutes ago</span>}
    </div>
  );
}

function SyntheticShell({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "rp-shell rp-comp-compact" : "rp-shell"}>
      {/* The rail carries navigation, not a second Cairn. There is exactly one
          Cairn mark in the chrome (the header) and one expressive presence in
          the conversation - never a third. */}
      <div className="rp-shell-rail">
        <svg className="rp-rail-glyph" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <rect x="1" y="1" width="7" height="7" rx="1.5" fill="currentColor" />
          <rect x="12" y="1" width="7" height="7" rx="1.5" fill="currentColor" />
          <rect x="1" y="12" width="7" height="7" rx="1.5" fill="currentColor" />
          <rect x="12" y="12" width="7" height="7" rx="1.5" fill="currentColor" />
        </svg>
        <div className="rp-rail-chip">GL</div>
        <div className="rp-rail-spacer" />
        <svg className="rp-rail-glyph" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <circle cx="10" cy="10" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="10" cy="10" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2.6 3.2" />
        </svg>
      </div>
      <div className="rp-shell-main">
        <header className="rp-shell-header">
          <CairnProgram size={28} variant="mark" state="ready" />
          <span className="rp-wordmark">CAIRN</span>
          <span className="rp-header-rule" />
          <span className="rp-header-project">Garden Lab</span>
          <div className="rp-header-right">
            <span className="rp-pill">
              <span className="rp-pill-dot" />
              Connected · private
            </span>
          </div>
        </header>
        <div className="rp-shell-body">
          {/* The transcript scrolls; the activity capsule and the composer keep
              their natural size and never scroll out of sight, because what
              Cairn is doing right now must not be something you have to hunt
              for. */}
          <div className="rp-conversation rp-paper">
            <div className="rp-transcript">
              <p className="rp-owner-note">Can the workspace feel calmer?</p>
              <div className="rp-cairn-turn">
                <CairnProgram size={compact ? 64 : 78} state="working" />
                <p className="rp-cairn-prose">
                  Yes. I&rsquo;ll keep the conversation in front and bring the machinery forward only when it matters.
                </p>
              </div>
            </div>
            <ActivityCapsule compact={compact} />
          </div>
          <div className="rp-composer">
            <span className="rp-composer-placeholder">Talk with Cairn</span>
            <button type="button" className="rp-btn">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SyntheticPhone() {
  return (
    <div className="rp-phone">
      <header className="rp-phone-header">
        <CairnProgram size={26} variant="mark" state="ready" />
        <span className="rp-wordmark" style={{ fontSize: 15 }}>
          CAIRN
        </span>
        <span className="rp-pill" style={{ marginLeft: "auto" }}>
          <span className="rp-pill-dot" />
          Live
        </span>
      </header>
      <div className="rp-phone-body">
        <p className="rp-owner-note" style={{ maxWidth: "100%" }}>
          Did the check pass?
        </p>
        <div className="rp-cairn-turn">
          <CairnProgram size={48} state="done" />
          <p className="rp-cairn-prose" style={{ fontSize: 16 }}>
            Yes — verified done. The contract mirror test is green again.
          </p>
        </div>
        <div className="rp-receipt">
          <div className="rp-card-head">
            <span className="rp-state-truth rp-truth-sage">
              <span className="rp-glyph rp-glyph-done" aria-hidden="true" />
              Verified done
            </span>
          </div>
          <p className="rp-small" style={{ margin: 0 }}>
            Cairn checked the commit and the test output itself.
          </p>
        </div>
      </div>
      <p className="rp-phone-foot">Read-only companion · on your home network · nothing leaves this house</p>
    </div>
  );
}

/* ===================================================================== */
/* The board                                                             */
/* ===================================================================== */

type ThemeChoice = "system" | "light" | "dark";

function ThemeControl({ value, onChange }: { value: ThemeChoice; onChange: (next: ThemeChoice) => void }) {
  return (
    <div className="rp-toggle" role="group" aria-label="Theme">
      {(["system", "light", "dark"] as ThemeChoice[]).map((choice) => (
        <button key={choice} type="button" aria-pressed={value === choice} onClick={() => onChange(choice)}>
          {choice === "system" ? "System" : choice === "light" ? "Light" : "Dark"}
        </button>
      ))}
    </div>
  );
}

function Board() {
  const [theme, setTheme] = React.useState<ThemeChoice>("system");
  // Remounting the program by key is what replays its one finite arrival.
  const [replays, setReplays] = React.useState(0);

  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <main className="rp-board">
      <header style={{ marginBottom: 36 }}>
        <p className="rp-kicker">Cairn · visual constitution · Task 255</p>
        <h1>One small resident program, living in a calm desk</h1>
        <p className="rp-lede">
          Everything below is drawn in code from fixed synthetic text. There is no project, no connection, and no control
          that can apply, run, send, publish, or approve anything. This page is a proposal to look at, not a product to use.
        </p>
        <div className="rp-controls" style={{ marginTop: 18 }}>
          <ThemeControl value={theme} onChange={setTheme} />
          <span className="rp-small rp-muted">
            System follows your operating system. Light and Dark override it here only.
          </span>
        </div>
      </header>

      <section className="rp-section" aria-labelledby="rp-h-body">
        <header>
          <p className="rp-kicker">Already approved · judge fidelity only</p>
          <h2 id="rp-h-body">The resident program, at the sizes it will really be</h2>
          <p>
            Three offset rounded panes: two translucent teal panes fanned behind a warm amber front pane with its
            top-right corner clipped, a cyan seam pane at the lower left, and two tiny data marks at the right seam. The
            face is D — outlined square left eye, closed crescent right eye, lopsided stepped smile. One geometry draws
            every size below; nothing here is magnified, so this is exactly how big Cairn will be.
          </p>
        </header>
        <div className="rp-sizes">
          {[
            { size: 28, variant: "mark" as const, label: "28 px mark", note: "header and rail" },
            { size: 34, variant: "mark" as const, label: "34 px mark", note: "chrome" },
            { size: 64, variant: "full" as const, label: "64 px", note: "compact presence" },
            { size: 88, variant: "full" as const, label: "88 px", note: "conversational presence" },
          ].map((entry) => (
            <figure className="rp-size" key={entry.label} style={{ margin: 0 }}>
              <CairnProgram size={entry.size} variant={entry.variant} state="ready" />
              <figcaption>
                {entry.label}
                <span className="rp-size-note">{entry.note}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="rp-inline-note" style={{ marginTop: 16 }}>
          <b>Two implementation calls worth your eye.</b> First, the size number means the amber pane&rsquo;s height —
          how big Cairn actually looks — not the drawing&rsquo;s bounding box; measured against your mockup that is what
          makes 88 px the presence you approved. Second, below about 40 px the rear fan, the cyan seam pane and the data
          squares all turn to mud, so the small mark drops all three and keeps the pane, its clipped corner and the
          face. The two mark sizes above are that reduction.
        </div>
        <p className="rp-small rp-muted" style={{ marginTop: 14 }}>
          Cairn inhabits the surface that currently matters and is not stamped on every card. There is one expressive
          presence per screen; the header mark is chrome and never becomes a second status source.
        </p>
      </section>

      <section className="rp-section rp-decision" aria-labelledby="rp-h-states">
        <header>
          <span className="rp-decision-flag">Your decision</span>
          <h2 id="rp-h-states">Nine states, nine expressions — and the words that always carry the truth</h2>
          <p>
            These expressions have never been seen and are what Owner gate 1 is really for. Read each card as a pair: the
            written status is the truth, and the face only reinforces it. Cover the faces and every state still reads.
          </p>
        </header>
        <div className="rp-states">
          {STATE_ROWS.map((row) => (
            <article className="rp-state" key={row.state} data-rp-state={row.state}>
              <h3>{row.heading}</h3>
              <div className="rp-state-figure">
                <CairnProgram size={78} state={row.state} />
              </div>
              <span className={`rp-state-truth ${row.truthClass}`}>
                {row.glyph ? <span className={`rp-glyph rp-glyph-${row.glyph}`} aria-hidden="true" /> : null}
                {row.truth}
              </span>
              {row.consequence ? <p className="rp-state-consequence">{row.consequence}</p> : null}
              <p className="rp-state-rule">{row.character}</p>
              <p className="rp-state-rule">
                <b>Motion:</b> {row.motion}
              </p>
            </article>
          ))}
        </div>
        <div className="rp-inline-note" style={{ marginTop: 18 }}>
          Stopped and error never differ by colour alone. They differ by the word, by the mouth (level versus inverted),
          by the eyes (open squares versus upright bars), and by the seam mark (hollow square versus circle).
        </div>
      </section>

      <section className="rp-section" aria-labelledby="rp-h-palette">
        <header>
          <p className="rp-kicker">Already approved · judge fidelity only</p>
          <h2 id="rp-h-palette">The daylight palette</h2>
          <p>
            Measured from the approved mockup where the mockup had a value, and derived where the measured colour could
            not clear its contrast floor for the job it was doing. A test recomputes every ratio on this page from these
            same tokens, so this palette cannot quietly drift below the floor.
          </p>
        </header>
        <div className="rp-swatches">
          {SWATCHES.map((swatch) => (
            <Swatch key={swatch.token} {...swatch} />
          ))}
        </div>
      </section>

      <section className="rp-section" aria-labelledby="rp-h-type">
        <header>
          <h2 id="rp-h-type">Type, density, and controls</h2>
          <p>Bundled Quicksand only — 400 for prose, 600 for labels and controls, 700 kept for headings and decisive states.</p>
        </header>
        <div className="rp-type-sample rp-paper">
          <div className="rp-type-row">
            <span className="rp-type-tag">700 / 34px / 1.25</span>
            <span style={{ font: "700 34px/1.25 var(--rp-sans)" }}>One honest result</span>
          </div>
          <div className="rp-type-row">
            <span className="rp-type-tag">400 / 18px / 1.6 · 65–75ch</span>
            <p style={{ margin: 0, maxWidth: "68ch", font: "400 18px/1.6 var(--rp-sans)" }}>
              Long conversation prose sits at a comfortable regular weight and a measure you can read without losing your
              place, because most of what Cairn says is a paragraph and not a label.
            </p>
          </div>
          <div className="rp-type-row">
            <span className="rp-type-tag">600 / 15.5px — controls</span>
            <div className="rp-controls">
              <button type="button" className="rp-btn">
                Primary
              </button>
              <button type="button" className="rp-btn rp-btn-quiet">
                Quiet
              </button>
              <button type="button" className="rp-btn" aria-busy="true">
                Busy…
              </button>
              <button type="button" className="rp-btn" disabled>
                Disabled
              </button>
              <input className="rp-field-input" defaultValue="Editable field" aria-label="Sample field" />
            </div>
          </div>
          <div className="rp-type-row">
            <span className="rp-type-tag">mono — machine evidence only</span>
            <code className="rp-mono">docs/ai-work/tasks/255-brief.md · c4 · 8f3a19c</code>
          </div>
          <p className="rp-small rp-muted" style={{ margin: 0 }}>
            Every control above is at least 44×44 px. Tab through them to see the focus ring; it is drawn, not left to
            the browser.
          </p>
        </div>
      </section>

      <section className="rp-section" aria-labelledby="rp-h-sequence">
        <header>
          <h2 id="rp-h-sequence">One decision, carried to one result</h2>
          <p>
            A representative sequence in the new language: an owner note, a Cairn reply, a decision that needs the owner,
            the disclosure that must always precede a dispatch, live work, and the receipt at the end.
          </p>
        </header>
        <div className="rp-sequence rp-paper">
          <p className="rp-owner-note">Can you tidy the greeting file? It looks wrong on small screens.</p>

          <div className="rp-cairn-turn">
            <CairnProgram size={88} state="needs-decision" />
            <div>
              <p className="rp-cairn-prose">
                I can, but &ldquo;looks wrong&rdquo; could mean two different fixes and only one of them is safe to do
                without you. Before I dispatch anything I need you to pick.
              </p>
              <span className="rp-state-truth rp-truth-amber" style={{ marginTop: 8 }}>
                Needs decision
              </span>
            </div>
          </div>

          <div className="rp-decision-card">
            <div className="rp-card-head">
              <h3 className="rp-card-title">Send one task to a worker?</h3>
            </div>
            <dl className="rp-facts">
              <dt>Worker</dt>
              <dd>Synthetic worker (lab example — no real provider is contacted)</dd>
              <dt>Model</dt>
              <dd>example/none</dd>
              <dt>Data sent</dt>
              <dd>The task brief and the two files it names, from this project only</dd>
              <dt>Cost basis</dt>
              <dd>Example only — this page cannot spend anything</dd>
              <dt>If it goes wrong</dt>
              <dd>Nothing is applied without a commit you can undo; Cairn stops rather than guessing</dd>
            </dl>
            {/* Drawn to look like the real pair, but deliberately not controls:
                plain spans, no callback, no focus stop. A board must never
                offer an approval that could be mistaken for the real one. */}
            <div className="rp-controls">
              <span className="rp-btn rp-btn-inert">Approve · inert example</span>
              <span className="rp-btn rp-btn-quiet rp-btn-inert">Not now</span>
            </div>
          </div>

          <div className="rp-cairn-turn">
            <CairnProgram size={78} state="working" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="rp-cairn-prose" style={{ marginBottom: 12 }}>Dispatched. I&rsquo;ll check the result myself before I show it to you.</p>
              <ActivityCapsule />
            </div>
          </div>

          <div className="rp-receipt">
            <div className="rp-card-head">
              <span className="rp-state-truth rp-truth-sage">
                <span className="rp-glyph rp-glyph-done" aria-hidden="true" />
                Verified done
              </span>
              <h3 className="rp-card-title">The greeting file wraps at 390 px</h3>
            </div>
            <dl className="rp-facts">
              <dt>Cairn checked</dt>
              <dd>The commit exists, the named file changed, and the test the brief required passes.</dd>
              <dt>Worker claimed</dt>
              <dd>
                <span className="rp-claim">
                  <b>The worker&rsquo;s account, not verified by Cairn:</b> &ldquo;Rewrote the header grid and removed the
                  fixed width.&rdquo;
                </span>
              </dd>
              <dt>Milestone moved</dt>
              <dd>No — that stays your call.</dd>
            </dl>
            <div className="rp-cairn-turn" style={{ marginTop: 4 }}>
              <CairnProgram size={64} state="done" />
              <p className="rp-cairn-prose" style={{ fontSize: 16 }}>
                It holds at the size you complained about. I checked the commit and the test myself; the sentence about
                the header grid is the worker&rsquo;s word, not mine.
              </p>
            </div>
          </div>

          <div className="rp-receipt rp-receipt-stopped">
            <div className="rp-card-head">
              <span className="rp-state-truth rp-truth-coral">
                <span className="rp-glyph rp-glyph-stop" aria-hidden="true" />
                Stopped
              </span>
              <h3 className="rp-card-title">I did not change anything</h3>
            </div>
            <p className="rp-small" style={{ marginBottom: 10 }}>
              The same receipt in its other honest ending, so the two can be compared side by side.
            </p>
            <dl className="rp-facts">
              <dt>Why</dt>
              <dd>Work you had not saved was in the way, and moving it could have lost it.</dd>
              <dt>Your next choice</dt>
              <dd>Save or set aside that work, then ask me again — or tell me to work somewhere else.</dd>
            </dl>
          </div>
        </div>
      </section>

      <section className="rp-section rp-decision" aria-labelledby="rp-h-dark">
        <header>
          <span className="rp-decision-flag">Your decision</span>
          <h2 id="rp-h-dark">Dark: the same warm desk, after dusk</h2>
          <p>
            Not the retired night garden and not an inverted daylight theme. The paper is still the warmest, lightest
            thing in the frame — it is lit by a lamp, not switched off — and the shell recedes to a cool slate. Both
            islands below are shown at once so the two can be compared without switching anything.
          </p>
        </header>
        <div className="rp-pair">
          <div className="rp-island" data-rp-scheme="light">
            <h3>Light</h3>
            <div className="rp-cairn-turn" style={{ marginBottom: 14 }}>
              <CairnProgram size={78} state="ready" />
              <p className="rp-cairn-prose" style={{ fontSize: 16 }}>Ready when you are.</p>
            </div>
            <ActivityCapsule compact />
            <div className="rp-controls" style={{ marginTop: 14 }}>
              <button type="button" className="rp-btn">
                Send
              </button>
              <span className="rp-state-truth rp-truth-coral">
                <span className="rp-glyph rp-glyph-stop" aria-hidden="true" />
                Stopped
              </span>
            </div>
          </div>
          <div className="rp-island" data-rp-scheme="dark">
            <h3>Dark</h3>
            <div className="rp-cairn-turn" style={{ marginBottom: 14 }}>
              <CairnProgram size={78} state="ready" />
              <p className="rp-cairn-prose" style={{ fontSize: 16 }}>Ready when you are.</p>
            </div>
            <ActivityCapsule compact />
            <div className="rp-controls" style={{ marginTop: 14 }}>
              <button type="button" className="rp-btn">
                Send
              </button>
              <span className="rp-state-truth rp-truth-coral">
                <span className="rp-glyph rp-glyph-stop" aria-hidden="true" />
                Stopped
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rp-section rp-decision" aria-labelledby="rp-h-comps">
        <header>
          <span className="rp-decision-flag">Your decision</span>
          <h2 id="rp-h-comps">Wide, compact, and phone</h2>
          <p>
            The same components under less room — not a second design. Compact drops the project name and the activity
            detail, narrows the rail, and keeps Cairn present but smaller. The phone composition below is synthetic lab
            work; the shipped companion stays read-only and on your home network, and this page does not change it.
          </p>
        </header>
        <div className="rp-comps">
          <div className="rp-comp-frame">
            <p className="rp-comp-caption">Wide — the conversation is the whole object</p>
            {/* Held at its real wide width. On a narrow screen this frame
                scrolls; the page never does. */}
            <div className="rp-comp-scroll">
              <div style={{ height: 560, minWidth: 720 }}>
                <SyntheticShell />
              </div>
            </div>
          </div>
          <div className="rp-comp-frame" style={{ maxWidth: 760 }}>
            <p className="rp-comp-caption">Compact — supported minimum width</p>
            <div style={{ height: 480 }}>
              <SyntheticShell compact />
            </div>
          </div>
          <div className="rp-comp-frame" style={{ maxWidth: 390 }}>
            <p className="rp-comp-caption">Phone — synthetic composition, read-only</p>
            <div style={{ height: 520 }}>
              <SyntheticPhone />
            </div>
          </div>
        </div>
      </section>

      <section className="rp-section" aria-labelledby="rp-h-longcopy">
        <header>
          <h2 id="rp-h-longcopy">Long copy, machine evidence, and reduced motion</h2>
          <p>Nothing overflows its container, and nothing on this page needs motion to become readable.</p>
        </header>
        <div className="rp-longcopy">
          <p>
            A worker&rsquo;s account can be long, and a path can be longer than any column. Both stay inside the paper
            rather than pushing the page sideways, because a result you have to scroll horizontally to read is a result
            you will not read.
          </p>
          <code className="rp-mono">
            C:\Users\example\Desktop\WebApp Projects\AI Coding Workflow Framework\app\src\renderer\components\BuilderProposalReview.tsx
          </code>
        </div>
        <div className="rp-motion-demo">
          <div className="rp-motion-stage">
            <CairnProgram key={`arrive-${replays}`} size={78} state="done" animate />
            <span key={`settle-${replays}`} className="rp-state-truth rp-truth-sage rp-anim-settle">
              <span className="rp-glyph rp-glyph-done" aria-hidden="true" />
              Verified done
            </span>
          </div>
          <div>
            <h3>Nothing moves that you did not cause</h3>
            <p className="rp-small" style={{ marginBottom: 12 }}>
              The whole vocabulary is two finite primitives, both playing here: Cairn <b>arrives</b>, and the result
              <b> settles</b>. Every state&rsquo;s motion rule is one of those two, or nothing at all. There is no float,
              sheen, blink, ripple, or glitch loop anywhere, and text is never held back to be typed out.
            </p>
            <button type="button" className="rp-btn rp-btn-quiet" onClick={() => setReplays((n) => n + 1)}>
              Play the arrival once
            </button>
            <p className="rp-small rp-muted" style={{ marginTop: 12, marginBottom: 0 }}>
              With reduced motion on, that button lands Cairn in exactly the same place — it simply skips the travel.
              The end state is identical, never mid-flight, hidden, or waiting for an event that will not arrive.
            </p>
          </div>
        </div>
      </section>

      <footer className="rp-section" aria-labelledby="rp-h-gate">
        <h2 id="rp-h-gate">What Owner gate 1 is asking</h2>
        <ol className="rp-list">
          <li>
            <b>Fidelity</b> — is this the D body, the daylight palette, and the shell direction you already approved?
          </li>
          <li>
            <b>Expressions</b> — do the eight derived states read the way you want Cairn to read? These have never been
            seen before.
          </li>
          <li>
            <b>Dark</b> — is this the warm desk after dusk, or has it drifted?
          </li>
          <li>
            <b>Compact</b> — does Cairn stay present but small when the window narrows?
          </li>
        </ol>
        <p className="rp-small rp-muted" style={{ marginBottom: 0 }}>
          Nothing in the product has changed. This page is not reachable from the app, is absent from its bundles, and
          no production file was edited to build it.
        </p>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Board />
  </React.StrictMode>,
);
