import { createHash } from "node:crypto";
import { lstatSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { appendVerifiedDigest, externalMarkerContainer, readDigestSequence } from "./custody.js";

const CARD_DOMAIN = "cairn-result-card/v2";

/**
 * Who wrote this result card.
 *
 * The conversation file lives at `<project>/.cairn/conversations/NNN.jsonl` —
 * INSIDE the project root, which the Codex worker runs against with
 * `--sandbox workspace-write --cd <root>`. Nothing in core looks at `.cairn`,
 * and `ensureCairnExcluded` hides it from Git, so a line written there is
 * invisible to every verification Cairn performs: `statusLines`,
 * `scanChangedPaths`, `changedTaskPaths`, `protectedPathSnapshot`, and both
 * protected-work checks. A worker can therefore append a perfectly shaped
 * result card and the run still closes DONE. That card then renders under
 * "written by Cairn's runtime, not by the conversation" and enters the next
 * conductor turn labeled "verified by Cairn's runtime".
 *
 * Shape cannot answer "who wrote this", so authorship is recorded OUT of band:
 * when Cairn appends an envelope turn it also writes a marker — a digest of
 * the turn — into a file under Electron's `userData`. `readTurns` keeps an
 * envelope line only when that file already vouches for it.
 *
 * WHY A MARKER FILE OUTSIDE THE PROJECT RATHER THAN AN HMAC ON THE LINE. The
 * review's preferred shape was an HMAC written beside the card, keyed by a
 * secret in `userData`. That rests on the worker being unable to READ the key.
 * The Codex sandbox does not promise that: `workspace-write` bounds where a
 * worker may WRITE, and reads outside the workspace are permitted, so the very
 * worker this guards against can read a key file in `userData` and sign
 * whatever it likes. Putting the MARKER — not a secret — outside the project
 * rests on the boundary that actually holds, needs no key to keep secret, and
 * fails closed the same way. It is strictly stronger against this threat model
 * and has less to go wrong.
 *
 * Every failure drops cards rather than trusting them: no marker directory set,
 * no marker file, an unreadable one, or a digest that is simply not in it.
 *
 * Residual, stated plainly: the digest binds the project, the conversation, the
 * timestamp and the card, so a card cannot be moved between projects or
 * conversations or edited — but a worker can still DUPLICATE a line Cairn
 * itself wrote for that same conversation, since the copy is byte-identical to
 * something genuine. That shows the owner one of Cairn's own cards twice,
 * carrying its original timestamp; it cannot manufacture a claim Cairn never
 * made.
 */

let markerDir: string | null = null;

/** Points the marker store at a directory outside every project — in the app,
 * Electron's `userData`. Until this is called nothing verifies, which is the
 * fail-closed direction: envelope lines are dropped, never trusted. */
export function setCardMarkerDir(dir: string | null): void {
  markerDir = dir;
}

/** One spelling per project directory, so the same project always hashes to
 * the same marker file. Windows paths are case-insensitive; POSIX are not. */
function normalizedPath(value: string): string {
  return value.replace(/\\/g, "/");
}

function legacyProjectKey(dir: string): string {
  const resolved = resolve(dir).replace(/\\/g, "/");
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function canonicalProjectKey(dir: string): string {
  return normalizedPath(realpathSync.native(resolve(dir)));
}

function directProjectRoot(dir: string): boolean {
  try {
    const lexical = normalizedPath(resolve(dir));
    const real = canonicalProjectKey(dir);
    return process.platform === "win32" ? lexical.toLowerCase() === real.toLowerCase() : lexical === real;
  } catch {
    return false;
  }
}

function sameDirectory(left: string, right: string): boolean {
  const leftStat = lstatSync(left, { bigint: true });
  const rightStat = lstatSync(right, { bigint: true });
  return leftStat.isDirectory() && rightStat.isDirectory()
    && leftStat.dev === rightStat.dev
    && leftStat.ino !== 0n
    && leftStat.ino === rightStat.ino;
}

/** Old Windows markers lowercased their project key. Preserve them only when
 * lower- and upper-case probes both resolve to this exact directory. That is
 * true on ordinary case-insensitive volumes, including Unicode paths, and
 * fails closed when a case-sensitive directory could share the old key with
 * a genuinely different project. New v2 markers never lowercase. */
function legacyProjectIsUnambiguous(dir: string): boolean {
  if (!directProjectRoot(dir)) return false;
  if (process.platform !== "win32") return true;
  try {
    const real = realpathSync.native(resolve(dir));
    const lexical = resolve(dir);
    const lower = realpathSync.native(lexical.toLowerCase());
    const upper = realpathSync.native(lexical.toUpperCase());
    return sameDirectory(real, lower) && sameDirectory(real, upper);
  } catch {
    return false;
  }
}

/** JSON with object keys sorted, so the digest depends on the VALUES a card
 * carries and not on the order some later refactor happens to build them in.
 * `undefined` (an absent card) canonicalizes as null, so a line missing its
 * card still has one stable digest rather than none. */
function canonical(value: unknown): string {
  if (value === undefined || value === null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
}

/** The digest binds all four: the project, the conversation, the turn's own
 * timestamp, and the card itself. A genuine card cannot be replayed into
 * another project or another conversation, and no field of it can be edited. */
export function cardDigest(dir: string, conversationId: string, ts: string, card: unknown): string {
  return createHash("sha256")
    .update(canonical([CARD_DOMAIN, canonicalProjectKey(dir), conversationId, ts, card]))
    .digest("hex");
}

/** Pre-v2 cards used the lexical selected path and no domain separator. They
 * remain readable only when that spelling is already the real project root;
 * an aliased path can later be retargeted and therefore cannot safely carry
 * legacy authority into its new target. */
export function legacyCardDigest(dir: string, conversationId: string, ts: string, card: unknown): string {
  return createHash("sha256").update(canonical([legacyProjectKey(dir), conversationId, ts, card])).digest("hex");
}

export function cardDigestCandidates(dir: string, conversationId: string, ts: string, card: unknown): readonly string[] {
  const current = cardDigest(dir, conversationId, ts, card);
  return legacyProjectIsUnambiguous(dir)
    ? Object.freeze([current, legacyCardDigest(dir, conversationId, ts, card)])
    : Object.freeze([current]);
}

function markerFile(dir: string, create: boolean): string | null {
  const container = externalMarkerContainer(markerDir, dir, "card-markers", create);
  if (container === null) return null;
  const name = createHash("sha256").update(canonicalProjectKey(dir)).digest("hex");
  return join(container, `${name}.txt`);
}

function legacyMarkerFile(dir: string): string | null {
  if (!legacyProjectIsUnambiguous(dir)) return null;
  const container = externalMarkerContainer(markerDir, dir, "card-markers", false);
  if (container === null) return null;
  const name = createHash("sha256").update(legacyProjectKey(dir)).digest("hex");
  return join(container, `${name}.txt`);
}

/**
 * Vouches for one envelope turn Cairn is about to append. Throws when the
 * marker cannot be written: a card the store cannot vouch for must never be
 * appended, because it would show on screen once (the delta goes straight to
 * the renderer) and then vanish on the next read — which is a worse account
 * than no card at all.
 */
export function recordCardMarker(dir: string, conversationId: string, ts: string, card: unknown): void {
  let file: string | null;
  try {
    file = markerFile(dir, true);
  } catch {
    throw new Error("CARD_MARKER_CUSTODY_UNSAFE: Cairn's card marker store must stay outside the selected project.");
  }
  if (file === null) {
    throw new Error("CARD_MARKER_STORE_UNAVAILABLE: Cairn has no marker directory, so it cannot vouch for this result card.");
  }
  try {
    appendVerifiedDigest(file, cardDigest(dir, conversationId, ts, card));
  } catch {
    throw new Error("CARD_MARKER_VERIFY_FAILED: Cairn could not verify result-card custody.");
  }
}

/** Every marker recorded for `dir`, or an empty set when there is no marker
 * store, no file yet, or it cannot be read — all three of which mean the same
 * thing to the caller: nothing here is vouched for. */
export function cardMarkers(dir: string): ReadonlySet<string> {
  try {
    const currentFile = markerFile(dir, false);
    const legacyFile = legacyMarkerFile(dir);
    return new Set([
      ...readDigestSequence(currentFile),
      ...(legacyFile !== currentFile ? readDigestSequence(legacyFile) : []),
    ]);
  } catch {
    return new Set();
  }
}
