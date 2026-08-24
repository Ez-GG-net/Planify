<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Repository layout

pnpm monorepo (`pnpm-workspace.yaml`):

- `apps/web` — Next.js frontend (:3000)
- `apps/api` — standalone Hono backend (:3001, runs via `tsx`)
- `packages/schemas` — shared Zod schemas (`@planify/schemas`); source of truth for all wire contracts
- `packages/types` — shared types derived from those schemas (`z.infer`) as `@planify/types`

# Commands

- Dev (both servers): `pnpm dev` · Web only: `pnpm dev:web` · API only: `pnpm dev:api`
- Typecheck (all 4 projects): `pnpm run typecheck` · Lint: `pnpm run lint` · Format: `pnpm run format`
- Per-project: `pnpm --filter @planify/web <script>` / `pnpm --filter @planify/api <script>`
- On this machine the PowerShell execution policy blocks `npm.ps1`/`npx.ps1`; invoke `npm.cmd` / `npx.cmd` instead. `pnpm` itself works directly.
- No test suite, test runner, or CI exists. Verify changes with typecheck, lint, and the dev servers.
- Known typecheck baseline: **0 errors** across all projects. Keep it that way; fix new errors rather than accumulating them.

# Architecture rules

- **Boundary**: the browser talks to the Hono API over HTTP only (`NEXT_PUBLIC_API_URL`, default `http://localhost:3001`). Never import `@planify/api` code from the web app or vice versa. Shared contracts flow exclusively through `@planify/types` and `@planify/schemas`.
- **Import aliases**:
  - In `apps/web`: `@/*` maps to `apps/web/*`; domain types/schemas come from `@planify/types|schemas`. Web-local UI types (wizard state, task-day view models, stream callbacks) remain under `@/types` / `@/schemas`.
  - In `apps/api`: `@planify/api/*` maps to `apps/api/src/*` (tsconfig paths; resolved at runtime by tsx) — use it instead of relative `../..` chains.
- **API layering**: routes are thin HTTP adapters (validate body → call service → map errors); business logic lives in `apps/api/src/services/`. All errors funnel through `handleApiError` producing `{ error: { code, message } }` (Zod failures → 400 `invalid_request`, unknown → sanitized 500; internals logged server-side only).
- **API config** lives in `apps/api/src/config.ts`: `PORT` (default 3001), `WEB_ORIGINS` (comma-separated CORS allowlist, never `*`, credentials enabled).
- Packages ship TS source directly; `apps/web` consumes them via `transpilePackages`.

# Migration status (Next.js Route Handlers → Hono)

Migrated to Hono: `POST /api/generate/review-questions` (placeholder behavior + schema validation).
Still in `apps/web/app/api/generate/`: `schedule`, `task-guide`, `pre-task-guide`, `chat-response` — these are migrated next; do not add new logic to them.

# AI chat architecture

The assistant is a **simulated model** — there is no LLM call yet:

- `apps/web/app/api/generate/chat-response/route.ts` (`testStream`) scripts entire responses: thinking/text deltas, tool calls through `executeToolAndStream()`, one approval-gated action.
- Transport is hand-rolled SSE: events delimited by `\r\n\r\n`, each line prefixed with `AIChatStreamEventSSEEPrefix` (`"data:"`). Event shapes live in `packages/schemas/src/chat-events.ts`.
- Layering: `@planify/schemas` (zod) → `@planify/types` (inferred) → `lib/api/chat-message.ts` (fetch + event dispatch) → `components/chat/*` (UI). New stream events must be added to schema, dispatch switch, and callback schema together.
- Tool registry: `aiTools` in `apps/web/lib/ai/tools/index.ts` (moves to the API in a later phase). Approval-gated tools push pending actions into the in-memory `lib/ai/test-action-store.ts`; there is no server-side resolution route yet, so Accept/Reject in the UI only mutates local React state and applies changes client-side via `lib/ai/apply-pending-action.ts`.
- In message parts, action proposals link back to their tool call via `action.toolCallId`; `components/chat/ai-chat-bubble.tsx` groups them for rendering.

# Stack quirks

- Next.js 16 App Router · React 19 · TypeScript strict · Tailwind v4 · Zod v4 · Hono v4.
- Tailwind is CSS-first: there is **no** tailwind.config. Theme tokens are oklch CSS variables in `apps/web/app/globals.css`, mapped to utilities via `@theme inline`. Custom utilities/keyframes belong in `@layer components` there (e.g. `.text-shine`). Dark mode is the `.dark` class via `@custom-variant dark`.
- shadcn/ui components are built on `@base-ui/react` (**not Radix**) — component props differ from most shadcn examples. Add new ones with `npx shadcn@latest add <name>` (run inside `apps/web`).
- Zod v4. Schemas in `packages/schemas` are the source of truth; `packages/types` re-exports their `z.infer`. Import domain types from `@planify/types`, never redefine shapes inline.

# Data conventions

- Schedule plans persist client-side to **IndexedDB via Dexie** (`apps/web/database/`, DB name `"planify"`), accessed only through `getScheduleRepository()`. Chat history persists to IndexedDB through `lib/chat/chat-storage.ts`. Small settings use localStorage (`lib/storage`).
- Server-side data (users/sessions/quota) does **not exist yet** — planned as Postgres + Drizzle in `apps/api`.
- Times are minutes-from-midnight numbers; durations are minutes. Format them with `minutesToTimeLabel()` / `minutesToDurationLabel()` from `apps/web/lib/task/task-time.ts` instead of reimplementing.
