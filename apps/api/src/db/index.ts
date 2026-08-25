import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { config } from "../config";

/**
 * Shared Postgres connection. Single pool for the whole API; Drizzle sits
 * on top for typed queries and migrations.
 */
const pool = new Pool({ connectionString: config.databaseUrl });

pool.on("error", (error) => {
  console.error("[db] unexpected pool error:", error);
});

export const db = drizzle(pool);

export { pool };
