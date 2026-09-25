import { createServer, type Server } from "node:http";
import type { SnowTunnelSnapshot } from "./snowTunnel/service.ts";
import { MOBILE_DASHBOARD_HTML } from "./webPage.ts";

export interface SnapshotProvider {
  getSnapshot(): Promise<SnowTunnelSnapshot>;
}

export interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}

export async function handleApiRequest(
  service: SnapshotProvider,
  method: string | undefined,
  pathname: string | undefined,
): Promise<ApiResponse> {
  if (method === "GET" && pathname === "/") {
    return {
      statusCode: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
      body: MOBILE_DASHBOARD_HTML,
    };
  }

  if (method !== "GET" || pathname !== "/api/snow-tunnel") {
    return { statusCode: 404, headers: { "content-type": "application/json; charset=utf-8" }, body: { error: "not_found" } };
  }

  try {
    const snapshot = await service.getSnapshot();
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
      body: snapshot,
    };
  } catch {
    return {
      statusCode: 503,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      body: { error: "traffic_data_unavailable" },
    };
  }
}

export function buildServer(service: SnapshotProvider): Server {
  return createServer(async (request, response) => {
    const pathname = request.url ? new URL(request.url, "http://localhost").pathname : undefined;
    const result = await handleApiRequest(service, request.method, pathname);
    response.statusCode = result.statusCode;
    for (const [name, value] of Object.entries(result.headers)) response.setHeader(name, value);
    response.end(typeof result.body === "string" ? result.body : JSON.stringify(result.body));
  });
}
