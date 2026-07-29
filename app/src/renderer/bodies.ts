/** Cairn's curated list of "brains" shown on the connect card's picker. Kept
 * small and honest on purpose: a few choices plus a "Custom…" escape hatch,
 * not an exhaustive catalog.
 *
 * Entries without a `baseUrl` are OpenRouter model ids, checked directly
 * against the public, keyless catalog (`GET https://openrouter.ai/api/v1/models`)
 * on 2026-07-24 before shipping; the Kimi K3 entry and its price ($3/M input,
 * $15/M output — about 5× K2's $0.57/$2.30) were re-verified against the same
 * catalog on 2026-07-29. If a later provider catalog change retires one of
 * these ids, the connect flow still works — "Custom…" always accepts any
 * model string — but the curated entry itself would need a follow-up task.
 *
 * An entry MAY carry its own `baseUrl` when the seat is not OpenRouter. The
 * Kimi subscription entry's endpoint, fixed `kimi-for-coding` model id, key
 * source, and membership-quota billing were verified against Kimi's Help
 * Center and Kimi Code Docs on 2026-07-28.
 *
 * Every entry carries a `billing` line naming how it bills in plain words —
 * per-use key versus membership quota — so the picker never makes a beginner
 * guess. Keep blurbs honest about cost: K3 runs about 5× K2, so "a long
 * chat costs a few cents" belongs to K2 and must not be copied upward.
 *
 * Entries marked `primary` are the two doors on the connect card's first
 * screen (task 126): the recommended per-use seat and the membership seat.
 * Everything else lives behind the picker's "More choices" toggle. */
export interface Body {
  id: string;
  name: string;
  blurb: string;
  /** One plain line naming how this seat bills: per-use key or membership quota. */
  billing: string;
  baseUrl?: string;
  recommended?: true;
  /** Shown as a first-screen door on the connect card. */
  primary?: true;
}

export const BODIES: Body[] = [
  {
    id: "moonshotai/kimi-k3",
    name: "Kimi K3",
    blurb: "Kimi's newest model; a long chat usually costs a few dimes — about five times K2's price.",
    billing: "Bills per use — key from openrouter.ai",
    recommended: true,
    primary: true,
  },
  {
    id: "kimi-for-coding",
    name: "Kimi — your subscription",
    baseUrl: "https://api.kimi.com/coding/v1",
    blurb: "Runs on your Kimi membership's included coding quota, not pay-as-you-go; Cairn cannot see your quota.",
    billing: "Uses your membership's coding quota — key from the Kimi Code Console",
    primary: true,
  },
  {
    id: "moonshotai/kimi-k2",
    name: "Kimi K2",
    blurb: "Well-rounded and steady for everyday conversation; a long chat usually costs a few cents.",
    billing: "Bills per use — key from openrouter.ai",
  },
  {
    id: "deepseek/deepseek-chat-v3.1",
    name: "DeepSeek V3.1",
    blurb: "Strong at reasoning and code, priced lower than Kimi K2; a long chat usually costs a couple of cents.",
    billing: "Bills per use — key from openrouter.ai",
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    blurb: "OpenAI's small, quick model; capable for its size and about as cheap as the others here.",
    billing: "Bills per use — key from openrouter.ai",
  },
];

/** The exact, honest sentence shown next to the recommended entry. Not a
 * claim of quality Cairn hasn't checked — the eval set (recorded in the
 * conductor design spec) is what would confirm or change this pick. */
export const RECOMMENDATION_NOTE =
  "Cairn's starting recommendation — not yet evaluated; the evaluation set will confirm or change it.";

export const RECOMMENDED_BODY: Body = BODIES.find((b) => b.recommended === true) as Body;
