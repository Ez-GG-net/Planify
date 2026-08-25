// Must be the first import: every env-dependent module relies on it.
import "./lib/load-env";
import { serve } from "@hono/node-server";
import { config } from "./config";
import { app } from "./app";
import { logger } from "hono/logger";
import { checkDatabase } from "./db";

app.use(logger())

async function main() {
  // Verify Postgres is reachable before accepting traffic.
  // Warn loudly but don't crash — the DB may come up later in dev.
  const dbOk = await checkDatabase();
  if (!dbOk) {
    console.error(
      "[api] WARNING: database unreachable — requests requiring " +
      "the database will fail until Postgres is available.",
    );
  }

  serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`[api] listening on http://localhost:${info.port}`);
  });
}

main();
