import { useEffect, useMemo, useState } from "react";
import { cairn } from "../api";
import { Card, Pill } from "./Ui";
import {
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OPENAI_PREVIEW_MODEL,
  PREVIEW_EFFORT_KEY,
  PREVIEW_MODEL_KEY,
  PREVIEW_PROVIDER_KEY,
  effortChoices,
  friendlyModel,
  isOpenAIPreviewId,
  modelFor,
  modelsFor,
  type EffortLevel,
  type ProviderId,
} from "./modelCatalog";

type Selection = { provider: ProviderId; model: string; effort: string };

const PROVIDER_NAMES: Record<ProviderId, string> = {
  anthropic: "Anthropic (Claude Code)",
  openai: "OpenAI (Codex / ChatGPT account)",
};

const EFFORT_NAMES: Record<EffortLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "Extra high",
  max: "Maximum",
  ultra: "Ultra",
};

function savedAnthropic(): Selection {
  return {
    provider: "anthropic",
    model: localStorage.getItem("cairn-model") ?? "",
    effort: localStorage.getItem("cairn-effort") ?? "",
  };
}

function initialSelection(mock: boolean): Selection {
  if (mock && sessionStorage.getItem(PREVIEW_PROVIDER_KEY) === "openai") {
    return {
      provider: "openai",
      model: sessionStorage.getItem(PREVIEW_MODEL_KEY) || DEFAULT_OPENAI_PREVIEW_MODEL,
      effort: sessionStorage.getItem(PREVIEW_EFFORT_KEY) ?? "",
    };
  }
  return savedAnthropic();
}

function effortName(effort: string): string {
  return effort && effort !== "default"
    ? (EFFORT_NAMES[effort as EffortLevel] ?? effort)
    : "Automatic — the model decides";
}

/**
 * Task 010's provider-aware chooser is a Draft. Anthropic keeps the accepted
 * storage and IPC path. OpenAI can only exercise the already-offline MockEngine,
 * and its preview selection lives in sessionStorage rather than durable settings.
 */
export function ModelEffort({ mock }: { mock: boolean }) {
  const [active, setActive] = useState<Selection>(() => initialSelection(mock));
  const [resolvedModel, setResolvedModel] = useState(() => friendlyModel(active.provider, active.model).exactId);
  const [resolvedEffort, setResolvedEffort] = useState(() => active.effort || "default");
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Selection>(() => initialSelection(mock));
  const [search, setSearch] = useState("");
  const [customId, setCustomId] = useState("");
  const [resetNote, setResetNote] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  // App boot applies the same desired setup before rendering this card. Repeat
  // it here to learn the environment-resolved model/effort for an exact summary,
  // and whenever this dashboard remounts after a same-window preview.
  useEffect(() => {
    let cancelled = false;
    const desired = initialSelection(mock);
    setReady(false);
    void (async () => {
      const model = await cairn.taskSetModel(desired.model);
      const effort = await cairn.taskSetEffort(desired.effort);
      if (!cancelled) {
        setActive(desired);
        setResolvedModel(model);
        setResolvedEffort(effort);
        setReady(true);
      }
    })().catch(() => {
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, [mock]);

  const summary = friendlyModel(active.provider, resolvedModel);
  const stageEfforts = effortChoices(stage.provider, stage.model);
  const selectedKnownModel = modelFor(stage.provider, stage.model);
  const selectedIsCustom = Boolean(stage.model.trim()) && !selectedKnownModel;

  const filteredModels = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return modelsFor(stage.provider);
    return modelsFor(stage.provider).filter((model) =>
      `${model.name} ${model.id} ${model.description}`.toLowerCase().includes(needle));
  }, [search, stage.provider]);

  function beginChange() {
    const effortStillFits = !active.effort || effortChoices(active.provider, active.model).includes(active.effort as EffortLevel);
    setStage({ ...active, effort: effortStillFits ? active.effort : "" });
    setSearch("");
    setCustomId(active.model.trim() && !modelFor(active.provider, active.model) ? active.model : "");
    setResetNote(effortStillFits ? null : "That model does not offer the active effort, so the staged choice is now Automatic.");
    setApplyError(null);
    setOpen(true);
  }

  function cancelChange() {
    setOpen(false);
    setSearch("");
    setCustomId("");
    setResetNote(null);
    setApplyError(null);
  }

  function chooseProvider(provider: ProviderId) {
    if (provider === "openai" && !mock) return;
    const next = provider === "anthropic"
      ? savedAnthropic()
      : {
          provider: "openai" as const,
          model: sessionStorage.getItem(PREVIEW_MODEL_KEY) || DEFAULT_OPENAI_PREVIEW_MODEL,
          effort: sessionStorage.getItem(PREVIEW_EFFORT_KEY) ?? "",
        };
    const effortStillFits = !next.effort || effortChoices(next.provider, next.model).includes(next.effort as EffortLevel);
    setStage({ ...next, effort: effortStillFits ? next.effort : "" });
    setSearch("");
    setCustomId(next.model.trim() && !modelFor(next.provider, next.model) ? next.model : "");
    setResetNote(effortStillFits ? null : "That provider's model does not offer the previous effort, so the staged choice is now Automatic.");
  }

  function chooseModel(model: string) {
    const allowed = effortChoices(stage.provider, model);
    const effortStillFits = !stage.effort || allowed.includes(stage.effort as EffortLevel);
    setStage({ ...stage, model, effort: effortStillFits ? stage.effort : "" });
    setResetNote(effortStillFits ? null : "That model does not offer the previous effort, so the staged choice is now Automatic.");
    if (!modelFor(stage.provider, model)) setCustomId(model);
    else setCustomId("");
  }

  async function applySelection() {
    if (stage.provider === "openai" && !mock) {
      setApplyError("OpenAI is not connected in this Draft.");
      return;
    }

    const next: Selection = {
      provider: stage.provider,
      model: stage.model.trim(),
      effort: stage.effort,
    };
    if (next.provider === "anthropic" && isOpenAIPreviewId(next.model)) {
      setApplyError("That id belongs to the OpenAI mock preview. It cannot be saved as an Anthropic model.");
      return;
    }
    setApplying(true);
    setApplyError(null);
    try {
      if (next.provider === "openai") next.model ||= DEFAULT_OPENAI_PREVIEW_MODEL;

      // Sequential on purpose: taskSetModel's existing preload bridge carries the
      // durable Claude effort, then this call establishes the staged effort.
      const model = await cairn.taskSetModel(next.model);
      const effort = await cairn.taskSetEffort(next.effort);

      if (next.provider === "anthropic") {
        if (next.model) localStorage.setItem("cairn-model", next.model);
        else localStorage.removeItem("cairn-model");
        if (next.effort) localStorage.setItem("cairn-effort", next.effort);
        else localStorage.removeItem("cairn-effort");
        sessionStorage.removeItem(PREVIEW_PROVIDER_KEY);
        sessionStorage.removeItem(PREVIEW_MODEL_KEY);
        sessionStorage.removeItem(PREVIEW_EFFORT_KEY);
      } else {
        // Preview settings are deliberately window-scoped. Durable Claude keys
        // are never read, changed, or removed by this branch.
        sessionStorage.setItem(PREVIEW_PROVIDER_KEY, "openai");
        sessionStorage.setItem(PREVIEW_MODEL_KEY, next.model);
        sessionStorage.setItem(PREVIEW_EFFORT_KEY, next.effort);
      }

      setActive(next);
      setResolvedModel(model);
      setResolvedEffort(effort);
      setOpen(false);
      setSearch("");
      setCustomId("");
      setResetNote(null);
    } catch {
      setApplyError("Cairn could not finish applying that setup. Your saved setup was not changed.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Card title="model & effort">
      <div className="model-summary">
        <div className="model-summary-copy">
          <p className="small muted">For the next task</p>
          <p className="model-provider-name">
            {PROVIDER_NAMES[active.provider]}
            {active.provider === "openai" ? <span className="preview-tag">mock preview</span> : null}
          </p>
          <p className="model-summary-name">
            {active.provider === "anthropic" && !active.model ? "Cairn default · " : ""}{summary.name}
          </p>
          <p className="small muted">{summary.description}</p>
          <p className="small mono model-exact-id">{resolvedModel}</p>
          <p className="small">Thinking effort: {effortName(resolvedEffort)}</p>
        </div>
        <button type="button" className="pill pill-quiet" aria-expanded={open} aria-controls="model-effort-chooser"
          disabled={!ready} onClick={open ? cancelChange : beginChange}>
          {open ? "Close" : "Change"}
        </button>
      </div>

      {open ? (
        <div className="model-chooser" id="model-effort-chooser">
          <div className="chooser-section">
            <p className="chooser-label">AI provider</p>
            <div className="provider-grid" role="group" aria-label="AI provider">
              <button type="button" className={`provider-option${stage.provider === "anthropic" ? " provider-option-selected" : ""}`}
                aria-pressed={stage.provider === "anthropic"} onClick={() => chooseProvider("anthropic")}>
                <span>Anthropic</span>
                <small>Claude Code · connected today</small>
              </button>
              <button type="button" className={`provider-option${stage.provider === "openai" ? " provider-option-selected" : ""}`}
                aria-pressed={stage.provider === "openai"} disabled={!mock} onClick={() => chooseProvider("openai")}>
                <span>OpenAI</span>
                <small>{mock ? "Mock preview · not connected" : "Not connected in this Draft"}</small>
              </button>
            </div>
          </div>

          {stage.provider === "openai" ? (
            <p className="preview-note"><strong>Preview only.</strong> These choices use Cairn's offline demo engine. No OpenAI provider, login, or model call is connected.</p>
          ) : null}

          <div className="chooser-section">
            <label className="chooser-label" htmlFor="model-search">Model</label>
            <input id="model-search" type="text" value={search} placeholder="Search models…"
              onChange={(event) => setSearch(event.target.value)} />
            <div className="model-list" role="radiogroup" aria-label={`${PROVIDER_NAMES[stage.provider]} models`}>
              {filteredModels.map((model) => {
                const isDefault = stage.provider === "anthropic" && model.id === DEFAULT_ANTHROPIC_MODEL;
                const selected = stage.model === model.id || (isDefault && stage.model === "");
                return (
                <button type="button" key={model.id} className={`model-option${selected ? " model-option-selected" : ""}`}
                  role="radio" aria-checked={selected} onClick={() => chooseModel(isDefault ? "" : model.id)}>
                  <span className="model-option-main"><strong>{isDefault ? `Cairn default · ${model.name}` : model.name}</strong><span>{model.description}</span></span>
                  <span className="mono small">{model.id}</span>
                </button>
                );
              })}
              {filteredModels.length === 0 ? <p className="small muted model-empty">No models match that search.</p> : null}
            </div>

            <details className="model-advanced" open={selectedIsCustom || undefined}>
              <summary>Advanced: specific model ID</summary>
              <p className="small muted">Use this only when you know the exact id. Cairn cannot confirm which effort levels a custom id supports.</p>
              <input type="text" value={customId} placeholder="Type a specific model ID" aria-label="Specific model ID"
                onChange={(event) => {
                  const value = event.target.value;
                  setCustomId(value);
                  chooseModel(value);
                }} />
            </details>
          </div>

          <div className="chooser-section">
            <p className="chooser-label">Thinking effort</p>
            {stageEfforts.length === 0 ? (
              <p className="small muted">{selectedIsCustom && stage.provider === "openai"
                ? "Cairn cannot confirm effort support for this preview id, so it will stay Automatic."
                : "This model manages thinking effort automatically."}</p>
            ) : (
              <div className="row effort-options" role="group" aria-label="Thinking effort">
                <button type="button" className={stage.effort === "" ? "pill pill-primary" : "pill"} aria-pressed={stage.effort === ""}
                  onClick={() => { setStage({ ...stage, effort: "" }); setResetNote(null); }}>
                  Automatic — the model decides
                </button>
                {stageEfforts.map((effort) => (
                  <button type="button" key={effort} className={stage.effort === effort ? "pill pill-primary" : "pill"}
                    aria-pressed={stage.effort === effort}
                    onClick={() => { setStage({ ...stage, effort }); setResetNote(null); }}>
                    {EFFORT_NAMES[effort]}
                  </button>
                ))}
              </div>
            )}
            {resetNote ? <p className="small effort-reset" role="status">{resetNote}</p> : null}
          </div>

          {applyError ? <p className="small chooser-error" role="alert">{applyError}</p> : null}
          <div className="row chooser-actions">
            <Pill kind="quiet" onClick={cancelChange} disabled={applying}>Cancel</Pill>
            <Pill kind="primary" onClick={() => void applySelection()} disabled={applying || (stage.provider === "openai" && !mock)}>
              {applying ? "Applying…" : "Use this setup"}
            </Pill>
          </div>
        </div>
      ) : null}

      <p className="small muted model-cost-note">
        Price and speed depend on the model. More thinking effort can take longer and cost more.
      </p>
      {active.provider === "openai" ? <p className="small preview-footnote">Mock session only · your saved Claude setup is untouched.</p> : null}
    </Card>
  );
}
