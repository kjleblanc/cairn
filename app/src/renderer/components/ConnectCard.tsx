import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ConductorConsentCard, ConductorRecoveryCard, ConductorStatus } from "../../shared/ipc";
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

type Panel = "start" | "default" | "picker" | "add" | "oauth";

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
 * checkbox labels, so a plan-based seat never sits under "costs money" and
 * file contents always have their own explicit authorization.
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
 * forgotten, not repaired.
 *
 * Task 131 adds the one-click door: on any OpenRouter seat, a "Sign in with
 * OpenRouter" button above the key field starts the PKCE dance in main —
 * same consent checkboxes, no key anywhere — and the card switches to an
 * `oauth` waiting panel with a fallback link and a Cancel. The terminal
 * event arrives over `onConductorOAuth`: done behaves exactly like a
 * pasted-key success (seat memory, close), failed returns here with the
 * fixed refusal. The paste path below is byte-identical and stays the
 * universal fallback; Kimi and custom seats show no sign-in button.
 *
 * Task 137 puts the card on a diet and makes sign-in the whole default path
 * for OpenRouter seats: body name, the consent block, its authorization, one
 * button. The key path collapses behind a "Use a key instead" toggle that
 * opens three short inline steps (console button, create-and-copy, paste
 * field); the Kimi seat shows its three steps directly, and the separate
 * "Where do I get a key?" guide panel is gone — the steps live where
 * they're needed. The duplicated intro and "Connecting with X — blurb"
 * lines are removed; the consent strings and the key field's placeholder
 * stay byte-identical, and a remembered seat still opens with the key path
 * expanded (task 127's pre-filled reconnect). */
function ConnectionSetupCard({ status, onConnected }: { status: ConductorStatus; onConnected: () => void }) {
  const [rememberedSeat] = useState<RememberedSeat | null>(() => readRememberedSeat());
  const initialSeat = status.consentRequired || status.projectAuthorizationRequired
    ? { baseUrl: status.baseUrl, model: status.model }
    : rememberedSeat;
  const [panel, setPanel] = useState<Panel>(initialSeat ? "default" : "start");
  const [custom, setCustom] = useState(
    initialSeat ? !BODIES.some((b) => b.id === initialSeat.model && bodyBaseUrl(b) === initialSeat.baseUrl) : false,
  );
  const [baseUrl, setBaseUrl] = useState(initialSeat?.baseUrl ?? DEFAULT_BASE_URL);
  const [model, setModel] = useState(initialSeat?.model ?? RECOMMENDED_BODY.id);
  const [moreOpen, setMoreOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  // Each affirmative choice is bound to the exact card text it accompanied.
  // A provider/model edit invalidates the loaded card immediately in render,
  // before the replacement IPC response can arrive.
  const [checkedCard, setCheckedCard] = useState<string | null>(null);
  const [fileContentsCheckedCard, setFileContentsCheckedCard] = useState<string | null>(null);
  const [loadedCard, setLoadedCard] = useState<ConductorConsentCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);
  /** Task 137: whether the OpenRouter key path is expanded. A remembered
   * seat opens it — the returning owner's reconnect stays one pre-filled
   * paste (task 127) — while a fresh door choice leads with sign-in. */
  const [keyPathOpen, setKeyPathOpen] = useState(rememberedSeat !== null);
  /** The OAuth event arrives outside React's flow, and the seat on screen at
   * THAT moment is what gets remembered — so the latest values ride a ref
   * rather than a mount-time closure. */
  const seatRef = useRef({ baseUrl, model });
  seatRef.current = { baseUrl, model };
  const card = loadedCard?.baseUrl === baseUrl.trim() && loadedCard.model === model.trim()
    ? loadedCard
    : null;
  const cardIdentity = card === null ? null : JSON.stringify(card);
  const checked = cardIdentity !== null && checkedCard === cardIdentity;
  const fileContentsChecked = cardIdentity !== null && fileContentsCheckedCard === cardIdentity;

  useEffect(() => {
    let cancelled = false;
    setLoadedCard(null);
    setValidationError(null);
    setCheckedCard(null);
    setFileContentsCheckedCard(null);
    try {
      new URL(baseUrl.trim());
    } catch {
      setValidationError("Use a valid HTTP(S) provider URL.");
      return;
    }
    void cairn.conductorConsentCard(baseUrl.trim(), model.trim()).then((response) => {
      if (cancelled) return;
      setLoadedCard(response.ok ? response.value : null);
      setValidationError(response.ok ? null : response.message);
    });
    return () => { cancelled = true; };
  }, [baseUrl, model]);

  async function connect() {
    if (!card || !checked || !fileContentsChecked || !model.trim() || !apiKey.trim() || connecting) return;
    setConnecting(true);
    setError(null);
    try {
      const response = await cairn.conductorConnect({
        card,
        apiKey,
        consentConfirmed: true,
        fileContentsConfirmed: true,
      });
      if (!response.ok) { setError(response.message); onConnected(); return; }
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

  /** Task 131: one terminal event per sign-in attempt. `done` means main has
   * already stored the minted key (it never crosses IPC), so the renderer
   * does exactly what a pasted-key success does — remember the seat, close
   * the card. `failed` returns to the paste screen with the fixed refusal as
   * the error. A renderer-initiated cancel emits nothing at all. */
  useEffect(() => {
    return cairn.onConductorOAuth((event) => {
      if (event.kind === "done") {
        localStorage.setItem(SEAT_STORAGE_KEY, JSON.stringify({ baseUrl: seatRef.current.baseUrl.trim(), model: seatRef.current.model.trim() }));
        onConnected();
      } else {
        setOauthUrl(null);
        setError(event.message);
        setPanel("default");
        onConnected();
      }
    });
  }, [onConnected]);

  /** Begins the PKCE dance in main. The same consent gate as connect(): an
   * unchecked box means no browser. Main replies with the auth URL immediately and
   * the card switches to the waiting panel; the outcome arrives above. */
  async function beginOAuth() {
    if (!card || !checked || !fileContentsChecked || connecting) return;
    setConnecting(true);
    setError(null);
    try {
      const response = await cairn.conductorOAuthBegin({
        card,
        consentConfirmed: true,
        fileContentsConfirmed: true,
      });
      if (!response.ok) { setError(response.message); onConnected(); return; }
      setOauthUrl(response.value.authUrl);
      setPanel("oauth");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }

  /** A stale saved connection needs only a new permission marker. Main
   * re-derives the card from that saved seat and rewrites no key bytes; this
   * renderer neither asks for nor receives the credential. */
  async function renewConsent() {
    if (!card || !checked || !fileContentsChecked || connecting) return;
    setConnecting(true);
    setError(null);
    try {
      const response = await cairn.conductorRenewConsent({
        card,
        consentConfirmed: true,
        fileContentsConfirmed: true,
      });
      if (!response.ok) { setError(response.message); onConnected(); return; }
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }

  async function disconnectSavedConnection() {
    if (connecting) return;
    setConnecting(true);
    setError(null);
    try {
      const response = await cairn.conductorDisconnect();
      if (!response.ok) { setError(response.message); onConnected(); return; }
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }

  function chooseBody(body: Body) {
    setCustom(false);
    setBaseUrl(body.baseUrl ?? DEFAULT_BASE_URL);
    setModel(body.id);
    setMoreOpen(false);
    setKeyPathOpen(false);
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
  /** The one-click door exists only where main would honor it: the pinned
   * OpenRouter seat (curated OpenRouter bodies, or that exact URL typed by
   * hand). Kimi and any other custom URL keep the paste-only path. */
  const openRouterSeat = baseUrl.trim() === OPENROUTER_BASE_URL;
  // The memory line stays only while the seat on screen IS the remembered
  // one — editing a field or choosing another brain takes it away.
  const showingMemory = rememberedSeat !== null && baseUrl === rememberedSeat.baseUrl && model === rememberedSeat.model;

  if (status.consentRequired || status.projectAuthorizationRequired) {
    const sharingPermissionChanged = status.consentRequired;
    return (
      <Card title={sharingPermissionChanged ? "review the new sharing permission" : "authorize this project"}>
        <p>
          {sharingPermissionChanged
            ? <>Your saved <strong>{status.provider}</strong> connection using <strong>{status.model}</strong> is paused. Cairn can now share a bounded snapshot of selected project-file contents, so review the wider permission before another conversation.</>
            : <>Your saved <strong>{status.provider}</strong> connection using <strong>{status.model}</strong> is paused for this project. Review and explicitly authorize this project before another conversation.</>}
        </p>
        <p className="small muted">Your saved key is still encrypted. Reviewing this permission does not contact the provider or replace the key.</p>
        {error ? <ErrorCard message={error} /> : null}
        {card ? (
          <>
            <div style={{ marginTop: 14 }}>
              <p className="small"><strong>What may flow:</strong> {card.data}</p>
              <p className="small"><strong>Cost:</strong> {card.cost}</p>
            </div>
            <label className="row" style={{ marginTop: 14, alignItems: "flex-start" }}>
              <input type="checkbox" checked={checked}
                onChange={(e) => setCheckedCard(e.target.checked ? cardIdentity : null)} />
              <span>{card.checkbox}</span>
            </label>
            <label className="row" style={{ marginTop: 10, alignItems: "flex-start" }}>
              <input type="checkbox" checked={fileContentsChecked}
                onChange={(e) => setFileContentsCheckedCard(e.target.checked ? cardIdentity : null)} />
              <span>{card.fileContentsCheckbox}</span>
            </label>
          </>
        ) : (
          <p className="small muted" style={{ marginTop: 14 }}>Loading the permission for this saved connection...</p>
        )}
        <div className="row" style={{ marginTop: 14 }}>
          <Pill kind="primary" disabled={!card || !checked || !fileContentsChecked || connecting} onClick={() => void renewConsent()}>
            {connecting ? "Saving..." : "Allow and continue"}
          </Pill>
          <Pill kind="quiet" disabled={connecting} onClick={() => void disconnectSavedConnection()}>
            Disconnect and delete the saved key
          </Pill>
        </div>
      </Card>
    );
  }

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
        <p className="small muted">Every way to power Cairn. This list is a starting point, not a fence: any compatible provider model ID works.</p>
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

  if (panel === "oauth") {
    return (
      <Card title="connect cairn's brain">
        <p><strong>Finish in your browser.</strong> Cairn opened OpenRouter's sign-in page — approve it there and this card finishes by itself. Nothing is stored until you approve.</p>
        {oauthUrl ? (
          <p className="small muted" style={{ marginTop: 10 }}>
            Browser didn't open?{" "}
            <a href={oauthUrl} onClick={(e) => { e.preventDefault(); void cairn.openExternal(oauthUrl); }}>
              Open the sign-in page yourself
            </a>
            .
          </p>
        ) : null}
        <div className="row" style={{ marginTop: 14 }}>
          <Pill kind="quiet" onClick={() => { void cairn.conductorOAuthCancel(); setOauthUrl(null); setPanel("default"); }}>Cancel</Pill>
        </div>
      </Card>
    );
  }

  // Task 137's quiet card: every screen says only what the next click needs.
  // The consent block and both checkboxes stay fully visible above every action —
  // they ARE the standing authorization — but everything around them is one
  // short line or a three-step list. Shared pieces keep the flavors honest:
  const keyInput = (
    <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Stored encrypted; shown never again" />
  );
  const consentBlock = card ? (
    <div style={{ marginTop: 14 }}>
      <p className="small"><strong>What may flow:</strong> {card.data}</p>
      <p className="small"><strong>Cost:</strong> {card.cost}</p>
    </div>
  ) : (
    <p className="small muted" style={{ marginTop: 14 }}>Enter a provider base URL to see what Cairn will share.</p>
  );
  const checkboxRow = card ? (
    <label className="row" style={{ marginTop: 14, alignItems: "flex-start" }}>
      <input type="checkbox" checked={checked}
        onChange={(e) => setCheckedCard(e.target.checked ? cardIdentity : null)} />
      <span>{card.checkbox}</span>
    </label>
  ) : null;
  const fileContentsCheckboxRow = card ? (
    <label className="row" style={{ marginTop: 10, alignItems: "flex-start" }}>
      <input type="checkbox" checked={fileContentsChecked}
        onChange={(e) => setFileContentsCheckedCard(e.target.checked ? cardIdentity : null)} />
      <span>{card.fileContentsCheckbox}</span>
    </label>
  ) : null;
  const connectRow = (
    <div className="row" style={{ marginTop: 14 }}>
      <Pill kind="primary" disabled={!card || !checked || !fileContentsChecked || !model.trim() || !apiKey.trim() || connecting} onClick={() => void connect()}>
        {connecting ? "Connecting…" : "Connect"}
      </Pill>
    </div>
  );

  return (
    <Card title="connect cairn's brain">
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
        <p style={{ marginTop: 10, marginBottom: 0 }}><strong>{currentBody?.name ?? model}</strong></p>
      )}
      {showingMemory ? <p className="small muted">Cairn remembers your last choice — never your key.</p> : null}
      {validationError ? <ErrorCard message={validationError} /> : error ? <ErrorCard message={error} /> : null}

      {kimiSeat ? (
        <>
          <ol className="welcome-steps" style={{ marginTop: 10 }}>
            <li><Pill onClick={() => void cairn.openExternal(KIMI_CONSOLE_URL)}>Open the Kimi Code Console</Pill></li>
            <li>Create a key and copy it — it's shown only once.</li>
            <li>Paste it here:</li>
          </ol>
          {keyInput}
          <p className="small muted" style={{ marginTop: 10 }}>
            Signed into the Kimi command-line tool? Cairn can't borrow it yet — the console key is the way.
          </p>
          {consentBlock}
          {checkboxRow}
          {fileContentsCheckboxRow}
          {connectRow}
        </>
      ) : null}

      {custom ? (
        <>
          <Field label="API key">{keyInput}</Field>
          {consentBlock}
          {checkboxRow}
          {fileContentsCheckboxRow}
          {connectRow}
        </>
      ) : null}

      {openRouterSeat && !custom ? (
        <>
          {consentBlock}
          {checkboxRow}
          {fileContentsCheckboxRow}
          <div className="row" style={{ marginTop: 14 }}>
            <Pill kind="primary" disabled={!card || !checked || !fileContentsChecked || connecting} onClick={() => void beginOAuth()}>
              {connecting ? "Opening sign-in…" : "Sign in with OpenRouter"}
            </Pill>
          </div>
          <p className="small muted" style={{ marginTop: 6 }}>No key needed — approve Cairn in your browser.</p>
          <div className="row" style={{ marginTop: 10 }}>
            <Pill kind="quiet" onClick={() => setKeyPathOpen((open) => !open)}>{keyPathOpen ? "Hide the key path" : "Use a key instead"}</Pill>
          </div>
          {keyPathOpen ? (
            <div style={{ marginTop: 10 }}>
              <p className="small muted">A key needs a free openrouter.ai account with a few dollars of credit.</p>
              <ol className="welcome-steps" style={{ marginTop: 6 }}>
                <li><Pill onClick={() => void cairn.openExternal(OPENROUTER_KEYS_URL)}>Open openrouter.ai/keys</Pill></li>
                <li>Create a key and copy it.</li>
                <li>Paste it here:</li>
              </ol>
              {keyInput}
              {connectRow}
            </div>
          ) : null}
        </>
      ) : null}

      <div className="row" style={{ marginTop: 14 }}>
        <Pill kind="quiet" onClick={() => setPanel("picker")}>Choose a different brain</Pill>
      </div>
    </Card>
  );
}

function RecoveryCard({ card, onRecovered }: { card: ConductorRecoveryCard; onRecovered: () => void }) {
  const [reviewing, setReviewing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function erase() {
    if (!confirmed || erasing) return;
    setErasing(true);
    setError(null);
    try {
      const response = await cairn.conductorDisconnect({ kind: card.kind, card, confirmed: true });
      if (!response.ok) {
        setError(response.message);
        onRecovered();
        return;
      }
      onRecovered();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setErasing(false);
    }
  }

  return (
    <Card title={card.title}>
      <p>Cairn found local model-connection state it cannot safely use or repair.</p>
      <p className="small"><strong>Effect:</strong> {card.effect}</p>
      <p className="small"><strong>Provider access:</strong> {card.exposure}</p>
      <p className="small"><strong>Recovery:</strong> {card.recovery}</p>
      {error ? <ErrorCard message={error} /> : null}
      {reviewing ? (
        <>
          <p className="small"><strong>Exact filenames in Cairn's private profile:</strong></p>
          <ul className="connection-recovery-targets">
            {card.targets.map((target) => <li key={target}>{target}</li>)}
          </ul>
          <label className="row" style={{ marginTop: 14, alignItems: "flex-start" }}>
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            <span>{card.confirmation}</span>
          </label>
          <div className="row" style={{ marginTop: 14 }}>
            <Pill kind="danger" disabled={!confirmed || erasing} onClick={() => void erase()}>
              {erasing ? "Erasing..." : card.title}
            </Pill>
            <Pill kind="quiet" disabled={erasing} onClick={() => { setReviewing(false); setConfirmed(false); setError(null); }}>
              Cancel
            </Pill>
          </div>
        </>
      ) : (
        <div className="row" style={{ marginTop: 14 }}>
          <Pill kind="danger" onClick={() => setReviewing(true)}>Review exact files</Pill>
        </div>
      )}
    </Card>
  );
}

/** Recovery is a separate component so the ordinary setup card's hook order
 * never changes when main switches into or out of a fail-closed state. */
export function ConnectCard(props: { status: ConductorStatus; onConnected: () => void }) {
  return props.status.recovery
    ? <RecoveryCard card={props.status.recovery} onRecovered={props.onConnected} />
    : <ConnectionSetupCard {...props} />;
}
