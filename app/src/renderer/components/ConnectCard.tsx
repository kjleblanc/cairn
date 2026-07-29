import { useEffect, useState, type ReactNode } from "react";
import type { ConductorConsentCard } from "../../shared/ipc";
import { cairn } from "../api";
import { BODIES, OPENROUTER_BASE_URL, RECOMMENDATION_NOTE, RECOMMENDED_BODY, bodyBaseUrl, type Body } from "../../shared/bodies";
import { Card, ErrorCard, Pill } from "./Ui";

const DEFAULT_BASE_URL = OPENROUTER_BASE_URL;
const OPENROUTER_KEYS_URL = "https://openrouter.ai/keys";
const KIMI_CONSOLE_URL = "https://www.kimi.com/code/console";

/** Where the last successful seat lives between visits (task 127): profile-
 * local, and only ever `{ baseUrl, model }` — never the key. */
const SEAT_STORAGE_KEY = "cairn-last-seat";

type RememberedSeat = { baseUrl: string; model: string };

/** The remembered seat, or null when anything is off — a bad or partial
 * value is simply forgotten (the start screen shows) rather than repaired. */
function readRememberedSeat(): RememberedSeat | null {
  try {
    const raw = localStorage.getItem(SEAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedSeat>;
    if (typeof parsed.baseUrl !== "string" || typeof parsed.model !== "string") return null;
    if (!parsed.baseUrl.trim() || !parsed.model.trim()) return null;
    new URL(parsed.baseUrl);
    return { baseUrl: parsed.baseUrl, model: parsed.model };
  } catch {
    return null;
  }
}

/** The exact sentence the not-listed panel asks the owner to send Cairn in
 * chat once connected — the add-a-model self-hosting loop (task 123). The
 * owner replaces provider/model-id with the real id; the dispatched task
 * verifies it against the provider's public catalog, exactly as the existing
 * curated entries were. */
const ADD_MODEL_REQUEST =
  "Add a model to my picker: provider/model-id — verify the id against the provider's public catalog first.";

type Panel = "start" | "default" | "picker" | "guide" | "add";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 10 }}>
      <label className="small muted" style={{ display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

/** One curated-body row, shared by the start panel's doors and the picker so
 * the name, blurb, billing line, and recommendation note never drift apart. */
function BodyButton({ body, onChoose }: { body: Body; onChoose: (body: Body) => void }) {
  return (
    <button type="button" className="brain-item" onClick={() => onChoose(body)}>
      <span className="brain-item-head">
        <strong>{body.name}</strong>
        {body.recommended ? <span className="brain-item-tag">Recommended</span> : null}
      </span>
      <span className="small muted">{body.blurb}</span>
      <span className="brain-item-billing">{body.billing}</span>
      {body.recommended ? <span className="small brain-item-note">{RECOMMENDATION_NOTE}</span> : null}
    </button>
  );
}

const PRIMARY_BODIES = BODIES.filter((b) => b.primary === true);
const MORE_BODIES = BODIES.filter((b) => b.primary !== true);

/** The connect flow's standing-consent card: the owner sees exactly what
 * main will re-derive and check before it ever stores a key (the dispatch-gate
 * pattern from tasks.ts) — the consent strings shown here always come from
 * `conductor:consentCard`, never a renderer-side copy. That includes the
 * checkbox label, so a plan-based seat never sits under "costs money".
 *
 * Task 030 made this a one-paste flow. The default panel asks for only the
 * key — the base URL and model already hold Cairn's curated pick
 * (`RECOMMENDED_BODY`) — with two quiet links to the other two panels this
 * component can show: `picker` ("Choose a different brain," Cairn's short
 * curated list plus "Custom…" for any provider/model, including a future
 * local Ollama URL) and `guide` ("Where do I get a key?," a plain-language
 * walkthrough that never assumes a browser is already on the right page).
 * Choosing "Custom…" is the only way back to the old free-text base URL and
 * model fields.
 *
 * Task 098 added the Kimi subscription seat: a curated body that carries its
 * own base URL, with the intro line and the key guide switching to match it.
 * Everything the OpenRouter seats show is byte-identical to before.
 *
 * Task 123 pinned Kimi K3 as the recommended brain and made the picker's
 * openness explicit: every curated entry shows a plain `billing` line (per-use
 * key versus membership quota), and a fourth panel — `add`, reached from the
 * picker's "The model I want isn't listed…" — tells the owner that Custom…
 * takes any model right now and that a connected Cairn will add a model to
 * the list as a task, showing the exact sentence to send. The Kimi guide also
 * tells the CLI truth: a Kimi Code command-line sign-in can't be borrowed
 * yet, so the console key is the way today.
 *
 * Task 126 asks the power question first: the card opens on a `start` panel
 * with the two `primary` doors (Kimi K3 pay-per-use, the Kimi membership
 * seat) rendered from the same Body data — no duplicated cost honesty — and
 * the picker collapses its non-primary entries behind a "More choices"
 * toggle. Custom… and the not-listed path stay visible without expanding,
 * so the 22-call connectToFixture helper's clicks keep their meaning. The
 * consent block on the paste screen is the standing authorization and keeps
 * its exact strings.
 *
 * Task 127 remembers the last successful seat — `{ baseUrl, model }` only,
 * never the key — in profile-local storage, so a returning owner lands
 * straight on the pre-filled paste screen instead of the start question.
 * While the current seat still equals the remembered one, a muted line says
 * so ("Cairn remembers your last choice — never your key."); changing any
 * field makes the line leave with the match. A bad stored value is
 * forgotten, not repaired. */
export function ConnectCard({ onConnected }: { onConnected: () => void }) {
  const [rememberedSeat] = useState<RememberedSeat | null>(() => readRememberedSeat());
  const [panel, setPanel] = useState<Panel>(rememberedSeat ? "default" : "start");
  const [custom, setCustom] = useState(
    rememberedSeat ? !BODIES.some((b) => b.id === rememberedSeat.model && bodyBaseUrl(b) === rememberedSeat.baseUrl) : false,
  );
  const [baseUrl, setBaseUrl] = useState(rememberedSeat?.baseUrl ?? DEFAULT_BASE_URL);
  const [model, setModel] = useState(rememberedSeat?.model ?? RECOMMENDED_BODY.id);
  const [moreOpen, setMoreOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [checked, setChecked] = useState(false);
  const [card, setCard] = useState<ConductorConsentCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    try {
      new URL(baseUrl.trim());
    } catch {
      setCard(null);
      return;
    }
    void cairn.conductorConsentCard(baseUrl.trim(), model.trim()).then((response) => {
      if (!cancelled) setCard(response.ok ? response.value : null);
    });
    return () => { cancelled = true; };
  }, [baseUrl, model]);

  async function connect() {
    if (!card || !checked || !model.trim() || !apiKey.trim() || connecting) return;
    setConnecting(true);
    setError(null);
    try {
      const response = await cairn.conductorConnect({ card, apiKey, consentConfirmed: true });
      if (!response.ok) { setError(response.message); return; }
      // Remember the seat — never the key — so the next visit opens pre-filled.
      localStorage.setItem(SEAT_STORAGE_KEY, JSON.stringify({ baseUrl: baseUrl.trim(), model: model.trim() }));
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApiKey(""); // the key field is cleared after a connect attempt either way, even a rejected invoke
      setConnecting(false);
    }
  }

  function chooseBody(body: Body) {
    setCustom(false);
    setBaseUrl(body.baseUrl ?? DEFAULT_BASE_URL);
    setModel(body.id);
    setMoreOpen(false);
    setPanel("default");
  }

  function chooseCustom() {
    setCustom(true);
    setMoreOpen(false);
    setPanel("default");
  }

  function copyAddModelRequest() {
    navigator.clipboard.writeText(ADD_MODEL_REQUEST).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }).catch(() => setCopied(false)); // clipboard unavailable: the sentence stays on screen to select by hand
  }

  const currentBody = custom ? null : (BODIES.find((b) => b.id === model) ?? null);
  const kimiSeat = currentBody?.baseUrl !== undefined && new URL(currentBody.baseUrl).host === "api.kimi.com";
  // The memory line stays only while the seat on screen IS the remembered
  // one — editing a field or choosing another brain takes it away.
  const showingMemory = rememberedSeat !== null && baseUrl === rememberedSeat.baseUrl && model === rememberedSeat.model;

  if (panel === "start") {
    return (
      <Card title="connect cairn's brain">
        <p>How do you want to power Cairn?</p>
        <div className="brain-list">
          {PRIMARY_BODIES.map((body) => (
            <BodyButton key={body.id} body={body} onChoose={chooseBody} />
          ))}
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <Pill kind="quiet" onClick={() => setPanel("picker")}>Choose a different brain</Pill>
        </div>
      </Card>
    );
  }

  if (panel === "picker") {
    return (
      <Card title="choose a different brain">
        <p className="small muted">Every way to power Cairn. This list is a starting point, not a fence: any model works.</p>
        <div className="brain-list">
          {PRIMARY_BODIES.map((body) => (
            <BodyButton key={body.id} body={body} onChoose={chooseBody} />
          ))}
          <button type="button" className="brain-item brain-toggle" onClick={() => setMoreOpen((open) => !open)}>
            <span className="brain-item-head"><strong>{moreOpen ? "▾" : "▸"} More choices ({MORE_BODIES.length})</strong></span>
            {moreOpen ? null : <span className="small muted">More models — same per-use billing, lower prices than K3.</span>}
          </button>
          {moreOpen ? MORE_BODIES.map((body) => (
            <BodyButton key={body.id} body={body} onChoose={chooseBody} />
          )) : null}
          <button type="button" className="brain-item" onClick={chooseCustom}>
            <span className="brain-item-head"><strong>Custom…</strong></span>
            <span className="small muted">Enter your own provider base URL and model — this is also where a local Ollama URL goes.</span>
          </button>
          <button type="button" className="brain-item" onClick={() => setPanel("add")}>
            <span className="brain-item-head"><strong>The model I want isn't listed…</strong></span>
            <span className="small muted">Use any model right now with the custom option, or have Cairn add it to this list once you're connected.</span>
          </button>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <Pill kind="quiet" onClick={() => { setMoreOpen(false); setPanel("start"); }}>Back</Pill>
        </div>
      </Card>
    );
  }

  if (panel === "add") {
    return (
      <Card title="the model I want isn't listed">
        <p><strong>Use it right now.</strong> Back on the picker, choose Custom… — it accepts any provider and any model id, including a local Ollama URL.</p>
        <p><strong>Add it to the list for good.</strong> Once Cairn is connected, say this in chat (put the model's real id in place of provider/model-id):</p>
        <p className="small add-model-sentence">{ADD_MODEL_REQUEST}</p>
        <div className="row">
          <Pill onClick={copyAddModelRequest}>{copied ? "Copied ✓" : "Copy the sentence"}</Pill>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          Cairn will start a task that checks the id against the provider's public list and adds it here — the same way every entry on the picker was added.
        </p>
        <div className="row" style={{ marginTop: 14 }}>
          <Pill kind="quiet" onClick={() => setPanel("picker")}>Back</Pill>
        </div>
      </Card>
    );
  }

  if (panel === "guide") {
    if (kimiSeat) {
      return (
        <Card title="where do I get a key?">
          <ol className="welcome-steps">
            <li>Open the Kimi Code Console and sign in with your Kimi account.</li>
            <li>Click "Create API Key", give it a name, and confirm.</li>
            <li>Copy the key right away — it is shown only once.</li>
            <li>Paste it here.</li>
          </ol>
          <div className="row">
            <Pill onClick={() => void cairn.openExternal(KIMI_CONSOLE_URL)}>Open the Kimi Code Console</Pill>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>
            Conversation uses the coding quota included with your membership; your plan and its remaining quota live in the console.
          </p>
          <p className="small muted" style={{ marginTop: 10 }}>
            Already signed into the Kimi Code command-line tool on this computer? Cairn can't borrow that sign-in yet — the console key above is the way today.
          </p>
          <div className="row" style={{ marginTop: 14 }}>
            <Pill kind="quiet" onClick={() => setPanel("default")}>Back</Pill>
          </div>
        </Card>
      );
    }
    return (
      <Card title="where do I get a key?">
        <ol className="welcome-steps">
          <li>Create a free account at openrouter.ai.</li>
          <li>Add a few dollars of credit to the account.</li>
          <li>Open the Keys page and create a new key.</li>
          <li>Copy it and paste it here.</li>
        </ol>
        <div className="row">
          <Pill onClick={() => void cairn.openExternal(OPENROUTER_KEYS_URL)}>Open openrouter.ai/keys</Pill>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          A long conversation usually costs a few cents; you can see prices per model on OpenRouter.
        </p>
        <div className="row" style={{ marginTop: 14 }}>
          <Pill kind="quiet" onClick={() => setPanel("default")}>Back</Pill>
        </div>
      </Card>
    );
  }

  return (
    <Card title="connect cairn's brain">
      <p>{kimiSeat
        ? "Paste your Kimi Code key — Cairn chooses everything else, and you can change it later."
        : "Paste your OpenRouter key — Cairn chooses everything else, and you can change it later."}</p>
      {showingMemory ? <p className="small muted">Cairn remembers your last choice — never your key.</p> : null}
      {error ? <ErrorCard message={error} /> : null}

      {custom ? (
        <>
          <Field label="Provider base URL">
            <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          </Field>
          <Field label="Model">
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. moonshotai/kimi-k3" />
          </Field>
        </>
      ) : (
        <p className="small muted" style={{ marginTop: 10 }}>
          Connecting with <strong>{currentBody?.name ?? model}</strong>{currentBody ? ` — ${currentBody.blurb}` : ""}
        </p>
      )}

      <Field label="API key">
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Stored encrypted; shown never again" />
      </Field>

      {card ? (
        <div style={{ marginTop: 14 }}>
          <p className="small"><strong>What may flow:</strong> {card.data}</p>
          <p className="small"><strong>Cost:</strong> {card.cost}</p>
        </div>
      ) : (
        <p className="small muted" style={{ marginTop: 14 }}>Enter a provider base URL to see what Cairn will share.</p>
      )}

      <label className="row" style={{ marginTop: 14, alignItems: "flex-start" }}>
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>{card ? card.checkbox : "I understand what will be shared and that conversation costs money on my account"}</span>
      </label>

      <div className="row" style={{ marginTop: 14 }}>
        <Pill kind="primary" disabled={!card || !checked || !model.trim() || !apiKey.trim() || connecting} onClick={() => void connect()}>
          {connecting ? "Connecting…" : "Connect"}
        </Pill>
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <Pill kind="quiet" onClick={() => setPanel("picker")}>Choose a different brain</Pill>
        <Pill kind="quiet" onClick={() => setPanel("guide")}>Where do I get a key?</Pill>
      </div>
    </Card>
  );
}
