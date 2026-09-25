import { handleApiRequest, type SnapshotProvider } from "../backend/src/server.ts";
import { SnowTunnelService } from "../backend/src/snowTunnel/service.ts";
import { TdxClient } from "../backend/src/tdx/client.ts";

let service: SnapshotProvider | undefined;

function getService(): SnapshotProvider {
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
  try {
    const result = await handleApiRequest(getService(), request.method, "/api/snow-tunnel");
    response.statusCode = result.statusCode;
    for (const [name, value] of Object.entries(result.headers)) {
      response.setHeader(name, value);
    }
    response.end(typeof result.body === "string" ? result.body : JSON.stringify(result.body));
  } catch {
    response.statusCode = 503;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.setHeader("cache-control", "no-store");
    response.end(JSON.stringify({ error: "traffic_data_unavailable" }));
  }
}
