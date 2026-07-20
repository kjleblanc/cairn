import { createServer, connect, type Server, type Socket } from "node:net";

export interface BoundedNetworkGuard {
  proxyUrl: string;
  snapshot(): { connectCount: number; destinations: string[]; rejected: number };
  close(): Promise<void>;
}

export async function createBoundedNetworkGuard(): Promise<BoundedNetworkGuard> {
  let connectCount = 0;
  let rejected = 0;
  const destinations: string[] = [];
  const sockets = new Set<Socket>();
  const server: Server = createServer((client) => {
    sockets.add(client);
    client.once("close", () => sockets.delete(client));
    let header = "";
    client.on("data", function first(chunk) {
      header += chunk.toString("ascii");
      if (header.length > 8192) { rejected += 1; client.destroy(); return; }
      if (!header.includes("\r\n\r\n")) return;
      client.off("data", first);
      const line = header.split("\r\n", 1)[0] ?? "";
      if (line !== "CONNECT api.anthropic.com:443 HTTP/1.1") { rejected += 1; client.end("HTTP/1.1 403 Forbidden\r\n\r\n"); return; }
      connectCount += 1;
      destinations.push("api.anthropic.com:443");
      const upstream = connect(443, "api.anthropic.com");
      sockets.add(upstream);
      upstream.once("close", () => sockets.delete(upstream));
      upstream.once("connect", () => {
        client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        client.pipe(upstream);
        upstream.pipe(client);
      });
      upstream.once("error", () => client.destroy());
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("NETWORK_GUARD_FAILED");
  return {
    proxyUrl: `http://127.0.0.1:${address.port}`,
    snapshot: () => ({ connectCount, destinations: [...destinations], rejected }),
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
