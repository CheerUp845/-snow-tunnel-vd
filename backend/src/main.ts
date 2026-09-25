import { readConfig } from "./config.ts";
import { buildServer } from "./server.ts";
import { SnowTunnelService } from "./snowTunnel/service.ts";
import { TdxClient } from "./tdx/client.ts";

const config = readConfig();
const service = new SnowTunnelService(new TdxClient(config.tdxClientId, config.tdxClientSecret));
const server = buildServer(service);
server.listen(config.port, "0.0.0.0", () => {
  console.log(`Snow Tunnel API listening on http://0.0.0.0:${config.port}`);
});
