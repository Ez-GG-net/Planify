<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Commands

- Dev: `npm.cmd run dev` (http://localhost:3000) · Typecheck: `npm.cmd run typecheck` · Lint: `npm.cmd run lint` · Format: `npm.cmd run format`
- On this machine the PowerShell execution policy blocks `npm.ps1`/`npx.ps1`; invoke `npm.cmd` / `npx.cmd` instead.
- No test suite, test runner, or CI exists. Verify changes with `typecheck`, `lint`, and the dev server.
- The lockfile is `pnpm-lock.yaml` (no `package-lock.json`); `pnpm-workspace.yaml` exists but defines no packages.

# Known pre-existing typecheck failures

`tsc --noEmit` fails on ~5 errors that predate unrelated work. Use them as a baseline (same count/kinds = OK) rather than trying to fix them in passing:

- `.next*/types/validator.ts` — generated validators referencing a deleted route (`app/api/generate/chat-response`) and an empty route file (`app/api/generate/chat/action/route.ts`)
- `app/(with-sidebar)/view/schedule/[id]/task/[tid]/page.tsx` — `applyTaskGuideAction` is not defined
- `lib/api/resolve-ai-chat-action.ts` — calls non-existent `consumeAIStream`, and its URL `/api/chat/action` does not match the actual route path `/api/generate/chat/action`
- `lib/ai/tools/index.ts` — implicit-any tool lookup by name

# Stack quirks

- Next.js 16 App Router · React 19 · TypeScript strict. Path alias `@/*` maps to the repo root.
- Tailwind v4, CSS-first: there is **no** tailwind.config. Theme tokens are oklch CSS variables in `app/globals.css`, mapped to utilities via `@theme inline`. Custom utilities/keyframes belong in `@layer components` there (e.g. `.text-shine`). Dark mode is the `.dark` class via `@custom-variant dark`.
- shadcn/ui components are built on `@base-ui/react` (**not Radix**) — component props differ from most shadcn examples. Add new ones with `npx shadcn@latest add <name>`.
- Zod v4. Schemas in `schemas/` are the source of truth; `types/` re-exports their `z.infer`. Import domain types from `@/types`, never redefine shapes inline.

# AI chat architecture

The assistant is a **simulated model** — there is no LLM call yet:

- `app/api/generate/chat/route.ts` (`testStream`) scripts entire responses: thinking/text deltas, tool calls through `executeToolAndStream()`, one approval-gated action.
- Transport is hand-rolled SSE: events delimited by `\r\n\r\n`, each line prefixed with `AIChatStreamEventSSEEPrefix` (`"data:"`). Event shapes live in `schemas/chat-events.ts`.
- Layering: `schemas/` (zod) → `types/` (inferred) → `lib/api/chat-message.ts` (fetch + event dispatch) → `components/chat/*` (UI). New stream events must be added to schema, dispatch switch, and callback schema together.
- Tool registry: `aiTools` in `lib/ai/tools/index.ts`. Approval-gated tools push pending actions into the in-memory `lib/ai/test-action-store.ts`; the resolution route (`app/api/generate/chat/action/route.ts`) is an empty stub, so Accept/Reject in the UI only mutates local React state and does not persist.
- In message parts, action proposals link back to their tool call via `action.toolCallId`; `components/chat/ai-chat-bubble.tsx` groups them for rendering.

# Data conventions

- No database. Schedule plans persist to localStorage key `"SCHEDULES"` through `lib/storage` (client-only; guard against SSR when reading).
- Times are minutes-from-midnight numbers; durations are minutes. Format them with `minutesToTimeLabel()` / `minutesToDurationLabel()` from `lib/task/task-time.ts` instead of reimplementing.
