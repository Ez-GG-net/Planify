<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Repository layout

pnpm monorepo (`pnpm-workspace.yaml`):
- `apps/web` — Next.js frontend (:3000, `@planify/web`)
- `apps/api` — Hono backend (:3001 via tsx, `@planify/api`)
- `packages/schemas` — shared Zod schemas (`@planify/schemas`); source of truth for all wire contracts
- `packages/types` — shared types derived from those schemas (`z.infer`) as `@planify/types`

# Commands

- Dev (both servers): `pnpm dev` · Web only: `pnpm dev:web` · API only: `pnpm dev:api`
- Build web: `pnpm build` · Start web: `pnpm start` (API has no root build/start script)
- Typecheck (all 4 projects): `pnpm run typecheck` · Lint (web only): `pnpm run lint` · Format: `pnpm run format`
- Per-project: `pnpm --filter @planify/web <script>` / `pnpm --filter @planify/api <script>`
- On this machine the PowerShell execution policy blocks `npm.ps1`/`npx.ps1`; invoke `npm.cmd` / `npx.cmd` instead. `pnpm` itself works directly.
- DB (API): `pnpm --filter @planify/api db:generate` · `pnpm --filter @planify/api db:migrate` · `pnpm --filter @planify/api db:studio`
- Infrastructure: `docker compose up` (Postgres on :5432)
- No test suite, test runner, or CI exists. Verify changes with typecheck, lint, and the dev servers.
- Known typecheck baseline: **0 errors** across all projects. Keep it that way; fix new errors rather than accumulating them.

# Architecture rules

- **Boundary**: the browser talks to the Hono API over HTTP only (`NEXT_PUBLIC_API_URL`, default `http://localhost:3001`). Never import `@planify/api` code from the web app or vice versa. Shared contracts flow exclusively through `@planify/types` and `@planify/schemas`.
- **Import aliases**:
  - In `apps/web`: `@/*` maps to `apps/web/*`; domain types/schemas come from `@planify/types|schemas`. Web-local UI types (wizard state, task-day view models, stream callbacks) remain under `@/types` / `@/schemas`.
  - In `apps/api`: `@planify/api/*` maps to `apps/api/src/*` (tsconfig paths; resolved at runtime by tsx) — use it instead of relative `../..` chains.
- **API layering**: routes are thin HTTP adapters (validate body → call service → map errors); business logic lives in `apps/api/src/services/`. All errors funnel through `handleApiError` producing `{ error: { code, message } }` (Zod failures → 400 `invalid_request`, unknown → sanitized 500; internals logged server-side only).
- **API config** lives in `apps/api/src/config.ts`: `PORT` (default 3001), `WEB_ORIGINS` (comma-separated CORS allowlist, never `*`, credentials enabled). Also configures auth, Ollama (URLs/models), AI concurrency limits, and database URL.
- Packages ship TS source directly; `apps/web` consumes them via `transpilePackages`.

# Migration status (Next.js Route Handlers → Hono) — COMPLETE

All five generate endpoints now live in Hono (`apps/api/src/routes/generate/`): `review-questions`, `schedule`, `task-guide`, `pre-task-guide`, `chat-response` (SSE). `apps/web/app/api/` no longer exists — do not recreate Next.js route handlers; add endpoints under `apps/api`.

# Backend stack (current)

- **Auth**: Better Auth (`better-auth`) served from API at `/api/auth/*` (Drizzle adapter, Google provider). Session attached via `requireAuth` middleware.
- **Database**: Postgres + Drizzle ORM. Schema in `apps/api/src/db/schema.ts` (user, session, account, verification, userAvatar, schedule, quotaUsage, generationCancellation). Migrations in `apps/api/src/db/migrations/`. Access via `db` from `apps/api/src/db`.
- **AI/Generation**: Real calls to Ollama (`apps/api/src/ai/call-provider.ts`). Models configured via `OLLAMA_*` env vars (`gpt-oss:20b`, `qwen3:8b`). Generation services build prompts from `apps/api/src/ai/prompts/*.md` and validate with Zod schemas.
- **Quota/Cancellation**: Enforced via middleware/services (`require-quota`, `cancellation-service`).

# AI chat architecture

The assistant uses **Ollama with tool calling** (agent loop), not a hardcoded/simulated stream:
- Route: `apps/api/src/routes/generate/chat-response.ts` requires auth and quota (`requireQuota("chat_tokens")`), calls `chatStream()` from `apps/api/src/services/chat-stream.ts`, returns a raw `Response` with SSE headers (framing must stay byte-identical).
- Agent loop: `apps/api/src/services/chat-stream.ts` holds generation slot, streams from Ollama via `streamOllamaChat()`, emits events (`thinking_delta`, `thinking_finished`, `message_delta`, `tool_started`/`completed`/`failed`, `action_proposed`, `usage`, `usage_limit_reached`, `error`, `done`) up to `MAX_ROUNDS=10`. Token usage is tracked against limits by counting SSE event bytes.
- Transport is hand-rolled SSE: events delimited by `\r\n\r\n`, each line prefixed with `AIChatStreamEventSSEEPrefix` (`"data:"`). Event shapes live in `packages/schemas/src/chat-events.ts`.
- Layering: `@planify/schemas` (zod) → `@planify/types` (inferred) → API stream → `apps/web/lib/api/chat-message.ts` (fetch + event dispatch) → `components/chat/*` (UI). New stream events must be added to schema, dispatch switch, and callback schema together.
- Tool registry: `aiTools` in `apps/api/src/ai/tools/index.ts` (server-side only; the browser never imports it). Shared tool types (`AIChatScope`, `AIChatToolArguments`, `AIChatToolContext`), ID generators (`create-id`), and status-line formatters (`tool-summaries.ts`) live in `packages/types/src/` so both apps consume identical copies — never re-create these web-local.
- Approval-gated tools push pending actions into the server-side in-memory store `apps/api/src/ai/test-action-store.ts`; there is no resolution endpoint yet, so Accept/Reject in the UI only mutates local React state and applies changes client-side via `apps/web/lib/ai/apply-pending-action.ts` (which stays client-side by design).
- In message parts, action proposals link back to their tool call via `action.toolCallId`; `components/chat/ai-chat-bubble.tsx` groups them for rendering.

# Stack quirks

- Next.js 16.2.6 App Router · React 19.2.4 · TypeScript strict · Tailwind v4 · Zod v4 · Hono v4.
- Tailwind is CSS-first: there is **no** tailwind.config. Theme tokens are oklch CSS variables in `apps/web/app/globals.css`, mapped to utilities via `@theme inline`. Custom utilities/keyframes belong in `@layer components` there (e.g. `.text-shine`). Dark mode is the `.dark` class via `@custom-variant dark`.
- shadcn/ui components are built on `@base-ui/react` (**not Radix**) — component props differ from most shadcn examples. Add new ones with `npx shadcn@latest add <name>` (run inside `apps/web`).
- Zod v4. Schemas in `packages/schemas` are the source of truth; `packages/types` re-exports their `z.infer`. Import domain types from `@planify/types`, never redefine shapes inline.

# Data conventions

- Schedule plans persist client-side to **IndexedDB via Dexie** (`apps/web/database/`, DB name `"planify"`), accessed only through `getScheduleRepository()`. Chat history persists to IndexedDB through `lib/chat/chat-storage.ts`. Small settings use localStorage (`lib/storage`).
- Server-side data (users, sessions, accounts, avatars, schedules, quota usage, generation cancellations) is stored in **Postgres via Drizzle** in `apps/api/src/db/`.
- Times are minutes-from-midnight numbers; durations are minutes. Format them with `minutesToTimeLabel()` / `minutesToDurationLabel()` from `apps/web/lib/task/task-time.ts` instead of reimplementing.

# Environment variables (see `.env.example`)

Key vars: `DATABASE_URL`, `WEB_ORIGINS`, `BETTER_AUTH_URL`, `BETTER_AUTH_WEB_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OLLAMA_API_URL`, `OLLAMA_MODEL`, `OLLAMA_FAST_MODEL`, `OLLAMA_CHAT_MODEL`, `AI_MAX_CONCURRENT_GENERATIONS`, `AI_MAX_QUEUE_LENGTH`, `NEXT_PUBLIC_API_URL`.