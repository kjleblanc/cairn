import { useEffect, useState } from "react";
import { Card, Pill } from "./Ui";
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

/**
 * The model and effort dials, moved from Settings (task 006) so they sit next to
 * the "Start a task" button. Same saved keys (cairn-model, cairn-effort), same
 * task:setModel / task:setEffort calls, same blank-means-default rule.
 */
export function ModelEffort() {
  const [model, setModelState] = useState(localStorage.getItem("cairn-model") ?? "");
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [effort, setEffortState] = useState(localStorage.getItem("cairn-effort") ?? "");
  const [activeEffort, setActiveEffort] = useState<string | null>(null);

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

  return (
    <Card title="model & effort">
      <p className="muted">Which Claude model runs the task, and how hard it thinks. Pick from the list or type any model id; leave blank for the default ({DEFAULT_MODEL_ID}).</p>
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
      <div className="row" style={{ marginTop: 10 }}>
        <Pill kind={effort === "" ? "primary" : "soft"} onClick={() => void applyEffort("")}>Default</Pill>
        {EFFORT_PICKS.map((l) => (
          <Pill key={l} kind={effort === l ? "primary" : "soft"} onClick={() => void applyEffort(l)}>{l}</Pill>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>
        {activeEffort ? (activeEffort === "default" ? "Active effort: default (the model decides)" : `Active effort: ${activeEffort}`) : "Checking the active effort…"}
      </p>
      <p className="small muted">
        A bigger model, or a higher effort, costs more per real run. Not every model supports every level.
      </p>
    </Card>
  );
}
