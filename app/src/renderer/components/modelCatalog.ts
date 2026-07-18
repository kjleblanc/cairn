export type ProviderId = "anthropic" | "openai";
export type EffortLevel = "low" | "medium" | "high" | "xhigh" | "max" | "ultra";

export type ModelOption = {
  provider: ProviderId;
  id: string;
  name: string;
  description: string;
  efforts: readonly EffortLevel[];
};

export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-4-8";
export const DEFAULT_OPENAI_PREVIEW_MODEL = "gpt-5.6-terra";
export const PREVIEW_PROVIDER_KEY = "cairn-preview-provider";
export const PREVIEW_MODEL_KEY = "cairn-preview-model";
export const PREVIEW_EFFORT_KEY = "cairn-preview-effort";

const FULL_CLAUDE_EFFORT = ["low", "medium", "high", "xhigh", "max"] as const;
const CLASSIC_CLAUDE_EFFORT = ["low", "medium", "high", "max"] as const;
const OPENAI_ULTRA_EFFORT = ["low", "medium", "high", "xhigh", "max", "ultra"] as const;
const OPENAI_MAX_EFFORT = ["low", "medium", "high", "xhigh", "max"] as const;
const OPENAI_XHIGH_EFFORT = ["low", "medium", "high", "xhigh"] as const;

/**
 * Task 010's local catalog. Anthropic keeps the seven accepted Cairn picks;
 * OpenAI is representative mock data only and is never a live provider catalog.
 */
export const ANTHROPIC_MODELS: readonly ModelOption[] = [
  {
    provider: "anthropic",
    id: "claude-fable-5",
    name: "Claude Fable 5",
    description: "Anthropic's most capable choice for the hardest work.",
    efforts: FULL_CLAUDE_EFFORT,
  },
  {
    provider: "anthropic",
    id: "claude-opus-4-8",
    name: "Claude Opus 4.8",
    description: "Cairn's current default and a strong choice for complex work.",
    efforts: FULL_CLAUDE_EFFORT,
  },
  {
    provider: "anthropic",
    id: "claude-opus-4-7",
    name: "Claude Opus 4.7",
    description: "A previous Opus version kept for deliberate version choice.",
    efforts: FULL_CLAUDE_EFFORT,
  },
  {
    provider: "anthropic",
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    description: "An older Opus version with fewer effort choices.",
    efforts: CLASSIC_CLAUDE_EFFORT,
  },
  {
    provider: "anthropic",
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    description: "A balanced choice for everyday coding work.",
    efforts: FULL_CLAUDE_EFFORT,
  },
  {
    provider: "anthropic",
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    description: "A previous balanced Sonnet version.",
    efforts: CLASSIC_CLAUDE_EFFORT,
  },
  {
    provider: "anthropic",
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    description: "The fastest, lowest-cost Claude choice for simpler work.",
    efforts: [],
  },
];

export const OPENAI_PREVIEW_MODELS: readonly ModelOption[] = [
  {
    provider: "openai",
    id: "gpt-5.6-sol",
    name: "GPT-5.6-Sol",
    description: "Preview fixture: frontier agentic coding model.",
    efforts: OPENAI_ULTRA_EFFORT,
  },
  {
    provider: "openai",
    id: "gpt-5.6-terra",
    name: "GPT-5.6-Terra",
    description: "Preview fixture: balanced for everyday coding work.",
    efforts: OPENAI_ULTRA_EFFORT,
  },
  {
    provider: "openai",
    id: "gpt-5.6-luna",
    name: "GPT-5.6-Luna",
    description: "Preview fixture: fast and affordable for simpler tasks.",
    efforts: OPENAI_MAX_EFFORT,
  },
  {
    provider: "openai",
    id: "gpt-5.5",
    name: "GPT-5.5",
    description: "Preview fixture: complex coding and research work.",
    efforts: OPENAI_XHIGH_EFFORT,
  },
  {
    provider: "openai",
    id: "gpt-5.3-codex-spark",
    name: "GPT-5.3-Codex-Spark",
    description: "Preview fixture: an ultra-fast coding model.",
    efforts: OPENAI_XHIGH_EFFORT,
  },
];

export const modelsFor = (provider: ProviderId): readonly ModelOption[] =>
  provider === "anthropic" ? ANTHROPIC_MODELS : OPENAI_PREVIEW_MODELS;

export const isOpenAIPreviewId = (id: string): boolean =>
  OPENAI_PREVIEW_MODELS.some((model) => model.id === id.trim());

export function modelFor(provider: ProviderId, id: string): ModelOption | undefined {
  const resolved = id || (provider === "anthropic" ? DEFAULT_ANTHROPIC_MODEL : DEFAULT_OPENAI_PREVIEW_MODEL);
  return modelsFor(provider).find((model) => model.id === resolved);
}

export function effortChoices(provider: ProviderId, id: string): readonly EffortLevel[] {
  const known = modelFor(provider, id);
  if (known) return known.efforts;
  // Preserve today's five Claude choices for advanced Anthropic ids. A custom
  // OpenAI preview id has no fixture capability data, so leave effort Automatic.
  return provider === "anthropic" ? FULL_CLAUDE_EFFORT : [];
}

export function friendlyModel(provider: ProviderId, id: string): { name: string; exactId: string; description: string } {
  const exactId = id || (provider === "anthropic" ? DEFAULT_ANTHROPIC_MODEL : DEFAULT_OPENAI_PREVIEW_MODEL);
  const known = modelFor(provider, id);
  if (known) return { name: known.name, exactId, description: known.description };
  return { name: "Specific model", exactId, description: "An advanced model id entered by the owner." };
}
