import type { ConductorConsentCard } from "../../shared/ipc.js";

/**
 * The owner-facing disclosure Cairn shows before it may act on the
 * conversation without per-message approval, as one pure function of
 * baseUrl+model. Main re-derives this and requires an exact field-by-field
 * match against what the renderer showed before it stores a key — the
 * renderer's copy is never trusted on its own.
 *
 * Pure on purpose: no Electron, no keystore, no I/O, so the unit suite can
 * pin every sentence without booting the app.
 *
 * WHY THE COST AND CHECKBOX STRINGS ARE BODY-AWARE. Both were written when
 * every connection was a metered API account: "pay-as-you-go" and
 * "conversation costs money on my account" are true there and false for a
 * subscription seat, where the owner already pays for the plan and the real
 * constraint is the plan's own quota — which Cairn cannot see or predict.
 * A consent sentence Cairn cannot keep is worse than a vaguer one it can,
 * so each host class states its own truth here rather than the card assuming
 * one. The Kimi facts (endpoint host, membership-quota billing, fixed
 * `kimi-for-coding` model id, console key source) were verified against
 * Kimi's Help Center and Kimi Code Docs on 2026-07-28.
 */

const KIMI_CODE_HOST = "api.kimi.com";

/** What may flow during conversation. True for every body; unchanged since
 * the connected-conductor contract was written. */
const DATA_SCOPE =
  "Your messages, this project's task records (PROJECT, the work log, recent briefs and reports), a summary of recent saved changes (the branch name and latest commit titles), and project file names. Never file contents. Never credentials. Cairn keeps conversation memory in a .cairn folder inside your project, kept out of git.";

/** Metered API accounts (OpenRouter and any custom OpenAI-compatible URL). */
const API_COST =
  "Pay-as-you-go on your provider account. Conversation runs without per-message approval while connected. After a task Cairn dispatches from chat finishes, Cairn takes one short comment turn on the result; it bills like any other turn. Disconnect at any time to delete the stored key.";
const API_CHECKBOX =
  "I understand what will be shared and that conversation costs money on my account";

/** The owner's Kimi membership, reached through its subscription endpoint. */
const KIMI_COST =
  "Runs on your Kimi membership's included coding quota — a subscription you already pay for, not per-token billing. Cairn cannot see how much quota you have or how much a conversation uses; your plan's own limits apply. Conversation runs without per-message approval while connected. After a task Cairn dispatches from chat finishes, Cairn takes one short comment turn on the result; it uses the same quota. Disconnect at any time to delete the stored key.";
const KIMI_CHECKBOX =
  "I understand what will be shared and that conversation uses my Kimi membership's quota, which Cairn cannot see";

export function consentCardFor(baseUrl: string, model: string): ConductorConsentCard {
  const host = new URL(baseUrl).host;
  const kimi = host === KIMI_CODE_HOST;
  return {
    provider: host,
    baseUrl,
    model,
    data: DATA_SCOPE,
    cost: kimi ? KIMI_COST : API_COST,
    checkbox: kimi ? KIMI_CHECKBOX : API_CHECKBOX,
  };
}
