import { randomInt, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type {
  ConductorConversationSummary,
  ConductorStatus,
  ConductorStreamSnapshot,
  ConductorTurn,
} from "../../shared/ipc.js";
import type { DeviceInfo, DeviceStore } from "./devices.js";
import { onBridgeSync } from "./hub.js";

/**
 * Task 143: the phone bridge — one HTTP listener inside the main process,
 * bound to the machine's LAN address, translating plain HTTP onto the SAME
 * conductor service functions the IPC handlers call. The service layer is
 * untouched; this module never sees the provider key and never logs a
 * device token or pairing code.
 *
 * Live updates ride Server-Sent Events, not a hand-rolled WebSocket. The
 * owner delegated this call ("minimal WebSocket or long-polling … your
 * call"): SSE is the HTTP-native one-way push — no framing code to own, and
 * the browser's EventSource reconnects on its own. The spec's mapping ("one
 * stream per phone session") holds exactly; a later task that needs
 * phone-to-PC messaging can add request/response endpoints without touching
 * this channel. Every push carries the whole visible snapshot, so a phone
 * that missed events (sleep, tunnel, a closed tab) self-heals on the next
 * one — there is no per-client stream state to go stale.
 *
 * Fail-closed rules, all pinned by the unit suite:
 * - Unknown or revoked device tokens get exactly one refusal answer.
 * - Pairing codes are 6 digits, memory-only, single-use, five-minute-lived,
 *   one live at a time, and burned after a handful of wrong guesses.
 * - The provider key is unreachable from here: the injected service surface
 *   exposes only status/conversations/turns/current.
 * - The snapshot names the project by NAME, never by path, and drops the
 *   connection's baseUrl — the LAN hears no more than the screen shows.
 */

export const BRIDGE_DEFAULT_PORT = 7391;
export const BRIDGE_PORT_ATTEMPTS = 10;
export const PAIRING_CODE_TTL_MS = 5 * 60 * 1000;
export const PAIRING_MAX_ATTEMPTS = 5;

/** The one refusal an unknown or revoked token ever gets. */
export const NOT_PAIRED_ANSWER = "This device isn't paired with this computer.";
/** The one refusal a pairing attempt ever gets — wrong, expired, burned,
 * and already-used codes are the same answer. */
export const PAIR_REFUSED_ANSWER = "That code didn't work. Ask the computer for a new one.";

const DEVICE_COOKIE = "cairn_device";
const MAX_BODY_BYTES = 4096;
const SSE_PUSH_DEBOUNCE_MS = 150;
const SSE_HEARTBEAT_MS = 25_000;

/** The slice of the conductor service the bridge may call — the same
 * functions the IPC handlers call, no more. */
export interface BridgeService {
  status(): ConductorStatus;
  conversations(dir: string): ConductorConversationSummary[];
  turns(dir: string, id: string): ConductorTurn[];
  current(dir: string): ConductorStreamSnapshot | null;
}

export interface BridgeOptions {
  /** The single LAN address to bind — chosen by the caller (runtime.ts).
   * Never 0.0.0.0: the bridge exists on exactly one interface. */
  host: string;
  /** Preferred port; 0 means "any free one" (tests). A nonzero port walks
   * upward on EADDRINUSE — the fixed-port-with-honest-fallback decision. */
  port?: number;
  portAttempts?: number;
  devices: DeviceStore;
  service: BridgeService;
  currentProject(): { dir: string; name: string } | null;
  page: string;
  pairingTtlMs?: number;
  pairingMaxAttempts?: number;
  log?: (context: string, err: unknown) => void;
}

export interface Bridge {
  host: string;
  port: number;
  url: string;
  /** The desktop side of pairing: mint a fresh code (superseding any live
   * one) and show it. The code never leaves the main process except as the
   * pair request's guess — it is never logged. */
  beginPairing(): { code: string; expiresAt: string };
  revokeDevice(id: string): boolean;
  close(): Promise<void>;
}

/** What the phone renders. Conversation content only — no filesystem paths,
 * no provider URL, no tokens. */
interface BridgeSnapshot {
  status: { connected: boolean; consentRequired: boolean; provider: string; model: string };
  project: { name: string } | null;
  conversation: {
    id: string;
    turns: BridgeVisibleTurn[];
    streaming: { kind: string; startedAt: string; text: string } | null;
  } | null;
  device: { name: string };
}

type BridgeVisibleTurn = Extract<ConductorTurn, { role: "owner" | "cairn" | "envelope" }>;

/** Positive phone data-scope boundary. New conversation roles stay off the
 * LAN until a later owner decision explicitly admits them. */
export function bridgeVisibleTurns(turns: readonly ConductorTurn[]): BridgeVisibleTurn[] {
  return turns.filter((turn): turn is BridgeVisibleTurn =>
    turn.role === "owner" || turn.role === "cairn" || turn.role === "envelope");
}

interface LivePairing {
  code: string;
  expiresAt: number;
  attempts: number;
}

function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((resolve, reject) => {
    let size = 0;
    let over = false;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        // Over the cap: drain and discard (never destroy the socket — the
        // 400 still has to travel back over it). A pairing guess is a few
        // dozen bytes, so this can only be nonsense.
        over = true;
        chunks.length = 0;
        return;
      }
      if (!over) chunks.push(chunk);
    });
    req.on("end", () => resolve(over ? null : Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function cookieToken(req: IncomingMessage): string | null {
  const header = req.headers.cookie;
  if (typeof header !== "string") return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === DEVICE_COOKIE) {
      const value = part.slice(eq + 1).trim();
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

export async function startBridge(opts: BridgeOptions): Promise<Bridge> {
  const log = opts.log ?? (() => {});
  const pairingTtlMs = opts.pairingTtlMs ?? PAIRING_CODE_TTL_MS;
  const pairingMaxAttempts = opts.pairingMaxAttempts ?? PAIRING_MAX_ATTEMPTS;

  let pairing: LivePairing | null = null;
  /** Open SSE connections, keyed by device id so revocation can end a
   * device's sessions immediately, not on its next request. */
  const streams = new Map<string, Set<ServerResponse>>();

  function buildSnapshot(device: DeviceInfo): BridgeSnapshot {
    const st = opts.service.status();
    const project = opts.currentProject();
    let conversation: BridgeSnapshot["conversation"] = null;
    if (project !== null) {
      // The desktop Chat screen's own rule: the live stream's conversation,
      // otherwise the newest saved one. The phone follows the same rule, so
      // both screens are always looking at the same place.
      const stream = opts.service.current(project.dir);
      const id = stream?.conversationId ?? opts.service.conversations(project.dir).at(-1)?.id ?? null;
      if (id !== null) {
        conversation = {
          id,
          turns: bridgeVisibleTurns(opts.service.turns(project.dir, id)),
          streaming: stream !== null && stream.conversationId === id
            ? { kind: stream.kind, startedAt: stream.startedAt, text: stream.text }
            : null,
        };
      }
    }
    return {
      status: {
        connected: st.connected,
        consentRequired: st.consentRequired,
        provider: st.provider,
        model: st.model,
      },
      project: project === null ? null : { name: project.name },
      conversation,
      device: { name: device.name },
    };
  }

  function send(res: ServerResponse, status: number, body: string, contentType: string, extraHeaders: Record<string, string> = {}): void {
    res.writeHead(status, {
      "content-type": contentType,
      "cache-control": "no-store",
      ...extraHeaders,
    });
    res.end(body);
  }

  /** The one refusal path for token-bearing requests. Unknown and revoked
   * are the same answer, and it is the ONLY answer they get. */
  function authenticate(req: IncomingMessage, res: ServerResponse): DeviceInfo | null {
    const token = cookieToken(req);
    const device = token === null ? null : opts.devices.authenticate(token);
    if (device === null) {
      send(res, 401, NOT_PAIRED_ANSWER, "text/plain; charset=utf-8");
      return null;
    }
    return device;
  }

  function pushSnapshot(device: DeviceInfo, res: ServerResponse): void {
    let payload: string;
    try {
      payload = JSON.stringify(buildSnapshot(device));
    } catch (err) {
      log("bridge:snapshot", err);
      return;
    }
    res.write(`data: ${payload}\n\n`);
  }

  function openStream(req: IncomingMessage, res: ServerResponse, device: DeviceInfo): void {
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      "connection": "keep-alive",
    });
    res.write(": connected\n\n");
    pushSnapshot(device, res);

    let set = streams.get(device.id);
    if (!set) {
      set = new Set();
      streams.set(device.id, set);
    }
    set.add(res);

    // A fast reply stream emits a hub signal per chunk; a leading push plus
    // one trailing push per slice of time keeps the phone live without a
    // write per token.
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = onBridgeSync(() => {
      if (timer !== null) {
        dirty = true;
        return;
      }
      pushSnapshot(device, res);
      timer = setTimeout(() => {
        timer = null;
        if (dirty) {
          dirty = false;
          pushSnapshot(device, res);
        }
      }, SSE_PUSH_DEBOUNCE_MS);
      timer.unref?.();
    });

    const heartbeat = setInterval(() => {
      res.write(": ping\n\n");
    }, SSE_HEARTBEAT_MS);
    heartbeat.unref?.();

    const drop = (): void => {
      unsubscribe();
      if (timer !== null) clearTimeout(timer);
      clearInterval(heartbeat);
      const owned = streams.get(device.id);
      owned?.delete(res);
      if (owned && owned.size === 0) streams.delete(device.id);
    };
    res.on("close", drop);
    res.on("error", drop);
  }

  async function handlePair(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const raw = await readBody(req);
    if (raw === null) {
      send(res, 400, "Bad request.", "text/plain; charset=utf-8");
      return;
    }
    let body: { code?: unknown; name?: unknown };
    try {
      body = JSON.parse(raw) as { code?: unknown; name?: unknown };
    } catch {
      send(res, 400, "Bad request.", "text/plain; charset=utf-8");
      return;
    }
    const guess = typeof body.code === "string" ? body.code.trim() : "";
    const live = pairing;
    const expired = live !== null && Date.now() > live.expiresAt;
    if (expired) pairing = null;
    const matches = !expired
      && live !== null
      && guess.length === live.code.length
      && timingSafeEqual(Buffer.from(guess, "utf8"), Buffer.from(live.code, "utf8"));
    if (!matches) {
      if (live !== null && !expired) {
        live.attempts += 1;
        if (live.attempts >= pairingMaxAttempts) pairing = null; // burned
      }
      send(res, 403, PAIR_REFUSED_ANSWER, "text/plain; charset=utf-8");
      return;
    }
    pairing = null; // single-use
    const name = typeof body.name === "string" ? body.name : "";
    const { device, token } = opts.devices.add(name);
    send(res, 200, JSON.stringify({ name: device.name }), "application/json", {
      // Durable browser storage, per the spec — HttpOnly so page script can
      // never read it, SameSite=Strict so no other origin can ride it. No
      // Secure flag: v1 is plain HTTP on the home Wi-Fi, and the pairing
      // screen's disclosure sentence says so.
      "set-cookie": `${DEVICE_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/`,
    });
  }

  function route(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(req.url ?? "/", "http://bridge.local");
    if (req.method === "GET" && url.pathname === "/") {
      send(res, 200, opts.page, "text/html; charset=utf-8");
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/pair") {
      void handlePair(req, res).catch((err) => {
        log("bridge:pair", err);
        if (!res.headersSent) send(res, 500, "Something went wrong.", "text/plain; charset=utf-8");
      });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/state") {
      const device = authenticate(req, res);
      if (device === null) return;
      try {
        send(res, 200, JSON.stringify(buildSnapshot(device)), "application/json");
      } catch (err) {
        log("bridge:state", err);
        if (!res.headersSent) send(res, 500, "Something went wrong.", "text/plain; charset=utf-8");
      }
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/stream") {
      const device = authenticate(req, res);
      if (device === null) return;
      openStream(req, res, device);
      return;
    }
    send(res, 404, "Not found.", "text/plain; charset=utf-8");
  }

  // Bind with the honest fallback: the preferred port, then a short walk
  // upward if something already holds it. The bound port is reported, so
  // the desktop always shows the address that is actually true.
  const preferred = opts.port ?? BRIDGE_DEFAULT_PORT;
  const attempts = preferred === 0 ? 1 : (opts.portAttempts ?? BRIDGE_PORT_ATTEMPTS);
  const server: Server = createServer((req, res) => {
    try {
      route(req, res);
    } catch (err) {
      log("bridge:request", err);
      if (!res.headersSent) send(res, 500, "Something went wrong.", "text/plain; charset=utf-8");
    }
  });
  // Once listening, a late server error must never crash the main process.
  server.on("error", (err) => log("bridge:server", err));

  const port = await new Promise<number>((resolve, reject) => {
    let candidate = preferred;
    let tries = 0;
    const attempt = (): void => {
      const onError = (err: NodeJS.ErrnoException): void => {
        if (err.code === "EADDRINUSE" && tries < attempts - 1) {
          tries += 1;
          candidate += 1;
          attempt();
        } else {
          reject(err);
        }
      };
      server.once("error", onError);
      server.listen(candidate, opts.host, () => {
        server.removeListener("error", onError);
        const address = server.address();
        if (address === null || typeof address === "string") {
          reject(new Error("bridge listener has no port"));
          return;
        }
        resolve(address.port);
      });
    };
    attempt();
  });

  return {
    host: opts.host,
    port,
    url: `http://${opts.host}:${port}`,

    beginPairing(): { code: string; expiresAt: string } {
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const expiresAt = Date.now() + pairingTtlMs;
      pairing = { code, expiresAt, attempts: 0 };
      return { code, expiresAt: new Date(expiresAt).toISOString() };
    },

    revokeDevice(id: string): boolean {
      const revoked = opts.devices.revoke(id);
      if (!revoked) return false;
      // Sessions end immediately, per the spec — not on the next request.
      const open = streams.get(id);
      if (open) {
        for (const res of [...open]) res.end();
        streams.delete(id);
      }
      return true;
    },

    close(): Promise<void> {
      return new Promise((resolve) => {
        for (const set of streams.values()) {
          for (const res of [...set]) res.end();
        }
        streams.clear();
        server.close(() => resolve());
      });
    },
  };
}
