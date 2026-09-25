function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function readConfig() {
  const port = Number(process.env.PORT ?? 8080);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return {
    tdxClientId: required("TDX_CLIENT_ID"),
    tdxClientSecret: required("TDX_CLIENT_SECRET"),
    port,
  };
}

export const SNOW_TUNNEL = {
  northbound: { minKm: 15.179, maxKm: 28.134 },
  southbound: { minKm: 15.203, maxKm: 28.128 },
  corridor: { minLat: 24.82, maxLat: 24.97, minLon: 121.62, maxLon: 121.82 },
} as const;
