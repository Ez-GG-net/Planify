// Loads repo-root .env before config evaluates — identical contract to
// server.ts. Without this, config may see an empty env depending on how
// the process was started.
import "./src/lib/load-env";
import { defineConfig } from "drizzle-kit";

import { config } from "./src/config";

// Reuses the API's connection-string resolution (POSTGRES_* authoritative,
// DATABASE_URL fallback) so migrations always target the same database the
// server uses. drizzle-kit transpiles this file itself; src/config has no
// runtime dependencies, so importing it is safe outside hono.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: config.databaseUrl,
  },
});
