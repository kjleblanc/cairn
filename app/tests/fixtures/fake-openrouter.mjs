// Task 131's fake OpenRouter: a bare node:http server that plays the two
// endpoints the PKCE dance touches. `GET /auth` IS the approval — the real
// page would render an Authorize button; the fixture redirects straight back
// to the callback_url with a minted code, echoing state exactly as sent.
// `POST /api/v1/auth/keys` refuses anything that is not the minted code plus
// the verifier whose S256 hash matches the challenge it recorded — so a green
// test proves the PKCE binding end-to-end, not just the happy HTTP shapes.

import { createServer } from "node:http";
import { createHash } from "node:crypto";

const MINTED_CODE = "fixture-auth-code";
const MINTED_KEY = "sk-or-fixture-key";

export async function start() {
  let lastAuth = null;
  let lastExchangeBody = null;
  let exchangeVerdict = null;
  let authHits = 0;

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/auth") {
      const callbackUrl = url.searchParams.get("callback_url");
      const challenge = url.searchParams.get("code_challenge");
      const state = url.searchParams.get("state");
      authHits += 1;
      lastAuth = { callbackUrl, challenge, state };
      const target = new URL(callbackUrl);
      target.searchParams.set("code", MINTED_CODE);
      if (state !== null) target.searchParams.set("state", state);
      res.writeHead(302, { location: target.toString() });
      res.end();
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/v1/auth/keys") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        lastExchangeBody = body;
        let parsed = null;
        try { parsed = JSON.parse(body); } catch { /* stays null */ }
        const ok = parsed !== null
          && parsed.code === MINTED_CODE
          && parsed.code_challenge_method === "S256"
          && typeof parsed.code_verifier === "string"
          && lastAuth !== null
          && createHash("sha256").update(parsed.code_verifier).digest("base64url") === lastAuth.challenge;
        exchangeVerdict = ok;
        if (!ok) {
          res.writeHead(403, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "bad exchange" }));
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ key: MINTED_KEY }));
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
    lastAuth: () => lastAuth,
    lastExchangeBody: () => lastExchangeBody,
    /** null until the first exchange arrives; then whether the PKCE binding held. */
    exchangeVerdict: () => exchangeVerdict,
    authHits: () => authHits,
    mintedKey: MINTED_KEY,
  };
}
