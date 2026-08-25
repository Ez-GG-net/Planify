import { config as loadDotenv } from "dotenv";
import path from "node:path";

/**
 * Loads the repo-root .env, the single source of truth for shared dev
 * configuration (API URL, CORS origins, database, auth).
 *
 * Must be imported before any module that reads process.env at module
 * scope — see server.ts import order.
 *
 * Resolution is fail-loud on purpose: a silently-empty env previously
 * produced confusing downstream auth errors instead of an obvious
 * startup message.
 */
const candidates: string[] = [];

// Primary: relative to this file (apps/api/src/lib -> repo root). Not
// available when a bundler rewrites this module to CJS (drizzle-kit does),
// where import.meta is an empty object.
const here = import.meta.dirname;
if (here) {
  candidates.push(path.join(here, "../../../.env"));
}

// Fallback: pnpm scripts always run with cwd = apps/api.
candidates.push(path.resolve(process.cwd(), "../../.env"));

let loadResult: ReturnType<typeof loadDotenv> | undefined;
let usedPath: string | undefined;

for (const candidate of candidates) {
  const result = loadDotenv({ path: candidate });
  if (!result.error) {
    loadResult = result;
    usedPath = candidate;
    break;
  }
}

if (!loadResult) {
  console.error(
    `[api] WARNING: could not load repo-root .env from any known location (${candidates.join(", ")}) — auth/database will not work.`,
  );
} else {
  const keys = Object.keys(loadResult.parsed ?? {}).length;
  if (keys === 0) {
    // Everything was already injected (e.g. tsx auto-env ran first).
    console.log("[api] .env already present in environment");
  } else {
    console.log(`[api] loaded ${keys} env entries from ${usedPath}`);
  }
}
