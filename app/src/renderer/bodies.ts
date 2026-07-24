/** Cairn's curated list of "brains" (OpenRouter models) shown on the
 * connect card's picker. Kept small and honest on purpose: three choices
 * plus a "Custom…" escape hatch, not an exhaustive catalog.
 *
 * `id` is the OpenRouter model id, checked directly against the public,
 * keyless catalog (`GET https://openrouter.ai/api/v1/models`) on 2026-07-24
 * before shipping. If a later provider catalog change retires one of these
 * ids, the connect flow still works — "Custom…" always accepts any model
 * string — but the curated entry itself would need a follow-up task. */
export interface Body {
  id: string;
  name: string;
  blurb: string;
  recommended?: true;
}

export const BODIES: Body[] = [
  {
    id: "moonshotai/kimi-k2",
    name: "Kimi K2",
    blurb: "Well-rounded and steady for everyday conversation; a long chat usually costs a few cents.",
    recommended: true,
  },
  {
    id: "deepseek/deepseek-chat-v3.1",
    name: "DeepSeek V3.1",
    blurb: "Strong at reasoning and code, priced lower than Kimi K2; a long chat usually costs a couple of cents.",
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    blurb: "OpenAI's small, quick model; capable for its size and about as cheap as the others here.",
  },
];

/** The exact, honest sentence shown next to the recommended entry. Not a
 * claim of quality Cairn hasn't checked — the eval set (recorded in the
 * conductor design spec) is what would confirm or change this pick. */
export const RECOMMENDATION_NOTE =
  "Cairn's starting recommendation — not yet evaluated; the evaluation set will confirm or change it.";

export const RECOMMENDED_BODY: Body = BODIES.find((b) => b.recommended === true) as Body;
