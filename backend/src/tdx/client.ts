import type { TdxVdLive } from "../domain.ts";
import type { TdxVdStatic } from "./types.ts";

const TOKEN_URL = "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";
const STATIC_URL = "https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/VD/Freeway?$format=JSON";
const LIVE_URL = "https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/Live/VD/Freeway?$filter=contains(VDID,'N5')&$format=JSON";

interface CachedToken {
  accessToken: string;
  expiresAtMs: number;
}

interface TokenResponse {
  access_token?: unknown;
  expires_in?: unknown;
}

export interface TdxTrafficSource {
  getStaticFreewayVd(): Promise<TdxVdStatic[]>;
  getLiveFreewayVd(): Promise<TdxVdLive[]>;
}

export class TdxClient implements TdxTrafficSource {
  private token: CachedToken | null = null;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly fetchImpl: typeof fetch;

  constructor(clientId: string, clientSecret: string, fetchImpl: typeof fetch = fetch) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.fetchImpl = fetchImpl;
  }

  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.token && now < this.token.expiresAtMs - 60_000) return this.token.accessToken;

    const response = await this.fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });
    if (!response.ok) throw new Error(`TDX token request failed: ${response.status}`);

    const body = await response.json() as TokenResponse;
    if (typeof body.access_token !== "string" || typeof body.expires_in !== "number") {
      throw new Error("TDX token response malformed");
    }
    this.token = { accessToken: body.access_token, expiresAtMs: now + body.expires_in * 1000 };
    return this.token.accessToken;
  }

  private async getWithAuth(url: string, retry401 = true): Promise<unknown> {
    const accessToken = await this.getToken();
    const response = await this.fetchImpl(url, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (response.status === 401 && retry401) {
      this.token = null;
      return this.getWithAuth(url, false);
    }
    if (!response.ok) throw new Error(`TDX request failed: ${response.status}`);
    return response.json();
  }

  async getStaticFreewayVd(): Promise<TdxVdStatic[]> {
    const body = await this.getWithAuth(STATIC_URL) as { VDs?: unknown };
    if (!body || !Array.isArray(body.VDs)) throw new Error("TDX response missing VDs");
    return body.VDs as TdxVdStatic[];
  }

  async getLiveFreewayVd(): Promise<TdxVdLive[]> {
    const body = await this.getWithAuth(LIVE_URL) as { VDLives?: unknown };
    if (!body || !Array.isArray(body.VDLives)) throw new Error("TDX response missing VDLives");
    return body.VDLives as TdxVdLive[];
  }
}
