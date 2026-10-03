import { createServer } from "node:http";

export function recoveryAuthTarget(method: string | undefined, url: string | undefined) {
  return url === "/auth/v1/token?grant_type=password" && method === "POST" ? "/token?grant_type=password"
    : url === "/auth/v1/user" && method === "GET" ? "/user" : null;
}

/** Disposable loopback routing only. Authentication is real restored GoTrue,
 * not a mocked user, JWT verifier or cookie. No caller-controlled destination. */
export async function recoveryAuthGateway() {
  if (process.env.GITHUB_ACTIONS !== "true" || !/^\d{1,30}$/.test(process.env.GITHUB_RUN_ID ?? "")) throw new Error("Disposable runner required");
  const server = createServer(async (request, response) => {
    try {
      const target = recoveryAuthTarget(request.method, request.url);
      if (!target) { response.writeHead(404).end(); return; }
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of request) { size += chunk.length; if (size > 8192) { response.writeHead(413).end(); return; } chunks.push(chunk); }
      const result = await fetch("http://127.0.0.1:9999" + target, { method: request.method, headers: { "content-type": "application/json", ...(request.headers.authorization ? { authorization: request.headers.authorization } : {}) }, ...(request.method === "POST" ? { body: Buffer.concat(chunks) } : {}), redirect: "error", signal: AbortSignal.timeout(10000) });
      const bytes = Buffer.from(await result.arrayBuffer());
      response.writeHead(result.status, { "content-type": "application/json", "cache-control": "no-store" }).end(bytes);
    } catch { response.writeHead(502).end(); }
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(9998, "127.0.0.1", resolve); });
  return async () => { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); };
}
