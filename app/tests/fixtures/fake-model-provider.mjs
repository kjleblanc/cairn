// A reusable two-origin inference fixture for the transport-wide no-redirect
// contract. Both servers bind only to numeric loopback addresses. Scenarios
// choose only same-origin or the fixture's second loopback origin; callers can
// never supply an arbitrary redirect destination.

import { createHash } from "node:crypto";
import { createServer } from "node:http";

export const REDIRECT_STATUSES = Object.freeze([301, 302, 303, 307, 308]);

const LOCATION_CANARY = "inert-location-query-canary";
const RESPONSE_CANARY = "inert-followed-response-canary";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function emptyObservation() {
  return {
    requestCount: 0,
    headerBytes: 0,
    authorizationBytes: 0,
    bodyBytes: 0,
    requests: [],
  };
}

function snapshotOf(observation) {
  return {
    requestCount: observation.requestCount,
    headerBytes: observation.headerBytes,
    authorizationBytes: observation.authorizationBytes,
    bodyBytes: observation.bodyBytes,
    requests: observation.requests.map((request) => ({ ...request })),
  };
}

async function observe(request, origin, observation) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks);
  const authorization = typeof request.headers.authorization === "string"
    ? request.headers.authorization
    : "";
  const rawHeaders = request.rawHeaders.join("\r\n");
  const url = new URL(request.url ?? "/", origin);

  observation.requestCount += 1;
  observation.headerBytes += Buffer.byteLength(rawHeaders, "utf8");
  observation.authorizationBytes += Buffer.byteLength(authorization, "utf8");
  observation.bodyBytes += body.byteLength;
  observation.requests.push({
    method: request.method ?? "",
    pathname: url.pathname,
    contentType: request.headers["content-type"] ?? "",
    authorizationSha256: sha256(authorization),
    bodySha256: sha256(body),
    bodyBytes: body.byteLength,
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("FAKE_MODEL_PROVIDER_ADDRESS_UNAVAILABLE"));
        return;
      }
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function close(server) {
  if (!server.listening) return Promise.resolve();
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function followedResponse(response) {
  response.writeHead(200, { "content-type": "text/event-stream" });
  response.write(`data: {"choices":[{"delta":{"content":"${RESPONSE_CANARY}"}}]}\n\n`);
  response.end("data: [DONE]\n\n");
}

export async function start() {
  const scenarios = new Map();
  let nextScenario = 1;
  let sourceOrigin = "";
  let targetOrigin = "";

  const targetServer = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? "/", targetOrigin);
      const match = /^\/target\/(\d+)$/.exec(url.pathname);
      const scenario = match ? scenarios.get(match[1]) : undefined;
      if (!scenario) {
        response.writeHead(404).end();
        return;
      }
      await observe(request, targetOrigin, scenario.targetObservation);
      followedResponse(response);
    })().catch(() => response.destroy());
  });

  const sourceServer = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? "/", sourceOrigin);
      const ingress = /^\/redirect\/(\d+)\/v1\/chat\/completions$/.exec(url.pathname);
      if (ingress) {
        const scenario = scenarios.get(ingress[1]);
        if (!scenario) {
          response.writeHead(404).end();
          return;
        }
        await observe(request, sourceOrigin, scenario.sourceObservation);
        response.writeHead(scenario.status, { location: scenario.location });
        response.end();
        return;
      }

      const target = /^\/target\/(\d+)$/.exec(url.pathname);
      const scenario = target ? scenarios.get(target[1]) : undefined;
      if (!scenario) {
        response.writeHead(404).end();
        return;
      }
      await observe(request, sourceOrigin, scenario.targetObservation);
      followedResponse(response);
    })().catch(() => response.destroy());
  });

  targetOrigin = await listen(targetServer);
  try {
    sourceOrigin = await listen(sourceServer);
  } catch (error) {
    await close(targetServer);
    throw error;
  }

  return {
    sourceOrigin,
    targetOrigin,
    locationCanary: LOCATION_CANARY,
    responseCanary: RESPONSE_CANARY,
    scenario({ status, target }) {
      if (!REDIRECT_STATUSES.includes(status)) throw new Error("UNSUPPORTED_REDIRECT_STATUS");
      if (target !== "same-origin" && target !== "cross-origin") {
        throw new Error("UNSUPPORTED_REDIRECT_TARGET");
      }
      const id = String(nextScenario++);
      const sourceObservation = emptyObservation();
      const targetObservation = emptyObservation();
      const destination = target === "same-origin" ? sourceOrigin : targetOrigin;
      scenarios.set(id, {
        status,
        location: `${destination}/target/${id}?next=${LOCATION_CANARY}`,
        sourceObservation,
        targetObservation,
      });
      return {
        baseUrl: `${sourceOrigin}/redirect/${id}/v1`,
        snapshot: () => ({
          source: snapshotOf(sourceObservation),
          target: snapshotOf(targetObservation),
        }),
      };
    },
    close: async () => { await Promise.all([close(sourceServer), close(targetServer)]); },
  };
}
