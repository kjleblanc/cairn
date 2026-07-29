import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";

/**
 * Task 131: "Sign in with OpenRouter" — OAuth PKCE for the conductor's
 * OpenRouter seat, run ENTIRELY in the main process. The renderer never
 * sees the minted key: it learns only "done" or a fixed refusal, and the
 * key goes straight from the exchange into the encrypted keystore via the
 * same `saveKey` path a pasted key takes.
 *
 * The flow, per OpenRouter's documented PKCE scheme (verified against
 * openrouter.ai/docs on 2026-07-29): open `AUTH_BASE/auth` with a loopback
 * `callback_url` (any 127.0.0.1 port is allowed for local tools) and an
 * S256 `code_challenge`; the owner's approval redirects the browser to the
 * loopback listener with a `code`; exchange the code + verifier at
 * `AUTH_BASE/api/v1/auth/keys` for `{ key }`.
 *
 * No `state` is REQUIRED on the callback: OpenRouter's documentation does
 * not promise to echo one, so a missing parameter is tolerated — the PKCE
 * binding itself ties a code to this attempt's challenge, and a code minted
 * for any other challenge fails the exchange. A state IS sent anyway, and
 * when one comes back it must match exactly (a wrong state means the
 * response belongs to some other attempt and is refused without settling).
 *
 * Electron-free on purpose: the listener factory and fetch are injectable
 * seams so the unit suite pins every behavior without a port or a network,
 * and no test can reach the real OpenRouter. `createLoopbackListener` is
 * the production listener factory the service wires in; it uses node:http
 * only, so this module still never imports Electron.
 */

export const OAUTH_CANCELLED = "Sign-in was cancelled. Nothing was stored.";
export const OAUTH_TIMEOUT = "The sign-in took too long. Nothing was stored — try again when you're ready.";
export const OAUTH_EXCHANGE_FAILED = "OpenRouter did not hand over a key. Nothing was stored.";
export const OAUTH_LISTEN_FAILED = "Cairn could not open its local sign-in listener. Nothing was stored.";

export interface Pkce {
  verifier: string;
  challenge: string;
  state: string;
}

export interface CallbackRequest {
  pathname: string;
  query: URLSearchParams;
}

export type Respond = (status: number, body: string) => void;
export type RequestHandler = (req: CallbackRequest, respond: Respond) => void;

export interface Listener {
  port: number;
  close(): void;
}

export interface FetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<FetchResponse>;

export interface OAuthAttempt {
  /** The OpenRouter authorization URL the owner's browser must visit. */
  authUrl: string;
  /** Resolves with the minted key, or rejects with one of the fixed messages. */
  waitForKey(): Promise<string>;
  /** Aborts the wait, closes the listener, refuses with OAUTH_CANCELLED. */
  cancel(): void;
}

/** The page the owner's browser lands on after a successful approval. */
const SUCCESS_PAGE =
  '<!doctype html><html><head><meta charset="utf-8"><title>Signed in</title></head>' +
  '<body style="font-family:system-ui;padding:2em;line-height:1.5">' +
  "<p>You&rsquo;re signed in &mdash; you can close this tab and return to Cairn.</p>" +
  "</body></html>";

const GONE_BODY = "This sign-in has already finished — you can close this tab.";
const WRONG_STATE_BODY = "That sign-in response is not for this attempt — finish the approval on the OpenRouter page Cairn opened.";
const MISSING_CODE_BODY = "Missing sign-in code — finish the approval on the OpenRouter page.";

export function createPkce(): Pkce {
  const verifier = randomBytes(32).toString("base64url");
  return {
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
    state: randomBytes(16).toString("base64url"),
  };
}

function stripTrailingSlash(base: string): string {
  return base.replace(/\/+$/, "");
}

export function buildAuthUrl(authBase: string, callbackUrl: string, pkce: Pkce): string {
  const query = new URLSearchParams({
    callback_url: callbackUrl,
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
    state: pkce.state,
  });
  return `${stripTrailingSlash(authBase)}/auth?${query.toString()}`;
}

export async function beginOpenRouterOAuth(opts: {
  authBase: string;
  listen: (handler: RequestHandler) => Promise<Listener>;
  fetchImpl: FetchLike;
  /** Defaults to three minutes — long enough for a beginner to find the right browser tab. */
  timeoutMs?: number;
}): Promise<OAuthAttempt> {
  const base = stripTrailingSlash(opts.authBase);
  const pkce = createPkce();

  let settled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let listener: Listener | null = null;
  let resolvePromise!: (key: string) => void;
  let rejectPromise!: (err: Error) => void;
  const promise = new Promise<string>((res, rej) => {
    resolvePromise = res;
    rejectPromise = rej;
  });
  // A cancel or timeout can land before any caller attaches waitForKey();
  // this handler keeps Node from reporting an unhandled rejection while the
  // real promise still rejects for its eventual consumer.
  promise.catch(() => {});

  const finish = (complete: () => void): void => {
    if (settled) return;
    settled = true;
    if (timer !== null) clearTimeout(timer);
    listener?.close();
    complete();
  };

  const handler: RequestHandler = (req, respond) => {
    if (settled) {
      respond(410, GONE_BODY);
      return;
    }
    if (req.pathname !== "/callback") {
      respond(404, "Not found.");
      return;
    }
    const state = req.query.get("state");
    if (state !== null && state !== pkce.state) {
      respond(400, WRONG_STATE_BODY);
      return;
    }
    const code = req.query.get("code");
    if (!code) {
      respond(400, MISSING_CODE_BODY);
      return;
    }
    respond(200, SUCCESS_PAGE);
    finish(() => {
      void (async () => {
        try {
          const res = await opts.fetchImpl(`${base}/api/v1/auth/keys`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code, code_verifier: pkce.verifier, code_challenge_method: "S256" }),
          });
          if (!res.ok) {
            rejectPromise(new Error(OAUTH_EXCHANGE_FAILED));
            return;
          }
          const payload = (await res.json()) as { key?: unknown };
          if (typeof payload.key !== "string" || payload.key.length === 0) {
            rejectPromise(new Error(OAUTH_EXCHANGE_FAILED));
            return;
          }
          resolvePromise(payload.key);
        } catch {
          rejectPromise(new Error(OAUTH_EXCHANGE_FAILED));
        }
      })();
    });
  };

  try {
    listener = await opts.listen(handler);
  } catch {
    throw new Error(OAUTH_LISTEN_FAILED);
  }

  timer = setTimeout(() => finish(() => rejectPromise(new Error(OAUTH_TIMEOUT))), opts.timeoutMs ?? 180_000);
  timer.unref?.();

  return {
    authUrl: buildAuthUrl(base, `http://127.0.0.1:${listener.port}/callback`, pkce),
    waitForKey: () => promise,
    cancel: () => finish(() => rejectPromise(new Error(OAUTH_CANCELLED))),
  };
}

/** The production listener: a one-shot loopback HTTP server on an ephemeral
 * 127.0.0.1 port — never on a routable interface. */
export function createLoopbackListener(handler: RequestHandler): Promise<Listener> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      handler({ pathname: url.pathname, query: url.searchParams }, (status, body) => {
        res.writeHead(status, { "content-type": status === 200 ? "text/html; charset=utf-8" : "text/plain; charset=utf-8" });
        res.end(body);
      });
    });
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      // Once listening, a late server error must never crash the main process.
      server.on("error", () => {});
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("loopback listener has no port"));
        return;
      }
      resolve({ port: address.port, close: () => server.close() });
    });
  });
}
