import { SnowTunnelService } from "../backend/src/snowTunnel/service.ts";
import { TdxClient } from "../backend/src/tdx/client.ts";

let service: SnowTunnelService | undefined;

function getService(): SnowTunnelService {
  if (service) return service;

  const clientId = process.env.TDX_CLIENT_ID?.trim();
  const clientSecret = process.env.TDX_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Missing TDX credentials");
  }

  service = new SnowTunnelService(new TdxClient(clientId, clientSecret));
  return service;
}

export default async function handler(request: any, response: any) {
  if (request.method !== "GET") {
    response.statusCode = 405;
    response.setHeader("allow", "GET");
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error: "method_not_allowed" }));
    return;
  }

  try {
    const refreshValue = request.query?.refresh;
    const forceRefresh = refreshValue === "1" || (Array.isArray(refreshValue) && refreshValue.includes("1"));
    const snapshot = await getService().getSnapshot(forceRefresh);
    response.statusCode = 200;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.setHeader("cache-control", "no-store");
    response.end(JSON.stringify(snapshot));
  } catch {
    response.statusCode = 503;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.setHeader("cache-control", "no-store");
    response.end(JSON.stringify({ error: "traffic_data_unavailable" }));
  }
}
