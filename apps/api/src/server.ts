// Must be the first import: every env-dependent module relies on it.
import "./lib/load-env";
import { serve } from "@hono/node-server";
import { config } from "./config";
import { app } from "./app";
import { logger } from "hono/logger";

app.use(logger())

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`[api] listening on http://localhost:${info.port}`);
});
