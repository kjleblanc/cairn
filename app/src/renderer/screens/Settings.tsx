import { useEffect, useState } from "react";
import type { UpdateInfo } from "../../shared/ipc";
import { Card, Pill } from "../components/Ui";
import { cairn } from "../api";

/** Current Claude models offered as picks; the field still accepts any typed id. */
const MODEL_PICKS = [
  "claude-fable-5",
  "claude-opus-4-8",
  "claude-opus-4-7",
  "claude-opus-4-6",
  "claude-sonnet-5",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
];
const DEFAULT_MODEL_ID = "claude-opus-4-8";
const EFFORT_PICKS = ["low", "medium", "high", "xhigh", "max"] as const;

export function Settings({ onBack }: { onBack: () => void }) {
  const [theme, setThemeState] = useState(localStorage.getItem("cairn-theme") ?? "system");
  const [sound, setSound] = useState(localStorage.getItem("cairn-sound") === "1");
  const [model, setModelState] = useState(localStorage.getItem("cairn-model") ?? "");
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [effort, setEffortState] = useState(localStorage.getItem("cairn-effort") ?? "");
  const [activeEffort, setActiveEffort] = useState<string | null>(null);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);

  // Apply the saved choices on open and learn what is actually active.
  useEffect(() => {
    void cairn.taskSetModel(localStorage.getItem("cairn-model") ?? "").then(setActiveModel);
    void cairn.taskSetEffort(localStorage.getItem("cairn-effort") ?? "").then(setActiveEffort);
  }, []);

  async function applyModel(value: string) {
    setModelState(value);
    if (value.trim()) localStorage.setItem("cairn-model", value.trim());
    else localStorage.removeItem("cairn-model");
    setActiveModel(await cairn.taskSetModel(value));
  }

  async function applyEffort(value: string) {
    setEffortState(value);
    if (value) localStorage.setItem("cairn-effort", value);
    else localStorage.removeItem("cairn-effort");
    setActiveEffort(await cairn.taskSetEffort(value));
  }

  function applyTheme(t: "system" | "light" | "dark") {
    setThemeState(t);
    if (t === "system") { localStorage.removeItem("cairn-theme"); delete document.documentElement.dataset.theme; }
    else { localStorage.setItem("cairn-theme", t); document.documentElement.dataset.theme = t; }
  }

  function toggleSound() {
    const next = !sound;
    setSound(next);
    if (next) localStorage.setItem("cairn-sound", "1");
    else localStorage.removeItem("cairn-sound");
  }

  async function check() {
    setChecking(true);
    setUpdate(await cairn.updateCheck());
    setChecking(false);
  }

  return (
    <div style={{ maxWidth: 560, margin: "24px auto" }}>
      <h1>Settings</h1>
      <Card title="appearance">
        <div className="row">
          {(["system", "light", "dark"] as const).map((t) => (
            <Pill key={t} kind={theme === t ? "primary" : "soft"} onClick={() => applyTheme(t)}>
              {t === "system" ? "Match my computer" : t === "light" ? "Light" : "Dark"}
            </Pill>
          ))}
        </div>
      </Card>
      <Card title="sound">
        <div className="row spread">
          <p>A soft pluck when a stone lands.</p>
          <Pill kind={sound ? "primary" : "soft"} onClick={toggleSound}>{sound ? "On" : "Off"}</Pill>
        </div>
      </Card>
      <Card title="model">
        <p className="muted">Which Claude model Cairn uses for a task. Pick from the list or type any model id; leave blank for the default ({DEFAULT_MODEL_ID}).</p>
        <input type="text" value={model} list="model-picks"
          placeholder={`Leave blank for the default (${DEFAULT_MODEL_ID})`}
          onChange={(e) => setModelState(e.target.value)}
          onBlur={() => void applyModel(model)} />
        <datalist id="model-picks">
          {MODEL_PICKS.map((m) => (
            <option key={m} value={m} label={m === DEFAULT_MODEL_ID ? `${m} — the default` : m} />
          ))}
        </datalist>
        <p className="small muted" style={{ marginTop: 10 }}>
          {activeModel ? `Active model: ${activeModel}` : "Checking the active model…"}
        </p>
        <p className="small muted">
          A bigger model can cost more per real run. Clearing this box returns to the default.
        </p>
      </Card>
      <Card title="effort">
        <p className="muted">How hard the model thinks on each step. Default lets the model decide.</p>
        <div className="row">
          <Pill kind={effort === "" ? "primary" : "soft"} onClick={() => void applyEffort("")}>Default</Pill>
          {EFFORT_PICKS.map((l) => (
            <Pill key={l} kind={effort === l ? "primary" : "soft"} onClick={() => void applyEffort(l)}>{l}</Pill>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          {activeEffort ? (activeEffort === "default" ? "Active effort: default (the model decides)" : `Active effort: ${activeEffort}`) : "Checking the active effort…"}
        </p>
        <p className="small muted">
          A higher effort spends more thinking per real run, so it costs more. Not every model supports every level.
        </p>
      </Card>
      <Card title="about">
        <div className="row spread">
          <p>Cairn Desktop{update ? ` v${update.current}` : ""}</p>
          <Pill onClick={() => void check()} disabled={checking}>{checking ? "Checking…" : "Check for updates"}</Pill>
        </div>
        {update && update.newer ? (
          <p style={{ marginTop: 10 }}>
            A newer version exists (v{update.latest}).{" "}
            <button className="pill pill-quiet" onClick={() => void cairn.openExternal("https://github.com/kjleblanc/cairn/releases/latest")}>
              Get it from the releases page
            </button>
          </p>
        ) : null}
        {update && !update.newer ? (
          <p className="small muted" style={{ marginTop: 10 }}>
            {update.latest ? "You're up to date." : "Couldn't reach the releases page — try again later."}
          </p>
        ) : null}
        <p className="small" style={{ marginTop: 10 }}>
          <button className="pill pill-quiet" onClick={() => void cairn.openExternal("https://kjleblanc.github.io/cairn/")}>The written guides</button>
        </p>
      </Card>
      <Pill kind="quiet" onClick={onBack}>Back</Pill>
    </div>
  );
}
