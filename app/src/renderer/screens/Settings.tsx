import { useState } from "react";
import type { UpdateInfo } from "../../shared/ipc";
import { Card, Pill } from "../components/Ui";
import { cairn } from "../api";

export function Settings({ onBack }: { onBack: () => void }) {
  const [theme, setThemeState] = useState(localStorage.getItem("cairn-theme") ?? "system");
  const [sound, setSound] = useState(localStorage.getItem("cairn-sound") === "1");
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);

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
