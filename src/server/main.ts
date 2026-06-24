import { pathToFileURL } from "node:url";
import type { Server } from "node:http";

import { loadEmailApiConfig, type EmailApiConfig } from "./emailApiConfig.js";
import { createEmailApiServer, type EmailApiServerDependencies } from "./emailApiServer.js";

export interface StartEmailApiServerOptions {
  config?: EmailApiConfig;
  listEmailMessages?: EmailApiServerDependencies["listEmailMessages"];
  extractEmailOrders?: EmailApiServerDependencies["extractEmailOrders"];
  extractLocalOrders?: EmailApiServerDependencies["extractLocalOrders"];
  log?: (message: string) => void;
}

export async function startEmailApiServer(options: StartEmailApiServerOptions = {}): Promise<Server> {
  const config = options.config ?? loadEmailApiConfig();
  const server = createEmailApiServer({
    config,
    listEmailMessages: options.listEmailMessages,
    extractEmailOrders: options.extractEmailOrders,
    extractLocalOrders: options.extractLocalOrders,
  });

  await new Promise<void>((resolve) => {
    server.listen(config.port, config.host, resolve);
  });

  options.log?.(`Email API server listening on http://${config.host}:${config.port}`);
  return server;
}

function isDirectRun(): boolean {
  return Boolean(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href);
}

if (isDirectRun()) {
  startEmailApiServer({ log: console.log }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
