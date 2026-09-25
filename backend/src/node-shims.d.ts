declare const process: {
  env: Record<string, string | undefined>;
  exitCode?: number;
};

declare module "node:http" {
  export interface IncomingMessage {
    method?: string;
    url?: string;
  }
  export interface ServerResponse {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(chunk?: string): void;
  }
  export interface Server {
    listen(port: number, host: string, callback?: () => void): this;
  }
  export function createServer(
    handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>,
  ): Server;
}
