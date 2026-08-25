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

/**
 * Lightweight connectivity probe — acquires and immediately releases a
 * pool client. Returns true when Postgres is reachable, false otherwise.
 * Used at startup and by the /health endpoint.
 *
 * Races against a 3-second timeout so the probe never hangs when the
 * database is unreachable (pg's pool.connect has no built-in timeout by
 * default).
 */
export async function checkDatabase(): Promise<boolean> {
  try {
    const client = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("health check timeout")), 3_000),
      ),
    ]);
    client.release();
    return true;
  } catch {
    return false;
  }
}

export { pool };
